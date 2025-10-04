package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/gorilla/handlers"
	"github.com/gorilla/mux"
	"github.com/joho/godotenv"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

var (
	client     *mongo.Client
	database   *mongo.Database
	usersCol   *mongo.Collection
	questsCol  *mongo.Collection
	pollsCol   *mongo.Collection
	votesCol   *mongo.Collection
	userQuestsCol *mongo.Collection
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

	// Routes
	api.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"status":"ok"}`))
	}).Methods("GET")
	api.HandleFunc("/user/{id}", getUser).Methods("GET")
	api.HandleFunc("/quests", getQuests).Methods("GET")
	api.HandleFunc("/quests/{id}/complete", completeQuest).Methods("POST")
	api.HandleFunc("/leaderboard", getLeaderboard).Methods("GET")
	api.HandleFunc("/polls", getPolls).Methods("GET")
	api.HandleFunc("/polls/{id}/vote", voteOnPoll).Methods("POST")
	api.HandleFunc("/ai/chat", aiChat).Methods("POST")

	// CORS
	corsHandler := handlers.CORS(
		handlers.AllowedOrigins([]string{"*"}),
		handlers.AllowedMethods([]string{"GET", "POST", "PUT", "DELETE", "OPTIONS"}),
		handlers.AllowedHeaders([]string{"Content-Type", "Authorization"}),
	)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("Server running on http://localhost:%s", port)
	log.Fatal(http.ListenAndServe(":"+port, corsHandler(r)))
}

func insertSampleData() {
	ctx := context.Background()

	// Check if data already exists
	count, _ := usersCol.CountDocuments(ctx, map[string]interface{}{})
	if count > 0 {
		return
	}

	// Insert users
	users := []interface{}{
		map[string]interface{}{
			"user_id": 1,
			"name":    "Alex Kumar",
			"email":   "alex@learnonline.edu",
			"coins":   250,
			"streak":  7,
		},
		map[string]interface{}{
			"user_id": 2,
			"name":    "Priya Sharma",
			"email":   "priya@learnonline.edu",
			"coins":   480,
			"streak":  12,
		},
		map[string]interface{}{
			"user_id": 3,
			"name":    "Raj Patel",
			"email":   "raj@learnonline.edu",
			"coins":   420,
			"streak":  9,
		},
		map[string]interface{}{
			"user_id": 4,
			"name":    "Ananya Singh",
			"email":   "ananya@learnonline.edu",
			"coins":   390,
			"streak":  8,
		},
		map[string]interface{}{
			"user_id": 5,
			"name":    "Vikram Reddy",
			"email":   "vikram@learnonline.edu",
			"coins":   360,
			"streak":  6,
		},
	}
	usersCol.InsertMany(ctx, users)

	// Insert quests
	quests := []interface{}{
		map[string]interface{}{
			"quest_id":   1,
			"title":      "Math Quiz",
			"question":   "What is 15 × 8?",
			"answer":     "120",
			"icon":       "🔢",
			"difficulty": "Easy",
			"coins":      10,
		},
		map[string]interface{}{
			"quest_id":   2,
			"title":      "Science Challenge",
			"question":   "What is the chemical symbol for Gold?",
			"answer":     "Au",
			"icon":       "🧪",
			"difficulty": "Medium",
			"coins":      20,
		},
		map[string]interface{}{
			"quest_id":   3,
			"title":      "History Trivia",
			"question":   "In which year did India gain independence?",
			"answer":     "1947",
			"icon":       "📚",
			"difficulty": "Easy",
			"coins":      10,
		},
		map[string]interface{}{
			"quest_id":   4,
			"title":      "Logic Puzzle",
			"question":   "If all Bloops are Razzies and all Razzies are Lazzies, are all Bloops definitely Lazzies? (yes/no)",
			"answer":     "yes",
			"icon":       "🧩",
			"difficulty": "Medium",
			"coins":      25,
		},
		map[string]interface{}{
			"quest_id":   5,
			"title":      "Programming Quest",
			"question":   "What does HTML stand for? (abbreviation)",
			"answer":     "hypertext markup language",
			"icon":       "💻",
			"difficulty": "Easy",
			"coins":      15,
		},
		map[string]interface{}{
			"quest_id":   6,
			"title":      "Geography Challenge",
			"question":   "What is the capital of France?",
			"answer":     "Paris",
			"icon":       "🌍",
			"difficulty": "Easy",
			"coins":      10,
		},
	}
	questsCol.InsertMany(ctx, quests)

	// Insert polls
	polls := []interface{}{
		map[string]interface{}{
			"poll_id":   1,
			"question":  "What should be our next cafeteria menu addition?",
			"time_left": "2 days left",
			"options": []map[string]interface{}{
				{"text": "South Indian Thali", "votes": 45},
				{"text": "Mexican Fiesta", "votes": 32},
				{"text": "Mediterranean Bowl", "votes": 28},
				{"text": "Asian Fusion", "votes": 25},
			},
		},
		map[string]interface{}{
			"poll_id":   2,
			"question":  "Which sustainability initiative should we prioritize?",
			"time_left": "5 days left",
			"options": []map[string]interface{}{
				{"text": "Solar Panel Installation", "votes": 52},
				{"text": "Campus Recycling Program", "votes": 48},
				{"text": "Tree Plantation Drive", "votes": 38},
			},
		},
	}
	pollsCol.InsertMany(ctx, polls)

	log.Println("Sample data inserted successfully!")
}