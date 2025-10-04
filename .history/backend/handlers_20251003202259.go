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
var (
	geminiAPIKey string
	geminiModel  string
)

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
	models := uniqueModels(preferred,
		"gemini-1.5-flash",
		"gemini-1.5-flash-latest",
		"gemini-1.5-flash-001",
		"gemini-1.5-flash-8b",
		"gemini-1.5-pro",
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
	versions := []string{"v1beta", "v1"}
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
