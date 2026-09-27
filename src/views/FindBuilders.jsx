import React, { useState } from 'react';

export default function FindBuilders({ 
  builders = [], 
  projects = [], 
  hackathonSquads = [], 
  pendingInvitations = [], 
  onInvite, 
  onViewProfile, 
  showToast, 
  currentUser 
}) {
  const [search, setSearch] = useState('');
  const [selectedRole, setSelectedRole] = useState('all');
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

  const handleOpenInviteModal = (builder) => {
    if (!currentUser) {
      if (showToast) showToast('Please sign in to invite teammates.');
      return;
    }
    if (builder._id === currentUser._id) {
      if (showToast) showToast('You cannot invite yourself to a team.');
      return;
    }
    if (myAvailableSquads.length === 0) {
      if (showToast) showToast('You must create a project or squad first before you can invite teammates.');
      return;
    }
    setSelectedBuilderForInvite(builder);
    setSelectedSquadTarget(myAvailableSquads[0].id);
    setInviteRole('Core Contributor');
    setInviteMessage(`Hey ${builder.name?.split(' ')[0] || 'there'}, join our squad on BuildCrew!`);
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

  const filteredBuilders = builders.filter(b => {
    // Hide current logged in user from teammates discovery if desired, or allow viewing profile
    const bName = b.name || '';
    const bCollege = b.college || b.university || '';
    const bBranch = b.branch || b.major || '';
    const bRole = b.roleTitle || b.role || '';
    const bSkills = Array.isArray(b.skills) ? b.skills : [];

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
  });

  return (
    <div className="flex flex-col w-full pb-space-xl space-y-space-lg">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col max-w-2xl">
          <div className="flex items-center gap-space-xs text-secondary font-label-md text-label-md uppercase tracking-wider mb-1">
            <span className="material-symbols-outlined text-base">group_add</span>
            <span>Student Builder Matchmaking</span>
          </div>
          <h1 className="font-headline-lg text-headline-lg font-bold text-on-surface tracking-tight">
            Find Campus Teammates
          </h1>
          <p className="font-body-lg text-body-lg text-on-surface-variant mt-1">
            Scout real registered student engineers, designers, and researchers seeking squads for upcoming hackathons.
          </p>
        </div>
      </div>

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
            placeholder="Search builders by name, skill, college, branch..."
            className="w-full pl-10 pr-4 py-2.5 bg-surface text-on-surface placeholder:text-on-surface-variant font-body-sm text-body-sm rounded-xl outline-none focus:bg-surface-container-lowest shadow-sm transition-all"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto">
          <button
            type="button"
            onClick={() => setSelectedRole('all')}
            className={`px-3.5 py-1.5 rounded-full font-label-md text-label-md transition-all cursor-pointer whitespace-nowrap ${
              selectedRole === 'all' ? 'bg-primary text-on-primary' : 'bg-surface-container-high text-on-surface-variant'
            }`}
          >
            All Students
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
            onClick={() => setSelectedRole('frontend')}
            className={`px-3.5 py-1.5 rounded-full font-label-md text-label-md transition-all cursor-pointer whitespace-nowrap ${
              selectedRole === 'frontend' ? 'bg-primary text-on-primary' : 'bg-surface-container-high text-on-surface-variant'
            }`}
          >
            Frontend
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
            const avatarImg = b.avatar || b.profileImage;
            const collegeName = cleanText(b.college || b.university);
            const branchName = b.branch || b.major || '';
            const semesterText = b.semester ? `Semester ${b.semester}` : (b.year ? `Class of ${b.year}` : '');
            const hasSkills = Array.isArray(b.skills) && b.skills.length > 0;
            const hasBio = Boolean(b.bio && b.bio.trim());

            return (
              <div
                key={b._id || b.id}
                className="bg-surface-container-lowest rounded-2xl p-space-md shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4 border border-surface-container-high/40"
              >
                <div className="space-y-3">
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
                        {(b.name || 'S').charAt(0).toUpperCase()}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className="font-title-md text-title-md font-bold text-on-surface truncate">
                          {b.name}
                        </h3>
                        {isSelf ? (
                          <span className="px-2 py-0.5 rounded-full bg-secondary text-on-secondary font-label-sm text-[11px] font-bold">
                            You
                          </span>
                        ) : null}
                      </div>
                      <div className="font-body-sm text-body-sm text-secondary font-semibold">
                        {b.roleTitle || b.role || 'Student Builder'}
                      </div>
                      {collegeName && (
                        <div className="font-label-sm text-label-sm text-on-surface-variant truncate">
                          {collegeName} {branchName ? `· ${branchName}` : ''}
                        </div>
                      )}
                      {!collegeName && branchName && (
                        <div className="font-label-sm text-label-sm text-on-surface-variant truncate">
                          {branchName}
                        </div>
                      )}
                      {semesterText && (
                        <div className="text-[11px] text-outline font-medium">
                          {semesterText}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* GitHub & Profile Links if present */}
                  {b.github && (
                    <div className="flex items-center gap-2">
                      <a
                        href={b.github.startsWith('http') ? b.github : `https://${b.github}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-secondary hover:text-primary font-semibold transition-colors"
                      >
                        <span className="material-symbols-outlined text-sm">code</span>
                        <span>GitHub Profile</span>
                        <span className="material-symbols-outlined text-[10px]">arrow_outward</span>
                      </a>
                    </div>
                  )}

                  {/* Bio snippet if present */}
                  {hasBio && (
                    <p className="text-xs text-on-surface-variant line-clamp-2 leading-relaxed italic bg-surface-container-low/50 p-2 rounded-xl">
                      "{b.bio}"
                    </p>
                  )}

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
                    <button
                      type="button"
                      onClick={() => handleOpenInviteModal(b)}
                      className="py-2 px-4 rounded-xl font-title-sm text-title-sm bg-primary text-on-primary hover:bg-surface-tint active:scale-[0.98] transition-all flex items-center gap-1 cursor-pointer shadow-xs"
                    >
                      <span className="material-symbols-outlined text-base">person_add</span>
                      <span>Invite to Team</span>
                    </button>
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
                  <span>Dispatch Invitation</span>
                </div>
                <h3 className="text-xl font-bold tracking-tight">
                  Invite {selectedBuilderForInvite.name}
                </h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  Send a formal team invitation through BuildCrew and MongoDB.
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
                <div className="text-center py-6 space-y-3">
                  <span className="material-symbols-outlined text-4xl text-outline">group_add</span>
                  <h4 className="font-bold text-base text-on-surface">No Active Teams Found</h4>
                  <p className="text-xs text-on-surface-variant max-w-sm mx-auto">
                    You must first post a project or form a hackathon squad to invite teammates.
                  </p>
                  <button
                    type="button"
                    onClick={() => setSelectedBuilderForInvite(null)}
                    className="px-4 py-2 rounded-xl bg-surface-container hover:bg-surface-container-high text-xs font-bold text-on-surface cursor-pointer mt-2"
                  >
                    Close
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSendInviteSubmit} className="space-y-4 text-sm">
                  <div>
                    <label className="text-xs font-bold uppercase text-outline block mb-1">
                      Choose Your Squad / Project *
                    </label>
                    <select
                      required
                      value={selectedSquadTarget}
                      onChange={(e) => setSelectedSquadTarget(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-surface-container-high focus:border-secondary outline-none text-on-surface text-sm transition-all cursor-pointer font-medium"
                    >
                      {myAvailableSquads.map((sq) => (
                        <option key={sq.id} value={sq.id}>
                          {sq.title} ({sq.type === 'project' ? 'Project' : 'Hackathon Squad'} · {sq.filledCount}/{sq.totalCapacity} Members)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold uppercase text-outline block mb-1">
                      Invited Role Title *
                    </label>
                    <input
                      type="text"
                      required
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value)}
                      placeholder="e.g. Frontend Engineer, ML Researcher, Teammate..."
                      className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-surface-container-high focus:border-secondary outline-none text-on-surface text-sm transition-all"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold uppercase text-outline block mb-1">
                      Personal Message
                    </label>
                    <textarea
                      rows={2}
                      value={inviteMessage}
                      onChange={(e) => setInviteMessage(e.target.value)}
                      placeholder="Add a personalized note..."
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
                      <span>{isSendingInvite ? 'Dispatching...' : 'Send Real Invitation'}</span>
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
