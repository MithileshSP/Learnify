package common

import (
	"context"
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"strings"

	"go.mongodb.org/mongo-driver/bson"

	"backend/models"
)

type publicUser = models.PublicUser

type loginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

func sanitizeUser(u *models.User) publicUser {
	if u == nil { return publicUser{} }
	return publicUser{ID: u.UserID, Name: u.Name, Email: u.Email, Coins: u.Coins, Streak: u.Streak, Role: u.Role, AcademicStanding: u.AcademicStanding, GamificationLevel: u.GamificationLevel, CourseProgress: u.CourseProgress, ActiveCourses: u.ActiveCourses}
}

func writeJSON(w http.ResponseWriter, status int, payload interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if payload != nil { _ = json.NewEncoder(w).Encode(payload) }
}

func decodeJSON(r *http.Request, dst interface{}) error {
	dec := json.NewDecoder(r.Body); dec.DisallowUnknownFields(); return dec.Decode(dst)
}

func LoginHandler(w http.ResponseWriter, r *http.Request) {
	if UsersCol == nil { log.Println("LoginHandler: users collection not configured"); writeJSON(w, http.StatusInternalServerError, map[string]string{"error":"service unavailable"}); return }
	var req loginRequest
	if err := decodeJSON(r, &req); err != nil { writeJSON(w, http.StatusBadRequest, map[string]string{"error":"invalid payload"}); return }
	ctx := context.Background()
	var user models.User
	filter := bson.M{"email": strings.ToLower(strings.TrimSpace(req.Email))}
	if err := UsersCol.FindOne(ctx, filter).Decode(&user); err != nil { writeJSON(w, http.StatusUnauthorized, map[string]string{"error":"invalid credentials"}); return }
	if err := VerifyPassword(user.PasswordHash, req.Password); err != nil { writeJSON(w, http.StatusUnauthorized, map[string]string{"error":"invalid credentials"}); return }
	token, expires, err := GenerateToken(&user)
	if err != nil { writeJSON(w, http.StatusInternalServerError, map[string]string{"error":"failed to generate token"}); return }
	writeJSON(w, http.StatusOK, map[string]interface{}{"token": token, "expiresAt": expires.UTC(), "user": sanitizeUser(&user)})
}

func GetMeHandler(w http.ResponseWriter, r *http.Request) {
	userID, ok := UserIDFromContext(r.Context()); if !ok { writeJSON(w, http.StatusUnauthorized, map[string]string{"error":"unauthorized"}); return }
	ctx := context.Background()
	var user models.User
	if err := UsersCol.FindOne(ctx, bson.M{"user_id": userID}).Decode(&user); err != nil { writeJSON(w, http.StatusNotFound, map[string]string{"error":"user not found"}); return }
	writeJSON(w, http.StatusOK, sanitizeUser(&user))
}

func WithRoles(handler http.HandlerFunc, allowed ...string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if !HasRole(r.Context(), allowed...) { http.Error(w, "forbidden", http.StatusForbidden); return }
		handler(w, r)
	}
}

var ErrForbidden = errors.New("forbidden")
