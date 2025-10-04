import React from 'react';
import { Search, Bell } from 'lucide-react';

/* StudentHeader
 * Props:
 *  - leftOffset: number (pixels to offset from left due to collapsible sidebar)
 *  - notificationCount: number
 *  - onOpenNotifications: () => void
 *  - profile: object with at least { name }
 *  - onLogout: () => void
 */
export default function StudentHeader({
  leftOffset = 0,
  notificationCount = 0,
  onOpenNotifications,
  profile,
  onLogout,
}) {
  return (
    <header
      className="fixed top-0 right-0 bg-white border-b border-slate-200 z-10"
      style={{ left: leftOffset, transition: 'left .3s ease' }}
    >
      <div className="max-w-7xl mx-auto w-full px-8 py-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
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
            onClick={onOpenNotifications}
            className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-500 hover:text-indigo-600"
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5" />
            {notificationCount ? (
              <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[10px] font-semibold text-white">
                {notificationCount > 9 ? '9+' : notificationCount}
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
            {profile?.name?.slice(0, 1)?.toUpperCase() || 'A'}
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
  );
}
