package student

import (
	"context"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gorilla/mux"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo/options"

	"backend/handlers/common"
	researchHandlers "backend/handlers/research"
	"backend/models"
)

type (
	Quest              = models.Quest
	LeaderboardEntry   = models.LeaderboardEntry
	DailyQuestItem     = models.DailyQuestItem
	StudentDashboardResponse = models.StudentDashboardResponse
	User               = models.User
)

func GetUser(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id, _ := strconv.Atoi(vars["id"])
	ctx := context.Background()
	var user User
	if err := common.UsersCol.FindOne(ctx, bson.M{"user_id": id}).Decode(&user); err != nil {
		common.WriteJSON(w, http.StatusNotFound, map[string]string{"error":"user not found"}); return
	}
	requestorID, _ := common.UserIDFromContext(r.Context())
	role := common.RoleFromContext(r.Context())
	if role == common.RoleStudent && requestorID != id { common.WriteJSON(w, http.StatusForbidden, map[string]string{"error":"students may only view their own profile"}); return }
	common.WriteJSON(w, http.StatusOK, common.SanitizeUser(&user))
}

func GetQuests(w http.ResponseWriter, r *http.Request) {
	queryUserID, _ := strconv.Atoi(r.URL.Query().Get("user_id"))
	actorID, actorPresent := common.UserIDFromContext(r.Context())
	role := common.RoleFromContext(r.Context())
	targetID := queryUserID
	if actorPresent {
		if role == common.RoleStudent || targetID == 0 { targetID = actorID }
	}
	ctx := context.Background()
	cursor, err := common.QuestsCol.Find(ctx, bson.M{})
	if err != nil { common.WriteJSON(w, http.StatusInternalServerError, map[string]string{"error":"failed to fetch quests"}); return }
	defer cursor.Close(ctx)
	quests := []Quest{}
	for cursor.Next(ctx) { var q Quest; if err := cursor.Decode(&q); err != nil { continue }; var userQuest struct{Completed bool `bson:"completed"`}; common.UserQuestsCol.FindOne(ctx, bson.M{"user_id":targetID,"quest_id":q.QuestID}).Decode(&userQuest); q.Completed = userQuest.Completed; quests = append(quests,q) }
	common.WriteJSON(w, http.StatusOK, quests)
}

func CompleteQuest(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r); questID,_ := strconv.Atoi(vars["id"])
	var req struct{ UserID int `json:"user_id"` }
	_ = common.DecodeJSON(r,&req)
	actorID,_ := common.UserIDFromContext(r.Context())
	role := common.RoleFromContext(r.Context())
	targetUserID := req.UserID
	if role == common.RoleStudent || targetUserID == 0 { targetUserID = actorID }
	if role == common.RoleFaculty && targetUserID != actorID { common.WriteJSON(w, http.StatusForbidden, map[string]string{"error":"faculty cannot complete quests for students"}); return }
	ctx := context.Background()
	var quest Quest
	if err := common.QuestsCol.FindOne(ctx, bson.M{"quest_id": questID}).Decode(&quest); err != nil { common.WriteJSON(w, http.StatusNotFound, map[string]string{"error":"quest not found"}); return }
	count, err := common.UserQuestsCol.CountDocuments(ctx, bson.M{"user_id": targetUserID, "quest_id": questID})
	if err != nil { common.WriteJSON(w, http.StatusInternalServerError, map[string]string{"error":"failed to update"}); return }
	if count == 0 { _, _ = common.UserQuestsCol.InsertOne(ctx, bson.M{"user_id":targetUserID,"quest_id":questID,"completed":true,"completed_at": timeNow()}); _, _ = common.UsersCol.UpdateOne(ctx, bson.M{"user_id":targetUserID}, bson.M{"$inc": bson.M{"coins": quest.Coins}}) }
	common.WriteJSON(w, http.StatusOK, map[string]interface{}{"success":true,"coins":quest.Coins})
}

