import { useEffect, useState } from "react";
import "./App.css";
import Navigation from "./components/layout/Navigation.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import DailyQuests from "./pages/DailyQuests.jsx";
import Leaderboard from "./pages/Leaderboard.jsx";
import AIBuddy from "./pages/AIBuddy.jsx";
import CampusPulse from "./pages/CampusPulse.jsx";
import { api } from "./api.js";

export default function App() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [user, setUser] = useState({ id: 1, name: "Loading...", coins: 0 });

  const [stats, setStats] = useState({
    streak: 7,
    completedQuests: 0,
    totalQuests: 6,
    badges: [
      { icon: "🔥", name: "Week Warrior" },
      { icon: "⚡", name: "Quick Learner" },
      { icon: "🎯", name: "Goal Getter" },
      { icon: "🌟", name: "Rising Star" },
    ],
  });

  const [quests, setQuests] = useState([]);

  const [leaders, setLeaders] = useState([]);

  const [polls, setPolls] = useState([]);

  useEffect(() => {
    // Load initial data from backend
    (async () => {
      try {
        const [userData, questsData, leadersData, pollsData] =
          await Promise.all([
            api.getUser(1),
            api.getQuests(1),
            api.getLeaderboard(),
            api.getPolls(),
          ]);

        setUser(userData);
        setQuests(questsData);
        setLeaders(leadersData);
        setPolls(pollsData);

        setStats((prev) => ({
          ...prev,
          streak: userData.streak,
          completedQuests: questsData.filter((q) => q.completed).length,
          totalQuests: questsData.length,
        }));
      } catch (e) {
        console.error("Failed to load initial data", e);
      }
    })();
  }, []);

  const handleCompleteQuest = async (questId) => {
    const quest = quests.find((q) => q.id === questId);
    if (!quest || quest.completed) return;

    try {
      await api.completeQuest(questId, user.id);
      // Refresh user and quests
      const [updatedUser, updatedQuests, updatedLeaders] = await Promise.all([
        api.getUser(user.id),
        api.getQuests(user.id),
        api.getLeaderboard(),
      ]);
      setUser(updatedUser);
      setQuests(updatedQuests);
      setLeaders(updatedLeaders);
      setStats((prev) => ({
        ...prev,
        completedQuests: updatedQuests.filter((q) => q.completed).length,
        totalQuests: updatedQuests.length,
      }));
    } catch (e) {
      console.error("Failed to complete quest", e);
    }
  };

  const handleVote = async (pollId, optionIndex) => {
    try {
      await api.voteOnPoll(pollId, optionIndex, user.id);
      const updated = await api.getPolls();
      setPolls(updated);
    } catch (e) {
      console.error("Vote failed", e);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        user={user}
      />

      <div className="max-w-7xl mx-auto px-4 py-8">
        {activeTab === "dashboard" && <Dashboard user={user} stats={stats} />}
        {activeTab === "quests" && (
          <DailyQuests
            quests={quests}
            completeQuest={(idxOrId) => {
              const id = typeof idxOrId === "number" ? idxOrId : idxOrId;
              handleCompleteQuest(id);
            }}
          />
        )}
        {activeTab === "leaderboard" && <Leaderboard leaderboard={leaders} />}
        {activeTab === "ai-buddy" && <AIBuddy />}
        {activeTab === "campus-pulse" && (
          <CampusPulse polls={polls} onVote={handleVote} />
        )}
      </div>
    </div>
  );
}
