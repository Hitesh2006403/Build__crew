import { useState } from 'react';

export default function HackathonSquadUpModal({
  hackathon,
  isOpen,
  onClose,
  projects = [],
  builders = [],
  onApplySquad,
  onInviteBuilder,
  onCreateSquad,
  showToast,
  currentUser
}) {
  const [activeTab, setActiveTab] = useState('find-teammates'); // 'find-teammates' | 'teams' | 'create'
  const [appliedTeams, setAppliedTeams] = useState({});
  const [invitedBuilders, setInvitedBuilders] = useState({});
  const [teamFormedNotice, setTeamFormedNotice] = useState(null);

  // Simple Create Team Form state
  const [teamName, setTeamName] = useState('');
  const [selectedTrack, setSelectedTrack] = useState('');
  const [rolesNeeded, setRolesNeeded] = useState('Frontend, Backend / AI');
  const [projectIdea, setProjectIdea] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !hackathon) return null;

  const regLink = hackathon.officialRegistrationLink || (typeof hackathon.organizer === 'object' ? hackathon.organizer?.website : '') || '#';
  const orgName = typeof hackathon.organizer === 'object' ? hackathon.organizer?.name : hackathon.organizer || 'Organizing Board';

  // Filter squads relevant to this hackathon
  const hackathonTeams = projects.filter(p => {
    const hackKey = (hackathon.title || '').toLowerCase().split(' ')[0];
    const cat = (p.categoryBadge || '').toLowerCase();
    const titleMatch = hackKey && cat.includes(hackKey);
    return titleMatch || p.type === 'hackathon';
  });

  const handleApply = (team) => {
    const teamId = team._id || team.id;
    setAppliedTeams(prev => ({ ...prev, [teamId]: true }));
    if (onApplySquad) {
      onApplySquad({
        projectId: teamId,
        projectTitle: team.title,
        role: team.openVacancies?.[0]?.title || 'Core Team Member',
        submittedAt: 'Just now',
        status: 'Pending Lead Review',
        statusColor: 'bg-secondary-fixed text-on-secondary-fixed',
        note: `Applied to join ${team.title} for ${hackathon.title}.`
      });
    }
    setTeamFormedNotice(`Applied to join ${team.title}! Once accepted, your team is formed. Remember to register officially.`);
    if (showToast) {
      showToast(`Request sent to ${team.lead?.name || 'team lead'} for ${hackathon.title}!`);
    }
  };

  const handleInvite = (builder) => {
    const bId = builder._id || builder.id;
    setInvitedBuilders(prev => ({ ...prev, [bId]: true }));
    if (onInviteBuilder) {
      onInviteBuilder(builder);
    }
    setTeamFormedNotice(`Invitation sent to ${builder.name}! You can now coordinate your squad and complete official registration.`);
    if (showToast) {
      showToast(`Team invitation dispatched to ${builder.name}!`);
    }
  };

  const handleCreateSubmit = (e) => {
    e.preventDefault();
    if (!teamName.trim()) return;

    setIsSubmitting(true);
    setTimeout(() => {
      const newTeam = {
        id: `squad-${Date.now()}`,
        title: teamName,
        fullTitle: `${teamName} — ${hackathon.title} Team`,
        tagline: projectIdea || `Building for ${hackathon.title} in ${selectedTrack || 'General Track'}`,
        fullDescription: projectIdea,
        type: 'hackathon',
        categoryBadge: hackathon.title.split(' ')[0],
        recruitingBadge: 'Recruiting Members',
        urgency: 'high',
        matchScore: 98,
        publishedTime: 'Just now',
        image: hackathon.heroImage || hackathon.coverImage || '',
        imageTag: selectedTrack || 'Hackathon Sprint',
        techStack: ['React', 'FastAPI', 'Python', 'Tailwind'],
        rolesNeeded: rolesNeeded.split(',').map(r => r.trim()).filter(Boolean),
        campus: currentUser?.college || currentUser?.university || currentUser?.campus || '',
        filledCount: 1,
        totalCapacity: 4,
        lead: {
          name: currentUser?.name || 'Student Builder',
          university: currentUser?.college || currentUser?.university || '',
          roleTitle: currentUser?.roleTitle || 'Squad Creator',
          avatar: currentUser?.avatar || currentUser?.profileImage || ''
        },
        openVacancies: rolesNeeded.split(',').map((r, i) => ({
          id: `vac-${i}`,
          track: 'Core Member',
          title: r.trim(),
          seats: '1 seat open',
          desc: `Looking for a ${r.trim()} to build for ${hackathon.title}.`,
          skills: ['Problem Solving', 'Git', 'Fast Prototyping'],
          hours: 'Hackathon Sprint'
        }))
      };

      if (onCreateSquad) {
        onCreateSquad(newTeam);
      }
      setIsSubmitting(false);
      setTeamFormedNotice(`Team "${teamName}" created! Next step: Complete your team registration on the official portal.`);
      if (showToast) {
        showToast(`Team "${teamName}" registered for ${hackathon.title}!`);
      }
    }, 500);
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/70 backdrop-blur-md animate-fadeIn"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-3xl max-h-[92vh] bg-surface-container-lowest rounded-3xl shadow-2xl border border-surface-container-high overflow-hidden flex flex-col animate-modal"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Banner */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white/80 hover:text-white flex items-center justify-center transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-base">close</span>
          </button>

          <div className="flex items-center gap-2 mb-2">
            <span className="px-2.5 py-0.5 rounded-full bg-blue-500/25 border border-blue-400/40 text-blue-200 text-[11px] font-extrabold uppercase tracking-wide">
              {hackathon.circuitId || 'CIRCUIT MATCHMAKING'}
            </span>
            <span className="text-xs text-slate-300 font-medium">
              {hackathon.dates} · {hackathon.location?.split(',')[0]}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white p-1.5 flex items-center justify-center shrink-0 shadow-sm">
              {hackathon.logo ? (
                <img src={hackathon.logo} alt={hackathon.title} className="w-full h-full object-contain rounded" />
              ) : (
                <span className="material-symbols-outlined text-2xl text-secondary">terminal</span>
              )}
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Build a Team · {hackathon.title}
              </h2>
              <p className="text-xs text-blue-200/90 font-medium mt-0.5">
                Find teammates, join existing teams, or register a new team for {orgName}.
              </p>
            </div>
          </div>
        </div>

        {/* Team Formed Success Banner (Requirement 7 Flow) */}
        {teamFormedNotice && (
          <div className="p-3.5 bg-emerald-50 border-b border-emerald-200 text-xs text-emerald-900 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shrink-0 animate-fadeIn">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-emerald-600 text-lg">check_circle</span>
              <span className="font-semibold">{teamFormedNotice}</span>
            </div>
            {regLink !== '#' && (
              <a
                href={regLink}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-all shrink-0 self-start sm:self-auto"
              >
                <span>Official Registration</span>
                <span className="material-symbols-outlined text-sm">open_in_new</span>
              </a>
            )}
          </div>
        )}

        {/* Tab Switcher: Find Teammates, Existing Teams, Create Team */}
        <div className="flex items-center gap-1 px-4 sm:px-6 pt-2.5 border-b border-surface-container-high bg-surface-container-low shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('find-teammates')}
            className={`pb-2.5 px-3 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'find-teammates'
                ? 'border-secondary text-secondary'
                : 'border-transparent text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-base">person_search</span>
            <span>Find Teammates</span>
            <span className="px-1.5 py-0.2 rounded-full bg-secondary-fixed text-on-secondary-fixed text-[10px] font-extrabold">
              {builders.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('teams')}
            className={`pb-2.5 px-3 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'teams'
                ? 'border-secondary text-secondary'
                : 'border-transparent text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-base">groups</span>
            <span>Existing Teams</span>
            <span className="px-1.5 py-0.2 rounded-full bg-surface-container-high text-on-surface-variant text-[10px] font-extrabold">
              {hackathonTeams.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('create')}
            className={`pb-2.5 px-3 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'create'
                ? 'border-secondary text-secondary'
                : 'border-transparent text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-base">add_circle</span>
            <span>+ Create Team</span>
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
          {/* TAB 1: FIND TEAMMATES (Invite) */}
          {activeTab === 'find-teammates' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-on-surface-variant font-medium">
                <span>College students seeking a team for {hackathon.title}:</span>
                <span className="text-secondary font-bold">1-Click Invite</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {builders.map((builder) => {
                  const isInvited = invitedBuilders[builder.id];
                  return (
                    <div
                      key={builder.id}
                      className="p-3.5 rounded-2xl bg-surface-container-low border border-surface-container-high flex flex-col justify-between space-y-3"
                    >
                      <div className="flex items-start gap-3">
                        <div className="relative shrink-0">
                          {builder.avatar ? (
                            <img
                              src={builder.avatar}
                              alt=""
                              className="w-10 h-10 rounded-full object-cover ring-1 ring-secondary/30 shrink-0"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                if (e.currentTarget.nextElementSibling) {
                                  e.currentTarget.nextElementSibling.style.display = 'flex';
                                }
                              }}
                            />
                          ) : null}
                          <div 
                            style={{ display: builder.avatar ? 'none' : 'flex' }}
                            className="w-10 h-10 rounded-full bg-secondary/15 text-secondary font-bold text-sm items-center justify-center ring-1 ring-secondary/30 shrink-0"
                          >
                            {(builder.name || 'B').charAt(0).toUpperCase()}
                          </div>
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-bold text-xs sm:text-sm text-on-surface truncate">
                            {builder.name}
                          </h4>
                          <p className="text-[11px] text-on-surface-variant truncate">
                            {builder.university} · {builder.year}
                          </p>
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {builder.skills?.slice(0, 3).map((skill, sIdx) => (
                              <span
                                key={sIdx}
                                className="px-2 py-0.5 rounded-md bg-surface-container text-on-surface text-[10px] font-semibold"
                              >
                                {skill}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-surface-container-high/60 flex items-center justify-between">
                        <span className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                          Available
                        </span>
                        <button
                          type="button"
                          disabled={isInvited}
                          onClick={() => handleInvite(builder)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                            isInvited
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-primary hover:bg-surface-tint text-on-primary shadow-xs'
                          }`}
                        >
                          <span className="material-symbols-outlined text-sm">
                            {isInvited ? 'check' : 'person_add'}
                          </span>
                          <span>{isInvited ? 'Invited' : 'Invite to Team'}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: EXISTING TEAMS (Join) */}
          {activeTab === 'teams' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-on-surface-variant font-medium">
                <span>Teams currently recruiting members for {hackathon.title}:</span>
                <span className="text-secondary font-bold">Request to Join</span>
              </div>

              {hackathonTeams.length === 0 ? (
                <div className="py-10 text-center text-on-surface-variant space-y-2.5 bg-surface-container-low rounded-2xl border border-surface-container-high/50">
                  <span className="material-symbols-outlined text-4xl text-outline">groups</span>
                  <p className="font-semibold text-sm text-on-surface">No squads formed for this hackathon yet</p>
                  <p className="text-xs text-on-surface-variant max-w-sm mx-auto">
                    Switch to "+ Create Team" to register the first squad and start recruiting teammates.
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveTab('create')}
                    className="mt-2 px-4 py-2 rounded-xl bg-primary text-on-primary text-xs font-bold shadow-xs hover:bg-surface-tint cursor-pointer"
                  >
                    + Create First Team
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {hackathonTeams.map((team) => {
                    const isApplied = appliedTeams[team.id];
                    return (
                      <div
                        key={team.id}
                        className="p-4 rounded-2xl bg-surface-container-low border border-surface-container-high flex flex-col sm:flex-row sm:items-center justify-between gap-3.5"
                      >
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2">
                            <h4 className="font-title-md font-black text-on-surface">
                              {team.title}
                            </h4>
                            <span className="px-2 py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed text-[10px] font-extrabold">
                              {team.filledCount || 1}/{team.totalCapacity || 4} Members
                            </span>
                          </div>
                          <p className="text-xs text-on-surface-variant leading-relaxed max-w-xl">
                            {team.tagline}
                          </p>
                          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                            {team.techStack?.slice(0, 4).map((tech, idx) => (
                              <span
                                key={idx}
                                className="px-2 py-0.5 rounded-md bg-surface-container text-on-surface text-[10px] font-semibold"
                              >
                                {tech}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
                          <button
                            type="button"
                            disabled={isApplied}
                            onClick={() => handleApply(team)}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                              isApplied
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-primary hover:bg-surface-tint text-on-primary shadow-xs'
                            }`}
                          >
                            <span className="material-symbols-outlined text-sm">
                              {isApplied ? 'done_all' : 'group_add'}
                            </span>
                            <span>{isApplied ? 'Requested' : 'Join Team'}</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: CREATE TEAM */}
          {activeTab === 'create' && (
            <form onSubmit={handleCreateSubmit} className="space-y-3.5">
              <div className="p-3.5 rounded-2xl bg-blue-50 border border-blue-200 text-xs text-blue-900 flex items-center gap-2">
                <span className="material-symbols-outlined text-blue-600 text-lg">info</span>
                <span>
                  Creating a team lets other students find and join your squad for {hackathon.title}. Once your team is ready, complete your official registration.
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-on-surface mb-1">
                  Team Name *
                </label>
                <input
                  type="text"
                  required
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  placeholder="e.g. Campus Innovators"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-transparent focus:border-secondary focus:bg-surface-container-lowest text-xs sm:text-sm text-on-surface outline-none transition-all font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-on-surface mb-1">
                  Target Track
                </label>
                <select
                  value={selectedTrack}
                  onChange={(e) => setSelectedTrack(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-transparent focus:border-secondary focus:bg-surface-container-lowest text-xs sm:text-sm text-on-surface outline-none transition-all font-medium cursor-pointer"
                >
                  <option value="">Select track (optional)</option>
                  {hackathon.trackLabels?.map((tl, tidx) => (
                    <option key={tidx} value={tl}>{tl}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-on-surface mb-1">
                  Teammates / Roles Needed
                </label>
                <input
                  type="text"
                  required
                  value={rolesNeeded}
                  onChange={(e) => setRolesNeeded(e.target.value)}
                  placeholder="e.g. Frontend Lead, ML Engineer, UI/UX"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-transparent focus:border-secondary focus:bg-surface-container-lowest text-xs sm:text-sm text-on-surface outline-none transition-all font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-on-surface mb-1">
                  Project Concept / Pitch
                </label>
                <textarea
                  rows={2}
                  required
                  value={projectIdea}
                  onChange={(e) => setProjectIdea(e.target.value)}
                  placeholder="Brief idea or problem statement your team intends to tackle during the hackathon..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-transparent focus:border-secondary focus:bg-surface-container-lowest text-xs sm:text-sm text-on-surface outline-none transition-all font-medium resize-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setActiveTab('find-teammates')}
                  className="px-4 py-2 rounded-xl bg-surface-container hover:bg-surface-container-high text-xs font-bold text-on-surface transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-primary hover:bg-surface-tint active:scale-[0.98] text-xs font-bold text-on-primary shadow-md transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-sm">rocket_launch</span>
                  <span>{isSubmitting ? 'Creating Team...' : `Register Team for ${hackathon.title.split(' ')[0]}`}</span>
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer info strip */}
        <div className="p-3.5 sm:p-4 bg-surface-container-low border-t border-surface-container-high flex items-center justify-between text-xs text-on-surface-variant shrink-0">
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-sm text-secondary">verified_user</span>
            <span>All teams follow official collegiate event guidelines.</span>
          </div>

          <div className="flex items-center gap-3">
            {regLink !== '#' && (
              <a
                href={regLink}
                target="_blank"
                rel="noreferrer"
                className="text-secondary font-bold hover:underline inline-flex items-center gap-1"
              >
                <span>Official Registration</span>
                <span className="material-symbols-outlined text-xs">open_in_new</span>
              </a>
            )}
            <button
              type="button"
              onClick={onClose}
              className="text-on-surface-variant hover:text-on-surface font-semibold cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
