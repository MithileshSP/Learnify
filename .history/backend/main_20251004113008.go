package middleware

import (
	"context"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	gorillahandlers "github.com/gorilla/handlers"
	"github.com/gorilla/mux"
	"github.com/joho/godotenv"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"

	apphandlers "main.go/handlers"
)

var (
	client               *mongo.Client
	database             *mongo.Database
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
)

func main() {
	// Load environment variables
	godotenv.Load()

	mongoURI := os.Getenv("MONGODB_URI")
	if mongoURI == "" {
		log.Fatal("MONGODB_URI environment variable not set")
	}

	// Connect to MongoDB
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	var err error
	client, err = mongo.Connect(ctx, options.Client().ApplyURI(mongoURI))
	if err != nil {
		log.Fatal(err)
	}

	// Ping the database
	err = client.Ping(ctx, nil)
	if err != nil {
		log.Fatal("Could not connect to MongoDB:", err)
	}

	log.Println("Connected to MongoDB Atlas!")

	// Configure Gemini API key for AI Buddy
	geminiAPIKey = strings.TrimSpace(os.Getenv("GEMINI_API_KEY"))
	if geminiAPIKey == "" {
		log.Fatal("GEMINI_API_KEY environment variable not set")
	}

	geminiModel = strings.TrimSpace(os.Getenv("GEMINI_MODEL"))
	if geminiModel == "" {
		geminiModel = "gemini-1.5-flash-latest"
	}

	jwtSecret = os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		jwtSecret = "dev-secret-change-me"
	}

	// Initialize database and collections (match Atlas DB name exactly)
	database = client.Database("LearnOnline")
	usersCol = database.Collection("users")
	questsCol = database.Collection("quests")
	pollsCol = database.Collection("polls")
	votesCol = database.Collection("votes")
	userQuestsCol = database.Collection("user_quests")
	researchPostsCol = database.Collection("research_posts")
	facultyDashboardsCol = database.Collection("faculty_dashboards")

	apphandlers.Configure(apphandlers.Dependencies{
		UsersCol:             usersCol,
		QuestsCol:            questsCol,
		PollsCol:             pollsCol,
		VotesCol:             votesCol,
		UserQuestsCol:        userQuestsCol,
		ResearchPostsCol:     researchPostsCol,
		FacultyDashboardsCol: facultyDashboardsCol,
		GeminiAPIKey:         geminiAPIKey,
		GeminiModel:          geminiModel,
		JWTSecret:            jwtSecret,
	})

	// Insert sample data
	go insertSampleData()

	// Setup routes
	r := mux.NewRouter()
	api := r.PathPrefix("/api").Subrouter()

	// Public routes
	api.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"status":"ok"}`))
	}).Methods("GET")
	api.HandleFunc("/auth/login", apphandlers.LoginHandler).Methods("POST")

	// Protected routes
	protected := api.PathPrefix("").Subrouter()
	protected := api.PathPrefix("").Subrouter()
	protected.Use(NewAuthMiddleware(jwtSecret))
	protected.HandleFunc("/me", apphandlers.GetMeHandler).Methods("GET")
	protected.HandleFunc("/user/{id}", apphandlers.GetUser).Methods("GET")
	protected.HandleFunc("/quests/{id}/complete", apphandlers.CompleteQuest).Methods("POST")
	protected.HandleFunc("/leaderboard", apphandlers.GetLeaderboard).Methods("GET")
	protected.HandleFunc("/polls", apphandlers.GetPolls).Methods("GET")
	protected.HandleFunc("/polls/{id}/vote", apphandlers.VoteOnPoll).Methods("POST")
	protected.HandleFunc("/ai/chat", apphandlers.AIChat).Methods("POST")
	protected.HandleFunc("/student/dashboard", apphandlers.WithRoles(apphandlers.GetStudentDashboard, apphandlers.RoleStudent, apphandlers.RoleAdmin)).Methods("GET")
	protected.HandleFunc("/admin/overview", apphandlers.WithRoles(apphandlers.GetAdminOverview, apphandlers.RoleAdmin)).Methods("GET")
	protected.HandleFunc("/faculty/overview", apphandlers.WithRoles(apphandlers.GetFacultyOverview, apphandlers.RoleFaculty, apphandlers.RoleAdmin)).Methods("GET")
	protected.HandleFunc("/faculty/dashboard", apphandlers.WithRoles(apphandlers.GetFacultyOverview, apphandlers.RoleFaculty, apphandlers.RoleAdmin)).Methods("GET")
	protected.HandleFunc("/faculty/dashboard/ai/{id}/review", apphandlers.WithRoles(apphandlers.ReviewFacultyAISuggestion, apphandlers.RoleFaculty, apphandlers.RoleAdmin)).Methods("POST")
	protected.HandleFunc("/faculty/dashboard/mentorship", apphandlers.WithRoles(apphandlers.AddFacultyMentee, apphandlers.RoleFaculty, apphandlers.RoleAdmin)).Methods("POST")
	protected.HandleFunc("/faculty/dashboard/mentorship/{id}/status", apphandlers.WithRoles(apphandlers.UpdateFacultyMenteeStatus, apphandlers.RoleFaculty, apphandlers.RoleAdmin)).Methods("POST")
	protected.HandleFunc("/faculty/dashboard/courses", apphandlers.WithRoles(apphandlers.AddFacultyCourse, apphandlers.RoleFaculty, apphandlers.RoleAdmin)).Methods("POST")
	protected.HandleFunc("/faculty/dashboard/courses/{id}/status", apphandlers.WithRoles(apphandlers.UpdateFacultyCourseStatus, apphandlers.RoleFaculty, apphandlers.RoleAdmin)).Methods("POST")
	protected.HandleFunc("/research/posts", apphandlers.GetResearchPosts).Methods("GET")
	protected.HandleFunc("/research/posts", apphandlers.CreateResearchPost).Methods("POST")

	// CORS
	corsHandler := gorillahandlers.CORS(
		gorillahandlers.AllowedOrigins([]string{"*"}),
		gorillahandlers.AllowedMethods([]string{"GET", "POST", "PUT", "DELETE", "OPTIONS"}),
		gorillahandlers.AllowedHeaders([]string{"Content-Type", "Authorization"}),
	)

	handler := corsHandler(r)
	srv := &http.Server{
		Addr:         ":8080",
		Handler:      handler,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	log.Println("Server listening on :8080")
	if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		log.Fatalf("server error: %v", err)
	}
}

func insertSampleData() {
	ctx := context.Background()

	seedUsers := []struct {
		userID            int
		name              string
		email             string
		password          string
		role              string
		coins             int
		streak            int
		academicStanding  int
		gamificationLevel int
		courseProgress    int
		courses           []bson.M
	}{
		{
			userID:            1,
			name:              "Alex Sharma",
			email:             "alex@learnonline.edu",
			password:          "student123",
			role:              apphandlers.RoleStudent,
			coins:             11250,
			streak:            14,
			academicStanding:  90,
			gamificationLevel: 60,
			courseProgress:    75,
			courses: []bson.M{
				{"course_id": 101, "title": "Introduction to AI", "progress": 75, "instructor": "Dr. Sen", "due_next": "Module 3 Quiz"},
				{"course_id": 102, "title": "Machine Learning Basics", "progress": 40, "instructor": "Prof. Singh", "due_next": "Peer Review"},
				{"course_id": 103, "title": "Data Structures & Algorithms", "progress": 90, "instructor": "Dr. Mehta", "due_next": "Assignment 4"},
			},
		},
		{
			userID:            2,
			name:              "Jordan Lee",
			email:             "jordan@learnonline.edu",
			password:          "student123",
			role:              apphandlers.RoleStudent,
			coins:             12500,
			streak:            18,
			academicStanding:  92,
			gamificationLevel: 72,
			courseProgress:    82,
			courses: []bson.M{
				{"course_id": 104, "title": "Advanced Robotics", "progress": 68, "instructor": "Dr. Tan", "due_next": "Lab Report"},
			},
		},
		{
			userID:            3,
			name:              "Casey Wong",
			email:             "casey@learnonline.edu",
			password:          "student123",
			role:              apphandlers.RoleStudent,
			coins:             11800,
			streak:            12,
			academicStanding:  88,
			gamificationLevel: 65,
			courseProgress:    70,
			courses:           []bson.M{},
		},
		{
			userID:            4,
			name:              "Taylor Green",
			email:             "taylor@learnonline.edu",
			password:          "student123",
			role:              apphandlers.RoleStudent,
			coins:             10900,
			streak:            10,
			academicStanding:  86,
			gamificationLevel: 59,
			courseProgress:    66,
			courses:           []bson.M{},
		},
		{
			userID:            5,
			name:              "Samira Khan",
			email:             "samira@learnonline.edu",
			password:          "student123",
			role:              apphandlers.RoleStudent,
			coins:             10100,
			streak:            8,
			academicStanding:  84,
			gamificationLevel: 55,
			courseProgress:    60,
			courses:           []bson.M{},
		},
		{
			userID:            6,
			name:              "Dr. Meera Iyer",
			email:             "meera@learnonline.edu",
			password:          "faculty123",
			role:              apphandlers.RoleFaculty,
			coins:             5400,
			streak:            6,
			academicStanding:  0,
			gamificationLevel: 0,
			courseProgress:    0,
			courses: []bson.M{
				{"course_id": 101, "title": "Introduction to AI", "progress": 0},
				{"course_id": 104, "title": "Advanced Robotics", "progress": 0},
			},
		},
		{
			userID:            7,
			name:              "Admin User",
			email:             "admin@learnonline.edu",
			password:          "admin123",
			role:              apphandlers.RoleAdmin,
			coins:             6000,
			streak:            4,
			academicStanding:  0,
			gamificationLevel: 0,
			courseProgress:    0,
			courses:           []bson.M{},
		},
	}

	for _, seed := range seedUsers {
	for _, seed := range seedUsers {
		hash, err := HashPassword(seed.password)
		if err != nil {
			log.Printf("failed to hash password for %s: %v", seed.email, err)
			continue
		}

		update := bson.M{
			"user_id":            seed.userID,
			"name":               seed.name,
			"email":              strings.ToLower(seed.email),
			"role":               seed.role,
			"coins":              seed.coins,
			"streak":             seed.streak,
			"password_hash":      hash,
			"academic_standing":  seed.academicStanding,
			"gamification_level": seed.gamificationLevel,
			"course_progress":    seed.courseProgress,
			"active_courses":     seed.courses,
		}

		opts := options.Update().SetUpsert(true)
		if _, err := usersCol.UpdateOne(ctx, bson.M{"user_id": seed.userID}, bson.M{"$set": update}, opts); err != nil {
			log.Printf("failed to upsert user %s: %v", seed.email, err)
		}
	}
	quests := []bson.M{
		{"quest_id": 1, "title": "Complete Module 3 Quiz", "question": "Finish the quiz for \"Introduction to AI\"", "answer": "", "icon": "✅", "difficulty": "Easy", "coins": 50},
		{"quest_id": 2, "title": "Review 3 Peer Submissions", "question": "Provide feedback on research projects", "answer": "", "icon": "📝", "difficulty": "Medium", "coins": 75},
		{"quest_id": 3, "title": "Participate in Forum Discussion", "question": "Post a question or answer in \"Machine Learning Basics\"", "answer": "", "icon": "�", "difficulty": "Easy", "coins": 25},
		{"quest_id": 4, "title": "Lab Prep", "question": "Read the robotics lab brief before tomorrow", "answer": "", "icon": "🤖", "difficulty": "Medium", "coins": 40},
	}

	questOpts := options.Update().SetUpsert(true)
	for _, quest := range quests {
		_, err := questsCol.UpdateOne(ctx, bson.M{"quest_id": quest["quest_id"]}, bson.M{"$set": quest}, questOpts)
		if err != nil {
			log.Printf("failed to upsert quest %v: %v", quest["quest_id"], err)
		}
	}

	polls := []bson.M{
		{
			"poll_id":   1,
			"question":  "What should be our next cafeteria menu addition?",
			"time_left": "2 days left",
			"options": []bson.M{
				{"text": "South Indian Thali", "votes": 45},
				{"text": "Mexican Fiesta", "votes": 32},
				{"text": "Mediterranean Bowl", "votes": 28},
				{"text": "Asian Fusion", "votes": 25},
			},
		},
		{
			"poll_id":   2,
			"question":  "Which sustainability initiative should we prioritize?",
			"time_left": "5 days left",
			"options": []bson.M{
				{"text": "Solar Panel Installation", "votes": 52},
				{"text": "Campus Recycling Program", "votes": 48},
				{"text": "Tree Plantation Drive", "votes": 38},
			},
		},
	}

	pollOpts := options.Update().SetUpsert(true)
	for _, poll := range polls {
		_, err := pollsCol.UpdateOne(ctx, bson.M{"poll_id": poll["poll_id"]}, bson.M{"$set": poll}, pollOpts)
		if err != nil {
			log.Printf("failed to upsert poll %v: %v", poll["poll_id"], err)
		}
	}

	completionSamples := []bson.M{
		{"user_id": 1, "quest_id": 1, "completed": true, "completed_at": time.Now().Add(-48 * time.Hour)},
		{"user_id": 2, "quest_id": 2, "completed": true, "completed_at": time.Now().Add(-24 * time.Hour)},
	}

	completionOpts := options.Update().SetUpsert(true)
	for _, record := range completionSamples {
		filter := bson.M{"user_id": record["user_id"], "quest_id": record["quest_id"]}
		_, err := userQuestsCol.UpdateOne(ctx, filter, bson.M{"$set": record}, completionOpts)
		if err != nil {
			log.Printf("failed to upsert user quest %v/%v: %v", record["user_id"], record["quest_id"], err)
		}
	}

	researchPosts := []bson.M{
		{
			"title":            "Breakthrough in AI-driven sustainable agriculture",
			"summary":          "Our team published a paper on using neural networks to optimize crop rotation for improved yield and reduced environmental impact.",
			"body":             "Our team published a paper on using neural networks to optimize crop rotation for improved yield and reduced environmental impact.",
			"category":         "Collaboration",
			"tags":             []string{"AI", "Sustainability", "AgriTech"},
			"image_url":        "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1200&q=80",
			"author_id":        6,
			"author_name":      "Dr. Evelyn Reed",
			"author_role":      "Lead Researcher · AI Sustainability Lab",
			"is_collaboration": true,
			"likes":            25,
			"comments":         18,
			"collaborations":   3,
			"created_at":       time.Now().Add(-2 * time.Hour),
			"updated_at":       time.Now().Add(-2 * time.Hour),
		},
		{
			"title":            "Need insight on quantum coherence times",
			"summary":          "We're optimizing qubit coherence times under noisy conditions and looking for collaborators who can share resources or simulation tooling.",
			"body":             "We're optimizing qubit coherence times under noisy conditions and looking for collaborators who can share resources or simulation tooling.",
			"category":         "Collaboration",
			"tags":             []string{"Quantum", "Physics", "Research"},
			"author_id":        1,
			"author_name":      "Maria Sanchez",
			"author_role":      "PhD Candidate · Quantum Computing",
			"is_collaboration": true,
			"likes":            18,
			"comments":         9,
			"collaborations":   5,
			"created_at":       time.Now().Add(-26 * time.Hour),
			"updated_at":       time.Now().Add(-26 * time.Hour),
		},
		{
			"title":            "Validating a new compound for neurological disorders",
			"summary":          "Preliminary results from our clinical validation look promising. Preparing for peer review and open to feedback before submission.",
			"body":             "Preliminary results from our clinical validation look promising. Preparing for peer review and open to feedback before submission.",
			"category":         "My Research",
			"tags":             []string{"Neuroscience", "Drug Discovery", "Biotech"},
			"image_url":        "https://images.unsplash.com/photo-1559750981-10ef0c45f05b?auto=format&fit=crop&w=1200&q=80",
			"author_id":        2,
			"author_name":      "Sarah Williams",
			"author_role":      "Research Fellow · NeuroLab",
			"is_collaboration": false,
			"likes":            42,
			"comments":         12,
			"collaborations":   6,
			"created_at":       time.Now().Add(-72 * time.Hour),
			"updated_at":       time.Now().Add(-72 * time.Hour),
		},
	}

	postOpts := options.Update().SetUpsert(true)
	for _, post := range researchPosts {
		filter := bson.M{"title": post["title"]}
		update := bson.M{"$setOnInsert": post}
		if _, err := researchPostsCol.UpdateOne(ctx, filter, update, postOpts); err != nil {
			log.Printf("failed to ensure research post %s: %v", post["title"], err)
		}
	}

	facultyDashboardExists, err := facultyDashboardsCol.CountDocuments(ctx, bson.M{"faculty_id": 6})
	if err != nil {
		log.Printf("failed to check faculty dashboard seed: %v", err)
	} else if facultyDashboardExists == 0 {
		now := time.Now().UTC()
		suggestionOneID := primitive.NewObjectID()
		suggestionTwoID := primitive.NewObjectID()
		suggestionThreeID := primitive.NewObjectID()

		menteeAliceID := primitive.NewObjectID()
		menteeBobID := primitive.NewObjectID()
		menteeCharlieID := primitive.NewObjectID()
		menteeDianaID := primitive.NewObjectID()

		courseIntroID := primitive.NewObjectID()
		courseCalcID := primitive.NewObjectID()
		courseEthicsID := primitive.NewObjectID()
		courseHistoryID := primitive.NewObjectID()

		dashboardDoc := bson.M{
			"faculty_id": 6,
			"overview": bson.M{
				"courses_taught":    12,
				"students_mentored": 48,
				"average_grade":     92.0,
				"pending_reviews":   3,
			},
			"ai_suggestions": []bson.M{
				{
					"_id":              suggestionOneID,
					"title":            "Research Paper on Quantum Computing",
					"course":           "Advanced Physics",
					"summary":          "AI summary: AI suggests minor grammatical corrections and highlights a weak conclusion argument.",
					"recommendation":   "Add real-world examples to strengthen the final section and provide a clearer thesis recap.",
					"grade_suggestion": "B+",
					"status":           "pending",
					"created_at":       now.Add(-10 * time.Hour),
					"updated_at":       now.Add(-10 * time.Hour),
				},
				{
					"_id":              suggestionTwoID,
					"title":            "Midterm Exam Essay: Impact of AI on Society",
					"course":           "Ethics in Technology",
					"summary":          "AI summary: AI identifies strong arguments but recommends more diverse real-world examples.",
					"recommendation":   "Encourage student to reference at least two global policy frameworks to add depth.",
					"grade_suggestion": "A-",
					"status":           "pending",
					"created_at":       now.Add(-26 * time.Hour),
					"updated_at":       now.Add(-26 * time.Hour),
				},
				{
					"_id":              suggestionThreeID,
					"title":            "Programming Project: Secure Messaging App",
					"course":           "Software Engineering",
					"summary":          "AI summary: AI detected a potential security vulnerability in the authentication module.",
					"recommendation":   "Added human review. Grade suggestion: C. Provide targeted remediation steps.",
					"grade_suggestion": "C",
					"status":           "needs_follow_up",
					"created_at":       now.Add(-72 * time.Hour),
					"updated_at":       now.Add(-6 * time.Hour),
				},
			},
			"mentorship": bson.M{
				"mentees": []bson.M{
					{
						"_id":          menteeAliceID,
						"name":         "Alice Johnson",
						"status":       "active",
						"next_session": "Mon, Oct 02, 10:00 AM",
						"note":         "AI Ethics project review",
						"created_at":   now.Add(-30 * 24 * time.Hour),
						"updated_at":   now.Add(-24 * time.Hour),
					},
					{
						"_id":          menteeBobID,
						"name":         "Bob Williams",
						"status":       "meeting_soon",
						"next_session": "Wed, Oct 04, 3:30 PM",
						"note":         "Capstone guidance",
						"created_at":   now.Add(-14 * 24 * time.Hour),
						"updated_at":   now.Add(-3 * time.Hour),
					},
					{
						"_id":          menteeCharlieID,
						"name":         "Charlie Davis",
						"status":       "active",
						"next_session": "Fri, Nov 01, 11:00 AM",
						"note":         "Grant proposal outline",
						"created_at":   now.Add(-45 * 24 * time.Hour),
						"updated_at":   now.Add(-48 * time.Hour),
					},
					{
						"_id":        menteeDianaID,
						"name":       "Diana Smith",
						"status":     "archived",
						"note":       "Graduated",
						"created_at": now.Add(-120 * 24 * time.Hour),
						"updated_at": now.Add(-60 * 24 * time.Hour),
					},
				},
				"last_updated": now,
			},
			"courses": []bson.M{
				{
					"_id":          courseIntroID,
					"title":        "Introduction to Computer Science",
					"status":       "published",
					"code":         "CS101",
					"last_updated": now.Add(-72 * time.Hour),
				},
				{
					"_id":          courseCalcID,
					"title":        "Calculus II",
					"status":       "published",
					"code":         "MTH202",
					"last_updated": now.Add(-48 * time.Hour),
				},
				{
					"_id":          courseEthicsID,
					"title":        "Ethics in AI",
					"status":       "draft",
					"code":         "ETH310",
					"last_updated": now.Add(-12 * time.Hour),
				},
				{
					"_id":          courseHistoryID,
					"title":        "World History: Ancient Civilizations",
					"status":       "archived",
					"code":         "HIS210",
					"last_updated": now.Add(-240 * time.Hour),
				},
			},
			"analytics": bson.M{
				"labels":    []string{"Jan", "Feb", "Mar", "Apr", "May"},
				"students":  []int{120, 132, 128, 140, 152},
				"avg_grade": []int{88, 87, 89, 90, 92},
			},
			"created_at": now,
			"updated_at": now,
		}

		if _, err := facultyDashboardsCol.InsertOne(ctx, dashboardDoc); err != nil {
			log.Printf("failed to insert faculty dashboard seed: %v", err)
		}
	}

	log.Println("Sample data ensured")
}
