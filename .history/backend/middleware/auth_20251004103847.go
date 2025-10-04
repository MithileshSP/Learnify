package middleware

import (
	"errors"
	"strconv"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"

	models "main.go/models"
)

const DefaultTokenTTL = 24 * time.Hour

type Claims struct {
	UserID int    `json:"userId"`
	Role   string `json:"role"`
	jwt.RegisteredClaims
}

func HashPassword(raw string) (string, error) {
	hashed, err := bcrypt.GenerateFromPassword([]byte(raw), bcrypt.DefaultCost)
	if err != nil {
		return "", err
	}
	return string(hashed), nil
}

func VerifyPassword(hash, raw string) error {
	if hash == "" {
		return errors.New("missing password hash")
	}
	return bcrypt.CompareHashAndPassword([]byte(hash), []byte(raw))
}

func GenerateToken(user *models.User, secret string, ttl time.Duration) (string, time.Time, error) {
	if ttl <= 0 {
		ttl = DefaultTokenTTL
	}
	expiresAt := time.Now().Add(ttl)
	claims := Claims{
		UserID: user.UserID,
		Role:   user.Role,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(expiresAt),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			Subject:   strconv.Itoa(user.UserID),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	signed, err := token.SignedString([]byte(secret))
	if err != nil {
		return "", time.Time{}, err
	}

	return signed, expiresAt, nil
}
