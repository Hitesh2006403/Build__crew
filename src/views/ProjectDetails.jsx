import React, { useState } from 'react';

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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const handleOpenApplyModal = (role) => {
    setApplyingRole(role);
    setWhyAnswer('');
    setIsApplyModalOpen(true);
  };

  const handleCloseApplyModal = () => {
    if (isSubmitting) return;
    setIsApplyModalOpen(false);
    setApplyingRole(null);
    setWhyAnswer('');
  };

  const handleModalSubmit = async (e) => {
    e.preventDefault();
    if (!whyAnswer.trim()) return;

    setIsSubmitting(true);
    try {
      const roleTitle = applyingRole?.title || applyingRole?.name || applyingRole || 'Open Role';
      if (onApplySuccess) {
        await onApplySuccess({
          projectId: project._id || project.id,
          projectTitle: project.title,
          role: roleTitle,
          note: whyAnswer.trim(),
        });
      }
      handleCloseApplyModal();
    } catch (err) {
      console.error('Application error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Creator information from real MongoDB data
  const creatorId = (typeof project.createdBy === 'object' ? (project.createdBy?._id || project.createdBy?.id) : project.createdBy) || project.lead?.id;
  const creatorName = (typeof project.createdBy === 'object' ? project.createdBy?.name : '') || project.lead?.name || 'Squad Lead';
  const creatorSchool = (typeof project.createdBy === 'object' ? (project.createdBy?.university || project.createdBy?.college) : '') || project.lead?.university || project.lead?.program || '';
  const creatorAvatar = (typeof project.createdBy === 'object' ? (project.createdBy?.avatar || project.createdBy?.profileImage) : '') || project.lead?.avatar || project.lead?.leadAvatarFull || '';
  const creatorRole = (typeof project.createdBy === 'object' ? project.createdBy?.roleTitle : '') || project.lead?.roleTitle || 'Squad Creator';

  // Resolved list of confirmed squad members
  const rawMembers = Array.isArray(project.members) ? project.members : [];
  const otherConfirmedMembers = rawMembers
    .filter(m => {
      const mId = typeof m === 'object' ? (m._id || m.id) : m;
      return mId && String(mId) !== String(creatorId);
    })
    .map(m => {
      const isObj = typeof m === 'object' && m !== null;
      return {
        userId: isObj ? (m._id || m.id) : m,
        name: isObj ? (m.name || 'Team Member') : 'Team Member',
        role: isObj ? (m.roleTitle || m.role || 'Member') : 'Member',
        school: isObj ? (m.university || m.college || '') : '',
        avatar: isObj ? (m.avatar || m.profileImage || '') : '',
        badge: 'Member'
      };
    });

  const confirmedMembers = [];
  if (creatorName) {
    confirmedMembers.push({
      userId: creatorId,
      name: creatorName,
      role: creatorRole,
      school: creatorSchool,
      avatar: creatorAvatar,
      badge: 'Lead'
    });
  }
  confirmedMembers.push(...otherConfirmedMembers);

  const totalCapacity = project.totalCapacity || 4;
  const currentTeamSize = confirmedMembers.length;

  // Real available roles from MongoDB
  const availableRoles = (Array.isArray(project.openVacancies) && project.openVacancies.length > 0)
    ? project.openVacancies
    : (Array.isArray(project.rolesNeeded) && project.rolesNeeded.length > 0)
      ? project.rolesNeeded.map((r, idx) => ({
          id: `role-${idx}`,
          title: r,
          seats: '1 seat available',
          skills: project.techStack || []
        }))
      : [];

  // Problem statement & What are you building
  const problemText = project.problemSolving?.description || project.problemStatement || project.problem || '';
  const problemCards = Array.isArray(project.problemSolving?.cards) ? project.problemSolving.cards : [];
  const buildingText = project.fullDescription || project.tagline || '';

  return (
    <div className="flex flex-col w-full max-w-4xl mx-auto pb-space-xl">
      {/* Navigation & Breadcrumbs */}
      <div className="flex items-center justify-between py-space-sm mb-space-md">
        <nav className="flex items-center gap-space-xs text-on-surface-variant font-label-md text-label-md">
          <button 
            type="button" 
            onClick={onBack}
            className="hover:text-primary transition-colors cursor-pointer flex items-center gap-1 font-medium"
          >
            <span className="material-symbols-outlined text-base">arrow_back</span>
            <span>Projects</span>
          </button>
          <span className="material-symbols-outlined text-sm text-outline">chevron_right</span>
          <span className="text-on-surface font-semibold truncate max-w-xs">{project.title}</span>
        </nav>
        <button
          type="button"
          aria-label="Share Project Link"
          onClick={handleShare}
          className="p-2.5 rounded-xl bg-surface-container-low hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface transition-all cursor-pointer relative flex items-center gap-1.5 font-label-sm text-label-sm"
        >
          <span className="material-symbols-outlined text-lg">share</span>
          <span>Share</span>
          {copiedLink && (
            <span className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded bg-primary text-on-primary text-[11px] font-medium shadow whitespace-nowrap">
              Link copied!
            </span>
          )}
        </button>
      </div>

      <div className="space-y-space-lg">
        {/* 1. Project Header */}
        <section className="bg-surface-container-lowest rounded-2xl shadow-sm p-space-lg lg:p-space-xl border border-surface-container-high/40">
          <div className="flex flex-wrap items-center gap-space-sm mb-space-sm">
            {project.categoryBadge && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary-container text-on-secondary font-label-sm text-label-sm uppercase tracking-wider font-semibold">
                <span className="material-symbols-outlined text-xs">radio_button_checked</span>
                <span>{project.categoryBadge}</span>
              </span>
            )}
            {project.type && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant font-label-sm text-label-sm capitalize">
                {project.type}
              </span>
            )}
          </div>

          <h1 className="font-headline-lg text-headline-lg font-bold text-on-surface tracking-tight">
            {project.fullTitle || project.title}
          </h1>

          {(project.tagline || project.fullDescription) && (
            <p className="font-body-lg text-body-lg text-on-surface-variant mt-space-xs leading-relaxed">
              {project.tagline || project.fullDescription}
            </p>
          )}

          {/* Creator strip */}
          <div className="flex flex-wrap items-center gap-space-md pt-space-md mt-space-md border-t border-surface-container-high/40">
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
                    className="w-11 h-11 rounded-full object-cover shadow-sm shrink-0 ring-2 ring-transparent hover:ring-secondary transition-all"
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
                  className="w-11 h-11 rounded-full bg-secondary/15 text-secondary font-bold text-base items-center justify-center shrink-0 ring-2 ring-transparent hover:ring-secondary transition-all"
                >
                  {(creatorName || 'C').charAt(0).toUpperCase()}
                </div>
              </div>
              <div>
                <div className="flex items-center gap-1">
                  <span className="font-title-sm text-title-sm text-on-surface font-semibold hover:text-secondary transition-colors">
                    {creatorName}
                  </span>
                  <span className="material-symbols-outlined text-secondary text-sm" title="Project Creator">
                    verified
                  </span>
                </div>
                <span className="font-body-sm text-body-sm text-on-surface-variant">
                  {creatorRole}{creatorSchool ? ` · ${creatorSchool}` : ''}
                </span>
              </div>
            </div>

            {project.githubRepository && (
              <>
                <div className="h-5 w-px bg-surface-container-high hidden sm:block"></div>
                <a
                  href={project.githubRepository.startsWith('http') ? project.githubRepository : `https://${project.githubRepository}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 text-secondary hover:underline font-label-md text-label-md ml-auto sm:ml-0"
                >
                  <span className="material-symbols-outlined text-base">code</span>
                  <span>GitHub Repository</span>
                  <span className="material-symbols-outlined text-xs">arrow_outward</span>
                </a>
              </>
            )}
          </div>
        </section>

        {/* 2. About the Project */}
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
            {/* Problem Being Solved */}
            <div className="bg-surface-container-low p-space-md rounded-xl border border-surface-container-high/40">
              <div className="flex items-center gap-2 font-title-sm text-title-sm text-on-surface font-semibold mb-2">
                <span className="material-symbols-outlined text-primary text-base">psychology_alt</span>
                <span>Problem Being Solved</span>
              </div>
              {problemText ? (
                <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">
                  {problemText}
                </p>
              ) : problemCards.length > 0 ? (
                <div className="space-y-2">
                  {problemCards.map((card, idx) => (
                    <div key={idx} className="text-body-sm">
                      <span className="font-semibold text-on-surface">{card.title}: </span>
                      <span className="text-on-surface-variant">{card.desc}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">
                  {project.tagline || 'Addressing key challenge areas through collaborative software development.'}
                </p>
              )}
            </div>

            {/* What Are You Building? */}
            <div className="bg-surface-container-low p-space-md rounded-xl border border-surface-container-high/40">
              <div className="flex items-center gap-2 font-title-sm text-title-sm text-on-surface font-semibold mb-2">
                <span className="material-symbols-outlined text-primary text-base">build</span>
                <span>What Are You Building?</span>
              </div>
              <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">
                {buildingText || 'Building an ambitious collaborative solution with real-world impact.'}
              </p>
            </div>
          </div>

          {/* Tech Stack (if available from real MongoDB data) */}
          {Array.isArray(project.techStack) && project.techStack.length > 0 && (
            <div className="pt-space-xs">
              <div className="font-label-sm text-label-sm text-on-surface-variant font-medium mb-2">
                Technologies
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {project.techStack.map((tech, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1 rounded-lg bg-surface-container-low text-on-surface font-label-md text-label-md border border-surface-container-high/60"
                  >
                    {tech}
                  </span>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* 3. Team */}
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
            {/* Current team size / maximum team size */}
            <span className="px-3 py-1 rounded-full bg-surface-container-high text-on-surface font-label-md text-label-md font-semibold">
              Team Size: {currentTeamSize} / {totalCapacity}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-md">
            {confirmedMembers.map((member, idx) => (
              <div 
                key={idx} 
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
                    <div className="flex items-center gap-1.5">
                      <span className="font-title-sm text-title-sm font-semibold text-on-surface truncate">
                        {member.name}
                      </span>
                      <span className="px-2 py-0.2 rounded-full bg-primary text-on-primary font-label-sm text-[10px] font-bold">
                        {member.badge}
                      </span>
                    </div>
                    <div className="font-body-sm text-xs text-secondary font-medium truncate">{member.role}</div>
                    {member.school && (
                      <div className="font-label-sm text-[11px] text-outline truncate">{member.school}</div>
                    )}
                  </div>
                </div>

                {member.userId && onViewProfile && (
                  <button
                    type="button"
                    onClick={() => onViewProfile(member.userId)}
                    className="px-2.5 py-1 rounded-lg bg-surface-container-lowest text-xs text-on-surface hover:text-secondary transition-colors cursor-pointer shrink-0 font-medium ml-2 border border-surface-container-high/50"
                  >
                    Profile
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* 4. Looking For (Integrated Open Roles) */}
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
                const roleTitle = role.title || role.name || role;
                const seatsAvailable = role.seats || '1 seat available';
                const skills = Array.isArray(role.skills) ? role.skills : [];

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

                      {role.desc && (
                        <p className="font-body-sm text-body-sm text-on-surface-variant">
                          {role.desc}
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
      </div>

      {/* Simple Application Modal */}
      {isApplyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-primary-container/40 backdrop-blur-sm animate-modal">
          <div className="fixed inset-0" onClick={handleCloseApplyModal} />
          <div className="relative w-full max-w-lg bg-surface-container-lowest rounded-2xl shadow-2xl border border-surface-container-high overflow-hidden z-10 p-space-lg">
            <div className="flex items-start justify-between mb-space-md">
              <div>
                <h3 className="font-headline-sm text-headline-sm font-bold text-on-surface">
                  Apply for Role
                </h3>
                <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
                  Submit your application to the squad lead.
                </p>
              </div>
              <button 
                type="button" 
                onClick={handleCloseApplyModal}
                disabled={isSubmitting}
                className="p-1.5 rounded-xl hover:bg-surface-container text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>

            <form onSubmit={handleModalSubmit} className="space-y-space-md">
              {/* Selected Role */}
              <div>
                <label className="block font-title-sm text-title-sm text-on-surface mb-1">
                  Selected Role
                </label>
                <div className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low text-on-surface font-body-sm text-body-sm font-semibold border border-surface-container-high/60 flex items-center gap-2">
                  <span className="material-symbols-outlined text-secondary text-base">badge</span>
                  <span>{applyingRole?.title || applyingRole?.name || applyingRole || 'Open Role'}</span>
                </div>
              </div>

              {/* Why do you want to join? */}
              <div>
                <label className="block font-title-sm text-title-sm text-on-surface mb-1">
                  Why do you want to join?
                </label>
                <textarea
                  required
                  rows={4}
                  value={whyAnswer}
                  onChange={(e) => setWhyAnswer(e.target.value)}
                  placeholder="Describe your motivation and how your skills can help this project..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low text-on-surface placeholder:text-on-surface-variant font-body-sm text-body-sm outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-secondary/30 transition-all resize-none border border-surface-container-high/60"
                />
              </div>

              {/* Modal Actions */}
              <div className="pt-2 flex items-center justify-end gap-space-sm border-t border-surface-container-high/40">
                <button
                  type="button"
                  onClick={handleCloseApplyModal}
                  disabled={isSubmitting}
                  className="px-4 py-2.5 rounded-xl text-on-surface-variant hover:text-on-surface font-title-sm text-title-sm transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !whyAnswer.trim()}
                  className="px-5 py-2.5 rounded-xl bg-primary text-on-primary font-title-sm text-title-sm shadow-md hover:bg-surface-tint active:scale-[0.98] transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
                >
                  {isSubmitting ? (
                    <>
                      <span className="material-symbols-outlined animate-spin text-base">progress_activity</span>
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-base">send</span>
                      <span>Submit Application</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
