package common

import (
    "context"
    "encoding/json"
    "net/http"
    "regexp"
    "sort"
    "strconv"
    "strings"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo/options"

	"backend/models"
)

var hashtagRegex = regexp.MustCompile(`#([A-Za-z0-9_-]+)`)

func WriteJSON(w http.ResponseWriter, status int, payload interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if payload != nil { _ = json.NewEncoder(w).Encode(payload) }
}

func DecodeJSON(r *http.Request, dst interface{}) error { dec := json.NewDecoder(r.Body); dec.DisallowUnknownFields(); return dec.Decode(dst) }

func SanitizeUser(u *models.User) models.PublicUser { if u==nil { return models.PublicUser{} }; return models.PublicUser{ID:u.UserID,Name:u.Name,Email:u.Email,Coins:u.Coins,Streak:u.Streak,Role:u.Role,AcademicStanding:u.AcademicStanding,GamificationLevel:u.GamificationLevel,CourseProgress:u.CourseProgress,ActiveCourses:u.ActiveCourses} }

// Shared student/faculty leaderboard aggregation (reused by multiple packages)
func CollectLeaderboard(limit int64) ([]models.LeaderboardEntry, error) {
    findOpts := options.Find().SetSort(bson.M{"coins": -1})
    if limit > 0 { findOpts.SetLimit(limit) }
    ctx := context.Background()
    cursor, err := UsersCol.Find(ctx, bson.M{}, findOpts)
    if err != nil { return nil, err }
    defer cursor.Close(ctx)
    leaders := []models.LeaderboardEntry{}
    for cursor.Next(ctx) {
        var user models.User
        if err := cursor.Decode(&user); err != nil { continue }
        count, _ := UserQuestsCol.CountDocuments(ctx, bson.M{"user_id": user.UserID, "completed": true})
        leaders = append(leaders, models.LeaderboardEntry{UserID:user.UserID,Name:user.Name,CompletedQuests:int(count),Streak:user.Streak,Coins:user.Coins})
    }
    return leaders, nil
}

// Helper used by faculty aggregation
func CollectFacultyAggregates() ([]models.FacultyCourse, []models.LeaderboardEntry, error) {
    ctx := context.Background()
    cursor, err := UsersCol.Find(ctx, bson.M{"role": RoleStudent})
    if err != nil { return nil, nil, err }
    defer cursor.Close(ctx)
    type agg struct{ totalProgress int; students int; lastDue string }
    courseMap := map[int]*agg{}
    courseTitles := map[int]string{}
    for cursor.Next(ctx) {
        var student models.User
        if err := cursor.Decode(&student); err != nil { continue }
        for _, course := range student.ActiveCourses {
            courseTitles[course.CourseID] = course.Title
            a, ok := courseMap[course.CourseID]; if !ok { a=&agg{}; courseMap[course.CourseID]=a }
            a.totalProgress += course.Progress; a.students++; if course.DueNext != "" { a.lastDue = course.DueNext }
        }
    }
    courses := make([]models.FacultyCourse,0,len(courseMap))
    for id,data := range courseMap { avg := 0.0; if data.students>0 { avg = float64(data.totalProgress)/float64(data.students) }; courses = append(courses, models.FacultyCourse{CourseID:id,Title:courseTitles[id],AverageProgress:avg,Students:data.students,DueNext:data.lastDue}) }
    sort.Slice(courses, func(i,j int) bool { return courses[i].AverageProgress > courses[j].AverageProgress })
    leaders, err := CollectLeaderboard(5)
    if err != nil { return courses, nil, err }
    return courses, leaders, nil
}

// Minimal background context helper (can be swapped for request-scoped later)
// Removed invalid custom background abstraction; use context.Background() directly above.

// Tag utilities reused by research (kept here for now)
func SanitizeTagList(tags []string) []string {
	seen := map[string]bool{}
	result := []string{}
	for _, tag := range tags {
		clean := strings.TrimSpace(strings.TrimLeft(tag, "#"))
		clean = strings.ReplaceAll(clean, " ", "-")
		clean = strings.Trim(clean, "-_")
		if clean=="" { continue }
		key := strings.ToLower(clean)
		if seen[key] { continue }
		seen[key]=true
		result = append(result, clean)
		if len(result)>=6 { break }
	}
	return result
}

func ExtractTagsFromText(text string) []string { matches := hashtagRegex.FindAllStringSubmatch(text,-1); if len(matches)==0 { return nil }; out:=make([]string,0,len(matches)); for _,m := range matches { if len(m)>1 { out=append(out,m[1]) } }; return SanitizeTagList(out) }

func MergeUniqueStrings(primary, secondary []string, max int) []string { seen:=map[string]bool{}; res:=[]string{}; for _,col := range [][]string{primary, secondary} { for _,v := range col { v=strings.TrimSpace(v); if v=="" { continue }; k:=strings.ToLower(v); if seen[k] { continue }; seen[k]=true; res=append(res,v); if max>0 && len(res)>=max { return res } } }; return res }

func TruncateText(text string, limit int) string { if limit<=0 { return strings.TrimSpace(text) }; runes:=[]rune(strings.TrimSpace(text)); if len(runes)<=limit { return strings.TrimSpace(text) }; truncated := strings.TrimSpace(string(runes[:limit])); if truncated=="" { return string(runes[:limit]) }; return truncated+"…" }

func DeriveTitleFromBody(body string) string { trimmed := strings.TrimSpace(body); if trimmed=="" { return "Research update" }; for _,line := range strings.Split(trimmed, "\n") { t := strings.TrimSpace(line); if t != "" { return TruncateText(t,120) } }; return TruncateText(trimmed,120) }

func EnsureURLHasScheme(val string) string { t := strings.TrimSpace(val); if t=="" { return "" }; l:=strings.ToLower(t); if strings.HasPrefix(l,"http://")||strings.HasPrefix(l,"https://")||strings.HasPrefix(l,"data:")||strings.HasPrefix(l,"//") { return t }; return "https://"+t }

// Convenience query param helper
func QueryInt(r *http.Request, key string) int { v := strings.TrimSpace(r.URL.Query().Get(key)); if v=="" { return 0 }; n,_ := strconv.Atoi(v); return n }