func GetLeaderboard(w http.ResponseWriter, r *http.Request) {
	ctx := context.Background(); limit,_ := strconv.Atoi(r.URL.Query().Get("limit")); findOpts := options.Find().SetSort(bson.M{"coins":-1}); if limit>0 { findOpts.SetLimit(int64(limit)) }
	cursor, err := common.UsersCol.Find(ctx, bson.M{}, findOpts); if err != nil { common.WriteJSON(w, http.StatusInternalServerError, map[string]string{"error":"failed to load leaderboard"}); return }; defer cursor.Close(ctx)
	leaders := []LeaderboardEntry{}
	for cursor.Next(ctx) { var user User; if err := cursor.Decode(&user); err != nil { continue }; count,_ := common.UserQuestsCol.CountDocuments(ctx, bson.M{"user_id": user.UserID, "completed": true}); leaders = append(leaders, LeaderboardEntry{UserID:user.UserID,Name:user.Name,CompletedQuests:int(count),Streak:user.Streak,Coins:user.Coins}) }
	common.WriteJSON(w, http.StatusOK, leaders)
}

func GetPolls(w http.ResponseWriter, r *http.Request) { ctx := context.Background(); cursor, err := common.PollsCol.Find(ctx, bson.M{}); if err != nil { common.WriteJSON(w, http.StatusInternalServerError, map[string]string{"error":"failed to fetch polls"}); return }; defer cursor.Close(ctx); polls := []models.Poll{}; for cursor.Next(ctx) { var p models.Poll; if err := cursor.Decode(&p); err != nil { continue }; polls = append(polls,p) }; common.WriteJSON(w, http.StatusOK, polls) }

func VoteOnPoll(w http.ResponseWriter, r *http.Request) { vars := mux.Vars(r); pollID,_ := strconv.Atoi(vars["id"]); var req struct{OptionIndex int `json:"option_index"`}; if err := common.DecodeJSON(r,&req); err != nil { common.WriteJSON(w, http.StatusBadRequest, map[string]string{"error":"invalid payload"}); return }; actorID, ok := common.UserIDFromContext(r.Context()); if !ok { common.WriteJSON(w,http.StatusUnauthorized,map[string]string{"error":"unauthorized"}); return }; ctx := context.Background(); count,_ := common.VotesCol.CountDocuments(ctx, bson.M{"user_id":actorID,"poll_id":pollID}); if count==0 { _,_ = common.VotesCol.InsertOne(ctx, bson.M{"user_id":actorID,"poll_id":pollID,"option_index":req.OptionIndex,"voted_at":timeNow()}); updateField := fmt.Sprintf("options.%d.votes", req.OptionIndex); _,_ = common.PollsCol.UpdateOne(ctx, bson.M{"poll_id":pollID}, bson.M{"$inc": bson.M{updateField:1}}) }; common.WriteJSON(w, http.StatusOK, map[string]bool{"success":true}) }

func GetStudentDashboard(w http.ResponseWriter, r *http.Request) {
	actorID, ok := common.UserIDFromContext(r.Context()); if !ok { common.WriteJSON(w, http.StatusUnauthorized, map[string]string{"error":"unauthorized"}); return }
	role := common.RoleFromContext(r.Context()); if role != common.RoleStudent && role != common.RoleAdmin { common.WriteJSON(w, http.StatusForbidden, map[string]string{"error":"student dashboard accessible only to students"}); return }
	targetID := actorID; if role == common.RoleAdmin { if override, err := strconv.Atoi(r.URL.Query().Get("user_id")); err == nil && override>0 { targetID = override } }
	ctx := context.Background(); var user User; if err := common.UsersCol.FindOne(ctx, bson.M{"user_id": targetID}).Decode(&user); err != nil { common.WriteJSON(w, http.StatusNotFound, map[string]string{"error":"student not found"}); return }
	quests, err := collectQuestsForUser(ctx, targetID); if err != nil { common.WriteJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()}); return }
	leaders, err := common.CollectLeaderboard(5); if err != nil { common.WriteJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()}); return }
	daily := make([]DailyQuestItem,0,len(quests)); for _, q := range quests { daily = append(daily, DailyQuestItem{ID:q.QuestID, Title:q.Title, Description:q.Question, XP:q.Coins, Completed:q.Completed}) }
	metrics := map[string]int{"courseProgress": user.CourseProgress, "academicStanding": user.AcademicStanding, "gamificationLevel": user.GamificationLevel, "currentStreak": user.Streak}
	researchFeed, err := researchHandlersInternalFeed(ctx, targetID, 25); if err != nil { common.WriteJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()}); return }
	resp := StudentDashboardResponse{User: common.SanitizeUser(&user), Metrics: metrics, DailyQuests: daily, Leaderboard: leaders, ActiveCourses: user.ActiveCourses, ResearchFeed: researchFeed}
	common.WriteJSON(w, http.StatusOK, resp)
}

