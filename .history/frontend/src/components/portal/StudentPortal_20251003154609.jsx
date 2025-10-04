import { useCallback, useEffect, useMemo, useState } from "react";
import {
  LayoutDashboard,
  ListChecks,
  Newspaper,
  GraduationCap,
  UserCircle,
  Search,
  Bell,
  BookOpen,
  Sparkles,
  Flame,
  CheckCircle2,
  ChevronRight,
  ArrowRight,
  Target,
} from "lucide-react";
import { api } from "../../api.js";

const sidebarLinks = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, active: true },
  { id: "quests", label: "Quests", icon: ListChecks },
  { id: "research", label: "Research Feed", icon: Newspaper },
  { id: "grades", label: "Grades", icon: GraduationCap },
  { id: "profile", label: "Profile", icon: UserCircle },
];

const metricConfig = [
  {
    key: "courseProgress",
    label: "Course Progress",
    description: "Avg. completion across all courses",
    icon: BookOpen,
    suffix: "%",
  },
  {
    key: "academicStanding",
    label: "Academic Standing",
    description: "Your current GPA standing",
    icon: GraduationCap,
    suffix: "%",
  },
  {
    key: "gamificationLevel",
    label: "Gamification Level",
    description: "Progress to next level",
    icon: Sparkles,
    suffix: "%",
  },
  {
    key: "currentStreak",
    label: "Current Streak",
    description: "Consecutive days of learning",
    icon: Flame,
    suffix: "",
  },
];

