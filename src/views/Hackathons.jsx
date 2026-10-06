import { useState, useMemo, useEffect } from 'react';
import HackathonHero from '../components/hackathons/HackathonHero';
import HackathonCard from '../components/hackathons/HackathonCard';
import HackathonDetailsModal from '../components/hackathons/HackathonDetailsModal';
import HackathonSquadUpModal from '../components/hackathons/HackathonSquadUpModal';
import SubmitHackathonModal from '../components/hackathons/SubmitHackathonModal';
import HackathonTeamDetailsModal from '../components/hackathons/HackathonTeamDetailsModal';
import { ALL_INDIAN_STATES, ALL_DISTRICTS } from '../constants/geoData';

// Date classification helper: checks if an event is in the current month or upcoming
function classifyHackathonDate(h) {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  const MONTH_MAP = {
    jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
    jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
  };

  const startCandidate = h.startDateRaw ? new Date(h.startDateRaw) : null;
  if (startCandidate && !isNaN(startCandidate.getTime())) {
    if (startCandidate.getFullYear() === currentYear && startCandidate.getMonth() === currentMonth) {
      return 'this-month';
    }
    if (startCandidate.getFullYear() > currentYear || (startCandidate.getFullYear() === currentYear && startCandidate.getMonth() > currentMonth)) {
      return 'upcoming';
    }
  }

  const isoDates = [h.endDateRaw, h.regDeadlineDate].filter(Boolean);
  for (const iso of isoDates) {
    const d = new Date(iso);
    if (!isNaN(d.getTime())) {
      if (d.getFullYear() === currentYear && d.getMonth() === currentMonth) {
        return 'this-month';
      }
      if (d.getFullYear() > currentYear || (d.getFullYear() === currentYear && d.getMonth() > currentMonth)) {
        return 'upcoming';
      }
    }
  }

  const text = `${h.dates || ''} ${h.startDate || ''} ${h.endDate || ''} ${h.registrationDeadline || ''}`.toLowerCase();
  const yearMatch = text.match(/\b(202[0-9])\b/);
  const yr = yearMatch ? parseInt(yearMatch[1], 10) : currentYear;

  const monthMatch = text.match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\b/);
  if (monthMatch) {
    const mo = MONTH_MAP[monthMatch[1]];
    if (yr === currentYear && mo === currentMonth) return 'this-month';
    if (yr > currentYear || (yr === currentYear && mo > currentMonth)) return 'upcoming';
  }

  return 'this-month';
}

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
  currentUser,
  selectedHackathonId = null,
  onSelectHackathon,
  onCloseDetails
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusTab, setStatusTab] = useState('all'); // 'all' | 'open' | 'upcoming' | 'finished'
  const [activeMode, setActiveMode] = useState('all'); // 'all' | 'in-person' | 'hybrid' | 'virtual'
  const [activeTracks, setActiveTracks] = useState([]);
  const [sortBy, setSortBy] = useState('date'); // 'date' | 'prize'
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'

  // Geographic classification filters
  const [selectedState, setSelectedState] = useState('');
  const [stateInput, setStateInput] = useState('');
  const [isStateDropdownOpen, setIsStateDropdownOpen] = useState(false);

  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [districtInput, setDistrictInput] = useState('');
  const [isDistrictDropdownOpen, setIsDistrictDropdownOpen] = useState(false);

  // Date classification and picker filters
  const [dateFilterMode, setDateFilterMode] = useState('all'); // 'all' | 'this-month' | 'upcoming'
  const [selectedDate, setSelectedDate] = useState(''); // 'YYYY-MM-DD'

  // Current date formatted for min attribute to disable past dates
  const todayFormatted = useMemo(() => {
    const d = new Date();
    const yr = d.getFullYear();
    const mo = String(d.getMonth() + 1).padStart(2, '0');
    const da = String(d.getDate()).padStart(2, '0');
    return `${yr}-${mo}-${da}`;
  }, []);

  // Modals state
  const [selectedHackathon, setSelectedHackathon] = useState(() => {
    if (selectedHackathonId && Array.isArray(hackathons)) {
      return hackathons.find(h => String(h._id || h.id) === String(selectedHackathonId)) || null;
    }
    return null;
  });

  useEffect(() => {
    if (selectedHackathonId && Array.isArray(hackathons)) {
      const found = hackathons.find(h => String(h._id || h.id) === String(selectedHackathonId));
      if (found) setSelectedHackathon(found);
    }
  }, [selectedHackathonId, hackathons]);

  const handleSelectHackathon = (item) => {
    setSelectedHackathon(item);
    if (onSelectHackathon) {
      onSelectHackathon(item);
    }
  };

  const [squadUpHackathon, setSquadUpHackathon] = useState(null);
  const [selectedTeamDetails, setSelectedTeamDetails] = useState(null);
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);

  const toggleTrack = (trackKey) => {
    setActiveTracks(prev => 
      prev.includes(trackKey) ? prev.filter(t => t !== trackKey) : [...prev, trackKey]
    );
  };

  // Suggestions for autocomplete filtering
  const stateSuggestions = useMemo(() => {
    if (!stateInput.trim()) return ALL_INDIAN_STATES;
    const q = stateInput.toLowerCase().trim();
    const starts = ALL_INDIAN_STATES.filter(s => s.toLowerCase().startsWith(q));
    const contains = ALL_INDIAN_STATES.filter(s => !s.toLowerCase().startsWith(q) && s.toLowerCase().includes(q));
    if (q.length === 1) return starts.length > 0 ? starts : contains;
    return [...starts, ...contains];
  }, [stateInput]);

  const districtSuggestions = useMemo(() => {
    if (!districtInput.trim()) return ALL_DISTRICTS;
    const q = districtInput.toLowerCase().trim();
    const starts = ALL_DISTRICTS.filter(d => d.toLowerCase().startsWith(q));
    const contains = ALL_DISTRICTS.filter(d => !d.toLowerCase().startsWith(q) && d.toLowerCase().includes(q));
    if (q.length === 1) return starts.length > 0 ? starts : contains;
    return [...starts, ...contains];
  }, [districtInput]);

  const handleResetFilters = () => {
    setSearchQuery('');
    setStatusTab('all');
    setActiveMode('all');
    setActiveTracks([]);
    setSortBy('date');
    setSelectedState('');
    setStateInput('');
    setSelectedDistrict('');
    setDistrictInput('');
    setDateFilterMode('all');
    setSelectedDate('');
  };

  const hasActiveFilters =
    searchQuery.trim() ||
    statusTab !== 'all' ||
    activeMode !== 'all' ||
    activeTracks.length > 0 ||
    sortBy !== 'date' ||
    selectedState ||
    selectedDistrict ||
    dateFilterMode !== 'all' ||
    selectedDate;

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

      // Search query (including title, subtitle, location, state, district, circuitId, simpleId)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = h.title?.toLowerCase().includes(q);
        const matchesSub = h.subtitle?.toLowerCase().includes(q);
        const matchesLoc = h.location?.toLowerCase().includes(q);
        const matchesState = h.state?.toLowerCase().includes(q);
        const matchesDistrict = h.district?.toLowerCase().includes(q);
        const matchesTracks = h.trackLabels?.some(tl => tl.toLowerCase().includes(q));
        const matchesCircuit = h.circuitId?.toLowerCase().includes(q);
        const matchesSimpleId = h.simpleId?.toLowerCase().includes(q);
        if (
          !matchesTitle &&
          !matchesSub &&
          !matchesLoc &&
          !matchesState &&
          !matchesDistrict &&
          !matchesTracks &&
          !matchesCircuit &&
          !matchesSimpleId
        ) {
          return false;
        }
      }

      // State filter
      if (selectedState) {
        const qState = selectedState.toLowerCase();
        const matchesSt = h.state?.toLowerCase().includes(qState) || h.location?.toLowerCase().includes(qState);
        if (!matchesSt) return false;
      }

      // District filter
      if (selectedDistrict) {
        const qDist = selectedDistrict.toLowerCase();
        const matchesDist = h.district?.toLowerCase().includes(qDist) || h.location?.toLowerCase().includes(qDist);
        if (!matchesDist) return false;
      }

      // Date Classification filter (All / This Month / Upcoming)
      if (dateFilterMode !== 'all') {
        const category = classifyHackathonDate(h);
        if (dateFilterMode === 'this-month' && category !== 'this-month') return false;
        if (dateFilterMode === 'upcoming' && category !== 'upcoming') return false;
      }

      // Date Picker filter (Only hackathons on or after selected date)
      if (selectedDate) {
        const filterDateMs = new Date(selectedDate).getTime();
        const isoDates = [h.endDateRaw, h.startDateRaw, h.regDeadlineDate].filter(Boolean);
        let hasDateMatch = false;
        for (const iso of isoDates) {
          const d = new Date(iso).getTime();
          if (!isNaN(d) && d >= filterDateMs) {
            hasDateMatch = true;
            break;
          }
        }
        if (!hasDateMatch && isoDates.length > 0) return false;
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
  }, [
    hackathons,
    flagship,
    searchQuery,
    statusTab,
    activeMode,
    activeTracks,
    sortBy,
    selectedState,
    selectedDistrict,
    dateFilterMode,
    selectedDate
  ]);

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
          onOpenDetails={(h) => handleSelectHackathon(h)}
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

        {/* Row 3: Date Classification & State / District Autocomplete Deck */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pt-3 border-t border-surface-container-high/60 text-xs">
          {/* Left: Date Category & Native Min-Date Picker */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-outline mr-0.5 flex items-center gap-1">
              <span className="material-symbols-outlined text-xs text-secondary">calendar_today</span>
              <span>Date:</span>
            </span>

            {/* Date classification pills */}
            <div className="inline-flex items-center gap-1 p-0.5 bg-surface-container-low rounded-xl">
              {[
                { id: 'all', label: 'All Dates' },
                { id: 'this-month', label: '● This Month (Ongoing)' },
                { id: 'upcoming', label: 'Upcoming (Next Months)' },
              ].map((df) => (
                <button
                  key={df.id}
                  type="button"
                  onClick={() => setDateFilterMode(df.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    dateFilterMode === df.id
                      ? 'bg-surface-container-lowest text-secondary shadow-xs'
                      : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  {df.label}
                </button>
              ))}
            </div>

            {/* Date picker: Past dates in month cannot be selected (min={todayFormatted}) */}
            <div className="relative flex items-center">
              <input
                type="date"
                min={todayFormatted}
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                title="Filter by date (past dates are disabled)"
                className="bg-surface-container-low border border-surface-container-high/80 rounded-xl px-2.5 py-1 text-xs font-bold text-on-surface outline-none focus:border-secondary cursor-pointer"
              />
              {selectedDate && (
                <button
                  type="button"
                  onClick={() => setSelectedDate('')}
                  title="Clear Date"
                  className="ml-1 text-on-surface-variant hover:text-on-surface cursor-pointer"
                >
                  <span className="material-symbols-outlined text-xs">cancel</span>
                </button>
              )}
            </div>
          </div>

          {/* Right: State & District Autocomplete Search */}
          <div className="flex flex-wrap items-center gap-2">
            {/* State Search Autocomplete */}
            <div className="relative">
              <div className="flex items-center gap-1 bg-surface-container-low border border-surface-container-high/80 rounded-xl px-2.5 py-1 text-xs focus-within:border-secondary">
                <span className="material-symbols-outlined text-sm text-secondary">map</span>
                <input
                  type="text"
                  placeholder="State (e.g. 'A', 'K')..."
                  value={selectedState || stateInput}
                  onChange={(e) => {
                    setSelectedState('');
                    setStateInput(e.target.value);
                    setIsStateDropdownOpen(true);
                  }}
                  onFocus={() => setIsStateDropdownOpen(true)}
                  className="bg-transparent outline-none text-xs text-on-surface placeholder:text-on-surface-variant w-28 sm:w-36 font-semibold"
                />
                {(selectedState || stateInput) && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedState('');
                      setStateInput('');
                      setIsStateDropdownOpen(false);
                    }}
                    className="text-on-surface-variant hover:text-on-surface cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-xs">close</span>
                  </button>
                )}
              </div>

              {/* Suggestions Dropdown */}
              {isStateDropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-20"
                    onClick={() => setIsStateDropdownOpen(false)}
                  />
                  <div className="absolute right-0 sm:left-0 top-full mt-1 w-52 max-h-56 overflow-y-auto bg-surface-container-lowest border border-surface-container-high rounded-xl shadow-xl z-30 p-1 space-y-0.5">
                    <div className="px-2 py-1 text-[10px] font-bold text-outline uppercase">
                      Suggested States ({stateSuggestions.length})
                    </div>
                    {stateSuggestions.map((st) => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => {
                          setSelectedState(st);
                          setStateInput(st);
                          setIsStateDropdownOpen(false);
                        }}
                        className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors flex items-center justify-between ${
                          selectedState === st
                            ? 'bg-secondary text-on-secondary'
                            : 'text-on-surface hover:bg-surface-container-high'
                        }`}
                      >
                        <span>{st}</span>
                        {selectedState === st && (
                          <span className="material-symbols-outlined text-xs">check</span>
                        )}
                      </button>
                    ))}
                    {stateSuggestions.length === 0 && (
                      <div className="px-2 py-2 text-center text-xs text-on-surface-variant">
                        No state matching '{stateInput}'
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* District Search Autocomplete */}
            <div className="relative">
              <div className="flex items-center gap-1 bg-surface-container-low border border-surface-container-high/80 rounded-xl px-2.5 py-1 text-xs focus-within:border-secondary">
                <span className="material-symbols-outlined text-sm text-amber-400">location_city</span>
                <input
                  type="text"
                  placeholder="District (e.g. 'B', 'M')..."
                  value={selectedDistrict || districtInput}
                  onChange={(e) => {
                    setSelectedDistrict('');
                    setDistrictInput(e.target.value);
                    setIsDistrictDropdownOpen(true);
                  }}
                  onFocus={() => setIsDistrictDropdownOpen(true)}
                  className="bg-transparent outline-none text-xs text-on-surface placeholder:text-on-surface-variant w-28 sm:w-36 font-semibold"
                />
                {(selectedDistrict || districtInput) && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedDistrict('');
                      setDistrictInput('');
                      setIsDistrictDropdownOpen(false);
                    }}
                    className="text-on-surface-variant hover:text-on-surface cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-xs">close</span>
                  </button>
                )}
              </div>

              {/* Suggestions Dropdown */}
              {isDistrictDropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-20"
                    onClick={() => setIsDistrictDropdownOpen(false)}
                  />
                  <div className="absolute right-0 top-full mt-1 w-56 max-h-56 overflow-y-auto bg-surface-container-lowest border border-surface-container-high rounded-xl shadow-xl z-30 p-1 space-y-0.5">
                    <div className="px-2 py-1 text-[10px] font-bold text-outline uppercase">
                      Suggested Districts ({districtSuggestions.length})
                    </div>
                    {districtSuggestions.map((dist) => (
                      <button
                        key={dist}
                        type="button"
                        onClick={() => {
                          setSelectedDistrict(dist);
                          setDistrictInput(dist);
                          setIsDistrictDropdownOpen(false);
                        }}
                        className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors flex items-center justify-between ${
                          selectedDistrict === dist
                            ? 'bg-secondary text-on-secondary'
                            : 'text-on-surface hover:bg-surface-container-high'
                        }`}
                      >
                        <span>{dist}</span>
                        {selectedDistrict === dist && (
                          <span className="material-symbols-outlined text-xs">check</span>
                        )}
                      </button>
                    ))}
                    {districtSuggestions.length === 0 && (
                      <div className="px-2 py-2 text-center text-xs text-on-surface-variant">
                        No district matching '{districtInput}'
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Active Filter Chips Strip */}
        {(selectedState || selectedDistrict || selectedDate || dateFilterMode !== 'all') && (
          <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-surface-container-high/40 text-xs">
            <span className="text-[10px] uppercase font-bold text-outline mr-1">Active Filters:</span>
            {selectedState && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-secondary/15 text-secondary border border-secondary/30 font-bold text-[11px]">
                State: {selectedState}
                <button
                  type="button"
                  onClick={() => { setSelectedState(''); setStateInput(''); }}
                  className="hover:text-white cursor-pointer ml-0.5"
                >
                  ×
                </button>
              </span>
            )}
            {selectedDistrict && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 font-bold text-[11px]">
                District: {selectedDistrict}
                <button
                  type="button"
                  onClick={() => { setSelectedDistrict(''); setDistrictInput(''); }}
                  className="hover:text-white cursor-pointer ml-0.5"
                >
                  ×
                </button>
              </span>
            )}
            {dateFilterMode !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-500/15 text-blue-300 border border-blue-500/30 font-bold text-[11px]">
                {dateFilterMode === 'this-month' ? 'This Month (Ongoing)' : 'Upcoming Months'}
                <button
                  type="button"
                  onClick={() => setDateFilterMode('all')}
                  className="hover:text-white cursor-pointer ml-0.5"
                >
                  ×
                </button>
              </span>
            )}
            {selectedDate && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-bold text-[11px]">
                From: {selectedDate}
                <button
                  type="button"
                  onClick={() => setSelectedDate('')}
                  className="hover:text-white cursor-pointer ml-0.5"
                >
                  ×
                </button>
              </span>
            )}
          </div>
        )}
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
                    onSelect={(item) => handleSelectHackathon(item)}
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
                    onSelect={(item) => handleSelectHackathon(item)}
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
                    onSelect={(item) => handleSelectHackathon(item)}
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
                    onSelect={(item) => handleSelectHackathon(item)}
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
        onClose={() => {
          setSelectedHackathon(null);
          if (onCloseDetails) onCloseDetails();
        }}
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
