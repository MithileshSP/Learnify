package models

import "go.mongodb.org/mongo-driver/bson/primitive"

type CourseProgress struct {
	CourseID   int    `json:"courseId" bson:"course_id"`
	Title      string `json:"title" bson:"title"`
	Progress   int    `json:"progress" bson:"progress"`
	Instructor string `json:"instructor,omitempty" bson:"instructor,omitempty"`
	DueNext    string `json:"dueNext,omitempty" bson:"due_next,omitempty"`
}

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

type PublicUser struct {
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

type DailyQuestItem struct {
	ID          int    `json:"id"`
	Title       string `json:"title"`
	Description string `json:"description"`
	XP          int    `json:"xp"`
	Completed   bool   `json:"completed"`
}

type LeaderboardEntry struct {
	UserID          int    `json:"id" bson:"user_id"`
	Name            string `json:"name" bson:"name"`
	CompletedQuests int    `json:"completedQuests" bson:"completed_quests"`
	Streak          int    `json:"streak" bson:"streak"`
	Coins           int    `json:"coins" bson:"coins"`
}

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

type ResearchPost struct {
	ID              primitive.ObjectID `bson:"_id,omitempty"`
	AuthorID        int                `bson:"author_id"`
	AuthorName      string             `bson:"author_name"`
	AuthorRole      string             `bson:"author_role,omitempty"`
	Title           string             `bson:"title"`
	Summary         string             `bson:"summary"`
	Body            string             `bson:"body,omitempty"`
	Category        string             `bson:"category"`
	Tags            []string           `bson:"tags"`
	ImageURL        string             `bson:"image_url,omitempty"`
	Link            string             `bson:"link,omitempty"`
	Likes           int                `bson:"likes"`
	Comments        int                `bson:"comments"`
	Collaborations  int                `bson:"collaborations"`
	IsCollaboration bool               `bson:"is_collaboration"`
	CreatedAt       int64              `bson:"created_at"`
	UpdatedAt       int64              `bson:"updated_at"`
}

type ResearchPostStats struct {
	Likes          int `json:"likes"`
	Comments       int `json:"comments"`
	Collaborations int `json:"collaborations"`
}

type ResearchPostAuthor struct {
	Name string `json:"name"`
	Role string `json:"role,omitempty"`
}

type ResearchPostResponse struct {
	ID              string              `json:"id"`
	Title           string              `json:"title"`
	Summary         string              `json:"summary"`
	Category        string              `json:"category"`
	Tags            []string            `json:"tags"`
	Author          ResearchPostAuthor  `json:"author"`
	Timestamp       string              `json:"timestamp"`
	CreatedAt       string              `json:"createdAt"`
	Image           string              `json:"image,omitempty"`
	Link            string              `json:"link,omitempty"`
	Stats           ResearchPostStats   `json:"stats"`
	IsCollaboration bool                `json:"isCollaboration"`
	IsMine          bool                `json:"isMine"`
	Trending        bool                `json:"trending"`
}

type StudentDashboardResponse struct {
	User          PublicUser            `json:"user"`
	Metrics       map[string]int        `json:"metrics"`
	DailyQuests   []DailyQuestItem      `json:"dailyQuests"`
	Leaderboard   []LeaderboardEntry    `json:"leaderboard"`
	ActiveCourses []CourseProgress      `json:"activeCourses"`
	ResearchFeed  []ResearchPostResponse `json:"researchFeed"`
}

type AdminActivity struct {
	UserName    string `json:"userName"`
	QuestTitle  string `json:"questTitle"`
	CompletedAt int64  `json:"completedAt"`
}

type AdminOverviewResponse struct {
	Totals struct {
		Users        int `json:"users"`
		Students     int `json:"students"`
		Faculty      int `json:"faculty"`
		ActiveQuests int `json:"activeQuests"`
	} `json:"totals"`
	AverageCoins   float64           `json:"averageCoins"`
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

type FacultyOverviewStats struct {
	CoursesTaught    int     `json:"coursesTaught"`
	StudentsMentored int     `json:"studentsMentored"`
	AverageGrade     float64 `json:"averageGrade"`
	PendingReviews   int     `json:"pendingReviews"`
}

type FacultyAISuggestion struct {
	ID              string `json:"id"`
	Title           string `json:"title"`
	Course          string `json:"course"`
	Summary         string `json:"summary"`
	Recommendation  string `json:"recommendation"`
	GradeSuggestion string `json:"gradeSuggestion"`
	Status          string `json:"status"`
	CreatedAt       string `json:"createdAt"`
	UpdatedAt       string `json:"updatedAt"`
}

type FacultyAIGrading struct {
	Suggestions  []FacultyAISuggestion `json:"suggestions"`
	PendingCount int                   `json:"pendingCount"`
	LastUpdated  string                `json:"lastUpdated"`
}

type FacultyMentee struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	Status      string `json:"status"`
	NextSession string `json:"nextSession,omitempty"`
	Note        string `json:"note,omitempty"`
	UpdatedAt   string `json:"updatedAt"`
}

type FacultyMentorship struct {
	Mentees     []FacultyMentee `json:"mentees"`
	ActiveCount int             `json:"activeCount"`
	LastUpdated string          `json:"lastUpdated"`
}

type FacultyCourseCard struct {
	ID          string `json:"id"`
	Title       string `json:"title"`
	Status      string `json:"status"`
	StatusLabel string `json:"statusLabel"`
	StatusTone  string `json:"statusTone"`
	Code        string `json:"code,omitempty"`
	LastUpdated string `json:"lastUpdated"`
}

type FacultyAnalytics struct {
	Labels   []string `json:"labels"`
	Students []int    `json:"students"`
	AvgGrade []int    `json:"avgGrade"`
}

type FacultyOverviewResponse struct {
	Overview       FacultyOverviewStats `json:"overview"`
	AIGrading      FacultyAIGrading      `json:"aiGrading"`
	Mentorship     FacultyMentorship     `json:"mentorship"`
	Courses        []FacultyCourseCard   `json:"courses"`
	Analytics      FacultyAnalytics      `json:"analytics"`
	CourseProgress []FacultyCourse       `json:"courseProgress,omitempty"`
	TopPerformers  []LeaderboardEntry    `json:"topPerformers,omitempty"`
}
