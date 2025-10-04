import { useEffect, useState } from "react";
import { BookOpen, LogOut, RefreshCw, TrendingUp, Users } from "lucide-react";
import { api } from "../../api.js";

export default function FacultyPortal({ user, onLogout }) {
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadOverview = async () => {
    setLoading(true);
    try {
      const data = await api.getFacultyOverview();
      setOverview(data);
      setError(null);
    } catch (err) {
      console.error("Failed to load faculty overview", err);
      setError(err?.message || "Unable to load faculty overview");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOverview();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 py-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">
              Faculty Workspace
            </p>
            <h1 className="text-2xl font-semibold text-slate-900 mt-1">
              Hello, {user.name}
            </h1>
            <p className="text-sm text-slate-500 mt-2">
              Track cohort momentum, upcoming deadlines, and recognize top
              performers.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={loadOverview}
              className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-full hover:bg-slate-800 transition"
            >
              <RefreshCw
                className={loading ? "w-4 h-4 animate-spin" : "w-4 h-4"}
              />
              <span className="text-sm font-semibold">Refresh</span>
            </button>
            <button
              type="button"
              onClick={onLogout}
              className="flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-full text-slate-700 hover:bg-slate-100 transition"
            >
              <LogOut className="w-4 h-4" />
              <span className="text-sm font-semibold">Sign out</span>
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

        <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-indigo-500" />
                Course Progress
              </h2>
              <span className="text-sm text-slate-500">
                Live cohort insights
              </span>
            </div>
            <div className="space-y-4">
              {loading ? (
                <p className="text-slate-500">Loading course performance…</p>
              ) : overview?.courses?.length ? (
                overview.courses.map((course) => (
                  <div
                    key={course.courseId}
                    className="border border-slate-200 rounded-2xl p-4"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-semibold text-slate-900">
                          {course.title}
                        </h3>
                        <p className="text-sm text-slate-500">
                          {course.students} students enrolled
                        </p>
                      </div>
                      <span className="text-sm text-indigo-500 bg-indigo-50 px-3 py-1 rounded-full font-semibold">
                        {Math.round(course.averageProgress)}% avg
                      </span>
                    </div>
                    {course.dueNext ? (
                      <p className="mt-3 text-sm text-slate-500">
                        Next due:{" "}
                        <span className="text-slate-800 font-medium">
                          {course.dueNext}
                        </span>
                      </p>
                    ) : null}
                    <div className="mt-3 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-indigo-500 to-indigo-600"
                        style={{
                          width: `${Math.min(course.averageProgress, 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-slate-500">No courses available.</p>
              )}
            </div>
          </div>

          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-xl font-semibold text-slate-900 mb-5 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-500" />
              Top Performers
            </h2>
            {loading ? (
              <p className="text-slate-500">Loading performers…</p>
            ) : overview?.topPerformers?.length ? (
              <div className="space-y-4">
                {overview.topPerformers.map((leader, index) => (
                  <div
                    key={`${leader.id ?? leader.name}-${index}`}
                    className="flex items-center justify-between border border-slate-200 rounded-2xl px-4 py-3"
                  >
                    <div>
                      <p className="font-semibold text-slate-900">
                        {leader.name}
                      </p>
                      <p className="text-xs text-slate-500">
                        {leader.completedQuests} quests • {leader.streak} day
                        streak
                      </p>
                    </div>
                    <span className="text-sm font-semibold text-emerald-600">
                      {leader.coins} coins
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-500">No leaderboard data yet.</p>
            )}

            <div className="mt-6 bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-4 text-sm text-slate-500 flex items-center gap-3">
              <Users className="w-5 h-5 text-slate-400" />
              Share targeted feedback with learners who are slipping behind to
              keep the cohort on track.
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
