import React, { useState } from 'react';

export default function PostProjectModal({ isOpen, onClose, onAddProject, currentUser }) {
  const [title, setTitle] = useState('');
  const [tagline, setTagline] = useState('');
  const [type, setType] = useState('hackathon');
  const [techStackInput, setTechStackInput] = useState('React 19, FastAPI, Tailwind');
  const [rolesInput, setRolesInput] = useState('frontend, ai');
  const [campus, setCampus] = useState(currentUser?.college || currentUser?.university || currentUser?.campus || '');
  const [totalCapacity, setTotalCapacity] = useState(4);
  const [categoryBadge, setCategoryBadge] = useState('Collegiate Sprint');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    const newProject = {
      title,
      fullTitle: `${title} — Collegiate Collaboration Sprint`,
      tagline,
      fullDescription: tagline,
      type,
      categoryBadge,
      recruitingBadge: 'Recruiting 2 Roles',
      urgency: 'high',
      matchScore: 95,
      publishedTime: 'Just now',
      image: '',
      imageTag: 'Collegiate Sprint',
      techStack: techStackInput.split(',').map(s => s.trim()).filter(Boolean),
      rolesNeeded: rolesInput.split(',').map(s => s.trim()).filter(Boolean),
      campus: campus.toLowerCase(),
      filledCount: 1,
      totalCapacity: Number(totalCapacity) || 4,
      lead: {
        name: currentUser?.name || 'Student Builder',
        university: currentUser?.university || currentUser?.college || 'Collegiate Campus',
        program: currentUser?.university || currentUser?.college || 'Undergraduate Member',
        roleTitle: currentUser?.roleTitle || 'Squad Creator',
        avatar: currentUser?.avatar || currentUser?.profileImage || ''
      },
      openVacancies: [
        {
          id: 'dev-1',
          track: 'Core Contributor',
          title: 'Fullstack / Systems Engineer',
          seats: '1 seat available',
          desc: tagline,
          skills: techStackInput.split(',').map(s => s.trim()).slice(0, 3),
          hours: '8–10 hrs / week'
        }
      ]
    };

    onAddProject(newProject);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-primary-container/40 backdrop-blur-sm animate-modal">
      <div className="fixed inset-0" onClick={onClose} />
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
              Broadcast your hackathon idea, startup MVP, or research capstone to verified builders.
            </p>
          </div>
          <button 
            type="button" 
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-surface-container text-on-surface-variant hover:text-on-surface transition-colors"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="block font-title-sm text-title-sm text-on-surface mb-1">
              Project Title
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. OmniVoice — Spatial P2P Audio for Real-time IDEs"
              className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low text-on-surface placeholder:text-on-surface-variant font-body-sm text-body-sm outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-secondary/30 transition-all"
            />
          </div>

          <div>
            <label className="block font-title-sm text-title-sm text-on-surface mb-1">
              Elevator Pitch & Scope
            </label>
            <textarea
              required
              rows={3}
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              placeholder="What are you building, what problem does it solve, and what is your milestone timeline?"
              className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low text-on-surface placeholder:text-on-surface-variant font-body-sm text-body-sm outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-secondary/30 transition-all resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-title-sm text-title-sm text-on-surface mb-1">
                Project Category
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low text-on-surface font-body-sm text-body-sm outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-secondary/30 transition-all cursor-pointer"
              >
                <option value="hackathon">Hackathon Sprint</option>
                <option value="startup">Startup Seed</option>
                <option value="research">Academic Research</option>
                <option value="capstone">Course Capstone</option>
              </select>
            </div>
            <div>
              <label className="block font-title-sm text-title-sm text-on-surface mb-1">
                Event / Sprint Target
              </label>
              <input
                type="text"
                value={categoryBadge}
                onChange={(e) => setCategoryBadge(e.target.value)}
                placeholder="e.g. HackNova 2026 or TreeHacks"
                className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low text-on-surface placeholder:text-on-surface-variant font-body-sm text-body-sm outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-secondary/30 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block font-title-sm text-title-sm text-on-surface mb-1">
              Tech Stack (comma separated)
            </label>
            <input
              type="text"
              required
              value={techStackInput}
              onChange={(e) => setTechStackInput(e.target.value)}
              placeholder="e.g. React 19, FastAPI, Pinecone, WebSockets"
              className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low text-on-surface placeholder:text-on-surface-variant font-body-sm text-body-sm outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-secondary/30 transition-all"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-title-sm text-title-sm text-on-surface mb-1">
                Roles Needed (comma separated)
              </label>
              <input
                type="text"
                required
                value={rolesInput}
                onChange={(e) => setRolesInput(e.target.value)}
                placeholder="e.g. frontend, backend, uiux"
                className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low text-on-surface placeholder:text-on-surface-variant font-body-sm text-body-sm outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-secondary/30 transition-all"
              />
            </div>
            <div>
              <label className="block font-title-sm text-title-sm text-on-surface mb-1">
                Total Squad Size
              </label>
              <input
                type="number"
                min={2}
                max={6}
                value={totalCapacity}
                onChange={(e) => setTotalCapacity(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low text-on-surface font-body-sm text-body-sm outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-secondary/30 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block font-title-sm text-title-sm text-on-surface mb-1">
              Primary Campus Affiliation
            </label>
            <input
              type="text"
              value={campus}
              onChange={(e) => setCampus(e.target.value)}
              placeholder="e.g. Your College / University"
              className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low text-on-surface font-body-sm text-body-sm outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-secondary/30 transition-all"
            />
          </div>

          <div className="pt-3 flex items-center justify-end gap-2 border-t border-surface-container-high/60">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-surface-container-low hover:bg-surface-container text-on-surface font-title-sm text-title-sm transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-primary text-on-primary font-title-sm text-title-sm shadow-md hover:bg-surface-tint active:scale-[0.98] transition-all flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-base">publish</span>
              <span>Publish Squad Vacancy</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
