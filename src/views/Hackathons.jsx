import { useState, useMemo } from 'react';
import HackathonCard from '../components/hackathons/HackathonCard';
import HackathonDetailsModal from '../components/hackathons/HackathonDetailsModal';
import HackathonSquadUpModal from '../components/hackathons/HackathonSquadUpModal';
import SubmitHackathonModal from '../components/hackathons/SubmitHackathonModal';
import HackathonTeamDetailsModal from '../components/hackathons/HackathonTeamDetailsModal';
import { ALL_INDIAN_STATES, KARNATAKA_DISTRICTS, STATE_DISTRICTS_MAP } from '../constants/geoData';

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
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Current date formatted for min attribute to disable past dates
  const todayFormatted = useMemo(() => {
    const d = new Date();
    const yr = d.getFullYear();
    const mo = String(d.getMonth() + 1).padStart(2, '0');
    const da = String(d.getDate()).padStart(2, '0');
    return `${yr}-${mo}-${da}`;
  }, []);

  // Modals state
  const [modalHackathon, setModalHackathon] = useState(null);

  // Derived selected hackathon (from modal state or route param)
  const selectedHackathon = useMemo(() => {
    if (modalHackathon) return modalHackathon;
    if (selectedHackathonId && Array.isArray(hackathons)) {
      return hackathons.find(h => String(h._id || h.id) === String(selectedHackathonId)) || null;
    }
    return null;
  }, [modalHackathon, selectedHackathonId, hackathons]);

  const handleSelectHackathon = (item) => {
    setModalHackathon(item);
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

  // Available districts strictly determined by selected state!
  const availableDistricts = useMemo(() => {
    if (selectedState && STATE_DISTRICTS_MAP[selectedState]) {
      return STATE_DISTRICTS_MAP[selectedState];
    }
    // Default to Karnataka's official 31 districts
    return KARNATAKA_DISTRICTS;
  }, [selectedState]);

  const stateSuggestions = useMemo(() => {
    if (!stateInput.trim()) return ALL_INDIAN_STATES;
    const q = stateInput.toLowerCase().trim();
    const starts = ALL_INDIAN_STATES.filter(s => s.toLowerCase().startsWith(q));
    const contains = ALL_INDIAN_STATES.filter(s => !s.toLowerCase().startsWith(q) && s.toLowerCase().includes(q));
    if (q.length === 1) return starts.length > 0 ? starts : contains;
    return [...starts, ...contains];
  }, [stateInput]);

  const districtSuggestions = useMemo(() => {
    if (!districtInput.trim()) return availableDistricts;
    const q = districtInput.toLowerCase().trim();
    const starts = availableDistricts.filter(d => d.toLowerCase().startsWith(q));
    const contains = availableDistricts.filter(d => !d.toLowerCase().startsWith(q) && d.toLowerCase().includes(q));
    if (q.length === 1) return starts.length > 0 ? starts : contains;
    return [...starts, ...contains];
  }, [districtInput, availableDistricts]);

  const handleSelectState = (st) => {
    setSelectedState(st);
    setStateInput(st);
    setIsStateDropdownOpen(false);
    // If the currently selected district is not in the new state, reset it
    const validDistricts = STATE_DISTRICTS_MAP[st] || KARNATAKA_DISTRICTS;
    if (selectedDistrict && !validDistricts.includes(selectedDistrict)) {
      setSelectedDistrict('');
      setDistrictInput('');
    }
  };

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

  // Point 12: Deduplicate listings and filter out placeholder events
  const deduplicatedHackathons = useMemo(() => {
    if (!Array.isArray(hackathons)) return [];
    const seen = new Set();
    const result = [];
    for (const h of hackathons) {
      if (!h) continue;
      const rawTitle = String(h.title || '').trim();
      const lower = rawTitle.toLowerCase();
      // Filter out placeholders
      if (
        !rawTitle ||
        lower === 'placeholder' ||
        lower.includes('sample hackathon') ||
        lower.includes('test hackathon') ||
        lower.includes('sample event') ||
        lower.includes('lorem ipsum')
      ) {
        continue;
      }
      // Deduplicate by normalized key
      const key = (h.slug || h.simpleId || h.officialRegistrationLink || h.registrationLink || rawTitle)
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '');
      if (seen.has(key)) continue;
      seen.add(key);
      result.push(h);
    }
    return result;
  }, [hackathons]);

  const isHackathonUpcoming = (h) => {
    return h.status === 'upcoming' || classifyHackathonDate(h) === 'upcoming';
  };

  // Overall Counts for Status Tabs matching all lifecycle states (Point 12: fix Upcoming 0)
  const tabCounts = useMemo(() => {
    return {
      all: deduplicatedHackathons.length,
      open: deduplicatedHackathons.filter(h => h.status === 'open' || !h.status).length,
      'closing-soon': deduplicatedHackathons.filter(h => h.status === 'closing-soon').length,
      upcoming: deduplicatedHackathons.filter(isHackathonUpcoming).length,
      closed: deduplicatedHackathons.filter(h => h.status === 'closed' || h.status === 'finished').length,
      'team-full': deduplicatedHackathons.filter(h => h.status === 'team-full').length
    };
  }, [deduplicatedHackathons]);

  // Filtered Hackathons
  const filteredHackathons = useMemo(() => {
    return deduplicatedHackathons.filter(h => {

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

      // Status Tab filter for lifecycle states (Point 12: upcoming date classification)
      if (statusTab !== 'all') {
        if (statusTab === 'upcoming' && !isHackathonUpcoming(h)) return false;
        if (statusTab === 'open' && (h.status !== 'open' && h.status)) return false;
        if (statusTab === 'closing-soon' && h.status !== 'closing-soon') return false;
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
    deduplicatedHackathons,
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
      const found = hackathons.find(h => h.title.toLowerCase().includes(hackathonOrTitle.toLowerCase())) || hackathons[0];
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
    <div className="flex flex-col w-full pb-space-xl space-y-5">
      {/* 1. Clean, Minimal Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-on-surface tracking-tight">
          Hackathons
        </h1>
        <p className="text-xs sm:text-sm text-on-surface-variant mt-0.5">
          Explore ongoing and upcoming collegiate hackathons across Karnataka & National tech circuits.
        </p>
      </div>

      {/* 2. Organized & Streamlined Filter Command Deck */}
      <div className="bg-surface-container-lowest rounded-2xl p-3.5 sm:p-4 border border-surface-container-high/80 shadow-xs space-y-3">
        {/* Row 1: Search + Status Tabs + View Toggle */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-base pointer-events-none">
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

          {/* Status Tabs + View Mode Toggle */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 lg:pb-0">
            <div className="flex items-center gap-1 p-1 bg-surface-container-low rounded-xl shrink-0">
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
                      ? 'bg-surface-container-lowest text-on-surface shadow-xs'
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

            <div className="hidden sm:flex items-center gap-1 p-1 bg-surface-container-low rounded-xl shrink-0">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                title="Grid View"
                className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                  viewMode === 'grid'
                    ? 'bg-surface-container-lowest text-secondary shadow-xs'
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
                    ? 'bg-surface-container-lowest text-secondary shadow-xs'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                <span className="material-symbols-outlined text-base">view_list</span>
              </button>
            </div>

            {/* Point 12: Collapsible Advanced Filters Toggle */}
            <button
              type="button"
              onClick={() => setShowAdvancedFilters(prev => !prev)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border shrink-0 ${
                showAdvancedFilters || selectedState || selectedDistrict || selectedDate || activeTracks.length > 0
                  ? 'bg-secondary/15 text-secondary border-secondary/40 shadow-xs'
                  : 'bg-surface-container-low text-on-surface-variant hover:text-on-surface border-surface-container-high/80'
              }`}
            >
              <span className="material-symbols-outlined text-sm">tune</span>
              <span>Advanced Filters</span>
              <span className="material-symbols-outlined text-xs">
                {showAdvancedFilters ? 'expand_less' : 'expand_more'}
              </span>
            </button>
          </div>
        </div>

        {/* Row 2: Advanced Filter Controls Bar (Point 12: Collapsed until needed) */}
        {showAdvancedFilters && (
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2.5 border-t border-surface-container-high/60 animate-fadeIn">
          <div className="flex flex-wrap items-center gap-2">
            {/* Date classification pills */}
            <div className="inline-flex items-center gap-1 p-0.5 bg-surface-container-low rounded-xl">
              {[
                { id: 'all', label: 'All Dates' },
                { id: 'this-month', label: '● This Month' },
                { id: 'upcoming', label: 'Upcoming' },
              ].map((df) => (
                <button
                  key={df.id}
                  type="button"
                  onClick={() => setDateFilterMode(df.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                    dateFilterMode === df.id
                      ? 'bg-surface-container-lowest text-secondary shadow-xs'
                      : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  {df.label}
                </button>
              ))}
            </div>

            {/* Date Picker Input */}
            <div className="relative flex items-center gap-1.5 bg-surface-container-low border border-surface-container-high/80 rounded-xl px-2.5 py-1 text-xs">
              <span className="material-symbols-outlined text-sm text-secondary">event</span>
              <input
                type="date"
                min={todayFormatted}
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                title="Filter by date (past dates in month disabled)"
                className="bg-transparent text-xs font-bold text-on-surface outline-none cursor-pointer"
              />
              {selectedDate && (
                <button
                  type="button"
                  onClick={() => setSelectedDate('')}
                  title="Clear Date"
                  className="text-on-surface-variant hover:text-on-surface cursor-pointer"
                >
                  <span className="material-symbols-outlined text-xs">cancel</span>
                </button>
              )}
            </div>

            {/* State Popover Selector */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setIsStateDropdownOpen(prev => !prev);
                  setIsDistrictDropdownOpen(false);
                }}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                  selectedState
                    ? 'bg-secondary/15 text-secondary border-secondary/40'
                    : 'bg-surface-container-low text-on-surface border-surface-container-high/80 hover:border-secondary/40'
                }`}
              >
                <span className="material-symbols-outlined text-sm text-secondary">map</span>
                <span>{selectedState || 'State'}</span>
                <span className="material-symbols-outlined text-xs text-on-surface-variant">arrow_drop_down</span>
              </button>

              {isStateDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-20" onClick={() => setIsStateDropdownOpen(false)} />
                  <div className="absolute left-0 top-full mt-1.5 w-64 max-h-64 overflow-hidden bg-surface-container-lowest border border-surface-container-high rounded-2xl shadow-xl z-30 flex flex-col p-2">
                    <div className="mb-1">
                      <input
                        type="text"
                        placeholder="Type alphabet (e.g. 'A', 'K')..."
                        value={stateInput}
                        onChange={(e) => setStateInput(e.target.value)}
                        autoFocus
                        className="w-full px-2.5 py-1.5 rounded-lg bg-surface-container-low border border-surface-container-high text-xs font-semibold outline-none focus:border-secondary"
                      />
                    </div>
                    <div className="overflow-y-auto max-h-48 space-y-0.5">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedState('');
                          setStateInput('');
                          setIsStateDropdownOpen(false);
                        }}
                        className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold text-on-surface-variant hover:bg-surface-container-high"
                      >
                        All States
                      </button>
                      {stateSuggestions.map(st => (
                        <button
                          key={st}
                          type="button"
                          onClick={() => handleSelectState(st)}
                          className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center justify-between ${
                            selectedState === st ? 'bg-secondary text-on-secondary' : 'text-on-surface hover:bg-surface-container-high'
                          }`}
                        >
                          <span>{st}</span>
                          {selectedState === st && <span className="material-symbols-outlined text-xs">check</span>}
                        </button>
                      ))}
                      {stateSuggestions.length === 0 && (
                        <div className="px-3 py-2 text-center text-xs text-on-surface-variant">
                          No matching state
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* District Popover Selector */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setIsDistrictDropdownOpen(prev => !prev);
                  setIsStateDropdownOpen(false);
                }}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                  selectedDistrict
                    ? 'bg-amber-500/15 text-amber-300 border-amber-500/40'
                    : 'bg-surface-container-low text-on-surface border-surface-container-high/80 hover:border-amber-400/40'
                }`}
              >
                <span className="material-symbols-outlined text-sm text-amber-400">location_city</span>
                <span>{selectedDistrict || 'District'}</span>
                <span className="material-symbols-outlined text-xs text-on-surface-variant">arrow_drop_down</span>
              </button>

              {isDistrictDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-20" onClick={() => setIsDistrictDropdownOpen(false)} />
                  <div className="absolute left-0 top-full mt-1.5 w-64 max-h-64 overflow-hidden bg-surface-container-lowest border border-surface-container-high rounded-2xl shadow-xl z-30 flex flex-col p-2">
                    <div className="mb-1">
                      <input
                        type="text"
                        placeholder={selectedState ? `Filter ${selectedState} district...` : "Type alphabet (e.g. 'B', 'M')..."}
                        value={districtInput}
                        onChange={(e) => setDistrictInput(e.target.value)}
                        autoFocus
                        className="w-full px-2.5 py-1.5 rounded-lg bg-surface-container-low border border-surface-container-high text-xs font-semibold outline-none focus:border-secondary"
                      />
                    </div>
                    <div className="px-2 py-0.5 text-[10px] font-black uppercase text-outline">
                      {selectedState ? `${selectedState} Districts` : 'Karnataka Districts (31)'}
                    </div>
                    <div className="overflow-y-auto max-h-48 space-y-0.5">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedDistrict('');
                          setDistrictInput('');
                          setIsDistrictDropdownOpen(false);
                        }}
                        className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold text-on-surface-variant hover:bg-surface-container-high"
                      >
                        All Districts
                      </button>
                      {districtSuggestions.map(dist => (
                        <button
                          key={dist}
                          type="button"
                          onClick={() => {
                            setSelectedDistrict(dist);
                            setDistrictInput(dist);
                            setIsDistrictDropdownOpen(false);
                          }}
                          className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center justify-between ${
                            selectedDistrict === dist ? 'bg-secondary text-on-secondary' : 'text-on-surface hover:bg-surface-container-high'
                          }`}
                        >
                          <span>{dist}</span>
                          {selectedDistrict === dist && <span className="material-symbols-outlined text-xs">check</span>}
                        </button>
                      ))}
                      {districtSuggestions.length === 0 && (
                        <div className="px-3 py-2 text-center text-xs text-on-surface-variant">
                          No matching district
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Tracks Pills */}
            <div className="hidden xl:flex items-center gap-1">
              {[
                { id: 'ai', label: 'AI & ML' },
                { id: 'web3', label: 'Web3' },
                { id: 'fintech', label: 'FinTech' },
                { id: 'healthtech', label: 'Health' },
              ].map((track) => {
                const isSelected = activeTracks.includes(track.id);
                return (
                  <button
                    key={track.id}
                    type="button"
                    onClick={() => toggleTrack(track.id)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-secondary text-on-secondary shadow-xs'
                        : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
                    }`}
                  >
                    {track.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right: Format, Sort & Reset */}
          <div className="flex items-center gap-2">
            <select
              value={activeMode}
              onChange={(e) => setActiveMode(e.target.value)}
              className="bg-surface-container-low px-2.5 py-1.5 rounded-xl text-xs font-bold text-on-surface outline-none cursor-pointer border border-surface-container-high/80"
            >
              <option value="all">All Formats</option>
              <option value="online">Online</option>
              <option value="in-person">Offline</option>
              <option value="hybrid">Hybrid</option>
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-surface-container-low px-2.5 py-1.5 rounded-xl text-xs font-bold text-on-surface outline-none cursor-pointer border border-surface-container-high/80"
            >
              <option value="date">Upcoming</option>
              <option value="prize">Highest Prize</option>
            </select>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="text-xs font-bold text-secondary hover:text-primary transition-colors flex items-center gap-0.5 cursor-pointer px-1.5 py-1"
                title="Reset all filters"
              >
                <span className="material-symbols-outlined text-sm">filter_alt_off</span>
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>
        )}

        {/* Row 3: Active Filter Chips Strip */}
        {(selectedState || selectedDistrict || selectedDate || dateFilterMode !== 'all' || activeTracks.length > 0) && (
          <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-surface-container-high/40 text-xs">
            <span className="text-[10px] uppercase font-bold text-outline mr-1">Active:</span>
            {selectedState && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-secondary/15 text-secondary border border-secondary/30 font-bold text-[11px]">
                <span>State: {selectedState}</span>
                <button
                  type="button"
                  onClick={() => { setSelectedState(''); setStateInput(''); }}
                  className="hover:text-white cursor-pointer ml-0.5 font-bold"
                >
                  ×
                </button>
              </span>
            )}
            {selectedDistrict && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 font-bold text-[11px]">
                <span>District: {selectedDistrict}</span>
                <button
                  type="button"
                  onClick={() => { setSelectedDistrict(''); setDistrictInput(''); }}
                  className="hover:text-white cursor-pointer ml-0.5 font-bold"
                >
                  ×
                </button>
              </span>
            )}
            {dateFilterMode !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-500/15 text-blue-300 border border-blue-500/30 font-bold text-[11px]">
                <span>{dateFilterMode === 'this-month' ? 'This Month' : 'Upcoming'}</span>
                <button
                  type="button"
                  onClick={() => setDateFilterMode('all')}
                  className="hover:text-white cursor-pointer ml-0.5 font-bold"
                >
                  ×
                </button>
              </span>
            )}
            {selectedDate && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-bold text-[11px]">
                <span>Date: {selectedDate}</span>
                <button
                  type="button"
                  onClick={() => setSelectedDate('')}
                  className="hover:text-white cursor-pointer ml-0.5 font-bold"
                >
                  ×
                </button>
              </span>
            )}
            {activeTracks.map(t => (
              <span key={t} className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/30 font-bold text-[11px]">
                <span className="capitalize">{t}</span>
                <button
                  type="button"
                  onClick={() => toggleTrack(t)}
                  className="hover:text-white cursor-pointer ml-0.5 font-bold"
                >
                  ×
                </button>
              </span>
            ))}
            <button
              type="button"
              onClick={handleResetFilters}
              className="text-[11px] font-bold text-outline hover:text-secondary underline ml-1 cursor-pointer"
            >
              Clear all
            </button>
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
          setModalHackathon(null);
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
