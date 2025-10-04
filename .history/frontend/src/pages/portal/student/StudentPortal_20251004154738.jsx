import { useCallback, useEffect, useMemo, useState } from "react";
import { LayoutDashboard, ListChecks, Newspaper, GraduationCap, UserCircle, Bot } from "lucide-react";
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

export default function StudentPortal({ user, onLogout, setAuthUser }) {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actingQuest, setActingQuest] = useState(null);
  const [activeSection, setActiveSection] = useState("dashboard");
  const [creatingResearchPost, setCreatingResearchPost] = useState(false);
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
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [isLarge, setIsLarge] = useState(() =>
    typeof window !== "undefined"
      ? window.matchMedia("(min-width: 1024px)").matches
      : false
  );

  const SIDEBAR_EXPANDED = 256;
  const SIDEBAR_COLLAPSED = 64;

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
      setDashboard((prev) =>
        prev
          ? {
              ...prev,
              researchFeed: [
                result,
                ...(Array.isArray(prev.researchFeed) ? prev.researchFeed : []),
              ],
            }
          : prev
      );
      return result;
    } finally {
      setCreatingResearchPost(false);
    }
  }, []);

  useEffect(() => {
    refreshDashboard();
  }, [refreshDashboard]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(min-width: 1024px)");
    const handler = (e) => setIsLarge(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const profile = useMemo(() => dashboard?.user || user, [dashboard?.user, user]);
  const metrics = useMemo(() => dashboard?.metrics || {}, [dashboard?.metrics]);
  const quests = useMemo(() => dashboard?.dailyQuests || [], [dashboard?.dailyQuests]);
  const leaderboard = useMemo(() => dashboard?.leaderboard || [], [dashboard?.leaderboard]);
  const courses = useMemo(() => dashboard?.activeCourses || [], [dashboard?.activeCourses]);
  const researchFeed = useMemo(
    () => (dashboard?.researchFeed?.length ? dashboard.researchFeed : []),
    [dashboard?.researchFeed]
  );
  const grades = useMemo(() => {
    if (dashboard?.grades?.length) return dashboard.grades;
    if (!courses.length) return [];
    return courses.map((c) => ({
      courseId: c.courseId,
      title: c.title,
      credits: c.credits ?? 3,
      progress: c.progress ?? 0,
      grade:
        c.grade ||
        (c.progress >= 90
          ? "A"
          : c.progress >= 80
          ? "B"
          : c.progress >= 70
          ? "C"
          : "In Progress"),
      instructor: c.instructor,
    }));
  }, [courses, dashboard?.grades]);

  const handleCompleteQuest = async (quest) => {
    if (!quest || quest.completed) return;
    try {
      setActingQuest(quest.id);
      await api.completeQuest(quest.id);
      await refreshDashboard();
    } catch (e) {
      console.error("Failed to complete quest", e);
    } finally {
      setActingQuest(null);
    }
  };

  const notifications = useMemo(() => {
    if (loading && !dashboard) return [];
    const items = [];
    if (Array.isArray(dashboard?.notifications)) {
      dashboard.notifications.forEach((item, i) =>
        items.push({
          id: item.id ?? `api-${i}`,
            title: item.title || item.heading || "Update",
            body:
              item.description ||
              item.message ||
              item.body ||
              "New activity detected in your learning portal.",
            timestamp: item.time || item.timestamp || "Just now",
            priority: item.priority || item.type || "info",
          })
      );
    }
    const pendingQuest = quests.find((q) => !q.completed);
    if (pendingQuest) {
      items.push({
        id: `quest-${pendingQuest.id}`,
        title: "Daily quest still open",
        body: `${pendingQuest.title} is worth ${pendingQuest.xp} XP. Complete it to keep your streak going!`,
        timestamp: "Today",
        priority: "quest",
      });
    }
    const upcomingCourse = courses.find((c) => !!c.dueNext);
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
      .find((c) => (c.progress ?? 0) < 60);
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
    () => notifications.filter((n) => n.id !== "no-updates"),
    [notifications]
  );
  const notificationCount = actionableNotifications.length;
  const isInitialLoad = loading && !dashboard;

  const advisorInsights = useMemo(() => {
    const insights = [];
    const focusCourse = [...courses]
      .sort((a, b) => (a.progress ?? 0) - (b.progress ?? 0))
      .find((c) => (c.progress ?? 0) < 85);
    if (focusCourse) {
      insights.push({
        id: `focus-${focusCourse.courseId}`,
        title: `Boost ${focusCourse.title}`,
        description: `Progress is at ${focusCourse.progress ?? 0}%$${
          focusCourse.dueNext ? ` with ${focusCourse.dueNext}` : ""
        }. A targeted review session will raise your overall standing.`,
        action: "Schedule a 45-minute deep work block and summarize what you learn.",
        focusLabel: focusCourse.title,
      });
    }
    const pendingQuests = quests.filter((q) => !q.completed);
    if (pendingQuests.length) {
      insights.push({
        id: "quests",
        title: "Capitalize on open quests",
        description: `${pendingQuests.length} quest$${
          pendingQuests.length > 1 ? "s" : ""
        } remain. Completing them adds ${pendingQuests
          .map((q) => q.xp ?? 0)
          .reduce((t, x) => t + x, 0)} XP and boosts your streak.`,
        action: `Start with "${pendingQuests[0].title}" for a quick win.`,
        focusLabel: pendingQuests[0].title,
      });
    }
    if (metrics.academicStanding !== undefined && metrics.academicStanding < 75) {
      insights.push({
        id: "academic",
        title: "Raise academic standing",
        description: `Your academic standing is ${metrics.academicStanding}%. Consistent study blocks and spaced review can lift this above 80%.`,
        action: "Plan 3 focused sessions this week with recap notes after each.",
      });
    }
    const focusNotification = notifications.find((n) =>
      ["focus", "course"].includes(n.priority)
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
      ? `Your learning streak is ${streakValue} day${streakValue === 1 ? "" : "s"}.`
      : "Let's build a daily learning streak together.";
    const topInsight = advisorInsights[0];
    const focusStatement = topInsight
      ? `First focus: ${topInsight.title}.`
      : "Ask me for a plan whenever you need one.";
    return `Hey ${name}! I'm tracking your study signals. ${progressStatement} ${streakStatement} ${focusStatement}`;
  }, [advisorInsights, metrics.courseProgress, metrics.currentStreak, profile?.name, profile?.streak]);

  useEffect(() => {
    setAdvisorMessages((prev) => {
      if (!prev.length)
        return [
          { id: "assistant-welcome", role: "assistant", content: advisorGreeting },
        ];
      if (prev[0].role !== "assistant")
        return [
          { id: "assistant-welcome", role: "assistant", content: advisorGreeting },
          ...prev,
        ];
      if (prev[0].content === advisorGreeting) return prev;
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
          ? `Current streak: ${(metrics.currentStreak ?? profile?.streak) || 0} days`
          : null,
      ].filter(Boolean);
      const courseSummary = courses.length
        ? courses
            .map((c) => {
              const progress = c.progress ?? 0;
              const dueNext = c.dueNext || "no immediate deadline";
              return `${c.title} — ${progress}% complete, next: ${dueNext}`;
            })
            .join("\n- ")
        : "No active courses recorded.";
      const questSummary = quests.length
        ? quests
            .map((q) => `${q.title}: ${q.completed ? "completed" : "pending"} (${q.xp} XP)`)
            .join("\n- ")
        : "No quests assigned.";
      const notificationSummary = notifications.length
        ? notifications
            .slice(0, 5)
            .map((n) => `${n.title}: ${n.body}`)
            .join("\n- ")
        : "No outstanding notifications.";
      const conversationHistory = conversation
        .slice(-6)
        .map((e) => `${e.role === "user" ? "Student" : "Coach"}: ${e.content}`)
        .join("\n");
      return [
        `You are an AI learning coach guiding a university student named ${name}. Be proactive, motivational, and specific. Provide step-by-step guidance and reference the student's current data.`,
        `Student metrics:\n- ${
          metricsSummary.length ? metricsSummary.join("\n- ") : "No metrics available."
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
      if (!trimmed || advisorLoading || advisorCooldown > 0) return;
      const userMessage = { id: `user-${Date.now()}`, role: "user", content: trimmed };
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

  useEffect(() => {
    if (advisorCooldown <= 0) return;
    const id = setInterval(
      () => setAdvisorCooldown((s) => (s > 1 ? s - 1 : 0)),
      1000
    );
    return () => clearInterval(id);
  }, [advisorCooldown]);

  const currentSidebarWidth = sidebarExpanded
    ? SIDEBAR_EXPANDED
    : SIDEBAR_COLLAPSED;
  const sidebarOffset = isLarge ? currentSidebarWidth : 0;

  return (
    <div className="min-h-screen text-slate-900 flex flex-col">
      <StudentSidebar
        links={sidebarLinks}
        activeSection={activeSection}
        onSelect={setActiveSection}
        expanded={sidebarExpanded}
        setExpanded={setSidebarExpanded}
        isLarge={isLarge}
        width={currentSidebarWidth}
      />
      <main
        className="flex-1"
        style={{ marginLeft: sidebarOffset, transition: "margin-left .3s ease" }}
      >
        <StudentHeader
          leftOffset={sidebarOffset}
          notificationCount={notificationCount}
          onOpenNotifications={() => setNotificationsOpen(true)}
          profile={profile}
          onLogout={onLogout}
        />
        <div className="max-w-7xl mx-auto w-full app-content app-content--fixed-header space-y-10 px-8">
          {error && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-600">
              {error}
            </div>
          )}
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
              notifications={notifications}
              initialLoad={isInitialLoad}
              notificationCount={notificationCount}
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
            <ResearchFeedView
              feed={researchFeed}
              loading={loading}
              profile={profile}
              creatingPost={creatingResearchPost}
              onCreatePost={handleCreateResearchPost}
              canPost={Boolean(dashboard) && !loading}
            />
          )}
          {activeSection === "grades" && (
            <GradesView grades={grades} courses={courses} loading={loading} />
          )}
          {activeSection === "advisor" && (
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
          )}
          {activeSection === "profile" && (
            <ProfileView profile={profile} metrics={metrics} onLogout={onLogout} />
          )}
        </div>
      </main>
      {notificationsOpen && (
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
      )}
    </div>
  );
}

