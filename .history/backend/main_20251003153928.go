package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/gorilla/handlers"
	"github.com/gorilla/mux"
	"github.com/joho/godotenv"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

var (
	client        *mongo.Client
	database      *mongo.Database
	usersCol      *mongo.Collection
	questsCol     *mongo.Collection
	pollsCol      *mongo.Collection
	votesCol      *mongo.Collection
	userQuestsCol *mongo.Collection
	jwtSecret     string
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
	if key := os.Getenv("GEMINI_API_KEY"); key != "" {
		geminiAPIKey = key
	} else {
		// Fallback to provided demo key so prototype runs
		geminiAPIKey = "AIzaSyBC9uPmMncc1_iQ2aVQYEPR7Oeb70Kz51I"
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
	api.HandleFunc("/auth/login", loginHandler).Methods("POST")

	// Protected routes
	protected := api.PathPrefix("").Subrouter()
	protected.Use(authMiddleware)
	protected.HandleFunc("/me", getMeHandler).Methods("GET")
	protected.HandleFunc("/user/{id}", getUser).Methods("GET")
	protected.HandleFunc("/quests", getQuests).Methods("GET")
	protected.HandleFunc("/quests/{id}/complete", completeQuest).Methods("POST")
	protected.HandleFunc("/leaderboard", getLeaderboard).Methods("GET")
	protected.HandleFunc("/polls", getPolls).Methods("GET")
	protected.HandleFunc("/polls/{id}/vote", voteOnPoll).Methods("POST")
	protected.HandleFunc("/ai/chat", aiChat).Methods("POST")
	protected.HandleFunc("/student/dashboard", withRoles(getStudentDashboard, RoleStudent, RoleAdmin)).Methods("GET")
	protected.HandleFunc("/admin/overview", withRoles(getAdminOverview, RoleAdmin)).Methods("GET")
	protected.HandleFunc("/faculty/overview", withRoles(getFacultyOverview, RoleFaculty, RoleAdmin)).Methods("GET")

	// CORS
	corsHandler := handlers.CORS(
		handlers.AllowedOrigins([]string{"*"}),
		handlers.AllowedMethods([]string{"GET", "POST", "PUT", "DELETE", "OPTIONS"}),
		handlers.AllowedHeaders([]string{"Content-Type", "Authorization"}),
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
			role:              RoleStudent,
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
			role:              RoleStudent,
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
			role:              RoleStudent,
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
			role:              RoleStudent,
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
			role:              RoleStudent,
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
			role:              RoleFaculty,
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
			role:              RoleAdmin,
			coins:             6000,
			streak:            4,
			academicStanding:  0,
			gamificationLevel: 0,
			courseProgress:    0,
			courses:           []bson.M{},
		},
	}

	for _, seed := range seedUsers {
		hash, err := hashPassword(seed.password)
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

	log.Println("Sample data ensured")
}
