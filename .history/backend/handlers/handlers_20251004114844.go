package handlers

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"regexp"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/gorilla/mux"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"

	middleware "github.com/MithileshSP/Learnify/backend/middleware"
	models "github.com/MithileshSP/Learnify/backend/models"
)

type (
	CourseProgress           = models.CourseProgress
	User                     = models.User
	publicUser               = models.PublicUser
	Quest                    = models.Quest
	dailyQuestItem           = models.DailyQuestItem
	LeaderboardEntry         = models.LeaderboardEntry
	Poll                     = models.Poll
	PollOption               = models.PollOption
	ResearchPost             = models.ResearchPost
	ResearchPostStats        = models.ResearchPostStats
	ResearchPostAuthor       = models.ResearchPostAuthor
	ResearchPostResponse     = models.ResearchPostResponse
	StudentDashboardResponse = models.StudentDashboardResponse
	AdminActivity            = models.AdminActivity
	AdminOverviewResponse    = models.AdminOverviewResponse
	FacultyCourse            = models.FacultyCourse
	FacultyOverviewStats     = models.FacultyOverviewStats
	FacultyAISuggestion      = models.FacultyAISuggestion
	FacultyAIGrading         = models.FacultyAIGrading
	FacultyMentee            = models.FacultyMentee
	FacultyMentorship        = models.FacultyMentorship
	FacultyCourseCard        = models.FacultyCourseCard
	FacultyAnalytics         = models.FacultyAnalytics
	FacultyOverviewResponse  = models.FacultyOverviewResponse
)

type Dependencies struct {
	UsersCol             *mongo.Collection
	QuestsCol            *mongo.Collection
	PollsCol             *mongo.Collection
	VotesCol             *mongo.Collection
	UserQuestsCol        *mongo.Collection
	ResearchPostsCol     *mongo.Collection
	FacultyDashboardsCol *mongo.Collection
	GeminiAPIKey         string
	GeminiModel          string
	JWTSecret            string
	TokenTTL             time.Duration
}

var (
	usersCol             *mongo.Collection
	questsCol            *mongo.Collection
	pollsCol             *mongo.Collection
	votesCol             *mongo.Collection
	userQuestsCol        *mongo.Collection
	researchPostsCol     *mongo.Collection
	facultyDashboardsCol *mongo.Collection
	geminiAPIKey         string
	geminiModel          string
	jwtSecret            string
	tokenTTL             time.Duration
)

func Configure(deps Dependencies) {
	usersCol = deps.UsersCol
	questsCol = deps.QuestsCol
	pollsCol = deps.PollsCol
	votesCol = deps.VotesCol
	userQuestsCol = deps.UserQuestsCol
	researchPostsCol = deps.ResearchPostsCol
	facultyDashboardsCol = deps.FacultyDashboardsCol
	geminiAPIKey = deps.GeminiAPIKey
	geminiModel = deps.GeminiModel
	jwtSecret = deps.JWTSecret
	tokenTTL = deps.TokenTTL
	if tokenTTL <= 0 {
		tokenTTL = middleware.DefaultTokenTTL
	}
}

func verifyPassword(hash, raw string) error {
	return middleware.VerifyPassword(hash, raw)
}

func generateToken(user *User) (string, time.Time, error) {
	if jwtSecret == "" {
		return "", time.Time{}, errors.New("jwt secret not configured")
	}
	return middleware.GenerateToken((*models.User)(user), jwtSecret, tokenTTL)
}

func getUserIDFromContext(ctx context.Context) (int, bool) {
	return middleware.UserIDFromContext(ctx)
}

func getUserRoleFromContext(ctx context.Context) string {
	return middleware.RoleFromContext(ctx)
}

func hasRole(ctx context.Context, allowed ...string) bool {
	return middleware.HasRole(ctx, allowed...)
}

const (
	RoleAdmin            = "admin"
	RoleFaculty          = "faculty"
	RoleStudent          = "student"
	researchSummaryLimit = 320
	researchTitleLimit   = 120
	researchMaxTags      = 6
)

var hashtagRegex = regexp.MustCompile(`#([A-Za-z0-9_-]+)`)

func sanitizeUser(u *User) publicUser {
	if u == nil {
		return publicUser{}
	}
	return publicUser{
		ID:                u.UserID,
		Name:              u.Name,
		Email:             u.Email,
		Coins:             u.Coins,
		Streak:            u.Streak,
		Role:              u.Role,
		AcademicStanding:  u.AcademicStanding,
		GamificationLevel: u.GamificationLevel,
		CourseProgress:    u.CourseProgress,
		ActiveCourses:     u.ActiveCourses,
	}
}

type facultyDashboardDoc struct {
	ID            primitive.ObjectID       `bson:"_id,omitempty"`
	FacultyID     int                      `bson:"faculty_id"`
	Overview      facultyOverviewDoc       `bson:"overview"`
	AISuggestions []facultyAISuggestionDoc `bson:"ai_suggestions"`
	Mentorship    facultyMentorshipDoc     `bson:"mentorship"`
	Courses       []facultyCourseDoc       `bson:"courses"`
	Analytics     facultyAnalyticsDoc      `bson:"analytics"`
	CreatedAt     time.Time                `bson:"created_at"`
	UpdatedAt     time.Time                `bson:"updated_at"`
}

type facultyOverviewDoc struct {
	CoursesTaught    int     `bson:"courses_taught"`
	StudentsMentored int     `bson:"students_mentored"`
	AverageGrade     float64 `bson:"average_grade"`
	PendingReviews   int     `bson:"pending_reviews"`
}

type facultyAISuggestionDoc struct {
	ID              primitive.ObjectID `bson:"_id,omitempty"`
	Title           string             `bson:"title"`
	Course          string             `bson:"course"`
	Summary         string             `bson:"summary"`
	Recommendation  string             `bson:"recommendation"`
	GradeSuggestion string             `bson:"grade_suggestion"`
	Status          string             `bson:"status"`
	CreatedAt       time.Time          `bson:"created_at"`
	UpdatedAt       time.Time          `bson:"updated_at"`
}

type facultyMentorshipDoc struct {
	Mentees     []facultyMenteeDoc `bson:"mentees"`
	LastUpdated time.Time          `bson:"last_updated"`
}

type facultyMenteeDoc struct {
	ID          primitive.ObjectID `bson:"_id,omitempty"`
	Name        string             `bson:"name"`
	Status      string             `bson:"status"`
	NextSession string             `bson:"next_session,omitempty"`
	Note        string             `bson:"note,omitempty"`
	CreatedAt   time.Time          `bson:"created_at"`
	UpdatedAt   time.Time          `bson:"updated_at"`
}

type facultyCourseDoc struct {
	ID          primitive.ObjectID `bson:"_id,omitempty"`
	Title       string             `bson:"title"`
	Status      string             `bson:"status"`
	Code        string             `bson:"code,omitempty"`
	LastUpdated time.Time          `bson:"last_updated"`
}

type facultyAnalyticsDoc struct {
	Labels   []string `bson:"labels"`
	Students []int    `bson:"students"`
	AvgGrade []int    `bson:"avg_grade"`
}

func writeJSON(w http.ResponseWriter, status int, payload interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if payload != nil {
		_ = json.NewEncoder(w).Encode(payload)
	}
}

func decodeJSON(r *http.Request, dst interface{}) error {
	dec := json.NewDecoder(r.Body)
	dec.DisallowUnknownFields()
	return dec.Decode(dst)
}

