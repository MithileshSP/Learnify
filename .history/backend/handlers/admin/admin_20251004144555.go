package admin

import (
    "context"
    "net/http"
    "time"

    "go.mongodb.org/mongo-driver/bson"
    "go.mongodb.org/mongo-driver/mongo/options"

    "backend/handlers/common"
    "backend/models"
)

type (
    AdminOverviewResponse = models.AdminOverviewResponse
    AdminActivity         = models.AdminActivity
    User                  = models.User
    Quest                 = models.Quest
)

func GetOverview(w http.ResponseWriter, r *http.Request) {
    if !common.HasRole(r.Context(), common.RoleAdmin) { common.WriteJSON(w,http.StatusForbidden,map[string]string{"error":"admin access required"}); return }
    ctx := context.Background()
    totalUsers, _ := common.UsersCol.CountDocuments(ctx, bson.M{})
    studentCount, _ := common.UsersCol.CountDocuments(ctx, bson.M{"role": common.RoleStudent})
    facultyCount, _ := common.UsersCol.CountDocuments(ctx, bson.M{"role": common.RoleFaculty})
    questsCount, _ := common.QuestsCol.CountDocuments(ctx, bson.M{})
    cursor, err := common.UsersCol.Find(ctx, bson.M{})
    if err != nil { common.WriteJSON(w,http.StatusInternalServerError,map[string]string{"error":"failed to load users"}); return }
    defer cursor.Close(ctx)
    var coinSum int
    for cursor.Next(ctx) { var user User; if err := cursor.Decode(&user); err != nil { continue }; coinSum += user.Coins }
    leaders, err := common.CollectLeaderboard(5); if err != nil { common.WriteJSON(w,http.StatusInternalServerError,map[string]string{"error": err.Error()}); return }
    activity, err := collectRecentActivity(ctx, 5); if err != nil { common.WriteJSON(w,http.StatusInternalServerError,map[string]string{"error": err.Error()}); return }
    var avgCoins float64; if totalUsers>0 { avgCoins = float64(coinSum)/float64(totalUsers) }
    resp := AdminOverviewResponse{ AverageCoins: avgCoins, Leaderboard: leaders, RecentActivity: activity }
    resp.Totals.Users = int(totalUsers); resp.Totals.Students = int(studentCount); resp.Totals.Faculty = int(facultyCount); resp.Totals.ActiveQuests = int(questsCount)
    common.WriteJSON(w, http.StatusOK, resp)
}

func collectRecentActivity(ctx context.Context, limit int64) ([]AdminActivity, error) {
    findOpts := options.Find().SetSort(bson.M{"completed_at": -1}).SetLimit(limit)
    cursor, err := common.UserQuestsCol.Find(ctx, bson.M{}, findOpts)
    if err != nil { return nil, err }
    defer cursor.Close(ctx)
    activities := []AdminActivity{}
    userCache := map[int]string{}
    questCache := map[int]string{}
    for cursor.Next(ctx) {
        var record struct { UserID int `bson:"user_id"`; QuestID int `bson:"quest_id"`; CompletedAt time.Time `bson:"completed_at"` }
        if err := cursor.Decode(&record); err != nil { continue }
        if _, ok := userCache[record.UserID]; !ok { var user User; if err := common.UsersCol.FindOne(ctx, bson.M{"user_id": record.UserID}).Decode(&user); err == nil { userCache[record.UserID] = user.Name } }
        if _, ok := questCache[record.QuestID]; !ok { var quest Quest; if err := common.QuestsCol.FindOne(ctx, bson.M{"quest_id": record.QuestID}).Decode(&quest); err == nil { questCache[record.QuestID] = quest.Title } }
        activities = append(activities, AdminActivity{ UserName: userCache[record.UserID], QuestTitle: questCache[record.QuestID], CompletedAt: record.CompletedAt })
    }
    return activities, nil
}
