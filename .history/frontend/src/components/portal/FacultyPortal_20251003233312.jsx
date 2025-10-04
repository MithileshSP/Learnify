import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  BarChart3,
  BookOpen,
  Brain,
  Check,
  ClipboardList,
  Clock,
  LogOut,
  Plus,
  RefreshCw,
  Sparkles,
  TrendingUp,
  UserPlus,
  Users,
} from "lucide-react";
import { api } from "../../api.js";

const suggestionStatusStyles = {
  pending: "bg-amber-50 text-amber-700 border border-amber-200",
  approved: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  reviewed: "bg-slate-100 text-slate-700 border border-slate-200",
  needs_follow_up: "bg-red-50 text-red-600 border border-red-200",
  escalated: "bg-violet-50 text-violet-600 border border-violet-200",
  dismissed: "bg-slate-100 text-slate-500 border border-slate-200",
};

const menteeStatusOptions = [
  { value: "active", label: "Active" },
  { value: "meeting_soon", label: "Meeting soon" },
  { value: "archived", label: "Archived" },
];

const courseStatusOptions = [
  { value: "published", label: "Published" },
  { value: "draft", label: "Draft" },
  { value: "archived", label: "Archived" },
];

const courseToneStyles = {
  emerald: "text-emerald-600 bg-emerald-50 border border-emerald-200",
  amber: "text-amber-600 bg-amber-50 border border-amber-200",
  slate: "text-slate-600 bg-slate-100 border border-slate-200",
  indigo: "text-indigo-600 bg-indigo-50 border border-indigo-200",
};

const defaultAnalytics = {
  labels: [],
  students: [],
  avgGrade: [],
};

const formatDateTime = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "—";
  }
  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
};

const formatPercent = (value) => `${Math.round(value ?? 0)}%`;

const toSentence = (status) =>
  (status || "")
    .split("_")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");