func WithRoles(handler http.HandlerFunc, allowed ...string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if !hasRole(r.Context(), allowed...) {
			http.Error(w, "forbidden", http.StatusForbidden)
			return
		}
		handler(w, r)
	}
}

func LoginHandler(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	if err := decodeJSON(r, &req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid payload"})
		return
	}

	ctx := context.Background()
	var user User
	filter := bson.M{"email": strings.ToLower(strings.TrimSpace(req.Email))}
	if err := usersCol.FindOne(ctx, filter).Decode(&user); err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "invalid credentials"})
			return
		}
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "unable to fetch user"})
		return
	}

	if err := verifyPassword(user.PasswordHash, req.Password); err != nil {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "invalid credentials"})
		return
	}

	token, expires, err := generateToken(&user)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "failed to generate token"})
		return
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"token":     token,
		"expiresAt": expires.UTC(),
		"user":      sanitizeUser(&user),
	})
}

func GetMeHandler(w http.ResponseWriter, r *http.Request) {
	userID, ok := getUserIDFromContext(r.Context())
	if !ok {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "unauthorized"})
		return
	}

	ctx := context.Background()
	var user User
	if err := usersCol.FindOne(ctx, bson.M{"user_id": userID}).Decode(&user); err != nil {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "user not found"})
		return
	}

	writeJSON(w, http.StatusOK, sanitizeUser(&user))
}

func GetUser(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id, _ := strconv.Atoi(vars["id"])

	ctx := context.Background()
	var user User
	if err := usersCol.FindOne(ctx, bson.M{"user_id": id}).Decode(&user); err != nil {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "user not found"})
		return
	}

	requestorID, _ := getUserIDFromContext(r.Context())
	role := getUserRoleFromContext(r.Context())

	if role == RoleStudent && requestorID != id {
		writeJSON(w, http.StatusForbidden, map[string]string{"error": "students may only view their own profile"})
		return
	}

	writeJSON(w, http.StatusOK, sanitizeUser(&user))
}

func GetQuests(w http.ResponseWriter, r *http.Request) {
	queryUserID, _ := strconv.Atoi(r.URL.Query().Get("user_id"))
	actorID, actorPresent := getUserIDFromContext(r.Context())
	role := getUserRoleFromContext(r.Context())

	targetID := queryUserID
	if !actorPresent {
		targetID = queryUserID
	} else if role == RoleStudent || targetID == 0 {
		targetID = actorID
	}

	ctx := context.Background()
	cursor, err := questsCol.Find(ctx, bson.M{})
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "failed to fetch quests"})
		return
	}
	defer cursor.Close(ctx)

	var quests []Quest
	for cursor.Next(ctx) {
		var quest Quest
		if err := cursor.Decode(&quest); err != nil {
			continue
		}

		var userQuest struct {
			Completed bool `bson:"completed"`
		}
		userQuestsCol.FindOne(ctx, bson.M{
			"user_id":  targetID,
			"quest_id": quest.QuestID,
		}).Decode(&userQuest)
		quest.Completed = userQuest.Completed
		quests = append(quests, quest)
	}

	writeJSON(w, http.StatusOK, quests)
}

func CompleteQuest(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	questID, _ := strconv.Atoi(vars["id"])

	var req struct {
		UserID int `json:"user_id"`
	}
	_ = decodeJSON(r, &req)

	actorID, _ := getUserIDFromContext(r.Context())
	role := getUserRoleFromContext(r.Context())

	targetUserID := req.UserID
	if role == RoleStudent || targetUserID == 0 {
		targetUserID = actorID
	}

	if role == RoleFaculty && targetUserID != actorID {
		writeJSON(w, http.StatusForbidden, map[string]string{"error": "faculty cannot complete quests for students"})
		return
	}

	ctx := context.Background()
	var quest Quest
	if err := questsCol.FindOne(ctx, bson.M{"quest_id": questID}).Decode(&quest); err != nil {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "quest not found"})
		return
	}

	count, err := userQuestsCol.CountDocuments(ctx, bson.M{
		"user_id":  targetUserID,
		"quest_id": questID,
	})
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "failed to update"})
		return
	}

	if count == 0 {
		_, _ = userQuestsCol.InsertOne(ctx, bson.M{
			"user_id":      targetUserID,
			"quest_id":     questID,
			"completed":    true,
			"completed_at": time.Now(),
		})

		_, _ = usersCol.UpdateOne(
			ctx,
			bson.M{"user_id": targetUserID},
			bson.M{"$inc": bson.M{"coins": quest.Coins}},
		)
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"success": true,
		"coins":   quest.Coins,
	})
}

func GetLeaderboard(w http.ResponseWriter, r *http.Request) {
	ctx := context.Background()
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	findOpts := options.Find().SetSort(bson.M{"coins": -1})
	if limit > 0 {
		findOpts.SetLimit(int64(limit))
	}

	cursor, err := usersCol.Find(ctx, bson.M{}, findOpts)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "failed to load leaderboard"})
		return
	}
	defer cursor.Close(ctx)

	var leaders []LeaderboardEntry
	for cursor.Next(ctx) {
		var user User
		if err := cursor.Decode(&user); err != nil {
			continue
		}

		count, _ := userQuestsCol.CountDocuments(ctx, bson.M{
			"user_id":   user.UserID,
			"completed": true,
		})

		leaders = append(leaders, LeaderboardEntry{
			UserID:          user.UserID,
			Name:            user.Name,
			CompletedQuests: int(count),
			Streak:          user.Streak,
			Coins:           user.Coins,
		})
	}

	writeJSON(w, http.StatusOK, leaders)
}

func GetPolls(w http.ResponseWriter, r *http.Request) {
	ctx := context.Background()
	cursor, err := pollsCol.Find(ctx, bson.M{})
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "failed to fetch polls"})
		return
	}
	defer cursor.Close(ctx)

	var polls []Poll
	for cursor.Next(ctx) {
		var poll Poll
		if err := cursor.Decode(&poll); err != nil {
			continue
		}
		polls = append(polls, poll)
	}

	writeJSON(w, http.StatusOK, polls)
}

func VoteOnPoll(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	pollID, _ := strconv.Atoi(vars["id"])

	var req struct {
		OptionIndex int `json:"option_index"`
	}
	if err := decodeJSON(r, &req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid payload"})
		return
	}

	actorID, ok := getUserIDFromContext(r.Context())
	if !ok {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "unauthorized"})
		return
	}

	ctx := context.Background()
	count, _ := votesCol.CountDocuments(ctx, bson.M{
		"user_id": actorID,
		"poll_id": pollID,
	})

	if count == 0 {
		_, _ = votesCol.InsertOne(ctx, bson.M{
			"user_id":      actorID,
			"poll_id":      pollID,
			"option_index": req.OptionIndex,
			"voted_at":     time.Now(),
		})

		updateField := fmt.Sprintf("options.%d.votes", req.OptionIndex)
		_, _ = pollsCol.UpdateOne(
			ctx,
			bson.M{"poll_id": pollID},
			bson.M{"$inc": bson.M{updateField: 1}},
		)
	}

	writeJSON(w, http.StatusOK, map[string]bool{"success": true})
}

