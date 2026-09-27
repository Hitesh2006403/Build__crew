import React, { useState, useEffect } from 'react';
import usersApi from '../api/users';

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
  const [campus, setCampus] = useState(currentUser?.university || currentUser?.college || '');
  const [branch, setBranch] = useState(currentUser?.branch || currentUser?.major || '');
  const [semester, setSemester] = useState(currentUser?.semester || 1);
  const [graduationYear, setGraduationYear] = useState(currentUser?.graduationYear || '2026');
  const [bio, setBio] = useState(currentUser?.bio || '');
  const [skills, setSkills] = useState(Array.isArray(currentUser?.skills) ? currentUser.skills.join(', ') : '');
  const [github, setGithub] = useState(currentUser?.github || '');
  const [linkedin, setLinkedin] = useState(currentUser?.linkedin || '');
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
              setCampus(data.university || data.college || '');
              setBranch(data.branch || data.major || '');
              setSemester(data.semester || 1);
              setGraduationYear(data.graduationYear || '2026');
              setBio(data.bio || '');
              setSkills(Array.isArray(data.skills) ? data.skills.join(', ') : '');
              setGithub(data.github || '');
              setLinkedin(data.linkedin || '');
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
        name,
        college: campus,
        university: campus,
        branch,
        major: branch,
        semester: Number(semester) || 1,
        graduationYear,
        bio,
        skills: skillsArr,
        github: github.trim(),
        linkedin: linkedin.trim(),
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

  if (loadingProfile && !activeUser._id) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center text-on-surface-variant gap-3">
        <span className="material-symbols-outlined text-3xl text-secondary animate-spin">sync</span>
        <p className="font-medium text-sm">Fetching student profile from MongoDB...</p>
      </div>
    );
  }

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
          <span className="material-symbols-outlined text-base">verified</span>
          <span>{isViewingOther ? 'Verified Collegiate Builder Portfolio' : 'Verified Student Identity'}</span>
        </div>
        <h1 className="font-headline-lg text-headline-lg font-bold text-on-surface tracking-tight">
          {isViewingOther ? `${activeUser.name || 'Builder'}'s Profile` : 'Builder Profile & Badges'}
        </h1>
        <p className="font-body-lg text-body-lg text-on-surface-variant mt-1">
          {isViewingOther 
            ? 'Verified student credentials, technical competencies, and collegiate squad record.' 
            : 'Manage your verified campus credentials, technical skills, and hackathon circuit presence.'}
        </p>
      </div>

      <div className="bg-surface-container-lowest rounded-2xl shadow-sm p-space-lg space-y-space-lg">
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
                <span className="px-2.5 py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed font-label-sm text-label-sm font-semibold flex items-center gap-1">
                  <span className="material-symbols-outlined text-xs">verified</span>
                  Verified {activeUser.role === 'admin' ? 'Administrator' : 'Student Builder'}
                </span>
              </div>
              <p className="font-body-md text-body-md text-on-surface-variant">
                {activeUser.university || activeUser.college || 'Collegiate Campus'} {activeUser.branch ? `· ${activeUser.branch}` : ''} {activeUser.graduationYear ? `· Class of '${String(activeUser.graduationYear).slice(-2)}` : ''}
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-1 text-label-sm text-secondary font-semibold">
                <span>{activeUser.email}</span>
                {activeUser.github && (
                  <>
                    <span>•</span>
                    <a
                      href={activeUser.github.startsWith('http') ? activeUser.github : `https://${activeUser.github}`}
                      target="_blank"
                      rel="noreferrer"
                      className="hover:underline flex items-center gap-1 text-primary"
                    >
                      <span className="material-symbols-outlined text-sm">code</span>
                      GitHub Profile
                    </a>
                  </>
                )}
                {activeUser.linkedin && (
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
              className="px-5 py-2.5 rounded-xl bg-primary text-on-primary font-title-sm text-title-sm shadow-md hover:bg-surface-tint active:scale-[0.98] transition-all cursor-pointer flex items-center gap-2 self-stretch sm:self-auto justify-center"
            >
              <span className="material-symbols-outlined text-base">person_add</span>
              <span>Invite to Squad</span>
            </button>
          )}
        </div>

        {/* If viewing another student: Read-only portfolio layout */}
        {isViewingOther ? (
          <div className="space-y-6">
            {activeUser.bio && (
              <div className="p-4 rounded-xl bg-surface-container-low/70 border border-surface-container-high/60 space-y-1.5">
                <span className="font-semibold text-on-surface block text-label-sm uppercase tracking-wider">
                  Builder Bio &amp; Technical Vision
                </span>
                <p className="font-body-md text-on-surface leading-relaxed">{activeUser.bio}</p>
              </div>
            )}

            {(Array.isArray(activeUser.skills) && activeUser.skills.length > 0) && (
              <div>
                <span className="font-label-sm text-label-sm text-outline uppercase tracking-wider block mb-2">
                  Technical Skills
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

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div className="p-3.5 rounded-xl bg-surface-container-low border border-surface-container-high/50">
                <span className="text-[11px] font-bold uppercase tracking-wider text-outline block">Academic Year</span>
                <span className="font-bold text-sm text-on-surface block mt-0.5">{activeUser.year || activeUser.graduationYear || 'Not specified'}</span>
              </div>
              <div className="p-3.5 rounded-xl bg-surface-container-low border border-surface-container-high/50">
                <span className="text-[11px] font-bold uppercase tracking-wider text-outline block">Current Semester</span>
                <span className="font-bold text-sm text-on-surface block mt-0.5">{activeUser.semester ? `Semester ${activeUser.semester}` : 'Not specified'}</span>
              </div>
              <div className="p-3.5 rounded-xl bg-surface-container-low border border-surface-container-high/50">
                <span className="text-[11px] font-bold uppercase tracking-wider text-outline block">Collegiate Major</span>
                <span className="font-bold text-sm text-on-surface block mt-0.5 truncate">{activeUser.branch || activeUser.major || 'Not specified'}</span>
              </div>
            </div>
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
                <label className="block font-title-sm text-title-sm text-on-surface mb-1">Campus Affiliation / College</label>
                <input
                  type="text"
                  required
                  value={campus}
                  onChange={(e) => setCampus(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low text-on-surface font-body-sm text-body-sm outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-secondary/30 transition-all"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-space-md">
              <div>
                <label className="block font-title-sm text-title-sm text-on-surface mb-1">Major / Branch</label>
                <input
                  type="text"
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                  placeholder="e.g. Computer Science"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low text-on-surface font-body-sm text-body-sm outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-secondary/30 transition-all"
                />
              </div>
              <div>
                <label className="block font-title-sm text-title-sm text-on-surface mb-1">Current Semester</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={semester}
                  onChange={(e) => setSemester(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low text-on-surface font-body-sm text-body-sm outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-secondary/30 transition-all"
                />
              </div>
              <div>
                <label className="block font-title-sm text-title-sm text-on-surface mb-1">Graduation Year</label>
                <input
                  type="text"
                  value={graduationYear}
                  onChange={(e) => setGraduationYear(e.target.value)}
                  placeholder="e.g. 2026"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low text-on-surface font-body-sm text-body-sm outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-secondary/30 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block font-title-sm text-title-sm text-on-surface mb-1">Builder Bio</label>
              <textarea
                rows={3}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Tell squads about your background and interests..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low text-on-surface font-body-sm text-body-sm outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-secondary/30 transition-all resize-none"
              />
            </div>

            <div>
              <label className="block font-title-sm text-title-sm text-on-surface mb-1">Technical Skills (Comma separated)</label>
              <input
                type="text"
                value={skills}
                onChange={(e) => setSkills(e.target.value)}
                placeholder="e.g. React 19, Python, PyTorch, MongoDB, FastAPI"
                className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low text-on-surface font-body-sm text-body-sm outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-secondary/30 transition-all"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
              <div>
                <label className="block font-title-sm text-title-sm text-on-surface mb-1">GitHub URL</label>
                <input
                  type="text"
                  value={github}
                  onChange={(e) => setGithub(e.target.value)}
                  placeholder="https://github.com/username"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low text-on-surface font-body-sm text-body-sm outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-secondary/30 transition-all"
                />
              </div>
              <div>
                <label className="block font-title-sm text-title-sm text-on-surface mb-1">LinkedIn Profile</label>
                <input
                  type="text"
                  value={linkedin}
                  onChange={(e) => setLinkedin(e.target.value)}
                  placeholder="https://linkedin.com/in/username"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low text-on-surface font-body-sm text-body-sm outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-secondary/30 transition-all"
                />
              </div>
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
                className="px-6 py-2.5 rounded-xl bg-primary text-on-primary font-title-sm text-title-sm shadow-md hover:bg-surface-tint active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50"
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
