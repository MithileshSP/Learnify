export default Navigation = ({ activeTab, setActiveTab, user }) => {
  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: Target },
    { id: 'quests', label: 'Daily Quests', icon: Zap },
    { id: 'leaderboard', label: 'Leaderboard', icon: Trophy },
    { id: 'ai-buddy', label: 'AI Buddy', icon: MessageSquare },
    { id: 'campus-pulse', label: 'Campus Pulse', icon: Vote }
  ];

  return (
    <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between py-4">
          <div className="flex items-center space-x-2">
            <BookOpen className="w-8 h-8" />
            <span className="text-2xl font-bold">LearnOnline</span>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 bg-white/20 px-4 py-2 rounded-full">
              <Coins className="w-5 h-5 text-yellow-300" />
              <span className="font-semibold">{user.coins}</span>
            </div>
            <div className="flex items-center space-x-2">
              <User className="w-5 h-5" />
              <span>{user.name}</span>
            </div>
          </div>
        </div>
        <div className="flex space-x-1 pb-2">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-t-lg transition-all ${
                  activeTab === tab.id
                    ? 'bg-white text-blue-600 font-semibold'
                    : 'text-white/80 hover:bg-white/10'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};