func GetStudentDashboard(w http.ResponseWriter, r *http.Request) {
	actorID, ok := getUserIDFromContext(r.Context())
	if !ok {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "unauthorized"})
		return
	}

	role := getUserRoleFromContext(r.Context())
	if role != RoleStudent && role != RoleAdmin {
		writeJSON(w, http.StatusForbidden, map[string]string{"error": "student dashboard accessible only to students"})
		return
	}

	targetID := actorID
	if role == RoleAdmin {
		if override, err := strconv.Atoi(r.URL.Query().Get("user_id")); err == nil && override > 0 {
			targetID = override
		}
	}

	ctx := context.Background()
	var user User
	if err := usersCol.FindOne(ctx, bson.M{"user_id": targetID}).Decode(&user); err != nil {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "student not found"})
		return
	}

	quests, err := collectQuestsForUser(ctx, targetID)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	leaders, err := collectLeaderboard(ctx, 5)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	daily := make([]dailyQuestItem, 0, len(quests))
	for _, q := range quests {
		daily = append(daily, dailyQuestItem{
			ID:          q.QuestID,
			Title:       q.Title,
			Description: q.Question,
			XP:          q.Coins,
			Completed:   q.Completed,
		})
	}

	metrics := map[string]int{
		"courseProgress":    user.CourseProgress,
		"academicStanding":  user.AcademicStanding,
		"gamificationLevel": user.GamificationLevel,
		"currentStreak":     user.Streak,
	}

	researchFeed, err := collectResearchFeed(ctx, targetID, 25)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	resp := StudentDashboardResponse{
		User:          sanitizeUser(&user),
		Metrics:       metrics,
		DailyQuests:   daily,
		Leaderboard:   leaders,
		ActiveCourses: user.ActiveCourses,
		ResearchFeed:  researchFeed,
	}

	writeJSON(w, http.StatusOK, resp)
}

func collectQuestsForUser(ctx context.Context, userID int) ([]Quest, error) {
	cursor, err := questsCol.Find(ctx, bson.M{})
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var quests []Quest
	for cursor.Next(ctx) {
		var quest Quest
		if err := cursor.Decode(&quest); err != nil {
			continue
		}
		var userQuest struct {
			Completed bool `bson:"completed"`
		}
		userQuestsCol.FindOne(ctx, bson.M{"user_id": userID, "quest_id": quest.QuestID}).Decode(&userQuest)
		quest.Completed = userQuest.Completed
		quests = append(quests, quest)
	}

	return quests, nil
}

func collectLeaderboard(ctx context.Context, limit int64) ([]LeaderboardEntry, error) {
	findOpts := options.Find().SetSort(bson.M{"coins": -1})
	if limit > 0 {
		findOpts.SetLimit(limit)
	}

	cursor, err := usersCol.Find(ctx, bson.M{}, findOpts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var leaders []LeaderboardEntry
	for cursor.Next(ctx) {
		var user User
		if err := cursor.Decode(&user); err != nil {
			continue
		}

		count, _ := userQuestsCol.CountDocuments(ctx, bson.M{"user_id": user.UserID, "completed": true})
		leaders = append(leaders, LeaderboardEntry{
			UserID:          user.UserID,
			Name:            user.Name,
			CompletedQuests: int(count),
			Streak:          user.Streak,
			Coins:           user.Coins,
		})
	}

	return leaders, nil
}

func loadFacultyDashboard(ctx context.Context, facultyID int) (*facultyDashboardDoc, error) {
	var doc facultyDashboardDoc
	err := facultyDashboardsCol.FindOne(ctx, bson.M{"faculty_id": facultyID}).Decode(&doc)
	if err != nil {
		return nil, err
	}
	return &doc, nil
}

func courseStatusMeta(status string) (label string, tone string) {
	switch strings.ToLower(status) {
	case "published":
		return "Published", "emerald"
	case "draft":
		return "Draft", "amber"
	case "archived":
		return "Archived", "slate"
	case "meeting_soon":
		return "Meeting Soon", "amber"
	default:
		return strings.Title(status), "indigo"
	}
}

func normalizeMenteeStatus(status string) string {
	s := strings.ToLower(strings.TrimSpace(status))
	switch s {
	case "active", "meeting_soon", "archived":
		return s
	default:
		return "active"
	}
}

func normalizeAISuggestionStatus(status string) string {
	s := strings.ToLower(strings.TrimSpace(status))
	switch s {
	case "pending", "approved", "needs_follow_up", "reviewed", "escalated", "dismissed":
		return s
	case "":
		return "reviewed"
	default:
		return "reviewed"
	}
}

func normalizeCourseStatus(status string) string {
	s := strings.ToLower(strings.TrimSpace(status))
	switch s {
	case "published", "draft", "archived":
		return s
	default:
		return "draft"
	}
}

func prepareFacultyOverviewResponse(doc *facultyDashboardDoc, courses []FacultyCourse, leaders []LeaderboardEntry) FacultyOverviewResponse {
	var resp FacultyOverviewResponse
	if doc != nil {
		resp = mapFacultyDashboard(doc)
	} else {
		resp = FacultyOverviewResponse{
			Overview:   FacultyOverviewStats{},
			AIGrading:  FacultyAIGrading{Suggestions: []FacultyAISuggestion{}, PendingCount: 0, LastUpdated: formatRelativeTimestamp(time.Time{})},
			Mentorship: FacultyMentorship{Mentees: []FacultyMentee{}, ActiveCount: 0, LastUpdated: formatRelativeTimestamp(time.Time{})},
			Courses:    []FacultyCourseCard{},
			Analytics:  FacultyAnalytics{Labels: []string{}, Students: []int{}, AvgGrade: []int{}},
		}
	}

	if resp.AIGrading.Suggestions == nil {
		resp.AIGrading.Suggestions = []FacultyAISuggestion{}
	}
	if resp.Mentorship.Mentees == nil {
		resp.Mentorship.Mentees = []FacultyMentee{}
	}
	if resp.Courses == nil {
		resp.Courses = []FacultyCourseCard{}
	}
	if resp.Analytics.Labels == nil {
		resp.Analytics.Labels = []string{}
	}
	if resp.Analytics.Students == nil {
		resp.Analytics.Students = []int{}
	}
	if resp.Analytics.AvgGrade == nil {
		resp.Analytics.AvgGrade = []int{}
	}

	resp.CourseProgress = courses
	resp.TopPerformers = leaders

	return resp
}

func recomputeFacultyPending(ctx context.Context, doc *facultyDashboardDoc) {
	if doc == nil {
		return
	}
	pending := 0
	for _, suggestion := range doc.AISuggestions {
		if strings.EqualFold(suggestion.Status, "pending") {
			pending++
		}
	}
	doc.Overview.PendingReviews = pending
	if !doc.ID.IsZero() {
		_, _ = facultyDashboardsCol.UpdateOne(ctx, bson.M{"_id": doc.ID}, bson.M{"$set": bson.M{"overview.pending_reviews": pending}})
	}
}

func getFacultyTarget(w http.ResponseWriter, r *http.Request) (int, bool) {
	actorID, ok := getUserIDFromContext(r.Context())
	if !ok {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "unauthorized"})
		return 0, false
	}

	role := getUserRoleFromContext(r.Context())
	if role != RoleFaculty && role != RoleAdmin {
		writeJSON(w, http.StatusForbidden, map[string]string{"error": "faculty access required"})
		return 0, false
	}

	targetID := actorID
	if role == RoleAdmin {
		if override, err := strconv.Atoi(r.URL.Query().Get("faculty_id")); err == nil && override > 0 {
			targetID = override
		}
	}

	return targetID, true
}

