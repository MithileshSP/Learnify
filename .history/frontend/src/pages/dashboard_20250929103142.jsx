import { Zap, Target, Coins, TrendingUp, Award } from "lucide-react";

// Small stat card component
function StatCard({ title, value, subtitle, icon: Icon, color, border }) {
  return (
    <div className={`bg-white rounded-xl p-6 shadow-lg border-2 ${border}`}>
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-lg ${color.bg}`}>
          <Icon className={`w-8 h-8 ${color.text}`} />
        </div>
        <span className={`text-3xl font-bold ${color.text}`}>{value}</span>
      </div>
      <h3 className="text-gray-600 font-semibold">{title}</h3>
      <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
    </div>
  );
}

// Progress bar component
function ProgressBar({ completed, total }) {
  const percentage = (completed / total) * 100 || 0;
  return (
    <div>
      <div className="w-full bg-gray-200 rounded-full h-4 mb-2">
        <div
          className="bg-gradient-to-r from-green-400 to-blue-500 h-4 rounded-full transition-all duration-500"
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
      <p className="text-sm text-gray-600">
        {completed} of {total} quests completed ({Math.round(percentage)}%)
      </p>
    </div>
  );
}

// Achievement card component
function AchievementGrid({ badges }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {badges.map((badge, idx) => (
        <div
          key={idx}
          className="flex flex-col items-center p-4 bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg"
        >
          <div className="text-4xl mb-2">{badge.icon}</div>
          <span className="text-sm font-semibold text-center">{badge.name}</span>
        </div>
      ))}
    </div>
  );
}

// Main Dashboard component
export default function Dashboard({ user, stats }) {
  return (
    <div className="space-y-6">
      {/* Greeting Section */}
      <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl p-8 text-white">
        <h2 className="text-3xl font-bold mb-2">Welcome back, {user.name}! 🎓</h2>
        <p className="text-white/90">Keep up the great work on your learning journey</p>
      </div>

      {/* Stats Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          title="Day Streak"
          value={stats.streak}
          subtitle="Keep learning daily!"
          icon={Zap}
          color={{ bg: "bg-orange-100", text: "text-orange-500" }}
          border="border-orange-200"
        />
        <StatCard
          title="Quests Completed"
          value={stats.completedQuests}
          subtitle={`Out of ${stats.totalQuests} today`}
          icon={Target}
          color={{ bg: "bg-blue-100", text: "text-blue-500" }}
          border="border-blue-200"
        />
        <StatCard
          title="Skill Coins"
          value={user.coins}
          subtitle="Earn more by learning"
          icon={Coins}
          color={{ bg: "bg-yellow-100", text: "text-yellow-500" }}
          border="border-yellow-200"
        />
      </div>

      {/* Progress Section */}
      <div className="bg-white rounded-xl p-6 shadow-lg">
        <h3 className="text-xl font-bold mb-4 flex items-center">
          <TrendingUp className="w-6 h-6 mr-2 text-green-500" />
          Today's Progress
        </h3>
        <ProgressBar completed={stats.completedQuests} total={stats.totalQuests} />
      </div>

      {/* Achievements Section */}
      <div className="bg-white rounded-xl p-6 shadow-lg">
        <h3 className="text-xl font-bold mb-4 flex items-center">
          <Award className="w-6 h-6 mr-2 text-purple-500" />
          Recent Achievements
        </h3>
        <AchievementGrid badges={stats.badges} />
      </div>
    </div>
  );
}
