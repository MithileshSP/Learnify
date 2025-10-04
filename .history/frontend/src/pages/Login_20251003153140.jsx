import { useState } from "react";
import { BookOpen, Loader2, Lock, Mail } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";

const sampleAccounts = [
  { role: "Student", email: "alex@learnonline.edu", password: "student123" },
  { role: "Faculty", email: "meera@learnonline.edu", password: "faculty123" },
  { role: "Admin", email: "admin@learnonline.edu", password: "admin123" },
];

export default function Login() {
  const { login, loading } = useAuth();
  const [email, setEmail] = useState(sampleAccounts[0].email);
  const [password, setPassword] = useState(sampleAccounts[0].password);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!email || !password) {
      setError("Please enter your email and password.");
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
    } catch (err) {
      const message = err?.message || "Invalid credentials";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const fillCredentials = (account) => {
    setEmail(account.email);
    setPassword(account.password);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white/15 backdrop-blur rounded-3xl p-8 text-white shadow-xl border border-white/20">
          <div className="flex items-center space-x-3 mb-6">
            <BookOpen className="w-10 h-10" />
            <div>
              <h1 className="text-3xl font-bold">LearnOnline Portal</h1>
              <p className="text-white/70">Sign in to continue your learning journey</p>
            </div>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit}>
            <label className="block">
              <span className="text-sm font-medium text-white/80">Institution Email</span>
              <div className="mt-2 relative">
                <Mail className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-white/60" />
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="w-full bg-white/10 border border-white/20 rounded-2xl py-3 pl-12 pr-4 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-white/50"
                  placeholder="you@learnonline.edu"
                  autoComplete="email"
                />
              </div>
            </label>

            <label className="block">
              <span className="text-sm font-medium text-white/80">Password</span>
              <div className="mt-2 relative">
                <Lock className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-white/60" />
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="w-full bg-white/10 border border-white/20 rounded-2xl py-3 pl-12 pr-4 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-white/50"
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
              </div>
            </label>

            {error ? (
              <div className="bg-red-500/20 border border-red-500/40 text-red-100 rounded-2xl px-4 py-3 text-sm">
                {error}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={submitting || loading}
              className="w-full flex items-center justify-center space-x-2 bg-white text-purple-600 font-semibold rounded-2xl py-3 transition hover:bg-purple-50 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {submitting || loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Signing in…</span>
                </>
              ) : (
                <span>Sign in</span>
              )}
            </button>
          </form>
        </div>

        <div className="bg-white rounded-3xl p-8 shadow-xl border border-black/5">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Access Accounts</h2>
          <p className="text-sm text-gray-500 mb-6">
            Use one of the demo accounts below to explore student, faculty, or admin experiences. Click to autofill credentials.
          </p>
          <div className="space-y-4">
            {sampleAccounts.map((account) => (
              <button
                type="button"
                key={account.role}
                onClick={() => fillCredentials(account)}
                className="w-full text-left p-4 rounded-2xl border border-gray-200 hover:border-purple-300 hover:shadow transition"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm uppercase tracking-wide text-purple-500 font-semibold">{account.role}</p>
                    <p className="text-gray-900 font-medium">{account.email}</p>
                  </div>
                  <span className="text-sm text-gray-500">{account.password}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
