package main

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"time"

	"github.com/gorilla/mux"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// Set in main.go from env or fallback demo key
var geminiAPIKey string

// User handlers
type User struct {
    UserID int    `json:"id" bson:"user_id"`
    Name   string `json:"name" bson:"name"`
    Email  string `json:"email" bson:"email"`
    Coins  int    `json:"coins" bson:"coins"`
    Streak int    `json:"streak" bson:"streak"`
}

func getUser(w http.ResponseWriter, r *http.Request) {
    vars := mux.Vars(r)
    id, _ := strconv.Atoi(vars["id"])

    var user User
    err := usersCol.FindOne(context.Background(), bson.M{"user_id": id}).Decode(&user)
    if err != nil {
        http.Error(w, "User not found", http.StatusNotFound)
        return
    }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(user)
}

// Quest handlers
type Quest struct {
    QuestID    int    `json:"id" bson:"quest_id"`
    Title      string `json:"title" bson:"title"`
    Question   string `json:"question" bson:"question"`
    Answer     string `json:"answer" bson:"answer"`
    Icon       string `json:"icon" bson:"icon"`
    Difficulty string `json:"difficulty" bson:"difficulty"`
    Coins      int    `json:"coins" bson:"coins"`
    Completed  bool   `json:"completed" bson:"completed,omitempty"`
}

func getQuests(w http.ResponseWriter, r *http.Request) {
    userID, _ := strconv.Atoi(r.URL.Query().Get("user_id"))
    if userID == 0 {
        userID = 1
    }

    ctx := context.Background()

    // Get all quests
    cursor, err := questsCol.Find(ctx, bson.M{})
    if err != nil {
        http.Error(w, err.Error(), http.StatusInternalServerError)
        return
    }
    defer cursor.Close(ctx)

    var quests []Quest
    for cursor.Next(ctx) {
        var quest Quest
        if err := cursor.Decode(&quest); err != nil {
            continue
        }

        // Check if completed by user
        var userQuest struct {
            Completed bool `bson:"completed"`
        }
        userQuestsCol.FindOne(ctx, bson.M{
            "user_id":  userID,
            "quest_id": quest.QuestID,
        }).Decode(&userQuest)

        quest.Completed = userQuest.Completed
        quests = append(quests, quest)
    }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(quests)
}

func completeQuest(w http.ResponseWriter, r *http.Request) {
    vars := mux.Vars(r)
    questID, _ := strconv.Atoi(vars["id"])

    var req struct {
        UserID int `json:"user_id"`
    }
    json.NewDecoder(r.Body).Decode(&req)
    if req.UserID == 0 {
        req.UserID = 1
    }

    ctx := context.Background()

    // Get quest
    var quest Quest
    err := questsCol.FindOne(ctx, bson.M{"quest_id": questID}).Decode(&quest)
    if err != nil {
        http.Error(w, "Quest not found", http.StatusNotFound)
        return
    }

    // Check if already completed
    count, _ := userQuestsCol.CountDocuments(ctx, bson.M{
        "user_id":  req.UserID,
        "quest_id": questID,
    })

    if count == 0 {
        // Mark as completed
        userQuestsCol.InsertOne(ctx, bson.M{
            "user_id":      req.UserID,
            "quest_id":     questID,
            "completed":    true,
            "completed_at": time.Now(),
        })

        // Update user coins
        usersCol.UpdateOne(
            ctx,
            bson.M{"user_id": req.UserID},
            bson.M{"$inc": bson.M{"coins": quest.Coins}},
        )
    }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(map[string]interface{}{
        "success": true,
        "coins":   quest.Coins,
    })
}

// Leaderboard handlers
type LeaderboardEntry struct {
    UserID          int    `json:"id" bson:"user_id"`
    Name            string `json:"name" bson:"name"`
    CompletedQuests int    `json:"completedQuests" bson:"completed_quests"`
    Streak          int    `json:"streak" bson:"streak"`
    Coins           int    `json:"coins" bson:"coins"`
}

func getLeaderboard(w http.ResponseWriter, r *http.Request) {
    ctx := context.Background()

    // Get all users
    cursor, err := usersCol.Find(ctx, bson.M{}, options.Find().SetSort(bson.M{"coins": -1}))
    if err != nil {
        http.Error(w, err.Error(), http.StatusInternalServerError)
        return
    }
    defer cursor.Close(ctx)

    var leaders []LeaderboardEntry
    for cursor.Next(ctx) {
        var user User
        if err := cursor.Decode(&user); err != nil {
            continue
        }

        // Count completed quests
        count, _ := userQuestsCol.CountDocuments(ctx, bson.M{
            "user_id":   user.UserID,
            "completed": true,
        })

        leader := LeaderboardEntry{
            UserID:          user.UserID,
            Name:            user.Name,
            CompletedQuests: int(count),
            Streak:          user.Streak,
            Coins:           user.Coins,
        }
        leaders = append(leaders, leader)
    }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(leaders)
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

func getPolls(w http.ResponseWriter, r *http.Request) {
    ctx := context.Background()

    cursor, err := pollsCol.Find(ctx, bson.M{})
    if err != nil {
        http.Error(w, err.Error(), http.StatusInternalServerError)
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

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(polls)
}

func voteOnPoll(w http.ResponseWriter, r *http.Request) {
    vars := mux.Vars(r)
    pollID, _ := strconv.Atoi(vars["id"])

    var req struct {
        UserID      int `json:"user_id"`
        OptionIndex int `json:"option_index"`
    }
    json.NewDecoder(r.Body).Decode(&req)
    if req.UserID == 0 {
        req.UserID = 1
    }

    ctx := context.Background()

    // Check if already voted
    count, _ := votesCol.CountDocuments(ctx, bson.M{
        "user_id": req.UserID,
        "poll_id": pollID,
    })

    if count == 0 {
        // Record vote
        votesCol.InsertOne(ctx, bson.M{
            "user_id":      req.UserID,
            "poll_id":      pollID,
            "option_index": req.OptionIndex,
            "voted_at":     time.Now(),
        })

        // Increment vote count
        updateField := fmt.Sprintf("options.%d.votes", req.OptionIndex)
        pollsCol.UpdateOne(
            ctx,
            bson.M{"poll_id": pollID},
            bson.M{"$inc": bson.M{updateField: 1}},
        )
    }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(map[string]bool{"success": true})
}

// AI handlers
func aiChat(w http.ResponseWriter, r *http.Request) {
    var req struct {
        Message string `json:"message"`
    }
    json.NewDecoder(r.Body).Decode(&req)

    response, err := callGeminiAPI(req.Message)
    if err != nil {
        http.Error(w, err.Error(), http.StatusInternalServerError)
        return
    }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(map[string]string{"response": response})
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
    json.Unmarshal(body, &result)

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
