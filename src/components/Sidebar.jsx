export default function Sidebar({ 
  activeView, 
  setActiveView, 
  onOpenPostProject, 
  currentUser, 
  onLogout,
  pendingInvitationsCount = 0,
  adminTab = 'hackathons',
  onSelectAdminTab
}) {
  const isAdmin = currentUser?.role === 'admin';

  const platformNav = [
    { id: 'discover-projects', label: 'Discover Projects', icon: 'explore' },
    { id: 'hackathons', label: 'Hackathons', icon: 'terminal' },
    { id: 'find-builders', label: 'Find Teammates', icon: 'group_add' },
  ];

  const myWorkNav = [
    { id: 'my-projects', label: 'My Projects', icon: 'rocket_launch' },
    { id: 'my-applications', label: 'My Applications', icon: 'assignment' },
    { id: 'invitations', label: 'Invitations', icon: 'mail', badge: pendingInvitationsCount },
    { id: 'my-teams', label: 'My Teams', icon: 'diversity_3' },
  ];

  const bottomNav = [
    { id: 'settings', label: 'Settings', icon: 'settings' },
    { id: 'profile', label: 'Profile', icon: 'account_circle' },
  ];

  const handleNavClick = (id) => {
    setActiveView(id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <aside className="fixed left-0 top-0 h-full w-72 bg-surface-container-lowest shadow-[0_1px_8px_rgba(0,0,0,0.04)] z-50 flex flex-col justify-between select-none">
      <div className="flex flex-col">
        {/* Brand / Logo */}
        <div 
          onClick={() => handleNavClick(isAdmin ? 'admin-dashboard' : 'discover-projects')}
          className="h-16 px-space-lg flex items-center gap-space-sm cursor-pointer hover:opacity-90 transition-opacity"
        >
          <img 
            alt="BuildCrew Logo" 
            className="w-8 h-8 rounded-lg object-contain shrink-0" 
            src="/buildcrew-logo.png"
          />
          <div className="flex flex-col">
            <span className="font-headline-sm text-headline-sm font-bold text-on-surface tracking-tight leading-none">
              BuildCrew
            </span>
            <span className="font-label-sm text-label-sm text-on-surface-variant">
              Student Collaboration Platform
            </span>
          </div>
        </div>

        {/* Post Project Action Button (Available to students only) */}
        {!isAdmin && (
          <div className="px-space-md py-space-sm">
            <button 
              type="button"
              onClick={onOpenPostProject}
              className="w-full flex items-center justify-center gap-space-xs py-2.5 px-space-md rounded-xl bg-primary text-on-primary font-title-sm text-title-sm shadow-[0_1px_3px_rgba(15,23,42,0.08)] hover:bg-surface-tint active:scale-[0.98] transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-lg leading-none">add_circle</span>
              <span>Post Project</span>
            </button>
          </div>
        )}

        {/* Navigation Sections */}
        <nav className="px-space-sm mt-space-xs space-y-1">
          {/* Admin Management Section (The only section visible in the Admin Panel) */}
          {isAdmin && (
            <div className="mb-2 space-y-1">
              <div className="px-space-md pt-space-xs pb-1 font-label-sm text-label-sm uppercase tracking-wider text-secondary font-bold flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">admin_panel_settings</span>
                <span>ADMIN</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (onSelectAdminTab) onSelectAdminTab('hackathons');
                  handleNavClick('admin-dashboard');
                }}
                className={`w-full flex items-center gap-space-sm px-space-md py-2.5 rounded-xl transition-all font-title-sm text-title-sm text-left ${
                  activeView === 'admin-dashboard' && adminTab === 'hackathons'
                    ? 'bg-secondary text-on-secondary font-semibold shadow-xs'
                    : 'text-secondary hover:bg-secondary-fixed/40 hover:text-on-surface font-semibold'
                }`}
              >
                <span className="material-symbols-outlined text-xl">tune</span>
                <span>Manage Hackathons</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (onSelectAdminTab) onSelectAdminTab('teams');
                  handleNavClick('admin-dashboard');
                }}
                className={`w-full flex items-center gap-space-sm px-space-md py-2.5 rounded-xl transition-all font-title-sm text-title-sm text-left ${
                  activeView === 'admin-dashboard' && (adminTab === 'teams' || adminTab === 'projects')
                    ? 'bg-secondary text-on-secondary font-semibold shadow-xs'
                    : 'text-secondary hover:bg-secondary-fixed/40 hover:text-on-surface font-semibold'
                }`}
              >
                <span className="material-symbols-outlined text-xl">diversity_3</span>
                <span>Manage Teams</span>
              </button>
            </div>
          )}

          {/* Student Platform Navigation & My Work (Hidden in Admin Panel) */}
          {!isAdmin && (
            <>
              <div className="px-space-md pt-space-xs pb-1 font-label-sm text-label-sm uppercase tracking-wider text-outline">
                Platform
              </div>
              {platformNav.map((item) => {
                const isActive = activeView === item.id || (item.id === 'discover-projects' && activeView === 'project-details');
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleNavClick(item.id)}
                    className={`w-full flex items-center gap-space-sm px-space-md py-2 rounded-xl transition-all font-title-sm text-title-sm text-left ${
                      isActive
                        ? 'bg-surface-container text-on-surface font-semibold shadow-sm'
                        : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
                    }`}
                  >
                    <span className="material-symbols-outlined text-xl">{item.icon}</span>
                    <span>{item.label}</span>
                  </button>
                );
              })}

              <div className="px-space-md pt-space-md pb-1 font-label-sm text-label-sm uppercase tracking-wider text-outline">
                My Work
              </div>
              {myWorkNav.map((item) => {
                const isActive = activeView === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleNavClick(item.id)}
                    className={`w-full flex items-center justify-between px-space-md py-2 rounded-xl transition-all font-title-sm text-title-sm text-left ${
                      isActive
                        ? 'bg-surface-container text-on-surface font-semibold shadow-sm'
                        : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
                    }`}
                  >
                    <div className="flex items-center gap-space-sm">
                      <span className="material-symbols-outlined text-xl">{item.icon}</span>
                      <span>{item.label}</span>
                    </div>
                    {item.badge > 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-secondary text-on-secondary font-bold text-xs">
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </>
          )}
        </nav>
      </div>

      {/* Bottom Nav & User Profile Footer */}
      <div className="px-space-sm pb-space-md space-y-1 bg-surface-container-lowest">
        <nav className="space-y-1">
          {bottomNav.map((item) => {
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNavClick(item.id)}
                className={`w-full flex items-center gap-space-sm px-space-md py-2 rounded-xl transition-all font-title-sm text-title-sm text-left ${
                  isActive
                    ? 'bg-surface-container text-on-surface font-semibold shadow-sm'
                    : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
                }`}
              >
                <span className="material-symbols-outlined text-xl">{item.icon}</span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* User Card */}
        <div className="pt-space-xs mt-space-xs">
          <div 
            onClick={() => handleNavClick('profile')}
            className="flex items-center gap-space-sm px-space-md py-space-sm rounded-xl bg-surface-container-low hover:bg-surface-container transition-all cursor-pointer group"
          >
            <div className="relative shrink-0">
              {currentUser?.avatar ? (
                <img 
                  alt="" 
                  className="w-9 h-9 rounded-full object-cover shadow-xs shrink-0" 
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
                className="w-9 h-9 rounded-full bg-secondary/15 text-secondary font-bold text-sm items-center justify-center shrink-0"
              >
                {(currentUser?.name || 'U').charAt(0).toUpperCase()}
              </div>
            </div>
            <div className="flex flex-col min-w-0 flex-1">
              <span className="font-title-sm text-title-sm font-semibold text-on-surface truncate leading-tight">
                {currentUser?.name || 'Student Member'}
              </span>
              <span className="font-body-sm text-body-sm text-on-surface-variant truncate leading-tight">
                {isAdmin ? (
                  <span className="text-secondary font-bold text-[11px]">Administrator</span>
                ) : (
                  currentUser?.university || currentUser?.college || 'Campus Member'
                )}
              </span>
            </div>
            {onLogout && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onLogout();
                }}
                className="text-on-surface-variant hover:text-red-600 p-1 transition-colors cursor-pointer"
                title="Sign Out"
              >
                <span className="material-symbols-outlined text-base">logout</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}