func respondFacultyDashboard(w http.ResponseWriter, ctx context.Context, doc *facultyDashboardDoc) bool {
	if doc != nil {
		recomputeFacultyPending(ctx, doc)
	}

	courses, leaders, err := collectFacultyAggregates(ctx)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return false
	}

	resp := prepareFacultyOverviewResponse(doc, courses, leaders)
	writeJSON(w, http.StatusOK, resp)
	return true
}

func mapFacultyDashboard(doc *facultyDashboardDoc) FacultyOverviewResponse {
	if doc == nil {
		return FacultyOverviewResponse{}
	}

	overview := FacultyOverviewStats{
		CoursesTaught:    doc.Overview.CoursesTaught,
		StudentsMentored: doc.Overview.StudentsMentored,
		AverageGrade:     doc.Overview.AverageGrade,
		PendingReviews:   doc.Overview.PendingReviews,
	}

	suggestions := make([]FacultyAISuggestion, 0, len(doc.AISuggestions))
	pendingCount := 0
	for _, suggestion := range doc.AISuggestions {
		if strings.EqualFold(suggestion.Status, "pending") {
			pendingCount++
		}
		suggestions = append(suggestions, FacultyAISuggestion{
			ID:              suggestion.ID.Hex(),
			Title:           suggestion.Title,
			Course:          suggestion.Course,
			Summary:         suggestion.Summary,
			Recommendation:  suggestion.Recommendation,
			GradeSuggestion: suggestion.GradeSuggestion,
			Status:          suggestion.Status,
			CreatedAt:       suggestion.CreatedAt.UTC().Format(time.RFC3339),
			UpdatedAt:       suggestion.UpdatedAt.UTC().Format(time.RFC3339),
		})
	}

	aiGrading := FacultyAIGrading{
		Suggestions:  suggestions,
		PendingCount: pendingCount,
		LastUpdated:  formatRelativeTimestamp(doc.UpdatedAt),
	}
	overview.PendingReviews = pendingCount

	mentees := make([]FacultyMentee, 0, len(doc.Mentorship.Mentees))
	activeCount := 0
	for _, mentee := range doc.Mentorship.Mentees {
		status := normalizeMenteeStatus(mentee.Status)
		if status != "archived" {
			activeCount++
		}
		mentees = append(mentees, FacultyMentee{
			ID:          mentee.ID.Hex(),
			Name:        mentee.Name,
			Status:      status,
			NextSession: mentee.NextSession,
			Note:        mentee.Note,
			UpdatedAt:   mentee.UpdatedAt.UTC().Format(time.RFC3339),
		})
	}

	mentorship := FacultyMentorship{
		Mentees:     mentees,
		ActiveCount: activeCount,
		LastUpdated: formatRelativeTimestamp(doc.Mentorship.LastUpdated),
	}

	courses := make([]FacultyCourseCard, 0, len(doc.Courses))
	for _, course := range doc.Courses {
		label, tone := courseStatusMeta(course.Status)
		courses = append(courses, FacultyCourseCard{
			ID:          course.ID.Hex(),
			Title:       course.Title,
			Status:      course.Status,
			StatusLabel: label,
			StatusTone:  tone,
			Code:        course.Code,
			LastUpdated: course.LastUpdated.UTC().Format(time.RFC3339),
		})
	}

	analytics := FacultyAnalytics{
		Labels:   doc.Analytics.Labels,
		Students: doc.Analytics.Students,
		AvgGrade: doc.Analytics.AvgGrade,
	}

	return FacultyOverviewResponse{
		Overview:   overview,
		AIGrading:  aiGrading,
		Mentorship: mentorship,
		Courses:    courses,
		Analytics:  analytics,
	}
}

func collectFacultyAggregates(ctx context.Context) ([]FacultyCourse, []LeaderboardEntry, error) {
	cursor, err := usersCol.Find(ctx, bson.M{"role": RoleStudent})
	if err != nil {
		return nil, nil, err
	}
	defer cursor.Close(ctx)

	type agg struct {
		totalProgress int
		students      int
		lastDue       string
	}

	courseMap := map[int]*agg{}
	courseTitles := map[int]string{}

	for cursor.Next(ctx) {
		var student User
		if err := cursor.Decode(&student); err != nil {
			continue
		}

		for _, course := range student.ActiveCourses {
			courseTitles[course.CourseID] = course.Title
			aggregate, exists := courseMap[course.CourseID]
			if !exists {
				aggregate = &agg{}
				courseMap[course.CourseID] = aggregate
			}
			aggregate.totalProgress += course.Progress
			aggregate.students++
			if course.DueNext != "" {
				aggregate.lastDue = course.DueNext
			}
		}
	}

	courses := make([]FacultyCourse, 0, len(courseMap))
	for courseID, data := range courseMap {
		avg := 0.0
		if data.students > 0 {
			avg = float64(data.totalProgress) / float64(data.students)
		}
		courses = append(courses, FacultyCourse{
			CourseID:        courseID,
			Title:           courseTitles[courseID],
			AverageProgress: avg,
			Students:        data.students,
			DueNext:         data.lastDue,
		})
	}

	sort.Slice(courses, func(i, j int) bool {
		return courses[i].AverageProgress > courses[j].AverageProgress
	})

	leaders, err := collectLeaderboard(ctx, 5)
	if err != nil {
		return courses, nil, err
	}

	return courses, leaders, nil
}

func collectResearchFeed(ctx context.Context, viewerID int, limit int64) ([]ResearchPostResponse, error) {
	findOpts := options.Find().SetSort(bson.D{{Key: "created_at", Value: -1}})
	if limit > 0 {
		findOpts.SetLimit(limit)
	}

	cursor, err := researchPostsCol.Find(ctx, bson.M{}, findOpts)
	if err != nil {
		return nil, fmt.Errorf("failed to load research posts: %w", err)
	}
	defer cursor.Close(ctx)

	feed := make([]ResearchPostResponse, 0)
	for cursor.Next(ctx) {
		var post ResearchPost
		if err := cursor.Decode(&post); err != nil {
			continue
		}
		feed = append(feed, buildResearchPostResponse(post, viewerID))
	}

	return feed, nil
}

func buildResearchPostResponse(post ResearchPost, viewerID int) ResearchPostResponse {
	id := ""
	if !post.ID.IsZero() {
		id = post.ID.Hex()
	} else {
		id = fmt.Sprintf("research-%d", post.CreatedAt.UnixNano())
	}

	title := strings.TrimSpace(post.Title)
	if title == "" {
		title = deriveTitleFromBody(post.Body)
	}

	summary := strings.TrimSpace(post.Summary)
	if summary == "" {
		summary = truncateText(post.Body, researchSummaryLimit)
	}
	if summary == "" {
		summary = "An exciting research update from our community."
	}

	category := normalizeResearchCategory(post.Category, post.IsCollaboration)
	tags := sanitizeTagList(post.Tags)
	timestamp := formatRelativeTimestamp(post.CreatedAt)
	createdAt := ""
	if !post.CreatedAt.IsZero() {
		createdAt = post.CreatedAt.UTC().Format(time.RFC3339)
	}

	response := ResearchPostResponse{
		ID:       id,
		Title:    title,
		Summary:  summary,
		Category: category,
		Tags:     tags,
		Author: ResearchPostAuthor{
			Name: post.AuthorName,
			Role: post.AuthorRole,
		},
		Timestamp:       timestamp,
		CreatedAt:       createdAt,
		Image:           strings.TrimSpace(post.ImageURL),
		Link:            strings.TrimSpace(post.Link),
		Stats:           ResearchPostStats{Likes: post.Likes, Comments: post.Comments, Collaborations: post.Collaborations},
		IsCollaboration: post.IsCollaboration,
		IsMine:          post.AuthorID == viewerID,
		Trending:        isResearchPostTrending(post),
	}

	return response
}

