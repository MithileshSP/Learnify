import React from 'react';

export default function DashboardView({ profile, metrics, quests, leaderboard, courses, loading, actingQuest, onQuestAction, notifications, initialLoad, notificationCount }) {
  return (
    <div className="rounded-3xl border border-slate-100 bg-white p-8 shadow-sm">
      <h1 className="text-2xl font-semibold mb-4">Dashboard (placeholder)</h1>
      <p className="text-sm text-slate-500">This placeholder DashboardView component was generated during modularization. Implement detailed UI next.</p>
    </div>
  );
}