export default function StudentPortal({ user, onLogout, setAuthUser }) {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actingQuest, setActingQuest] = useState(null);

  const refreshDashboard = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await api.getStudentDashboard();
      setDashboard(data);
      setAuthUser(data.user);
      setError(null);
    } catch (err) {
      console.error("Failed to load student dashboard", err);
      setError(err?.message || "Unable to load dashboard");
    } finally {
      setLoading(false);
    }
  }, [setAuthUser, user]);

  useEffect(() => {
    refreshDashboard();
  }, [refreshDashboard]);

  const profile = useMemo(
    () => dashboard?.user || user,
    [dashboard?.user, user]
  );
  const metrics = dashboard?.metrics || {};
  const quests = dashboard?.dailyQuests || [];
  const leaderboard = dashboard?.leaderboard || [];
  const courses = dashboard?.activeCourses || [];

  const handleCompleteQuest = async (quest) => {
    if (!quest || quest.completed) return;
    try {
      setActingQuest(quest.id);
      await api.completeQuest(quest.id);
      await refreshDashboard();
    } catch (err) {
      console.error("Failed to complete quest", err);
    } finally {
      setActingQuest(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex text-slate-900">
      <aside className="hidden lg:flex w-64 flex-col border-r border-slate-200 bg-white/90 backdrop-blur">
        <div className="px-6 py-8 border-b border-slate-100">
          <div className="text-2xl font-semibold text-indigo-600">
            LearnOnline
          </div>
        </div>
        <nav className="flex-1 px-4 py-6 space-y-1">
          {sidebarLinks.map(({ id, label, icon: Icon, active }) => (
            <button
              key={id}
              type="button"
              className={`w-full flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition ${
                active
                  ? "bg-indigo-50 text-indigo-600"
                  : "text-slate-500 hover:bg-slate-100"
              }`}
            >
              <Icon className="w-5 h-5" />
              <span>{label}</span>
            </button>
          ))}
        </nav>
        <div className="px-6 py-6 border-t border-slate-100 text-sm text-slate-500">
          <p className="font-medium text-slate-700">Support</p>
          <p className="mt-1">Need help? Reach out to your mentor anytime.</p>
        </div>
      </aside>

      <main className="flex-1">
        <header className="bg-white border-b border-slate-200">
          <div className="max-w-6xl mx-auto px-6 py-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="search"
                  placeholder="Search courses, research, or quests"
                  className="w-72 rounded-full border border-slate-200 bg-slate-50 pl-10 pr-4 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                />
              </div>
              <button
                type="button"
                className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-500 hover:text-indigo-600"
                aria-label="Notifications"
              >
                <Bell className="w-5 h-5" />
                <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-rose-500" />
              </button>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-sm text-slate-500">Welcome back</p>
                <p className="font-semibold text-slate-900">{profile?.name}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-semibold">
                {profile?.name?.slice(0, 1)?.toUpperCase() || "A"}
              </div>
              <button
                type="button"
                onClick={onLogout}
                className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
              >
                Sign out
              </button>
            </div>
          </div>
        </header>

        <div className="max-w-6xl mx-auto px-6 py-10 space-y-10">
          {error ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-600">
              {error}
            </div>
          ) : null}

          <section className="bg-gradient-to-r from-lime-100 via-indigo-50 to-cyan-100 rounded-3xl px-8 py-10 shadow-sm border border-slate-100">
            <p className="text-sm uppercase tracking-wide text-indigo-500 font-semibold">
              Dashboard
            </p>
            <h1 className="mt-2 text-3xl font-bold text-slate-900">
              Welcome back, {profile?.name?.split(" ")[0] || "Learner"}!
            </h1>
            <p className="mt-2 text-slate-600 max-w-xl">
              Keep up the great work! Every step counts towards your success.
            </p>
          </section>

          <section className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
            {metricConfig.map(
              ({ key, label, description, icon: Icon, suffix }) => (
                <div
                  key={key}
                  className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 flex flex-col gap-3"
                >
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-500">
                    <Icon className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-500 uppercase tracking-wide">
                      {label}
                    </p>
                    <p className="mt-2 text-3xl font-bold text-slate-900">
                      {metrics[key] !== undefined
                        ? `${metrics[key]}${suffix}`
                        : "-"}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">{description}</p>
                  </div>
                </div>
              )
            )}
          </section>

          <section className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 xl:col-span-2">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">
                    Daily Quests
                  </h2>
                  <p className="text-sm text-slate-500">
                    Complete tasks and earn rewards today.
                  </p>
                </div>
                <button
                  type="button"
                  className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-600 hover:text-indigo-700"
                >
                  View All
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
              <div className="mt-6 space-y-4">
                {loading && quests.length === 0
                  ? Array.from({ length: 3 }).map((_, index) => (
                      <div
                        key={index}
                        className="animate-pulse rounded-2xl border border-slate-100 bg-slate-50/60 p-6"
                      >
                        <div className="h-4 w-1/3 rounded bg-slate-200" />
                        <div className="mt-3 h-3 w-1/2 rounded bg-slate-200" />
                      </div>
                    ))
                  : quests.map((quest) => (
                      <div
                        key={quest.id}
                        className={`flex flex-col gap-4 rounded-2xl border p-6 transition md:flex-row md:items-center md:justify-between ${
                          quest.completed
                            ? "border-emerald-100 bg-emerald-50"
                            : "border-slate-100 bg-white shadow-sm"
                        }`}
                      >
                        <div className="flex items-start gap-4">
                          <div
                            className={`mt-1 flex h-10 w-10 items-center justify-center rounded-full ${
                              quest.completed
                                ? "bg-emerald-100 text-emerald-600"
                                : "bg-indigo-50 text-indigo-500"
                            }`}
                          >
                            <CheckCircle2 className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="text-base font-semibold text-slate-900">
                              {quest.title}
                            </p>
                            <p className="mt-1 text-sm text-slate-500">
                              {quest.description}
                            </p>
                            <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
                              <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-3 py-1 font-medium text-indigo-600">
                                <Target className="w-4 h-4" />
                                {quest.xp} XP
                              </span>
                              {quest.completed ? (
                                <span className="text-emerald-600 font-medium">
                                  Completed
                                </span>
                              ) : null}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => handleCompleteQuest(quest)}
                            disabled={
                              quest.completed || actingQuest === quest.id
                            }
                            className={`inline-flex items-center justify-center rounded-full px-5 py-2 text-sm font-semibold transition ${
                              quest.completed
                                ? "bg-emerald-100 text-emerald-600"
                                : "bg-indigo-600 text-white hover:bg-indigo-500 disabled:bg-indigo-300"
                            }`}
                          >
                            {quest.completed
                              ? "Completed"
                              : actingQuest === quest.id
                              ? "Updating..."
                              : "Start Quest"}
                          </button>
                        </div>
                      </div>
                    ))}
              </div>
            </div>

            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-slate-900">
                  Leaderboard
                </h2>
                <button
                  type="button"
                  className="text-sm font-semibold text-slate-500 hover:text-slate-700 flex items-center gap-1"
                >
                  All Time
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
              <div className="mt-6 space-y-4">
                {loading && leaderboard.length === 0
                  ? Array.from({ length: 5 }).map((_, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-slate-100" />
                          <div>
                            <div className="h-3 w-24 rounded bg-slate-200 animate-pulse" />
                            <div className="mt-1 h-3 w-16 rounded bg-slate-200 animate-pulse" />
                          </div>
                        </div>
                        <div className="h-3 w-10 rounded bg-slate-200 animate-pulse" />
                      </div>
                    ))
                  : leaderboard.map((entry, index) => (
                      <div
                        key={entry.id ?? entry.name}
                        className="flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-sm font-semibold text-slate-600">
                            {index + 1}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900">
                              {entry.name}
                            </p>
                            <p className="text-xs text-slate-500">
                              {entry.coins} XP • {entry.streak} day streak
                            </p>
                          </div>
                        </div>
                        <span className="text-sm font-semibold text-indigo-600">
                          {entry.completedQuests} quests
                        </span>
                      </div>
                    ))}
              </div>
            </div>
          </section>

          <section className="bg-white rounded-3xl border border-slate-100 shadow-sm">
            <div className="border-b border-slate-100 flex items-center gap-2 px-6">
              {[
                { key: "courses", label: "My Courses" },
                { key: "assignments", label: "Assignments Due" },
                { key: "notifications", label: "Notifications" },
              ].map(({ key, label }, index) => (
                <button
                  key={key}
                  type="button"
                  className={`relative px-4 py-4 text-sm font-semibold transition ${
                    index === 0
                      ? "text-indigo-600"
                      : "text-slate-400 hover:text-indigo-500"
                  }`}
                >
                  {label}
                  {index === 0 ? (
                    <span className="absolute inset-x-4 bottom-0 h-1 rounded-full bg-indigo-500" />
                  ) : null}
                </button>
              ))}
            </div>
            <div className="px-6 py-6 space-y-4">
              {courses.length === 0 && !loading ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-8 text-center text-slate-500">
                  No active courses yet. Enroll in a course to see your progress
                  here.
                </div>
              ) : null}

              {courses.map((course) => (
                <div
                  key={course.courseId}
                  className="rounded-2xl border border-slate-100 bg-white px-6 py-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between"
                >
                  <div>
                    <p className="text-lg font-semibold text-slate-900">
                      {course.title}
                    </p>
                    <p className="text-sm text-slate-500">
                      Instructor: {course.instructor || "TBA"}
                    </p>
                    {course.dueNext ? (
                      <p className="mt-2 text-xs text-slate-500">
                        Next up:{" "}
                        <span className="font-medium text-slate-700">
                          {course.dueNext}
                        </span>
                      </p>
                    ) : null}
                  </div>
                  <div className="flex w-full md:w-72 flex-col gap-3">
                    <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-indigo-600"
                        style={{
                          width: `${Math.min(course.progress ?? 0, 100)}%`,
                        }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-sm text-slate-500">
                      <span>{course.progress ?? 0}% completed</span>
                      <button
                        type="button"
                        className="inline-flex items-center gap-2 text-indigo-600 font-semibold"
                      >
                        Continue
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
