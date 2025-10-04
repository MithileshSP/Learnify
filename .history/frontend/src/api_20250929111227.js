// Centralized API client for frontend
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';

async function http(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || `Request failed: ${res.status}`);
  }
  return res.json();
}

export const api = {
  health: () => http('/health'),
  getUser: (id = 1) => http(`/user/${id}`),
  getQuests: (userId = 1) => http(`/quests?user_id=${userId}`),
  completeQuest: (questId, userId = 1) =>
    http(`/quests/${questId}/complete`, {
      method: 'POST',
      body: JSON.stringify({ user_id: userId }),
    }),
  getLeaderboard: () => http('/leaderboard'),
  getPolls: () => http('/polls'),
  voteOnPoll: (pollId, optionIndex, userId = 1) =>
    http(`/polls/${pollId}/vote`, {
      method: 'POST',
      body: JSON.stringify({ option_index: optionIndex, user_id: userId }),
    }),
  aiChat: (message) =>
    http('/ai/chat', { method: 'POST', body: JSON.stringify({ message }) }),
};

export default api;