func isResearchPostTrending(post ResearchPost) bool {
	score := post.Likes + post.Comments + (post.Collaborations * 3)
	if score >= 30 {
		return true
	}
	if time.Since(post.CreatedAt) <= 72*time.Hour && score >= 12 {
		return true
	}
	return false
}

func formatRelativeTimestamp(t time.Time) string {
	if t.IsZero() {
		return "Recently"
	}

	diff := time.Since(t)
	if diff < time.Minute {
		return "Just now"
	}
	if diff < time.Hour {
		minutes := int(diff.Minutes())
		if minutes <= 1 {
			return "1 minute ago"
		}
		return fmt.Sprintf("%d minutes ago", minutes)
	}
	if diff < 24*time.Hour {
		hours := int(diff.Hours())
		if hours <= 1 {
			return "1 hour ago"
		}
		return fmt.Sprintf("%d hours ago", hours)
	}
	if diff < 7*24*time.Hour {
		days := int(diff.Hours() / 24)
		if days <= 1 {
			return "1 day ago"
		}
		return fmt.Sprintf("%d days ago", days)
	}
	if diff < 30*24*time.Hour {
		weeks := int(diff.Hours() / (24 * 7))
		if weeks <= 1 {
			return "1 week ago"
		}
		return fmt.Sprintf("%d weeks ago", weeks)
	}
	return t.Format("Jan 2, 2006")
}

func sanitizeTagList(tags []string) []string {
	seen := make(map[string]bool)
	result := make([]string, 0, len(tags))
	for _, tag := range tags {
		clean := strings.TrimSpace(strings.TrimLeft(tag, "#"))
		clean = strings.ReplaceAll(clean, " ", "-")
		clean = strings.Trim(clean, "-_")
		if clean == "" {
			continue
		}
		key := strings.ToLower(clean)
		if seen[key] {
			continue
		}
		seen[key] = true
		result = append(result, clean)
		if len(result) >= researchMaxTags {
			break
		}
	}
	return result
}

func extractTagsFromText(text string) []string {
	matches := hashtagRegex.FindAllStringSubmatch(text, -1)
	if len(matches) == 0 {
		return nil
	}
	raw := make([]string, 0, len(matches))
	for _, match := range matches {
		if len(match) > 1 {
			raw = append(raw, match[1])
		}
	}
	return sanitizeTagList(raw)
}

func mergeUniqueStrings(primary, secondary []string, max int) []string {
	seen := make(map[string]bool)
	result := make([]string, 0, max)
	for _, collection := range [][]string{primary, secondary} {
		for _, value := range collection {
			clean := strings.TrimSpace(value)
			if clean == "" {
				continue
			}
			key := strings.ToLower(clean)
			if seen[key] {
				continue
			}
			seen[key] = true
			result = append(result, clean)
			if max > 0 && len(result) >= max {
				return result
			}
		}
	}
	return result
}

func truncateText(text string, limit int) string {
	if limit <= 0 {
		return strings.TrimSpace(text)
	}
	runes := []rune(strings.TrimSpace(text))
	if len(runes) <= limit {
		return strings.TrimSpace(text)
	}
	truncated := strings.TrimSpace(string(runes[:limit]))
	if truncated == "" {
		return string(runes[:limit])
	}
	return truncated + "…"
}

func deriveTitleFromBody(body string) string {
	trimmed := strings.TrimSpace(body)
	if trimmed == "" {
		return "Research update"
	}
	for _, line := range strings.Split(trimmed, "\n") {
		title := strings.TrimSpace(line)
		if title != "" {
			return truncateText(title, researchTitleLimit)
		}
	}
	return truncateText(trimmed, researchTitleLimit)
}

func normalizeResearchCategory(raw string, isCollaboration bool) string {
	category := strings.TrimSpace(raw)
	if category == "" {
		if isCollaboration {
			return "Collaboration"
		}
		return "My Research"
	}
	switch strings.ToLower(category) {
	case "collaboration", "collaborations", "collab", "team-up":
		return "Collaboration"
	case "my research", "research", "personal":
		return "My Research"
	case "trending":
		return "Trending"
	default:
		return category
	}
}

func ensureURLHasScheme(value string) string {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		return ""
	}
	lower := strings.ToLower(trimmed)
	if strings.HasPrefix(lower, "http://") || strings.HasPrefix(lower, "https://") || strings.HasPrefix(lower, "data:") || strings.HasPrefix(lower, "//") {
		return trimmed
	}
	return "https://" + trimmed
}

func deriveAuthorRoleLabel(user User, override string) string {
	if override = strings.TrimSpace(override); override != "" {
		return override
	}
	switch user.Role {
	case RoleFaculty:
		return "Faculty Mentor"
	case RoleAdmin:
		return "Administrator"
	default:
		if len(user.ActiveCourses) > 0 {
			return fmt.Sprintf("Student · %s", user.ActiveCourses[0].Title)
		}
		return "Student Researcher"
	}
}

func GetResearchPosts(w http.ResponseWriter, r *http.Request) {
	viewerID, ok := getUserIDFromContext(r.Context())
	if !ok {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "unauthorized"})
		return
	}

	var limit int64
	if raw := strings.TrimSpace(r.URL.Query().Get("limit")); raw != "" {
		if parsed, err := strconv.Atoi(raw); err == nil && parsed > 0 {
			limit = int64(parsed)
		}
	}

	ctx := context.Background()
	feed, err := collectResearchFeed(ctx, viewerID, limit)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{"items": feed})
}

func CreateResearchPost(w http.ResponseWriter, r *http.Request) {
	authorID, ok := getUserIDFromContext(r.Context())
	if !ok {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "unauthorized"})
		return
	}

	ctx := context.Background()
	var user User
	if err := usersCol.FindOne(ctx, bson.M{"user_id": authorID}).Decode(&user); err != nil {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "user not found"})
		return
	}

	var req struct {
		Title           string   `json:"title"`
		Summary         string   `json:"summary"`
		Body            string   `json:"body"`
		Category        string   `json:"category"`
		Tags            []string `json:"tags"`
		Link            string   `json:"link"`
		Image           string   `json:"image"`
		IsCollaboration *bool    `json:"isCollaboration"`
		AuthorRole      string   `json:"authorRole"`
	}

	if err := decodeJSON(r, &req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid payload"})
		return
	}

	body := strings.TrimSpace(req.Body)
	summary := strings.TrimSpace(req.Summary)
	title := strings.TrimSpace(req.Title)

	if body == "" {
		body = summary
	}
	if body == "" {
		body = title
	}
	if body == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "content is required"})
		return
	}

	if summary == "" {
		summary = truncateText(body, researchSummaryLimit)
	} else {
		summary = truncateText(summary, researchSummaryLimit)
	}
	if title == "" {
		title = deriveTitleFromBody(body)
	} else {
		title = truncateText(title, researchTitleLimit)
	}

	isCollab := false
	if req.IsCollaboration != nil {
		isCollab = *req.IsCollaboration
	} else if strings.EqualFold(strings.TrimSpace(req.Category), "collaboration") {
		isCollab = true
	}

	tags := mergeUniqueStrings(sanitizeTagList(req.Tags), extractTagsFromText(body), researchMaxTags)
	category := normalizeResearchCategory(req.Category, isCollab)
	link := ensureURLHasScheme(req.Link)
	image := ensureURLHasScheme(req.Image)
	authorRole := deriveAuthorRoleLabel(user, req.AuthorRole)
	now := time.Now().UTC()

	post := ResearchPost{
		AuthorID:        authorID,
		AuthorName:      user.Name,
		AuthorRole:      authorRole,
		Title:           title,
		Summary:         summary,
		Body:            body,
		Category:        category,
		Tags:            tags,
		ImageURL:        image,
		Link:            link,
		Likes:           0,
		Comments:        0,
		Collaborations:  0,
		IsCollaboration: isCollab,
		CreatedAt:       now,
		UpdatedAt:       now,
	}

	res, err := researchPostsCol.InsertOne(ctx, post)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "failed to save post"})
		return
	}
	if oid, ok := res.InsertedID.(primitive.ObjectID); ok {
		post.ID = oid
	}

	response := buildResearchPostResponse(post, authorID)
	writeJSON(w, http.StatusCreated, response)
}

