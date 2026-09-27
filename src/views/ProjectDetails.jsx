import React, { useState, useRef } from 'react';

export default function ProjectDetails({ 
  project, 
  onBack, 
  onApplySuccess,
  onViewProfile,
  currentUser
}) {
  const [selectedRole, setSelectedRole] = useState(
    project.openVacancies?.[0]?.id || project.openVacancies?.[0]?.title || 'Core Squad Engineer'
  );
  const [whyAnswer, setWhyAnswer] = useState('');
  const [skillsInput, setSkillsInput] = useState('');
  const [githubUrl, setGithubUrl] = useState('');
  const [weeklyHours, setWeeklyHours] = useState(8);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const applicationCardRef = useRef(null);

  const handleRoleSelect = (roleKey) => {
    setSelectedRole(roleKey);
    applicationCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const handleScrollToApply = () => {
    applicationCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleShare = () => {
    navigator.clipboard?.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleApplyFormSubmit = (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    setTimeout(() => {
      setIsSubmitting(false);
      setIsSubmitted(true);
      const chosenRoleObj = project.openVacancies?.find(v => (v.id === selectedRole || v.title === selectedRole));
      if (onApplySuccess) {
        onApplySuccess({
          projectId: project._id || project.id,
          projectTitle: project.title,
          role: chosenRoleObj?.title || selectedRole || 'Core Squad Engineer',
          submittedAt: 'Just now',
          status: 'Direct Lead Review',
          statusColor: 'bg-secondary-fixed text-on-secondary-fixed',
          note: whyAnswer || `${project.lead?.name || 'Squad Lead'} has been notified of your application.`
        });
      }
    }, 500);
  };

  const leadName = project.lead?.name || 'Project Lead';
  const leadProgram = project.lead?.program || project.lead?.university || 'Campus Member';
  const openPositionsCount = project.openVacancies?.length || 1;
  const filledCount = project.filledCount || (Array.isArray(project.members) ? project.members.length : 1);
  const totalCapacity = project.totalCapacity || 4;
  const percentFilled = Math.min(100, Math.round((filledCount / totalCapacity) * 100));

  // Resolved list of confirmed squad members
  const confirmedMembers = [
    {
      name: leadName,
      role: project.lead?.roleTitle || 'Squad Lead',
      badge: 'Lead',
      school: leadProgram,
      avatar: project.lead?.avatar || project.lead?.leadAvatarFull || '',
      userId: typeof project.createdBy === 'object' ? project.createdBy?._id : project.createdBy
    },
    ...(Array.isArray(project.members) ? project.members : [])
      .filter(m => {
        const mId = typeof m === 'object' ? (m._id || m.id) : m;
        const leadId = typeof project.createdBy === 'object' ? (project.createdBy?._id || project.createdBy?.id) : project.createdBy;
        return mId && String(mId) !== String(leadId);
      })
      .map(m => ({
        name: typeof m === 'object' ? m.name : 'Squad Member',
        role: typeof m === 'object' ? (m.roleTitle || m.role || 'Contributor') : 'Contributor',
        badge: 'Member',
        school: typeof m === 'object' ? (m.college || m.university || 'Campus Builder') : 'Campus Builder',
        avatar: typeof m === 'object' ? (m.avatar || m.profileImage || '') : '',
        userId: typeof m === 'object' ? (m._id || m.id) : m
      }))
  ];

  return (
    <div className="flex flex-col w-full pb-space-xl">
      {/* Breadcrumbs & Quick Meta Bar */}
      <div className="flex items-center justify-between py-space-sm mb-space-md">
        <nav className="flex items-center gap-space-xs text-on-surface-variant font-label-md text-label-md">
          <button 
            type="button" 
            onClick={onBack}
            className="hover:text-primary transition-colors cursor-pointer flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-base">arrow_back</span>
            <span>Projects</span>
          </button>
          <span className="material-symbols-outlined text-sm text-outline">chevron_right</span>
          <span className="text-on-surface-variant">{project.categoryBadge || 'Squad'}</span>
          <span className="material-symbols-outlined text-sm text-outline">chevron_right</span>
          <span className="text-on-surface font-semibold truncate max-w-xs">{project.title}</span>
        </nav>
        <div className="flex items-center gap-space-xs">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container-high text-on-surface font-label-sm text-label-sm">
            <span className="w-2 h-2 rounded-full bg-secondary animate-pulse"></span>
            <span>{project.categoryBadge || 'Active Sprint'}</span>
          </span>
        </div>
      </div>

      {/* Hero Header Banner Card */}
      <div className="relative bg-surface-container-lowest rounded-2xl shadow-sm p-space-lg lg:p-space-xl overflow-hidden mb-space-xl border border-surface-container-high/40">
        <div className="absolute -right-16 -bottom-16 w-96 h-96 rounded-full bg-secondary-fixed opacity-40 blur-3xl pointer-events-none"></div>
        <div className="relative z-10 flex flex-col gap-space-lg">
          <div className="flex flex-wrap items-center gap-space-sm">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary-container text-on-secondary font-label-sm text-label-sm uppercase tracking-wider font-semibold">
              <span className="material-symbols-outlined text-xs">radio_button_checked</span>
              Active · {openPositionsCount} {openPositionsCount === 1 ? 'Seat Open' : 'Seats Open'}
            </span>
            <span className="text-on-surface-variant font-body-sm text-body-sm">
              Published {project.publishedTime || 'Recently'}
            </span>
          </div>

          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-space-lg">
            <div className="max-w-3xl">
              <h1 className="font-headline-lg text-headline-lg font-bold text-on-surface tracking-tight">
                {project.fullTitle || project.title}
              </h1>
              <p className="font-body-lg text-body-lg text-on-surface-variant mt-space-xs leading-relaxed">
                {project.fullDescription || project.tagline}
              </p>
            </div>

            {/* Action Cluster */}
            <div className="flex items-center gap-space-sm shrink-0">
              <button
                type="button"
                id="quick-apply-btn"
                onClick={handleScrollToApply}
                className="flex items-center gap-space-xs px-5 py-3 rounded-xl bg-primary text-on-primary font-title-sm text-title-sm shadow-md hover:bg-surface-tint active:scale-[0.98] transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-lg">bolt</span>
                <span>Apply for Open Role</span>
              </button>
              <button
                type="button"
                aria-label="Bookmark Project"
                onClick={() => setIsBookmarked(!isBookmarked)}
                className={`p-3 rounded-xl transition-all cursor-pointer ${
                  isBookmarked
                    ? 'bg-secondary-fixed text-on-secondary-fixed'
                    : 'bg-surface-container-low hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface'
                }`}
              >
                <span className={`material-symbols-outlined text-xl ${isBookmarked ? 'fill text-secondary' : ''}`}>
                  bookmark
                </span>
              </button>
              <button
                type="button"
                aria-label="Share Project Link"
                onClick={handleShare}
                className="p-3 rounded-xl bg-surface-container-low hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface transition-all cursor-pointer relative"
              >
                <span className="material-symbols-outlined text-xl">share</span>
                {copiedLink && (
                  <span className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded bg-primary text-on-primary text-[11px] font-medium shadow whitespace-nowrap">
                    Link copied!
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Lead Creator Metadata Strip */}
          <div className="flex flex-wrap items-center gap-space-lg pt-space-md mt-space-xs bg-surface-container-low/60 rounded-xl p-space-md">
            <div 
              onClick={() => {
                const leadId = (typeof project.createdBy === 'object' ? project.createdBy?._id : project.createdBy) || project.lead?.id;
                if (leadId && onViewProfile) onViewProfile(leadId);
              }}
              className="flex items-center gap-space-sm cursor-pointer hover:opacity-85 transition-opacity"
              title="View student builder profile"
            >
              <div className="relative shrink-0">
                {(project.lead?.leadAvatarFull || project.lead?.avatar) ? (
                  <img
                    src={project.lead.leadAvatarFull || project.lead.avatar}
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
                  style={{ display: (project.lead?.leadAvatarFull || project.lead?.avatar) ? 'none' : 'flex' }}
                  className="w-11 h-11 rounded-full bg-secondary/15 text-secondary font-bold text-base items-center justify-center shrink-0 ring-2 ring-transparent hover:ring-secondary transition-all"
                >
                  {(leadName || 'L').charAt(0).toUpperCase()}
                </div>
              </div>
              <div>
                <div className="flex items-center gap-1">
                  <span className="font-title-sm text-title-sm text-on-surface font-semibold hover:text-secondary transition-colors">
                    {leadName}
                  </span>
                  <span className="material-symbols-outlined text-secondary text-sm" title="Verified Campus Builder">
                    verified
                  </span>
                </div>
                <span className="font-body-sm text-body-sm text-on-surface-variant">
                  {project.lead?.roleTitle || 'Squad Creator'} · {leadProgram}
                </span>
              </div>
            </div>

            <div className="h-6 w-px bg-surface-container-high hidden md:block"></div>
            <div className="flex items-center gap-space-xs text-on-surface-variant font-label-md text-label-md">
              <span className="material-symbols-outlined text-base">hub</span>
              <span className="text-on-surface font-semibold">{project.categoryBadge || 'Squad Pod'}</span>
            </div>

            {project.githubRepository && (
              <>
                <div className="h-6 w-px bg-surface-container-high hidden md:block"></div>
                <a
                  href={project.githubRepository.startsWith('http') ? project.githubRepository : `https://${project.githubRepository}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-space-xs text-secondary hover:underline font-label-md text-label-md"
                >
                  <span className="material-symbols-outlined text-base">code</span>
                  <span>GitHub Repository</span>
                  <span className="material-symbols-outlined text-xs">arrow_outward</span>
                </a>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Primary 2-Column Asymmetric Layout (8 : 4 Grid) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-xl items-start">
        {/* LEFT 2/3 COLUMN: Deep Technical & Project Context */}
        <div className="lg:col-span-8 space-y-space-xl">
          {/* Section: Project Overview & Motivation */}
          <section className="bg-surface-container-lowest rounded-2xl shadow-sm p-space-xl border border-surface-container-high/40">
            <div className="flex items-center gap-space-sm mb-space-md">
              <div className="w-8 h-8 rounded-lg bg-surface-container-high flex items-center justify-center text-primary">
                <span className="material-symbols-outlined text-lg">psychology_alt</span>
              </div>
              <h2 className="font-headline-sm text-headline-sm text-on-surface font-bold">
                About the Squad &amp; Mission
              </h2>
            </div>
            <p className="font-body-lg text-body-lg text-on-surface-variant leading-relaxed">
              {project.fullDescription || project.tagline || 'Building an ambitious product for collegiate hackathon circuits and technical innovation.'}
            </p>

            {project.problemSolving?.cards && project.problemSolving.cards.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-space-md mt-space-lg">
                {project.problemSolving.cards.map((card, idx) => (
                  <div key={idx} className="bg-surface-container-low p-space-md rounded-xl">
                    <div className={`flex items-center gap-2 font-title-sm text-title-sm mb-1 ${card.color || 'text-on-surface'}`}>
                      <span className="material-symbols-outlined text-base">{card.icon || 'star'}</span>
                      <span>{card.title}</span>
                    </div>
                    <p className="font-body-sm text-body-sm text-on-surface-variant">
                      {card.desc}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Section: Technical Stack */}
          {project.techStack && project.techStack.length > 0 && (
            <section className="bg-surface-container-lowest rounded-2xl shadow-sm p-space-xl border border-surface-container-high/40">
              <div className="flex items-center justify-between mb-space-md">
                <div className="flex items-center gap-space-sm">
                  <div className="w-8 h-8 rounded-lg bg-surface-container-high flex items-center justify-center text-primary">
                    <span className="material-symbols-outlined text-lg">deployed_code</span>
                  </div>
                  <h2 className="font-headline-sm text-headline-sm text-on-surface font-bold">
                    Technologies &amp; Architecture
                  </h2>
                </div>
              </div>

              {project.architecture?.summary && (
                <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed mb-space-lg">
                  {project.architecture.summary}
                </p>
              )}

              {/* Stack Tags Cluster */}
              <div className="flex flex-wrap items-center gap-2">
                {project.techStack.map((tech, idx) => (
                  <span
                    key={idx}
                    className="px-3.5 py-1.5 rounded-xl bg-surface-container-low text-on-surface font-label-md text-label-md border border-surface-container-high/60"
                  >
                    {tech}
                  </span>
                ))}
              </div>
            </section>
          )}

          {/* Section: Current Squad Members */}
          <section className="bg-surface-container-lowest rounded-2xl shadow-sm p-space-xl border border-surface-container-high/40">
            <div className="flex items-center justify-between mb-space-md">
              <div className="flex items-center gap-space-sm">
                <div className="w-8 h-8 rounded-lg bg-surface-container-high flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined text-lg">group</span>
                </div>
                <h2 className="font-headline-sm text-headline-sm text-on-surface font-bold">
                  Current Squad ({confirmedMembers.length} of {totalCapacity})
                </h2>
              </div>
              <span className="font-label-md text-label-md text-on-surface-variant">
                {Math.max(0, totalCapacity - confirmedMembers.length)} seats vacant
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
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
                          className="w-12 h-12 rounded-full object-cover shadow-sm shrink-0"
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
                        className="w-12 h-12 rounded-full bg-secondary/15 text-secondary font-bold text-base items-center justify-center shrink-0"
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
                      <div className="font-label-sm text-[11px] text-outline truncate">{member.school}</div>
                    </div>
                  </div>

                  {member.userId && onViewProfile && (
                    <button
                      type="button"
                      onClick={() => onViewProfile(member.userId)}
                      className="px-2.5 py-1 rounded-lg bg-surface-container-lowest text-xs text-on-surface hover:text-secondary transition-colors cursor-pointer shrink-0 font-medium ml-2"
                    >
                      Profile
                    </button>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* Section: Open Positions */}
          <section className="bg-surface-container-lowest rounded-2xl shadow-sm p-space-xl border border-surface-container-high/40">
            <div className="flex items-center justify-between mb-space-md">
              <div className="flex items-center gap-space-sm">
                <div className="w-8 h-8 rounded-lg bg-surface-container-high flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined text-lg">person_search</span>
                </div>
                <div>
                  <h2 className="font-headline-sm text-headline-sm text-on-surface font-bold">
                    Open Positions
                  </h2>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">
                    Apply to join this squad and collaborate on BuildCrew
                  </p>
                </div>
              </div>
              <span className="px-3 py-1 rounded-full bg-surface-container-high text-secondary font-label-md text-label-md font-bold">
                {openPositionsCount} Open {openPositionsCount === 1 ? 'Seat' : 'Seats'}
              </span>
            </div>

            <div className="space-y-space-md">
              {(project.openVacancies || [
                {
                  id: 'core-engineer',
                  track: 'Engineering',
                  title: 'Core Software Contributor',
                  seats: '1 seat open',
                  desc: 'Collaborate with the team on core application features and sprint milestones.',
                  skills: project.techStack?.slice(0, 3) || ['Git', 'Fullstack'],
                  hours: '8-10 hrs / week'
                }
              ]).map((vacancy) => (
                <div
                  key={vacancy.id}
                  className="bg-surface-container-low rounded-xl p-space-lg transition-all hover:bg-surface-container border border-surface-container-high/50"
                >
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-space-md">
                    <div className="space-y-space-xs">
                      <div className="flex items-center gap-space-sm">
                        <span className="px-2.5 py-0.5 rounded-full bg-surface-container-highest text-secondary font-label-sm text-label-sm font-semibold">
                          {vacancy.track || 'Squad Role'}
                        </span>
                        <span className="font-label-sm text-label-sm text-on-surface-variant">
                          {vacancy.seats || '1 seat'}
                        </span>
                      </div>
                      <h3 className="font-headline-sm text-headline-sm font-semibold text-on-surface">
                        {vacancy.title}
                      </h3>
                      <p className="font-body-md text-body-md text-on-surface-variant max-w-xl">
                        {vacancy.desc || 'Contribute to core milestones and squad deliverables.'}
                      </p>
                      {vacancy.skills && vacancy.skills.length > 0 && (
                        <div className="flex flex-wrap items-center gap-2 pt-space-xs">
                          {vacancy.skills.map((sk, sidx) => (
                            <span
                              key={sidx}
                              className="px-2.5 py-1 rounded-md bg-surface-container-lowest text-on-surface font-label-sm text-label-sm border border-surface-container-high/60"
                            >
                              {sk}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col items-start md:items-end gap-space-sm shrink-0">
                      {vacancy.hours && (
                        <div className="text-on-surface-variant font-label-sm text-label-sm flex items-center gap-1">
                          <span className="material-symbols-outlined text-sm text-secondary">schedule</span>
                          <span>{vacancy.hours}</span>
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => handleRoleSelect(vacancy.id || vacancy.title)}
                        className="px-4 py-2.5 rounded-xl bg-primary text-on-primary font-title-sm text-title-sm hover:bg-surface-tint transition-all active:scale-[0.98] cursor-pointer shadow-xs"
                      >
                        Apply for {vacancy.title.split(' ')[0]} Role
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* RIGHT 1/3 COLUMN: Sticky Application & Team Intelligence Sidebar */}
        <div className="lg:col-span-4 space-y-space-lg sticky top-20">
          {/* Squad Readiness Gauge */}
          <div className="bg-surface-container-lowest rounded-2xl shadow-sm p-space-lg border border-surface-container-high/40">
            <div className="flex items-center justify-between mb-space-md">
              <span className="font-title-sm text-title-sm text-on-surface font-semibold">
                Squad Capacity
              </span>
              <span className="font-label-sm text-label-sm text-secondary font-bold">
                {percentFilled}% Filled
              </span>
            </div>

            <div className="flex items-center gap-space-lg mb-space-md">
              {/* Circular Gauge Inline SVG */}
              <div className="relative w-20 h-20 shrink-0 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                  <path
                    className="text-surface-container-high"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3.5"
                  />
                  <path
                    className="text-secondary"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="currentColor"
                    strokeDasharray={`${percentFilled}, 100`}
                    strokeLinecap="round"
                    strokeWidth="3.5"
                  />
                </svg>
                <div className="absolute flex flex-col items-center justify-center">
                  <span className="font-headline-sm text-headline-sm font-bold text-on-surface leading-none">
                    {filledCount}/{totalCapacity}
                  </span>
                  <span className="font-label-sm text-[10px] text-outline">members</span>
                </div>
              </div>

              <div className="space-y-1.5 flex-1 min-w-0">
                <div className="flex items-center justify-between font-body-sm text-body-sm">
                  <span className="text-on-surface font-medium truncate">Lead Architect</span>
                  <span className="text-secondary font-semibold">Confirmed</span>
                </div>
                {project.openVacancies?.map((v, vidx) => (
                  <div key={vidx} className="flex items-center justify-between font-body-sm text-body-sm">
                    <span className="text-on-surface-variant font-medium truncate">{v.title}</span>
                    <span className="text-error font-semibold">Open</span>
                  </div>
                )) || (
                  <div className="flex items-center justify-between font-body-sm text-body-sm">
                    <span className="text-on-surface-variant font-medium truncate">Team Contributor</span>
                    <span className="text-error font-semibold">Open</span>
                  </div>
                )}
              </div>
            </div>

            <div className="pt-space-sm bg-surface-container-low rounded-xl p-space-sm flex items-center gap-space-xs text-on-surface-variant font-body-sm text-body-sm">
              <span className="material-symbols-outlined text-secondary text-base">verified_user</span>
              <span>
                Verified Collegiate Team Registration on BuildCrew
              </span>
            </div>
          </div>

          {/* Quick Application Drawer / Box */}
          <div 
            ref={applicationCardRef}
            id="application-card" 
            className="bg-surface-container-lowest rounded-2xl shadow-sm p-space-lg transition-all border border-surface-container-high/40"
          >
            <div className="flex items-center justify-between mb-space-sm">
              <div className="flex items-center gap-space-xs">
                <span className="material-symbols-outlined text-secondary text-xl">send</span>
                <span className="font-headline-sm text-headline-sm text-on-surface font-bold">Apply to Join</span>
              </div>
              <span className="font-label-sm text-label-sm text-outline">Direct Lead Review</span>
            </div>
            <p className="font-body-sm text-body-sm text-on-surface-variant mb-space-md">
              {leadName} will review your application on BuildCrew. You will receive real-time notifications on the status of your application.
            </p>

            {isSubmitted ? (
              <div className="p-space-md rounded-xl bg-surface-container text-on-surface text-center font-body-sm text-body-sm animate-modal">
                <div className="flex items-center justify-center gap-1.5 text-secondary font-bold mb-1">
                  <span className="material-symbols-outlined text-lg">task_alt</span>
                  <span>Application Dispatched!</span>
                </div>
                {leadName} has been notified. Check your notifications tab for status updates.
                <button
                  type="button"
                  onClick={() => setIsSubmitted(false)}
                  className="mt-3 text-secondary text-label-md font-semibold hover:underline block mx-auto cursor-pointer"
                >
                  Submit another role application
                </button>
              </div>
            ) : (
              <form 
                id="application-form" 
                onSubmit={handleApplyFormSubmit}
                className="space-y-space-md"
              >
                {/* Role Selector */}
                <div>
                  <label className="block font-title-sm text-title-sm text-on-surface mb-1.5">
                    Select Role
                  </label>
                  <select
                    id="role-select"
                    required
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low text-on-surface font-body-sm text-body-sm outline-none focus:bg-surface-container-lowest transition-all cursor-pointer border border-surface-container-high/60"
                  >
                    {project.openVacancies?.map((v) => (
                      <option key={v.id || v.title} value={v.id || v.title}>
                        {v.title}
                      </option>
                    )) || (
                      <option value="Core Squad Engineer">Core Squad Engineer</option>
                    )}
                  </select>
                </div>

                {/* Why are you interested */}
                <div>
                  <label className="block font-title-sm text-title-sm text-on-surface mb-1.5">
                    Why {project.title}?
                  </label>
                  <textarea
                    required
                    rows={3}
                    value={whyAnswer}
                    onChange={(e) => setWhyAnswer(e.target.value)}
                    placeholder="Briefly describe what sparks your interest in this project and your technical contribution..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low text-on-surface placeholder:text-on-surface-variant font-body-sm text-body-sm outline-none focus:bg-surface-container-lowest transition-all resize-none border border-surface-container-high/60"
                  />
                </div>

                {/* Top relevant skills */}
                <div>
                  <label className="block font-title-sm text-title-sm text-on-surface mb-1.5">
                    Top Relevant Skills
                  </label>
                  <input
                    type="text"
                    required
                    value={skillsInput}
                    onChange={(e) => setSkillsInput(e.target.value)}
                    placeholder="e.g. React 19, Python, FastAPI, UI Design"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low text-on-surface placeholder:text-on-surface-variant font-body-sm text-body-sm outline-none focus:bg-surface-container-lowest transition-all border border-surface-container-high/60"
                  />
                </div>

                {/* Portfolio / GitHub URL */}
                <div>
                  <label className="block font-title-sm text-title-sm text-on-surface mb-1.5">
                    Portfolio or GitHub URL
                  </label>
                  <input
                    type="url"
                    value={githubUrl}
                    onChange={(e) => setGithubUrl(e.target.value)}
                    placeholder="https://github.com/yourhandle"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low text-on-surface placeholder:text-on-surface-variant font-body-sm text-body-sm outline-none focus:bg-surface-container-lowest transition-all border border-surface-container-high/60"
                  />
                </div>

                {/* Weekly availability */}
                <div>
                  <label className="block font-title-sm text-title-sm text-on-surface mb-1.5">
                    Weekly Availability
                  </label>
                  <div className="flex items-center gap-space-sm">
                    <input
                      type="number"
                      min={2}
                      max={40}
                      required
                      value={weeklyHours}
                      onChange={(e) => setWeeklyHours(e.target.value)}
                      className="w-24 px-3.5 py-2.5 rounded-xl bg-surface-container-low text-on-surface font-body-sm text-body-sm outline-none focus:bg-surface-container-lowest transition-all border border-surface-container-high/60"
                    />
                    <span className="font-body-sm text-body-sm text-on-surface-variant">
                      hours / week
                    </span>
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  id="submit-btn"
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 px-space-md rounded-xl bg-primary text-on-primary font-title-sm text-title-sm shadow-md hover:bg-surface-tint active:scale-[0.98] transition-all flex items-center justify-center gap-space-xs cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <span className="material-symbols-outlined animate-spin text-lg">progress_activity</span>
                      <span>Transmitting...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-lg">check_circle</span>
                      <span>Submit Application</span>
                    </>
                  )}
                </button>
              </form>
            )}
          </div>

          {/* Project Repository Link */}
          {project.githubRepository && (
            <div className="bg-surface-container-lowest rounded-2xl shadow-sm p-space-lg space-y-space-sm border border-surface-container-high/40">
              <div className="font-title-sm text-title-sm text-on-surface font-semibold">
                Project Repository
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-surface-container-low font-body-sm text-body-sm">
                <div className="flex items-center gap-space-xs text-on-surface">
                  <span className="material-symbols-outlined text-secondary text-base">code</span>
                  <span>GitHub Repository</span>
                </div>
                <a
                  href={project.githubRepository.startsWith('http') ? project.githubRepository : `https://${project.githubRepository}`}
                  target="_blank"
                  rel="noreferrer"
                  className="font-label-sm text-label-sm text-primary hover:underline flex items-center gap-1 font-semibold"
                >
                  <span>View Repo</span>
                  <span className="material-symbols-outlined text-xs">arrow_outward</span>
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
