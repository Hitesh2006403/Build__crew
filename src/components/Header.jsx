import { useState, useRef, useEffect } from 'react';

export default function Header({ 
  onOpenMobileNav,
  activeView,
  searchQuery, 
  setSearchQuery, 
  onSearchFocus,
  notificationCount = 0,
  notifications = [],
  onMarkRead,
  onMarkAllRead,
  onNavigateProfile,
  onNavigateInvitations,
  onNavigateApplications,
  currentUser,
  onLogout,
  onOpenAdminDashboard,
  onNavigateHome
}) {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const notificationsRef = useRef(null);
  const userMenuRef = useRef(null);

  const avatarLetter = (currentUser?.name || '').trim().charAt(0).toUpperCase() || 'U';

  // Close notifications or profile dropdown when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (notificationsRef.current && !notificationsRef.current.contains(e.target)) {
        setShowNotifications(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setShowUserMenu(false);
      }
    };

    if (showNotifications || showUserMenu) {
      document.addEventListener('mousedown', handleOutsideClick);
      document.addEventListener('touchstart', handleOutsideClick);
    }

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
    };
  }, [showNotifications, showUserMenu]);

  const handleInputChange = (e) => {
    setSearchQuery(e.target.value);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && onSearchFocus) {
      onSearchFocus();
    }
  };

  const handleClear = () => {
    setSearchQuery('');
  };

  return (
    <header className="fixed top-0 left-0 lg:left-72 right-0 h-16 bg-surface/90 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)] z-40 flex items-center justify-between px-3 sm:px-4 lg:px-space-lg">
      {/* Left: Mobile Menu, Logo & Search */}
      <div className="flex items-center gap-2 sm:gap-space-md min-w-0 flex-1 sm:flex-initial">
        {/* Mobile Hamburger Button */}
        <button
          type="button"
          onClick={onOpenMobileNav}
          className="lg:hidden p-2 -ml-1 rounded-xl text-on-surface hover:bg-surface-container flex items-center justify-center shrink-0 cursor-pointer"
          aria-label="Open Navigation Menu"
        >
          <span className="material-symbols-outlined text-2xl">menu</span>
        </button>

        {/* Mobile Brand Icon */}
        <div 
          onClick={onNavigateHome || onNavigateProfile}
          className="flex lg:hidden items-center gap-1.5 cursor-pointer shrink-0"
        >
          <img 
            alt="BuildCrew" 
            className="w-7 h-7 rounded-lg object-contain shrink-0" 
            src="/buildcrew-logo.png"
          />
        </div>

        {/* Responsive Search Input */}
        <div className="relative flex items-center w-full max-w-[130px] xs:max-w-[180px] sm:max-w-xs md:w-84 group">
          <span className="material-symbols-outlined absolute left-2.5 sm:left-3 text-on-surface-variant text-base sm:text-lg pointer-events-none group-focus-within:text-secondary transition-colors">
            search
          </span>
          <input 
            type="text"
            value={searchQuery || ''}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            className="w-full pl-8 sm:pl-9 pr-7 sm:pr-9 py-1.5 sm:py-2 bg-surface-container-lowest text-on-surface placeholder:text-on-surface-variant font-body-sm text-xs sm:text-sm rounded-xl outline-none shadow-[0_1px_3px_rgba(15,23,42,0.04)] focus:shadow-[0_0_0_2px_rgba(0,81,213,0.3)] border border-transparent focus:border-secondary/20 transition-all truncate" 
            placeholder="Search projects..." 
          />
          {searchQuery ? (
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-2 text-on-surface-variant hover:text-on-surface p-1 transition-colors cursor-pointer"
              title="Clear search"
            >
              <span className="material-symbols-outlined text-xs sm:text-sm">close</span>
            </button>
          ) : null}
        </div>

        {(currentUser?.university || currentUser?.college) && (
          <div className="hidden xl:flex items-center gap-1.5 px-space-sm py-1 rounded-full bg-surface-container text-on-surface font-label-md text-label-md select-none shrink-0 truncate max-w-xs">
            <span className="material-symbols-outlined text-secondary text-base leading-none shrink-0">school</span>
            <span className="truncate">{currentUser.university || currentUser.college}</span>
          </div>
        )}
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

          {/* Notifications Button */}
        <div className="relative" ref={notificationsRef}>
          <button 
            aria-label="Notifications" 
            onClick={() => setShowNotifications(!showNotifications)}
            className={`relative w-9 h-9 flex items-center justify-center rounded-xl text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-all cursor-pointer ${showNotifications ? 'bg-surface-container text-secondary' : ''}`}
          >
            <span className="material-symbols-outlined text-xl">notifications</span>
            {notificationCount > 0 && (
              <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-secondary"></span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-84 bg-surface-container-lowest rounded-2xl shadow-xl border border-surface-container-high p-space-md z-50 animate-modal max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-2 border-b border-surface-container-low mb-3">
                <span className="font-title-sm text-title-sm font-bold text-on-surface">Notifications</span>
                <div className="flex items-center gap-2">
                  <span className="font-label-sm text-label-sm text-secondary font-semibold">
                    {notificationCount} new
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

              {/* Standard Platform Notifications from MongoDB */}
              <div className="space-y-2.5 text-body-sm">
                {notifications.length === 0 ? (
                  <div className="py-6 text-center text-on-surface-variant text-xs">
                    <span className="material-symbols-outlined text-2xl text-outline mb-1">notifications_none</span>
                    <p>No new notifications</p>
                  </div>
                ) : (
                  notifications.map((n, idx) => (
                    <div
                      key={n._id || idx}
                      onClick={() => {
                        if (onMarkRead) onMarkRead(n._id);
                        if (n.type === 'application_received' && onNavigateApplications) {
                          setShowNotifications(false);
                          onNavigateApplications('received');
                        } else if ((n.type === 'application_rejected' || n.type === 'application_accepted') && onNavigateApplications) {
                          setShowNotifications(false);
                          onNavigateApplications('sent');
                        } else if (n.type === 'invitation_received' && onNavigateInvitations) {
                          setShowNotifications(false);
                          onNavigateInvitations();
                        }
                      }}
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
                      <p className="text-on-surface-variant text-body-sm">
                        {n.message}
                      </p>
                      {n.reason && (
                        <p className="text-xs text-on-surface-variant/85 mt-1 pl-2 border-l-2 border-secondary/40">
                          {n.reason}
                        </p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <div className="h-5 w-px bg-surface-container-high mx-1"></div>

        {/* Profile Avatar Button & Menu */}
        <div className="relative" ref={userMenuRef}>
          <button 
            type="button"
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="w-8 h-8 rounded-full bg-secondary/15 text-secondary font-bold text-xs flex items-center justify-center shadow-xs hover:ring-2 hover:ring-secondary/40 transition-all select-none cursor-pointer focus:outline-none overflow-hidden shrink-0"
            aria-label="User Profile Menu"
          >
            {(currentUser?.avatar || currentUser?.profileImage) ? (
              <img 
                src={currentUser.avatar || currentUser.profileImage} 
                alt="" 
                className="w-full h-full object-cover rounded-full shrink-0"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  if (e.currentTarget.nextElementSibling) {
                    e.currentTarget.nextElementSibling.style.display = 'flex';
                  }
                }}
              />
            ) : null}
            <span style={{ display: (currentUser?.avatar || currentUser?.profileImage) ? 'none' : 'flex' }} className="items-center justify-center w-full h-full">
              {avatarLetter}
            </span>
          </button>

          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-64 bg-surface-container-lowest rounded-2xl shadow-xl border border-surface-container-high p-3 z-50 animate-modal">
              <div className="p-2.5 rounded-xl bg-surface-container-low mb-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-secondary/15 text-secondary font-bold text-xs flex items-center justify-center shrink-0 overflow-hidden">
                    {(currentUser?.avatar || currentUser?.profileImage) ? (
                      <img src={currentUser.avatar || currentUser.profileImage} alt="" className="w-full h-full object-cover rounded-full" />
                    ) : avatarLetter}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-on-surface truncate">{currentUser?.name || 'Account'}</span>
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
                </div>
              </div>

              <div className="space-y-1 text-xs">
                {currentUser?.role === 'admin' && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setShowUserMenu(false);
                        if (onOpenAdminDashboard) onOpenAdminDashboard('hackathons');
                      }}
                      className="w-full text-left px-3 py-2 rounded-xl hover:bg-surface-container font-semibold text-secondary flex items-center gap-2 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-base">admin_panel_settings</span>
                      <span>Manage Hackathons</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowUserMenu(false);
                        if (onOpenAdminDashboard) onOpenAdminDashboard('teams');
                      }}
                      className="w-full text-left px-3 py-2 rounded-xl hover:bg-surface-container font-semibold text-secondary flex items-center gap-2 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-base">diversity_3</span>
                      <span>Manage Teams</span>
                    </button>
                  </>
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
