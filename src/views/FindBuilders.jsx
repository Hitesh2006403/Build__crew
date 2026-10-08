import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export function formatTeammateName(builder) {
  if (!builder) return 'Campus Teammate';
  const name = String(builder.name || '').trim();
  if (!name || name.includes('@')) {
    const emailToUse = name.includes('@') ? name : String(builder.email || '');
    if (emailToUse) {
      const handle = emailToUse.split('@')[0].replace(/[._-]/g, ' ');
      return handle.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    }
    return 'Campus Teammate';
  }
  return name;
}

export default function FindBuilders({ 
  builders = [], 
  projects = [], 
  hackathonSquads = [], 
  sentInvitations = [], 
  onInvite, 
  onViewProfile, 
  showToast, 
  currentUser 
}) {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [selectedRole, setSelectedRole] = useState('all');
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [selectedBuilderForInvite, setSelectedBuilderForInvite] = useState(null);
  const [selectedSquadTarget, setSelectedSquadTarget] = useState('');
  const [inviteRole, setInviteRole] = useState('Core Contributor');
  const [inviteMessage, setInviteMessage] = useState('');
  const [isSendingInvite, setIsSendingInvite] = useState(false);

  // Available squads that currentUser leads or is a member of
  const myAvailableSquads = [
    ...projects
      .filter(p => {
        if (!currentUser) return false;
        const isOwner = (p.createdBy?._id || p.createdBy) === currentUser._id;
        const isMember = Array.isArray(p.members) && p.members.some(m => (m._id || m) === currentUser._id);
        return isOwner || isMember;
      })
      .map(p => ({
        id: p._id || p.id,
        title: p.title,
        type: 'project',
        filledCount: p.filledCount || (p.members?.length || 1),
        totalCapacity: p.totalCapacity || 4
      })),
    ...hackathonSquads
      .filter(h => {
        if (!currentUser) return false;
        const isOwner = (h.createdBy?._id || h.createdBy) === currentUser._id;
        const isMember = Array.isArray(h.members) && h.members.some(m => (m._id || m) === currentUser._id);
        return isOwner || isMember;
      })
      .map(h => ({
        id: h._id || h.id,
        title: h.teamName || h.title || 'Hackathon Squad',
        type: 'hackathon',
        filledCount: h.filledCount || (h.members?.length || 1),
        totalCapacity: h.totalCapacity || 4
      }))
  ];

function cleanText(text) {
  if (!text) return '';
  const trimmed = String(text).trim();
  const lower = trimmed.toLowerCase();
  if (lower === 'campus member' || lower === 'collegiate campus' || lower === 'nothing' || lower === 'n/a') {
    return '';
  }
  return trimmed;
}

  const getExistingInviteForBuilder = (builderId) => {
    if (!sentInvitations || sentInvitations.length === 0) return null;
    return sentInvitations.find((inv) => {
      const rId = inv.receiver?._id || inv.receiver;
      return String(rId) === String(builderId);
    });
  };

  const handleOpenInviteModal = (builder) => {
    if (!currentUser) {
      if (showToast) showToast('Please sign in to invite teammates.');
      return;
    }
    if (builder._id === currentUser._id) {
      if (showToast) showToast('You cannot invite yourself to a team.');
      return;
    }
    const existing = getExistingInviteForBuilder(builder._id || builder.id);
    if (existing && existing.status === 'pending') {
      if (showToast) showToast(`An invitation has already been sent to ${builder.name}.`);
      return;
    }
    if (myAvailableSquads.length === 0) {
      // Point 2: Instead of dead-end toast, open modal prompting to create a project to invite this student
      setSelectedBuilderForInvite(builder);
      return;
    }
    setSelectedBuilderForInvite(builder);
    setSelectedSquadTarget(myAvailableSquads[0].id);
    setInviteRole('Core Contributor');
    setInviteMessage(`Hey ${formatTeammateName(builder)?.split(' ')[0] || 'there'}, join our team on BuildCrew!`);
  };

  const handleSendInviteSubmit = async (e) => {
    e.preventDefault();
    if (!selectedBuilderForInvite) return;

    const chosenSquad = myAvailableSquads.find(s => String(s.id) === String(selectedSquadTarget));
    if (!chosenSquad) {
      if (showToast) showToast('Please select a squad to invite this builder to.');
      return;
    }

    try {
      setIsSendingInvite(true);
      if (onInvite) {
        await onInvite({
          receiverId: selectedBuilderForInvite._id || selectedBuilderForInvite.id,
          projectId: chosenSquad.type === 'project' ? chosenSquad.id : undefined,
          hackathonTeamId: chosenSquad.type === 'hackathon' ? chosenSquad.id : undefined,
          type: chosenSquad.type,
          role: inviteRole.trim() || 'Core Contributor',
          message: inviteMessage.trim() || `Join our squad on BuildCrew!`
        });
      }
      setSelectedBuilderForInvite(null);
    } catch (err) {
      console.error('Error dispatching invitation:', err);
    } finally {
      setIsSendingInvite(false);
    }
  };

  // Extract skills needed across projects posted by current user (Add-on 3)
  const myProjectsSkillsNeeded = React.useMemo(() => {
    if (!currentUser) return new Set();
    const set = new Set();
    (projects || [])
      .filter((p) => String(p.createdBy?._id || p.createdBy) === String(currentUser._id))
      .forEach((p) => {
        (p.rolesNeeded || []).forEach((r) => set.add(r.toLowerCase()));
        (p.techStack || []).forEach((t) => set.add(t.toLowerCase()));
        (p.roles || []).forEach((r) => set.add(String(r.roleName || '').toLowerCase()));
      });
    return set;
  }, [projects, currentUser]);

  const filteredBuilders = React.useMemo(() => {
    return builders.filter(b => {
      const bName = b.name || '';
      const bCollege = b.college || b.university || '';
      const bBranch = b.branch || b.major || '';
      const bRole = b.roleTitle || b.role || '';
      const bSkills = Array.isArray(b.skills) ? b.skills : [];

      if (onlyAvailable && b.isAvailable === false) {
        return false;
      }

      if (search.trim()) {
        const q = search.toLowerCase();
        const match = bName.toLowerCase().includes(q) ||
                      bCollege.toLowerCase().includes(q) ||
                      bBranch.toLowerCase().includes(q) ||
                      bSkills.some(s => s.toLowerCase().includes(q));
        if (!match) return false;
      }

      if (selectedRole !== 'all') {
        const targetRole = selectedRole.toLowerCase();
        const matchesRole = bRole.toLowerCase().includes(targetRole) ||
                            bSkills.some(s => s.toLowerCase().includes(targetRole));
        if (!matchesRole) return false;
      }

      return true;
    }).sort((a, b) => {
      // Suggest teammates matching user's open project roles first
      const aSkills = Array.isArray(a.skills) ? a.skills : [];
      const bSkills = Array.isArray(b.skills) ? b.skills : [];
      const aMatch = aSkills.filter(s => myProjectsSkillsNeeded.has(s.toLowerCase())).length;
      const bMatch = bSkills.filter(s => myProjectsSkillsNeeded.has(s.toLowerCase())).length;
      if (aMatch !== bMatch) return bMatch - aMatch;
      const aAvail = a.isAvailable !== false ? 1 : 0;
      const bAvail = b.isAvailable !== false ? 1 : 0;
      return bAvail - aAvail;
    });
  }, [builders, onlyAvailable, search, selectedRole, myProjectsSkillsNeeded]);

  return (
    <div className="flex flex-col w-full pb-space-xl space-y-space-lg">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col max-w-2xl">
          <div className="flex items-center gap-space-xs text-secondary font-label-md text-label-md uppercase tracking-wider mb-1">
            <span className="material-symbols-outlined text-base">group</span>
            <span>Teammates Directory</span>
          </div>
          <h1 className="font-headline-lg text-headline-lg font-bold text-on-surface tracking-tight">
            Find Campus Teammates
          </h1>
          <p className="font-body-lg text-body-lg text-on-surface-variant mt-1">
            Browse registered students and invite them to collaborate on your project teams.
          </p>
        </div>
      </div>

      {/* Point 11: Prompt current user to complete skills and availability */}
      {currentUser && (!currentUser.skills?.length || !currentUser.availability) && (
        <div className="bg-secondary/10 border border-secondary/20 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-secondary animate-fadeIn">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-2xl shrink-0 text-secondary">edit_note</span>
            <div className="text-xs">
              <p className="font-bold text-on-surface">Boost your visibility to teams</p>
              <p className="text-on-surface-variant">Add your skills and weekly availability to your profile so project leads can discover and invite you.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => navigate('/profile')}
            className="px-4 py-2 rounded-xl bg-secondary text-on-secondary font-bold text-xs shrink-0 hover:bg-secondary/90 transition-all cursor-pointer shadow-xs"
          >
            Update Profile
          </button>
        </div>
      )}

      {/* Search & Filter bar */}
      <div className="bg-surface-container-lowest p-space-md rounded-2xl shadow-sm flex flex-col md:flex-row gap-space-md items-center justify-between">
        <div className="relative w-full md:w-96 flex items-center">
          <span className="material-symbols-outlined absolute left-3 text-on-surface-variant text-xl pointer-events-none">
            search
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search students by name, skills, college, branch..."
            className="w-full pl-10 pr-4 py-2.5 bg-surface text-on-surface placeholder:text-on-surface-variant font-body-sm text-body-sm rounded-xl outline-none focus:bg-surface-container-lowest shadow-sm transition-all"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto">
          <button
            type="button"
            onClick={() => { setSelectedRole('all'); setOnlyAvailable(false); }}
            className={`px-3.5 py-1.5 rounded-full font-label-md text-label-md transition-all cursor-pointer whitespace-nowrap ${
              selectedRole === 'all' && !onlyAvailable ? 'bg-primary text-on-primary' : 'bg-surface-container-high text-on-surface-variant'
            }`}
          >
            All Students
          </button>
          <button
            type="button"
            onClick={() => setOnlyAvailable(!onlyAvailable)}
            className={`px-3.5 py-1.5 rounded-full font-label-md text-label-md transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              onlyAvailable ? 'bg-emerald-600 text-white font-bold shadow-xs' : 'bg-surface-container-high text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${onlyAvailable ? 'bg-white' : 'bg-emerald-500'}`} />
            <span>Available to Join</span>
          </button>
          <button
            type="button"
            onClick={() => setSelectedRole('frontend')}
            className={`px-3.5 py-1.5 rounded-full font-label-md text-label-md transition-all cursor-pointer whitespace-nowrap ${
              selectedRole === 'frontend' ? 'bg-primary text-on-primary' : 'bg-surface-container-high text-on-surface-variant'
            }`}
          >
            Frontend
          </button>
          <button
            type="button"
            onClick={() => setSelectedRole('backend')}
            className={`px-3.5 py-1.5 rounded-full font-label-md text-label-md transition-all cursor-pointer whitespace-nowrap ${
              selectedRole === 'backend' ? 'bg-primary text-on-primary' : 'bg-surface-container-high text-on-surface-variant'
            }`}
          >
            Backend
          </button>
          <button
            type="button"
            onClick={() => setSelectedRole('fullstack')}
            className={`px-3.5 py-1.5 rounded-full font-label-md text-label-md transition-all cursor-pointer whitespace-nowrap ${
              selectedRole === 'fullstack' ? 'bg-primary text-on-primary' : 'bg-surface-container-high text-on-surface-variant'
            }`}
          >
            Fullstack
          </button>
          <button
            type="button"
            onClick={() => setSelectedRole('ai')}
            className={`px-3.5 py-1.5 rounded-full font-label-md text-label-md transition-all cursor-pointer whitespace-nowrap ${
              selectedRole === 'ai' ? 'bg-primary text-on-primary' : 'bg-surface-container-high text-on-surface-variant'
            }`}
          >
            AI / ML
          </button>
          <button
            type="button"
            onClick={() => setSelectedRole('mobile')}
            className={`px-3.5 py-1.5 rounded-full font-label-md text-label-md transition-all cursor-pointer whitespace-nowrap ${
              selectedRole === 'mobile' ? 'bg-primary text-on-primary' : 'bg-surface-container-high text-on-surface-variant'
            }`}
          >
            Mobile
          </button>
          <button
            type="button"
            onClick={() => setSelectedRole('uiux')}
            className={`px-3.5 py-1.5 rounded-full font-label-md text-label-md transition-all cursor-pointer whitespace-nowrap ${
              selectedRole === 'uiux' ? 'bg-primary text-on-primary' : 'bg-surface-container-high text-on-surface-variant'
            }`}
          >
            UI / UX
          </button>
        </div>
      </div>

      {/* Grid of Builder Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-space-md">
        {filteredBuilders.length === 0 ? (
          <div className="col-span-full bg-surface-container-lowest p-12 rounded-2xl text-center space-y-3 border border-surface-container-high/40">
            <span className="material-symbols-outlined text-4xl text-outline">group_off</span>
            <h3 className="font-headline-sm text-lg font-bold text-on-surface">No registered students found</h3>
            <p className="font-body-md text-sm text-on-surface-variant max-w-md mx-auto">
              Try adjusting your search query or role filter to discover more builders.
            </p>
          </div>
        ) : (
          filteredBuilders.map((b) => {
            const isSelf = currentUser && String(b._id || b.id) === String(currentUser._id);
            const avatarImg = (isSelf ? (currentUser.avatar || currentUser.profileImage) : null) || b.avatar || b.profileImage || '';
            const collegeName = cleanText(b.college || b.university);
            const branchName = b.branch || b.major || '';
            const isSemesterSet = Boolean(b.semester && b.semester > 1) || Boolean(b.semesterSpecified);
            const semesterText = isSemesterSet ? `Semester ${b.semester}` : (b.year ? `Class of ${b.year}` : '');
            const hasSkills = Array.isArray(b.skills) && b.skills.length > 0;
            const displayName = formatTeammateName(b);
            const bSkills = Array.isArray(b.skills) ? b.skills : [];
            const matchingSkills = bSkills.filter(s => myProjectsSkillsNeeded.has(s.toLowerCase()));
            const isSuggested = matchingSkills.length > 0 && b.isAvailable !== false;

            return (
              <div
                key={b._id || b.id}
                className={`bg-surface-container-lowest rounded-2xl p-space-md shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4 border ${
                  isSuggested && !isSelf ? 'border-secondary/50 ring-1 ring-secondary/20' : 'border-surface-container-high/40'
                }`}
              >
                <div className="space-y-3">
                  {/* Suggested Match Banner (Add-on 3) */}
                  {isSuggested && !isSelf && (
                    <div className="px-3 py-1.5 rounded-xl bg-secondary/10 border border-secondary/20 text-secondary text-[11px] font-bold flex items-center gap-1.5 shadow-2xs">
                      <span className="material-symbols-outlined text-sm">stars</span>
                      <span>Suggested Match ({matchingSkills.slice(0, 2).join(', ')})</span>
                    </div>
                  )}

                  {/* Top user header */}
                  <div className="flex items-start gap-space-sm">
                    <div className="relative shrink-0">
                      {avatarImg ? (
                        <img
                          src={avatarImg}
                          alt=""
                          className="w-14 h-14 rounded-2xl object-cover shadow-sm shrink-0"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            if (e.currentTarget.nextElementSibling) {
                              e.currentTarget.nextElementSibling.style.display = 'flex';
                            }
                          }}
                        />
                      ) : null}
                      <div 
                        style={{ display: avatarImg ? 'none' : 'flex' }}
                        className="w-14 h-14 rounded-2xl bg-secondary/15 text-secondary font-bold text-xl items-center justify-center shadow-sm shrink-0"
                      >
                        {(displayName || 'T').charAt(0).toUpperCase()}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className="font-title-md text-title-md font-bold text-on-surface truncate" title={displayName}>
                          {displayName}
                        </h3>
                        {isSelf ? (
                          <span className="px-2 py-0.5 rounded-full bg-secondary text-on-secondary font-label-sm text-[11px] font-bold">
                            You
                          </span>
                        ) : null}
                      </div>
                      {collegeName && (
                        <div className="font-label-sm text-label-sm text-on-surface font-medium truncate mt-0.5">
                          {collegeName}
                        </div>
                      )}
                      {branchName && (
                        <div className="font-label-sm text-xs text-on-surface-variant truncate">
                          {branchName}
                        </div>
                      )}
                      {semesterText && (
                        <div className="text-[11px] text-outline font-medium mt-0.5">
                          {semesterText}
                        </div>
                      )}
                      {/* Teammate Availability Badge (Add-on 3) */}
                      <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                        {b.isAvailable !== false ? (
                          <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-label-sm text-[10px] font-bold flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            <span>{b.availabilityStatus || 'Available to Join'}</span>
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md bg-surface-container text-outline font-label-sm text-[10px]">
                            Not Looking
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Skills badges if present */}
                  {hasSkills && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {b.skills.map((skill, sidx) => (
                        <span
                          key={sidx}
                          className="px-2.5 py-0.5 rounded-md bg-surface-container-high text-on-surface font-label-sm text-label-sm font-medium"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Card Action Footer */}
                <div className="pt-space-xs border-t border-surface-container-low flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => onViewProfile ? onViewProfile(b._id || b.id) : null}
                    className="py-2 px-3 rounded-xl bg-surface-container-low hover:bg-surface-container text-on-surface font-title-sm text-title-sm transition-all cursor-pointer"
                  >
                    View Profile
                  </button>

                  {!isSelf && (
                    (() => {
                      const existing = getExistingInviteForBuilder(b._id || b.id);
                      if (existing && existing.status === 'pending') {
                        return (
                          <span className="py-2 px-3.5 rounded-xl font-title-sm text-xs bg-secondary-fixed text-on-secondary-fixed font-bold flex items-center gap-1 select-none shadow-xs">
                            <span className="material-symbols-outlined text-sm">schedule</span>
                            <span>Invitation Sent</span>
                          </span>
                        );
                      }
                      if (existing && existing.status === 'accepted') {
                        return (
                          <span className="py-2 px-3.5 rounded-xl font-title-sm text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1 select-none">
                            <span className="material-symbols-outlined text-sm">check_circle</span>
                            <span>In Team</span>
                          </span>
                        );
                      }
                      return (
                        <button
                          type="button"
                          onClick={() => handleOpenInviteModal(b)}
                          className="py-2 px-4 rounded-xl font-title-sm text-title-sm bg-primary text-on-primary hover:bg-surface-tint active:scale-[0.98] transition-all flex items-center gap-1 cursor-pointer shadow-xs"
                        >
                          <span className="material-symbols-outlined text-base">person_add</span>
                          <span>Invite to Team</span>
                        </button>
                      );
                    })()
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Real Invite to Team Modal */}
      {selectedBuilderForInvite && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md animate-fadeIn"
          onClick={() => setSelectedBuilderForInvite(null)}
        >
          <div 
            className="relative w-full max-w-lg bg-surface-container-lowest rounded-3xl shadow-2xl border border-surface-container-high overflow-hidden animate-modal"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-6 bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex items-center justify-between">
              <div>
                <div className="flex items-center gap-1.5 text-xs text-blue-300 font-bold uppercase tracking-wider mb-1">
                  <span className="material-symbols-outlined text-sm">person_add</span>
                  <span>Team Invitation</span>
                </div>
                <h3 className="text-xl font-bold tracking-tight">
                  Invite {selectedBuilderForInvite.name}
                </h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  Invite them to collaborate on your project or hackathon team.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedBuilderForInvite(null)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white/80 hover:text-white flex items-center justify-center transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              {myAvailableSquads.length === 0 ? (
                <div className="text-center py-6 space-y-4">
                  <div className="w-14 h-14 rounded-2xl bg-secondary/10 text-secondary flex items-center justify-center mx-auto">
                    <span className="material-symbols-outlined text-3xl">rocket_launch</span>
                  </div>
                  <div>
                    <h4 className="font-bold text-base text-on-surface">
                      Create a project to invite this student
                    </h4>
                    <p className="text-xs text-on-surface-variant max-w-sm mx-auto mt-1 leading-relaxed">
                      You must create a project first before you can invite {formatTeammateName(selectedBuilderForInvite)} to join your team.
                    </p>
                  </div>
                  <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedBuilderForInvite(null)}
                      className="w-full sm:w-auto px-4 py-2 rounded-xl bg-surface-container hover:bg-surface-container-high text-xs font-semibold text-on-surface cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedBuilderForInvite(null);
                        navigate('/create-project');
                      }}
                      className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-primary hover:bg-surface-tint text-on-primary text-xs font-bold shadow-md cursor-pointer flex items-center justify-center gap-1.5 transition-all"
                    >
                      <span className="material-symbols-outlined text-sm">add_circle</span>
                      <span>Create a project to invite this student</span>
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSendInviteSubmit} className="space-y-4 text-sm">
                  <div>
                    <label className="text-xs font-bold uppercase text-outline block mb-1">
                      Select Your Project or Team *
                    </label>
                    <select
                      required
                      value={selectedSquadTarget}
                      onChange={(e) => setSelectedSquadTarget(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-surface-container-high focus:border-secondary outline-none text-on-surface text-sm transition-all cursor-pointer font-medium"
                    >
                      {myAvailableSquads.map((sq) => (
                        <option key={sq.id} value={sq.id}>
                          {sq.title} ({sq.type === 'project' ? 'Project' : 'Hackathon Team'} · {sq.filledCount}/{sq.totalCapacity} Members)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold uppercase text-outline block mb-1">
                      Role Offered *
                    </label>
                    <input
                      type="text"
                      required
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value)}
                      placeholder="e.g. Frontend Developer, ML Researcher, Teammate..."
                      className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-surface-container-high focus:border-secondary outline-none text-on-surface text-sm transition-all"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold uppercase text-outline block mb-1">
                      Invitation Note (Optional)
                    </label>
                    <textarea
                      rows={2}
                      value={inviteMessage}
                      onChange={(e) => setInviteMessage(e.target.value)}
                      placeholder="Add a personalized message..."
                      className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-surface-container-high focus:border-secondary outline-none text-on-surface text-sm transition-all resize-none"
                    />
                  </div>

                  <div className="pt-2 border-t border-surface-container-high flex items-center justify-end gap-2.5">
                    <button
                      type="button"
                      onClick={() => setSelectedBuilderForInvite(null)}
                      className="px-4 py-2 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-semibold cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSendingInvite}
                      className="px-5 py-2 rounded-xl bg-primary hover:bg-surface-tint text-on-primary text-xs font-bold shadow-md cursor-pointer flex items-center gap-1.5 active:scale-[0.98] disabled:opacity-50"
                    >
                      <span className="material-symbols-outlined text-sm">send</span>
                      <span>{isSendingInvite ? 'Sending...' : 'Send Invitation'}</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