func GetAdminOverview(w http.ResponseWriter, r *http.Request) {
	if !hasRole(r.Context(), RoleAdmin) {
		writeJSON(w, http.StatusForbidden, map[string]string{"error": "admin access required"})
		return
	}

	ctx := context.Background()
	totalUsers, _ := usersCol.CountDocuments(ctx, bson.M{})
	studentCount, _ := usersCol.CountDocuments(ctx, bson.M{"role": RoleStudent})
	facultyCount, _ := usersCol.CountDocuments(ctx, bson.M{"role": RoleFaculty})
	questsCount, _ := questsCol.CountDocuments(ctx, bson.M{})

	cursor, err := usersCol.Find(ctx, bson.M{})
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "failed to load users"})
		return
	}
	defer cursor.Close(ctx)

	var coinSum int
	for cursor.Next(ctx) {
		var user User
		if err := cursor.Decode(&user); err != nil {
			continue
		}
		coinSum += user.Coins
	}

	leaders, err := collectLeaderboard(ctx, 5)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	activity, err := collectRecentActivity(ctx, 5)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	var avgCoins float64
	if totalUsers > 0 {
		avgCoins = float64(coinSum) / float64(totalUsers)
	}

	resp := AdminOverviewResponse{
		AverageCoins:   avgCoins,
		Leaderboard:    leaders,
		RecentActivity: activity,
	}
	resp.Totals.Users = int(totalUsers)
	resp.Totals.Students = int(studentCount)
	resp.Totals.Faculty = int(facultyCount)
	resp.Totals.ActiveQuests = int(questsCount)

	writeJSON(w, http.StatusOK, resp)
}

func collectRecentActivity(ctx context.Context, limit int64) ([]AdminActivity, error) {
	findOpts := options.Find().SetSort(bson.M{"completed_at": -1}).SetLimit(limit)
	cursor, err := userQuestsCol.Find(ctx, bson.M{}, findOpts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	activities := []AdminActivity{}
	userCache := map[int]string{}
	questCache := map[int]string{}

	for cursor.Next(ctx) {
		var record struct {
			UserID      int       `bson:"user_id"`
			QuestID     int       `bson:"quest_id"`
			CompletedAt time.Time `bson:"completed_at"`
		}
		if err := cursor.Decode(&record); err != nil {
			continue
		}

		if _, ok := userCache[record.UserID]; !ok {
			var user User
			if err := usersCol.FindOne(ctx, bson.M{"user_id": record.UserID}).Decode(&user); err == nil {
				userCache[record.UserID] = user.Name
			}
		}

		if _, ok := questCache[record.QuestID]; !ok {
			var quest Quest
			if err := questsCol.FindOne(ctx, bson.M{"quest_id": record.QuestID}).Decode(&quest); err == nil {
				questCache[record.QuestID] = quest.Title
			}
		}

		activities = append(activities, AdminActivity{
			UserName:    userCache[record.UserID],
			QuestTitle:  questCache[record.QuestID],
			CompletedAt: record.CompletedAt,
		})
	}

	return activities, nil
}

func GetFacultyOverview(w http.ResponseWriter, r *http.Request) {
	targetID, ok := getFacultyTarget(w, r)
	if !ok {
		return
	}

	ctx := context.Background()
	doc, err := loadFacultyDashboard(ctx, targetID)
	if err != nil {
		if !errors.Is(err, mongo.ErrNoDocuments) {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "failed to load faculty dashboard"})
			return
		}
		doc = nil
	}

	_ = respondFacultyDashboard(w, ctx, doc)
}

func ReviewFacultyAISuggestion(w http.ResponseWriter, r *http.Request) {
	targetID, ok := getFacultyTarget(w, r)
	if !ok {
		return
	}

	vars := mux.Vars(r)
	suggestionHex := vars["id"]
	suggestionID, err := primitive.ObjectIDFromHex(suggestionHex)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid suggestion id"})
		return
	}

	var req struct {
		Status          string `json:"status"`
		Recommendation  string `json:"recommendation"`
		GradeSuggestion string `json:"gradeSuggestion"`
	}
	if err := decodeJSON(r, &req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid payload"})
		return
	}

	status := normalizeAISuggestionStatus(req.Status)
	now := time.Now().UTC()
	setFields := bson.M{
		"ai_suggestions.$.status":     status,
		"ai_suggestions.$.updated_at": now,
	}
	if rec := strings.TrimSpace(req.Recommendation); rec != "" {
		setFields["ai_suggestions.$.recommendation"] = rec
	}
	if grade := strings.TrimSpace(req.GradeSuggestion); grade != "" {
		setFields["ai_suggestions.$.grade_suggestion"] = grade
	}

	ctx := context.Background()
	findOpts := options.FindOneAndUpdate().SetReturnDocument(options.After)
	var doc facultyDashboardDoc
	err = facultyDashboardsCol.FindOneAndUpdate(
		ctx,
		bson.M{"faculty_id": targetID, "ai_suggestions._id": suggestionID},
		bson.M{
			"$set":         setFields,
			"$currentDate": bson.M{"updated_at": true},
		},
		findOpts,
	).Decode(&doc)
	if errors.Is(err, mongo.ErrNoDocuments) {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "suggestion not found"})
		return
	}
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "failed to update suggestion"})
		return
	}

	if !respondFacultyDashboard(w, ctx, &doc) {
		return
	}
}

