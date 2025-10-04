package main

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/gorilla/mux"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// Set in main.go from env or fallback demo key
var geminiAPIKey string

const (
	RoleAdmin   = "admin"
	RoleFaculty = "faculty"
	RoleStudent = "student"
)

type CourseProgress struct {
	CourseID   int    `json:"courseId" bson:"course_id"`
	Title      string `json:"title" bson:"title"`
	Progress   int    `json:"progress" bson:"progress"`
	Instructor string `json:"instructor,omitempty" bson:"instructor,omitempty"`
	DueNext    string `json:"dueNext,omitempty" bson:"due_next,omitempty"`
}

// User handlers
type User struct {
	UserID            int              `json:"id" bson:"user_id"`
	Name              string           `json:"name" bson:"name"`
	Email             string           `json:"email" bson:"email"`
	Coins             int              `json:"coins" bson:"coins"`
	Streak            int              `json:"streak" bson:"streak"`
	Role              string           `json:"role" bson:"role"`
	PasswordHash      string           `json:"-" bson:"password_hash"`
	AcademicStanding  int              `json:"academicStanding" bson:"academic_standing"`
	GamificationLevel int              `json:"gamificationLevel" bson:"gamification_level"`
	CourseProgress    int              `json:"courseProgress" bson:"course_progress"`
	ActiveCourses     []CourseProgress `json:"activeCourses" bson:"active_courses"`
}

type publicUser struct {
	ID                int              `json:"id"`
	Name              string           `json:"name"`
	Email             string           `json:"email"`
	Coins             int              `json:"coins"`
	Streak            int              `json:"streak"`
	Role              string           `json:"role"`
	AcademicStanding  int              `json:"academicStanding"`
	GamificationLevel int              `json:"gamificationLevel"`
	CourseProgress    int              `json:"courseProgress"`
	ActiveCourses     []CourseProgress `json:"activeCourses"`
}

