package main

import (
    "context"
    "net/http"
    "strings"

    "github.com/golang-jwt/jwt/v5"
)

type contextKey string

const (
    contextKeyUserID   contextKey = "userID"
    contextKeyUserRole contextKey = "userRole"
)

func authMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        if strings.ToUpper(r.Method) == http.MethodOptions {
            next.ServeHTTP(w, r)
            return
        }

        header := r.Header.Get("Authorization")
        if header == "" || !strings.HasPrefix(header, "Bearer ") {
            http.Error(w, "missing bearer token", http.StatusUnauthorized)
            return
        }

        tokenString := strings.TrimPrefix(header, "Bearer ")
        claims := &Claims{}

        token, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (interface{}, error) {
            return []byte(jwtSecret), nil
        })
        if err != nil || !token.Valid {
            http.Error(w, "invalid token", http.StatusUnauthorized)
            return
        }

        ctx := context.WithValue(r.Context(), contextKeyUserID, claims.UserID)
        ctx = context.WithValue(ctx, contextKeyUserRole, claims.Role)
        next.ServeHTTP(w, r.WithContext(ctx))
    })
}

func getUserIDFromContext(ctx context.Context) (int, bool) {
    if ctx == nil {
        return 0, false
    }
    id, ok := ctx.Value(contextKeyUserID).(int)
    return id, ok
}

func getUserRoleFromContext(ctx context.Context) string {
    if ctx == nil {
        return ""
    }
    if role, ok := ctx.Value(contextKeyUserRole).(string); ok {
        return role
    }
    return ""
}

func hasRole(ctx context.Context, allowed ...string) bool {
    role := getUserRoleFromContext(ctx)
    if role == "" {
        return false
    }
    if len(allowed) == 0 {
        return true
    }
    for _, candidate := range allowed {
        if strings.EqualFold(candidate, role) {
            return true
        }
    }
    return false
}
