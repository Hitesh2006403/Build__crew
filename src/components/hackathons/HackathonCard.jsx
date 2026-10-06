// Helper: Check if an admin has uploaded a custom image (excluding repeated/stock Google placeholders)
function getUploadedImage(hackathon) {
  if (!hackathon) return null;
  const candidates = [
    hackathon.image,
    hackathon.coverImage,
    hackathon.heroImage,
    hackathon.banner,
    hackathon.logo,
  ];

  for (const img of candidates) {
    if (typeof img === 'string' && img.trim()) {
      const trimmed = img.trim();
      // Base64 upload from admin
      if (trimmed.startsWith('data:image/')) return trimmed;
      // Filter out repeated Google AIDA default images
      if (trimmed.includes('lh3.googleusercontent.com/aida-public')) continue;
      if (trimmed.includes('aida-public/AB6AXu')) continue;
      // Real custom uploaded / hosted image URL
      if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
        return trimmed;
      }
    }
  }
  return null;
}

// 8 Distinct Curated Abstract Themes for dynamic visual treatment
const ABSTRACT_THEMES = [
  {
    id: 'indigo-flux',
    bg: 'from-slate-950 via-indigo-950 to-slate-900',
    border: 'border-indigo-500/30',
    glow: 'bg-indigo-500/20',
    glow2: 'bg-blue-400/15',
    badgeBg: 'bg-indigo-500/25 text-indigo-200 border-indigo-400/30',
    icon: 'terminal',
    pattern: 'circuit',
  },
  {
    id: 'emerald-matrix',
    bg: 'from-slate-950 via-teal-950 to-emerald-950',
    border: 'border-emerald-500/30',
    glow: 'bg-emerald-500/20',
    glow2: 'bg-teal-400/15',
    badgeBg: 'bg-emerald-500/25 text-emerald-200 border-emerald-400/30',
    icon: 'psychology',
    pattern: 'dots',
  },
  {
    id: 'cosmic-purple',
    bg: 'from-slate-950 via-purple-950 to-fuchsia-950',
    border: 'border-purple-500/30',
    glow: 'bg-purple-500/20',
    glow2: 'bg-fuchsia-400/15',
    badgeBg: 'bg-purple-500/25 text-purple-200 border-purple-400/30',
    icon: 'rocket_launch',
    pattern: 'rings',
  },
  {
    id: 'sunset-amber',
    bg: 'from-stone-950 via-stone-900 to-amber-950',
    border: 'border-amber-500/30',
    glow: 'bg-amber-500/20',
    glow2: 'bg-orange-500/15',
    badgeBg: 'bg-amber-500/25 text-amber-200 border-amber-400/30',
    icon: 'bolt',
    pattern: 'diagonal',
  },
  {
    id: 'ocean-cyan',
    bg: 'from-slate-950 via-sky-950 to-blue-950',
    border: 'border-cyan-500/30',
    glow: 'bg-cyan-500/20',
    glow2: 'bg-blue-500/15',
    badgeBg: 'bg-cyan-500/25 text-cyan-200 border-cyan-400/30',
    icon: 'language',
    pattern: 'grid',
  },
  {
    id: 'crimson-ruby',
    bg: 'from-neutral-950 via-rose-950 to-slate-950',
    border: 'border-rose-500/30',
    glow: 'bg-rose-500/20',
    glow2: 'bg-red-400/15',
    badgeBg: 'bg-rose-500/25 text-rose-200 border-rose-400/30',
    icon: 'memory',
    pattern: 'circuit',
  },
  {
    id: 'dark-obsidian',
    bg: 'from-zinc-950 via-slate-900 to-zinc-900',
    border: 'border-slate-500/30',
    glow: 'bg-blue-400/15',
    glow2: 'bg-indigo-500/15',
    badgeBg: 'bg-white/15 text-slate-200 border-white/20',
    icon: 'code',
    pattern: 'dots',
  },
  {
    id: 'violet-aurora',
    bg: 'from-slate-950 via-violet-950 to-indigo-900',
    border: 'border-violet-500/30',
    glow: 'bg-violet-500/20',
    glow2: 'bg-indigo-400/15',
    badgeBg: 'bg-violet-500/25 text-violet-200 border-violet-400/30',
    icon: 'hub',
    pattern: 'rings',
  },
];

