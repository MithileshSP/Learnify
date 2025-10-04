import { Zap, Coins } from "lucide-react";

const Leaderboard = ({ leaders, currentUser }) => {
  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-yellow-500 to-orange-500 rounded-2xl p-8 text-white">
        <h2 className="text-3xl font-bold mb-2">🏆 Leaderboard</h2>
        <p className="text-white/90">Top learners of the week</p>
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-blue-500 to-purple-500 text-white">
              <tr>
                <th className="px-6 py-4 text-left">Rank</th>
                <th className="px-6 py-4 text-left">Student</th>
                <th className="px-6 py-4 text-center">Quests</th>
                <th className="px-6 py-4 text-center">Streak</th>
                <th className="px-6 py-4 text-right">Coins</th>
              </tr>
            </thead>
            <tbody>
              {leaders.length === 0 ? (
                <tr>
                  <td colSpan="5" className="text-center py-6 text-gray-500">
                    No leaders yet 🚀
                  </td>
                </tr>
              ) : (
                leaders.map((leader, idx) => (
                  <tr
                    key={leader.id}
                    className={`border-b transition-colors ${
                      idx === 0
                        ? "bg-yellow-50"
                        : idx === 1
                        ? "bg-gray-50"
                        : idx === 2
                        ? "bg-amber-100"
                        : leader.id === currentUser.id
                        ? "bg-blue-50 font-semibold"
                        : "hover:bg-gray-50"
                    }`}
                  >
                    {/* Rank */}
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        {idx === 0 && <span className="text-2xl mr-2">🥇</span>}
                        {idx === 1 && <span className="text-2xl mr-2">🥈</span>}
                        {idx === 2 && <span className="text-2xl mr-2">🥉</span>}
                        <span className="font-bold text-lg">#{idx + 1}</span>
                      </div>
                    </td>

                    {/* Student */}
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white font-bold">
                          {leader.name ? leader.name.charAt(0).toUpperCase() : "?"}
                        </div>
                        <span>{leader.name}</span>
                        {leader.id === currentUser.id && (
                          <span className="text-xs bg-blue-500 text-white px-2 py-1 rounded">
                            You
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Quests */}
                    <td className="px-6 py-4 text-center">
                      <span className="font-semibold">{leader.completedQuests}</span>
                    </td>

                    {/* Streak */}
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center space-x-1">
                        <Zap className="w-4 h-4 text-orange-500" />
                        <span className="font-semibold">{leader.streak}</span>
                      </div>
                    </td>

                    {/* Coins */}
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end space-x-1 font-semibold text-yellow-600">
                        <Coins className="w-5 h-5" />
                        <span>{leader.coins}</span>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Leaderboard;
