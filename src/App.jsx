import { useState, useEffect, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import CommandPalette from './components/CommandPalette';
import PostProjectModal from './components/PostProjectModal';
import QuickApplyModal from './components/QuickApplyModal';

import DiscoverProjects from './views/DiscoverProjects';
import ProjectDetails from './views/ProjectDetails';
import Hackathons from './views/Hackathons';
import FindBuilders from './views/FindBuilders';
import MyApplications from './views/MyApplications';
import MyProjects from './views/MyProjects';
import Profile from './views/Profile';
import Auth from './views/Auth';
import AdminDashboard from './views/AdminDashboard';
import AccessDenied from './views/AccessDenied';

import authApi from './api/auth';
import projectsApi from './api/projects';
import hackathonsApi from './api/hackathons';
import usersApi from './api/users';
import applicationsApi from './api/applications';
import invitationsApi from './api/invitations';
import notificationsApi from './api/notifications';

export default function App() {
  // Authentication & Role Routing state
  const [currentUser, setCurrentUser] = useState(null);
  const [activeView, setActiveView] = useState('discover-projects');
  const [viewingProfileUserId, setViewingProfileUserId] = useState(null);

  // Backend Hydrated States from MongoDB Atlas
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [hackathons, setHackathons] = useState([]);
  const [squadWins, setSquadWins] = useState([]);
  const [builders, setBuilders] = useState([]);
  const [applications, setApplications] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [pendingInvitations, setPendingInvitations] = useState([]);
  const [hackathonSquads, setHackathonSquads] = useState([]);
  const [isBackendLoading, setIsBackendLoading] = useState(true);
  const [backendError, setBackendError] = useState(null);

  // Modals state
  const [quickApplyProject, setQuickApplyProject] = useState(null);
  const [isPostProjectOpen, setIsPostProjectOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Opening Splash Screen State
  const [showSplash, setShowSplash] = useState(true);
  const [isSplashFading, setIsSplashFading] = useState(false);

  // Splash Screen Lifecycle: Show for 1.8s then smoothly fade out over 700ms
  useEffect(() => {
    const fadeTimer = setTimeout(() => {
      setIsSplashFading(true);
    }, 1800);

    const removeTimer = setTimeout(() => {
      setShowSplash(false);
    }, 2500);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(removeTimer);
    };
  }, []);

  // Toast notification
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // =========================================================================
  // 🔌 Fetch Platform Data from MongoDB API
  // =========================================================================
  const fetchHackathons = useCallback(async () => {
    try {
      const data = await hackathonsApi.getHackathons();
      if (Array.isArray(data)) {
        setHackathons(data);
      }
    } catch (err) {
      console.warn('Could not fetch hackathons from MongoDB:', err);
    }
  }, []);

  const fetchProjects = useCallback(async () => {
    try {
      const data = await projectsApi.getProjects();
      const loaded = Array.isArray(data) ? data : (data.projects || []);
      setProjects(loaded);
      setSelectedProject(prev => {
        if (!prev) return loaded.length > 0 ? loaded[0] : null;
        const updated = loaded.find(p => String(p._id || p.id) === String(prev._id || prev.id));
        return updated || prev;
      });
    } catch (err) {
      console.warn('Could not fetch projects from MongoDB:', err);
    }
  }, []);

  const fetchBuilders = useCallback(async () => {
    try {
      const data = await usersApi.getUsers();
      setBuilders(Array.isArray(data) ? data : []);
    } catch (err) {
      console.warn('Could not fetch builders from MongoDB:', err);
    }
  }, []);

  const fetchUserData = useCallback(async () => {
    try {
      const [appsRes, notifsRes, invsRes] = await Promise.allSettled([
        applicationsApi.getApplications(),
        notificationsApi.getNotifications(),
        invitationsApi.getMyInvitations()
      ]);

      if (appsRes.status === 'fulfilled' && Array.isArray(appsRes.value)) {
        setApplications(appsRes.value);
      }
      if (notifsRes.status === 'fulfilled' && Array.isArray(notifsRes.value)) {
        setNotifications(notifsRes.value);
      }
      if (invsRes.status === 'fulfilled' && invsRes.value) {
        const received = Array.isArray(invsRes.value.received) ? invsRes.value.received : [];
        setPendingInvitations(received.filter(inv => inv.status === 'pending'));
      }
    } catch (err) {
      console.warn('Could not load user data from backend:', err);
    }
  }, []);

  // Hydrate session and initial MongoDB platform data on mount
  useEffect(() => {
    let isMounted = true;

    // Safety timeout: ensure loading screen is never stuck
    const safetyTimer = setTimeout(() => {
      if (isMounted) {
        setIsBackendLoading(false);
      }
    }, 3000);

    const initializeSessionAndData = async () => {
      try {
        setIsBackendLoading(true);
        setBackendError(null);

        // 1. Session Re-hydration from JWT if token is stored
        let authenticatedUser = null;
        const storedToken = authApi.getToken();
        if (storedToken) {
          try {
            const authData = await authApi.getMe();
            if (authData?.user) {
              authenticatedUser = authData.user;
              if (isMounted) {
                setCurrentUser(authenticatedUser);
                if (authenticatedUser.role === 'admin') {
                  setActiveView('admin-dashboard');
                } else {
                  setActiveView('discover-projects');
                }
              }
            }
          } catch {
            // Expired or invalid token - clear session cleanly
            authApi.logout();
          }
        }

        // 2. Fetch initial platform data from MongoDB Atlas
        try {
          const res = await fetch('http://localhost:5000/api/bootstrap');
          if (res.ok) {
            const payload = await res.json();
            const data = payload.data || {};
            if (isMounted) {
              const loadedProjects = Array.isArray(data.projects) ? data.projects : [];
              setProjects(loadedProjects);
              setSelectedProject(prev => prev || (loadedProjects.length > 0 ? loadedProjects[0] : null));
              setHackathons(Array.isArray(data.hackathons) ? data.hackathons : []);
              setSquadWins(Array.isArray(data.squadWins) ? data.squadWins : []);
              setBuilders(Array.isArray(data.builders) ? data.builders : []);
              setHackathonSquads(Array.isArray(data.hackathonSquads) ? data.hackathonSquads : []);
            }
          } else {
            await Promise.allSettled([
              fetchProjects(),
              fetchHackathons(),
              fetchBuilders()
            ]);
          }
        } catch {
          await Promise.allSettled([
            fetchProjects(),
            fetchHackathons(),
            fetchBuilders()
          ]);
        }

        // 3. If authenticated, fetch user applications, notifications, and invitations
        if (authenticatedUser && isMounted) {
          try {
            await fetchUserData();
          } catch {
            // Silently continue
          }
        }

      } catch (err) {
        console.error('Platform initialization failed:', err);
      } finally {
        if (isMounted) {
          setIsBackendLoading(false);
        }
      }
    };

    initializeSessionAndData();

    return () => {
      isMounted = false;
      clearTimeout(safetyTimer);
    };
  }, []);

  // Auth Handlers
  const handleLoginSuccess = async (user) => {
    setCurrentUser(user);
    if (user.role === 'admin') {
      setActiveView('admin-dashboard');
      showToast(`Welcome to BuildCrew Admin Console, ${user.name}!`);
    } else {
      setActiveView('discover-projects');
      showToast(`Welcome back to campus circuit, ${user.name}!`);
    }
    // Refresh user-specific data from MongoDB
    await fetchUserData();
    await fetchHackathons();
    await fetchProjects();
  };

  const handleLogout = () => {
    authApi.logout();
    setCurrentUser(null);
    setActiveView('discover-projects');
    setApplications([]);
    setNotifications([]);
    showToast('Signed out of BuildCrew session.');
  };

  const handleUpdateUser = (updatedUser) => {
    setCurrentUser(updatedUser);
    try {
      localStorage.setItem('buildcrew_user', JSON.stringify(updatedUser));
    } catch (e) {
      console.warn('Failed to cache user session:', e);
    }
    showToast('Profile updated successfully in MongoDB!');
  };

  // Hackathons management
  const handleAddHackathon = async (newHack) => {
    try {
      const res = await hackathonsApi.createHackathon(newHack);
      const savedHack = res.hackathon || res;
      setHackathons(prev => [savedHack, ...prev]);
      showToast(`Hackathon "${savedHack.title}" submitted to circuit registry!`);
    } catch (err) {
      console.error('Failed to create hackathon:', err);
      showToast(`Error creating hackathon: ${err.message}`);
    }
  };

  const handleUpdateHackathons = (newHackathons) => {
    const list = typeof newHackathons === 'function' ? newHackathons(hackathons) : newHackathons;
    setHackathons(list);
  };

  // Nav actions
  const handleViewProfile = (userId) => {
    setViewingProfileUserId(userId);
    setActiveView('profile');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNavigateView = (view) => {
    if (view === 'profile' || view === 'settings') {
      setViewingProfileUserId(null);
    }
    setActiveView(view);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectProject = (proj) => {
    setSelectedProject(proj);
    setActiveView('project-details');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectProjectById = (id) => {
    const found = projects.find(p => (p._id === id || p.id === id));
    if (found) {
      handleSelectProject(found);
    } else {
      setActiveView('discover-projects');
    }
  };

  const handleQuickApply = (proj) => {
    setQuickApplyProject(proj);
  };

  const handleApplySuccess = async (newApp) => {
    try {
      const targetId = newApp.projectId;
      const res = await applicationsApi.applyToProject({
        projectId: targetId,
        requestedRole: newApp.role || 'Core Contributor',
        message: newApp.note || 'Applying to collaborate on project.',
      });
      const savedApp = res.application || newApp;
      setApplications(prev => [savedApp, ...prev]);
      showToast(`Application sent for ${newApp.role} in ${newApp.projectTitle || 'project'}!`);
      // Re-sync projects and notifications from MongoDB
      fetchProjects();
      fetchUserData();
    } catch (err) {
      console.error('Apply error:', err);
      showToast(err.message || 'Application could not be submitted');
    }
  };

  const handleAddProject = async (newProj) => {
    try {
      const res = await projectsApi.createProject(newProj);
      const savedProj = res.project || res;
      setProjects(prev => [savedProj, ...prev]);
      setSelectedProject(savedProj);
      setActiveView('project-details');
      showToast(`Project "${savedProj.title}" launched successfully in MongoDB!`);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      console.error('Failed to create project:', err);
      showToast(`Project creation failed: ${err.message}`);
    }
  };

  const handleInviteBuilder = async (inviteData) => {
    try {
      let payload;
      if (typeof inviteData === 'object' && inviteData.receiverId) {
        payload = inviteData;
      } else {
        const receiverId = typeof inviteData === 'object' ? (inviteData._id || inviteData.id) : inviteData;
        const role = (typeof inviteData === 'object' ? (inviteData.roleTitle || inviteData.role) : '') || 'Core Contributor';
        payload = {
          receiverId,
          role,
          message: 'Join our squad on BuildCrew!'
        };
      }

      if (!payload.receiverId) {
        showToast('Invalid builder ID for invitation');
        return;
      }

      const res = await invitationsApi.sendInvitation(payload);
      showToast(res.message || 'Invitation sent successfully in MongoDB!');
      await fetchUserData();
    } catch (err) {
      console.error('Invitation error:', err);
      showToast(err.message || 'Invitation error');
    }
  };

  const handleAcceptInvitation = async (invitationId) => {
    try {
      const res = await invitationsApi.respondInvitation(invitationId, 'accepted');
      showToast('Invitation accepted! You have joined the squad.');
      await Promise.allSettled([
        fetchUserData(),
        fetchProjects(),
        fetchHackathons()
      ]);
    } catch (err) {
      console.error('Accept invitation error:', err);
      showToast(err.message || 'Failed to accept invitation');
    }
  };

  const handleRejectInvitation = async (invitationId) => {
    try {
      await invitationsApi.respondInvitation(invitationId, 'rejected');
      showToast('Invitation declined.');
      await fetchUserData();
    } catch (err) {
      console.error('Reject invitation error:', err);
      showToast(err.message || 'Failed to decline invitation');
    }
  };

  const handleAddBuilder = async (newBuilder) => {
    try {
      const res = await usersApi.createBuilder(newBuilder);
      const savedBuilder = res.builder || newBuilder;
      setBuilders(prev => [savedBuilder, ...prev]);
      showToast(`Worker / Builder "${savedBuilder.name}" added successfully in MongoDB!`);
    } catch (err) {
      console.error('Failed to create builder:', err);
      setBuilders(prev => [newBuilder, ...prev]);
      showToast(`Worker / Builder "${newBuilder.name}" added!`);
    }
  };

  // Notification actions
  const handleMarkNotificationRead = async (id) => {
    try {
      await notificationsApi.markAsRead(id);
      setNotifications(prev =>
        prev.map(n => (n._id === id ? { ...n, read: true } : n))
      );
    } catch (err) {
      console.warn('Could not mark notification as read:', err);
    }
  };

  const handleMarkAllNotificationsRead = async () => {
    try {
      await notificationsApi.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (err) {
      console.warn('Could not mark all notifications as read:', err);
    }
  };

  // If unauthenticated: render complete Auth flow
  if (!currentUser) {
    const hasToken = !!authApi.getToken();
    return (
      <div className="min-h-screen bg-background font-body-md text-on-surface antialiased relative">
        {/* Opening Splash Screen centered on clean white background */}
        {showSplash && (
          <div 
            className={`fixed inset-0 z-[9999] bg-white flex flex-col items-center justify-center transition-opacity duration-700 ease-in-out ${
              isSplashFading ? 'opacity-0 pointer-events-none' : 'opacity-100'
            }`}
          >
            <div className="flex flex-col items-center justify-center p-6 animate-splash">
              <img 
                src="/buildcrew-splash-logo.png" 
                alt="BuildCrew" 
                className="w-72 sm:w-96 max-w-[85vw] max-h-[60vh] object-contain select-none" 
              />
            </div>
          </div>
        )}

        {isBackendLoading && hasToken ? (
          <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center animate-fadeIn">
            <div className="w-12 h-12 rounded-2xl bg-secondary/20 flex items-center justify-center mb-4">
              <span className="material-symbols-outlined text-secondary text-2xl animate-spin">sync</span>
            </div>
            <h2 className="font-bold text-lg text-on-surface">Connecting to BuildCrew Backend...</h2>
            <p className="text-sm text-on-surface-variant mt-1">
              Hydrating platform state from MongoDB Atlas (buildcrew_db)
            </p>
          </div>
        ) : (
          <Auth onLoginSuccess={handleLoginSuccess} />
        )}

        {backendError && (
          <div className="fixed bottom-6 left-6 z-50 bg-error-container text-on-error-container px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2.5 font-body-sm text-body-sm">
            <span className="material-symbols-outlined text-error text-lg">error</span>
            <span>{backendError}</span>
          </div>
        )}

        {toastMessage && (
          <div className="fixed bottom-6 right-6 z-50 bg-primary text-on-primary px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2.5 font-body-sm text-body-sm animate-modal">
            <span className="material-symbols-outlined text-secondary text-lg">check_circle</span>
            <span>{toastMessage}</span>
            <button
              type="button"
              onClick={() => setToastMessage(null)}
              className="ml-2 text-on-surface-variant hover:text-on-primary cursor-pointer"
            >
              <span className="material-symbols-outlined text-base">close</span>
            </button>
          </div>
        )}
      </div>
    );
  }

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="min-h-screen bg-background text-on-surface flex flex-col font-body-md antialiased relative">
      {/* Opening Splash Screen centered on clean white background */}
      {showSplash && (
        <div 
          className={`fixed inset-0 z-[9999] bg-white flex flex-col items-center justify-center transition-opacity duration-700 ease-in-out ${
            isSplashFading ? 'opacity-0 pointer-events-none' : 'opacity-100'
          }`}
        >
          <div className="flex flex-col items-center justify-center p-6 animate-splash">
            <img 
              src="/buildcrew-splash-logo.png" 
              alt="BuildCrew" 
              className="w-72 sm:w-96 max-w-[85vw] max-h-[60vh] object-contain select-none" 
            />
          </div>
        </div>
      )}

      {/* Fixed Navigation Sidebar */}
      <Sidebar
        activeView={activeView}
        setActiveView={handleNavigateView}
        onOpenPostProject={() => setIsPostProjectOpen(true)}
        currentUser={currentUser}
        onLogout={handleLogout}
      />

      {/* Main Content Area (Offset by Sidebar: pl-72) */}
      <div className="pl-72 min-h-screen flex flex-col">
        {/* Sticky Top Header */}
        <Header
          activeView={activeView}
          onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          onSearchFocus={() => {
            if (activeView !== 'discover-projects') {
              handleNavigateView('discover-projects');
            }
          }}
          notificationCount={unreadCount}
          notifications={notifications}
          pendingInvitations={pendingInvitations}
          onAcceptInvitation={handleAcceptInvitation}
          onRejectInvitation={handleRejectInvitation}
          onMarkRead={handleMarkNotificationRead}
          onMarkAllRead={handleMarkAllNotificationsRead}
          onNavigateProfile={() => handleNavigateView('profile')}
          currentUser={currentUser}
          onLogout={handleLogout}
          onOpenAdminDashboard={() => handleNavigateView('admin-dashboard')}
        />

        {/* Dynamic View Router */}
        <main className="w-full pt-16 bg-surface min-h-screen px-space-lg py-space-lg flex-1">
          {/* Admin Hackathon Management (Protected for role='admin', AccessDenied fallback for students) */}
          {activeView === 'admin-dashboard' && (
            currentUser?.role === 'admin' ? (
              <AdminDashboard
                currentUser={currentUser}
                hackathons={hackathons}
                onUpdateHackathons={handleUpdateHackathons}
                onRefreshHackathons={fetchHackathons}
                showToast={showToast}
                onNavigate={setActiveView}
              />
            ) : (
              <AccessDenied onBack={() => setActiveView('discover-projects')} />
            )
          )}

          {activeView === 'discover-projects' && (
            <DiscoverProjects
              projects={projects}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              onSelectProject={handleSelectProject}
              onQuickApply={handleQuickApply}
            />
          )}

          {activeView === 'project-details' && selectedProject && (
            <ProjectDetails
              project={selectedProject}
              onBack={() => handleNavigateView('discover-projects')}
              onApplySuccess={handleApplySuccess}
              onViewProfile={handleViewProfile}
              currentUser={currentUser}
            />
          )}

          {activeView === 'hackathons' && (
            <Hackathons
              hackathons={hackathons.filter(h => h.isPublished !== false)}
              squadWins={squadWins}
              projects={projects}
              builders={builders}
              hackathonSquads={hackathonSquads}
              onApplySquad={handleApplySuccess}
              onInviteBuilder={handleInviteBuilder}
              onCreateSquad={handleAddProject}
              onAddHackathon={handleAddHackathon}
              showToast={showToast}
              currentUser={currentUser}
            />
          )}

          {activeView === 'find-builders' && (
            <FindBuilders
              builders={builders}
              projects={projects}
              hackathonSquads={hackathonSquads}
              pendingInvitations={pendingInvitations}
              onInvite={handleInviteBuilder}
              onViewProfile={handleViewProfile}
              showToast={showToast}
              currentUser={currentUser}
            />
          )}

          {activeView === 'my-projects' && (
            <MyProjects
              projects={projects}
              currentUser={currentUser}
              onSelectProject={handleSelectProject}
              onOpenPostProject={() => setIsPostProjectOpen(true)}
            />
          )}

          {activeView === 'my-applications' && (
            <MyApplications
              applications={applications}
              onSelectProjectById={handleSelectProjectById}
            />
          )}

          {activeView === 'my-teams' && (() => {
            const myProjectTeams = projects.filter(p => {
              if (!currentUser) return false;
              const isOwner = (p.createdBy?._id || p.createdBy) === currentUser._id;
              const isMember = Array.isArray(p.members) && p.members.some(m => (m._id || m) === currentUser._id);
              return isOwner || isMember;
            });

            const myHackTeams = hackathonSquads.filter(h => {
              if (!currentUser) return false;
              const isOwner = (h.createdBy?._id || h.createdBy) === currentUser._id;
              const isMember = Array.isArray(h.members) && h.members.some(m => (m._id || m) === currentUser._id);
              return isOwner || isMember;
            });

            const hasAnyTeams = myProjectTeams.length > 0 || myHackTeams.length > 0;

            return (
              <div className="flex flex-col w-full pb-space-xl space-y-space-lg">
                <div className="flex flex-col max-w-3xl">
                  <div className="flex items-center gap-space-xs text-secondary font-label-md text-label-md uppercase tracking-wider mb-1">
                    <span className="material-symbols-outlined text-base">diversity_3</span>
                    <span>Active Squad Pods</span>
                  </div>
                  <h1 className="font-headline-lg text-headline-lg font-bold text-on-surface tracking-tight">
                    My Teams &amp; Squads
                  </h1>
                  <p className="font-body-lg text-body-lg text-on-surface-variant mt-1">
                    Collaborate in real-time with verified squad members preparing for upcoming hackathon milestones.
                  </p>
                </div>

                {/* Pending Squad Invitations (Requirement 4 & 5) */}
                {pendingInvitations && pendingInvitations.length > 0 && (
                  <div className="bg-surface-container-lowest rounded-2xl p-space-lg shadow-sm border border-secondary/25 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-secondary text-xl">mail</span>
                        <h2 className="font-headline-sm text-lg font-bold text-on-surface">
                          Pending Squad Invitations ({pendingInvitations.length})
                        </h2>
                      </div>
                      <span className="px-2.5 py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed text-xs font-bold">
                        Action Required
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {pendingInvitations.map((inv) => {
                        const senderName = inv.sender?.name || 'A teammate';
                        const teamTitle = inv.teamName || inv.project?.title || inv.hackathonTeam?.teamName || 'the squad';
                        return (
                          <div key={inv._id} className="p-4 rounded-xl bg-surface-container-low border border-surface-container-high/60 flex flex-col justify-between space-y-3">
                            <div>
                              <div className="flex items-center justify-between text-xs text-secondary font-bold uppercase tracking-wider mb-1">
                                <span>Invitation</span>
                                <span className="text-outline font-normal">
                                  {inv.createdAt ? new Date(inv.createdAt).toLocaleDateString() : 'Recent'}
                                </span>
                              </div>
                              <h3 className="font-title-md text-base font-bold text-on-surface">
                                {senderName} invited you to join <span className="text-secondary">[{teamTitle}]</span>
                              </h3>
                              {inv.role && (
                                <p className="text-xs text-on-surface-variant mt-1">
                                  Invited Position: <strong className="text-on-surface">{inv.role}</strong>
                                </p>
                              )}
                              {inv.message && (
                                <p className="text-xs text-on-surface-variant italic mt-1 bg-surface-container-lowest/60 p-2 rounded-lg">
                                  "{inv.message}"
                                </p>
                              )}
                            </div>

                            <div className="flex items-center gap-2 pt-2 border-t border-surface-container-high/60">
                              <button
                                type="button"
                                onClick={() => handleAcceptInvitation(inv._id)}
                                className="flex-1 py-2 px-3 rounded-xl bg-primary hover:bg-surface-tint text-on-primary font-bold text-xs shadow-xs transition-all cursor-pointer flex items-center justify-center gap-1 active:scale-[0.98]"
                              >
                                <span className="material-symbols-outlined text-base">check</span>
                                <span>Accept Invitation</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRejectInvitation(inv._id)}
                                className="flex-1 py-2 px-3 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface font-semibold text-xs transition-all cursor-pointer flex items-center justify-center gap-1"
                              >
                                <span className="material-symbols-outlined text-base">close</span>
                                <span>Reject</span>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Squad Rosters: Projects & Hackathons */}
                {!hasAnyTeams && (!pendingInvitations || pendingInvitations.length === 0) ? (
                  <div className="bg-surface-container-lowest rounded-2xl p-space-xl text-center text-on-surface-variant border border-surface-container-high/40">
                    <span className="material-symbols-outlined text-4xl text-outline mb-2">diversity_3</span>
                    <p className="font-body-lg text-body-lg text-on-surface font-semibold">No active squads joined yet</p>
                    <p className="font-body-sm text-body-sm mt-1">Explore Discover Projects or Squad Up in Hackathons to join a team.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
                    {/* Project Teams */}
                    {myProjectTeams.map((p, idx) => (
                      <div key={p._id || idx} className="bg-surface-container-lowest rounded-2xl p-space-lg shadow-sm space-y-4 border border-surface-container-high/40">
                        <div className="flex items-center justify-between">
                          <span className="px-2.5 py-1 rounded-full bg-secondary-fixed text-on-secondary-fixed font-label-sm text-label-sm font-semibold">
                            {p.categoryBadge || 'Project Squad'}
                          </span>
                          <span className="font-label-sm text-label-sm text-secondary font-semibold">
                            {p.filledCount || (p.members?.length || 1)}/{p.totalCapacity || 4} Members
                          </span>
                        </div>
                        <div>
                          <h3 className="font-headline-sm text-headline-sm font-bold text-on-surface">
                            {p.title}
                          </h3>
                          <p className="font-body-sm text-body-sm text-on-surface-variant mt-1 line-clamp-2">
                            {p.tagline || p.fullDescription}
                          </p>
                        </div>
                        <div className="p-3 rounded-xl bg-surface-container-low flex items-center justify-between font-body-sm text-body-sm">
                          <span className="text-on-surface font-medium">Squad Lead</span>
                          <span className="text-secondary font-semibold">{p.lead?.name || 'Lead Architect'}</span>
                        </div>
                        <div className="flex items-center justify-end gap-2 pt-2 border-t border-surface-container-high/60">
                          <button
                            type="button"
                            onClick={() => handleSelectProject(p)}
                            className="py-2 px-4 rounded-xl bg-primary text-on-primary font-title-sm text-title-sm hover:bg-surface-tint transition-all cursor-pointer shadow-xs"
                          >
                            Open Squad Workspace
                          </button>
                        </div>
                      </div>
                    ))}

                    {/* Hackathon Teams */}
                    {myHackTeams.map((h, idx) => (
                      <div key={h._id || idx} className="bg-surface-container-lowest rounded-2xl p-space-lg shadow-sm space-y-4 border border-surface-container-high/40">
                        <div className="flex items-center justify-between">
                          <span className="px-2.5 py-1 rounded-full bg-blue-100 text-blue-900 font-label-sm text-label-sm font-semibold">
                            {h.hackathonTitle || 'Hackathon Squad'}
                          </span>
                          <span className="font-label-sm text-label-sm text-secondary font-semibold">
                            {h.filledCount || (h.members?.length || 1)}/{h.totalCapacity || 4} Members
                          </span>
                        </div>
                        <div>
                          <h3 className="font-headline-sm text-headline-sm font-bold text-on-surface">
                            {h.teamName || h.title}
                          </h3>
                          <p className="font-body-sm text-body-sm text-on-surface-variant mt-1 line-clamp-2">
                            {h.tagline || h.description || `Competing in ${h.hackathonTitle || 'Hackathon'}`}
                          </p>
                        </div>
                        <div className="p-3 rounded-xl bg-surface-container-low flex items-center justify-between font-body-sm text-body-sm">
                          <span className="text-on-surface font-medium">Squad Lead</span>
                          <span className="text-secondary font-semibold">{h.lead?.name || 'Team Lead'}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })()}

          {(activeView === 'profile' || activeView === 'settings') && (
            <Profile
              currentUser={currentUser}
              targetUserId={viewingProfileUserId}
              onBack={() => {
                setViewingProfileUserId(null);
                setActiveView('find-builders');
              }}
              onInviteBuilder={handleInviteBuilder}
              onUpdateUser={handleUpdateUser}
              showToast={showToast}
            />
          )}
        </main>
      </div>

      {/* Quick Apply Modal */}
      <QuickApplyModal
        project={quickApplyProject}
        isOpen={Boolean(quickApplyProject)}
        onClose={() => setQuickApplyProject(null)}
        onApplySuccess={handleApplySuccess}
      />

      {/* Post Project Modal */}
      <PostProjectModal
        isOpen={isPostProjectOpen}
        onClose={() => setIsPostProjectOpen(false)}
        onAddProject={handleAddProject}
        currentUser={currentUser}
      />

      {/* Command Palette (⌘K) */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        projects={projects}
        hackathons={hackathons}
        onSelectProject={handleSelectProject}
        onNavigate={(viewId) => {
          setActiveView(viewId);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      />

      {/* Floating Action Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-primary text-on-primary px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2.5 font-body-sm text-body-sm animate-modal">
          <span className="material-symbols-outlined text-secondary text-lg">check_circle</span>
          <span>{toastMessage}</span>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="ml-2 text-on-surface-variant hover:text-on-primary"
          >
            <span className="material-symbols-outlined text-base">close</span>
          </button>
        </div>
      )}
    </div>
  );
}
