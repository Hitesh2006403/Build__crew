import React, { useState, useEffect } from 'react';
import usersApi from '../api/users';

function cleanText(text) {
  if (!text) return '';
  const trimmed = String(text).trim();
  const lower = trimmed.toLowerCase();
  if (lower === 'campus member' || lower === 'collegiate campus' || lower === 'nothing' || lower === 'n/a') {
    return '';
  }
  return trimmed;
}

export default function Profile({ 
  currentUser, 
  targetUserId, 
  onBack, 
  onInviteBuilder, 
  onUpdateUser, 
  showToast 
}) {
  const isViewingOther = Boolean(targetUserId && String(targetUserId) !== String(currentUser?._id));
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [user, setUser] = useState(isViewingOther ? null : (currentUser || {}));
  
  // Editable form state for own profile
  const [name, setName] = useState(currentUser?.name || '');
  const [email, setEmail] = useState(currentUser?.email || '');
  const [campus, setCampus] = useState(currentUser?.college || currentUser?.university || '');
  const [branch, setBranch] = useState(currentUser?.branch || currentUser?.major || '');
  const [semester, setSemester] = useState(currentUser?.semester || 1);
  const [graduationYear, setGraduationYear] = useState(currentUser?.graduationYear || '2026');
  const [bio, setBio] = useState(currentUser?.bio || '');
  const [skills, setSkills] = useState(Array.isArray(currentUser?.skills) ? currentUser.skills.join(', ') : '');
  const [github, setGithub] = useState(currentUser?.github || '');
  const [linkedin, setLinkedin] = useState(currentUser?.linkedin || '');
  const [showEmailToTeam, setShowEmailToTeam] = useState(currentUser?.showEmailToTeam !== false);
  const [saved, setSaved] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync state if currentUser changes or load target user from MongoDB
  useEffect(() => {
    const idToFetch = targetUserId || currentUser?._id;
    if (idToFetch) {
      setLoadingProfile(true);
      usersApi.getUserById(idToFetch)
        .then(data => {
          if (data) {
            setUser(data);
            if (!isViewingOther) {
              setName(data.name || '');
              setEmail(data.email || '');
              setCampus(cleanText(data.college || data.university));
              setBranch(data.branch || data.major || '');
              setSemester(data.semester || 1);
              setGraduationYear(data.graduationYear || '2026');
              setBio(data.bio || '');
              setSkills(Array.isArray(data.skills) ? data.skills.join(', ') : '');
              setGithub(data.github || '');
              setLinkedin(data.linkedin || '');
              setShowEmailToTeam(data.showEmailToTeam !== false);
            }
          }
        })
        .catch(err => console.warn('Could not load user profile from MongoDB:', err))
        .finally(() => setLoadingProfile(false));
    }
  }, [currentUser, targetUserId, isViewingOther]);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!currentUser?._id) return;

    try {
      setIsSubmitting(true);
      const skillsArr = skills
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);

      const updatePayload = {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        college: campus.trim(),
        university: campus.trim(),
        branch: branch.trim(),
        major: branch.trim(),
        semester: Number(semester) || 1,
        graduationYear: graduationYear.trim(),
        bio: bio.trim(),
        skills: skillsArr,
        github: github.trim(),
        linkedin: linkedin.trim(),
        showEmailToTeam: Boolean(showEmailToTeam),
      };

      const res = await usersApi.updateUser(currentUser._id, updatePayload);
      const updated = res.user || res;
      setUser(updated);
      setSaved(true);
      if (onUpdateUser) {
        onUpdateUser(updated);
      }
      if (showToast) {
        showToast('Profile updated successfully in MongoDB!');
      }
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      console.error('Failed to update profile:', err);
      if (showToast) {
        showToast(`Update failed: ${err.message}`);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const activeUser = user || currentUser || {};
  const avatarUrl = activeUser.avatar || activeUser.profileImage || "";
  const displayCollege = cleanText(activeUser.college || activeUser.university);

  if (loadingProfile && !activeUser._id) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center text-on-surface-variant gap-3">
        <span className="material-symbols-outlined text-3xl text-secondary animate-spin">sync</span>
        <p className="font-medium text-sm">Fetching student profile from MongoDB...</p>
      </div>
    );
  }

  // Email privacy check: show email if viewing own profile, or if user allows showing email to team members
  const canViewEmail = !isViewingOther || activeUser.showEmailToTeam !== false || currentUser?.role === 'admin';

  return (
    <div className="flex flex-col w-full pb-space-xl space-y-space-lg max-w-4xl">
      {/* Navigation header for other student profile */}
      {isViewingOther && onBack && (
        <button
          type="button"
          onClick={onBack}
          className="self-start flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-surface-container-high hover:bg-surface-container-highest text-on-surface font-title-sm text-title-sm transition-all cursor-pointer shadow-xs"
        >
          <span className="material-symbols-outlined text-base">arrow_back</span>
          <span>Back to Builders</span>
        </button>
      )}

      <div className="flex flex-col">
        <div className="flex items-center gap-space-xs text-secondary font-label-md text-label-md uppercase tracking-wider mb-1">
          <span className="material-symbols-outlined text-base">person</span>
          <span>{isViewingOther ? 'Student Builder Profile' : 'Student Profile'}</span>
        </div>
        <h1 className="font-headline-lg text-headline-lg font-bold text-on-surface tracking-tight">
          {isViewingOther ? `${activeUser.name || 'Builder'}'s Profile` : 'Builder Profile & Settings'}
        </h1>
      </div>

      <div className="bg-surface-container-lowest rounded-2xl shadow-sm p-space-lg space-y-space-lg border border-surface-container-high/40">
        {/* User Card Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-space-md pb-space-md border-b border-surface-container-low">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-space-md">
            <div className="relative shrink-0">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt=""
                  className="w-20 h-20 rounded-full object-cover shadow-md ring-4 ring-secondary-fixed shrink-0"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    if (e.currentTarget.nextElementSibling) {
                      e.currentTarget.nextElementSibling.style.display = 'flex';
                    }
                  }}
                />
              ) : null}
              <div 
                style={{ display: avatarUrl ? 'none' : 'flex' }}
                className="w-20 h-20 rounded-full bg-secondary text-on-secondary font-bold text-2xl items-center justify-center shadow-md ring-4 ring-secondary-fixed shrink-0"
              >
                {(activeUser.name || 'U').charAt(0).toUpperCase()}
              </div>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h2 className="font-headline-sm text-headline-sm font-bold text-on-surface">{activeUser.name || 'Student Builder'}</h2>
                {activeUser.roleTitle && (
                  <span className="px-2.5 py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed font-label-sm text-label-sm font-semibold">
                    {activeUser.roleTitle}
                  </span>
                )}
              </div>
              {(displayCollege || activeUser.branch) && (
                <p className="font-body-md text-body-md text-on-surface-variant">
                  {displayCollege} {activeUser.branch ? `· ${activeUser.branch}` : ''}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-3 pt-1 text-label-sm text-secondary font-semibold">
                {canViewEmail && activeUser.email && (
                  <span>{activeUser.email}</span>
                )}
                {activeUser.github && cleanText(activeUser.github) && (
                  <>
                    {canViewEmail && activeUser.email && <span>•</span>}
                    <a
                      href={activeUser.github.startsWith('http') ? activeUser.github : `https://${activeUser.github}`}
                      target="_blank"
                      rel="noreferrer"
                      className="hover:underline flex items-center gap-1 text-primary"
                    >
                      <span className="material-symbols-outlined text-sm">code</span>
                      GitHub
                    </a>
                  </>
                )}
                {activeUser.linkedin && cleanText(activeUser.linkedin) && (
                  <>
                    <span>•</span>
                    <a
                      href={activeUser.linkedin.startsWith('http') ? activeUser.linkedin : `https://${activeUser.linkedin}`}
                      target="_blank"
                      rel="noreferrer"
                      className="hover:underline flex items-center gap-1 text-primary"
                    >
                      <span className="material-symbols-outlined text-sm">link</span>
                      LinkedIn
                    </a>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Action button if viewing another builder */}
          {isViewingOther && onInviteBuilder && (
            <button
              type="button"
              onClick={() => onInviteBuilder(activeUser)}
              className="px-5 py-2.5 rounded-xl bg-primary text-on-primary font-title-sm text-title-sm shadow-md hover:bg-surface-tint active:scale-[0.98] transition-all cursor-pointer flex items-center gap-2 self-stretch sm:self-auto justify-center font-semibold"
            >
              <span className="material-symbols-outlined text-base">person_add</span>
              <span>Invite to Team</span>
            </button>
          )}
        </div>

        {/* If viewing another student: Read-only profile layout */}
        {isViewingOther ? (
          <div className="space-y-6">
            {activeUser.bio && cleanText(activeUser.bio) && (
              <div className="p-4 rounded-xl bg-surface-container-low/70 border border-surface-container-high/60 space-y-1.5">
                <span className="font-semibold text-on-surface block text-label-sm uppercase tracking-wider">
                  About
                </span>
                <p className="font-body-md text-on-surface leading-relaxed">{activeUser.bio}</p>
              </div>
            )}

            {(Array.isArray(activeUser.skills) && activeUser.skills.length > 0) && (
              <div>
                <span className="font-label-sm text-label-sm text-outline uppercase tracking-wider block mb-2">
                  Skills
                </span>
                <div className="flex flex-wrap gap-2">
                  {activeUser.skills.map((skill, sidx) => (
                    <span
                      key={sidx}
                      className="px-3 py-1 rounded-lg bg-surface-container-high text-on-surface font-label-md text-label-md font-medium"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Editable Form for Logged-In User */
          <form onSubmit={handleSave} className="space-y-space-md">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
              <div>
                <label className="block font-title-sm text-title-sm text-on-surface mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low text-on-surface font-body-sm text-body-sm outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-secondary/30 transition-all"
                />
              </div>
              <div>
                <label className="block font-title-sm text-title-sm text-on-surface mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low text-on-surface font-body-sm text-body-sm outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-secondary/30 transition-all"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
              <div>
                <label className="block font-title-sm text-title-sm text-on-surface mb-1">College / University</label>
                <input
                  type="text"
                  value={campus}
                  onChange={(e) => setCampus(e.target.value)}
                  placeholder="Your college or university"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low text-on-surface font-body-sm text-body-sm outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-secondary/30 transition-all"
                />
              </div>
              <div>
                <label className="block font-title-sm text-title-sm text-on-surface mb-1">Branch / Major</label>
                <input
                  type="text"
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                  placeholder="e.g. Computer Science"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low text-on-surface font-body-sm text-body-sm outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-secondary/30 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block font-title-sm text-title-sm text-on-surface mb-1">Bio</label>
              <textarea
                rows={3}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Tell potential teammates about your interests and projects..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low text-on-surface font-body-sm text-body-sm outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-secondary/30 transition-all resize-none"
              />
            </div>

            <div>
              <label className="block font-title-sm text-title-sm text-on-surface mb-1">Skills (Comma separated)</label>
              <input
                type="text"
                value={skills}
                onChange={(e) => setSkills(e.target.value)}
                placeholder="e.g. React, Node.js, Python, MongoDB"
                className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low text-on-surface font-body-sm text-body-sm outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-secondary/30 transition-all"
              />
            </div>

            {/* Contact Settings (Requirement 12) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
              <div>
                <label className="block font-title-sm text-title-sm text-on-surface mb-1">GitHub URL</label>
                <input
                  type="url"
                  value={github}
                  onChange={(e) => setGithub(e.target.value)}
                  placeholder="https://github.com/username"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low text-on-surface font-body-sm text-body-sm outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-secondary/30 transition-all"
                />
              </div>
              <div>
                <label className="block font-title-sm text-title-sm text-on-surface mb-1">LinkedIn Profile</label>
                <input
                  type="url"
                  value={linkedin}
                  onChange={(e) => setLinkedin(e.target.value)}
                  placeholder="https://linkedin.com/in/username"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low text-on-surface font-body-sm text-body-sm outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-secondary/30 transition-all"
                />
              </div>
            </div>

            {/* Privacy option: "Show my email to team members" */}
            <div className="p-3.5 rounded-xl bg-surface-container-low border border-surface-container-high/60 flex items-center gap-3">
              <input
                type="checkbox"
                id="showEmailToTeamCheckbox"
                checked={showEmailToTeam}
                onChange={(e) => setShowEmailToTeam(e.target.checked)}
                className="w-4 h-4 text-secondary rounded focus:ring-secondary cursor-pointer"
              />
              <label htmlFor="showEmailToTeamCheckbox" className="font-body-sm text-body-sm text-on-surface font-medium cursor-pointer">
                Show my email to team members
              </label>
            </div>

            <div className="pt-2 flex items-center justify-between">
              {saved ? (
                <span className="text-secondary font-semibold text-title-sm flex items-center gap-1">
                  <span className="material-symbols-outlined text-base">check_circle</span>
                  Profile changes saved to MongoDB!
                </span>
              ) : <span></span>}

              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2.5 rounded-xl bg-primary text-on-primary font-title-sm text-title-sm shadow-md hover:bg-surface-tint active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50 font-semibold"
              >
                {isSubmitting ? 'Saving to MongoDB...' : 'Save Profile'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
