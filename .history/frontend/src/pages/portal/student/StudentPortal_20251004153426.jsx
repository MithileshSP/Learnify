import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  LayoutDashboard,
  ListChecks,
  Newspaper,
  GraduationCap,
  UserCircle,
  Bell,
  BookOpen,
  Sparkles,
  Flame,
  Target,
  Bot,
  AlertTriangle,
  Clock,
  X,
} from "lucide-react";
import { api } from "../../../api.js";
import StudentSidebar from "../../../../components/student/StudentSidebar.jsx";
import StudentHeader from "../../../../components/student/StudentHeader.jsx";
import DashboardView from "../../../../components/student/views/DashboardView.jsx";
import QuestsView from "../../../../components/student/views/QuestsView.jsx";
import ResearchFeedView from "../../../../components/student/views/ResearchFeedView.jsx";
import GradesView from "../../../../components/student/views/GradesView.jsx";
import ProfileView from "../../../../components/student/views/ProfileView.jsx";
import AIAdvisorView from "../../../../components/student/views/AIAdvisorView.jsx";
import NotificationsModal from "../../../../components/student/views/NotificationsModal.jsx";

const sidebarLinks = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "quests", label: "Quests", icon: ListChecks },
  { id: "research", label: "Research Feed", icon: Newspaper },
  { id: "grades", label: "Grades", icon: GraduationCap },
  { id: "advisor", label: "AI Advisor", icon: Bot },
  { id: "profile", label: "Profile", icon: UserCircle },
];

// Shared metric configuration (consumed by DashboardView)
export const metricConfig = [
  { key: "courseProgress", label: "Course Progress", description: "Avg. completion across all courses", icon: BookOpen, suffix: "%" },
  { key: "academicStanding", label: "Academic Standing", description: "Your current GPA standing", icon: GraduationCap, suffix: "%" },
  { key: "gamificationLevel", label: "Gamification Level", description: "Progress to next level", icon: Sparkles, suffix: "%" },
  { key: "currentStreak", label: "Current Streak", description: "Consecutive days of learning", icon: Flame, suffix: "" },
];

const fallbackResearchFeed = [
  {
    id: "ai-sustainable-agriculture",
    title: "Breakthrough in AI-driven sustainable agriculture",
    summary:
      "Our team published a paper on using neural networks to optimize crop rotation for improved yield and reduced environmental impact.",
    category: "Collaboration",
    tags: ["AI", "Sustainability", "AgriTech"],
    author: {
      name: "Dr. Evelyn Reed",
      role: "Lead Researcher · AI Sustainability Lab",
    },
    timestamp: "2 hours ago",
    image:
      "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1200&q=80",
    stats: {
      likes: 25,
      comments: 18,
      collaborations: 3,
    },
    isCollaboration: true,
  },
  {
    id: "quantum-coherence",
    title: "Need insight on quantum coherence times",
    summary:
      "We're optimizing qubit coherence times under noisy conditions and looking for collaborators who can share resources or simulation tooling.",
    category: "Collaboration",
    tags: ["Quantum", "Physics", "Research"],
    author: {
      name: "Maria Sanchez",
      role: "PhD Candidate · Quantum Computing",
    },
    timestamp: "Yesterday",
    stats: {
      likes: 18,
      comments: 9,
      collaborations: 5,
    },
    isCollaboration: true,
  },
  {
    id: "neuro-drug-discovery",
    title: "Validating a new compound for neurological disorders",
    summary:
      "Preliminary results from our clinical validation look promising. Preparing for peer review and open to feedback before submission.",
    category: "My Research",
    tags: ["Neuroscience", "Drug Discovery", "Biotech"],
    author: {
      name: "Sarah Williams",
      role: "Research Fellow · NeuroLab",
    },
    timestamp: "3 days ago",
    image:
      "https://images.unsplash.com/photo-1559750981-10ef0c45f05b?auto=format&fit=crop&w=1200&q=80",
    stats: {
      likes: 42,
      comments: 12,
      collaborations: 6,
    },
    isMine: true,
    trending: true,
  },
];

const researchFilterOptions = [
  { id: "all", label: "All Posts" },
  { id: "collaboration", label: "Collaboration" },
  { id: "mine", label: "My Research" },
  { id: "trending", label: "Trending" },
];

const researchSortOptions = [
  { id: "recent", label: "Most Recent" },
  { id: "popular", label: "Most Popular" },
];

const researchAvatarPalette = [
  "bg-indigo-500",
  "bg-emerald-500",
  "bg-rose-500",
  "bg-amber-500",
  "bg-slate-500",
];

const researchComposerCategories = [
  { id: "collaboration", label: "Collaboration" },
  { id: "myResearch", label: "My Research" },
];

function getInitials(name = "Researcher") {
  return (
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "R"
  );
}