func AddFacultyMentee(w http.ResponseWriter, r *http.Request) {
	targetID, ok := getFacultyTarget(w, r)
	if !ok {
		return
	}

	var req struct {
		Name        string `json:"name"`
		Status      string `json:"status"`
		NextSession string `json:"nextSession"`
		Note        string `json:"note"`
	}
	if err := decodeJSON(r, &req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid payload"})
		return
	}

	name := strings.TrimSpace(req.Name)
	if name == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "name is required"})
		return
	}

	now := time.Now().UTC()
	mentee := facultyMenteeDoc{
		ID:          primitive.NewObjectID(),
		Name:        name,
		Status:      normalizeMenteeStatus(req.Status),
		NextSession: strings.TrimSpace(req.NextSession),
		Note:        strings.TrimSpace(req.Note),
		CreatedAt:   now,
		UpdatedAt:   now,
	}

	ctx := context.Background()
	findOpts := options.FindOneAndUpdate().SetReturnDocument(options.After)
	var doc facultyDashboardDoc
	err := facultyDashboardsCol.FindOneAndUpdate(
		ctx,
		bson.M{"faculty_id": targetID},
		bson.M{
			"$push": bson.M{"mentorship.mentees": mentee},
			"$set": bson.M{
				"mentorship.last_updated": now,
				"updated_at":              now,
			},
			"$inc": bson.M{"overview.students_mentored": 1},
		},
		findOpts,
	).Decode(&doc)
	if errors.Is(err, mongo.ErrNoDocuments) {
		newDoc := facultyDashboardDoc{
			FacultyID: targetID,
			Overview: facultyOverviewDoc{
				CoursesTaught:    0,
				StudentsMentored: 1,
				AverageGrade:     0,
				PendingReviews:   0,
			},
			AISuggestions: []facultyAISuggestionDoc{},
			Mentorship: facultyMentorshipDoc{
				Mentees:     []facultyMenteeDoc{mentee},
				LastUpdated: now,
			},
			Courses:   []facultyCourseDoc{},
			Analytics: facultyAnalyticsDoc{Labels: []string{}, Students: []int{}, AvgGrade: []int{}},
			CreatedAt: now,
			UpdatedAt: now,
		}
		res, insertErr := facultyDashboardsCol.InsertOne(ctx, newDoc)
		if insertErr != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "failed to create dashboard"})
			return
		}
		if oid, ok := res.InsertedID.(primitive.ObjectID); ok {
			newDoc.ID = oid
		}
		doc = newDoc
	} else if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "failed to add mentee"})
		return
	}

	if !respondFacultyDashboard(w, ctx, &doc) {
		return
	}
}

func UpdateFacultyMenteeStatus(w http.ResponseWriter, r *http.Request) {
	targetID, ok := getFacultyTarget(w, r)
	if !ok {
		return
	}

	vars := mux.Vars(r)
	menteeHex := vars["id"]
	menteeID, err := primitive.ObjectIDFromHex(menteeHex)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid mentee id"})
		return
	}

	var req struct {
		Status      *string `json:"status"`
		NextSession *string `json:"nextSession"`
		Note        *string `json:"note"`
	}
	if err := decodeJSON(r, &req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid payload"})
		return
	}

	now := time.Now().UTC()
	setFields := bson.M{
		"mentorship.mentees.$.updated_at": now,
		"mentorship.last_updated":         now,
	}
	if req.Status != nil {
		setFields["mentorship.mentees.$.status"] = normalizeMenteeStatus(*req.Status)
	}
	if req.NextSession != nil {
		setFields["mentorship.mentees.$.next_session"] = strings.TrimSpace(*req.NextSession)
	}
	if req.Note != nil {
		setFields["mentorship.mentees.$.note"] = strings.TrimSpace(*req.Note)
	}

	ctx := context.Background()
	opts := options.FindOneAndUpdate().SetReturnDocument(options.After)
	var doc facultyDashboardDoc
	err = facultyDashboardsCol.FindOneAndUpdate(
		ctx,
		bson.M{"faculty_id": targetID, "mentorship.mentees._id": menteeID},
		bson.M{
			"$set":         setFields,
			"$currentDate": bson.M{"updated_at": true},
		},
		opts,
	).Decode(&doc)
	if errors.Is(err, mongo.ErrNoDocuments) {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "mentee not found"})
		return
	}
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "failed to update mentee"})
		return
	}

	if !respondFacultyDashboard(w, ctx, &doc) {
		return
	}

}

func AddFacultyCourse(w http.ResponseWriter, r *http.Request) {
	targetID, ok := getFacultyTarget(w, r)
	if !ok {
		return
	}

	var req struct {
		Title  string `json:"title"`
		Status string `json:"status"`
		Code   string `json:"code"`
	}
	if err := decodeJSON(r, &req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid payload"})
		return
	}

	title := strings.TrimSpace(req.Title)
	if title == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "title is required"})
		return
	}

	now := time.Now().UTC()
	course := facultyCourseDoc{
		ID:          primitive.NewObjectID(),
		Title:       title,
		Status:      normalizeCourseStatus(req.Status),
		Code:        strings.TrimSpace(req.Code),
		LastUpdated: now,
	}

	ctx := context.Background()
	findOpts := options.FindOneAndUpdate().SetReturnDocument(options.After)
	var doc facultyDashboardDoc
	err := facultyDashboardsCol.FindOneAndUpdate(
		ctx,
		bson.M{"faculty_id": targetID},
		bson.M{
			"$push": bson.M{"courses": course},
			"$set":  bson.M{"updated_at": now},
			"$inc":  bson.M{"overview.courses_taught": 1},
		},
		findOpts,
	).Decode(&doc)
	if errors.Is(err, mongo.ErrNoDocuments) {
		newDoc := facultyDashboardDoc{
			FacultyID: targetID,
			Overview: facultyOverviewDoc{
				CoursesTaught:    1,
				StudentsMentored: 0,
				AverageGrade:     0,
				PendingReviews:   0,
			},
			AISuggestions: []facultyAISuggestionDoc{},
			Mentorship: facultyMentorshipDoc{
				Mentees:     []facultyMenteeDoc{},
				LastUpdated: now,
			},
			Courses:   []facultyCourseDoc{course},
			Analytics: facultyAnalyticsDoc{Labels: []string{}, Students: []int{}, AvgGrade: []int{}},
			CreatedAt: now,
			UpdatedAt: now,
		}
		res, insertErr := facultyDashboardsCol.InsertOne(ctx, newDoc)
		if insertErr != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "failed to create dashboard"})
			return
		}
		if oid, ok := res.InsertedID.(primitive.ObjectID); ok {
			newDoc.ID = oid
		}
		doc = newDoc
	} else if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "failed to add course"})
		return
	}

	if !respondFacultyDashboard(w, ctx, &doc) {
		return
	}
}

func UpdateFacultyCourseStatus(w http.ResponseWriter, r *http.Request) {
	targetID, ok := getFacultyTarget(w, r)
	if !ok {
		return
	}

	vars := mux.Vars(r)
	courseHex := vars["id"]
	courseID, err := primitive.ObjectIDFromHex(courseHex)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid course id"})
		return
	}

	var req struct {
		Status *string `json:"status"`
		Title  *string `json:"title"`
		Code   *string `json:"code"`
	}
	if err := decodeJSON(r, &req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid payload"})
		return
	}

	now := time.Now().UTC()
	setFields := bson.M{
		"courses.$.last_updated": now,
	}
	if req.Status != nil {
		setFields["courses.$.status"] = normalizeCourseStatus(*req.Status)
	}
	if req.Title != nil {
		setFields["courses.$.title"] = strings.TrimSpace(*req.Title)
	}
	if req.Code != nil {
		setFields["courses.$.code"] = strings.TrimSpace(*req.Code)
	}

	ctx := context.Background()
	opts := options.FindOneAndUpdate().SetReturnDocument(options.After)
	var doc facultyDashboardDoc
	err = facultyDashboardsCol.FindOneAndUpdate(
		ctx,
		bson.M{"faculty_id": targetID, "courses._id": courseID},
		bson.M{
			"$set":         setFields,
			"$currentDate": bson.M{"updated_at": true},
		},
		opts,
	).Decode(&doc)
	if errors.Is(err, mongo.ErrNoDocuments) {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "course not found"})
		return
	}
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "failed to update course"})
		return
	}

	if !respondFacultyDashboard(w, ctx, &doc) {
		return
	}
}

