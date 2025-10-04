package common

import (
	"context"
	"net/http"
	"strconv"

	"go.mongodb.org/mongo-driver/bson"
)

// Placeholder for student shared helpers (quests, leaderboard etc.) to be moved from monolith.

func GetUser(w http.ResponseWriter, r *http.Request) {
	// Implement after full split (temporary stub to keep routing working during refactor)
	writeJSON(w, http.StatusNotImplemented, map[string]string{"error":"refactor in progress"})
}

func GetQuests(w http.ResponseWriter, r *http.Request) { writeJSON(w, http.StatusNotImplemented, map[string]string{"error":"refactor in progress"}) }
func CompleteQuest(w http.ResponseWriter, r *http.Request) { writeJSON(w, http.StatusNotImplemented, map[string]string{"error":"refactor in progress"}) }
func GetLeaderboard(w http.ResponseWriter, r *http.Request) { writeJSON(w, http.StatusNotImplemented, map[string]string{"error":"refactor in progress"}) }
func GetPolls(w http.ResponseWriter, r *http.Request) { writeJSON(w, http.StatusNotImplemented, map[string]string{"error":"refactor in progress"}) }
func VoteOnPoll(w http.ResponseWriter, r *http.Request) { writeJSON(w, http.StatusNotImplemented, map[string]string{"error":"refactor in progress"}) }

func GetStudentDashboard(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusNotImplemented, map[string]string{"error":"refactor in progress"})
}

// Example helper from original code (simplified) - will be expanded
func collectQuestsForUser(ctx context.Context, userID int) error { _ = bson.M{}; _ = strconv.Itoa; return nil }
