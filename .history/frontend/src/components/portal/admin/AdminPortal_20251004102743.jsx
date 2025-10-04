import { useEffect, useState } from "react";
import {
  Activity,
  Award,
  Coins,
  GraduationCap,
  LogOut,
  RefreshCw,
  Users,
} from "lucide-react";
import { api } from "../../../api.js";

export default function AdminPortal({ user, onLogout }) {
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadOverview = async () => {
    setLoading(true);
    try {
      const data = await api.getAdminOverview();
      setOverview(data);
      setError(null);
    } catch (err) {
      console.error("Failed to load admin overview", err);
      setError(err?.message || "Unable to load admin overview");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOverview();
  }, []);

  const totals = overview?.totals ?? {};

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-gradient-to-r from-slate-900 via-purple-900 to-indigo-900 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-6 py-8 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <p className="text-sm text-white/60 uppercase tracking-wide">
              Admin Console
            </p>
            <h1 className="text-3xl font-bold mt-1">
              Welcome back, {user.name}
            </h1>
            <p className="text-white/70 mt-2">
              Monitor campus-wide engagement, quest performance, and student
              momentum.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={loadOverview}
              className="flex items-center gap-2 bg-white/10 hover:bg-white/20 transition px-4 py-2 rounded-full"
            >
              <RefreshCw
                className={loading ? "w-4 h-4 animate-spin" : "w-4 h-4"}
              />
              <span className="text-sm font-semibold">Refresh</span>
            </button>
            <button
              type="button"
              onClick={onLogout}
              className="flex items-center gap-2 bg-white text-slate-900 px-4 py-2 rounded-full font-semibold"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign out</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-10 space-y-10">
        {error ? (
          <div className="bg-red-100 border border-red-200 text-red-700 px-4 py-3 rounded-xl">
            {error}
          </div>
        ) : null}

        <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
          <StatCard
            icon={Users}
            label="Total Users"
            value={totals.users ?? "-"}
            accent="from-indigo-500 to-indigo-600"
            loading={loading}
          />
          <StatCard
            icon={GraduationCap}
            label="Students"
            value={totals.students ?? "-"}
            accent="from-purple-500 to-purple-600"
            loading={loading}
          />
          <StatCard
            icon={Activity}
            label="Faculty"
            value={totals.faculty ?? "-"}
            accent="from-emerald-500 to-emerald-600"
            loading={loading}
          />
          <StatCard
            icon={Award}
            label="Active Quests"
            value={totals.activeQuests ?? "-"}
            accent="from-orange-500 to-orange-600"
            loading={loading}
          />
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="bg-white rounded-3xl shadow-sm border border-gray-200 p-6 col-span-1 lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <Coins className="w-5 h-5 text-amber-500" />
                Average Coins Earned
              </h2>
              <span className="text-sm text-gray-500">
                Across all active users
              </span>
            </div>
            <div className="text-4xl font-bold text-gray-900">
              {loading ? "-" : `${overview?.averageCoins?.toFixed(1) ?? 0} ☀️`}
            </div>
            <p className="text-sm text-gray-500 mt-2">
              Use coin trends to identify cohorts that might need nudges or
              fresh quests.
            </p>
          </div>

          <div className="bg-white rounded-3xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Recent Activity
            </h2>
            <div className="space-y-4 max-h-64 overflow-y-auto pr-2">
              {loading ? (
                <p className="text-gray-500">Loading recent completions…</p>
              ) : overview?.recentActivity?.length ? (
                overview.recentActivity.map((entry, index) => (
                  <div
                    key={`${entry.userName}-${index}`}
                    className="flex justify-between items-start"
                  >
                    <div>
                      <p className="font-semibold text-gray-800">
                        {entry.userName}
                      </p>
                      <p className="text-sm text-gray-500">
                        {entry.questTitle}
                      </p>
                    </div>
                    <span className="text-xs text-gray-400">
                      {new Date(entry.completedAt).toLocaleString()}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-gray-500">
                  No recent quest completions logged.
                </p>
              )}
            </div>
          </div>
        </section>

        <section className="bg-white rounded-3xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <Award className="w-5 h-5 text-purple-500" />
              Top Performers
            </h2>
            <span className="text-sm text-gray-500">
              Sorted by coins earned
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Student
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Quests
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Streak
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Coins
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td className="px-4 py-4 text-gray-500" colSpan={4}>
                      Loading leaderboard…
                    </td>
                  </tr>
                ) : overview?.leaderboard?.length ? (
                  overview.leaderboard.map((entry) => (
                    <tr key={entry.id ?? entry.name}>
                      <td className="px-4 py-4 text-gray-900 font-medium">
                        {entry.name}
                      </td>
                      <td className="px-4 py-4 text-gray-600">
                        {entry.completedQuests}
                      </td>
                      <td className="px-4 py-4 text-gray-600">
                        {entry.streak} days
                      </td>
                      <td className="px-4 py-4 text-gray-900 font-semibold">
                        {entry.coins}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="px-4 py-4 text-gray-500" colSpan={4}>
                      No leaderboard data available yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, accent, loading }) {
  return (
    <div className="bg-white rounded-3xl shadow-sm border border-gray-200 p-6">
      <div
        className={`inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br ${accent} text-white mb-4`}
      >
        <Icon className="w-6 h-6" />
      </div>
      <p className="text-sm text-gray-500 uppercase tracking-wide">{label}</p>
      <p className="mt-2 text-3xl font-bold text-gray-900">
        {loading ? "-" : value}
      </p>
    </div>
  );
}
