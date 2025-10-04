import React from 'react';

export default function NotificationsModal({ notifications, actionableCount, loading, onClose, onGoToAdvisor }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 px-4" onClick={e => { if(e.target===e.currentTarget) onClose(); }}>
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Notifications</h2>
            <p className="text-sm text-slate-500">{actionableCount ? `${actionableCount} update${actionableCount>1?'s':''}` : 'No updates'}</p>
          </div>
          <button onClick={onClose} className="h-8 w-8 inline-flex items-center justify-center rounded-full border border-slate-200 text-slate-500 hover:text-slate-700">✕</button>
        </div>
        <div className="max-h-72 overflow-y-auto px-6 py-5 space-y-3 text-sm">
          {loading && !notifications.length && <div className="text-slate-400">Loading…</div>}
          {notifications.map(n => (
            <div key={n.id} className="rounded-2xl bg-slate-50 px-4 py-3">
              <p className="font-semibold text-slate-800">{n.title}</p>
              <p className="text-xs text-slate-500 mt-1">{n.body}</p>
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-3 border-t border-slate-100 bg-slate-50 px-6 py-4">
          <button onClick={onGoToAdvisor} className="rounded-2xl bg-indigo-600 text-white px-5 py-3 text-sm font-semibold hover:bg-indigo-500">Ask AI Advisor</button>
          <button onClick={onClose} className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-600 hover:border-slate-300">Close</button>
        </div>
      </div>
    </div>
  );
}