func sanitizeUser(u *User) publicUser {
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

// Quest handlers
type Quest struct {
	QuestID    int    `json:"id" bson:"quest_id"`
	Title      string `json:"title" bson:"title"`
	Question   string `json:"question" bson:"question"`
	Answer     string `json:"-" bson:"answer"`
	Icon       string `json:"icon" bson:"icon"`
	Difficulty string `json:"difficulty" bson:"difficulty"`
	Coins      int    `json:"coins" bson:"coins"`
	Completed  bool   `json:"completed" bson:"completed,omitempty"`
}

type dailyQuestItem struct {
	ID          int    `json:"id"`
	Title       string `json:"title"`
	Description string `json:"description"`
	XP          int    `json:"xp"`
	Completed   bool   `json:"completed"`
}

// Leaderboard handlers
type LeaderboardEntry struct {
	UserID          int    `json:"id" bson:"user_id"`
	Name            string `json:"name" bson:"name"`
	CompletedQuests int    `json:"completedQuests" bson:"completed_quests"`
	Streak          int    `json:"streak" bson:"streak"`
	Coins           int    `json:"coins" bson:"coins"`
}

// Poll handlers
type Poll struct {
	PollID   int          `json:"id" bson:"poll_id"`
	Question string       `json:"question" bson:"question"`
	TimeLeft string       `json:"timeLeft" bson:"time_left"`
	Options  []PollOption `json:"options" bson:"options"`
}

type PollOption struct {
	Text  string `json:"text" bson:"text"`
	Votes int    `json:"votes" bson:"votes"`
}

type StudentDashboardResponse struct {
	User          publicUser         `json:"user"`
	Metrics       map[string]int     `json:"metrics"`
	DailyQuests   []dailyQuestItem   `json:"dailyQuests"`
	Leaderboard   []LeaderboardEntry `json:"leaderboard"`
	ActiveCourses []CourseProgress   `json:"activeCourses"`
}

type AdminActivity struct {
	UserName    string    `json:"userName"`
	QuestTitle  string    `json:"questTitle"`
	CompletedAt time.Time `json:"completedAt"`
}

type AdminOverviewResponse struct {
	Totals struct {
		Users        int `json:"users"`
		Students     int `json:"students"`
		Faculty      int `json:"faculty"`
		ActiveQuests int `json:"activeQuests"`
	} `json:"totals"`
	AverageCoins   float64            `json:"averageCoins"`
	Leaderboard    []LeaderboardEntry `json:"leaderboard"`
	RecentActivity []AdminActivity    `json:"recentActivity"`
}

type FacultyCourse struct {
	CourseID        int     `json:"courseId"`
	Title           string  `json:"title"`
	AverageProgress float64 `json:"averageProgress"`
	Students        int     `json:"students"`
	DueNext         string  `json:"dueNext,omitempty"`
}

type FacultyOverviewResponse struct {
	Courses       []FacultyCourse    `json:"courses"`
	TopPerformers []LeaderboardEntry `json:"topPerformers"`
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

func withRoles(handler http.HandlerFunc, allowed ...string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if !hasRole(r.Context(), allowed...) {
			http.Error(w, "forbidden", http.StatusForbidden)
			return
		}
		handler(w, r)
	}
}

func loginHandler(w http.ResponseWriter, r *http.Request) {
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

func getMeHandler(w http.ResponseWriter, r *http.Request) {
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

func getUser(w http.ResponseWriter, r *http.Request) {
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

func getQuests(w http.ResponseWriter, r *http.Request) {
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

func completeQuest(w http.ResponseWriter, r *http.Request) {
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

func getLeaderboard(w http.ResponseWriter, r *http.Request) {
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

func getPolls(w http.ResponseWriter, r *http.Request) {
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

func voteOnPoll(w http.ResponseWriter, r *http.Request) {
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

func getStudentDashboard(w http.ResponseWriter, r *http.Request) {
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

	resp := StudentDashboardResponse{
		User:          sanitizeUser(&user),
		Metrics:       metrics,
		DailyQuests:   daily,
		Leaderboard:   leaders,
		ActiveCourses: user.ActiveCourses,
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

func getAdminOverview(w http.ResponseWriter, r *http.Request) {
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

func getFacultyOverview(w http.ResponseWriter, r *http.Request) {
	if !hasRole(r.Context(), RoleFaculty, RoleAdmin) {
		writeJSON(w, http.StatusForbidden, map[string]string{"error": "faculty access required"})
		return
	}

	ctx := context.Background()
	cursor, err := usersCol.Find(ctx, bson.M{"role": RoleStudent})
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "failed to load students"})
		return
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
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	resp := FacultyOverviewResponse{
		Courses:       courses,
		TopPerformers: leaders,
	}

	writeJSON(w, http.StatusOK, resp)
}

// AI handlers
func aiChat(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Message string `json:"message"`
	}
	if err := decodeJSON(r, &req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid payload"})
		return
	}

	response, err := callGeminiAPI(req.Message)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"response": response})
}

func callGeminiAPI(message string) (string, error) {
	url := fmt.Sprintf("https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=%s", geminiAPIKey)

	requestBody := map[string]interface{}{
		"contents": []map[string]interface{}{
			{
				"parts": []map[string]string{
					{
						"text": fmt.Sprintf("You are a helpful AI tutor for university students. Be concise, friendly, and educational. Answer this question: %s", message),
					},
				},
			},
		},
	}

	jsonData, err := json.Marshal(requestBody)
	if err != nil {
		return "", err
	}

	resp, err := http.Post(url, "application/json", bytes.NewBuffer(jsonData))
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", err
	}

	var result map[string]interface{}
	_ = json.Unmarshal(body, &result)

	if candidates, ok := result["candidates"].([]interface{}); ok && len(candidates) > 0 {
		if candidate, ok := candidates[0].(map[string]interface{}); ok {
			if content, ok := candidate["content"].(map[string]interface{}); ok {
				if parts, ok := content["parts"].([]interface{}); ok && len(parts) > 0 {
					if part, ok := parts[0].(map[string]interface{}); ok {
						if text, ok := part["text"].(string); ok {
							return text, nil
						}
					}
				}
			}
		}
	}

	return "I'm having trouble understanding that. Could you rephrase your question?", nil
}
