package common

import (
	"errors"
	"time"

	"go.mongodb.org/mongo-driver/mongo"

	"backend/middleware"
	"backend/models"
)

type Dependencies struct {
	UsersCol             *mongo.Collection
	QuestsCol            *mongo.Collection
	PollsCol             *mongo.Collection
	VotesCol             *mongo.Collection
	UserQuestsCol        *mongo.Collection
	ResearchPostsCol     *mongo.Collection
	FacultyDashboardsCol *mongo.Collection
	GeminiAPIKey         string
	GeminiModel          string
	JWTSecret            string
	TokenTTL             time.Duration
}

var (
	UsersCol             *mongo.Collection
	QuestsCol            *mongo.Collection
	PollsCol             *mongo.Collection
	VotesCol             *mongo.Collection
	UserQuestsCol        *mongo.Collection
	ResearchPostsCol     *mongo.Collection
	FacultyDashboardsCol *mongo.Collection
	GeminiAPIKey         string
	GeminiModel          string
	JWTSecret            string
	TokenTTL             time.Duration
)

const (
	RoleAdmin   = "admin"
	RoleFaculty = "faculty"
	RoleStudent = "student"
)

func Configure(deps Dependencies) {
	UsersCol = deps.UsersCol
	QuestsCol = deps.QuestsCol
	PollsCol = deps.PollsCol
	VotesCol = deps.VotesCol
	UserQuestsCol = deps.UserQuestsCol
	ResearchPostsCol = deps.ResearchPostsCol
	FacultyDashboardsCol = deps.FacultyDashboardsCol
	GeminiAPIKey = deps.GeminiAPIKey
	GeminiModel = deps.GeminiModel
	JWTSecret = deps.JWTSecret
	TokenTTL = deps.TokenTTL
	if TokenTTL <= 0 { TokenTTL = middleware.DefaultTokenTTL }
}

func VerifyPassword(hash, raw string) error { return middleware.VerifyPassword(hash, raw) }

func GenerateToken(user *models.User) (string, time.Time, error) {
	if JWTSecret == "" { return "", time.Time{}, errors.New("jwt secret not configured") }
	return middleware.GenerateToken(user, JWTSecret, TokenTTL)
}

func UserIDFromContext(ctx interface{ Value(key any) any }) (int, bool) {
	return middleware.UserIDFromContext(ctx.(interface{ Value(any) any }))
}
