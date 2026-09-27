import { useState } from 'react';

export default function Header({ 
  activeView,
  searchQuery, 
  setSearchQuery,
  onSearchFocus,
  notificationCount = 0,
  notifications = [],
  pendingInvitations = [],
  onAcceptInvitation,
  onRejectInvitation,
  onMarkRead,
  onMarkAllRead,
  onNavigateProfile,
  currentUser,
  onLogout,
  onOpenAdminDashboard
}) {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showActivityFeed, setShowActivityFeed] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const handleInputChange = (e) => {
    setSearchQuery(e.target.value);
    if (onSearchFocus) {
      onSearchFocus();
    }
  };

  const handleClear = () => {
    setSearchQuery('');
  };

  return (
    <header className="fixed top-0 left-72 right-0 h-16 bg-surface/80 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)] z-40 flex items-center justify-between px-space-lg">
      {/* Left: Active Search Bar & Campus Tag */}
      <div className="flex items-center gap-space-md">
        <div className="relative flex items-center w-84 group">
          <span className="material-symbols-outlined absolute left-3 text-on-surface-variant text-lg pointer-events-none group-focus-within:text-secondary transition-colors">
            search
          </span>
          <input 
            type="text"
            value={searchQuery || ''}
            onChange={handleInputChange}
            className="w-full pl-9 pr-9 py-2 bg-surface-container-lowest text-on-surface placeholder:text-on-surface-variant font-body-sm text-body-sm rounded-xl outline-none shadow-[0_1px_3px_rgba(15,23,42,0.04)] focus:shadow-[0_0_0_2px_rgba(0,81,213,0.3)] border border-transparent focus:border-secondary/20 transition-all" 
            placeholder="Search projects, stacks, roles..." 
          />
          {searchQuery ? (
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-2.5 text-on-surface-variant hover:text-on-surface p-1 transition-colors cursor-pointer"
              title="Clear search"
            >
              <span className="material-symbols-outlined text-sm">close</span>
            </button>
          ) : null}
        </div>

        <div className="hidden lg:flex items-center gap-1.5 px-space-sm py-1 rounded-full bg-surface-container text-on-surface font-label-md text-label-md select-none">
          <span className="material-symbols-outlined text-secondary text-base leading-none">school</span>
          <span>{currentUser?.university || currentUser?.college || 'Campus Member'}</span>
          <span className="text-outline-variant">•</span>
          <span className="text-on-surface-variant font-medium">Fall 2026</span>
        </div>
      </div>

      {/* Right: Actions & Profile */}
      <div className="flex items-center gap-space-sm relative">
        {/* Admin Console Badge or Quick Switch Button */}
        {currentUser?.role === 'admin' && (
          activeView === 'admin-dashboard' ? (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-secondary/10 text-secondary border border-secondary/20 font-bold text-xs mr-1 select-none">
              <span className="material-symbols-outlined text-base">admin_panel_settings</span>
              <span>Admin Console</span>
            </div>
          ) : (
            <button
              type="button"
              onClick={onOpenAdminDashboard}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-secondary text-on-secondary font-bold text-xs shadow-xs hover:bg-secondary/90 transition-all cursor-pointer mr-1"
            >
              <span className="material-symbols-outlined text-base">admin_panel_settings</span>
              <span>Manage Hackathons</span>
            </button>
          )
        )}

        {/* Activity Feed Button */}
        <div className="relative">
          <button 
            aria-label="Activity Feed" 
            onClick={() => setShowActivityFeed(!showActivityFeed)}
            className={`w-9 h-9 flex items-center justify-center rounded-xl text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-all cursor-pointer ${showActivityFeed ? 'bg-surface-container text-secondary' : ''}`}
          >
            <span className="material-symbols-outlined text-xl">campaign</span>
          </button>

          {showActivityFeed && (
            <div className="absolute right-0 mt-2 w-80 bg-surface-container-lowest rounded-2xl shadow-xl border border-surface-container-high p-space-md z-50 animate-modal">
              <div className="flex items-center justify-between pb-2 border-b border-surface-container-low mb-3">
                <span className="font-title-sm text-title-sm font-bold text-on-surface">Campus Sprint Feed</span>
                <span className="font-label-sm text-label-sm text-secondary font-medium">Live</span>
              </div>
              <div className="space-y-3 text-body-sm text-body-sm">
                <div className="flex gap-2.5 items-start">
                  <span className="w-2 h-2 rounded-full bg-secondary mt-1.5 shrink-0"></span>
                  <div>
                    <span className="font-semibold text-on-surface">TreeHacks '26</span> track announced: Autonomous Agents with ₹15,000 bounty.
                    <span className="block text-outline text-[11px] mt-0.5">10m ago</span>
                  </div>
                </div>
                <div className="flex gap-2.5 items-start">
                  <span className="w-2 h-2 rounded-full bg-secondary mt-1.5 shrink-0"></span>
                  <div>
                    <span className="font-semibold text-on-surface">Collegiate Circuit</span> registration open across partner universities.
                    <span className="block text-outline text-[11px] mt-0.5">45m ago</span>
                  </div>
                </div>
                <div className="flex gap-2.5 items-start">
                  <span className="w-2 h-2 rounded-full bg-secondary mt-1.5 shrink-0"></span>
                  <div>
                    <span className="font-semibold text-on-surface">CalHacks 12</span> team registration opened for West Coast applicants.
                    <span className="block text-outline text-[11px] mt-0.5">2h ago</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Notifications Button */}
        <div className="relative">
          <button 
            aria-label="Notifications" 
            onClick={() => setShowNotifications(!showNotifications)}
            className={`relative w-9 h-9 flex items-center justify-center rounded-xl text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-all cursor-pointer ${showNotifications ? 'bg-surface-container text-secondary' : ''}`}
          >
            <span className="material-symbols-outlined text-xl">notifications</span>
            {(notificationCount > 0 || (pendingInvitations && pendingInvitations.length > 0)) && (
              <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-secondary"></span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-84 bg-surface-container-lowest rounded-2xl shadow-xl border border-surface-container-high p-space-md z-50 animate-modal max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-2 border-b border-surface-container-low mb-3">
                <span className="font-title-sm text-title-sm font-bold text-on-surface">Notifications</span>
                <div className="flex items-center gap-2">
                  <span className="font-label-sm text-label-sm text-secondary font-semibold">
                    {notificationCount + (pendingInvitations?.length || 0)} new
                  </span>
                  {notificationCount > 0 && onMarkAllRead && (
                    <button
                      type="button"
                      onClick={onMarkAllRead}
                      className="text-[11px] text-on-surface-variant hover:text-primary transition-colors cursor-pointer"
                    >
                      Clear all
                    </button>
                  )}
                </div>
              </div>

              {/* Pending Team Invitations (Requirement 4 & 5: Accept / Reject) */}
              {pendingInvitations && pendingInvitations.length > 0 && (
                <div className="space-y-2.5 mb-3.5 pb-3 border-b border-surface-container-low">
                  <div className="flex items-center justify-between text-xs font-bold text-secondary uppercase tracking-wider">
                    <div className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-sm">mail</span>
                      <span>Squad Invitations</span>
                    </div>
                    <span className="px-2 py-0.2 rounded-full bg-secondary-fixed text-on-secondary-fixed text-[10px] font-extrabold">
                      {pendingInvitations.length} pending
                    </span>
                  </div>

                  {pendingInvitations.map((inv) => {
                    const senderName = inv.sender?.name || 'A teammate';
                    const teamTitle = inv.teamName || inv.project?.title || inv.hackathonTeam?.teamName || 'the squad';
                    return (
                      <div key={inv._id} className="p-3 rounded-xl bg-surface-container-low border border-secondary/25 space-y-2">
                        <div className="text-xs">
                          <span className="font-bold text-on-surface">{senderName}</span>
                          <span className="text-on-surface-variant"> invited you to join </span>
                          <span className="font-bold text-secondary">[{teamTitle}]</span>
                          {inv.role && (
                            <span className="block text-[11px] text-on-surface-variant mt-0.5">Role: {inv.role}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => onAcceptInvitation && onAcceptInvitation(inv._id)}
                            className="flex-1 py-1.5 px-3 rounded-lg bg-primary hover:bg-surface-tint text-on-primary font-bold text-xs shadow-xs transition-all cursor-pointer flex items-center justify-center gap-1 active:scale-[0.98]"
                          >
                            <span className="material-symbols-outlined text-sm">check</span>
                            <span>Accept</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => onRejectInvitation && onRejectInvitation(inv._id)}
                            className="flex-1 py-1.5 px-3 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface font-semibold text-xs transition-all cursor-pointer flex items-center justify-center gap-1"
                          >
                            <span className="material-symbols-outlined text-sm">close</span>
                            <span>Reject</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Standard Platform Notifications from MongoDB */}
              <div className="space-y-2.5 text-body-sm">
                {notifications.length === 0 && (!pendingInvitations || pendingInvitations.length === 0) ? (
                  <div className="py-6 text-center text-on-surface-variant text-xs">
                    <span className="material-symbols-outlined text-2xl text-outline mb-1">notifications_none</span>
                    <p>No new notifications</p>
                  </div>
                ) : (
                  notifications.map((n, idx) => (
                    <div
                      key={n._id || idx}
                      onClick={() => onMarkRead && onMarkRead(n._id)}
                      className={`p-2.5 rounded-xl cursor-pointer transition-colors ${
                        n.read ? 'bg-surface-container-low/60 opacity-70' : 'bg-surface-container-low hover:bg-surface-container'
                      }`}
                    >
                      <div className="flex items-center justify-between text-on-surface font-semibold text-title-sm mb-1">
                        <span className="truncate pr-1">{n.title}</span>
                        <span className="text-[10px] text-outline font-normal shrink-0">
                          {n.createdAt ? new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recent'}
                        </span>
                      </div>
                      <p className="text-on-surface-variant text-body-sm line-clamp-2">
                        {n.message}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <div className="h-5 w-px bg-surface-container-high mx-1"></div>

        {/* Profile Avatar Button & Menu */}
        <div className="relative">
          <div 
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="cursor-pointer"
          >
            {currentUser?.avatar ? (
              <img 
                alt="" 
                className="w-8 h-8 rounded-full object-cover shadow-xs hover:ring-2 hover:ring-secondary/40 transition-all" 
                src={currentUser.avatar}
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  if (e.currentTarget.nextElementSibling) {
                    e.currentTarget.nextElementSibling.style.display = 'flex';
                  }
                }}
              />
            ) : null}
            <div 
              style={{ display: currentUser?.avatar ? 'none' : 'flex' }}
              className="w-8 h-8 rounded-full bg-secondary/15 text-secondary font-bold text-xs items-center justify-center shadow-xs hover:ring-2 hover:ring-secondary/40 transition-all"
            >
              {(currentUser?.name || 'U').charAt(0).toUpperCase()}
            </div>
          </div>

          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-64 bg-surface-container-lowest rounded-2xl shadow-xl border border-surface-container-high p-3 z-50 animate-modal">
              <div className="p-2.5 rounded-xl bg-surface-container-low mb-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-on-surface">{currentUser?.name || 'Account'}</span>
                  <span className={`px-2 py-0.2 rounded-full text-[10px] font-extrabold uppercase ${
                    currentUser?.role === 'admin' ? 'bg-secondary text-on-secondary' : 'bg-secondary-fixed text-on-secondary-fixed'
                  }`}>
                    {currentUser?.role === 'admin' ? 'Admin' : 'Student'}
                  </span>
                </div>
                {currentUser?.email && (
                  <div className="text-[11px] text-on-surface-variant truncate mt-0.5">
                    {currentUser.email}
                  </div>
                )}
              </div>

              <div className="space-y-1 text-xs">
                {currentUser?.role === 'admin' && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowUserMenu(false);
                      if (onOpenAdminDashboard) onOpenAdminDashboard();
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl hover:bg-surface-container font-semibold text-secondary flex items-center gap-2 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-base">admin_panel_settings</span>
                    <span>Manage Hackathons</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setShowUserMenu(false);
                    onNavigateProfile();
                  }}
                  className="w-full text-left px-3 py-2 rounded-xl hover:bg-surface-container font-medium text-on-surface flex items-center gap-2 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-base">account_circle</span>
                  <span>My Profile</span>
                </button>

                {onLogout && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowUserMenu(false);
                      onLogout();
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl hover:bg-red-50 text-red-600 font-semibold flex items-center gap-2 cursor-pointer border-t border-surface-container-high/60 mt-1 pt-1.5"
                  >
                    <span className="material-symbols-outlined text-base">logout</span>
                    <span>Sign Out</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
