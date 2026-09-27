import React, { useState, useMemo } from 'react';

export default function DiscoverProjects({ 
  projects, 
  searchQuery = '',
  setSearchQuery,
  onSelectProject, 
  onQuickApply 
}) {
  const [techStackFilter, setTechStackFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [campusFilter, setCampusFilter] = useState('');
  const [activeFilterPill, setActiveFilterPill] = useState('all');
  const [sortBy, setSortBy] = useState('match');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  // Check if any filter is active
  const hasActiveFilters = Boolean(
    searchQuery.trim() ||
    techStackFilter ||
    roleFilter ||
    typeFilter ||
    campusFilter ||
    activeFilterPill !== 'all'
  );

  const handleResetFilters = () => {
    if (setSearchQuery) setSearchQuery('');
    setTechStackFilter('');
    setRoleFilter('');
    setTypeFilter('');
    setCampusFilter('');
    setActiveFilterPill('all');
    setCurrentPage(1);
  };

  // Derive unique real campuses dynamically from projects in MongoDB
  const availableCampuses = useMemo(() => {
    return Array.from(new Set(projects.map(p => p.campus).filter(Boolean)));
  }, [projects]);

  // Filter & Sort logic
  const filteredProjects = useMemo(() => {
    let result = projects.filter(p => {
      // Search input matching
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = p.title.toLowerCase().includes(q);
        const matchTagline = p.tagline.toLowerCase().includes(q);
        const matchStack = p.techStack.some(t => t.toLowerCase().includes(q));
        const matchLead = p.lead?.name.toLowerCase().includes(q) || p.lead?.university.toLowerCase().includes(q);
        const matchRole = p.openVacancies?.some(v => v.title.toLowerCase().includes(q) || v.track?.toLowerCase().includes(q));
        if (!matchTitle && !matchTagline && !matchStack && !matchLead && !matchRole) return false;
      }

      // Tech stack dropdown
      if (techStackFilter) {
        const matchesStack = p.techStack.some(t => 
          t.toLowerCase().includes(techStackFilter.toLowerCase())
        );
        if (!matchesStack) return false;
      }

      // Role filter
      if (roleFilter) {
        if (!p.rolesNeeded.includes(roleFilter)) return false;
      }

      // Type filter
      if (typeFilter) {
        if (p.type !== typeFilter) return false;
      }

      // Campus filter
      if (campusFilter) {
        if (p.campus !== campusFilter) return false;
      }

      // Quick filter pill
      if (activeFilterPill === 'urgent') {
        if (p.urgency !== 'high') return false;
      } else if (activeFilterPill === 'hacknova') {
        if (!p.categoryBadge?.toLowerCase().includes('hacknova')) return false;
      } else if (activeFilterPill === 'ai') {
        const isAI = p.techStack.some(t => /fastapi|pinecone|langchain|rag|pytorch|ai/i.test(t)) ||
                     p.imageTag?.toLowerCase().includes('nlp') ||
                     p.rolesNeeded.includes('ai');
        if (!isAI) return false;
      } else if (activeFilterPill === 'web3') {
        const isWeb3 = p.techStack.some(t => /solidity|zk|contract|web3/i.test(t)) ||
                       p.imageTag?.toLowerCase().includes('web3');
        if (!isWeb3) return false;
      } else if (activeFilterPill === 'beginner') {
        if (p.type === 'research') return false;
      }

      return true;
    });

    // Sorting
    if (sortBy === 'match') {
      result.sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));
    } else if (sortBy === 'urgent') {
      result.sort((a, b) => (a.urgency === 'high' ? -1 : 1));
    } else if (sortBy === 'capacity') {
      result.sort((a, b) => (b.totalCapacity - b.filledCount) - (a.totalCapacity - a.filledCount));
    }

    return result;
  }, [projects, searchQuery, techStackFilter, roleFilter, typeFilter, campusFilter, activeFilterPill, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filteredProjects.length / itemsPerPage));
  const paginatedProjects = filteredProjects.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="flex flex-col w-full space-y-6 pb-space-xl">
      {/* Clean, Non-Overwhelming Hero Header */}
      <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm border border-surface-container-high/40 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1.5 max-w-2xl">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed font-label-sm text-xs font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse"></span>
              Fall 2026 Recruitment Sprint
            </span>
            <span className="text-xs text-on-surface-variant font-medium">• Cross-Campus Matchmaking</span>
          </div>
          <h1 className="font-headline-md text-2xl md:text-3xl text-on-surface font-extrabold tracking-tight">
            Discover Projects &amp; Squads
          </h1>
          <p className="font-body-md text-sm md:text-base text-on-surface-variant leading-relaxed">
            Join student engineering squads, fill open hackathon roles, or find co-builders.
          </p>
        </div>

        {/* Dynamic Metrics Pills */}
        <div className="flex items-center gap-2 self-start md:self-auto bg-surface-container-low p-1.5 rounded-xl text-xs font-medium text-on-surface">
          <div className="px-3 py-1.5 rounded-lg bg-surface-container-lowest shadow-xs text-center">
            <span className="block font-bold text-base text-on-surface leading-tight">{projects.length}</span>
            <span className="text-[11px] text-on-surface-variant">Live Squads</span>
          </div>
          <div className="px-3 py-1.5 rounded-lg bg-surface-container-lowest shadow-xs text-center">
            <span className="block font-bold text-base text-secondary leading-tight">
              {projects.filter(p => (p.openVacancies && p.openVacancies.length > 0) || (p.openRoles && p.openRoles.length > 0) || ((p.filledCount || 0) < (p.totalCapacity || 4))).length}
            </span>
            <span className="text-[11px] text-on-surface-variant">Hiring Now</span>
          </div>
          <div className="px-3 py-1.5 rounded-lg bg-surface-container-lowest shadow-xs text-center">
            <span className="block font-bold text-base text-on-surface leading-tight">
              {projects.length > 0 ? '94%' : '0%'}
            </span>
            <span className="text-[11px] text-on-surface-variant">Match Rate</span>
          </div>
        </div>
      </div>

      {/* Streamlined Search & Filter Control Bar */}
      <div className="bg-surface-container-lowest p-4 rounded-2xl shadow-sm border border-surface-container-high/40 space-y-3">
        {/* Top Line: Unified Search Input & Sort Selector */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full flex items-center">
            <span className="material-symbols-outlined absolute left-3.5 text-on-surface-variant text-xl pointer-events-none">
              search
            </span>
            <input
              id="projectSearchInput"
              type="text"
              value={searchQuery}
              onChange={(e) => {
                if (setSearchQuery) setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Filter by project title, stack (e.g. React 19, FastAPI), role, or university..."
              className="w-full pl-11 pr-20 py-2.5 bg-surface-container-low text-on-surface placeholder:text-on-surface-variant font-body-sm text-sm rounded-xl outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-secondary/30 transition-all border border-transparent focus:border-secondary/20"
            />
            {searchQuery ? (
              <button
                type="button"
                onClick={() => {
                  if (setSearchQuery) setSearchQuery('');
                  setCurrentPage(1);
                }}
                className="absolute right-3 px-2 py-0.5 text-xs text-on-surface-variant hover:text-on-surface bg-surface-container hover:bg-surface-container-high rounded-md transition-colors cursor-pointer"
              >
                Clear
              </button>
            ) : null}
          </div>

          {/* Quick Sort Dropdown */}
          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
            <span className="text-xs text-on-surface-variant font-medium hidden sm:inline">Sort:</span>
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="appearance-none bg-surface-container-low text-on-surface text-xs font-semibold px-3 py-2 pr-7 rounded-xl cursor-pointer outline-none hover:bg-surface-container focus:ring-2 focus:ring-secondary/30 transition-all"
              >
                <option value="match">Match Score</option>
                <option value="urgent">Most Urgent</option>
                <option value="capacity">Open Capacity</option>
              </select>
              <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-on-surface-variant text-base pointer-events-none">
                expand_more
              </span>
            </div>
          </div>
        </div>

        {/* Bottom Line: Category Pills & Secondary Facets */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-surface-container-low">
          {/* Quick Category Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5" id="filterBadgesContainer">
            {[
              { id: 'all', label: 'All Squads' },
              { id: 'urgent', label: 'Urgent Vacancies', dot: 'bg-error' },
              { id: 'hacknova', label: 'HackNova \'26', icon: 'bolt' },
              { id: 'ai', label: 'AI & ML', icon: 'psychology' },
              { id: 'web3', label: 'Web3 & ZK', icon: 'token' },
              { id: 'beginner', label: 'Beginner Friendly' }
            ].map(pill => {
              const isActive = activeFilterPill === pill.id;
              return (
                <button
                  key={pill.id}
                  type="button"
                  onClick={() => { setActiveFilterPill(pill.id); setCurrentPage(1); }}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-primary text-on-primary shadow-xs'
                      : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
                  }`}
                >
                  {pill.dot && <span className={`w-1.5 h-1.5 rounded-full ${pill.dot}`} />}
                  {pill.icon && <span className="material-symbols-outlined text-sm">{pill.icon}</span>}
                  <span>{pill.label}</span>
                </button>
              );
            })}
          </div>

          {/* Compact Dropdown Filters */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Tech Stack Dropdown */}
            <div className="relative">
              <select
                value={techStackFilter}
                onChange={(e) => { setTechStackFilter(e.target.value); setCurrentPage(1); }}
                className="appearance-none bg-surface-container-low text-on-surface text-xs font-medium px-3 py-1.5 pr-7 rounded-lg cursor-pointer outline-none hover:bg-surface-container transition-all"
              >
                <option value="">Stack: All</option>
                <option value="react">React / React 19</option>
                <option value="fastapi">FastAPI / Python</option>
                <option value="nextjs">Next.js</option>
                <option value="solidity">Solidity / ZK</option>
                <option value="node">Node.js</option>
              </select>
              <span className="material-symbols-outlined absolute right-1.5 top-1/2 -translate-y-1/2 text-on-surface-variant text-sm pointer-events-none">
                expand_more
              </span>
            </div>

            {/* Role Dropdown */}
            <div className="relative">
              <select
                value={roleFilter}
                onChange={(e) => { setRoleFilter(e.target.value); setCurrentPage(1); }}
                className="appearance-none bg-surface-container-low text-on-surface text-xs font-medium px-3 py-1.5 pr-7 rounded-lg cursor-pointer outline-none hover:bg-surface-container transition-all"
              >
                <option value="">Role: All</option>
                <option value="frontend">Frontend</option>
                <option value="backend">Backend</option>
                <option value="ai">AI / ML</option>
                <option value="uiux">UI/UX Design</option>
                <option value="fullstack">Fullstack</option>
              </select>
              <span className="material-symbols-outlined absolute right-1.5 top-1/2 -translate-y-1/2 text-on-surface-variant text-sm pointer-events-none">
                expand_more
              </span>
            </div>

            {/* Campus Dropdown */}
            {availableCampuses.length > 0 && (
              <div className="relative">
                <select
                  value={campusFilter}
                  onChange={(e) => { setCampusFilter(e.target.value); setCurrentPage(1); }}
                  className="appearance-none bg-surface-container-low text-on-surface text-xs font-medium px-3 py-1.5 pr-7 rounded-lg cursor-pointer outline-none hover:bg-surface-container transition-all"
                >
                  <option value="">Campus: Any</option>
                  {availableCampuses.map((c, idx) => (
                    <option key={idx} value={c}>{c}</option>
                  ))}
                </select>
                <span className="material-symbols-outlined absolute right-1.5 top-1/2 -translate-y-1/2 text-on-surface-variant text-sm pointer-events-none">
                  expand_more
                </span>
              </div>
            )}

            {/* Reset Filter Button */}
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="text-xs text-secondary hover:underline font-semibold px-1 py-1 cursor-pointer flex items-center gap-0.5"
              >
                <span className="material-symbols-outlined text-sm">restart_alt</span>
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {paginatedProjects.length === 0 ? (
        <div className="bg-surface-container-lowest p-12 rounded-2xl text-center space-y-3 border border-surface-container-high/40">
          <span className="material-symbols-outlined text-4xl text-outline">
            {projects.length === 0 ? 'folder_open' : 'search_off'}
          </span>
          <h3 className="font-headline-sm text-lg font-bold text-on-surface">
            {projects.length === 0 ? 'No squads registered yet' : 'No squads match your search criteria'}
          </h3>
          <p className="font-body-md text-sm text-on-surface-variant max-w-md mx-auto">
            {projects.length === 0
              ? 'Be the first to post a collegiate project squad and recruit teammates from your campus!'
              : 'Try broadening your search term or clearing one of the role / stack filters.'}
          </p>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="px-4 py-2 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface font-title-sm text-xs font-semibold transition-all inline-block mt-2 cursor-pointer"
            >
              Reset All Filters
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {paginatedProjects.map((project) => {
            const fillPercent = Math.round((project.filledCount / project.totalCapacity) * 100);
            const openSeats = project.totalCapacity - project.filledCount;

            return (
              <div
                key={project.id}
                className="group bg-surface-container-lowest rounded-2xl border border-surface-container-high/60 hover:border-secondary/40 hover:shadow-lg transition-all duration-200 flex flex-col justify-between overflow-hidden p-5"
              >
                <div className="space-y-3">
                  {/* Clean Card Header: Just category and open seats */}
                  <div className="flex items-center justify-between text-xs">
                    <span className="px-2.5 py-0.5 rounded-full bg-surface-container text-secondary font-semibold uppercase tracking-wider text-[11px]">
                      {project.categoryBadge}
                    </span>
                    <span className={`inline-flex items-center gap-1 font-semibold ${
                      project.urgency === 'high' ? 'text-error' : 'text-on-surface-variant'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        project.urgency === 'high' ? 'bg-error animate-pulse' : 'bg-secondary'
                      }`} />
                      <span>{openSeats} {openSeats === 1 ? 'seat' : 'seats'} open</span>
                    </span>
                  </div>

                  {/* Clean Cover Visual */}
                  <div 
                    onClick={() => onSelectProject(project)}
                    className="relative w-full h-32 rounded-xl overflow-hidden bg-surface-container-low cursor-pointer"
                  >
                    <img
                      src={project.image}
                      alt={project.title}
                      className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent"></div>
                    <div className="absolute bottom-2 left-2.5">
                      <span className="px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-sm text-white text-[11px] font-medium">
                        {project.imageTag}
                      </span>
                    </div>
                  </div>

                  {/* Title & Concise Pitch */}
                  <div>
                    <h3 
                      onClick={() => onSelectProject(project)}
                      className="font-headline-sm text-base font-bold text-on-surface group-hover:text-secondary transition-colors leading-snug cursor-pointer line-clamp-1"
                    >
                      {project.title}
                    </h3>
                    <p className="font-body-sm text-xs text-on-surface-variant mt-1 line-clamp-2 leading-relaxed">
                      {project.tagline}
                    </p>
                  </div>

                  {/* Minimalist Tech Stack Chips */}
                  <div className="flex flex-wrap gap-1">
                    {project.techStack.slice(0, 3).map((tech, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded-md bg-surface-container-low text-on-surface-variant text-[11px] font-medium"
                      >
                        {tech}
                      </span>
                    ))}
                    {project.techStack.length > 3 && (
                      <span className="px-1.5 py-0.5 rounded-md bg-surface-container-low text-on-surface-variant text-[11px]">
                        +{project.techStack.length - 3}
                      </span>
                    )}
                  </div>

                  {/* Clean Role Highlight (Replaces Cluttered Multi-Badge Matrix!) */}
                  <div className="pt-2 border-t border-surface-container-high/50 flex items-center gap-1.5 text-xs">
                    <span className="font-semibold text-secondary shrink-0">Seeking:</span>
                    <span className="text-on-surface font-medium truncate">
                      {project.openVacancies?.map(v => v.title.split(' ')[0] + (v.title.split(' ')[1] ? ' ' + v.title.split(' ')[1] : '')).join(', ') || 'Core Contributor'}
                    </span>
                  </div>
                </div>

                {/* Footer with Lead, Capacity Bar & Actions */}
                <div className="mt-4 pt-3 border-t border-surface-container-high/50 space-y-3">
                  <div className="flex items-center justify-between">
                    {/* Lead */}
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="relative shrink-0">
                        {project.lead?.avatar ? (
                          <img
                            src={project.lead.avatar}
                            alt=""
                            className="w-7 h-7 rounded-full object-cover shrink-0"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                              if (e.currentTarget.nextElementSibling) {
                                e.currentTarget.nextElementSibling.style.display = 'flex';
                              }
                            }}
                          />
                        ) : null}
                        <div 
                          style={{ display: project.lead?.avatar ? 'none' : 'flex' }}
                          className="w-7 h-7 rounded-full bg-secondary/15 text-secondary font-bold text-xs items-center justify-center shrink-0"
                        >
                          {(project.lead?.name || 'L').charAt(0).toUpperCase()}
                        </div>
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-semibold text-on-surface truncate leading-tight">
                          {project.lead?.name || 'Squad Lead'}
                        </span>
                        <span className="text-[11px] text-on-surface-variant truncate leading-tight">
                          {project.lead?.university || 'Campus Member'}
                        </span>
                      </div>
                    </div>

                    {/* Capacity Indicator */}
                    <div className="flex items-center gap-1.5 shrink-0 text-right">
                      <div className="w-14 h-1.5 bg-surface-container-high rounded-full overflow-hidden">
                        <div
                          className="h-full bg-secondary rounded-full"
                          style={{ width: `${fillPercent}%` }}
                        />
                      </div>
                      <span className="text-[11px] font-bold text-on-surface">
                        {project.filledCount}/{project.totalCapacity}
                      </span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => onSelectProject(project)}
                      className="py-2 px-3 rounded-xl bg-surface-container-low hover:bg-surface-container text-on-surface text-xs font-semibold transition-all text-center cursor-pointer"
                    >
                      Details
                    </button>
                    <button
                      type="button"
                      onClick={() => onQuickApply(project)}
                      className="py-2 px-3 rounded-xl bg-primary text-on-primary hover:bg-surface-tint active:scale-[0.98] text-xs font-semibold transition-all text-center flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <span>Quick Apply</span>
                      <span className="material-symbols-outlined text-xs">arrow_forward</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination & Status Footer */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-surface-container-lowest p-4 rounded-2xl shadow-sm border border-surface-container-high/40 text-xs">
        <div className="flex items-center gap-2 text-on-surface-variant font-medium">
          <span>
            Showing <strong className="text-on-surface">{Math.min(filteredProjects.length, itemsPerPage)}</strong> of{' '}
            <strong className="text-on-surface">{filteredProjects.length}</strong> live squads
          </span>
          {hasActiveFilters && (
            <span className="px-2 py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed text-[10px] font-semibold">
              Filters Active
            </span>
          )}
        </div>

        {/* Pagination Controls */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-surface-container-low text-on-surface-variant hover:bg-surface-container disabled:opacity-40 transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-base">chevron_left</span>
          </button>
          
          {Array.from({ length: totalPages }).map((_, idx) => {
            const pageNum = idx + 1;
            const isCurrent = currentPage === pageNum;
            return (
              <button
                key={pageNum}
                type="button"
                onClick={() => setCurrentPage(pageNum)}
                className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  isCurrent
                    ? 'bg-primary text-on-primary'
                    : 'bg-surface-container-low hover:bg-surface-container text-on-surface'
                }`}
              >
                {pageNum}
              </button>
            );
          })}

          <button
            type="button"
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-surface-container-low text-on-surface-variant hover:bg-surface-container disabled:opacity-40 transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-base">chevron_right</span>
          </button>
        </div>
      </div>
    </div>
  );
}
