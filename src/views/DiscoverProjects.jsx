import React, { useState, useMemo } from 'react';

function cleanText(text) {
  if (!text) return '';
  const trimmed = String(text).trim();
  const lower = trimmed.toLowerCase();
  if (lower === 'campus member' || lower === 'collegiate campus' || lower === 'nothing' || lower === 'n/a' || lower === 'none') {
    return '';
  }
  return trimmed;
}

function getRealCategory(project) {
  if (!project) return '';
  const rawCat = cleanText(project.category);
  if (
    rawCat &&
    rawCat.toLowerCase() !== 'project' &&
    rawCat.toLowerCase() !== 'collegiate sprint' &&
    rawCat.toLowerCase() !== 'build'
  ) {
    return rawCat;
  }
  const badge = cleanText(project.categoryBadge);
  if (
    badge &&
    badge.toLowerCase() !== 'collegiate sprint' &&
    badge.toLowerCase() !== 'build' &&
    badge.toLowerCase() !== 'project'
  ) {
    return badge;
  }
  return '';
}

function getCategoryIcon(category) {
  if (!category) return 'terminal';
  const c = category.toLowerCase();
  if (c.includes('web')) return 'language';
  if (c.includes('ai') || c.includes('machine learning') || c.includes('ml')) return 'psychology';
  if (c.includes('mobile')) return 'smartphone';
  if (c.includes('cyber')) return 'security';
  if (c.includes('iot')) return 'sensors';
  if (c.includes('data')) return 'analytics';
  return 'rocket_launch';
}

