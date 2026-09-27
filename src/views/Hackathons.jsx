import { useState, useMemo } from 'react';
import HackathonHero from '../components/hackathons/HackathonHero';
import HackathonCard from '../components/hackathons/HackathonCard';
import HackathonDetailsModal from '../components/hackathons/HackathonDetailsModal';
import HackathonSquadUpModal from '../components/hackathons/HackathonSquadUpModal';
import SubmitHackathonModal from '../components/hackathons/SubmitHackathonModal';
import HackathonTeamDetailsModal from '../components/hackathons/HackathonTeamDetailsModal';

export default function Hackathons({ 
  hackathons, 
  projects = [],
  builders = [],
  hackathonSquads = [],
  onAddHackathon,
  onApplySquad,
  onInviteBuilder,
  onCreateSquad,
  showToast,
  currentUser
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusTab, setStatusTab] = useState('all'); // 'all' | 'open' | 'upcoming' | 'finished'
  const [activeMode, setActiveMode] = useState('all'); // 'all' | 'in-person' | 'hybrid' | 'virtual'
  const [activeTracks, setActiveTracks] = useState([]);
  const [sortBy, setSortBy] = useState('date'); // 'date' | 'prize'
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'

  // Modals state
  const [selectedHackathon, setSelectedHackathon] = useState(null);
  const [squadUpHackathon, setSquadUpHackathon] = useState(null);
  const [selectedTeamDetails, setSelectedTeamDetails] = useState(null);
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);

  const toggleTrack = (trackKey) => {
    setActiveTracks(prev => 
      prev.includes(trackKey) ? prev.filter(t => t !== trackKey) : [...prev, trackKey]
    );
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setStatusTab('all');
    setActiveMode('all');
    setActiveTracks([]);
    setSortBy('date');
  };

  const hasActiveFilters = searchQuery.trim() || statusTab !== 'all' || activeMode !== 'all' || activeTracks.length > 0 || sortBy !== 'date';

  // Active Flagship for Hero Spotlight
  const flagship = useMemo(() => {
    return hackathons.find(h => h.isFeatured) || hackathons[0] || null;
  }, [hackathons]);

  // Overall Counts for Status Tabs matching all 5 lifecycle states
  const tabCounts = useMemo(() => {
    const listWithoutFlagship = hackathons.filter(h => !flagship || (h._id || h.id) !== (flagship._id || flagship.id));
    return {
      all: listWithoutFlagship.length,
      open: listWithoutFlagship.filter(h => h.status === 'open').length,
      'closing-soon': listWithoutFlagship.filter(h => h.status === 'closing-soon').length,
      upcoming: listWithoutFlagship.filter(h => h.status === 'upcoming').length,
      closed: listWithoutFlagship.filter(h => h.status === 'closed' || h.status === 'finished').length,
      'team-full': listWithoutFlagship.filter(h => h.status === 'team-full').length
    };
  }, [hackathons, flagship]);

  // Filtered Hackathons
  const filteredHackathons = useMemo(() => {
    return hackathons.filter(h => {
      // Exclude flagship from standard list so it's highlighted in the Hero
      if (flagship && (h._id || h.id) === (flagship._id || flagship.id)) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = h.title?.toLowerCase().includes(q);
        const matchesSub = h.subtitle?.toLowerCase().includes(q);
        const matchesLoc = h.location?.toLowerCase().includes(q);
        const matchesTracks = h.trackLabels?.some(tl => tl.toLowerCase().includes(q));
        const matchesCircuit = h.circuitId?.toLowerCase().includes(q);
        if (!matchesTitle && !matchesSub && !matchesLoc && !matchesTracks && !matchesCircuit) {
          return false;
        }
      }

      // Status Tab filter for all 5 lifecycle states
      if (statusTab !== 'all') {
        if (statusTab === 'open' && h.status !== 'open') return false;
        if (statusTab === 'closing-soon' && h.status !== 'closing-soon') return false;
        if (statusTab === 'upcoming' && h.status !== 'upcoming') return false;
        if (statusTab === 'closed' && (h.status !== 'closed' && h.status !== 'finished')) return false;
        if (statusTab === 'team-full' && h.status !== 'team-full') return false;
      }

      // Mode filter (supports Online/Virtual, Offline/In-person, and Hybrid)
      if (activeMode !== 'all') {
        const hMode = (h.mode || '').toLowerCase().trim();
        const aMode = activeMode.toLowerCase().trim();
        const isMatch =
          hMode === aMode ||
          ((aMode === 'virtual' || aMode === 'online') && (hMode === 'virtual' || hMode === 'online')) ||
          ((aMode === 'in-person' || aMode === 'offline') && (hMode === 'in-person' || hMode === 'offline')) ||
          (aMode === 'hybrid' && hMode === 'hybrid');
        if (!isMatch) {
          return false;
        }
      }

      // Track filters
      if (activeTracks.length > 0) {
        const hasTrack = activeTracks.some(t => h.tracks?.includes(t));
        if (!hasTrack) return false;
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === 'prize') {
        const prizeA = parseInt(a.prizePool.replace(/[^0-9]/g, '')) || 0;
        const prizeB = parseInt(b.prizePool.replace(/[^0-9]/g, '')) || 0;
        return prizeB - prizeA;
      }
      return 0;
    });
  }, [hackathons, flagship, searchQuery, statusTab, activeMode, activeTracks, sortBy]);

  const activeCircuitHackathons = useMemo(() => {
    if (statusTab === 'closed') return [];
    if (statusTab !== 'all') return filteredHackathons;
    return filteredHackathons.filter(h => h.status !== 'closed' && h.status !== 'finished');
  }, [filteredHackathons, statusTab]);

  const concludedHackathons = useMemo(() => {
    if (statusTab === 'closed') return filteredHackathons;
    if (statusTab !== 'all') return [];
    return filteredHackathons.filter(h => h.status === 'closed' || h.status === 'finished');
  }, [filteredHackathons, statusTab]);

  const handleOpenSquadUp = (hackathonOrTitle) => {
    if (typeof hackathonOrTitle === 'string') {
      const found = hackathons.find(h => h.title.toLowerCase().includes(hackathonOrTitle.toLowerCase())) || flagship;
      setSquadUpHackathon(found);
    } else {
      setSquadUpHackathon(hackathonOrTitle);
    }
  };

  const handleSubmitNewHackathon = (newHack) => {
    if (onAddHackathon) {
      onAddHackathon(newHack);
    }
    if (showToast) {
      showToast(`Submitted "${newHack.title}" for BuildCrew Circuit sanctioning!`);
    }
  };

  return (
    <div className="flex flex-col w-full pb-space-xl space-y-6">
      {/* 1. Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-1.5 text-secondary text-xs font-extrabold uppercase tracking-wider mb-1">
            <span className="material-symbols-outlined text-base">military_tech</span>
            <span>Sanctioned Collegiate Circuit</span>
            <span className="text-outline-variant">•</span>
            <span className="text-on-surface-variant font-medium">2026–2027 Season</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-on-surface tracking-tight leading-tight">
            Collegiate Hackathons
          </h1>
          <p className="text-xs sm:text-sm text-on-surface-variant mt-1 leading-relaxed max-w-2xl">
            Sanctioned collegiate hackathons, verified prize bounties, and in-circuit squad matchmaking.
          </p>
        </div>

        {/* Action Header Buttons */}
        <div className="flex items-center gap-2.5 self-start sm:self-auto shrink-0">
          <button
            type="button"
            onClick={() => {
              if (showToast) showToast('Circuit Schedule synced with your Google Calendar!');
            }}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-surface-container-high hover:bg-surface-container-highest text-on-surface text-xs font-bold shadow-sm transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-base text-secondary">calendar_month</span>
            <span>My Schedule</span>
          </button>

          <button
            type="button"
            onClick={() => setIsSubmitModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary hover:bg-surface-tint active:scale-[0.98] text-on-primary text-xs font-bold shadow-md transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-base">add_task</span>
            <span>Submit Hackathon</span>
          </button>
        </div>
      </div>

      {/* 2. Flagship Featured Hero Spotlight */}
      {flagship && (
        <HackathonHero
          flagship={flagship}
          onFindSquad={() => handleOpenSquadUp(flagship)}
          onOpenDetails={(h) => setSelectedHackathon(h)}
        />
      )}

      {/* 3. Streamlined Filter Command Deck */}
      <div className="bg-surface-container-lowest rounded-2xl p-4 sm:p-5 border border-surface-container-high/80 shadow-sm space-y-3.5">
        {/* Row 1: Search + Status Tabs + View Toggle */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-lg pointer-events-none">
              search
            </span>
            <input
              type="text"
              id="hackathonSearchInput"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search hackathons by name, university, track..."
              className="w-full pl-9 pr-8 py-2 rounded-xl bg-surface-container-low border border-transparent focus:border-secondary focus:bg-surface-container-lowest outline-none text-xs sm:text-sm text-on-surface placeholder:text-on-surface-variant transition-all font-medium"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface cursor-pointer"
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            {/* Status Tabs with Live Badges */}
            <div className="flex items-center gap-1 p-1 bg-surface-container-low rounded-xl overflow-x-auto shrink-0">
              {[
                { id: 'all', label: 'All', count: tabCounts.all },
                { id: 'open', label: 'Registration open', count: tabCounts.open },
                { id: 'closing-soon', label: 'Closing soon', count: tabCounts['closing-soon'] },
                { id: 'upcoming', label: 'Upcoming', count: tabCounts.upcoming },
                { id: 'team-full', label: 'Team full', count: tabCounts['team-full'] },
                { id: 'closed', label: 'Registration closed', count: tabCounts.closed }
              ].map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setStatusTab(tab.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                    statusTab === tab.id
                      ? 'bg-surface-container-lowest text-on-surface shadow-sm'
                      : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                    statusTab === tab.id ? 'bg-secondary-fixed text-on-secondary-fixed' : 'bg-surface-container-high text-on-surface-variant'
                  }`}>
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>

            {/* View Mode Toggle */}
            <div className="hidden sm:flex items-center gap-1 p-1 bg-surface-container-low rounded-xl shrink-0">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                title="Grid View"
                className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                  viewMode === 'grid'
                    ? 'bg-surface-container-lowest text-secondary shadow-sm'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                <span className="material-symbols-outlined text-base">grid_view</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                title="List View"
                className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                  viewMode === 'list'
                    ? 'bg-surface-container-lowest text-secondary shadow-sm'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                <span className="material-symbols-outlined text-base">view_list</span>
              </button>
            </div>
          </div>
        </div>

        {/* Row 2: Tracks Filters & Format Selector */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-surface-container-high/60 text-xs">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-outline mr-1">
              Tracks:
            </span>
            {[
              { id: 'ai', label: 'AI & Agents' },
              { id: 'web3', label: 'Web3 & ZK' },
              { id: 'fintech', label: 'FinTech' },
              { id: 'healthtech', label: 'HealthTech' },
              { id: 'climate', label: 'Climate' }
            ].map((track) => {
              const isSelected = activeTracks.includes(track.id);
              return (
                <button
                  key={track.id}
                  type="button"
                  onClick={() => toggleTrack(track.id)}
                  className={`px-2.5 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-secondary text-on-secondary shadow-sm'
                      : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
                  }`}
                >
                  {track.label}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2.5">
            {/* Format Select */}
            <div className="flex items-center gap-1">
              <span className="text-outline text-xs font-medium">Format:</span>
              <select
                value={activeMode}
                onChange={(e) => setActiveMode(e.target.value)}
                className="bg-surface-container-low px-2 py-1 rounded-lg text-xs font-bold text-on-surface outline-none cursor-pointer"
              >
                <option value="all">All Formats</option>
                <option value="online">Online</option>
                <option value="in-person">Offline / In-Person</option>
                <option value="hybrid">Hybrid</option>
              </select>
            </div>

            {/* Sort Select */}
            <div className="flex items-center gap-1">
              <span className="text-outline text-xs font-medium">Sort:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-surface-container-low px-2 py-1 rounded-lg text-xs font-bold text-on-surface outline-none cursor-pointer"
              >
                <option value="date">Upcoming Date</option>
                <option value="prize">Highest Prize</option>
              </select>
            </div>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="text-xs font-bold text-secondary hover:text-primary transition-colors flex items-center gap-1 cursor-pointer pl-1"
              >
                <span className="material-symbols-outlined text-sm">filter_alt_off</span>
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 4. Main Section */}
      <div className="w-full space-y-6">
        {/* Active / Open Circuit Section */}
        {activeCircuitHackathons.length > 0 && (
          <div className="space-y-3.5">
            <div className="flex items-center justify-between pb-0.5">
              <div className="flex items-center gap-2">
                <h3 className="font-title-md font-extrabold text-on-surface">
                  Sanctioned Circuit Events
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed text-xs font-extrabold">
                  {activeCircuitHackathons.length} Active
                </span>
              </div>
              <span className="text-xs text-on-surface-variant font-medium">
                Verified with collegiate engineering boards
              </span>
            </div>

            {viewMode === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {activeCircuitHackathons.map((h) => (
                  <HackathonCard
                    key={h.id}
                    hackathon={h}
                    viewMode="grid"
                    onSelect={(item) => setSelectedHackathon(item)}
                    onFindSquad={() => handleOpenSquadUp(h)}
                  />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {activeCircuitHackathons.map((h) => (
                  <HackathonCard
                    key={h.id}
                    hackathon={h}
                    viewMode="list"
                    onSelect={(item) => setSelectedHackathon(item)}
                    onFindSquad={() => handleOpenSquadUp(h)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Concluded / Archive Circuit Section */}
        {concludedHackathons.length > 0 && (
          <div className="pt-2 space-y-3.5">
            <div className="flex items-center justify-between pb-0.5 pt-2 border-t border-surface-container-high/70">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-outline"></span>
                <h4 className="font-title-md font-bold text-on-surface">
                  Circuit Archive &amp; Concluded Results
                </h4>
                <span className="px-2 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant text-xs font-bold">
                  {concludedHackathons.length}
                </span>
              </div>
              <span className="text-xs text-on-surface-variant font-medium">
                Official podium archives
              </span>
            </div>

            {viewMode === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {concludedHackathons.map((h) => (
                  <HackathonCard
                    key={h.id}
                    hackathon={h}
                    viewMode="grid"
                    onSelect={(item) => setSelectedHackathon(item)}
                    onFindSquad={() => handleOpenSquadUp(h)}
                  />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {concludedHackathons.map((h) => (
                  <HackathonCard
                    key={h.id}
                    hackathon={h}
                    viewMode="list"
                    onSelect={(item) => setSelectedHackathon(item)}
                    onFindSquad={() => handleOpenSquadUp(h)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {activeCircuitHackathons.length === 0 && concludedHackathons.length === 0 && (
          <div className="bg-surface-container-lowest rounded-3xl p-12 text-center border border-surface-container-high space-y-3">
            <span className="material-symbols-outlined text-4xl text-outline">
              {hackathons.length === 0 ? 'emoji_events' : 'search_off'}
            </span>
            <h4 className="font-title-lg font-bold text-on-surface">
              {hackathons.length === 0 ? 'No active hackathons on circuit yet' : 'No hackathons match your filters'}
            </h4>
            <p className="text-xs text-on-surface-variant max-w-sm mx-auto">
              {hackathons.length === 0
                ? 'Campus hackathons and collegiate sprints will appear here once published by organizers or administrators.'
                : 'Try clearing your search query or reset the track filters.'}
            </p>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="px-4 py-2 rounded-xl bg-surface-container hover:bg-surface-container-high text-xs font-bold text-on-surface transition-all cursor-pointer inline-block mt-1"
              >
                Reset Filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* Hackathon Squad Up Modal (Resolves bug: stays right here in Hackathons!) */}
      <HackathonSquadUpModal
        hackathon={squadUpHackathon}
        isOpen={Boolean(squadUpHackathon)}
        onClose={() => setSquadUpHackathon(null)}
        projects={projects}
        builders={builders}
        onApplySquad={onApplySquad}
        onInviteBuilder={onInviteBuilder}
        onCreateSquad={onCreateSquad}
        showToast={showToast}
        currentUser={currentUser}
      />

      {/* Comprehensive Details Modal */}
      <HackathonDetailsModal
        hackathon={selectedHackathon}
        isOpen={Boolean(selectedHackathon)}
        onClose={() => setSelectedHackathon(null)}
        onFindSquad={(h) => handleOpenSquadUp(h)}
        onOpenTeamDetails={(team) => setSelectedTeamDetails(team)}
        hackathonSquads={(hackathonSquads || []).filter(sq => sq.hackathonId === (selectedHackathon?._id || selectedHackathon?.id))}
      />

      {/* Hackathon Team Details Modal */}
      <HackathonTeamDetailsModal
        squad={selectedTeamDetails}
        isOpen={Boolean(selectedTeamDetails)}
        onClose={() => setSelectedTeamDetails(null)}
        onApplyRole={onApplySquad}
        showToast={showToast}
      />

      {/* Submit Hackathon Modal */}
      <SubmitHackathonModal
        isOpen={isSubmitModalOpen}
        onClose={() => setIsSubmitModalOpen(false)}
        onSubmit={handleSubmitNewHackathon}
      />
    </div>
  );
}
