import React from 'react';

/* Sidebar for Student Portal
 * Props:
 *  - links: array { id, label, icon }
 *  - activeSection: string
 *  - onSelect: (id) => void
 *  - expanded: boolean
 *  - onExpandChange: (boolean) => void (handled via hover in parent or sidebar)
 *  - isLarge: boolean (lg breakpoint matched)
 *  - width: number (current sidebar width in px)
 */
export default function StudentSidebar({
  links = [],
  activeSection,
  onSelect,
  expanded,
  setExpanded,
  isLarge,
  width,
}) {
  return (
    <aside
      className="hidden lg:flex fixed left-0 top-0 bottom-0 flex-col border-r border-slate-200 bg-white/90 backdrop-blur z-20 transition-all duration-300"
      style={{ width: isLarge ? width : 0 }}
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
    >
      <div
        className={`border-b border-slate-100 flex items-center ${
          expanded ? 'px-6 py-8' : 'px-4 py-6 justify-center'
        } transition-all duration-300`}
      >
        <div className="text-2xl font-semibold text-indigo-600 select-none">
          {expanded ? 'LearnOnline' : 'L'}
        </div>
      </div>
      <nav
        className={`flex-1 space-y-1 transition-all duration-300 ${
          expanded ? 'px-4 py-6' : 'px-2 py-4'
        }`}
      >
        {links.map((link) => {
          const { id, label, icon: Icon } = link;
          const active = activeSection === id;
          return (
            <button
              key={id}
              type="button"
              title={label}
              onClick={() => onSelect(id)}
              className={`w-full flex items-center rounded-xl ${
                expanded ? 'gap-3 px-4' : 'justify-center px-0'
              } py-3 text-sm font-medium transition-colors duration-200 ${
                active
                  ? 'bg-indigo-50 text-indigo-600'
                  : 'text-slate-500 hover:bg-slate-100'
              }`}
            >
              <Icon className="w-5 h-5 shrink-0" />
              <span
                className={`whitespace-nowrap transition-all duration-200 overflow-hidden ${
                  expanded ? 'opacity-100 ml-1' : 'opacity-0 w-0 ml-0'
                }`}
              >
                {label}
              </span>
            </button>
          );
        })}
      </nav>
      <div
        className={`border-t border-slate-100 text-sm text-slate-500 transition-all duration-300 ${
          expanded ? 'px-6 py-6' : 'px-2 py-4 text-center'
        }`}
      >
        {expanded ? (
          <>
            <p className="font-medium text-slate-700">Support</p>
            <p className="mt-1">Need help? Reach out to your mentor anytime.</p>
          </>
        ) : (
          <p className="font-medium text-slate-600">?</p>
        )}
      </div>
    </aside>
  );
}