export default function DiscoverProjects({ 
  projects = [], 
  searchQuery = '',
  setSearchQuery,
  onSelectProject, 
  onQuickApply,
  currentUser
}) {
  const [activeFilterPill, setActiveFilterPill] = useState('all');
  const [sortBy, setSortBy] = useState('newest'); // 'newest' | 'spots'
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  // Resolve logged-in user's MongoDB user ID
  const loggedInUserId = useMemo(() => {
    if (currentUser) {
      return String(currentUser._id || currentUser.id || '');
    }
    try {
      const stored = localStorage.getItem('buildcrew_user');
      if (stored) {
        const parsed = JSON.parse(stored);
        return String(parsed._id || parsed.id || '');
      }
    } catch {
      // ignore
    }
    return '';
  }, [currentUser]);

  const hasActiveFilters = Boolean(
    searchQuery.trim() ||
    activeFilterPill !== 'all'
  );

  const handleResetFilters = () => {
    if (setSearchQuery) setSearchQuery('');
    setActiveFilterPill('all');
    setCurrentPage(1);
  };

  // Filter & Sort logic based ONLY on real MongoDB data
  const filteredProjects = useMemo(() => {
    let result = projects.filter(p => {
      // Rule: Do NOT show projects created by the currently logged-in user in Discover Projects list.
      // Filter ONLY by the real MongoDB user ID / createdBy relationship (not by comparing names).
      if (loggedInUserId) {
        const creatorId = p.createdBy
          ? String(typeof p.createdBy === 'object' ? (p.createdBy._id || p.createdBy.id || '') : p.createdBy)
          : '';
        if (creatorId && creatorId === loggedInUserId) {
          return false;
        }
      }

      // Search query matching
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = (p.title || '').toLowerCase().includes(q);
        const matchDesc = (p.tagline || p.whatAreYouBuilding || p.problemBeingSolved || p.fullDescription || '').toLowerCase().includes(q);
        const matchCategory = getRealCategory(p).toLowerCase().includes(q);
        const matchCreator = (p.createdBy?.name || p.lead?.name || '').toLowerCase().includes(q);
        const matchRoles = (p.openVacancies || []).some(v => (v.title || '').toLowerCase().includes(q)) ||
                           (p.roles || []).some(r => (r.roleName || '').toLowerCase().includes(q)) ||
                           (p.rolesNeeded || []).some(r => String(r).toLowerCase().includes(q));
        if (!matchTitle && !matchDesc && !matchCategory && !matchCreator && !matchRoles) {
          return false;
        }
      }

      // Category filter matching real MongoDB project categories
      if (activeFilterPill !== 'all') {
        const pCat = getRealCategory(p).toLowerCase();
        if (activeFilterPill === 'web') {
          if (!pCat.includes('web')) return false;
        } else if (activeFilterPill === 'ai') {
          if (!pCat.includes('ai') && !pCat.includes('machine learning') && !pCat.includes('ml')) return false;
        } else if (activeFilterPill === 'mobile') {
          if (!pCat.includes('mobile')) return false;
        } else if (activeFilterPill === 'cybersecurity') {
          if (!pCat.includes('cyber')) return false;
        } else if (activeFilterPill === 'iot') {
          if (!pCat.includes('iot')) return false;
        } else if (activeFilterPill === 'data') {
          if (!pCat.includes('data')) return false;
        } else if (activeFilterPill === 'other') {
          if (!pCat.includes('other')) return false;
        }
      }

      return true;
    });

    // Helper to determine if a project is Team Full from real member count and maximum capacity
    const isProjectFull = (p) => {
      if (!p) return false;
      const membersCount = Array.isArray(p.members) && p.members.length > 0
        ? p.members.length
        : (Number(p.filledCount) || 1);
      const maxCapacity = Number(p.totalCapacity) || 4;
      return membersCount >= maxCapacity || p.status === 'full' || p.recruitingBadge === 'Squad Full';
    };

    // Sorting:
    // Rule: Team Full projects should automatically move to the bottom of the Discover Projects list.
    // Non-full/recruiting projects should appear above Team Full projects.
    result.sort((a, b) => {
      const fullA = isProjectFull(a);
      const fullB = isProjectFull(b);

      // Non-full projects appear above Team Full projects
      if (!fullA && fullB) return -1;
      if (fullA && !fullB) return 1;

      // Within the same group, apply user sort preference
      if (sortBy === 'spots') {
        const spotsA = (a.totalCapacity || 4) - (a.members?.length || a.filledCount || 1);
        const spotsB = (b.totalCapacity || 4) - (b.members?.length || b.filledCount || 1);
        return spotsB - spotsA;
      }

      // Default: Newest first
      return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    });

    return result;
  }, [projects, searchQuery, activeFilterPill, sortBy, loggedInUserId]);

  const totalPages = Math.max(1, Math.ceil(filteredProjects.length / itemsPerPage));
  const paginatedProjects = filteredProjects.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="flex flex-col w-full space-y-6 pb-space-xl">
      {/* Clean, Non-Overwhelming Header */}
      <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm border border-surface-container-high/40 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1 max-w-2xl">
          <h1 className="font-headline-md text-2xl md:text-3xl text-on-surface font-extrabold tracking-tight">
            Discover Projects
          </h1>
          <p className="font-body-md text-sm md:text-base text-on-surface-variant leading-relaxed">
            Explore active student projects, view open roles, and collaborate with creators.
          </p>
        </div>
      </div>

      {/* Search & Category Filter Bar */}
      <div className="bg-surface-container-lowest p-4 rounded-2xl shadow-sm border border-surface-container-high/40 space-y-3">
        {/* Search input & Sort selector */}
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
              placeholder="Search projects by title, category, role, or creator..."
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

          {/* Sort Dropdown */}
          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
            <span className="text-xs text-on-surface-variant font-medium hidden sm:inline">Sort:</span>
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="appearance-none bg-surface-container-low text-on-surface text-xs font-semibold px-3 py-2 pr-7 rounded-xl cursor-pointer outline-none hover:bg-surface-container focus:ring-2 focus:ring-secondary/30 transition-all"
              >
                <option value="newest">Newest First</option>
                <option value="spots">Open Capacity</option>
              </select>
              <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-on-surface-variant text-base pointer-events-none">
                expand_more
              </span>
            </div>
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-surface-container-low">
          <div className="flex flex-wrap items-center gap-1.5" id="filterBadgesContainer">
            {[
              { id: 'all', label: 'All Projects' },
              { id: 'web', label: 'Web Development', icon: 'language' },
              { id: 'ai', label: 'AI & ML', icon: 'psychology' },
              { id: 'mobile', label: 'Mobile App', icon: 'smartphone' },
              { id: 'cybersecurity', label: 'Cybersecurity', icon: 'security' },
              { id: 'iot', label: 'IoT', icon: 'sensors' },
              { id: 'data', label: 'Data Science', icon: 'analytics' },
              { id: 'other', label: 'Other', icon: 'more_horiz' }
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
                  {pill.icon && <span className="material-symbols-outlined text-sm">{pill.icon}</span>}
                  <span>{pill.label}</span>
                </button>
              );
            })}
          </div>

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

      {/* Grid of Projects or Empty State */}
      {paginatedProjects.length === 0 ? (
        <div className="bg-surface-container-lowest p-12 rounded-2xl text-center space-y-3 border border-surface-container-high/40">
          <span className="material-symbols-outlined text-4xl text-outline">
            {projects.length === 0 ? 'folder_open' : 'search_off'}
          </span>
          <h3 className="font-headline-sm text-lg font-bold text-on-surface">
            {projects.length === 0 ? 'No projects registered yet' : 'No projects match your search criteria'}
          </h3>
          <p className="font-body-md text-sm text-on-surface-variant max-w-md mx-auto">
            {projects.length === 0
              ? 'Be the first to post a project and recruit teammates from your campus!'
              : 'Try broadening your search term or clearing the category filter.'}
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
            const maxTeamSize = Math.max(1, Number(project.totalCapacity) || 4);
            const rawMembersCount = Array.isArray(project.members) && project.members.length > 0
              ? project.members.length
              : (Number(project.filledCount) || 1);
            const actualMembersCount = Math.min(rawMembersCount, maxTeamSize);
            const isTeamFull = actualMembersCount >= maxTeamSize || project.status === 'full' || project.recruitingBadge === 'Squad Full';

            // Real project creator from MongoDB createdBy user relationship
            const creator = (typeof project.createdBy === 'object' && project.createdBy !== null)
              ? project.createdBy
              : (project.lead || {});
            const creatorName = (creator.name || '').trim() || 'Student Builder';
            const creatorCollege = cleanText(creator.college || creator.university);
            const creatorAvatar = creator.avatar || creator.profileImage || '';
            const creatorAvatarLetter = (creatorName.charAt(0) || 'U').toUpperCase();
            const description = cleanText(project.tagline || project.whatAreYouBuilding || project.problemBeingSolved || project.fullDescription);
            const realCategory = getRealCategory(project);
            
            // Real open roles from MongoDB
            const rawRoles = (Array.isArray(project.roles) && project.roles.length > 0)
              ? project.roles.map(r => (typeof r === 'object' && r !== null ? r.roleName : r))
              : (Array.isArray(project.openVacancies) && project.openVacancies.length > 0)
                ? project.openVacancies.map(v => (typeof v === 'object' && v !== null ? v.title : v))
                : (Array.isArray(project.rolesNeeded) && project.rolesNeeded.length > 0)
                  ? project.rolesNeeded
                  : [];
            const openRolesList = rawRoles.map(cleanText).filter(Boolean);

            return (
              <div
                key={project._id || project.id}
                className="group bg-surface-container-lowest rounded-2xl border border-surface-container-high/60 hover:border-secondary/40 hover:shadow-lg transition-all duration-200 flex flex-col justify-between overflow-hidden p-5"
              >
                <div className="space-y-3">
                  {/* Top: Real Category Badge (left) & Real Team Status (right) */}
                  <div className="flex items-center justify-between text-xs min-h-[26px]">
                    {realCategory ? (
                      <span className="px-2.5 py-0.5 rounded-md bg-surface-container text-secondary font-semibold text-xs tracking-tight">
                        {realCategory}
                      </span>
                    ) : (
                      <span />
                    )}

                    <div className="flex items-center gap-1.5 shrink-0">
                      {isTeamFull ? (
                        <span className="flex items-center gap-1 text-[11px] font-semibold text-rose-500">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                          <span>Team Full</span>
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                          <span>Recruiting</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Project Image / Banner */}
                  <div
                    onClick={() => onSelectProject(project)}
                    className="relative w-full h-36 rounded-xl overflow-hidden bg-surface-container-low cursor-pointer group-hover:opacity-95 transition-opacity"
                  >
                    {project.image ? (
                      <img
                        src={project.image}
                        alt={project.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          if (e.currentTarget.nextElementSibling) {
                            e.currentTarget.nextElementSibling.style.display = 'flex';
                          }
                        }}
                      />
                    ) : null}
                    <div
                      style={{ display: project.image ? 'none' : 'flex' }}
                      className="w-full h-full bg-gradient-to-br from-surface-container via-surface-container-high to-surface-container-highest items-center justify-center relative overflow-hidden"
                    >
                      <div className="flex flex-col items-center gap-1.5 text-secondary z-10">
                        <span className="material-symbols-outlined text-3xl opacity-80">
                          {getCategoryIcon(realCategory)}
                        </span>
                        {realCategory && (
                          <span className="font-label-sm text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider">
                            {realCategory}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Title & Short Description */}
                  <div>
                    <h3 
                      onClick={() => onSelectProject(project)}
                      className="font-headline-sm text-base font-bold text-on-surface group-hover:text-secondary transition-colors leading-snug cursor-pointer line-clamp-1"
                    >
                      {project.title}
                    </h3>
                    {description && (
                      <p className="font-body-sm text-xs text-on-surface-variant mt-1 line-clamp-2 leading-relaxed">
                        {description}
                      </p>
                    )}
                  </div>

                  {/* Seeking: Real Open Roles */}
                  {openRolesList.length > 0 && (
                    <div className="pt-2 border-t border-surface-container-high/50 text-xs truncate">
                      <span className="text-secondary font-semibold">Seeking: </span>
                      <span className="text-on-surface font-medium">
                        {openRolesList.join(', ')}
                      </span>
                    </div>
                  )}
                </div>

                {/* Footer: Creator, Team Size & Action Buttons */}
                <div className="mt-4 pt-3 border-t border-surface-container-high/50 space-y-3">
                  <div className="flex items-center justify-between">
                    {/* Creator */}
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="relative shrink-0">
                        {creatorAvatar ? (
                          <img
                            src={creatorAvatar}
                            alt={creatorName}
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
                          style={{ display: creatorAvatar ? 'none' : 'flex' }}
                          className="w-7 h-7 rounded-full bg-secondary/15 text-secondary font-bold text-xs items-center justify-center shrink-0 select-none"
                        >
                          {creatorAvatarLetter}
                        </div>
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-semibold text-on-surface truncate leading-tight">
                          {creatorName}
                        </span>
                        {creatorCollege && (
                          <span className="text-[11px] text-on-surface-variant truncate leading-tight">
                            {creatorCollege}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Team Size: Current / Maximum */}
                    <span className="text-xs font-bold text-on-surface shrink-0 bg-surface-container-low px-2 py-1 rounded-lg">
                      {actualMembersCount} / {maxTeamSize} Members
                    </span>
                  </div>

                  {/* Action Buttons: View Details & Apply */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => onSelectProject(project)}
                      className="py-2 px-3 rounded-xl bg-surface-container-low hover:bg-surface-container text-on-surface text-xs font-semibold transition-all text-center cursor-pointer"
                    >
                      View Details
                    </button>
                    <button
                      type="button"
                      disabled={isTeamFull}
                      onClick={() => onQuickApply(project)}
                      className={`py-2 px-3 rounded-xl text-xs font-semibold transition-all text-center flex items-center justify-center gap-1 ${
                        isTeamFull
                          ? 'bg-surface-container text-on-surface-variant cursor-not-allowed opacity-60'
                          : 'bg-primary text-on-primary hover:bg-surface-tint active:scale-[0.98] cursor-pointer'
                      }`}
                    >
                      <span>Apply</span>
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
            <strong className="text-on-surface">{filteredProjects.length}</strong> projects
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
