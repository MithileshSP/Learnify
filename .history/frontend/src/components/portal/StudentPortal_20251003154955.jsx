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
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
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
  const [activeSection, setActiveSection] = useState("dashboard");

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
        <div className="max-w-6xl mx-auto px-6 py-10 space-y-10">
          {error ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-600">
              {error}
            </div>
          ) : null}

          {activeSection === "dashboard" && (
            <DashboardView
              profile={profile}
              metrics={metrics}
              quests={quests}
              leaderboard={leaderboard}
              courses={courses}
              loading={loading}
              actingQuest={actingQuest}
              onQuestAction={handleCompleteQuest}
            />
          )}

          {activeSection === "quests" && (
            <QuestsView
              quests={quests}
              loading={loading}
              actingQuest={actingQuest}
              onQuestAction={handleCompleteQuest}
            />
          )}

          {activeSection === "research" && (
            <ResearchFeedView profile={profile} />
          )}

          {activeSection === "grades" && (
            <GradesView courses={courses} loading={loading} />
          )}

          {activeSection === "profile" && (
            <ProfileView profile={profile} metrics={metrics} onLogout={onLogout} />
          )}
        </div>
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
