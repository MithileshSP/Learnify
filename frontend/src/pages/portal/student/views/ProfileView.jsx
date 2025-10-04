import React from 'react';

export default function ProfileView(props) {
  const { onLogout } = props;
  return (
    <div className="rounded-3xl border border-slate-100 bg-white p-8 shadow-sm">
      <h1 className="text-2xl font-semibold mb-4">Profile (placeholder)</h1>
      <p className="text-sm text-slate-500 mb-4">Placeholder ProfileView component. Show user details, settings, and preferences here.</p>
      <button onClick={onLogout} className="rounded-full bg-indigo-600 text-white px-5 py-2 text-sm font-semibold hover:bg-indigo-500">Logout</button>
    </div>
  );
}
