import { useEffect, useState } from "react";
import Navigation from "../layout/Navigation.jsx";
import Dashboard from "../../pages/Dashboard.jsx";
import DailyQuests from "../../pages/DailyQuests.jsx";
import Leaderboard from "../../pages/Leaderboard.jsx";
import AIBuddy from "../../pages/AIBuddy.jsx";
import CampusPulse from "../../pages/CampusPulse.jsx";
import { api } from "../../api.js";

const defaultStats = {
  streak: 0,
  completedQuests: 0,
  totalQuests: 0,
  badges: [
    { icon: "🔥", name: "Week Warrior" },
    { icon: "⚡", name: "Quick Learner" },
    { icon: "🎯", name: "Goal Getter" },
    { icon: "🌟", name: "Rising Star" },
  ],
};

export default function StudentPortal({ user, onLogout, setAuthUser }) {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [stats, setStats] = useState(() => ({ ...defaultStats }));
  const [quests, setQuests] = useState([]);
  const [leaders, setLeaders] = useState([]);
  const [polls, setPolls] = useState([]);
  const [loadingData, setLoadingData] = useState(false);

  useEffect(() => {
    if (!user) {
      setActiveTab("dashboard");
      setStats({ ...defaultStats });
      setQuests([]);
      setLeaders([]);
      setPolls([]);
      return;
    }

    let cancelled = false;

    const loadData = async () => {
      setLoadingData(true);
      try {
        const [questsData, leadersData, pollsData] = await Promise.all([
          api.getQuests(),
          api.getLeaderboard(),
          api.getPolls(),
        ]);

        if (cancelled) return;

        setQuests(questsData);
        setLeaders(leadersData);
        setPolls(pollsData);
        setStats((prev) => ({
          ...prev,
          streak: user.streak,
          completedQuests: questsData.filter((q) => q.completed).length,
          totalQuests: questsData.length,
        }));
      } catch (err) {
        if (!cancelled) {
          console.error("Failed to load student dashboard data", err);
        }
      } finally {
        if (!cancelled) {
          setLoadingData(false);
        }
      }
    };

    loadData();

    return () => {
      cancelled = true;
    };
  }, [user]);

  const handleCompleteQuest = async (questId) => {
    const quest = quests.find((q) => q.id === questId);
    if (!quest || quest.completed) return;

    try {
      await api.completeQuest(questId);
      const [updatedProfile, updatedQuests, updatedLeaders] = await Promise.all(
        [api.getMe(), api.getQuests(), api.getLeaderboard()]
      );

      setAuthUser(updatedProfile);
      setQuests(updatedQuests);
      setLeaders(updatedLeaders);
      setStats((prev) => ({
        ...prev,
        streak: updatedProfile.streak,
        completedQuests: updatedQuests.filter((q) => q.completed).length,
        totalQuests: updatedQuests.length,
      }));
    } catch (err) {
      console.error("Failed to complete quest", err);
    }
  };

  const handleVote = async (pollId, optionIndex) => {
    try {
      await api.voteOnPoll(pollId, optionIndex);
      const updated = await api.getPolls();
      setPolls(updated);
    } catch (err) {
      console.error("Vote failed", err);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        user={user}
        onLogout={onLogout}
      />

      <div className="max-w-7xl mx-auto px-4 py-8">
        {loadingData ? (
          <div className="bg-white rounded-xl shadow p-6 mb-6 text-gray-500">
            Syncing your latest progress…
          </div>
        ) : null}

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
