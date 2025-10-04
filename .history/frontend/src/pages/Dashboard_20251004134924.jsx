import React from 'react';
import { Zap, Target, Coins, TrendingUp, Award } from 'lucide-react';

const Dashboard = ({ user, stats }) => {
  const progressPercentage = (stats.completedQuests / stats.totalQuests) * 100 || 0;

  return (
    <div className="space-y-6 ">
      <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl p-8 text-white">
        <h2 className="text-3xl font-bold mb-2">Welcome back, {user.name}! 🎓</h2>
        <p className="text-white/90">Keep up the great work on your learning journey</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Streak */}
        <div className="bg-white rounded-xl p-6 shadow-lg border-2 border-orange-200">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-orange-100 p-3 rounded-lg">
              <Zap className="w-8 h-8 text-orange-500" />
            </div>
            <span className="text-3xl font-bold text-orange-500">{stats.streak}</span>
          </div>
          <h3 className="text-gray-600 font-semibold">Day Streak</h3>
          <p className="text-sm text-gray-500 mt-1">Keep learning daily!</p>
        </div>

        {/* Completed Quests */}
        <div className="bg-white rounded-xl p-6 shadow-lg border-2 border-blue-200">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-blue-100 p-3 rounded-lg">
              <Target className="w-8 h-8 text-blue-500" />
            </div>
            <span className="text-3xl font-bold text-blue-500">{stats.completedQuests}</span>
          </div>
          <h3 className="text-gray-600 font-semibold">Quests Completed</h3>
          <p className="text-sm text-gray-500 mt-1">Out of {stats.totalQuests} today</p>
        </div>

        {/* Skill Coins */}
        <div className="bg-white rounded-xl p-6 shadow-lg border-2 border-yellow-200">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-yellow-100 p-3 rounded-lg">
              <Coins className="w-8 h-8 text-yellow-500" />
            </div>
            <span className="text-3xl font-bold text-yellow-500">{user.coins}</span>
          </div>
          <h3 className="text-gray-600 font-semibold">Skill Coins</h3>
          <p className="text-sm text-gray-500 mt-1">Earn more by learning</p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-white rounded-xl p-6 shadow-lg">
        <h3 className="text-xl font-bold mb-4 flex items-center">
          <TrendingUp className="w-6 h-6 mr-2 text-green-500" />
          Today's Progress
        </h3>
        <div className="w-full bg-gray-200 rounded-full h-4 mb-2">
          <div
            className="bg-gradient-to-r from-green-400 to-blue-500 h-4 rounded-full transition-all duration-500"
            style={{ width: `${progressPercentage}%` }}
          ></div>
        </div>
        <p className="text-sm text-gray-600">
          {stats.completedQuests} of {stats.totalQuests} quests completed ({Math.round(progressPercentage)}%)
        </p>
      </div>

      {/* Achievements */}
      <div className="bg-white rounded-xl p-6 shadow-lg">
        <h3 className="text-xl font-bold mb-4 flex items-center">
          <Award className="w-6 h-6 mr-2 text-purple-500" />
          Recent Achievements
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.badges.map((badge, idx) => (
            <div key={idx} className="flex flex-col items-center p-4 bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg">
              <div className="text-4xl mb-2">{badge.icon}</div>
              <span className="text-sm font-semibold text-center">{badge.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
