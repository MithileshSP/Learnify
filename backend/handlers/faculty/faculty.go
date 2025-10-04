package faculty

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gorilla/mux"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"

	"backend/handlers/common"
	"backend/models"
)

type (
	FacultyOverviewResponse = models.FacultyOverviewResponse
	FacultyCourse           = models.FacultyCourse
	FacultyAISuggestion     = models.FacultyAISuggestion
	FacultyAIGrading        = models.FacultyAIGrading
	FacultyMentee           = models.FacultyMentee
	FacultyMentorship       = models.FacultyMentorship
	FacultyCourseCard       = models.FacultyCourseCard
	FacultyAnalytics        = models.FacultyAnalytics
	FacultyOverviewStats    = models.FacultyOverviewStats
)

// internal dashboard document mirrors original structure
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

func GetOverview(w http.ResponseWriter, r *http.Request) {
	targetID, ok := getFacultyTarget(w, r)
	if !ok {
		return
	}
	ctx := context.Background()
	doc, err := loadFacultyDashboard(ctx, targetID)
	if err != nil && !errors.Is(err, mongo.ErrNoDocuments) {
		common.WriteJSON(w, http.StatusInternalServerError, map[string]string{"error": "failed to load faculty dashboard"})
		return
	}
	if err != nil {
		doc = nil
	}
	respondFacultyDashboard(w, ctx, doc)
}

// --- helpers reused from original logic (adapted) ---
func getFacultyTarget(w http.ResponseWriter, r *http.Request) (int, bool) {
	actorID, ok := common.UserIDFromContext(r.Context())
	if !ok {
		common.WriteJSON(w, http.StatusUnauthorized, map[string]string{"error": "unauthorized"})
		return 0, false
	}
	role := common.RoleFromContext(r.Context())
	if role != common.RoleFaculty && role != common.RoleAdmin {
		common.WriteJSON(w, http.StatusForbidden, map[string]string{"error": "faculty access required"})
		return 0, false
	}
	targetID := actorID
	if role == common.RoleAdmin {
		if override, err := strconv.Atoi(r.URL.Query().Get("faculty_id")); err == nil && override > 0 {
			targetID = override
		}
	}
	return targetID, true
}

func loadFacultyDashboard(ctx context.Context, facultyID int) (*facultyDashboardDoc, error) {
	var doc facultyDashboardDoc
	err := common.FacultyDashboardsCol.FindOne(ctx, bson.M{"faculty_id": facultyID}).Decode(&doc)
	if err != nil {
		return nil, err
	}
	return &doc, nil
}

func respondFacultyDashboard(w http.ResponseWriter, ctx context.Context, doc *facultyDashboardDoc) bool {
	if doc != nil {
		recomputeFacultyPending(ctx, doc)
	}
	courses, leaders, err := common.CollectFacultyAggregates()
	if err != nil {
		common.WriteJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return false
	}
	resp := prepareFacultyOverviewResponse(doc, courses, leaders)
	common.WriteJSON(w, http.StatusOK, resp)
	return true
}

func recomputeFacultyPending(ctx context.Context, doc *facultyDashboardDoc) {
	if doc == nil {
		return
	}
	pending := 0
	for _, s := range doc.AISuggestions {
		if strings.EqualFold(s.Status, "pending") {
			pending++
		}
	}
	doc.Overview.PendingReviews = pending
	if !doc.ID.IsZero() {
		_, _ = common.FacultyDashboardsCol.UpdateOne(ctx, bson.M{"_id": doc.ID}, bson.M{"$set": bson.M{"overview.pending_reviews": pending}})
	}
}

