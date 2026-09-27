import React, { useState } from 'react';

// Helper to filter out placeholder/empty strings
function cleanText(text) {
  if (!text) return '';
  const trimmed = String(text).trim();
  const lower = trimmed.toLowerCase();
  if (lower === 'nothing' || lower === 'n/a' || lower === 'none' || lower === 'campus member' || lower === 'collegiate campus') {
    return '';
  }
  return trimmed;
}

export default function ProjectDetails({ 
  project, 
  onBack, 
  onApplySuccess,
  onViewProfile,
  currentUser
}) {
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [applyingRole, setApplyingRole] = useState(null);
  const [whyAnswer, setWhyAnswer] = useState('');
  const [isSubmittingApply, setIsSubmittingApply] = useState(false);

  // Contact modal state
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [contactMember, setContactMember] = useState(null);

  if (!project) return null;

  // Real Creator information from MongoDB
  const creatorObj = typeof project.createdBy === 'object' && project.createdBy !== null ? project.createdBy : null;
  const creatorId = creatorObj?._id || project.createdBy;
  const creatorName = creatorObj?.name || project.lead?.name || '';
  const creatorCollege = cleanText(creatorObj?.college || creatorObj?.university || project.lead?.university);
  const creatorAvatar = creatorObj?.avatar || creatorObj?.profileImage || project.lead?.avatar || '';
  const creatorRole = cleanText(
    (creatorObj?.roleTitle !== 'Lead Architect' ? creatorObj?.roleTitle : '') || 
    (creatorObj?.role !== 'student' && creatorObj?.role !== 'admin' ? creatorObj?.role : '')
  );

  // GitHub Repository (only when a real URL exists)
  const rawGithub = project.githubRepository ? String(project.githubRepository).trim() : '';
  const realGithubRepo = (rawGithub && rawGithub.toLowerCase() !== 'nothing' && (rawGithub.startsWith('http') || rawGithub.includes('github.com')))
    ? rawGithub
    : '';

  // Problem Being Solved & What Are You Building (Real MongoDB data, no duplicates/placeholders)
  const problemBeingSolved = cleanText(project.problemBeingSolved || project.problemSolving?.description);
  let whatAreYouBuilding = cleanText(project.whatAreYouBuilding || project.tagline || project.fullDescription);
  if (whatAreYouBuilding && problemBeingSolved && whatAreYouBuilding.toLowerCase() === problemBeingSolved.toLowerCase()) {
    whatAreYouBuilding = '';
  }

  // Short project description for header
  const shortDescription = whatAreYouBuilding || problemBeingSolved;

  // Real Confirmed Team Members from MongoDB
  const rawMembers = Array.isArray(project.members) ? project.members : [];
  const memberMap = new Map();

  // Add creator first if present
  if (creatorId && creatorName) {
    memberMap.set(String(creatorId), {
      userId: creatorId,
      name: creatorName,
      college: creatorCollege,
      avatar: creatorAvatar,
      role: creatorRole,
      email: creatorObj?.email || '',
      github: creatorObj?.github || '',
      linkedin: creatorObj?.linkedin || '',
      showEmailToTeam: creatorObj?.showEmailToTeam !== false,
      isCreator: true,
    });
  }

  // Add members from project.members
  rawMembers.forEach(m => {
    const isObj = typeof m === 'object' && m !== null;
    const mId = isObj ? (m._id || m.id) : m;
    if (!mId) return;
    const idStr = String(mId);

    if (memberMap.has(idStr)) {
      // Merge extra details if available
      if (isObj) {
        const existing = memberMap.get(idStr);
        memberMap.set(idStr, {
          ...existing,
          email: existing.email || m.email || '',
          github: existing.github || m.github || '',
          linkedin: existing.linkedin || m.linkedin || '',
          college: existing.college || cleanText(m.college || m.university),
          role: existing.role || cleanText(m.roleTitle !== 'Lead Architect' ? m.roleTitle : ''),
        });
      }
      return;
    }

    memberMap.set(idStr, {
      userId: mId,
      name: isObj ? (m.name || 'Student Builder') : 'Student Builder',
      college: isObj ? cleanText(m.college || m.university) : '',
      avatar: isObj ? (m.avatar || m.profileImage || '') : '',
      role: isObj ? cleanText(m.roleTitle !== 'Lead Architect' ? m.roleTitle : '') : '',
      email: isObj ? (m.email || '') : '',
      github: isObj ? (m.github || '') : '',
      linkedin: isObj ? (m.linkedin || '') : '',
      showEmailToTeam: isObj ? (m.showEmailToTeam !== false) : true,
      isCreator: false,
    });
  });

  const confirmedMembers = Array.from(memberMap.values());
  const totalCapacity = Number(project.totalCapacity) || 4;
  const currentTeamSize = confirmedMembers.length;

  // Real open roles from MongoDB
  const rawVacancies = Array.isArray(project.openVacancies) && project.openVacancies.length > 0
    ? project.openVacancies
    : (Array.isArray(project.roles) && project.roles.length > 0)
      ? project.roles.map((r, idx) => ({
          id: `role-${idx}`,
          title: r.roleName,
          seats: `${r.membersCount || 1} ${Number(r.membersCount) === 1 ? 'seat' : 'seats'} available`,
        }))
      : (Array.isArray(project.rolesNeeded) && project.rolesNeeded.length > 0)
        ? project.rolesNeeded.map((r, idx) => ({
            id: `role-${idx}`,
            title: r,
            seats: '1 seat available',
          }))
        : [];

  const availableRoles = rawVacancies.filter(r => {
    const title = cleanText(r.title || r.roleName || r.name || r);
    return Boolean(title);
  });

  // Apply Modal handlers
  const handleOpenApplyModal = (role) => {
    setApplyingRole(role);
    setWhyAnswer('');
    setIsApplyModalOpen(true);
  };

  const handleCloseApplyModal = () => {
    if (isSubmittingApply) return;
    setIsApplyModalOpen(false);
    setApplyingRole(null);
    setWhyAnswer('');
  };

  const handleModalSubmit = async (e) => {
    e.preventDefault();
    if (!whyAnswer.trim()) return;

    setIsSubmittingApply(true);
    try {
      const roleTitle = applyingRole?.title || applyingRole?.roleName || applyingRole?.name || applyingRole || 'Open Role';
      if (onApplySuccess) {
        await onApplySuccess({
          projectId: project._id || project.id,
          projectTitle: project.title,
          role: roleTitle,
          message: whyAnswer.trim(),
          note: whyAnswer.trim(),
        });
      }
      handleCloseApplyModal();
    } catch (err) {
      console.error('Application submission error:', err);
    } finally {
      setIsSubmittingApply(false);
    }
  };

  // Contact Modal handlers
  const handleOpenContactModal = (member) => {
    setContactMember(member);
    setIsContactModalOpen(true);
  };

  const handleCloseContactModal = () => {
    setIsContactModalOpen(false);
    setContactMember(null);
  };

  return (
    <div className="flex flex-col w-full max-w-4xl mx-auto pb-space-xl space-y-space-lg">
      {/* Navigation / Back */}
      <div className="flex items-center justify-between py-space-xs">
        <button 
          type="button" 
          onClick={onBack}
          className="hover:text-primary transition-colors cursor-pointer flex items-center gap-1 font-title-sm text-title-sm text-on-surface-variant font-medium"
        >
          <span className="material-symbols-outlined text-base">arrow_back</span>
          <span>Back to Projects</span>
        </button>
      </div>

      {/* 1. PROJECT DETAILS HEADER */}
      <section className="bg-surface-container-lowest rounded-2xl shadow-sm p-space-lg lg:p-space-xl border border-surface-container-high/40">
        <h1 className="font-headline-lg text-headline-lg font-bold text-on-surface tracking-tight">
          {project.title}
        </h1>

        {shortDescription && (
          <p className="font-body-lg text-body-lg text-on-surface-variant mt-space-xs leading-relaxed">
            {shortDescription}
          </p>
        )}

        {/* Creator & Real GitHub Link Strip */}
        <div className="flex flex-wrap items-center gap-space-md pt-space-md mt-space-md border-t border-surface-container-high/40">
          {creatorName && (
            <div 
              onClick={() => {
                if (creatorId && onViewProfile) onViewProfile(creatorId);
              }}
              className="flex items-center gap-space-sm cursor-pointer hover:opacity-85 transition-opacity"
              title="View creator profile"
            >
              <div className="relative shrink-0">
                {creatorAvatar ? (
                  <img
                    src={creatorAvatar}
                    alt=""
                    className="w-10 h-10 rounded-full object-cover shadow-sm shrink-0"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      if (e.currentTarget.nextElementSibling) {
                        e.currentTarget.nextElementSibling.style.display = 'flex';
                      }
                    }}
                  />
                ) : null}
                <div 
                  style={{ display: creatorAvatar ? 'none' : 'flex' }}
                  className="w-10 h-10 rounded-full bg-secondary/15 text-secondary font-bold text-sm items-center justify-center shrink-0"
                >
                  {(creatorName || 'C').charAt(0).toUpperCase()}
                </div>
              </div>
              <div>
                <div className="font-title-sm text-title-sm text-on-surface font-semibold hover:text-secondary transition-colors">
                  {creatorName}
                </div>
                {creatorCollege && (
                  <div className="font-body-sm text-xs text-on-surface-variant">
                    {creatorCollege}
                  </div>
                )}
              </div>
            </div>
          )}

          {realGithubRepo && (
            <>
              <div className="h-5 w-px bg-surface-container-high hidden sm:block"></div>
              <a
                href={realGithubRepo.startsWith('http') ? realGithubRepo : `https://${realGithubRepo}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 text-secondary hover:underline font-label-md text-label-md ml-auto sm:ml-0 font-medium"
              >
                <span className="material-symbols-outlined text-base">code</span>
                <span>GitHub Repository</span>
                <span className="material-symbols-outlined text-xs">arrow_outward</span>
              </a>
            </>
          )}
        </div>
      </section>

      {/* 2. ABOUT THE PROJECT */}
      {(problemBeingSolved || whatAreYouBuilding) && (
        <section className="bg-surface-container-lowest rounded-2xl shadow-sm p-space-lg lg:p-space-xl border border-surface-container-high/40 space-y-space-md">
          <div className="flex items-center gap-space-sm mb-space-xs">
            <div className="w-8 h-8 rounded-lg bg-surface-container-high flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-lg">info</span>
            </div>
            <h2 className="font-headline-sm text-headline-sm text-on-surface font-bold">
              About the Project
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md pt-space-xs">
            {problemBeingSolved && (
              <div className="bg-surface-container-low p-space-md rounded-xl border border-surface-container-high/40">
                <div className="flex items-center gap-2 font-title-sm text-title-sm text-on-surface font-semibold mb-2">
                  <span className="material-symbols-outlined text-primary text-base">psychology_alt</span>
                  <span>Problem Being Solved</span>
                </div>
                <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed whitespace-pre-line">
                  {problemBeingSolved}
                </p>
              </div>
            )}

            {whatAreYouBuilding && (
              <div className="bg-surface-container-low p-space-md rounded-xl border border-surface-container-high/40">
                <div className="flex items-center gap-2 font-title-sm text-title-sm text-on-surface font-semibold mb-2">
                  <span className="material-symbols-outlined text-primary text-base">build</span>
                  <span>What Are You Building?</span>
                </div>
                <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed whitespace-pre-line">
                  {whatAreYouBuilding}
                </p>
              </div>
            )}
          </div>
        </section>
      )}

      {/* 3. TEAM */}
      <section className="bg-surface-container-lowest rounded-2xl shadow-sm p-space-lg lg:p-space-xl border border-surface-container-high/40">
        <div className="flex items-center justify-between mb-space-md">
          <div className="flex items-center gap-space-sm">
            <div className="w-8 h-8 rounded-lg bg-surface-container-high flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-lg">group</span>
            </div>
            <h2 className="font-headline-sm text-headline-sm text-on-surface font-bold">
              Team
            </h2>
          </div>
          <span className="px-3 py-1 rounded-full bg-surface-container-high text-on-surface font-label-md text-label-md font-semibold">
            {currentTeamSize} / {totalCapacity} Members
          </span>
        </div>

        {confirmedMembers.length === 0 ? (
          <div className="text-center py-6 text-on-surface-variant font-body-sm text-body-sm bg-surface-container-low rounded-xl">
            No team members joined yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-md">
            {confirmedMembers.map((member) => (
              <div 
                key={member.userId} 
                className="bg-surface-container-low p-space-md rounded-xl flex items-center justify-between border border-surface-container-high/50 hover:bg-surface-container transition-colors"
              >
                <div className="flex items-center gap-space-sm min-w-0">
                  <div className="relative shrink-0">
                    {member.avatar ? (
                      <img
                        src={member.avatar}
                        alt=""
                        className="w-11 h-11 rounded-full object-cover shadow-sm shrink-0"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          if (e.currentTarget.nextElementSibling) {
                            e.currentTarget.nextElementSibling.style.display = 'flex';
                          }
                        }}
                      />
                    ) : null}
                    <div 
                      style={{ display: member.avatar ? 'none' : 'flex' }}
                      className="w-11 h-11 rounded-full bg-secondary/15 text-secondary font-bold text-sm items-center justify-center shrink-0"
                    >
                      {(member.name || 'M').charAt(0).toUpperCase()}
                    </div>
                  </div>
                  <div className="min-w-0">
                    <span className="font-title-sm text-title-sm font-semibold text-on-surface block truncate">
                      {member.name}
                    </span>
                    {member.role && (
                      <span className="font-body-sm text-xs text-secondary font-medium block truncate">
                        {member.role}
                      </span>
                    )}
                    {member.college && (
                      <span className="font-label-sm text-[11px] text-outline block truncate">
                        {member.college}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0 ml-2">
                  {onViewProfile && (
                    <button
                      type="button"
                      onClick={() => onViewProfile(member.userId)}
                      className="px-2.5 py-1.5 rounded-lg bg-surface-container-lowest text-xs text-on-surface hover:text-secondary transition-colors cursor-pointer font-medium border border-surface-container-high/50"
                    >
                      View Profile
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleOpenContactModal(member)}
                    className="px-2.5 py-1.5 rounded-lg bg-secondary/10 hover:bg-secondary/20 text-secondary text-xs transition-colors cursor-pointer font-semibold"
                  >
                    Contact
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 4. LOOKING FOR (Open Roles) */}
      <section className="bg-surface-container-lowest rounded-2xl shadow-sm p-space-lg lg:p-space-xl border border-surface-container-high/40">
        <div className="flex items-center justify-between mb-space-md">
          <div className="flex items-center gap-space-sm">
            <div className="w-8 h-8 rounded-lg bg-surface-container-high flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-lg">person_search</span>
            </div>
            <h2 className="font-headline-sm text-headline-sm text-on-surface font-bold">
              Looking For
            </h2>
          </div>
          <span className="px-3 py-1 rounded-full bg-secondary-container text-on-secondary font-label-md text-label-md font-semibold">
            {availableRoles.length} {availableRoles.length === 1 ? 'Role Open' : 'Roles Open'}
          </span>
        </div>

        {availableRoles.length === 0 ? (
          <div className="text-center py-8 text-on-surface-variant font-body-md text-body-md bg-surface-container-low rounded-xl">
            No open roles are currently listed for this team.
          </div>
        ) : (
          <div className="space-y-space-md">
            {availableRoles.map((role, idx) => {
              const roleTitle = role.title || role.roleName || role.name || role;
              const seatsAvailable = role.seats || '1 seat available';
              const skills = Array.isArray(role.skills) ? role.skills.filter(Boolean) : [];
              const roleDesc = cleanText(role.desc);
              const shouldShowDesc = roleDesc && roleDesc !== whatAreYouBuilding && roleDesc !== problemBeingSolved;

              return (
                <div
                  key={role.id || idx}
                  className="bg-surface-container-low rounded-xl p-space-md lg:p-space-lg border border-surface-container-high/50 flex flex-col md:flex-row md:items-center justify-between gap-space-md"
                >
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-space-sm">
                      <h3 className="font-headline-sm text-headline-sm font-semibold text-on-surface">
                        {roleTitle}
                      </h3>
                      <span className="px-2.5 py-0.5 rounded-full bg-surface-container-highest text-secondary font-label-sm text-label-sm font-semibold shrink-0">
                        {seatsAvailable}
                      </span>
                    </div>

                    {shouldShowDesc && (
                      <p className="font-body-sm text-body-sm text-on-surface-variant">
                        {roleDesc}
                      </p>
                    )}

                    {skills.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        <span className="font-label-sm text-xs text-on-surface-variant mr-1">Skills:</span>
                        {skills.map((skill, sidx) => (
                          <span
                            key={sidx}
                            className="px-2 py-0.5 rounded-md bg-surface-container-lowest text-on-surface font-label-sm text-xs border border-surface-container-high/60"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="shrink-0 flex items-center">
                    <button
                      type="button"
                      onClick={() => handleOpenApplyModal(role)}
                      className="px-5 py-2.5 rounded-xl bg-primary text-on-primary font-title-sm text-title-sm hover:bg-surface-tint active:scale-[0.98] transition-all cursor-pointer shadow-xs font-semibold"
                    >
                      Apply
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 4. Simple Application Modal */}
      {isApplyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-primary-container/40 backdrop-blur-sm animate-modal">
          <div className="fixed inset-0" onClick={handleCloseApplyModal} />
          <div className="relative w-full max-w-lg bg-surface-container-lowest rounded-2xl shadow-2xl border border-surface-container-high overflow-hidden z-10 p-space-lg">
            <div className="flex items-start justify-between mb-space-md">
              <div>
                <h3 className="font-headline-sm text-headline-sm font-bold text-on-surface">
                  Apply for {applyingRole?.title || applyingRole?.roleName || applyingRole?.name || applyingRole || 'Role'}
                </h3>
              </div>
              <button 
                type="button" 
                onClick={handleCloseApplyModal}
                disabled={isSubmittingApply}
                className="p-1.5 rounded-xl hover:bg-surface-container text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>

            <form onSubmit={handleModalSubmit} className="space-y-space-md">
              <div>
                <label className="block font-title-sm text-title-sm text-on-surface mb-1">
                  Why do you want to join?
                </label>
                <textarea
                  required
                  rows={4}
                  value={whyAnswer}
                  onChange={(e) => setWhyAnswer(e.target.value)}
                  placeholder="Why do you want to join?"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low text-on-surface placeholder:text-on-surface-variant font-body-sm text-body-sm outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-secondary/30 transition-all resize-none border border-surface-container-high/60"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-space-sm border-t border-surface-container-high/40">
                <button
                  type="button"
                  onClick={handleCloseApplyModal}
                  disabled={isSubmittingApply}
                  className="px-4 py-2.5 rounded-xl text-on-surface-variant hover:text-on-surface font-title-sm text-title-sm transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingApply || !whyAnswer.trim()}
                  className="px-5 py-2.5 rounded-xl bg-primary text-on-primary font-title-sm text-title-sm shadow-md hover:bg-surface-tint active:scale-[0.98] transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
                >
                  {isSubmittingApply ? (
                    <>
                      <span className="material-symbols-outlined animate-spin text-base">progress_activity</span>
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <span>Submit Application</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 11. Real Contact Information Modal */}
      {isContactModalOpen && contactMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-primary-container/40 backdrop-blur-sm animate-modal">
          <div className="fixed inset-0" onClick={handleCloseContactModal} />
          <div className="relative w-full max-w-md bg-surface-container-lowest rounded-2xl shadow-2xl border border-surface-container-high overflow-hidden z-10 p-space-lg">
            <div className="flex items-start justify-between mb-space-md">
              <div className="flex items-center gap-3">
                <div className="relative shrink-0">
                  {contactMember.avatar ? (
                    <img
                      src={contactMember.avatar}
                      alt=""
                      className="w-12 h-12 rounded-full object-cover shadow-sm shrink-0"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-secondary/15 text-secondary font-bold text-lg flex items-center justify-center shrink-0">
                      {(contactMember.name || 'M').charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div>
                  <h3 className="font-title-md text-title-md font-bold text-on-surface">
                    {contactMember.name}
                  </h3>
                  {contactMember.college && (
                    <p className="font-body-sm text-xs text-on-surface-variant">
                      {contactMember.college}
                    </p>
                  )}
                </div>
              </div>
              <button 
                type="button" 
                onClick={handleCloseContactModal}
                className="p-1.5 rounded-xl hover:bg-surface-container text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>

            <div className="space-y-3.5 pt-1">
              {/* Email (only if allowed by privacy setting or viewer is self/admin) */}
              {contactMember.email && (contactMember.showEmailToTeam || String(contactMember.userId) === String(currentUser?._id) || currentUser?.role === 'admin') ? (
                <div className="p-3 rounded-xl bg-surface-container-low border border-surface-container-high/50 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <span className="font-label-sm text-[11px] text-outline uppercase tracking-wider block">
                      Email Address
                    </span>
                    <span className="font-body-sm text-sm text-on-surface font-medium truncate block">
                      {contactMember.email}
                    </span>
                  </div>
                  <a
                    href={`mailto:${contactMember.email}`}
                    className="px-3.5 py-1.5 rounded-xl bg-primary text-on-primary font-title-sm text-xs font-semibold hover:bg-surface-tint transition-all shrink-0 inline-flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-sm">mail</span>
                    <span>Send Email</span>
                  </a>
                </div>
              ) : contactMember.email && !contactMember.showEmailToTeam ? (
                <div className="p-3 rounded-xl bg-surface-container-low border border-surface-container-high/50 text-xs text-on-surface-variant">
                  <span className="material-symbols-outlined text-sm align-middle mr-1">lock</span>
                  Email hidden by member privacy settings.
                </div>
              ) : null}

              {/* GitHub */}
              {contactMember.github && cleanText(contactMember.github) && (
                <div className="p-3 rounded-xl bg-surface-container-low border border-surface-container-high/50 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <span className="font-label-sm text-[11px] text-outline uppercase tracking-wider block">
                      GitHub
                    </span>
                    <span className="font-body-sm text-sm text-on-surface font-medium truncate block">
                      {contactMember.github}
                    </span>
                  </div>
                  <a
                    href={contactMember.github.startsWith('http') ? contactMember.github : `https://${contactMember.github}`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3.5 py-1.5 rounded-xl bg-surface-container-highest text-on-surface font-title-sm text-xs font-semibold hover:bg-surface-container transition-all shrink-0 inline-flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-sm">code</span>
                    <span>GitHub</span>
                    <span className="material-symbols-outlined text-xs">arrow_outward</span>
                  </a>
                </div>
              )}

              {/* LinkedIn */}
              {contactMember.linkedin && cleanText(contactMember.linkedin) && (
                <div className="p-3 rounded-xl bg-surface-container-low border border-surface-container-high/50 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <span className="font-label-sm text-[11px] text-outline uppercase tracking-wider block">
                      LinkedIn
                    </span>
                    <span className="font-body-sm text-sm text-on-surface font-medium truncate block">
                      {contactMember.linkedin}
                    </span>
                  </div>
                  <a
                    href={contactMember.linkedin.startsWith('http') ? contactMember.linkedin : `https://${contactMember.linkedin}`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3.5 py-1.5 rounded-xl bg-surface-container-highest text-on-surface font-title-sm text-xs font-semibold hover:bg-surface-container transition-all shrink-0 inline-flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-sm">link</span>
                    <span>LinkedIn</span>
                    <span className="material-symbols-outlined text-xs">arrow_outward</span>
                  </a>
                </div>
              )}

              {/* If no contact info stored */}
              {(!contactMember.email || (!contactMember.showEmailToTeam && String(contactMember.userId) !== String(currentUser?._id) && currentUser?.role !== 'admin')) &&
               (!contactMember.github || !cleanText(contactMember.github)) &&
               (!contactMember.linkedin || !cleanText(contactMember.linkedin)) && (
                <div className="py-6 text-center text-on-surface-variant font-body-sm text-sm bg-surface-container-low rounded-xl">
                  No public contact information shared by this member.
                </div>
              )}
            </div>

            <div className="pt-space-md mt-space-md border-t border-surface-container-high/40 flex justify-end">
              <button
                type="button"
                onClick={handleCloseContactModal}
                className="px-4 py-2 rounded-xl bg-surface-container-low hover:bg-surface-container text-on-surface font-title-sm text-title-sm transition-all cursor-pointer font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
