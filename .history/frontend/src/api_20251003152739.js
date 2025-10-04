// Centralized API client for frontend with auth token support
const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8080/api";

let authToken = null;

export function setAuthToken(token) {
  authToken = token;
}

export function clearAuthToken() {
  authToken = null;
}

async function http(path, options = {}) {
  const { auth = true, headers = {}, body, ...rest } = options;
  const finalHeaders = { ...headers };

  if (body !== undefined && !finalHeaders["Content-Type"]) {
    finalHeaders["Content-Type"] = "application/json";
  }

  if (auth && authToken) {
    finalHeaders.Authorization = `Bearer ${authToken}`;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...rest,
    headers: finalHeaders,
    body,
  });

  const text = await response.text().catch(() => "");
  let data = null;

  if (text) {
    try {
      data = JSON.parse(text);
    } catch (err) {
      data = text;
    }
  }

  if (!response.ok) {
    const message = data?.error || data?.message || (typeof data === "string" ? data : null) || `Request failed: ${response.status}`;
    const error = new Error(message);
    error.status = response.status;
    error.payload = data;
    throw error;
  }

  return data;
}

const buildQuery = (params) => {
  const query = new URLSearchParams();
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    query.append(key, value);
  });
  const queryString = query.toString();
  return queryString ? `?${queryString}` : "";
};

export const api = {
  health: () => http("/health", { auth: false }),
  login: (email, password) =>
    http("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
      auth: false,
    }),
  getMe: () => http("/me"),
  getUser: (id) => http(`/user/${id}`),
  getQuests: (params) => {
    const query = typeof params === "number" ? buildQuery({ user_id: params }) : buildQuery(params);
    return http(`/quests${query}`);
  },
  completeQuest: (questId, payload = {}) =>
    http(`/quests/${questId}/complete`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  getLeaderboard: (limit) => {
    const query = buildQuery(limit ? { limit } : undefined);
    return http(`/leaderboard${query}`);
  },
  getPolls: () => http("/polls"),
  voteOnPoll: (pollId, optionIndex, payload = {}) =>
    http(`/polls/${pollId}/vote`, {
      method: "POST",
      body: JSON.stringify({ option_index: optionIndex, ...payload }),
    }),
  aiChat: (message) =>
    http("/ai/chat", {
      method: "POST",
      body: JSON.stringify({ message }),
    }),
  getStudentDashboard: (params) => {
    const query = buildQuery(params);
    return http(`/student/dashboard${query}`);
  },
  getAdminOverview: () => http("/admin/overview"),
  getFacultyOverview: () => http("/faculty/overview"),
};

export default api;