// AI handlers
func AIChat(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Message string `json:"message"`
		APIKey  string `json:"apiKey"`
	}
	if err := decodeJSON(r, &req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid payload"})
		return
	}

	message := strings.TrimSpace(req.Message)
	if message == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "message is required"})
		return
	}

	keyToUse := strings.TrimSpace(req.APIKey)
	if keyToUse == "" {
		keyToUse = geminiAPIKey
	}

	if keyToUse == "" {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "AI provider key is not configured"})
		return
	}

	response, err := callGeminiAPI(keyToUse, message)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"response": response})
}

func callGeminiAPI(apiKey, message string) (string, error) {
	preferred := strings.TrimSpace(geminiModel)
	// Use current available Gemini model identifiers (2024-2025)
	models := uniqueModels(preferred,
		"gemini-1.5-flash-002",
		"gemini-1.5-flash-001",
		"gemini-1.5-pro-002",
		"gemini-1.5-pro-001",
		"gemini-1.0-pro",
	)

	var lastErr error
	for _, model := range models {
		response, err := invokeGeminiModel(apiKey, message, model)
		if err == nil {
			return response, nil
		}
		if isModelFallbackError(err) {
			lastErr = err
			continue
		}
		return "", err
	}

	if lastErr != nil {
		return "", lastErr
	}

	return "", fmt.Errorf("gemini returned an empty response")
}

func invokeGeminiModel(apiKey, message, model string) (string, error) {
	// Use v1beta as it has better model support
	versions := []string{"v1beta"}
	var lastErr error
	for _, version := range versions {
		response, err := invokeGeminiModelVersion(apiKey, message, model, version)
		if err == nil {
			return response, nil
		}
		if isModelFallbackError(err) {
			lastErr = err
			continue
		}
		return "", err
	}

	if lastErr != nil {
		return "", lastErr
	}

	return "", fmt.Errorf("gemini returned an empty response")
}

func invokeGeminiModelVersion(apiKey, message, model, version string) (string, error) {
	endpoint := fmt.Sprintf(
		"https://generativelanguage.googleapis.com/%s/models/%s:generateContent?key=%s",
		version,
		model,
		apiKey,
	)

	type geminiRequest struct {
		Contents []struct {
			Role  string `json:"role,omitempty"`
			Parts []struct {
				Text string `json:"text"`
			} `json:"parts"`
		} `json:"contents"`
		GenerationConfig struct {
			Temperature     float64  `json:"temperature,omitempty"`
			TopP            float64  `json:"topP,omitempty"`
			TopK            float64  `json:"topK,omitempty"`
			CandidateCount  int      `json:"candidateCount,omitempty"`
			MaxOutputTokens int      `json:"maxOutputTokens,omitempty"`
			StopSequences   []string `json:"stopSequences,omitempty"`
		} `json:"generationConfig"`
	}

	reqPayload := geminiRequest{}
	content := struct {
		Role  string `json:"role,omitempty"`
		Parts []struct {
			Text string `json:"text"`
		} `json:"parts"`
	}{
		Role: "user",
		Parts: []struct {
			Text string `json:"text"`
		}{
			{Text: message},
		},
	}
	reqPayload.Contents = append(reqPayload.Contents, content)
	reqPayload.GenerationConfig = struct {
		Temperature     float64  `json:"temperature,omitempty"`
		TopP            float64  `json:"topP,omitempty"`
		TopK            float64  `json:"topK,omitempty"`
		CandidateCount  int      `json:"candidateCount,omitempty"`
		MaxOutputTokens int      `json:"maxOutputTokens,omitempty"`
		StopSequences   []string `json:"stopSequences,omitempty"`
	}{
		Temperature:     0.7,
		TopP:            0.95,
		CandidateCount:  1,
		MaxOutputTokens: 1024,
	}

	jsonData, err := json.Marshal(reqPayload)
	if err != nil {
		return "", fmt.Errorf("gemini payload error: %w", err)
	}

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint, bytes.NewReader(jsonData))
	if err != nil {
		return "", fmt.Errorf("gemini request error: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("gemini transport error: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", fmt.Errorf("gemini read error: %w", err)
	}

	if resp.StatusCode >= 400 {
		return "", parseGeminiError(version, resp.StatusCode, body)
	}

	type geminiResponse struct {
		Candidates []struct {
			FinishReason string `json:"finishReason"`
			Content      struct {
				Parts []struct {
					Text string `json:"text"`
				} `json:"parts"`
			} `json:"content"`
			SafetyRatings []struct {
				Category    string `json:"category"`
				Probability string `json:"probability"`
			} `json:"safetyRatings"`
		} `json:"candidates"`
		PromptFeedback struct {
			BlockReason string `json:"blockReason"`
		} `json:"promptFeedback"`
	}

	var parsed geminiResponse
	if err := json.Unmarshal(body, &parsed); err != nil {
		return "", fmt.Errorf("gemini parse error: %w", err)
	}

	if parsed.PromptFeedback.BlockReason != "" {
		return "", fmt.Errorf("gemini blocked the prompt (%s)", strings.ToLower(parsed.PromptFeedback.BlockReason))
	}

	for _, candidate := range parsed.Candidates {
		builder := strings.Builder{}
		for _, part := range candidate.Content.Parts {
			builder.WriteString(part.Text)
		}
		text := strings.TrimSpace(builder.String())
		if text != "" {
			return text, nil
		}
		if strings.EqualFold(candidate.FinishReason, "SAFETY") {
			return "", fmt.Errorf("gemini refused to answer due to safety settings")
		}
	}

	return "", fmt.Errorf("gemini returned an empty response")
}

type geminiAPIError struct {
	StatusCode int
	Status     string
	Message    string
	Version    string
}

func (e *geminiAPIError) Error() string {
	status := e.Status
	if status == "" {
		status = http.StatusText(e.StatusCode)
	}
	ver := e.Version
	if ver == "" {
		ver = "v1beta"
	}
	if e.Message != "" {
		return fmt.Sprintf("gemini API error (%s %d %s): %s", ver, e.StatusCode, status, e.Message)
	}
	return fmt.Sprintf("gemini API error (%s %d %s)", ver, e.StatusCode, status)
}

func parseGeminiError(version string, statusCode int, body []byte) error {
	var apiErr struct {
		Error struct {
			Code    int    `json:"code"`
			Message string `json:"message"`
			Status  string `json:"status"`
		} `json:"error"`
	}
	if err := json.Unmarshal(body, &apiErr); err == nil && (apiErr.Error.Code != 0 || apiErr.Error.Message != "") {
		return &geminiAPIError{
			StatusCode: statusCode,
			Status:     apiErr.Error.Status,
			Message:    apiErr.Error.Message,
			Version:    version,
		}
	}

	return &geminiAPIError{
		StatusCode: statusCode,
		Message:    fmt.Sprintf("status %d", statusCode),
		Version:    version,
	}
}

func isModelFallbackError(err error) bool {
	var apiErr *geminiAPIError
	if errors.As(err, &apiErr) {
		if apiErr.StatusCode == http.StatusNotFound {
			return true
		}
		message := strings.ToLower(apiErr.Message)
		if strings.Contains(message, "not supported for generatecontent") {
			return true
		}
	}
	return false
}

func uniqueModels(preferred string, fallbacks ...string) []string {
	seen := map[string]bool{}
	models := make([]string, 0, len(fallbacks)+1)
	add := func(model string) {
		model = strings.TrimSpace(model)
		if model == "" {
			return
		}
		if !seen[model] {
			seen[model] = true
			models = append(models, model)
		}
	}

	add(preferred)
	for _, model := range fallbacks {
		add(model)
	}

	return models
}