func collectQuestsForUser(ctx context.Context, userID int) ([]Quest, error) {
	cursor, err := common.QuestsCol.Find(ctx, bson.M{}); if err != nil { return nil, err }; defer cursor.Close(ctx)
	quests := []Quest{}; for cursor.Next(ctx) { var quest Quest; if err := cursor.Decode(&quest); err != nil { continue }; var userQuest struct{Completed bool `bson:"completed"`}; common.UserQuestsCol.FindOne(ctx, bson.M{"user_id": userID, "quest_id": quest.QuestID}).Decode(&userQuest); quest.Completed = userQuest.Completed; quests = append(quests, quest) }
	return quests, nil
}

// student package now delegates research feed assembly to research package internals (unexported helper wrapper)
func researchHandlersInternalFeed(ctx context.Context, viewerID int, limit int64) ([]models.ResearchPostResponse, error) {
	// reuse research.collectResearchFeed via an exported thin wrapper we add below if needed; for now duplicate minimal logic
	findOpts := options.Find().SetSort(bson.D{{Key: "created_at", Value: -1}}); if limit>0 { findOpts.SetLimit(limit) }
	cursor, err := common.ResearchPostsCol.Find(ctx, bson.M{}, findOpts); if err != nil { return nil, fmt.Errorf("failed to load research posts: %w", err) }
	defer cursor.Close(ctx)
	feed := []models.ResearchPostResponse{}
	for cursor.Next(ctx) { var post models.ResearchPost; if err := cursor.Decode(&post); err != nil { continue }; feed = append(feed, researchHandlersInternalBuild(post, viewerID)) }
	return feed, nil
}

func researchHandlersInternalBuild(post models.ResearchPost, viewerID int) models.ResearchPostResponse {
	// call research.buildResearchPostResponse indirectly by duplicating small piece to avoid import cycle
	id := ""; if !post.ID.IsZero() { id = post.ID.Hex() } else { id = fmt.Sprintf("research-%d", post.CreatedAt.UnixNano()) }
	title := strings.TrimSpace(post.Title); if title=="" { title = common.DeriveTitleFromBody(post.Body) }
	summary := strings.TrimSpace(post.Summary); if summary=="" { summary = common.TruncateText(post.Body, 320) }; if summary=="" { summary = "An exciting research update from our community." }
	timestamp := formatRelativeTimestamp(post.CreatedAt)
	createdAt := ""; if !post.CreatedAt.IsZero() { createdAt = post.CreatedAt.UTC().Format(time.RFC3339) }
	return models.ResearchPostResponse{ ID:id, Title:title, Summary:summary, Category: post.Category, Tags: common.SanitizeTagList(post.Tags), Author: models.ResearchPostAuthor{Name: post.AuthorName, Role: post.AuthorRole}, Timestamp: timestamp, CreatedAt: createdAt, Image: strings.TrimSpace(post.ImageURL), Link: strings.TrimSpace(post.Link), Stats: models.ResearchPostStats{Likes: post.Likes, Comments: post.Comments, Collaborations: post.Collaborations}, IsCollaboration: post.IsCollaboration, IsMine: post.AuthorID==viewerID, Trending: isResearchPostTrending(post) }
}

func formatRelativeTimestamp(t time.Time) string { if t.IsZero() { return "Recently" }; diff := time.Since(t); if diff < time.Minute { return "Just now" }; if diff < time.Hour { m := int(diff/time.Minute); if m<=1 { return "1 minute ago" }; return fmt.Sprintf("%d minutes ago", m) }; if diff < 24*time.Hour { h := int(diff/time.Hour); if h<=1 { return "1 hour ago" }; return fmt.Sprintf("%d hours ago", h) }; if diff < 7*24*time.Hour { d := int(diff/(24*time.Hour)); if d<=1 { return "1 day ago" }; return fmt.Sprintf("%d days ago", d) }; if diff < 30*24*time.Hour { w := int(diff/(7*24*time.Hour)); if w<=1 { return "1 week ago" }; return fmt.Sprintf("%d weeks ago", w) }; return t.Format("Jan 2, 2006") }
func isResearchPostTrending(post models.ResearchPost) bool { score := post.Likes + post.Comments + (post.Collaborations*3); if score >= 30 { return true }; if time.Since(post.CreatedAt) <= 72*time.Hour && score >= 12 { return true }; return false }
func timeNow() time.Time { return time.Now() }
