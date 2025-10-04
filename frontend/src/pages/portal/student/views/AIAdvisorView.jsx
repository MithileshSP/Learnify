import React, { useRef, useEffect, useState } from 'react';

export default function AIAdvisorView({ messages, onSend, loading, cooldownSeconds, ..._unused }) {
  // _unused holds profile, metrics, courses, quests, notifications, insights for future implementation
  void _unused; // silence unused warning for now
  const [draft, setDraft] = useState('');
  const endRef = useRef(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, loading]);
  return (
    <div className="rounded-3xl border border-slate-100 bg-white p-8 shadow-sm flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">AI Advisor (placeholder)</h1>
      <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
        {messages.map(m => (
          <div key={m.id} className={`text-sm ${m.role === 'user' ? 'text-indigo-600' : 'text-slate-700'}`}>{m.content}</div>
        ))}
        {loading && <div className="text-xs text-slate-400">Thinking…</div>}
        <div ref={endRef} />
      </div>
      <form onSubmit={e => { e.preventDefault(); if(!draft.trim()) return; onSend(draft); setDraft(''); }} className="flex gap-3">
        <input value={draft} onChange={e=>setDraft(e.target.value)} placeholder="Ask something…" className="flex-1 rounded-full border border-slate-200 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200" />
        <button disabled={!draft.trim() || loading || cooldownSeconds>0} className="rounded-full bg-indigo-600 text-white px-5 py-2 text-sm font-semibold disabled:bg-slate-300">Send</button>
      </form>
      {cooldownSeconds>0 && <p className="text-xs text-slate-500">Cooldown: {cooldownSeconds}s</p>}
      <div className="text-xs text-slate-400">Placeholder AIAdvisorView. Implement full chat UI & insights panel later.</div>
    </div>
  );
}
