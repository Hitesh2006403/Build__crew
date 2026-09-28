import { useState, useEffect, useCallback, useRef } from 'react';
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
import Invitations from './views/Invitations';
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
import { API_BASE_URL } from './api/client';

export default function App() {
  // Authentication & Role Routing state - initialized from localStorage if available
  const [currentUser, setCurrentUser] = useState(() => authApi.getStoredUser());
  const [activeView, setActiveView] = useState(() => {
    const stored = authApi.getStoredUser();
    return stored?.role === 'admin' ? 'admin-dashboard' : 'discover-projects';
  });
  const [viewingProfileUserId, setViewingProfileUserId] = useState(null);
  const [isAuthResolving, setIsAuthResolving] = useState(() => Boolean(authApi.getToken()));
  const [applicationsTab, setApplicationsTab] = useState('received');

  // Backend Hydrated States from MongoDB Atlas
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [hackathons, setHackathons] = useState([]);
  const [squadWins, setSquadWins] = useState([]);
  const [builders, setBuilders] = useState([]);
  const [applications, setApplications] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [receivedInvitations, setReceivedInvitations] = useState([]);
  const [sentInvitations, setSentInvitations] = useState([]);
  const [hackathonSquads, setHackathonSquads] = useState([]);
  const [backendError, setBackendError] = useState(null);

  // Modals state
  const [quickApplyProject, setQuickApplyProject] = useState(null);
  const [isPostProjectOpen, setIsPostProjectOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [adminTab, setAdminTab] = useState('hackathons');

  // Opening Splash Screen State
  const [showSplash, setShowSplash] = useState(true);
  const [isSplashFading, setIsSplashFading] = useState(false);

  // Toast notification
  const [toastMessage, setToastMessage] = useState(null);
  const [popupNotification, setPopupNotification] = useState(null);
  const popupTimerRef = useRef(null);
  const knownNotificationIdsRef = useRef(new Set());
  const isFirstNotifLoadRef = useRef(true);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const showNotificationToast = useCallback((notif) => {
    if (popupTimerRef.current) clearTimeout(popupTimerRef.current);
    setPopupNotification(notif);
    popupTimerRef.current = setTimeout(() => {
      setPopupNotification(null);
    }, 4500);
  }, []);

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

  const isFetchingUserDataRef = useRef(false);
  const fetchUserData = useCallback(async () => {
    if (isFetchingUserDataRef.current) return;
    isFetchingUserDataRef.current = true;
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
        const notifs = notifsRes.value;
        setNotifications(notifs);

        if (isFirstNotifLoadRef.current) {
          notifs.forEach(n => {
            if (n._id) knownNotificationIdsRef.current.add(String(n._id));
          });
          isFirstNotifLoadRef.current = false;
        } else {
          // Identify unread notifications that arrived since last check
          const newNotifs = notifs.filter(n => n._id && !knownNotificationIdsRef.current.has(String(n._id)) && !n.read);
          notifs.forEach(n => {
            if (n._id) knownNotificationIdsRef.current.add(String(n._id));
          });

          if (newNotifs.length > 0) {
            const latest = newNotifs[0];
            let toastText = '';
            if (latest.type === 'application_accepted') {
              toastText = 'Your application was accepted.';
            } else if (latest.type === 'application_rejected') {
              toastText = 'Your application was rejected.';
            } else if (latest.type === 'invitation_received') {
              toastText = 'You received a team invitation.';
            } else if (latest.type === 'application_received') {
              toastText = latest.message || 'Someone applied to your project.';
            } else {
              toastText = latest.message || 'New notification received.';
            }

            showNotificationToast({
              title: latest.title,
              message: toastText,
              reason: latest.reason || latest.rejectionReason,
              type: latest.type,
            });
          }
        }
      }
      if (invsRes.status === 'fulfilled' && invsRes.value) {
        const received = Array.isArray(invsRes.value.received) ? invsRes.value.received : [];
        const sent = Array.isArray(invsRes.value.sent) ? invsRes.value.sent : [];
        setReceivedInvitations(received);
        setSentInvitations(sent);
      }
    } catch (err) {
      console.warn('Could not load user data from backend:', err);
    } finally {
      isFetchingUserDataRef.current = false;
    }
  }, [showNotificationToast]);

  // Hydrate session and initial MongoDB platform data on mount
  useEffect(() => {
    let isMounted = true;
    let removeTimeoutId = null;

    // Safety timeout: ensure loading screen is never stuck
    const safetyTimer = setTimeout(() => {
      if (isMounted) {
        setIsAuthResolving(false);
        setIsSplashFading(true);
        removeTimeoutId = setTimeout(() => {
          if (isMounted) setShowSplash(false);
        }, 400);
      }
    }, 1500);

    const initializeSessionAndData = async () => {
      try {
        setBackendError(null);

        // Run authentication verification and database bootstrap concurrently
        const storedToken = authApi.getToken();
        const authPromise = storedToken
          ? authApi.getMe().catch(() => {
              authApi.logout();
              return null;
            })
          : Promise.resolve(null);

        const bootstrapPromise = fetch(`${API_BASE_URL}/bootstrap`)
          .then(res => res.ok ? res.json() : null)
          .catch(() => null);

        const [authResult, bootstrapResult] = await Promise.all([authPromise, bootstrapPromise]);

        if (isMounted) {
          if (authResult?.user) {
            setCurrentUser(authResult.user);
            if (authResult.user.role === 'admin') {
              setActiveView('admin-dashboard');
            } else {
              setActiveView('discover-projects');
            }
          } else if (storedToken && !authResult) {
            setCurrentUser(null);
            setActiveView('discover-projects');
          }

          if (bootstrapResult?.data) {
            const data = bootstrapResult.data;
            const loadedProjects = Array.isArray(data.projects) ? data.projects : [];
            setProjects(loadedProjects);
            setSelectedProject(prev => prev || (loadedProjects.length > 0 ? loadedProjects[0] : null));
            setHackathons(Array.isArray(data.hackathons) ? data.hackathons : []);
            setSquadWins(Array.isArray(data.squadWins) ? data.squadWins : []);
            setBuilders(Array.isArray(data.builders) ? data.builders : []);
            setHackathonSquads(Array.isArray(data.hackathonSquads) ? data.hackathonSquads : []);
          } else {
            await Promise.allSettled([
              fetchProjects(),
              fetchHackathons(),
              fetchBuilders()
            ]);
          }
        }

        const effectiveUser = authResult?.user || (storedToken ? authApi.getStoredUser() : null);
        if (effectiveUser && isMounted) {
          fetchUserData().catch(() => {});
        }
      } catch (err) {
        console.error('Platform initialization failed:', err);
      } finally {
        if (isMounted) {
          setIsAuthResolving(false);
          setIsSplashFading(true);
          removeTimeoutId = setTimeout(() => {
            if (isMounted) {
              setShowSplash(false);
            }
          }, 400);
        }
      }
    };

    initializeSessionAndData();

    return () => {
      isMounted = false;
      clearTimeout(safetyTimer);
      if (removeTimeoutId) clearTimeout(removeTimeoutId);
    };
  }, [fetchBuilders, fetchHackathons, fetchProjects, fetchUserData]);

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

  // Real-time polling for application/invitation events when user is logged in
  useEffect(() => {
    if (!currentUser) return;
    let isPolling = false;

    const poll = async () => {
      if (isPolling) return;
      if (typeof document !== 'undefined' && document.hidden) return;
      isPolling = true;
      try {
        await fetchUserData();
      } finally {
        isPolling = false;
      }
    };

    const intervalId = setInterval(poll, 7000);

    const onFocus = () => {
      poll();
    };

    window.addEventListener('focus', onFocus);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener('focus', onFocus);
    };
  }, [currentUser, fetchUserData]);

  const handleLogout = () => {
    authApi.logout();
    setCurrentUser(null);
    setActiveView('discover-projects');
    setApplications([]);
    setNotifications([]);
    setReceivedInvitations([]);
    setSentInvitations([]);
    knownNotificationIdsRef.current.clear();
    isFirstNotifLoadRef.current = true;
    setPopupNotification(null);
    showToast('Signed out of BuildCrew session.');
  };

  const handleUpdateUser = (updatedUser) => {
    if (!updatedUser) return;
    setCurrentUser(updatedUser);
    try {
      localStorage.setItem('buildcrew_user', JSON.stringify(updatedUser));
    } catch (e) {
      console.warn('Failed to cache user session:', e);
    }

    const updatedAvatar = updatedUser.avatar || updatedUser.profileImage || '';
    const userIdStr = String(updatedUser._id || updatedUser.id);

    // 1. Synchronize projects state (createdBy, lead, and confirmed members)
    setProjects(prevProjects =>
      prevProjects.map(proj => {
        let modified = false;
        const newProj = { ...proj };

        const creatorId = typeof newProj.createdBy === 'object' && newProj.createdBy !== null
          ? String(newProj.createdBy._id || newProj.createdBy.id)
          : String(newProj.createdBy);

        if (creatorId && creatorId === userIdStr) {
          modified = true;
          newProj.createdBy = typeof newProj.createdBy === 'object' && newProj.createdBy !== null
            ? { ...newProj.createdBy, avatar: updatedAvatar, profileImage: updatedAvatar, name: updatedUser.name }
            : { _id: updatedUser._id, avatar: updatedAvatar, profileImage: updatedAvatar, name: updatedUser.name };
          if (newProj.lead) {
            newProj.lead = { ...newProj.lead, avatar: updatedAvatar, leadAvatarFull: updatedAvatar, name: updatedUser.name };
          }
        }

        if (Array.isArray(newProj.members)) {
          const updatedMembers = newProj.members.map(m => {
            const mId = typeof m === 'object' && m !== null ? String(m._id || m.id) : String(m);
            if (mId && mId === userIdStr) {
              modified = true;
              return typeof m === 'object' && m !== null
                ? { ...m, avatar: updatedAvatar, profileImage: updatedAvatar, name: updatedUser.name }
                : { _id: updatedUser._id, avatar: updatedAvatar, profileImage: updatedAvatar, name: updatedUser.name };
            }
            return m;
          });
          if (modified) newProj.members = updatedMembers;
        }

        return modified ? newProj : proj;
      })
    );

    // 2. Synchronize selectedProject if currently viewing
    setSelectedProject(prev => {
      if (!prev) return null;
      let modified = false;
      const newProj = { ...prev };

      const creatorId = typeof newProj.createdBy === 'object' && newProj.createdBy !== null
        ? String(newProj.createdBy._id || newProj.createdBy.id)
        : String(newProj.createdBy);

      if (creatorId && creatorId === userIdStr) {
        modified = true;
        newProj.createdBy = typeof newProj.createdBy === 'object' && newProj.createdBy !== null
          ? { ...newProj.createdBy, avatar: updatedAvatar, profileImage: updatedAvatar, name: updatedUser.name }
          : { _id: updatedUser._id, avatar: updatedAvatar, profileImage: updatedAvatar, name: updatedUser.name };
        if (newProj.lead) {
          newProj.lead = { ...newProj.lead, avatar: updatedAvatar, leadAvatarFull: updatedAvatar, name: updatedUser.name };
        }
      }

      if (Array.isArray(newProj.members)) {
        const updatedMembers = newProj.members.map(m => {
          const mId = typeof m === 'object' && m !== null ? String(m._id || m.id) : String(m);
          if (mId && mId === userIdStr) {
            modified = true;
            return typeof m === 'object' && m !== null
              ? { ...m, avatar: updatedAvatar, profileImage: updatedAvatar, name: updatedUser.name }
              : { _id: updatedUser._id, avatar: updatedAvatar, profileImage: updatedAvatar, name: updatedUser.name };
          }
          return m;
        });
        if (modified) newProj.members = updatedMembers;
      }

      return modified ? newProj : prev;
    });

    // 3. Synchronize builders state
    setBuilders(prev =>
      prev.map(b => {
        if (String(b._id || b.id) === userIdStr) {
          return { ...b, avatar: updatedAvatar, profileImage: updatedAvatar, name: updatedUser.name };
        }
        return b;
      })
    );

    // 4. Synchronize applications state
    setApplications(prev =>
      prev.map(app => {
        const applicantId = typeof app.applicant === 'object' && app.applicant !== null
          ? String(app.applicant._id || app.applicant.id)
          : String(app.applicant);
        if (applicantId && applicantId === userIdStr) {
          return {
            ...app,
            applicant: typeof app.applicant === 'object' && app.applicant !== null
              ? { ...app.applicant, avatar: updatedAvatar, profileImage: updatedAvatar, name: updatedUser.name }
              : { _id: updatedUser._id, avatar: updatedAvatar, profileImage: updatedAvatar, name: updatedUser.name }
          };
        }
        return app;
      })
    );

    showToast('Profile changes saved successfully.');
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
        message: newApp.note || newApp.message || 'Applying to collaborate on project.',
      });
      const savedApp = res.application || res;
      setApplications(prev => [savedApp, ...prev.filter(a => String(a._id || a.id) !== String(savedApp._id || savedApp.id))]);
      showToast('Application sent to the project owner.');
      // Re-sync projects and notifications in background
      fetchProjects();
      fetchUserData();
      return savedApp;
    } catch (err) {
      console.error('Apply error:', err);
      showToast(err.message || 'Application could not be submitted');
      throw err;
    }
  };

  const handleUpdateApplicationStatus = async (appId, status, reason = '') => {
    try {
      await applicationsApi.updateStatus(appId, status, reason);
      showToast(status === 'accepted' ? 'Application accepted! Applicant added to squad.' : 'Application rejected.');
      await Promise.allSettled([
        fetchUserData(),
        fetchProjects()
      ]);
    } catch (err) {
      console.error('Update application status error:', err);
      showToast(err.message || 'Failed to update application');
    }
  };

  const handleAddProject = async (newProj) => {
    try {
      const res = await projectsApi.createProject(newProj);
      const savedProj = res.project || res;
      setProjects(prev => [savedProj, ...prev]);
      setSelectedProject(savedProj);
      setActiveView('project-details');
      showToast(`Project "${savedProj.title}" launched successfully!`);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      console.error('Failed to create project:', err);
      showToast(`Project creation failed: ${err.message}`);
    }
  };

  const handleUpdateProject = (updatedProj) => {
    if (!updatedProj?._id) return;
    setProjects(prev => prev.map(p => (p._id === updatedProj._id ? updatedProj : p)));
    if (selectedProject?._id === updatedProj._id) {
      setSelectedProject(updatedProj);
    }
  };

  const handleDeleteProject = async (projectId) => {
    try {
      const res = await projectsApi.deleteProject(projectId);
      setProjects(prev => prev.filter(p => (p._id || p.id) !== projectId));
      setSelectedProject(prev => (prev && ((prev._id || prev.id) === projectId) ? null : prev));
      await Promise.allSettled([
        fetchProjects(),
        fetchUserData()
      ]);
      showToast(res?.message || 'Project and associated team data deleted permanently.');
      return res;
    } catch (err) {
      console.error('Delete project failed:', err);
      showToast(err.message || 'Failed to delete project');
      throw err;
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
      showToast(res.message || 'Invitation sent successfully!');
      await fetchUserData();
    } catch (err) {
      console.error('Invitation error:', err);
      showToast(err.message || 'Invitation error');
    }
  };

  const handleAcceptInvitation = async (invitationId) => {
    try {
      await invitationsApi.respondInvitation(invitationId, 'accepted');
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

  const handleCancelInvitation = async (invitationId) => {
    try {
      await invitationsApi.respondInvitation(invitationId, 'cancelled');
      showToast('Invitation cancelled.');
      await fetchUserData();
    } catch (err) {
      console.error('Cancel invitation error:', err);
      showToast(err.message || 'Failed to cancel invitation');
    }
  };

  const handleAddBuilder = async (newBuilder) => {
    try {
      const res = await usersApi.createBuilder(newBuilder);
      const savedBuilder = res.builder || newBuilder;
      setBuilders(prev => [savedBuilder, ...prev]);
      showToast(`Student "${savedBuilder.name}" added successfully!`);
    } catch (err) {
      console.error('Failed to create builder:', err);
      setBuilders(prev => [newBuilder, ...prev]);
      showToast(`Student "${newBuilder.name}" added!`);
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

  // While authentication and the current user are being loaded:
  // Render ONLY the BuildCrew loading / splash screen.
  // Never temporarily render the Admin page or any other default page while authentication is loading.
  if (isAuthResolving) {
    return (
      <div className="fixed inset-0 z-[99999] bg-white flex flex-col items-center justify-center select-none">
        <div className="flex flex-col items-center justify-center p-6 animate-splash">
          <img 
            src="/buildcrew-splash-logo.png" 
            alt="BuildCrew" 
            className="w-72 sm:w-96 max-w-[85vw] max-h-[60vh] object-contain select-none" 
          />
        </div>
      </div>
    );
  }

  // If unauthenticated: render complete Auth flow
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-background font-body-md text-on-surface antialiased relative">
        {/* Opening Splash Screen centered on clean white background */}
        {showSplash && (
          <div 
            className={`fixed inset-0 z-[9999] bg-white flex flex-col items-center justify-center transition-opacity duration-500 ease-in-out ${
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

        <Auth onLoginSuccess={handleLoginSuccess} />

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

  // Filter notifications: do not exclude invitation_received so users receive team invitation alerts
  const unreadCount = notifications.filter(n => !n.read).length;
  const currentUserId = String(currentUser?._id || currentUser?.id || '');
  const pendingReceivedApplicationsCount = applications.filter(a => {
    const applicantId = String(a.applicant?._id || a.applicant || '');
    return applicantId !== currentUserId && (a.status || 'pending').toLowerCase() === 'pending';
  }).length;

  return (
    <div className="min-h-screen bg-background text-on-surface flex flex-col font-body-md antialiased relative">
      {/* Opening Splash Screen centered on clean white background */}
      {showSplash && (
        <div 
          className={`fixed inset-0 z-[9999] bg-white flex flex-col items-center justify-center transition-opacity duration-500 ease-in-out ${
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
        pendingInvitationsCount={receivedInvitations.filter(i => i.status === 'pending').length}
        pendingApplicationsCount={pendingReceivedApplicationsCount}
        adminTab={adminTab}
        onSelectAdminTab={setAdminTab}
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
          onMarkRead={handleMarkNotificationRead}
          onMarkAllRead={handleMarkAllNotificationsRead}
          onNavigateProfile={() => handleNavigateView('profile')}
          onNavigateInvitations={() => handleNavigateView('invitations')}
          onNavigateApplications={(tab = 'received') => {
            setApplicationsTab(tab);
            handleNavigateView('my-applications');
          }}
          currentUser={currentUser}
          onLogout={handleLogout}
          onOpenAdminDashboard={(tab = 'hackathons') => {
            setAdminTab(tab);
            handleNavigateView('admin-dashboard');
          }}
        />

        {/* Dynamic View Router */}
        <main className="w-full pt-16 bg-surface min-h-screen px-space-lg py-space-lg flex-1">
          {/* Admin Hackathon & Team Management (Protected for role='admin', AccessDenied fallback for students) */}
          {activeView === 'admin-dashboard' && (
            currentUser?.role === 'admin' ? (
              <AdminDashboard
                currentUser={currentUser}
                hackathons={hackathons}
                projects={projects}
                onUpdateHackathons={handleUpdateHackathons}
                onRefreshHackathons={fetchHackathons}
                onRefreshProjects={fetchProjects}
                onUpdateProject={handleUpdateProject}
                onDeleteProject={handleDeleteProject}
                onSelectProject={handleSelectProject}
                showToast={showToast}
                onNavigate={setActiveView}
                initialTab={adminTab}
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
              currentUser={currentUser}
              builders={builders}
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
              sentInvitations={sentInvitations}
              onInvite={handleInviteBuilder}
              onViewProfile={handleViewProfile}
              onAddBuilder={handleAddBuilder}
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
              currentUser={currentUser}
              onSelectProjectById={handleSelectProjectById}
              initialTab={applicationsTab}
              onTabChange={setApplicationsTab}
              onUpdateStatus={handleUpdateApplicationStatus}
            />
          )}

          {activeView === 'invitations' && (
            <Invitations
              receivedInvitations={receivedInvitations}
              sentInvitations={sentInvitations}
              onAcceptInvitation={handleAcceptInvitation}
              onRejectInvitation={handleRejectInvitation}
              onCancelInvitation={handleCancelInvitation}
              onViewProfile={handleViewProfile}
              onSelectProject={handleSelectProject}
              currentUser={currentUser}
            />
          )}

          {activeView === 'my-teams' && (() => {
            const currentUserId = String(currentUser?._id || currentUser?.id || '');
            const myProjectTeams = projects.filter(p => {
              if (!currentUser) return false;
              const ownerId = String(p.createdBy?._id || p.createdBy || '');
              const isOwner = ownerId && ownerId === currentUserId;
              const isMember = Array.isArray(p.members) && p.members.some(m => String(m._id || m || '') === currentUserId);
              return isOwner || isMember;
            });

            const myHackTeams = hackathonSquads.filter(h => {
              if (!currentUser) return false;
              const ownerId = String(h.createdBy?._id || h.createdBy || '');
              const isOwner = ownerId && ownerId === currentUserId;
              const isMember = Array.isArray(h.members) && h.members.some(m => String(m._id || m || '') === currentUserId);
              return isOwner || isMember;
            });

            const hasAnyTeams = myProjectTeams.length > 0 || myHackTeams.length > 0;

            return (
              <div className="flex flex-col w-full pb-space-xl space-y-space-lg">
                <div className="flex flex-col max-w-3xl">
                  <div className="flex items-center gap-space-xs text-secondary font-label-md text-label-md uppercase tracking-wider mb-1">
                    <span className="material-symbols-outlined text-base">diversity_3</span>
                    <span>Your Teams</span>
                  </div>
                  <h1 className="font-headline-lg text-headline-lg font-bold text-on-surface tracking-tight">
                    My Teams
                  </h1>
                  <p className="font-body-lg text-body-lg text-on-surface-variant mt-1">
                    Teams and projects you are currently collaborating in.
                  </p>
                </div>

                {/* Squad Rosters: Projects & Hackathons */}
                {!hasAnyTeams ? (
                  <div className="bg-surface-container-lowest rounded-2xl p-space-xl text-center text-on-surface-variant border border-surface-container-high/40">
                    <span className="material-symbols-outlined text-4xl text-outline mb-2">diversity_3</span>
                    <p className="font-body-lg text-body-lg text-on-surface font-semibold">You haven't joined any teams yet</p>
                    <p className="font-body-sm text-body-sm mt-1">Explore Discover Projects or accept team invitations to join a team.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
                    {/* Project Teams */}
                    {myProjectTeams.map((p, idx) => {
                      const isOwner = currentUser && ((p.createdBy?._id || p.createdBy) === currentUser._id);
                      return (
                        <div key={p._id || idx} className="bg-surface-container-lowest rounded-2xl p-space-lg shadow-sm space-y-4 border border-surface-container-high/40">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="px-2.5 py-1 rounded-full bg-surface-container text-secondary font-label-sm text-label-sm font-semibold">
                                {p.categoryBadge || p.category || 'Project'}
                              </span>
                              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                                isOwner ? 'bg-secondary-fixed text-on-secondary-fixed' : 'bg-surface-container-high text-on-surface-variant'
                              }`}>
                                {isOwner ? 'Creator' : 'Member'}
                              </span>
                            </div>
                            <span className="font-label-sm text-label-sm text-secondary font-semibold">
                              {Math.min(Array.isArray(p.members) && p.members.length > 0 ? p.members.length : (p.filledCount || 1), p.totalCapacity || 4)}/{p.totalCapacity || 4} Members
                            </span>
                          </div>
                          <div>
                            <h3 className="font-headline-sm text-headline-sm font-bold text-on-surface">
                              {p.title}
                            </h3>
                            <p className="font-body-sm text-body-sm text-on-surface-variant mt-1 line-clamp-2">
                              {p.tagline || p.whatAreYouBuilding || p.problemBeingSolved || p.fullDescription}
                            </p>
                          </div>
                          <div className="p-3 rounded-xl bg-surface-container-low flex items-center justify-between font-body-sm text-body-sm">
                            <span className="text-on-surface font-medium">Created By</span>
                            <span className="text-secondary font-semibold">{p.lead?.name || p.createdBy?.name || 'Project Creator'}</span>
                          </div>
                          <div className="flex items-center justify-end gap-2 pt-2 border-t border-surface-container-high/60">
                            <button
                              type="button"
                              onClick={() => handleSelectProject(p)}
                              className="py-2 px-4 rounded-xl bg-primary text-on-primary font-title-sm text-title-sm hover:bg-surface-tint transition-all cursor-pointer shadow-xs"
                            >
                              View Project &amp; Team
                            </button>
                          </div>
                        </div>
                      );
                    })}

                    {/* Hackathon Teams */}
                    {myHackTeams.map((h, idx) => {
                      const isOwner = currentUser && ((h.createdBy?._id || h.createdBy) === currentUser._id);
                      return (
                        <div key={h._id || idx} className="bg-surface-container-lowest rounded-2xl p-space-lg shadow-sm space-y-4 border border-surface-container-high/40">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="px-2.5 py-1 rounded-full bg-blue-100 text-blue-900 font-label-sm text-label-sm font-semibold">
                                {h.hackathonTitle || 'Hackathon Team'}
                              </span>
                              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                                isOwner ? 'bg-secondary-fixed text-on-secondary-fixed' : 'bg-surface-container-high text-on-surface-variant'
                              }`}>
                                {isOwner ? 'Creator' : 'Member'}
                              </span>
                            </div>
                            <span className="font-label-sm text-label-sm text-secondary font-semibold">
                              {Math.min(Array.isArray(h.members) && h.members.length > 0 ? h.members.length : (h.filledCount || 1), h.totalCapacity || 4)}/{h.totalCapacity || 4} Members
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
                            <span className="text-on-surface font-medium">Team Lead</span>
                            <span className="text-secondary font-semibold">{h.lead?.name || h.createdBy?.name || 'Team Lead'}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })()}

          {(activeView === 'profile' || activeView === 'settings') && (
            <Profile
              currentUser={currentUser}
              targetUserId={viewingProfileUserId}
              sentInvitations={sentInvitations}
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
        onClose={() => {
          setIsPostProjectOpen(false);
          setActiveView('discover-projects');
        }}
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
            className="ml-2 text-on-surface-variant hover:text-on-primary cursor-pointer"
          >
            <span className="material-symbols-outlined text-base">close</span>
          </button>
        </div>
      )}

      {/* Small Non-Blocking Notification Toast/Pop-up */}
      {popupNotification && (
        <div 
          onClick={() => {
            if (popupNotification.type === 'application_rejected' || popupNotification.type === 'application_accepted') {
              setApplicationsTab('sent');
              handleNavigateView('my-applications');
            } else if (popupNotification.type === 'application_received') {
              setApplicationsTab('received');
              handleNavigateView('my-applications');
            } else if (popupNotification.type === 'invitation_received') {
              handleNavigateView('invitations');
            }
            setPopupNotification(null);
          }}
          className={`fixed ${toastMessage ? 'bottom-20' : 'bottom-6'} right-6 z-50 max-w-sm bg-slate-900 text-white p-3.5 rounded-2xl shadow-2xl border border-slate-700/60 flex items-start gap-3 cursor-pointer hover:bg-slate-800 transition-all animate-modal`}
          role="alert"
        >
          <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5" style={{
            backgroundColor: popupNotification.type === 'application_accepted' ? 'rgba(16, 185, 129, 0.2)' :
                             popupNotification.type === 'application_rejected' ? 'rgba(244, 63, 94, 0.2)' :
                             'rgba(99, 102, 241, 0.2)',
            color: popupNotification.type === 'application_accepted' ? '#34d399' :
                   popupNotification.type === 'application_rejected' ? '#fb7185' :
                   '#818cf8'
          }}>
            <span className="material-symbols-outlined text-lg">
              {popupNotification.type === 'application_accepted' ? 'check_circle' :
               popupNotification.type === 'application_rejected' ? 'cancel' :
               'notifications'}
            </span>
          </div>

          <div className="flex-1 min-w-0 pr-1">
            <p className="font-semibold text-xs text-white leading-snug">
              {popupNotification.message}
            </p>
            {popupNotification.reason && (
              <p className="text-[11px] text-slate-300 mt-1 line-clamp-2">
                Reason: {popupNotification.reason}
              </p>
            )}
            <span className="text-[10px] text-slate-400 block mt-1">
              Click to view in {popupNotification.type === 'invitation_received' ? 'Invitations' : 'My Applications'}
            </span>
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setPopupNotification(null);
            }}
            className="text-slate-400 hover:text-white p-0.5 rounded-md shrink-0 cursor-pointer"
            aria-label="Dismiss notification"
          >
            <span className="material-symbols-outlined text-base">close</span>
          </button>
        </div>
      )}
    </div>
  );
}
