package research

import (
    "context"
    "fmt"
    "net/http"
    "strconv"
    "strings"
    "time"

    "go.mongodb.org/mongo-driver/bson"
    "go.mongodb.org/mongo-driver/bson/primitive"
    "go.mongodb.org/mongo-driver/mongo/options"

    "backend/handlers/common"
    "backend/models"
)

const (
    researchSummaryLimit = 320
    researchTitleLimit   = 120
    researchMaxTags      = 6
)

// GET /research/posts
func GetPosts(w http.ResponseWriter, r *http.Request) {
    viewerID, ok := common.UserIDFromContext(r.Context()); if !ok { common.WriteJSON(w,http.StatusUnauthorized,map[string]string{"error":"unauthorized"}); return }
    var limit int64
    if raw := strings.TrimSpace(r.URL.Query().Get("limit")); raw != "" { if parsed, err := strconv.Atoi(raw); err == nil && parsed > 0 { limit = int64(parsed) } }
    ctx := context.Background()
    feed, err := collectResearchFeed(ctx, viewerID, limit)
    if err != nil { common.WriteJSON(w,http.StatusInternalServerError,map[string]string{"error": err.Error()}); return }
    common.WriteJSON(w, http.StatusOK, map[string]interface{}{"items": feed})
}

// POST /research/posts
func CreatePost(w http.ResponseWriter, r *http.Request) {
    authorID, ok := common.UserIDFromContext(r.Context()); if !ok { common.WriteJSON(w,http.StatusUnauthorized,map[string]string{"error":"unauthorized"}); return }
    ctx := context.Background()
    var user models.User
    if err := common.UsersCol.FindOne(ctx, bson.M{"user_id": authorID}).Decode(&user); err != nil { common.WriteJSON(w,http.StatusNotFound,map[string]string{"error":"user not found"}); return }
    var req struct { Title, Summary, Body, Category, Link, Image, AuthorRole string; Tags []string; IsCollaboration *bool `json:"isCollaboration"` }
    if err := common.DecodeJSON(r,&req); err != nil { common.WriteJSON(w,http.StatusBadRequest,map[string]string{"error":"invalid payload"}); return }
    body := strings.TrimSpace(req.Body); summary := strings.TrimSpace(req.Summary); title := strings.TrimSpace(req.Title)
    if body == "" { body = summary }; if body == "" { body = title }; if body == "" { common.WriteJSON(w,http.StatusBadRequest,map[string]string{"error":"content is required"}); return }
    if summary == "" { summary = common.TruncateText(body, researchSummaryLimit) } else { summary = common.TruncateText(summary, researchSummaryLimit) }
    if title == "" { title = common.DeriveTitleFromBody(body) } else { title = common.TruncateText(title, researchTitleLimit) }
    isCollab := false; if req.IsCollaboration != nil { isCollab = *req.IsCollaboration } else if strings.EqualFold(strings.TrimSpace(req.Category), "collaboration") { isCollab = true }
    tags := common.MergeUniqueStrings(common.SanitizeTagList(req.Tags), common.ExtractTagsFromText(body), researchMaxTags)
    category := normalizeResearchCategory(req.Category, isCollab)
    link := common.EnsureURLHasScheme(req.Link)
    image := common.EnsureURLHasScheme(req.Image)
    authorRole := deriveAuthorRoleLabel(user, req.AuthorRole)
    now := time.Now().UTC()
    post := models.ResearchPost{ AuthorID: authorID, AuthorName: user.Name, AuthorRole: authorRole, Title: title, Summary: summary, Body: body, Category: category, Tags: tags, ImageURL: image, Link: link, Likes: 0, Comments: 0, Collaborations: 0, IsCollaboration: isCollab, CreatedAt: now, UpdatedAt: now }
    res, err := common.ResearchPostsCol.InsertOne(ctx, post); if err != nil { common.WriteJSON(w,http.StatusInternalServerError,map[string]string{"error":"failed to save post"}); return }
    if oid, ok := res.InsertedID.(primitive.ObjectID); ok { post.ID = oid }
    response := buildResearchPostResponse(post, authorID)
    common.WriteJSON(w, http.StatusCreated, response)
}