export default function FacultyPortal({ user, onLogout }) {
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);
  const [action, setAction] = useState({ type: null, id: null });
  const [menteeFormOpen, setMenteeFormOpen] = useState(false);
  const [menteeForm, setMenteeForm] = useState({
    name: "",
    status: "active",
    nextSession: "",
    note: "",
  });
  const [courseFormOpen, setCourseFormOpen] = useState(false);
  const [courseForm, setCourseForm] = useState({
    title: "",
    status: "draft",
    code: "",
  });

  const analytics = overview?.analytics ?? defaultAnalytics;
  const courseProgress = overview?.courseProgress ?? [];
  const topPerformers = overview?.topPerformers ?? [];

  useEffect(() => {
    loadOverview();
  }, []);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  const isBusy = (type, id = null) =>
    action.type === type && (id === null || action.id === id);

  const beginAction = (type, id = null) => setAction({ type, id });
  const finishAction = () => setAction({ type: null, id: null });

  const showToast = (message, tone = "success") =>
    setToast({ message, tone });

  const loadOverview = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getFacultyOverview();
      setOverview(data);
    } catch (err) {
      setError(err?.message || "Unable to load faculty overview");
      setOverview(null);
    } finally {
      setLoading(false);
    }
  };

  const handleReviewSuggestion = async (suggestionId, status) => {
    beginAction("suggestion", suggestionId);
    try {
      const data = await api.reviewFacultyAISuggestion(suggestionId, {
        status,
      });
      setOverview(data);
      showToast(
        status === "needs_follow_up"
          ? "Flagged suggestion for follow-up"
          : "Updated AI suggestion",
      );
    } catch (err) {
      showToast(err?.message || "Unable to update suggestion", "error");
    } finally {
      finishAction();
    }
  };

  const handleAddMentee = async (event) => {
    event.preventDefault();
    beginAction("mentee-form");
    try {
      const payload = {
        name: menteeForm.name.trim(),
        status: menteeForm.status,
        nextSession: menteeForm.nextSession.trim(),
        note: menteeForm.note.trim(),
      };
      const data = await api.addFacultyMentee(payload);
      setOverview(data);
      setMenteeForm({ name: "", status: "active", nextSession: "", note: "" });
      setMenteeFormOpen(false);
      showToast("Added mentee to mentorship plan");
    } catch (err) {
      showToast(err?.message || "Unable to add mentee", "error");
    } finally {
      finishAction();
    }
  };

  const handleUpdateMentee = async (menteeId, updates) => {
    beginAction("mentee", menteeId);
    try {
      const data = await api.updateFacultyMenteeStatus(menteeId, updates);
      setOverview(data);
      showToast("Updated mentee details");
    } catch (err) {
      showToast(err?.message || "Unable to update mentee", "error");
    } finally {
      finishAction();
    }
  };

  const handleAddCourse = async (event) => {
    event.preventDefault();
    beginAction("course-form");
    try {
      const payload = {
        title: courseForm.title.trim(),
        status: courseForm.status,
        code: courseForm.code.trim(),
      };
      const data = await api.addFacultyCourse(payload);
      setOverview(data);
      setCourseForm({ title: "", status: "draft", code: "" });
      setCourseFormOpen(false);
      showToast("Added course to catalog");
    } catch (err) {
      showToast(err?.message || "Unable to add course", "error");
    } finally {
      finishAction();
    }
  };

  const handleUpdateCourse = async (courseId, updates) => {
    beginAction("course", courseId);
    try {
      const data = await api.updateFacultyCourseStatus(courseId, updates);
      setOverview(data);
      showToast("Updated course settings");
    } catch (err) {
      showToast(err?.message || "Unable to update course", "error");
    } finally {
      finishAction();
    }
  };

  const summaryCards = useMemo(() => {
    const stats = overview?.overview;
    return [
      {
        label: "Courses taught",
        value: stats?.coursesTaught ?? 0,
        delta: courseProgress.length ? `${courseProgress.length} active cohorts` : "",
        icon: BookOpen,
        accent: "from-indigo-500 to-indigo-600",
      },
      {
        label: "Students mentored",
        value: stats?.studentsMentored ?? 0,
        delta: `${overview?.mentorship?.activeCount ?? 0} active now`,
        icon: Users,
        accent: "from-sky-500 to-sky-600",
      },
      {
        label: "Average grade",
        value: `${Math.round((stats?.averageGrade ?? 0) * 10) / 10}`,
        delta: "Term-to-date",
        icon: Brain,
        accent: "from-emerald-500 to-emerald-600",
      },
      {
        label: "Pending reviews",
        value: stats?.pendingReviews ?? overview?.aiGrading?.pendingCount ?? 0,
        delta: overview?.aiGrading?.lastUpdated
          ? `Updated ${overview.aiGrading.lastUpdated}`
          : "AI queue",
        icon: AlertCircle,
        accent: "from-rose-500 to-rose-600",
      },
    ];
  }, [overview, courseProgress.length]);

  const maxStudents = Math.max(...(analytics.students ?? []), 1);
  const maxGrade = Math.max(...(analytics.avgGrade ?? []), 1);

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
              Monitor cohort momentum, act on AI grading insights, and keep
              mentorship thriving—everything you need in one control center.
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

      {toast ? (
        <div className="max-w-7xl mx-auto px-6 mt-4">
          <div
            className={`rounded-2xl px-4 py-3 text-sm font-medium shadow-sm border ${
              toast.tone === "error"
                ? "bg-rose-50 border-rose-200 text-rose-700"
                : "bg-emerald-50 border-emerald-200 text-emerald-700"
            }`}
          >
            {toast.message}
          </div>
        </div>
      ) : null}

      <main className="max-w-7xl mx-auto px-6 py-10 space-y-10">
        {error ? (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-3xl">
            {error}
          </div>
        ) : null}

        <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
          {summaryCards.map((card) => (
            <div
              key={card.label}
              className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 flex flex-col gap-4"
            >
              <div className={`w-10 h-10 rounded-2xl bg-gradient-to-r ${card.accent} text-white flex items-center justify-center`}>
                <card.icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  {card.label}
                </p>
                <p className="text-2xl font-semibold text-slate-900 mt-1">
                  {card.value}
                </p>
                {card.delta ? (
                  <p className="text-xs text-slate-500 mt-1">{card.delta}</p>
                ) : null}
              </div>
            </div>
          ))}
        </section>

        <section className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          <div className="xl:col-span-2 bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
                  <Sparkles className="w-5 h-5" />
                </span>
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">
                    AI Grading Assistant
                  </h2>
                  <p className="text-sm text-slate-500">
                    {overview?.aiGrading?.pendingCount ?? 0} items waiting for your judgement
                  </p>
                </div>
              </div>
              <span className="flex items-center gap-1 text-xs text-slate-500">
                <Clock className="w-4 h-4" />
                {overview?.aiGrading?.lastUpdated
                  ? `Updated ${overview.aiGrading.lastUpdated}`
                  : "Up to date"}
              </span>
            </div>
            <div className="space-y-4">
              {loading ? (
                <p className="text-sm text-slate-500">Loading AI insights…</p>
              ) : (overview?.aiGrading?.suggestions?.length ?? 0) === 0 ? (
                <div className="text-sm text-slate-500 bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-6 text-center">
                  No AI evaluations waiting. Enjoy a breather!
                </div>
              ) : (
                overview.aiGrading.suggestions.map((suggestion) => {
                  const statusClass =
                    suggestionStatusStyles[suggestion.status] ||
                    suggestionStatusStyles.reviewed;
                  return (
                    <article
                      key={suggestion.id}
                      className="border border-slate-200 rounded-2xl p-5 bg-slate-50/40"
                    >
                      <header className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                        <div>
                          <p className="text-xs uppercase tracking-wide text-slate-500">
                            {suggestion.course}
                          </p>
                          <h3 className="text-lg font-semibold text-slate-900">
                            {suggestion.title}
                          </h3>
                        </div>
                        <span className={`inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-full ${statusClass}`}>
                          <Sparkles className="w-3 h-3" />
                          {toSentence(suggestion.status)}
                        </span>
                      </header>
                      <p className="text-sm text-slate-600 mt-3 leading-6">
                        {suggestion.summary}
                      </p>
                      <div className="mt-4 bg-white border border-slate-200 rounded-2xl p-4 text-sm text-slate-600">
                        <p className="font-medium text-slate-900">Recommendation</p>
                        <p className="mt-2 leading-6">{suggestion.recommendation}</p>
                        <p className="mt-3 text-xs uppercase tracking-wide text-slate-500">
                          Suggested grade: <span className="text-slate-900">{suggestion.gradeSuggestion}</span>
                        </p>
                      </div>
                      <footer className="mt-5 flex flex-wrap items-center gap-3">
                        <button
                          type="button"
                          onClick={() => handleReviewSuggestion(suggestion.id, "approved")}
                          disabled={isBusy("suggestion", suggestion.id)}
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-500 transition disabled:opacity-70"
                        >
                          <Check className="w-4 h-4" /> Approve & share
                        </button>
                        <button
                          type="button"
                          onClick={() => handleReviewSuggestion(suggestion.id, "needs_follow_up")}
                          disabled={isBusy("suggestion", suggestion.id)}
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-100 text-amber-700 text-sm font-medium hover:bg-amber-200 transition disabled:opacity-70"
                        >
                          <AlertCircle className="w-4 h-4" /> Needs follow-up
                        </button>
                        <button
                          type="button"
                          onClick={() => handleReviewSuggestion(suggestion.id, "reviewed")}
                          disabled={isBusy("suggestion", suggestion.id)}
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-100 transition disabled:opacity-70"
                        >
                          Mark reviewed
                        </button>
                      </footer>
                    </article>
                  );
                })
              )}
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
            <div className="flex items-center gap-3 mb-6">
              <span className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                <BarChart3 className="w-5 h-5" />
              </span>
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Cohort analytics</h2>
                <p className="text-sm text-slate-500">
                  Engagement and performance trends across the semester
                </p>
              </div>
            </div>
            {(analytics.labels?.length ?? 0) === 0 ? (
              <p className="text-sm text-slate-500">
                Analytics will populate once learner activity is available.
              </p>
            ) : (
              <div className="space-y-4">
                {analytics.labels.map((label, index) => {
                  const studentsValue = analytics.students[index] ?? 0;
                  const avgGradeValue = analytics.avgGrade[index] ?? 0;
                  const studentWidth = Math.max(
                    8,
                    Math.round((studentsValue / maxStudents) * 100),
                  );
                  const gradeWidth = Math.max(
                    8,
                    Math.round((avgGradeValue / maxGrade) * 100),
                  );
                  return (
                    <div
                      key={label}
                      className="border border-slate-200 rounded-2xl p-4 bg-slate-50"
                    >
                      <div className="flex items-center justify-between text-sm font-medium text-slate-700">
                        <span>{label}</span>
                        <span>{studentsValue} learners</span>
                      </div>
                      <div className="mt-3 space-y-2">
                        <div>
                          <p className="text-xs uppercase tracking-wide text-slate-500">
                            Learner count
                          </p>
                          <div className="h-2 rounded-full bg-slate-200 overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-indigo-500 to-indigo-600"
                              style={{ width: `${studentWidth}%` }}
                            />
                          </div>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-wide text-slate-500">
                            Avg. grade
                          </p>
                          <div className="h-2 rounded-full bg-slate-200 overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-emerald-500 to-emerald-600"
                              style={{ width: `${gradeWidth}%` }}
                            />
                          </div>
                          <p className="text-xs text-slate-500 mt-1">
                            {avgGradeValue}% average score
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-5">
            <header className="flex items-center justify-between">
              <div className="flex items_center gap-3">
                <span className="w-10 h-10 rounded-2xl bg-sky-100 text-sky-600 flex items-center justify-center">
                  <Users className="w-5 h-5" />
                </span>
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">
                    Mentorship roster
                  </h2>
                  <p className="text-sm text-slate-500">
                    {overview?.mentorship?.activeCount ?? 0} active mentees • Last sync {overview?.mentorship?.lastUpdated || "Recently"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMenteeFormOpen((current) => !current)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 transition"
              >
                <UserPlus className="w-4 h-4" /> New mentee
              </button>
            </header>

            {menteeFormOpen ? (
              <form
                onSubmit={handleAddMentee}
                className="border border-slate-200 rounded-2xl p-4 bg-slate-50 space-y-3"
              >
                <div className="grid sm:grid-cols-2 gap-3">
                  <div className="sm:col-span-2">
                    <label className="text-xs font-semibold text-slate-600 block mb-1">
                      Name
                    </label>
                    <input
                      type="text"
                      value={menteeForm.name}
                      onChange={(event) =>
                        setMenteeForm((current) => ({
                          ...current,
                          name: event.target.value,
                        }))
                      }
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                      placeholder="Jordan Patel"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600 block mb-1">
                      Status
                    </label>
                    <select
                      value={menteeForm.status}
                      onChange={(event) =>
                        setMenteeForm((current) => ({
                          ...current,
                          status: event.target.value,
                        }))
                      }
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                    >
                      {menteeStatusOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600 block mb-1">
                      Next session
                    </label>
                    <input
                      type="text"
                      value={menteeForm.nextSession}
                      onChange={(event) =>
                        setMenteeForm((current) => ({
                          ...current,
                          nextSession: event.target.value,
                        }))
                      }
                      placeholder="Mon, Oct 14 • 3:00 PM"
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-xs font-semibold text-slate-600 block mb-1">
                      Notes
                    </label>
                    <textarea
                      value={menteeForm.note}
                      onChange={(event) =>
                        setMenteeForm((current) => ({
                          ...current,
                          note: event.target.value,
                        }))
                      }
                      rows={2}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                      placeholder="Project focus, goals, or reminders"
                    />
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="submit"
                    disabled={isBusy("mentee-form")}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-500 transition disabled:opacity-70"
                  >
                    Add mentee
                  </button>
                  <button
                    type="button"
                    onClick={() => setMenteeFormOpen(false)}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-100 transition"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : null}

            <div className="space-y-4">
              {loading ? (
                <p className="text-sm text-slate-500">Loading mentorship roster…</p>
              ) : (overview?.mentorship?.mentees?.length ?? 0) === 0 ? (
                <p className="text-sm text-slate-500">
                  Start mentoring by adding a learner above.
                </p>
              ) : (
                overview.mentorship.mentees.map((mentee) => (
                  <div
                    key={mentee.id}
                    className="border border-slate-200 rounded-2xl p-4 bg-slate-50 flex flex-col gap-3"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-semibold text-slate-900">
                          {mentee.name}
                        </h3>
                        <p className="text-xs text-slate-500">
                          Updated {formatDateTime(mentee.updatedAt)}
                        </p>
                      </div>
                      <select
                        value={mentee.status}
                        onChange={(event) =>
                          handleUpdateMentee(mentee.id, {
                            status: event.target.value,
                          })
                        }
                        disabled={isBusy("mentee", mentee.id)}
                        className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700"
                      >
                        {menteeStatusOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="text-sm text-slate-600 leading-6">
                      {mentee.note || "No notes yet"}
                    </div>
                    {mentee.nextSession ? (
                      <p className="text-xs text-slate-500">
                        Next session: <span className="text-slate-800 font-medium">{mentee.nextSession}</span>
                      </p>
                    ) : null}
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-5">
            <header className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
                  <ClipboardList className="w-5 h-5" />
                </span>
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">
                    Course management
                  </h2>
                  <p className="text-sm text-slate-500">
                    {overview?.courses?.length ?? 0} courses across programs
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCourseFormOpen((current) => !current)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 transition"
              >
                <Plus className="w-4 h-4" /> New course
              </button>
            </header>

            {courseFormOpen ? (
              <form
                onSubmit={handleAddCourse}
                className="border border-slate-200 rounded-2xl p-4 bg-slate-50 space-y-3"
              >
                <div className="grid sm:grid-cols-2 gap-3">
                  <div className="sm:col-span-2">
                    <label className="text-xs font-semibold text-slate-600 block mb-1">
                      Title
                    </label>
                    <input
                      type="text"
                      value={courseForm.title}
                      onChange={(event) =>
                        setCourseForm((current) => ({
                          ...current,
                          title: event.target.value,
                        }))
                      }
                      placeholder="Ethics in Emerging Tech"
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600 block mb-1">
                      Status
                    </label>
                    <select
                      value={courseForm.status}
                      onChange={(event) =>
                        setCourseForm((current) => ({
                          ...current,
                          status: event.target.value,
                        }))
                      }
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                    >
                      {courseStatusOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600 block mb-1">
                      Code
                    </label>
                    <input
                      type="text"
                      value={courseForm.code}
                      onChange={(event) =>
                        setCourseForm((current) => ({
                          ...current,
                          code: event.target.value,
                        }))
                      }
                      placeholder="CS401"
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                    />
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="submit"
                    disabled={isBusy("course-form")}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-500 transition disabled:opacity-70"
                  >
                    Add course
                  </button>
                  <button
                    type="button"
                    onClick={() => setCourseFormOpen(false)}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-100 transition"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : null}

            <div className="space-y-4">
              {loading ? (
                <p className="text-sm text-slate-500">Loading course catalog…</p>
              ) : (overview?.courses?.length ?? 0) === 0 ? (
                <p className="text-sm text-slate-500">
                  Add your first course to begin tracking cohort progress.
                </p>
              ) : (
                overview.courses.map((course) => {
                  const toneClass = courseToneStyles[course.statusTone] || courseToneStyles.indigo;
                  return (
                    <div
                      key={course.id}
                      className="border border-slate-200 rounded-2xl p-4 bg-slate-50 flex flex-col gap-3"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-sm font-semibold text-slate-900">
                            {course.title}
                          </h3>
                          <p className="text-xs text-slate-500">
                            Code {course.code || "—"} • Updated {formatDateTime(course.lastUpdated)}
                          </p>
                        </div>
                        <span className={`inline-flex items-center gap-2 px-3 py-1 text-xs font-semibold rounded-full ${toneClass}`}>
                          <ClipboardList className="w-3 h-3" />
                          {course.statusLabel}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-3">
                        <select
                          value={course.status}
                          onChange={(event) =>
                            handleUpdateCourse(course.id, {
                              status: event.target.value,
                            })
                          }
                          disabled={isBusy("course", course.id)}
                          className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700"
                        >
                          {courseStatusOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() =>
                            handleUpdateCourse(course.id, {
                              status: course.status,
                              title: course.title,
                              code: course.code,
                            })
                          }
                          disabled={isBusy("course", course.id)}
                          className="text-xs text-slate-500 underline-offset-2 hover:underline"
                        >
                          Sync details
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
                  <BookOpen className="w-5 h-5" />
                </span>
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">
                    Course progress
                  </h2>
                  <p className="text-sm text-slate-500">Live cohort insights across your classes</p>
                </div>
              </div>
            </div>
            <div className="space-y-4">
              {loading ? (
                <p className="text-sm text-slate-500">
                  Checking cohort progress…
                </p>
              ) : courseProgress.length === 0 ? (
                <p className="text-sm text-slate-500">
                  No cohort data yet. Once students enroll, momentum will appear here.
                </p>
              ) : (
                courseProgress.map((course) => (
                  <div
                    key={course.courseId}
                    className="border border-slate-200 rounded-2xl p-4 bg-slate-50"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-semibold text-slate-900">
                          {course.title || "Unnamed course"}
                        </h3>
                        <p className="text-xs text-slate-500">
                          {course.students} students • {course.dueNext || "No deadline"}
                        </p>
                      </div>
                      <span className="text-sm font-semibold text-indigo-600">
                        {formatPercent(course.averageProgress)}
                      </span>
                    </div>
                    <div className="mt-3 h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-indigo-500 to-indigo-600"
                        style={{
                          width: `${Math.min(Math.round(course.averageProgress || 0), 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
            <div className="flex items-center gap-3 mb-5">
              <span className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                <TrendingUp className="w-5 h-5" />
              </span>
              <div>
                <h2 className="text-xl font-semibold text-slate-900">
                  Top performers
                </h2>
                <p className="text-sm text-slate-500">
                  Gamification leaders and streak champions
                </p>
              </div>
            </div>
            <div className="space-y-4">
              {loading ? (
                <p className="text-sm text-slate-500">Loading leaderboard…</p>
              ) : topPerformers.length === 0 ? (
                <p className="text-sm text-slate-500">
                  Encourage students to complete quests to populate the leaderboard.
                </p>
              ) : (
                topPerformers.map((leader, index) => (
                  <div
                    key={`${leader.id ?? leader.name}-${index}`}
                    className="flex items-center justify-between border border-slate-200 rounded-2xl px-4 py-3"
                  >
                    <div>
                      <p className="font-semibold text-slate-900">
                        {leader.name}
                      </p>
                      <p className="text-xs text-slate-500">
                        {leader.completedQuests} quests • {leader.streak} day streak
                      </p>
                    </div>
                    <span className="text-sm font-semibold text-emerald-600">
                      {leader.coins} coins
                    </span>
                  </div>
                ))
              )}
            </div>
            <div className="mt-6 bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-4 text-sm text-slate-500 flex items-center gap-3">
              <Users className="w-5 h-5 text-slate-400" />
              Share targeted feedback with learners who are slipping behind to keep the cohort on track.
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