function getAvatarColor(name = "") {
  if (!name) {
    return researchAvatarPalette[0];
  }
  const total = name
    .split("")
    .reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const index = total % researchAvatarPalette.length;
  return researchAvatarPalette[index];
}

export const notificationPriorityConfig = {
  quest: { icon: Target, classes: "bg-indigo-50 text-indigo-600" },
  course: { icon: BookOpen, classes: "bg-amber-50 text-amber-600" },
  focus: { icon: AlertTriangle, classes: "bg-rose-50 text-rose-500" },
  celebration: { icon: Sparkles, classes: "bg-emerald-50 text-emerald-600" },
  info: { icon: Bell, classes: "bg-slate-100 text-slate-500" },
};

      {notificationsOpen ? (
        <NotificationsModal
          notifications={notifications}
          actionableCount={notificationCount}
          loading={loading}
          onClose={() => setNotificationsOpen(false)}
          onGoToAdvisor={() => {
            setActiveSection("advisor");
            setNotificationsOpen(false);
          }}
        />
      ) : null}
      const data = await api.getStudentDashboard();
      setDashboard(data);
      setAuthUser(data.user);
// All view / helper components have been extracted to components/student/views/*
          <div className="flex flex-wrap gap-3">
            {["🏆", "🚀", "📚", "🌟"].map((badge) => (
              <span
                key={badge}
                className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-2xl"
              >
                {badge}
              </span>
            ))}
          </div>
          <p className="text-sm text-slate-500">
            Badges unlock as you complete milestones, maintain streaks, and help
            your peers.
          </p>
        </div>
      </div>
    </section>
  );
}