// -------- internal helpers (adapted from original) ---------
func collectResearchFeed(ctx context.Context, viewerID int, limit int64) ([]models.ResearchPostResponse, error) {
    findOpts := options.Find().SetSort(bson.D{{Key: "created_at", Value: -1}}); if limit>0 { findOpts.SetLimit(limit) }
    cursor, err := common.ResearchPostsCol.Find(ctx, bson.M{}, findOpts); if err != nil { return nil, fmt.Errorf("failed to load research posts: %w", err) }
    defer cursor.Close(ctx)
    feed := []models.ResearchPostResponse{}
    for cursor.Next(ctx) { var post models.ResearchPost; if err := cursor.Decode(&post); err != nil { continue }; feed = append(feed, buildResearchPostResponse(post, viewerID)) }
    return feed, nil
}

func buildResearchPostResponse(post models.ResearchPost, viewerID int) models.ResearchPostResponse {
    id := ""; if !post.ID.IsZero() { id = post.ID.Hex() } else { id = fmt.Sprintf("research-%d", post.CreatedAt.UnixNano()) }
    title := strings.TrimSpace(post.Title); if title == "" { title = common.DeriveTitleFromBody(post.Body) }
    summary := strings.TrimSpace(post.Summary); if summary == "" { summary = common.TruncateText(post.Body, researchSummaryLimit) }; if summary == "" { summary = "An exciting research update from our community." }
    category := normalizeResearchCategory(post.Category, post.IsCollaboration)
    tags := common.SanitizeTagList(post.Tags)
    timestamp := formatRelativeTimestamp(post.CreatedAt)
    createdAt := ""; if !post.CreatedAt.IsZero() { createdAt = post.CreatedAt.UTC().Format(time.RFC3339) }
    return models.ResearchPostResponse{ ID: id, Title: title, Summary: summary, Category: category, Tags: tags, Author: models.ResearchPostAuthor{Name: post.AuthorName, Role: post.AuthorRole}, Timestamp: timestamp, CreatedAt: createdAt, Image: strings.TrimSpace(post.ImageURL), Link: strings.TrimSpace(post.Link), Stats: models.ResearchPostStats{Likes: post.Likes, Comments: post.Comments, Collaborations: post.Collaborations}, IsCollaboration: post.IsCollaboration, IsMine: post.AuthorID == viewerID, Trending: isResearchPostTrending(post) }
}

func isResearchPostTrending(post models.ResearchPost) bool { score := post.Likes + post.Comments + (post.Collaborations * 3); if score >= 30 { return true }; if time.Since(post.CreatedAt) <= 72*time.Hour && score >= 12 { return true }; return false }

func formatRelativeTimestamp(t time.Time) string { if t.IsZero() { return "Recently" }; diff := time.Since(t); if diff < time.Minute { return "Just now" }; if diff < time.Hour { m := int(diff/time.Minute); if m<=1 { return "1 minute ago" }; return fmt.Sprintf("%d minutes ago", m) }; if diff < 24*time.Hour { h := int(diff/time.Hour); if h<=1 { return "1 hour ago" }; return fmt.Sprintf("%d hours ago", h) }; if diff < 7*24*time.Hour { d := int(diff/(24*time.Hour)); if d<=1 { return "1 day ago" }; return fmt.Sprintf("%d days ago", d) }; if diff < 30*24*time.Hour { w := int(diff/(7*24*time.Hour)); if w<=1 { return "1 week ago" }; return fmt.Sprintf("%d weeks ago", w) }; return t.Format("Jan 2, 2006") }

func normalizeResearchCategory(raw string, isCollaboration bool) string { category := strings.TrimSpace(raw); if category == "" { if isCollaboration { return "Collaboration" }; return "My Research" }; switch strings.ToLower(category) { case "collaboration","collaborations","collab","team-up": return "Collaboration"; case "my research","research","personal": return "My Research"; case "trending": return "Trending"; default: return category } }

func deriveAuthorRoleLabel(user models.User, override string) string { if override = strings.TrimSpace(override); override != "" { return override }; switch user.Role { case common.RoleFaculty: return "Faculty Mentor"; case common.RoleAdmin: return "Administrator"; default: if len(user.ActiveCourses) > 0 { return fmt.Sprintf("Student · %s", user.ActiveCourses[0].Title) }; return "Student Researcher" } }
