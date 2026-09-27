import React, { useState } from 'react';

export default function PostProjectModal({ isOpen, onClose, onAddProject, currentUser }) {
  const [title, setTitle] = useState('');
  const [problemBeingSolved, setProblemBeingSolved] = useState('');
  const [whatAreYouBuilding, setWhatAreYouBuilding] = useState('');
  const [category, setCategory] = useState('');
  const [roles, setRoles] = useState([]);
  const [maximumTeamSize, setMaximumTeamSize] = useState('');
  const [expectedCompletionDate, setExpectedCompletionDate] = useState('');
  const [githubRepository, setGithubRepository] = useState('');

  if (!isOpen) return null;

  const resetForm = () => {
    setTitle('');
    setProblemBeingSolved('');
    setWhatAreYouBuilding('');
    setCategory('');
    setRoles([]);
    setMaximumTeamSize('');
    setExpectedCompletionDate('');
    setGithubRepository('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleAddRole = () => {
    setRoles(prev => [...prev, { roleName: '', membersCount: 1 }]);
  };

  const handleRemoveRole = (indexToRemove) => {
    setRoles(prev => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleRoleChange = (index, field, value) => {
    setRoles(prev => prev.map((role, idx) => {
      if (idx === index) {
        return { ...role, [field]: value };
      }
      return role;
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const roleNames = roles.map(r => r.roleName.trim()).filter(Boolean);
    const parsedCapacity = Number(maximumTeamSize) || 4;

    const vacancies = roles
      .filter(r => r.roleName.trim())
      .map((r, idx) => ({
        id: `dev-${Date.now()}-${idx}`,
        track: 'Core Contributor',
        title: r.roleName.trim(),
        seats: `${Number(r.membersCount) || 1} ${Number(r.membersCount) === 1 ? 'seat' : 'seats'} available`,
        desc: whatAreYouBuilding.trim() || 'Squad member',
        skills: [],
        hours: 'Flexible'
      }));

    const newProject = {
      title: title.trim(),
      fullTitle: title.trim(),
      problemBeingSolved: problemBeingSolved.trim(),
      whatAreYouBuilding: whatAreYouBuilding.trim(),
      tagline: whatAreYouBuilding.trim(),
      fullDescription: problemBeingSolved.trim()
        ? `${problemBeingSolved.trim()}\n\n${whatAreYouBuilding.trim()}`
        : whatAreYouBuilding.trim(),
      category,
      categoryBadge: category,
      type: 'hackathon',
      recruitingBadge: vacancies.length > 0
        ? `Recruiting ${vacancies.length} ${vacancies.length === 1 ? 'Role' : 'Roles'}`
        : 'Recruiting Roles',
      urgency: 'high',
      matchScore: 95,
      publishedTime: 'Just now',
      image: '',
      imageTag: category,
      techStack: [],
      roles: roles.map(r => ({
        roleName: r.roleName.trim(),
        membersCount: Number(r.membersCount) || 1
      })),
      rolesNeeded: roleNames,
      openVacancies: vacancies,
      campus: currentUser?.campus || currentUser?.university || currentUser?.college || '',
      filledCount: 1,
      totalCapacity: parsedCapacity,
      expectedCompletionDate: expectedCompletionDate || undefined,
      githubRepository: githubRepository.trim(),
      lead: {
        name: currentUser?.name || '',
        university: currentUser?.university || currentUser?.college || '',
        program: currentUser?.branch || currentUser?.major || '',
        roleTitle: currentUser?.roleTitle || 'Squad Creator',
        avatar: currentUser?.avatar || currentUser?.profileImage || ''
      },
      problemSolving: {
        description: problemBeingSolved.trim(),
        cards: []
      }
    };

    onAddProject(newProject);
    resetForm();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-primary-container/40 backdrop-blur-sm animate-modal">
      <div className="fixed inset-0" onClick={handleClose} />
      <div className="relative w-full max-w-xl bg-surface-container-lowest rounded-2xl shadow-2xl border border-surface-container-high overflow-hidden z-10 p-space-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between mb-space-md">
          <div>
            <div className="flex items-center gap-1 text-secondary font-label-sm text-label-sm font-bold uppercase tracking-wider mb-0.5">
              <span className="material-symbols-outlined text-base">rocket_launch</span>
              <span>Launch Squad Recruitment</span>
            </div>
            <h2 className="font-headline-sm text-headline-sm font-bold text-on-surface">
              Post a Project or Squad Vacancy
            </h2>
            <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
              Broadcast your project idea and recruit teammates to build together.
            </p>
          </div>
          <button 
            type="button" 
            onClick={handleClose}
            className="p-1.5 rounded-xl hover:bg-surface-container text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
            title="Close"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* 1. Project Title */}
          <div>
            <label className="block font-title-sm text-title-sm text-on-surface mb-1">
              Project Title <span className="text-secondary">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low text-on-surface placeholder:text-on-surface-variant font-body-sm text-body-sm outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-secondary/30 transition-all"
            />
          </div>

          {/* 2. Problem Being Solved */}
          <div>
            <label className="block font-title-sm text-title-sm text-on-surface mb-1">
              Problem Being Solved <span className="text-secondary">*</span>
            </label>
            <textarea
              required
              rows={3}
              value={problemBeingSolved}
              onChange={(e) => setProblemBeingSolved(e.target.value)}
              placeholder="What real-world problem are you solving?"
              className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low text-on-surface placeholder:text-on-surface-variant font-body-sm text-body-sm outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-secondary/30 transition-all resize-none"
            />
          </div>

          {/* 3. What Are You Building? */}
          <div>
            <label className="block font-title-sm text-title-sm text-on-surface mb-1">
              What Are You Building? <span className="text-secondary">*</span>
            </label>
            <textarea
              required
              rows={3}
              value={whatAreYouBuilding}
              onChange={(e) => setWhatAreYouBuilding(e.target.value)}
              placeholder="Briefly describe your solution."
              className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low text-on-surface placeholder:text-on-surface-variant font-body-sm text-body-sm outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-secondary/30 transition-all resize-none"
            />
          </div>

          {/* 4. Project Category */}
          <div>
            <label className="block font-title-sm text-title-sm text-on-surface mb-1">
              Project Category <span className="text-secondary">*</span>
            </label>
            <select
              required
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low text-on-surface font-body-sm text-body-sm outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-secondary/30 transition-all cursor-pointer"
            >
              <option value="" disabled>Select a category</option>
              <option value="Web Development">Web Development</option>
              <option value="AI / Machine Learning">AI / Machine Learning</option>
              <option value="Cybersecurity">Cybersecurity</option>
              <option value="IoT">IoT</option>
              <option value="Mobile Development">Mobile Development</option>
              <option value="Data Science">Data Science</option>
              <option value="Other">Other</option>
            </select>
          </div>

          {/* 5. Roles Needed */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block font-title-sm text-title-sm text-on-surface">
                Roles Needed
              </label>
              <button
                type="button"
                onClick={handleAddRole}
                className="inline-flex items-center gap-1 text-xs font-semibold text-secondary hover:text-secondary/80 transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-base">add</span>
                <span>+ Add Role</span>
              </button>
            </div>

            {roles.length === 0 ? (
              <div className="py-3 px-4 text-center rounded-xl bg-surface-container-low/60 border border-dashed border-surface-container-high text-on-surface-variant font-body-sm text-body-sm">
                No roles added yet. Click &quot;+ Add Role&quot; to specify vacancies for your squad.
              </div>
            ) : (
              <div className="space-y-2">
                {roles.map((role, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="text"
                      required
                      value={role.roleName}
                      onChange={(e) => handleRoleChange(idx, 'roleName', e.target.value)}
                      placeholder="Role Name (e.g. Frontend Developer)"
                      className="flex-1 px-3.5 py-2 rounded-xl bg-surface-container-low text-on-surface placeholder:text-on-surface-variant font-body-sm text-body-sm outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-secondary/30 transition-all"
                    />
                    <input
                      type="number"
                      min={1}
                      required
                      value={role.membersCount}
                      onChange={(e) => handleRoleChange(idx, 'membersCount', Math.max(1, parseInt(e.target.value, 10) || 1))}
                      placeholder="Members"
                      title="Number of Members"
                      className="w-28 px-3.5 py-2 rounded-xl bg-surface-container-low text-on-surface placeholder:text-on-surface-variant font-body-sm text-body-sm outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-secondary/30 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveRole(idx)}
                      className="p-2 rounded-xl text-on-surface-variant hover:text-error hover:bg-error/10 transition-colors shrink-0 cursor-pointer"
                      title="Remove Role"
                    >
                      <span className="material-symbols-outlined text-lg">close</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 6. Maximum Team Size & 7. Expected Completion Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-title-sm text-title-sm text-on-surface mb-1">
                Maximum Team Size <span className="text-secondary">*</span>
              </label>
              <input
                type="number"
                min={1}
                required
                value={maximumTeamSize}
                onChange={(e) => setMaximumTeamSize(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low text-on-surface placeholder:text-on-surface-variant font-body-sm text-body-sm outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-secondary/30 transition-all"
              />
            </div>
            <div>
              <label className="block font-title-sm text-title-sm text-on-surface mb-1">
                Expected Completion Date
              </label>
              <input
                type="date"
                value={expectedCompletionDate}
                onChange={(e) => setExpectedCompletionDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low text-on-surface font-body-sm text-body-sm outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-secondary/30 transition-all cursor-pointer"
              />
            </div>
          </div>

          {/* 8. GitHub Repository */}
          <div>
            <label className="block font-title-sm text-title-sm text-on-surface mb-1">
              GitHub Repository
            </label>
            <input
              type="url"
              value={githubRepository}
              onChange={(e) => setGithubRepository(e.target.value)}
              placeholder="https://github.com/..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low text-on-surface placeholder:text-on-surface-variant font-body-sm text-body-sm outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-secondary/30 transition-all"
            />
          </div>

          {/* Modal Actions */}
          <div className="pt-3 flex items-center justify-end gap-2 border-t border-surface-container-high/60">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2.5 rounded-xl bg-surface-container-low hover:bg-surface-container text-on-surface font-title-sm text-title-sm transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-primary text-on-primary font-title-sm text-title-sm shadow-md hover:bg-surface-tint active:scale-[0.98] transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <span className="material-symbols-outlined text-base">publish</span>
              <span>Publish Project</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