function NotificationsPanel({
  notifications,
  loading,
  initialLoad,
  actionableCount,
}) {
  const showSkeletons = initialLoad || (loading && notifications.length === 0);

  return (
    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-indigo-50 text-indigo-500">
            <Bell className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-slate-900">
              Notifications
            </h2>
            <p className="text-sm text-slate-500">
              {actionableCount
                ? `${actionableCount} active alert${
                    actionableCount > 1 ? "s" : ""
                  }`
                : "You're all caught up"}
            </p>
          </div>
        </div>
        <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-600">
          {actionableCount ? "Today" : ""}
        </span>
      </div>

      <div className="space-y-4">
        {showSkeletons
          ? Array.from({ length: 3 }).map((_, index) => (
              <div
                key={`notification-skeleton-${index}`}
                className="animate-pulse rounded-2xl border border-slate-100 bg-slate-50/60 px-4 py-4"
              >
                <div className="h-4 w-32 rounded bg-slate-200" />
                <div className="mt-2 h-3 w-48 rounded bg-slate-200" />
              </div>
            ))
          : notifications.map((item) => {
              const config =
                notificationPriorityConfig[item.priority] ||
                notificationPriorityConfig.info;
              const Icon = config.icon;
              return (
                <div
                  key={item.id}
                  className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50/70 px-4 py-4"
                >
                  <div
                    className={`mt-1 flex h-9 w-9 items-center justify-center rounded-full ${config.classes}`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-slate-900">
                        {item.title}
                      </p>
                      {item.timestamp ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                          <Clock className="h-3 w-3" />
                          {item.timestamp}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-sm text-slate-600">{item.body}</p>
                  </div>
                </div>
              );
            })}
      </div>

      {!showSkeletons ? (
        <div className="rounded-2xl border border-indigo-100 bg-indigo-50/80 px-4 py-3 text-xs font-medium text-indigo-700">
          Tip: Tap the AI Advisor to turn alerts into an actionable study plan.
        </div>
      ) : null}
    </div>
  );
}

function NotificationsModal({
  notifications,
  actionableCount,
  loading,
  onClose,
  onGoToAdvisor,
}) {
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  const handleOverlayClick = (event) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  const hasNotifications = actionableCount > 0;
  const itemsToRender = hasNotifications
    ? notifications.filter((item) => item.id !== "no-updates")
    : notifications.filter((item) => item.id === "no-updates");
  const listToShow = itemsToRender.length ? itemsToRender : notifications;
  const showLoadingState = loading && !notifications.length;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 px-4"
      onClick={handleOverlayClick}
    >
      <div className="relative w-full max-w-xl overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Notifications
            </h2>
            <p className="text-sm text-slate-500">
              {hasNotifications
                ? `${actionableCount} active update${
                    actionableCount > 1 ? "s" : ""
                  }`
                : "You're all caught up"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-400 transition hover:text-slate-600"
            aria-label="Close notifications"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto px-6 py-5">
          {showLoadingState ? (
            <div className="flex items-center justify-center rounded-2xl border border-slate-100 bg-slate-50 px-4 py-8 text-sm font-medium text-slate-500">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Fetching the
              latest alerts…
            </div>
          ) : (
            <div className="space-y-4">
              {listToShow.map((item) => {
                const config =
                  notificationPriorityConfig[item.priority] ||
                  notificationPriorityConfig.info;
                const Icon = config.icon;
                return (
                  <div
                    key={item.id}
                    className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-4"
                  >
                    <div
                      className={`mt-1 flex h-10 w-10 items-center justify-center rounded-full text-sm ${config.classes}`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">
                            {item.title}
                          </p>
                          <p className="mt-1 text-sm text-slate-600">
                            {item.body}
                          </p>
                        </div>
                        {item.timestamp ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                            <Clock className="h-3 w-3" />
                            {item.timestamp}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-100 bg-slate-50 px-6 py-4">
          <button
            type="button"
            onClick={onGoToAdvisor}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-500"
          >
            <Bot className="h-4 w-4" />
            Ask the AI Advisor for a plan
          </button>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-800"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function AIAdvisorView({
  profile,
  metrics,
  courses,
  quests,
  notifications,
  insights,
  messages,
  onSend,
  loading,
  cooldownSeconds,
}) {
  const [inputValue, setInputValue] = useState("");
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const quickPrompts = useMemo(() => {
    const prompts = [];
    if (insights.length && insights[0]?.focusLabel) {
      prompts.push(`Help me make progress on ${insights[0].focusLabel}.`);
    }

    const lowestProgressCourse = [...courses]
      .sort((a, b) => (a.progress ?? 0) - (b.progress ?? 0))
      .find(Boolean);
    if (lowestProgressCourse) {
      prompts.push(
        `Create a study plan to raise ${lowestProgressCourse.title} from ${
          lowestProgressCourse.progress ?? 0
        }% progress.`
      );
    }

    const pendingQuest = quests.find((quest) => !quest.completed);
    if (pendingQuest) {
      prompts.push(
        `Guide me through completing the quest "${pendingQuest.title}" today.`
      );
    }

    if (!prompts.length) {
      prompts.push("Build a 3-day study plan based on my latest progress.");
    }

    return [...new Set(prompts)].slice(0, 3);
  }, [courses, insights, quests]);

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!inputValue.trim()) return;
    onSend(inputValue);
    setInputValue("");
  };

  const handleQuickPrompt = (prompt) => {
    onSend(prompt);
  };

  const name = profile?.name?.split(" ")[0] || "Learner";
  const streak = metrics.currentStreak ?? profile?.streak;

  return (
    <div className="space-y-8">
      <section className="grid gap-6 lg:grid-cols-[1.05fr,1.35fr]">
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-5">
            <div className="flex items-center gap-3">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-indigo-50 text-indigo-500">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-slate-900">
                  Personalised insights
                </h2>
                <p className="text-sm text-slate-500">
                  I'm monitoring your learning signals and recommending next
                  moves.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {insights.map((insight) => (
                <div
                  key={insight.id}
                  className="rounded-2xl border border-slate-100 bg-slate-50/80 px-4 py-4"
                >
                  <p className="text-sm font-semibold text-slate-900">
                    {insight.title}
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    {insight.description}
                  </p>
                  {insight.action ? (
                    <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-indigo-600">
                      Next move: {insight.action}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">
                Quick prompts
              </h3>
              <span className="text-xs font-semibold uppercase tracking-wide text-indigo-600">
                {streak ? `${streak}-day streak` : "Ready when you are"}
              </span>
            </div>
            <div className="flex flex-wrap gap-3">
              {quickPrompts.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => handleQuickPrompt(prompt)}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-indigo-300 hover:text-indigo-600"
                >
                  <MessageCircle className="h-4 w-4" />
                  {prompt}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() =>
                handleQuickPrompt(
                  "Design a weekly roadmap that keeps me on track for my current goals."
                )
              }
              className="w-full rounded-2xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500"
            >
              Generate a personalised path
            </button>
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm flex flex-col">
          <div className="border-b border-slate-100 px-6 py-5 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">
                AI Advisor
              </h2>
              <p className="text-sm text-slate-500">
                Ask me anything, {name}. I’ll tailor every answer to your data.
              </p>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-600">
              <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              Online
            </div>
          </div>

          <div className="flex-1 overflow-hidden">
            <div className="h-full overflow-y-auto px-6 py-6 space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${
                    message.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[75%] whitespace-pre-wrap rounded-3xl px-4 py-3 text-sm leading-relaxed shadow-sm ${
                      message.role === "user"
                        ? "bg-indigo-600 text-white"
                        : "bg-slate-50 text-slate-700"
                    }`}
                  >
                    {message.content}
                  </div>
                </div>
              ))}

              {loading ? (
                <div className="flex justify-start">
                  <div className="inline-flex items-center gap-2 rounded-3xl bg-slate-50 px-4 py-2 text-sm text-slate-500">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Analysing your data…
                  </div>
                </div>
              ) : null}

              <div ref={chatEndRef} />
            </div>
          </div>

          <form
            onSubmit={handleSubmit}
            className="border-t border-slate-100 px-6 py-4"
          >
            <div className="flex items-end gap-3 rounded-3xl border border-slate-200 bg-white px-4 py-3 focus-within:border-indigo-300 focus-within:ring-2 focus-within:ring-indigo-100">
              <textarea
                value={inputValue}
                onChange={(event) => setInputValue(event.target.value)}
                placeholder="Ask for guidance, revision tips, or a personalised plan…"
                rows={2}
                className="min-h-[48px] flex-1 resize-none border-none bg-transparent text-sm text-slate-700 focus:outline-none"
              />
              <button
                type="submit"
                disabled={
                  !inputValue.trim() || loading || (cooldownSeconds ?? 0) > 0
                }
                className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-indigo-600 text-white transition hover:bg-indigo-500 disabled:bg-slate-300"
              >
                <Send className="h-5 w-5" />
              </button>
            </div>
            {cooldownSeconds > 0 ? (
              <p className="mt-2 text-xs text-slate-500">
                Rate limit cooldown: try again in {cooldownSeconds}s
              </p>
            ) : null}
          </form>
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">
            Live metrics snapshot
          </h3>
          <ul className="mt-4 space-y-2 text-sm text-slate-600">
            <li>• Course progress: {metrics.courseProgress ?? "—"}%</li>
            <li>• Academic standing: {metrics.academicStanding ?? "—"}%</li>
            <li>• Gamification level: {metrics.gamificationLevel ?? "—"}%</li>
            <li>
              • Current streak: {metrics.currentStreak ?? profile?.streak ?? 0}{" "}
              day(s)
            </li>
          </ul>
        </div>
        <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">
            Recent alerts
          </h3>
          <ul className="mt-4 space-y-3 text-sm text-slate-600">
            {notifications.length ? (
              notifications.slice(0, 3).map((note) => (
                <li key={note.id} className="rounded-2xl bg-slate-50 px-3 py-3">
                  <p className="font-semibold text-slate-800">{note.title}</p>
                  <p className="text-xs text-slate-500">{note.body}</p>
                </li>
              ))
            ) : (
              <li className="rounded-2xl bg-slate-50 px-3 py-3 text-xs text-slate-500">
                No new alerts. Keep exploring your courses!
              </li>
            )}
          </ul>
        </div>
      </section>
    </div>
  );
}

function QuestCard({ quest, onQuestAction, disabled, acting }) {
  return (
    <div
      className={`flex flex-col gap-4 rounded-3xl border p-6 transition md:flex-row md:items-center md:justify-between ${
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
          <p className="mt-1 text-sm text-slate-500">{quest.description}</p>
          <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
            <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-3 py-1 font-medium text-indigo-600">
              <Target className="w-4 h-4" />
              {quest.xp} XP
            </span>
            {quest.completed ? (
              <span className="text-emerald-600 font-medium">Completed</span>
            ) : null}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => onQuestAction(quest)}
          disabled={disabled}
          className={`inline-flex items-center justify-center rounded-full px-5 py-2 text-sm font-semibold transition ${
            quest.completed
              ? "bg-emerald-100 text-emerald-600"
              : "bg-indigo-600 text-white hover:bg-indigo-500 disabled:bg-indigo-300"
          }`}
        >
          {quest.completed
            ? "Completed"
            : acting
            ? "Updating..."
            : "Start Quest"}
        </button>
      </div>
    </div>
  );
}

function CourseProgressCard({ course }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white px-6 py-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div>
        <p className="text-lg font-semibold text-slate-900">{course.title}</p>
        <p className="text-sm text-slate-500">
          Instructor: {course.instructor || "TBA"}
        </p>
        {course.dueNext ? (
          <p className="mt-2 text-xs text-slate-500">
            Next up:{" "}
            <span className="font-medium text-slate-700">{course.dueNext}</span>
          </p>
        ) : null}
      </div>
      <div className="flex w-full md:w-72 flex-col gap-3">
        <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-indigo-600"
            style={{ width: `${Math.min(course.progress ?? 0, 100)}%` }}
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
  );
}

function LeaderboardSkeleton() {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 rounded-full bg-slate-100" />
        <div>
          <div className="h-3 w-24 rounded bg-slate-200 animate-pulse" />
          <div className="mt-1 h-3 w-16 rounded bg-slate-200 animate-pulse" />
        </div>
      </div>
      <div className="h-3 w-10 rounded bg-slate-200 animate-pulse" />
    </div>
  );
}
