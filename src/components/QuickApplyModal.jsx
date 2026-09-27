import React, { useState } from 'react';

export default function QuickApplyModal({ project, isOpen, onClose, onApplySuccess }) {
  const [selectedRole, setSelectedRole] = useState('');
  const [whyAnswer, setWhyAnswer] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !project) return null;

  const rawVacancies = Array.isArray(project.openVacancies) && project.openVacancies.length > 0
    ? project.openVacancies
    : (Array.isArray(project.roles) && project.roles.length > 0)
      ? project.roles.map((r, idx) => ({ id: `role-${idx}`, title: r.roleName }))
      : (Array.isArray(project.rolesNeeded) && project.rolesNeeded.length > 0)
        ? project.rolesNeeded.map((r, idx) => ({ id: `role-${idx}`, title: r }))
        : [];

  const roles = rawVacancies.map(v => v.title || v.roleName || v.name || v).filter(Boolean);
  const currentRole = selectedRole || (roles.length > 0 ? roles[0] : 'Open Role');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!whyAnswer.trim()) return;

    setIsSubmitting(true);
    try {
      if (onApplySuccess) {
        await onApplySuccess({
          projectId: project._id || project.id,
          projectTitle: project.title,
          role: currentRole,
          message: whyAnswer.trim(),
          note: whyAnswer.trim(),
        });
      }
      onClose();
    } catch (err) {
      console.error('Quick apply error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-primary-container/40 backdrop-blur-sm animate-modal">
      <div className="fixed inset-0" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-surface-container-lowest rounded-2xl shadow-2xl border border-surface-container-high overflow-hidden z-10 p-space-lg">
        {/* Header */}
        <div className="flex items-start justify-between mb-space-md">
          <div>
            <h2 className="font-headline-sm text-headline-sm font-bold text-on-surface">
              Apply for {currentRole}
            </h2>
            <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
              {project.title}
            </p>
          </div>
          <button 
            type="button" 
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-surface-container text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-space-md">
          {roles.length > 1 && (
            <div>
              <label className="block font-title-sm text-title-sm text-on-surface mb-1">
                Select Role
              </label>
              <select
                value={selectedRole || roles[0]}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low text-on-surface font-body-sm text-body-sm outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-secondary/30 transition-all cursor-pointer"
              >
                {roles.map((r, idx) => (
                  <option key={idx} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
          )}

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
              onClick={onClose}
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
                <span>Submit Application</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
