import { useState, useEffect, useRef } from 'react';

export default function CommandPalette({ 
  isOpen, 
  onClose, 
  projects, 
  hackathons, 
  onSelectProject, 
  onNavigate 
}) {
  const [query, setQuery] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
        else onSelectProject ? null : null; // parent will toggle
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const filteredProjects = projects.filter(p => {
    const q = query.toLowerCase();
    const title = (p.title || '').toLowerCase();
    const desc = (p.tagline || p.whatAreYouBuilding || p.problemBeingSolved || p.fullDescription || '').toLowerCase();
    const stackMatch = Array.isArray(p.techStack) && p.techStack.some(t => t.toLowerCase().includes(q));
    const cat = (p.category || p.categoryBadge || '').toLowerCase();
    return title.includes(q) || desc.includes(q) || stackMatch || cat.includes(q);
  });

  const filteredHackathons = hackathons.filter(h => {
    const q = query.toLowerCase();
    const title = (h.title || '').toLowerCase();
    const loc = (h.location || '').toLowerCase();
    return title.includes(q) || loc.includes(q);
  });

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-primary-container/40 backdrop-blur-sm animate-modal">
      <div 
        className="fixed inset-0" 
        onClick={onClose}
      />
      <div className="relative w-full max-w-xl bg-surface-container-lowest rounded-2xl shadow-2xl border border-surface-container-high overflow-hidden z-10 flex flex-col max-h-[75vh]">
        {/* Search Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-surface-container-low gap-3">
          <span className="material-symbols-outlined text-secondary text-2xl">search</span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search squads, stacks, hackathons, roles..."
            className="flex-1 bg-transparent text-on-surface text-body-lg outline-none placeholder:text-on-surface-variant font-medium"
          />
          <span className="px-2 py-0.5 rounded-md bg-surface-container text-on-surface-variant font-label-sm text-label-sm">
            ESC
          </span>
        </div>

        {/* Results List */}
        <div className="overflow-y-auto p-space-sm space-y-3">
          {/* Projects Section */}
          {filteredProjects.length > 0 && (
            <div>
              <div className="px-3 py-1 font-label-sm text-label-sm uppercase tracking-wider text-outline font-semibold">
                Live Projects & Squads
              </div>
              <div className="space-y-1 mt-1">
                {filteredProjects.slice(0, 4).map(p => (
                  <div
                    key={p.id}
                    onClick={() => {
                      onSelectProject(p);
                      onClose();
                    }}
                    className="flex items-center justify-between p-2.5 rounded-xl hover:bg-surface-container cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-surface-container-high flex items-center justify-center text-secondary shrink-0 font-bold text-xs">
                        {p.title.charAt(0)}
                      </div>
                      <div className="truncate">
                        <div className="font-title-sm text-title-sm text-on-surface font-semibold truncate">
                          {p.title}
                        </div>
                        <div className="font-label-sm text-label-sm text-on-surface-variant truncate">
                          {p.lead.name} · {p.lead.university}
                        </div>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed text-label-sm font-semibold shrink-0">
                      {p.categoryBadge}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Hackathons Section */}
          {filteredHackathons.length > 0 && (
            <div>
              <div className="px-3 py-1 font-label-sm text-label-sm uppercase tracking-wider text-outline font-semibold">
                Collegiate Hackathons
              </div>
              <div className="space-y-1 mt-1">
                {filteredHackathons.slice(0, 3).map(h => (
                  <div
                    key={h.id}
                    onClick={() => {
                      onNavigate('hackathons');
                      onClose();
                    }}
                    className="flex items-center justify-between p-2.5 rounded-xl hover:bg-surface-container cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="material-symbols-outlined text-secondary text-xl shrink-0">terminal</span>
                      <div className="truncate">
                        <div className="font-title-sm text-title-sm text-on-surface font-semibold truncate">
                          {h.title}
                        </div>
                        <div className="font-label-sm text-label-sm text-on-surface-variant truncate">
                          {h.dates} · {h.location}
                        </div>
                      </div>
                    </div>
                    <span className="font-title-sm text-title-sm text-secondary font-bold shrink-0">
                      {h.prizePool ? String(h.prizePool).replace(/\$/g, '₹') : ''}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {filteredProjects.length === 0 && filteredHackathons.length === 0 && (
            <div className="py-8 text-center text-on-surface-variant">
              <span className="material-symbols-outlined text-3xl mb-1 text-outline">search_off</span>
              <p className="font-body-md text-body-md">No matching squads or hackathons found for "{query}"</p>
            </div>
          )}
        </div>

        {/* Quick Nav Footer */}
        <div className="px-4 py-2.5 bg-surface-container-low border-t border-surface-container-high/60 flex items-center justify-between text-label-sm text-on-surface-variant">
          <div className="flex items-center gap-3">
            <span>↑↓ Navigate</span>
            <span>↵ Select</span>
            <span>ESC Close</span>
          </div>
          <span className="font-semibold text-secondary">BuildCrew 2026</span>
        </div>
      </div>
    </div>
  );
}
