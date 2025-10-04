import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  Bot,
  MessageCircle,
  Send,
  Loader2,
  AlertTriangle,
  Clock,
  X,
  Image,
  Link2,
  ThumbsUp,
  Users,
  Share2,
  UserPlus,
  ChevronDown,
  MoreHorizontal,
} from "lucide-react";
import { api } from "../../../api.js";

const sidebarLinks = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "quests", label: "Quests", icon: ListChecks },
  { id: "research", label: "Research Feed", icon: Newspaper },
  { id: "grades", label: "Grades", icon: GraduationCap },
  { id: "advisor", label: "AI Advisor", icon: Bot },
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

const notificationPriorityConfig = {
  quest: { icon: Target, classes: "bg-indigo-50 text-indigo-600" },
  course: { icon: BookOpen, classes: "bg-amber-50 text-amber-600" },
  focus: { icon: AlertTriangle, classes: "bg-rose-50 text-rose-500" },
  celebration: { icon: Sparkles, classes: "bg-emerald-50 text-emerald-600" },
  info: { icon: Bell, classes: "bg-slate-100 text-slate-500" },
};

export default function StudentPortal({ user, onLogout, setAuthUser }) {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actingQuest, setActingQuest] = useState(null);
  const [activeSection, setActiveSection] = useState("dashboard");
  const [creatingResearchPost, setCreatingResearchPost] = useState(false);

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

  const handleCreateResearchPost = useCallback(async (payload) => {
    if (!payload) return null;
    setCreatingResearchPost(true);
    try {
      const result = await api.createResearchPost(payload);
      setDashboard((prev) => {
        if (!prev) {
          return prev;
        }
        const existingFeed = Array.isArray(prev.researchFeed)
          ? prev.researchFeed
          : [];
        return {
          ...prev,
          researchFeed: [result, ...existingFeed],
        };
      });
      return result;
    } finally {
      setCreatingResearchPost(false);
    }
  }, []);

  useEffect(() => {
    refreshDashboard();
  }, [refreshDashboard]);

  const profile = useMemo(
    () => dashboard?.user || user,
    [dashboard?.user, user]
  );

  const metrics = useMemo(() => dashboard?.metrics || {}, [dashboard?.metrics]);
  const quests = useMemo(() => dashboard?.dailyQuests || [], [dashboard?.dailyQuests]);
  const leaderboard = useMemo(() => dashboard?.leaderboard || [], [dashboard?.leaderboard]);
  const courses = useMemo(() => dashboard?.activeCourses || [], [dashboard?.activeCourses]);

  const researchFeed = useMemo(() => {
    if (dashboard?.researchFeed?.length) {
      return dashboard.researchFeed;
    }
    return fallbackResearchFeed;
  }, [dashboard?.researchFeed]);

  const grades = useMemo(() => {
    if (dashboard?.grades?.length) {
      return dashboard.grades;
    }
    if (!courses?.length) {
      return [];
    }
    return courses.map((course) => ({
      courseId: course.courseId,
      title: course.title,
      credits: course.credits ?? 3,
      progress: course.progress ?? 0,
      grade:
        course.grade ||
        (course.progress >= 90
          ? "A"
          : course.progress >= 80
          ? "B"
          : course.progress >= 70
          ? "C"
          : "In Progress"),
      instructor: course.instructor,
    }));
  }, [courses, dashboard?.grades]);

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

  const notifications = useMemo(() => {
    if (loading && !dashboard) {
      return [];
    }

    const items = [];

    if (Array.isArray(dashboard?.notifications)) {
      dashboard.notifications.forEach((item, index) => {
        items.push({
          id: item.id ?? `api-${index}`,
          title: item.title || item.heading || "Update",
          body:
            item.description ||
            item.message ||
            item.body ||
            "New activity detected in your learning portal.",
          timestamp: item.time || item.timestamp || "Just now",
          priority: item.priority || item.type || "info",
        });
      });
    }

    const pendingQuest = quests.find((quest) => !quest.completed);
    if (pendingQuest) {
      items.push({
        id: `quest-${pendingQuest.id}`,
        title: "Daily quest still open",
        body: `${pendingQuest.title} is worth ${pendingQuest.xp} XP. Complete it to keep your streak going!`,
        timestamp: "Today",
        priority: "quest",
      });
    }

    const upcomingCourse = courses.find((course) => !!course.dueNext);
    if (upcomingCourse) {
      items.push({
        id: `course-${upcomingCourse.courseId}`,
        title: "Upcoming course milestone",
        body: `${upcomingCourse.title} has ${upcomingCourse.dueNext}. Prep a focused session today.`,
        timestamp: "This week",
        priority: "course",
      });
    }

    const lowestProgressCourse = [...courses]
      .sort((a, b) => (a.progress ?? 0) - (b.progress ?? 0))
      .find((course) => (course.progress ?? 0) < 60);
    if (lowestProgressCourse) {
      items.push({
        id: `progress-${lowestProgressCourse.courseId}`,
        title: "Focus course recommended",
        body: `${lowestProgressCourse.title} is at ${
          lowestProgressCourse.progress ?? 0
        }% progress. Schedule a revision block to boost it above 70%.`,
        timestamp: "Action needed",
        priority: "focus",
      });
    }

    const streak = metrics.currentStreak ?? profile?.streak;
    if (streak && streak > 0) {
      items.push({
        id: "streak",
        title: "Streak tracker",
        body: `You're on a ${streak}-day streak. A quick recap session today will keep it alive!`,
        timestamp: "Daily",
        priority: "celebration",
      });
    }

    if (!items.length) {
      items.push({
        id: "no-updates",
        title: "You're all caught up",
        body: "No new alerts for now. Check back later or ask the AI Advisor for a study plan.",
        timestamp: "",
        priority: "info",
      });
    }

    return items.slice(0, 7);
  }, [courses, loading, metrics.currentStreak, profile?.streak, quests, dashboard]);

  const actionableNotifications = useMemo(
    () => notifications.filter((note) => note.id !== "no-updates"),
    [notifications]
  );
  const notificationCount = actionableNotifications.length;
  const isInitialLoad = loading && !dashboard;

  const [advisorMessages, setAdvisorMessages] = useState(() => [
    {
      id: "assistant-welcome",
      role: "assistant",
      content:
        "Hi! I'm your AI learning coach. Once your dashboard loads, I'll summarize your progress and help plan your next steps.",
    },
  ]);
  const [advisorLoading, setAdvisorLoading] = useState(false);
  const [advisorCooldown, setAdvisorCooldown] = useState(0);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const advisorInsights = useMemo(() => {
    const insights = [];

    const focusCourse = [...courses]
      .sort((a, b) => (a.progress ?? 0) - (b.progress ?? 0))
      .find((course) => (course.progress ?? 0) < 85);
    if (focusCourse) {
      insights.push({
        id: `focus-${focusCourse.courseId}`,
        title: `Boost ${focusCourse.title}`,
        description: `Progress is at ${focusCourse.progress ?? 0}%${
          focusCourse.dueNext ? ` with ${focusCourse.dueNext}` : ""
        }. A targeted review session will raise your overall standing.`,
        action:
          "Schedule a 45-minute deep work block and summarize what you learn.",
        focusLabel: focusCourse.title,
      });
    }

    const pendingQuests = quests.filter((quest) => !quest.completed);
    if (pendingQuests.length) {
      insights.push({
        id: "quests",
        title: "Capitalize on open quests",
        description: `${pendingQuests.length} quest${
          pendingQuests.length > 1 ? "s" : ""
        } remain. Completing them adds ${pendingQuests
          .map((quest) => quest.xp ?? 0)
          .reduce((total, xp) => total + xp, 0)} XP and boosts your streak.`,
        action: `Start with "${pendingQuests[0].title}" for a quick win.`,
        focusLabel: pendingQuests[0].title,
      });
    }

    if (
      metrics.academicStanding !== undefined &&
      metrics.academicStanding < 75
    ) {
      insights.push({
        id: "academic",
        title: "Raise academic standing",
        description: `Your academic standing is ${metrics.academicStanding}%. Consistent study blocks and spaced review can lift this above 80%.`,
        action:
          "Plan 3 focused sessions this week with recap notes after each.",
      });
    }

    const focusNotification = notifications.find((note) =>
      ["focus", "course"].includes(note.priority)
    );
    if (focusNotification) {
      insights.push({
        id: "notification",
        title: focusNotification.title,
        description: focusNotification.body,
        action: "Address this alert first, then review your other courses.",
        focusLabel: focusNotification.title,
      });
    }

    if (!insights.length) {
      insights.push({
        id: "momentum",
        title: "Maintain your momentum",
        description:
          "You're on track. Keep reinforcing recent lessons and ask me for fresh challenges whenever you're ready.",
        action: "Request a new stretch goal or deeper practice plan.",
      });
    }

    return insights.slice(0, 4);
  }, [courses, metrics.academicStanding, notifications, quests]);

  const advisorGreeting = useMemo(() => {
    const name = profile?.name?.split(" ")[0] || "there";
    const progressStatement =
      metrics.courseProgress !== undefined
        ? `You're averaging ${metrics.courseProgress}% across courses.`
        : "I'll watch your course progress as it updates.";
    const streakValue = metrics.currentStreak ?? profile?.streak;
    const streakStatement = streakValue
      ? `Your learning streak is ${streakValue} day${
          streakValue === 1 ? "" : "s"
        }.`
      : "Let's build a daily learning streak together.";
    const topInsight = advisorInsights[0];
    const focusStatement = topInsight
      ? `First focus: ${topInsight.title}.`
      : "Ask me for a plan whenever you need one.";
    return `Hey ${name}! I'm tracking your study signals. ${progressStatement} ${streakStatement} ${focusStatement}`;
  }, [
    advisorInsights,
    metrics.courseProgress,
    metrics.currentStreak,
    profile?.name,
    profile?.streak,
  ]);

  useEffect(() => {
    setAdvisorMessages((prev) => {
      if (!prev.length) {
        return [
          {
            id: "assistant-welcome",
            role: "assistant",
            content: advisorGreeting,
          },
        ];
      }

      if (prev[0].role !== "assistant") {
        return [
          {
            id: "assistant-welcome",
            role: "assistant",
            content: advisorGreeting,
          },
          ...prev,
        ];
      }

      if (prev[0].content === advisorGreeting) {
        return prev;
      }

      const next = [...prev];
      next[0] = { ...next[0], content: advisorGreeting };
      return next;
    });
  }, [advisorGreeting]);

  const composeAdvisorPrompt = useCallback(
    (question, conversation) => {
      const name = profile?.name || "the student";

      const metricsSummary = [
        metrics.courseProgress !== undefined
          ? `Course progress: ${metrics.courseProgress}%`
          : null,
        metrics.academicStanding !== undefined
          ? `Academic standing: ${metrics.academicStanding}%`
          : null,
        metrics.gamificationLevel !== undefined
          ? `Gamification level: ${metrics.gamificationLevel}%`
          : null,
        (metrics.currentStreak ?? profile?.streak) !== undefined
          ? `Current streak: ${
              (metrics.currentStreak ?? profile?.streak) || 0
            } days`
          : null,
      ].filter(Boolean);

      const courseSummary = courses.length
        ? courses
            .map((course) => {
              const progress = course.progress ?? 0;
              const dueNext = course.dueNext || "no immediate deadline";
              return `${course.title} — ${progress}% complete, next: ${dueNext}`;
            })
            .join("\n- ")
        : "No active courses recorded.";

      const questSummary = quests.length
        ? quests
            .map(
              (quest) =>
                `${quest.title}: ${
                  quest.completed ? "completed" : "pending"
                } (${quest.xp} XP)`
            )
            .join("\n- ")
        : "No quests assigned.";

      const notificationSummary = notifications.length
        ? notifications
            .slice(0, 5)
            .map((note) => `${note.title}: ${note.body}`)
            .join("\n- ")
        : "No outstanding notifications.";

      const conversationHistory = conversation
        .slice(-6)
        .map(
          (entry) =>
            `${entry.role === "user" ? "Student" : "Coach"}: ${entry.content}`
        )
        .join("\n");

      return [
        `You are an AI learning coach guiding a university student named ${name}. Be proactive, motivational, and specific. Provide step-by-step guidance and reference the student's current data.`,
        `Student metrics:\n- ${
          metricsSummary.length
            ? metricsSummary.join("\n- ")
            : "No metrics available."
        }`,
        `Courses:\n- ${courseSummary}`,
        `Quests:\n- ${questSummary}`,
        `Notifications:\n- ${notificationSummary}`,
        conversationHistory
          ? `Conversation so far:\n${conversationHistory}`
          : "This is the first question in the conversation.",
        `The student asks: "${question}". Respond with an actionable plan, including prioritised steps, suggested study blocks, and motivational encouragement. End by inviting the student to follow up if they need more help.`,
      ].join("\n\n");
    },
    [courses, metrics, notifications, profile?.name, profile?.streak, quests]
  );

  const handleAdvisorSend = useCallback(
    async (messageText) => {
      const trimmed = messageText.trim();
      if (!trimmed || advisorLoading || advisorCooldown > 0) {
        return;
      }

      const userMessage = {
        id: `user-${Date.now()}`,
        role: "user",
        content: trimmed,
      };

      const conversation = [...advisorMessages, userMessage];

      setAdvisorMessages((prev) => {
        const next = [...prev, userMessage];
        return next.length > 20 ? next.slice(next.length - 20) : next;
      });

      setAdvisorLoading(true);

      try {
        const prompt = composeAdvisorPrompt(trimmed, conversation);
        const data = await api.aiChat(prompt);
        const responseText =
          typeof data === "string"
            ? data
            : data?.response ||
              data?.message ||
              "Here's a quick nudge: reflect on what you've covered and let me know what still feels unclear.";

        setAdvisorMessages((prev) => {
          const aiMessage = {
            id: `assistant-${Date.now()}`,
            role: "assistant",
            content: responseText.trim(),
          };
          const next = [...prev, aiMessage];
          return next.length > 20 ? next.slice(next.length - 20) : next;
        });
      } catch (err) {
        console.error("AI advisor error", err);
        const detailMessage =
          err?.payload?.error ||
          err?.payload?.message ||
          err?.message ||
          "I'm offline right now. Please try again in a moment.";

        // If rate-limited, start a cooldown timer so the UI blocks further sends
        if (err?.status === 429) {
          const retryAfter = Number(err?.payload?.retryAfterSeconds) || 30;
          setAdvisorCooldown(retryAfter);
        }
        setAdvisorMessages((prev) => {
          const aiMessage = {
            id: `assistant-error-${Date.now()}`,
            role: "assistant",
            content:
              err?.status === 429
                ? `We hit a short rate limit. Cooling down briefly before trying again. ${detailMessage}`
                : `I hit a snag analysing the data: ${detailMessage}`,
          };
          const next = [...prev, aiMessage];
          return next.length > 20 ? next.slice(next.length - 20) : next;
        });
      } finally {
        setAdvisorLoading(false);
      }
    },
    [advisorCooldown, advisorLoading, advisorMessages, composeAdvisorPrompt]
  );

  // Cooldown countdown tick
  useEffect(() => {
    if (advisorCooldown <= 0) return;
    const id = setInterval(() => {
      setAdvisorCooldown((s) => (s > 1 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(id);
  }, [advisorCooldown]);

  return (
  <div className="min-h-screen text-slate-900 flex flex-col">
      <aside className="hidden lg:flex fixed left-0 top-0 bottom-0 w-64 flex-col border-r border-slate-200 bg-white/90 backdrop-blur z-20">
        <div className="px-6 py-8 border-b border-slate-100">
          <div className="text-2xl font-semibold text-indigo-600">
            LearnOnline
          </div>
        </div>
        <nav className="flex-1 px-4 py-6 space-y-1">
          {sidebarLinks.map((link) => {
            const { id, label } = link;
            const Icon = link.icon;
            const active = activeSection === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setActiveSection(id)}
                className={`w-full flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition ${
                  active
                    ? "bg-indigo-50 text-indigo-600"
                    : "text-slate-500 hover:bg-slate-100"
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{label}</span>
              </button>
            );
          })}
        </nav>
        <div className="px-6 py-6 border-t border-slate-100 text-sm text-slate-500">
          <p className="font-medium text-slate-700">Support</p>
          <p className="mt-1">Need help? Reach out to your mentor anytime.</p>
        </div>
      </aside>

      <main className="flex-1 ml-0 lg:ml-64">
        <header className="fixed top-0 left-0 right-0 lg:left-64 bg-white border-b border-slate-200 z-10">
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
                onClick={() => setNotificationsOpen(true)}
                className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-500 hover:text-indigo-600"
                aria-label="Notifications"
              >
                <Bell className="w-5 h-5" />
                {notificationCount ? (
                  <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[10px] font-semibold text-white">
                    {notificationCount > 9 ? "9+" : notificationCount}
                  </span>
                ) : null}
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

  <div className="max-w-6xl mx-auto app-content app-content--fixed-header space-y-10">
          {error ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-600">
              {error}
            </div>
          ) : null}

          {activeSection === "dashboard" ? (
            <DashboardView
              profile={profile}
              metrics={metrics}
              quests={quests}
              leaderboard={leaderboard}
              courses={courses}
              loading={loading}
              actingQuest={actingQuest}
              onQuestAction={handleCompleteQuest}
              notifications={notifications}
              initialLoad={isInitialLoad}
              notificationCount={notificationCount}
            />
          ) : null}

          {activeSection === "quests" ? (
            <QuestsView
              quests={quests}
              loading={loading}
              actingQuest={actingQuest}
              onQuestAction={handleCompleteQuest}
            />
          ) : null}

          {activeSection === "research" ? (
            <ResearchFeedView
              feed={researchFeed}
              loading={loading}
              profile={profile}
              creatingPost={creatingResearchPost}
              onCreatePost={handleCreateResearchPost}
              canPost={Boolean(dashboard) && !loading}
            />
          ) : null}

          {activeSection === "grades" ? (
            <GradesView grades={grades} courses={courses} loading={loading} />
          ) : null}

          {activeSection === "advisor" ? (
            <AIAdvisorView
              profile={profile}
              metrics={metrics}
              courses={courses}
              quests={quests}
              notifications={notifications}
              insights={advisorInsights}
              messages={advisorMessages}
              onSend={handleAdvisorSend}
              loading={advisorLoading}
              cooldownSeconds={advisorCooldown}
            />
          ) : null}

          {activeSection === "profile" ? (
            <ProfileView
              profile={profile}
              metrics={metrics}
              onLogout={onLogout}
            />
          ) : null}
        </div>
      </main>

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
    </div>
  );
}

function DashboardView({
  profile,
  metrics,
  quests,
  leaderboard,
  courses,
  loading,
  actingQuest,
  onQuestAction,
  notifications,
  initialLoad,
  notificationCount,
}) {
  const visibleQuests = quests.slice(0, 3);
  const extraQuestCount = quests.length - visibleQuests.length;

  return (
    <div className="space-y-10">
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
  {metricConfig.map((m) => {
    const { key, label, description, suffix } = m;
    const Icon = m.icon;
    return (
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
            {metrics[key] !== undefined ? `${metrics[key]}${suffix}` : "-"}
          </p>
          <p className="mt-1 text-sm text-slate-500">{description}</p>
        </div>
      </div>
    );
  })}
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
            <span className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-600">
              {quests.length} total quests
              <ArrowRight className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-6 space-y-4">
            {loading && quests.length === 0
              ? Array.from({ length: 3 }).map((_, index) => (
                  <div
                    key={`quest-skeleton-${index}`}
                    className="animate-pulse rounded-2xl border border-slate-100 bg-slate-50/60 p-6"
                  >
                    <div className="h-4 w-1/3 rounded bg-slate-200" />
                    <div className="mt-3 h-3 w-1/2 rounded bg-slate-200" />
                  </div>
                ))
              : visibleQuests.map((quest) => (
                  <QuestCard
                    key={quest.id}
                    quest={quest}
                    disabled={quest.completed || actingQuest === quest.id}
                    onQuestAction={onQuestAction}
                    acting={actingQuest === quest.id}
                  />
                ))}

            {extraQuestCount > 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-4 text-sm text-slate-500">
                +{extraQuestCount} more quests available in the Quests tab.
              </div>
            ) : null}
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
                  <LeaderboardSkeleton key={`leader-skeleton-${index}`} />
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

      <section className="grid gap-6 lg:grid-cols-[2fr,1fr]">
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">
                My Courses
              </h2>
              <p className="text-sm text-slate-500">
                Monitor progress and jump back into your active learning paths.
              </p>
            </div>
            <button
              type="button"
              className="hidden rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-indigo-300 hover:text-indigo-600 lg:inline-flex"
            >
              View catalog
            </button>
          </div>
          <div className="px-6 py-6 space-y-4">
            {courses.length === 0 && !loading ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-8 text-center text-slate-500">
                No active courses yet. Enroll in a course to see your progress
                here.
              </div>
            ) : null}

            {courses.map((course) => (
              <CourseProgressCard key={course.courseId} course={course} />
            ))}
          </div>
        </div>

        <NotificationsPanel
          notifications={notifications}
          loading={loading}
          initialLoad={initialLoad}
          actionableCount={notificationCount}
        />
      </section>
    </div>
  );
}

function QuestsView({ quests, loading, actingQuest, onQuestAction }) {
  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">All Quests</h2>
          <p className="text-sm text-slate-500">
            Power up your learning streak by completing interactive challenges.
          </p>
        </div>
        <div className="rounded-full bg-indigo-50 px-4 py-2 text-sm font-medium text-indigo-600">
          {quests.filter((quest) => quest.completed).length} / {quests.length}{" "}
          completed
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {loading && quests.length === 0
          ? Array.from({ length: 4 }).map((_, index) => (
              <div
                key={`quest-skeleton-lg-${index}`}
                className="animate-pulse rounded-3xl border border-slate-100 bg-slate-50/60 p-6"
              >
                <div className="h-4 w-1/3 rounded bg-slate-200" />
                <div className="mt-3 h-3 w-1/2 rounded bg-slate-200" />
                <div className="mt-3 h-3 w-2/3 rounded bg-slate-200" />
              </div>
            ))
          : quests.map((quest) => (
              <QuestCard
                key={quest.id}
                quest={quest}
                disabled={quest.completed || actingQuest === quest.id}
                onQuestAction={onQuestAction}
                acting={actingQuest === quest.id}
              />
            ))}
      </div>
    </section>
  );
}

function ResearchFeedView({
  feed,
  loading,
  profile,
  creatingPost = false,
  onCreatePost,
  canPost = true,
}) {
  const [activeFilter, setActiveFilter] = useState("all");
  const [sortOption, setSortOption] = useState("recent");

  const normalizedFeed = useMemo(() => {
    if (!Array.isArray(feed)) {
      return [];
    }
    return feed.map((item, index) => {
      const stats = item?.stats ?? {};
      const extractTags = () => {
        if (Array.isArray(item?.tags)) {
          return item.tags;
        }
        if (typeof item?.tags === "string") {
          return item.tags
            .split(",")
            .map((tag) => tag.trim())
            .filter(Boolean);
        }
        if (Array.isArray(item?.keywords)) {
          return item.keywords;
        }
        return [];
      };

      const authorName =
        item?.author?.name ??
        item?.authorName ??
        item?.owner ??
        item?.createdBy ??
        "Researcher";
      const authorRole =
        item?.author?.role ??
        item?.author?.title ??
        item?.authorRole ??
        item?.role ??
        "";

      return {
        id: item?.id ?? `research-${index}`,
        order: index,
        title: item?.title ?? "Research update",
        summary:
          item?.summary ??
          item?.description ??
          item?.body ??
          "An exciting research update from our community.",
        category: item?.category ?? "Insight",
        authorName,
        authorRole,
        timestamp:
          item?.timestamp ??
          item?.date ??
          item?.publishedAt ??
          item?.createdAt ??
          "Recently",
        image: item?.image ?? item?.coverImage ?? item?.heroImage ?? null,
        link: item?.link ?? item?.url ?? item?.cta,
        tags: extractTags(),
        stats: {
          likes: stats.likes ?? item?.likes ?? 0,
          comments: stats.comments ?? item?.comments ?? 0,
          collaborations:
            stats.collaborations ??
            stats.collabs ??
            item?.collaborations ??
            item?.partners ??
            0,
        },
        isCollaboration:
          Boolean(item?.isCollaboration) ||
          (typeof item?.category === "string" &&
            item.category.toLowerCase() === "collaboration"),
        isMine: Boolean(item?.isMine),
        trending: Boolean(item?.trending),
      };
    });
  }, [feed]);

  const filteredFeed = useMemo(() => {
    return normalizedFeed.filter((item) => {
      switch (activeFilter) {
        case "collaboration":
          return item.isCollaboration;
        case "mine":
          return item.isMine;
        case "trending":
          return item.trending || item.stats.likes >= 20;
        default:
          return true;
      }
    });
  }, [normalizedFeed, activeFilter]);

  const displayedFeed = useMemo(() => {
    const items = [...filteredFeed];
    if (sortOption === "popular") {
      const popularityScore = (entry) =>
        (entry.stats.likes ?? 0) * 2 +
        (entry.stats.comments ?? 0) +
        (entry.stats.collaborations ?? 0) * 3;
      items.sort((a, b) => popularityScore(b) - popularityScore(a));
    } else {
      items.sort((a, b) => a.order - b.order);
    }
    return items;
  }, [filteredFeed, sortOption]);

  const showSkeletons = loading && !feed.length;
  const isEmpty = !loading && displayedFeed.length === 0;

  return (
    <section className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold text-slate-900">Research Feed</h2>
        <p className="text-sm text-slate-500">
          Stay ahead with curated research, campus innovation, and industry
          insights.
        </p>
      </div>

      <StartResearchPostCard
        profile={profile}
        onSubmit={onCreatePost}
        submitting={creatingPost}
        disabled={!canPost || !onCreatePost}
      />

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap gap-2">
          {researchFilterOptions.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setActiveFilter(option.id)}
              className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition ${
                activeFilter === option.id
                  ? "border-transparent bg-indigo-600 text-white shadow"
                  : "border-slate-200 bg-slate-100 text-slate-600 hover:border-slate-300 hover:bg-white"
              }`}
            >
              {option.label}
              {option.id === "collaboration" ? (
                <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs font-medium">
                  {normalizedFeed.filter((item) => item.isCollaboration).length}
                </span>
              ) : null}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 text-sm text-slate-500">
          <span>Sort by:</span>
          <div className="relative">
            <select
              value={sortOption}
              onChange={(event) => setSortOption(event.target.value)}
              className="appearance-none rounded-full border border-slate-200 bg-white py-2 pl-4 pr-10 text-sm font-semibold text-slate-700 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            >
              {researchSortOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          </div>
        </div>
      </div>

      {showSkeletons ? (
        <div className="space-y-6">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={`research-skeleton-${index}`}
              className="space-y-4 rounded-3xl border border-slate-100 bg-slate-50/60 p-6 animate-pulse"
            >
              <div className="h-4 w-1/3 rounded bg-slate-200" />
              <div className="h-4 w-1/2 rounded bg-slate-200" />
              <div className="h-32 w-full rounded-2xl bg-slate-200" />
            </div>
          ))}
        </div>
      ) : isEmpty ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center text-slate-500">
          No research updates yet. Be the first to share your work or invite
          collaborators.
        </div>
      ) : (
        <div className="space-y-6">
          {displayedFeed.map((item) => (
            <ResearchPostCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </section>
  );
}

function StartResearchPostCard({
  profile,
  onSubmit,
  submitting = false,
  disabled = false,
}) {
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("collaboration");
  const [linkValue, setLinkValue] = useState("");
  const [imageValue, setImageValue] = useState("");
  const [showLinkField, setShowLinkField] = useState(false);
  const [showImageField, setShowImageField] = useState(false);
  const [status, setStatus] = useState({ type: "", message: "" });

  useEffect(() => {
    if (!status.message) return undefined;
    const timer = setTimeout(() => setStatus({ type: "", message: "" }), 4000);
    return () => clearTimeout(timer);
  }, [status]);

  const initials = getInitials(profile?.name || "You");
  const avatarColor = getAvatarColor(profile?.name || "You");

  const canSubmit = !disabled && !submitting && content.trim().length > 0;

  const extractTitle = (text) => {
    const trimmed = text.trim();
    if (!trimmed) return "Research update";
    const lines = trimmed.split(/\r?\n/).map((line) => line.trim());
    const firstLine = lines.find((line) => line.length > 0) || trimmed;
    return firstLine.length > 120 ? `${firstLine.slice(0, 117)}...` : firstLine;
  };

  const collectTags = (text) => {
    const matches = text.match(/#[A-Za-z0-9_-]+/g) || [];
    const unique = Array.from(
      new Set(matches.map((tag) => tag.replace(/^#/, "")))
    );
    return unique.slice(0, 6);
  };

  const handleSubmit = async () => {
    const trimmed = content.trim();
    if (!onSubmit) return;
    if (!trimmed) {
      setStatus({
        type: "error",
        message: "Share a quick update before posting.",
      });
      return;
    }

    const payload = {
      title: extractTitle(trimmed),
      summary: trimmed,
      body: trimmed,
      tags: collectTags(trimmed),
      link: linkValue.trim(),
      image: imageValue.trim(),
      category: category === "collaboration" ? "Collaboration" : "My Research",
      isCollaboration: category === "collaboration",
    };

    try {
      await onSubmit(payload);
      setStatus({
        type: "success",
        message: "Post shared with the research community.",
      });
      setContent("");
      setLinkValue("");
      setImageValue("");
      setShowLinkField(false);
      setShowImageField(false);
      setCategory("collaboration");
    } catch (err) {
      setStatus({
        type: "error",
        message:
          err?.message ||
          "We couldn't share your update right now. Please try again.",
      });
    }
  };

  const handleKeyDown = (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
      event.preventDefault();
      if (canSubmit) {
        handleSubmit();
      }
    }
  };

  return (
    <div className="rounded-3xl border border-slate-100 bg-white shadow-sm">
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900">
            Start a Research Post
          </h3>
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Share your progress, questions, or wins
          </span>
        </div>
        <div className="flex items-start gap-4">
          <div
            className={`hidden h-12 w-12 shrink-0 items-center justify-center rounded-full text-sm font-semibold uppercase text-white sm:flex ${avatarColor}`}
          >
            {initials}
          </div>
          <div className="flex-1 space-y-4">
            <textarea
              rows={3}
              value={content}
              onChange={(event) => setContent(event.target.value)}
              onKeyDown={handleKeyDown}
              disabled={disabled}
              placeholder={
                disabled
                  ? "Loading your dashboard..."
                  : "Share your research, find collaborators, or ask a question..."
              }
              className={`w-full resize-none rounded-2xl border border-slate-200 bg-slate-50/60 px-4 py-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100 ${
                disabled ? "opacity-60 cursor-not-allowed" : ""
              }`}
            />

            <div className="flex flex-wrap gap-2">
              {researchComposerCategories.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  disabled={disabled}
                  onClick={() => setCategory(option.id)}
                  className={`inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-semibold transition ${
                    category === option.id
                      ? "border-transparent bg-indigo-600 text-white shadow"
                      : "border-slate-200 bg-slate-100 text-slate-600 hover:border-slate-300 hover:bg-white"
                  } ${disabled ? "opacity-60 cursor-not-allowed" : ""}`}
                >
                  {option.label}
                </button>
              ))}
            </div>

            {showLinkField ? (
              <input
                type="url"
                value={linkValue}
                disabled={disabled}
                onChange={(event) => setLinkValue(event.target.value)}
                placeholder="https://example.com/research-paper"
                className={`w-full rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100 ${
                  disabled ? "opacity-60 cursor-not-allowed" : ""
                }`}
              />
            ) : null}

            {showImageField ? (
              <input
                type="url"
                value={imageValue}
                disabled={disabled}
                onChange={(event) => setImageValue(event.target.value)}
                placeholder="https://images.example.com/cover.jpg"
                className={`w-full rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100 ${
                  disabled ? "opacity-60 cursor-not-allowed" : ""
                }`}
              />
            ) : null}

            {status.message ? (
              <div
                className={`rounded-2xl border px-4 py-2 text-xs font-semibold ${
                  status.type === "success"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-600"
                    : "border-rose-200 bg-rose-50 text-rose-600"
                }`}
              >
                {status.message}
              </div>
            ) : null}

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => setShowImageField((prev) => !prev)}
                  className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${
                    showImageField
                      ? "bg-indigo-100 text-indigo-600"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  } ${disabled ? "opacity-60 cursor-not-allowed" : ""}`}
                  aria-pressed={showImageField}
                >
                  <Image className="h-4 w-4" />
                  {showImageField ? "Photo Added" : "Add Photo"}
                </button>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => setShowLinkField((prev) => !prev)}
                  className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${
                    showLinkField
                      ? "bg-indigo-100 text-indigo-600"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  } ${disabled ? "opacity-60 cursor-not-allowed" : ""}`}
                  aria-pressed={showLinkField}
                >
                  <Link2 className="h-4 w-4" />
                  {showLinkField ? "Link Added" : "Add Link"}
                </button>
              </div>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!canSubmit}
                className={`inline-flex items-center justify-center rounded-full px-6 py-2 text-sm font-semibold shadow-sm transition ${
                  canSubmit
                    ? "bg-indigo-600 text-white hover:bg-indigo-500"
                    : "bg-slate-200 text-slate-500 cursor-not-allowed"
                }`}
              >
                {submitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Post
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ResearchPostCard({ item }) {
  const initials = getInitials(item.authorName);
  const avatarColor = getAvatarColor(item.authorName);

  return (
    <article className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm">
      <div className="space-y-4 p-6">
        <header className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-sm font-semibold uppercase text-white shadow ${avatarColor}`}
            >
              {initials}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-base font-semibold text-slate-900">
                  {item.authorName}
                </p>
                {item.isCollaboration ? (
                  <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-indigo-600">
                    Collaboration
                  </span>
                ) : null}
                {item.trending ? (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-600">
                    Trending
                  </span>
                ) : null}
              </div>
              {item.authorRole ? (
                <p className="text-xs text-slate-500">{item.authorRole}</p>
              ) : null}
              <p className="text-xs text-slate-400">{item.timestamp}</p>
            </div>
          </div>
          <button
            type="button"
            className="text-slate-400 transition hover:text-slate-600"
          >
            <MoreHorizontal className="h-5 w-5" />
          </button>
        </header>

        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-slate-900">{item.title}</h3>
          <p className="text-sm text-slate-600">{item.summary}</p>
          {item.link ? (
            <a
              href={item.link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm font-semibold text-indigo-600 hover:text-indigo-500"
            >
              Read more
              <ChevronRight className="h-4 w-4" />
            </a>
          ) : null}
        </div>
      </div>

      {item.image ? (
        <div className="border-t border-slate-100 bg-slate-50/30">
          <img
            src={item.image}
            alt={item.title}
            className="h-64 w-full object-cover"
            loading="lazy"
          />
        </div>
      ) : null}

      <div className="p-6 pt-4">
        {item.tags.length ? (
          <div className="mb-4 flex flex-wrap gap-2">
            {item.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-600"
              >
                #{tag.replace(/^#/, "")}
              </span>
            ))}
          </div>
        ) : null}

        <footer className="flex flex-col gap-4 border-t border-slate-100 pt-4 text-sm font-semibold text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-4">
            <button
              type="button"
              className="inline-flex items-center gap-2 text-slate-500 transition hover:text-indigo-600"
            >
              <ThumbsUp className="h-4 w-4" />
              {item.stats.likes} Likes
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-2 text-slate-500 transition hover:text-indigo-600"
            >
              <MessageCircle className="h-4 w-4" />
              {item.stats.comments} Comments
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-2 text-slate-500 transition hover:text-indigo-600"
            >
              <Users className="h-4 w-4" />
              {item.stats.collaborations} Collaborations
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-slate-600 transition hover:border-indigo-500 hover:text-indigo-600"
            >
              <Share2 className="h-4 w-4" />
              Share
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-full bg-indigo-600 px-4 py-2 text-white shadow-sm transition hover:bg-indigo-500"
            >
              <UserPlus className="h-4 w-4" />
              Invite to Collaborate
            </button>
          </div>
        </footer>
      </div>
    </article>
  );
}

function GradesView({ grades, courses, loading }) {
  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-slate-900">
          Grades & Progress
        </h2>
        <p className="text-sm text-slate-500">
          Track how you are pacing across every enrolled course.
        </p>
      </div>

      {loading && courses.length === 0 ? (
        <div className="rounded-3xl border border-slate-100 bg-slate-50/60 p-8 animate-pulse h-48" />
      ) : null}

      {grades.length === 0 && !loading ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center text-slate-500">
          Grade records will appear here once your courses start reporting
          progress.
        </div>
      ) : null}

      {grades.length > 0 ? (
        <div className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-100">
            <thead className="bg-slate-50">
              <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-6 py-4">Course</th>
                <th className="px-6 py-4">Instructor</th>
                <th className="px-6 py-4">Progress</th>
                <th className="px-6 py-4">Grade</th>
                <th className="px-6 py-4">Credits</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm text-slate-600">
              {grades.map((course) => (
                <tr key={course.courseId} className="hover:bg-slate-50/80">
                  <td className="px-6 py-4 font-semibold text-slate-900">
                    {course.title}
                  </td>
                  <td className="px-6 py-4">{course.instructor || "TBA"}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-2 w-32 rounded-full bg-slate-200 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-indigo-600"
                          style={{
                            width: `${Math.min(course.progress ?? 0, 100)}%`,
                          }}
                        />
                      </div>
                      <span className="font-medium text-slate-700">
                        {course.progress ?? 0}%
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 font-semibold text-indigo-600">
                    {course.grade}
                  </td>
                  <td className="px-6 py-4">{course.credits}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}

function ProfileView({ profile, metrics, onLogout }) {
  const highlightMetrics = [
    {
      label: "Learning Coins",
      value: profile?.coins ?? 0,
      description: "Earned through quests and milestones",
    },
    {
      label: "Current Streak",
      value: metrics.currentStreak ?? profile?.streak ?? 0,
      description: "Consecutive days of learning",
    },
    {
      label: "Academic Standing",
      value: metrics.academicStanding ?? "—",
      description: "GPA equivalent (0-100%)",
    },
  ];

  return (
    <section className="space-y-8">
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-8 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div className="flex items-center gap-5">
          <div className="h-20 w-20 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-2xl font-bold">
            {profile?.name?.slice(0, 1)?.toUpperCase() || "S"}
          </div>
          <div>
            <h2 className="text-2xl font-semibold text-slate-900">
              {profile?.name}
            </h2>
            <p className="text-sm text-slate-500">{profile?.email}</p>
            <p className="mt-2 text-sm font-medium text-indigo-600">
              {profile?.role ? profile.role.toUpperCase() : "STUDENT"}
            </p>
          </div>
        </div>
        <div className="flex flex-col items-start gap-3">
          <button
            type="button"
            onClick={onLogout}
            className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-800"
          >
            Sign out of account
          </button>
          <p className="text-xs text-slate-500">
            Tip: You can return anytime with single sign-on using your campus
            email.
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {highlightMetrics.map((item) => (
          <div
            key={item.label}
            className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-2"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {item.label}
            </p>
            <p className="text-3xl font-bold text-slate-900">{item.value}</p>
            <p className="text-sm text-slate-500">{item.description}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-4">
          <h3 className="text-lg font-semibold text-slate-900">
            Learning preferences
          </h3>
          <ul className="space-y-3 text-sm text-slate-600">
            <li>• Prefers interactive micro-learning sessions (20-30 min)</li>
            <li>• Responds well to gamified streak challenges and badges</li>
            <li>• Peak focus hours: 8-10 AM and 8-9 PM</li>
          </ul>
          <button
            type="button"
            className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-600 hover:text-indigo-700"
          >
            Update preferences
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-4">
          <h3 className="text-lg font-semibold text-slate-900">Achievements</h3>
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