// Compute deterministic theme from hackathon identity
function getHackathonTheme(hackathon) {
  const seedStr = String(hackathon._id || hackathon.id || hackathon.title || 'hackathon');
  let hash = 0;
  for (let i = 0; i < seedStr.length; i++) {
    hash = (hash << 5) - hash + seedStr.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % ABSTRACT_THEMES.length;
  return ABSTRACT_THEMES[index];
}

// Extract top 1 or 2 tracks/categories
function getTopTracks(hackathon) {
  const rawList = Array.isArray(hackathon.trackLabels) && hackathon.trackLabels.length > 0
    ? hackathon.trackLabels
    : Array.isArray(hackathon.tracks) && hackathon.tracks.length > 0
      ? hackathon.tracks
      : [];
  return rawList
    .map(t => typeof t === 'string' ? t.trim() : '')
    .filter(Boolean)
    .slice(0, 2);
}

// Select matching Category icon
function getCategoryIcon(hackathon, defaultIcon) {
  const text = `${hackathon.title || ''} ${(hackathon.trackLabels || []).join(' ')} ${(hackathon.tracks || []).join(' ')}`.toLowerCase();
  if (text.includes('ai') || text.includes('machine learning') || text.includes('neural')) return 'psychology';
  if (text.includes('web') || text.includes('fullstack') || text.includes('frontend')) return 'language';
  if (text.includes('cyber') || text.includes('security') || text.includes('bug')) return 'security';
  if (text.includes('mobile') || text.includes('android') || text.includes('ios')) return 'smartphone';
  if (text.includes('iot') || text.includes('hardware') || text.includes('robot')) return 'memory';
  if (text.includes('cloud') || text.includes('devops') || text.includes('scale')) return 'cloud';
  if (text.includes('data') || text.includes('analytics')) return 'analytics';
  if (text.includes('game') || text.includes('gaming')) return 'sports_esports';
  if (text.includes('health') || text.includes('bio')) return 'cardiology';
  return defaultIcon || 'terminal';
}

// Clean abstract SVG background patterns
function AbstractPattern({ pattern }) {
  if (pattern === 'circuit') {
    return (
      <svg className="absolute inset-0 w-full h-full opacity-15 pointer-events-none" viewBox="0 0 400 200" fill="none" stroke="currentColor">
        <path d="M-20 40 H120 L150 70 H300 L330 40 H450" strokeWidth="1.5" strokeDasharray="4 4" />
        <path d="M0 160 H80 L110 130 H240 L270 160 H420" strokeWidth="1.5" />
        <circle cx="150" cy="70" r="3.5" fill="currentColor" />
        <circle cx="270" cy="160" r="3.5" fill="currentColor" />
        <circle cx="80" cy="160" r="2.5" fill="currentColor" />
        <circle cx="300" cy="70" r="2.5" fill="currentColor" />
      </svg>
    );
  }
  if (pattern === 'dots') {
    return (
      <div className="absolute inset-0 opacity-15 pointer-events-none bg-[radial-gradient(#ffffff_1.5px,transparent_1.5px)] [background-size:16px_16px]" />
    );
  }
  if (pattern === 'rings') {
    return (
      <svg className="absolute -top-10 -right-10 w-60 h-60 opacity-20 pointer-events-none" viewBox="0 0 200 200" fill="none" stroke="currentColor">
        <circle cx="100" cy="100" r="35" strokeWidth="1" strokeDasharray="3 3" />
        <circle cx="100" cy="100" r="60" strokeWidth="1.2" />
        <circle cx="100" cy="100" r="85" strokeWidth="1" strokeDasharray="6 4" />
        <circle cx="100" cy="100" r="110" strokeWidth="1.5" />
      </svg>
    );
  }
  if (pattern === 'grid') {
    return (
      <div className="absolute inset-0 opacity-10 pointer-events-none bg-[linear-gradient(to_right,#ffffff15_1px,transparent_1px),linear-gradient(to_bottom,#ffffff15_1px,transparent_1px)] bg-[size:24px_24px]" />
    );
  }
  // diagonal pattern
  return (
    <div className="absolute inset-0 opacity-10 pointer-events-none bg-[repeating-linear-gradient(45deg,#ffffff,#ffffff_1px,transparent_1px,transparent_14px)]" />
  );
}

export default function HackathonCard({
  hackathon,
  viewMode = 'grid',
  onSelect,
  onFindSquad
}) {
  const isConcluded = hackathon.status === 'closed' || hackathon.status === 'finished';
  const isClosingSoon = hackathon.status === 'closing-soon';
  const isUpcoming = hackathon.status === 'upcoming';
  const isTeamFull = hackathon.status === 'team-full';

  // Extract visual data
  const uploadedImage = getUploadedImage(hackathon);
  const theme = getHackathonTheme(hackathon);
  const topTracks = getTopTracks(hackathon);
  const categoryIcon = getCategoryIcon(hackathon, theme.icon);

  // Status Badge Configuration
  const getStatusBadge = () => {
    if (isClosingSoon) {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1.5 shadow-xs shrink-0">
          <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping"></span>
          <span>{hackathon.statusLabel || 'Closing soon'}</span>
        </span>
      );
    }
    if (isTeamFull) {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-purple-100 text-purple-900 border border-purple-300 flex items-center gap-1.5 shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-purple-600"></span>
          <span>{hackathon.statusLabel || 'Team full'}</span>
        </span>
      );
    }
    if (isUpcoming) {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-blue-100 text-blue-900 border border-blue-300 flex items-center gap-1.5 shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
          <span>{hackathon.statusLabel || 'Upcoming'}</span>
        </span>
      );
    }
    if (isConcluded) {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-surface-container text-on-surface-variant border border-surface-container-high flex items-center gap-1.5 shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-outline"></span>
          <span>{hackathon.statusLabel || 'Registration closed'}</span>
        </span>
      );
    }
    // Default: Registration open
    return (
      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-emerald-100 text-emerald-900 border border-emerald-300 flex items-center gap-1.5 shadow-xs shrink-0">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
        <span>{hackathon.statusLabel || 'Registration open'}</span>
      </span>
    );
  };

  const orgName = typeof hackathon.organizer === 'object' ? hackathon.organizer?.name : hackathon.organizer || 'Collegiate Host';
  const regLink =
    hackathon.officialRegistrationLink ||
    hackathon.registrationLink ||
    hackathon.officialWebsite ||
    (typeof hackathon.organizer === 'object' ? hackathon.organizer?.website : '') ||
    '';

  // ========================================================
  // LIST VIEW
  // ========================================================
  if (viewMode === 'list') {
    return (
      <div 
        onClick={() => onSelect(hackathon)}
        className="group bg-surface-container-lowest hover:bg-surface-container-low/80 rounded-2xl p-4 sm:p-5 border border-surface-container-high/70 hover:border-secondary/40 shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4"
      >
        {/* Left: Branding & Circuit Badge */}
        <div className="flex items-center gap-3.5 min-w-[260px]">
          <div className={`w-12 h-12 rounded-2xl p-1 flex items-center justify-center shrink-0 border border-surface-container-high overflow-hidden shadow-xs ${
            uploadedImage ? 'bg-surface-container-low' : `bg-gradient-to-br ${theme.bg} text-white`
          } ${isConcluded ? 'grayscale opacity-75' : ''}`}>
            {uploadedImage ? (
              <img src={uploadedImage} alt={hackathon.title} className="w-full h-full object-cover rounded-xl" />
            ) : (
              <span className="material-symbols-outlined text-2xl">
                {categoryIcon}
              </span>
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-title-md font-extrabold text-on-surface group-hover:text-secondary transition-colors">
                {hackathon.title}
              </h4>
              <span className="material-symbols-outlined text-base text-secondary" title="Sanctioned Circuit Event">
                verified
              </span>
            </div>
            <p className="text-xs text-on-surface-variant font-medium mt-0.5">
              {orgName} · {hackathon.mode}
            </p>
          </div>
        </div>

        {/* Center: Specs Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-on-surface-variant">
          <div>
            <span className="text-[10px] uppercase font-bold text-outline block">Dates</span>
            <span className="font-bold text-on-surface">{hackathon.dates}</span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-outline block">Deadline</span>
            <span className="font-bold text-amber-800 truncate block">{hackathon.registrationDeadline || 'TBD'}</span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-outline block">Prize Pool</span>
            <span className="font-extrabold text-amber-900">{hackathon.prizePool ? String(hackathon.prizePool).replace(/\$/g, '₹') : ''}</span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-outline block">Team Size</span>
            <span className="font-bold text-on-surface">{hackathon.squadLimits || hackathon.teamSize || '2–4'}</span>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center justify-between md:justify-end gap-2 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-surface-container-high/60" onClick={(e) => e.stopPropagation()}>
          {getStatusBadge()}

          <button
            type="button"
            onClick={() => onSelect(hackathon)}
            className="px-3 py-1.5 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-bold transition-all cursor-pointer"
          >
            View Details
          </button>

          {!isConcluded && (
            <button
              type="button"
              onClick={() => onFindSquad(hackathon)}
              className="px-3.5 py-1.5 rounded-xl bg-primary hover:bg-surface-tint text-on-primary text-xs font-bold shadow-xs transition-all cursor-pointer flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-sm">groups</span>
              <span>Build a Team</span>
            </button>
          )}

          {regLink && regLink !== '#' && (
            <a
              href={regLink}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white text-xs font-bold shadow-xs transition-all inline-flex items-center gap-1.5 shrink-0"
              title="Open Official Registration Website"
            >
              <span>Register</span>
              <span className="material-symbols-outlined text-sm">open_in_new</span>
            </a>
          )}
        </div>
      </div>
    );
  }

  // ========================================================
  // GRID VIEW (Default)
  // ========================================================
  return (
    <div 
      className={`group bg-surface-container-lowest rounded-3xl p-5 sm:p-6 border border-surface-container-high/80 hover:border-secondary/40 shadow-xs hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between ${
        isConcluded ? 'opacity-85' : ''
      }`}
    >
      <div>
        {/* Visual / Header Area: Dynamic Title Card OR Uploaded Image */}
        {uploadedImage ? (
          <div 
            onClick={() => onSelect(hackathon)}
            className="group/img relative w-full h-52 sm:h-56 rounded-2xl overflow-hidden mb-4 border border-surface-container-high/80 group-hover:border-secondary/40 shadow-xs transition-all duration-300 cursor-pointer flex flex-col justify-between p-4"
          >
            <img 
              src={uploadedImage} 
              alt={hackathon.title} 
              className="absolute inset-0 w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-500" 
            />
            {/* Scrim overlay for crisp readability */}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-slate-950/60 to-slate-950/40" />

            {/* Top row: Circuit / Mode & Status Badge */}
            <div className="relative z-10 flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-full bg-black/60 text-white text-[11px] font-extrabold uppercase tracking-wide border border-white/20 backdrop-blur-md flex items-center gap-1">
                  <span className="material-symbols-outlined text-xs text-amber-300">verified</span>
                  <span>{hackathon.circuitId || 'CIRCUIT'}</span>
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-white/20 text-white text-[11px] font-semibold border border-white/20 backdrop-blur-md capitalize">
                  {hackathon.mode || 'Hybrid'}
                </span>
              </div>
              {getStatusBadge()}
            </div>

            {/* Bottom: Tracks, Title, Organizer & Date */}
            <div className="relative z-10 space-y-1.5">
              <div className="flex flex-wrap items-center justify-between gap-1.5">
                {topTracks.length > 0 && (
                  <div className="flex items-center gap-1 flex-wrap">
                    {topTracks.map((tr, idx) => (
                      <span key={idx} className="px-2 py-0.5 rounded-md bg-white/20 text-white text-[10px] font-bold uppercase tracking-wider border border-white/25 backdrop-blur-xs">
                        {tr}
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex items-center gap-1 text-[11px] font-bold text-amber-300 bg-black/70 px-2 py-0.5 rounded-md border border-white/15 ml-auto">
                  <span className="material-symbols-outlined text-xs">event</span>
                  <span className="truncate">{hackathon.dates || 'Upcoming 2026'}</span>
                </div>
              </div>

              <h3 
                className="text-lg sm:text-xl font-black text-white tracking-tight leading-snug drop-shadow-sm group-hover:text-blue-200 transition-colors line-clamp-2"
                title={hackathon.title}
              >
                {hackathon.title}
              </h3>

              <p className="text-xs font-semibold text-slate-300 truncate flex items-center gap-1">
                <span className="material-symbols-outlined text-[13px] text-slate-400">account_balance</span>
                <span>{orgName}</span>
              </p>
            </div>
          </div>
        ) : (
          /* Dynamic Hackathon Title Card with clean abstract visual treatment */
          <div 
            onClick={() => onSelect(hackathon)}
            className={`relative w-full min-h-[195px] sm:min-h-[205px] rounded-2xl overflow-hidden mb-4 p-4 sm:p-4.5 bg-gradient-to-br ${theme.bg} text-white border ${theme.border} shadow-sm group-hover:shadow-md group-hover:border-secondary/50 transition-all duration-300 cursor-pointer flex flex-col justify-between`}
          >
            {/* Ambient decorative glowing light orbs */}
            <div className={`absolute -top-12 -right-12 w-44 h-44 rounded-full ${theme.glow} blur-3xl pointer-events-none`} />
            <div className={`absolute -bottom-10 -left-10 w-36 h-36 rounded-full ${theme.glow2} blur-2xl pointer-events-none`} />

            {/* Abstract visual background pattern */}
            <AbstractPattern pattern={theme.pattern} />

            {/* Top row: Circuit ID, Mode & Status Badge */}
            <div className="relative z-10 flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-full bg-white/10 text-white text-[11px] font-extrabold uppercase tracking-wide border border-white/15 backdrop-blur-md flex items-center gap-1">
                  <span className="material-symbols-outlined text-xs text-amber-300">verified</span>
                  <span>{hackathon.circuitId || 'CIRCUIT'}</span>
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-white/10 text-white text-[11px] font-semibold border border-white/15 backdrop-blur-md capitalize flex items-center gap-1">
                  <span className="material-symbols-outlined text-xs">
                    {hackathon.mode?.toLowerCase() === 'online' ? 'wifi' : hackathon.mode?.toLowerCase() === 'offline' ? 'location_on' : 'devices'}
                  </span>
                  <span>{hackathon.mode || 'Hybrid'}</span>
                </span>
              </div>
              {getStatusBadge()}
            </div>

            {/* Middle: Prominent Hackathon Title & Organizer */}
            <div className="relative z-10 my-2.5">
              <div className="flex items-start gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-white/10 border border-white/20 backdrop-blur-md flex items-center justify-center shrink-0 shadow-xs mt-0.5">
                  <span className="material-symbols-outlined text-lg text-white">
                    {categoryIcon}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <h3 
                    className="text-lg sm:text-xl font-black text-white tracking-tight leading-snug drop-shadow-xs group-hover:text-blue-100 transition-colors line-clamp-2"
                    title={hackathon.title}
                  >
                    {hackathon.title}
                  </h3>
                  <p className="text-xs font-medium text-slate-300/90 truncate flex items-center gap-1 mt-0.5">
                    <span className="material-symbols-outlined text-[13px] text-slate-400">account_balance</span>
                    <span>{orgName}</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Bottom row: Tracks (1 or 2) & Event Date */}
            <div className="relative z-10 flex flex-wrap items-center justify-between gap-1.5 pt-2 border-t border-white/10">
              <div className="flex items-center gap-1 flex-wrap">
                {topTracks.length > 0 ? (
                  topTracks.map((tr, idx) => (
                    <span 
                      key={idx} 
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border backdrop-blur-xs ${theme.badgeBg}`}
                    >
                      {tr}
                    </span>
                  ))
                ) : (
                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border backdrop-blur-xs ${theme.badgeBg}`}>
                    General Sprint
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1 text-[11px] font-bold text-amber-200 bg-white/10 px-2.5 py-0.5 rounded-md border border-white/15 backdrop-blur-xs ml-auto">
                <span className="material-symbols-outlined text-xs text-amber-300">event</span>
                <span className="truncate">{hackathon.dates || 'Upcoming 2026'}</span>
              </div>
            </div>
          </div>
        )}

        {/* Description snippet */}
        {hackathon.description && (
          <p className="text-xs text-on-surface-variant/90 leading-relaxed mb-3.5 line-clamp-2">
            {hackathon.description}
          </p>
        )}

        {/* Core Info Bento Box (Dates, Deadline, Team Size, Fee, Prize, Eligibility) */}
        <div className="grid grid-cols-2 gap-2 p-3 rounded-2xl bg-surface-container-low/80 border border-surface-container-high/60 mb-3.5 text-xs">
          {/* When does it happen? */}
          <div className="flex items-center gap-2 text-on-surface min-w-0">
            <span className="w-6 h-6 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-sm">calendar_month</span>
            </span>
            <div className="min-w-0">
              <span className="text-[10px] uppercase font-bold text-outline block leading-none">Dates</span>
              <span className="font-bold text-xs text-on-surface truncate block mt-0.5">{hackathon.dates}</span>
            </div>
          </div>

          {/* When is the deadline? */}
          <div className="flex items-center gap-2 text-on-surface min-w-0">
            <span className="w-6 h-6 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-sm">alarm</span>
            </span>
            <div className="min-w-0">
              <span className="text-[10px] uppercase font-bold text-amber-800 block leading-none">Deadline</span>
              <span className="font-bold text-xs text-amber-900 truncate block mt-0.5">{hackathon.registrationDeadline || 'TBD'}</span>
            </div>
          </div>

          {/* What is the team size? */}
          <div className="flex items-center gap-2 text-on-surface min-w-0">
            <span className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-sm">groups</span>
            </span>
            <div className="min-w-0">
              <span className="text-[10px] uppercase font-bold text-outline block leading-none">Team Size</span>
              <span className="font-bold text-xs text-on-surface truncate block mt-0.5">{hackathon.squadLimits || hackathon.teamSize || '2 to 4'}</span>
            </div>
          </div>

          {/* Is there a fee? */}
          <div className="flex items-center gap-2 text-on-surface min-w-0">
            <span className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-sm">payments</span>
            </span>
            <div className="min-w-0">
              <span className="text-[10px] uppercase font-bold text-outline block leading-none">Entry Fee</span>
              <span className="font-bold text-xs text-on-surface truncate block mt-0.5">{hackathon.registrationFee ? String(hackathon.registrationFee).replace(/\$0/g, '₹0').replace(/\$/g, '₹') : 'Free (₹0)'}</span>
            </div>
          </div>

          {/* What is the prize? */}
          <div className="flex items-center gap-2 text-on-surface min-w-0 col-span-2 pt-1 border-t border-surface-container-high/40">
            <span className="w-6 h-6 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-sm">military_tech</span>
            </span>
            <div className="flex items-center justify-between w-full">
              <span className="text-[10px] uppercase font-bold text-amber-800/80 leading-none">Prize Pool:</span>
              <span className="font-black text-xs text-amber-900">{hackathon.prizePool ? String(hackathon.prizePool).replace(/\$/g, '₹') : ''}</span>
            </div>
          </div>
        </div>

        {/* Tracks (What are the tracks?) */}
        <div className="flex flex-wrap items-center gap-1.5 mb-3.5">
          {hackathon.trackLabels?.slice(0, 3).map((track, idx) => (
            <span
              key={idx}
              className="px-2.5 py-0.5 rounded-full bg-surface-container text-on-surface text-[11px] font-semibold border border-surface-container-high/60"
            >
              {track}
            </span>
          ))}
          {hackathon.trackLabels && hackathon.trackLabels.length > 3 && (
            <span className="px-2 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant text-[11px] font-bold">
              +{hackathon.trackLabels.length - 3} more
            </span>
          )}
        </div>
      </div>

      {/* Card Action Controls: View Details, Build a Team, Official Registration */}
      <div className="pt-3 border-t border-surface-container-high/70 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => onSelect(hackathon)}
          className="flex-1 min-w-[90px] py-2 px-3 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface font-bold text-xs transition-all cursor-pointer text-center"
        >
          View Details
        </button>

        {!isConcluded && (
          <button
            type="button"
            onClick={() => onFindSquad(hackathon)}
            className="flex-1 min-w-[100px] py-2 px-3 rounded-xl bg-primary hover:bg-surface-tint active:scale-[0.98] text-on-primary font-bold text-xs shadow-xs transition-all cursor-pointer flex items-center justify-center gap-1"
          >
            <span className="material-symbols-outlined text-sm">groups</span>
            <span>Build a Team</span>
          </button>
        )}

        {regLink && regLink !== '#' && (
          <a
            href={regLink}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white text-xs font-extrabold shadow-xs transition-all inline-flex items-center justify-center gap-1.5 shrink-0"
            title="Open Official Registration Website"
          >
            <span>Register</span>
            <span className="material-symbols-outlined text-sm">open_in_new</span>
          </a>
        )}
      </div>
    </div>
  );
}