func prepareFacultyOverviewResponse(doc *facultyDashboardDoc, courses []models.FacultyCourse, leaders []models.LeaderboardEntry) FacultyOverviewResponse {
	var resp FacultyOverviewResponse
	if doc != nil {
		resp = mapFacultyDashboard(doc)
	} else {
		resp = FacultyOverviewResponse{Overview: FacultyOverviewStats{}, AIGrading: FacultyAIGrading{Suggestions: []FacultyAISuggestion{}, PendingCount: 0, LastUpdated: formatRelativeTimestamp(time.Time{})}, Mentorship: FacultyMentorship{Mentees: []FacultyMentee{}, ActiveCount: 0, LastUpdated: formatRelativeTimestamp(time.Time{})}, Courses: []FacultyCourseCard{}, Analytics: FacultyAnalytics{Labels: []string{}, Students: []int{}, AvgGrade: []int{}}}
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

func mapFacultyDashboard(doc *facultyDashboardDoc) FacultyOverviewResponse {
	if doc == nil {
		return FacultyOverviewResponse{}
	}
	overview := FacultyOverviewStats{CoursesTaught: doc.Overview.CoursesTaught, StudentsMentored: doc.Overview.StudentsMentored, AverageGrade: doc.Overview.AverageGrade, PendingReviews: doc.Overview.PendingReviews}
	suggestions := make([]FacultyAISuggestion, 0, len(doc.AISuggestions))
	pendingCount := 0
	for _, s := range doc.AISuggestions {
		if strings.EqualFold(s.Status, "pending") {
			pendingCount++
		}
		suggestions = append(suggestions, FacultyAISuggestion{ID: s.ID.Hex(), Title: s.Title, Course: s.Course, Summary: s.Summary, Recommendation: s.Recommendation, GradeSuggestion: s.GradeSuggestion, Status: s.Status, CreatedAt: s.CreatedAt.UTC().Format(time.RFC3339), UpdatedAt: s.UpdatedAt.UTC().Format(time.RFC3339)})
	}
	ai := FacultyAIGrading{Suggestions: suggestions, PendingCount: pendingCount, LastUpdated: formatRelativeTimestamp(doc.UpdatedAt)}
	overview.PendingReviews = pendingCount
	mentees := make([]FacultyMentee, 0, len(doc.Mentorship.Mentees))
	activeCount := 0
	for _, m := range doc.Mentorship.Mentees {
		status := normalizeMenteeStatus(m.Status)
		if status != "archived" {
			activeCount++
		}
		mentees = append(mentees, FacultyMentee{ID: m.ID.Hex(), Name: m.Name, Status: status, NextSession: m.NextSession, Note: m.Note, UpdatedAt: m.UpdatedAt.UTC().Format(time.RFC3339)})
	}
	mentorship := FacultyMentorship{Mentees: mentees, ActiveCount: activeCount, LastUpdated: formatRelativeTimestamp(doc.Mentorship.LastUpdated)}
	cards := make([]FacultyCourseCard, 0, len(doc.Courses))
	for _, c := range doc.Courses {
		label, tone := courseStatusMeta(c.Status)
		cards = append(cards, FacultyCourseCard{ID: c.ID.Hex(), Title: c.Title, Status: c.Status, StatusLabel: label, StatusTone: tone, Code: c.Code, LastUpdated: c.LastUpdated.UTC().Format(time.RFC3339)})
	}
	analytics := FacultyAnalytics{Labels: doc.Analytics.Labels, Students: doc.Analytics.Students, AvgGrade: doc.Analytics.AvgGrade}
	return FacultyOverviewResponse{Overview: overview, AIGrading: ai, Mentorship: mentorship, Courses: cards, Analytics: analytics}
}

// status helpers
func courseStatusMeta(status string) (string, string) {
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
func normalizeMenteeStatus(s string) string {
	s = strings.ToLower(strings.TrimSpace(s))
	switch s {
	case "active", "meeting_soon", "archived":
		return s
	default:
		return "active"
	}
}
func normalizeAISuggestionStatus(s string) string {
	s = strings.ToLower(strings.TrimSpace(s))
	switch s {
	case "pending", "approved", "needs_follow_up", "reviewed", "escalated", "dismissed":
		return s
	case "":
		return "reviewed"
	default:
		return "reviewed"
	}
}
func normalizeCourseStatus(s string) string {
	s = strings.ToLower(strings.TrimSpace(s))
	switch s {
	case "published", "draft", "archived":
		return s
	default:
		return "draft"
	}
}

// Handlers for modifying dashboard resources
func ReviewAISuggestion(w http.ResponseWriter, r *http.Request) {
	targetID, ok := getFacultyTarget(w, r)
	if !ok {
		return
	}
	vars := mux.Vars(r)
	suggestionHex := vars["id"]
	suggestionID, err := primitive.ObjectIDFromHex(suggestionHex)
	if err != nil {
		common.WriteJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid suggestion id"})
		return
	}
	var req struct {
		Status          string `json:"status"`
		Recommendation  string `json:"recommendation"`
		GradeSuggestion string `json:"gradeSuggestion"`
	}
	if err := common.DecodeJSON(r, &req); err != nil {
		common.WriteJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid payload"})
		return
	}
	status := normalizeAISuggestionStatus(req.Status)
	now := time.Now().UTC()
	setFields := bson.M{"ai_suggestions.$.status": status, "ai_suggestions.$.updated_at": now}
	if strings.TrimSpace(req.Recommendation) != "" {
		setFields["ai_suggestions.$.recommendation"] = strings.TrimSpace(req.Recommendation)
	}
	if strings.TrimSpace(req.GradeSuggestion) != "" {
		setFields["ai_suggestions.$.grade_suggestion"] = strings.TrimSpace(req.GradeSuggestion)
	}
	ctx := context.Background()
	findOpts := options.FindOneAndUpdate().SetReturnDocument(options.After)
	var doc facultyDashboardDoc
	err = common.FacultyDashboardsCol.FindOneAndUpdate(ctx, bson.M{"faculty_id": targetID, "ai_suggestions._id": suggestionID}, bson.M{"$set": setFields, "$currentDate": bson.M{"updated_at": true}}, findOpts).Decode(&doc)
	if errors.Is(err, mongo.ErrNoDocuments) {
		common.WriteJSON(w, http.StatusNotFound, map[string]string{"error": "suggestion not found"})
		return
	}
	if err != nil {
		common.WriteJSON(w, http.StatusInternalServerError, map[string]string{"error": "failed to update suggestion"})
		return
	}
	respondFacultyDashboard(w, ctx, &doc)
}

func AddMentee(w http.ResponseWriter, r *http.Request) {
	targetID, ok := getFacultyTarget(w, r)
	if !ok {
		return
	}
	var req struct{ Name, Status, NextSession, Note string }
	if err := common.DecodeJSON(r, &req); err != nil {
		common.WriteJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid payload"})
		return
	}
	name := strings.TrimSpace(req.Name)
	if name == "" {
		common.WriteJSON(w, http.StatusBadRequest, map[string]string{"error": "name is required"})
		return
	}
	now := time.Now().UTC()
	mentee := facultyMenteeDoc{ID: primitive.NewObjectID(), Name: name, Status: normalizeMenteeStatus(req.Status), NextSession: strings.TrimSpace(req.NextSession), Note: strings.TrimSpace(req.Note), CreatedAt: now, UpdatedAt: now}
	ctx := context.Background()
	findOpts := options.FindOneAndUpdate().SetReturnDocument(options.After)
	var doc facultyDashboardDoc
	err := common.FacultyDashboardsCol.FindOneAndUpdate(ctx, bson.M{"faculty_id": targetID}, bson.M{"$push": bson.M{"mentorship.mentees": mentee}, "$set": bson.M{"mentorship.last_updated": now, "updated_at": now}, "$inc": bson.M{"overview.students_mentored": 1}}, findOpts).Decode(&doc)
	if errors.Is(err, mongo.ErrNoDocuments) {
		newDoc := facultyDashboardDoc{FacultyID: targetID, Overview: facultyOverviewDoc{CoursesTaught: 0, StudentsMentored: 1, AverageGrade: 0, PendingReviews: 0}, AISuggestions: []facultyAISuggestionDoc{}, Mentorship: facultyMentorshipDoc{Mentees: []facultyMenteeDoc{mentee}, LastUpdated: now}, Courses: []facultyCourseDoc{}, Analytics: facultyAnalyticsDoc{Labels: []string{}, Students: []int{}, AvgGrade: []int{}}, CreatedAt: now, UpdatedAt: now}
		res, insertErr := common.FacultyDashboardsCol.InsertOne(ctx, newDoc)
		if insertErr != nil {
			common.WriteJSON(w, http.StatusInternalServerError, map[string]string{"error": "failed to create dashboard"})
			return
		}
		if oid, ok := res.InsertedID.(primitive.ObjectID); ok {
			newDoc.ID = oid
		}
		doc = newDoc
	} else if err != nil {
		common.WriteJSON(w, http.StatusInternalServerError, map[string]string{"error": "failed to add mentee"})
		return
	}
	respondFacultyDashboard(w, ctx, &doc)
}

func UpdateMenteeStatus(w http.ResponseWriter, r *http.Request) {
	targetID, ok := getFacultyTarget(w, r)
	if !ok {
		return
	}
	vars := mux.Vars(r)
	menteeHex := vars["id"]
	menteeID, err := primitive.ObjectIDFromHex(menteeHex)
	if err != nil {
		common.WriteJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid mentee id"})
		return
	}
	var req struct{ Status, NextSession, Note *string }
	if err := common.DecodeJSON(r, &req); err != nil {
		common.WriteJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid payload"})
		return
	}
	now := time.Now().UTC()
	setFields := bson.M{"mentorship.mentees.$.updated_at": now, "mentorship.last_updated": now}
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
	err = common.FacultyDashboardsCol.FindOneAndUpdate(ctx, bson.M{"faculty_id": targetID, "mentorship.mentees._id": menteeID}, bson.M{"$set": setFields, "$currentDate": bson.M{"updated_at": true}}, opts).Decode(&doc)
	if errors.Is(err, mongo.ErrNoDocuments) {
		common.WriteJSON(w, http.StatusNotFound, map[string]string{"error": "mentee not found"})
		return
	}
	if err != nil {
		common.WriteJSON(w, http.StatusInternalServerError, map[string]string{"error": "failed to update mentee"})
		return
	}
	respondFacultyDashboard(w, ctx, &doc)
}

func AddCourse(w http.ResponseWriter, r *http.Request) {
	targetID, ok := getFacultyTarget(w, r)
	if !ok {
		return
	}
	var req struct{ Title, Status, Code string }
	if err := common.DecodeJSON(r, &req); err != nil {
		common.WriteJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid payload"})
		return
	}
	title := strings.TrimSpace(req.Title)
	if title == "" {
		common.WriteJSON(w, http.StatusBadRequest, map[string]string{"error": "title is required"})
		return
	}
	now := time.Now().UTC()
	course := facultyCourseDoc{ID: primitive.NewObjectID(), Title: title, Status: normalizeCourseStatus(req.Status), Code: strings.TrimSpace(req.Code), LastUpdated: now}
	ctx := context.Background()
	findOpts := options.FindOneAndUpdate().SetReturnDocument(options.After)
	var doc facultyDashboardDoc
	err := common.FacultyDashboardsCol.FindOneAndUpdate(ctx, bson.M{"faculty_id": targetID}, bson.M{"$push": bson.M{"courses": course}, "$set": bson.M{"updated_at": now}, "$inc": bson.M{"overview.courses_taught": 1}}, findOpts).Decode(&doc)
	if errors.Is(err, mongo.ErrNoDocuments) {
		newDoc := facultyDashboardDoc{FacultyID: targetID, Overview: facultyOverviewDoc{CoursesTaught: 1, StudentsMentored: 0, AverageGrade: 0, PendingReviews: 0}, AISuggestions: []facultyAISuggestionDoc{}, Mentorship: facultyMentorshipDoc{Mentees: []facultyMenteeDoc{}, LastUpdated: now}, Courses: []facultyCourseDoc{course}, Analytics: facultyAnalyticsDoc{Labels: []string{}, Students: []int{}, AvgGrade: []int{}}, CreatedAt: now, UpdatedAt: now}
		res, insertErr := common.FacultyDashboardsCol.InsertOne(ctx, newDoc)
		if insertErr != nil {
			common.WriteJSON(w, http.StatusInternalServerError, map[string]string{"error": "failed to create dashboard"})
			return
		}
		if oid, ok := res.InsertedID.(primitive.ObjectID); ok {
			newDoc.ID = oid
		}
		doc = newDoc
	} else if err != nil {
		common.WriteJSON(w, http.StatusInternalServerError, map[string]string{"error": "failed to add course"})
		return
	}
	respondFacultyDashboard(w, ctx, &doc)
}

func UpdateCourseStatus(w http.ResponseWriter, r *http.Request) {
	targetID, ok := getFacultyTarget(w, r)
	if !ok {
		return
	}
	vars := mux.Vars(r)
	courseHex := vars["id"]
	courseID, err := primitive.ObjectIDFromHex(courseHex)
	if err != nil {
		common.WriteJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid course id"})
		return
	}
	var req struct{ Status, Title, Code *string }
	if err := common.DecodeJSON(r, &req); err != nil {
		common.WriteJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid payload"})
		return
	}
	now := time.Now().UTC()
	setFields := bson.M{"courses.$.last_updated": now}
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
	err = common.FacultyDashboardsCol.FindOneAndUpdate(ctx, bson.M{"faculty_id": targetID, "courses._id": courseID}, bson.M{"$set": setFields, "$currentDate": bson.M{"updated_at": true}}, opts).Decode(&doc)
	if errors.Is(err, mongo.ErrNoDocuments) {
		common.WriteJSON(w, http.StatusNotFound, map[string]string{"error": "course not found"})
		return
	}
	if err != nil {
		common.WriteJSON(w, http.StatusInternalServerError, map[string]string{"error": "failed to update course"})
		return
	}
	respondFacultyDashboard(w, ctx, &doc)
}

// --- formatting/time helpers copied ---
func formatRelativeTimestamp(t time.Time) string {
	if t.IsZero() {
		return "Recently"
	}
	diff := time.Since(t)
	if diff < time.Minute {
		return "Just now"
	}
	if diff < time.Hour {
		m := int(diff / time.Minute)
		if m <= 1 {
			return "1 minute ago"
		}
		return fmt.Sprintf("%d minutes ago", m)
	}
	if diff < 24*time.Hour {
		h := int(diff / time.Hour)
		if h <= 1 {
			return "1 hour ago"
		}
		return fmt.Sprintf("%d hours ago", h)
	}
	if diff < 7*24*time.Hour {
		d := int(diff / (24 * time.Hour))
		if d <= 1 {
			return "1 day ago"
		}
		return fmt.Sprintf("%d days ago", d)
	}
	if diff < 30*24*time.Hour {
		w := int(diff / (7 * 24 * time.Hour))
		if w <= 1 {
			return "1 week ago"
		}
		return fmt.Sprintf("%d weeks ago", w)
	}
	return t.Format("Jan 2, 2006")
}
