export default function HackathonHero({ flagship, onFindSquad, onOpenDetails }) {
  if (!flagship) return null;

  return (
    <div className="relative w-full rounded-2xl overflow-hidden bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white shadow-lg mb-6 border border-indigo-800/40">
      {/* Decorative ambient glowing orbs */}
      <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-blue-500/15 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 -left-16 w-64 h-64 rounded-full bg-indigo-600/20 blur-3xl pointer-events-none" />

      {/* Subtle grid pattern */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:16px_16px]" />

      <div className="relative z-10 p-5 sm:p-6 lg:p-7">
        <div className="flex flex-col space-y-4">
          {/* Badges Strip */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-500/25 border border-blue-400/40 text-blue-200 text-[11px] font-bold tracking-wide uppercase">
              <span className="material-symbols-outlined text-xs text-blue-400">star</span>
              {flagship.badge || 'Featured Flagship'}
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-400/30 text-amber-200 text-[11px] font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              {flagship.statusLabel || 'Registration Open'}
            </span>
          </div>

          {/* Hackathon Name & Short Description */}
          <div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white leading-tight">
              {flagship.title}
            </h2>
            <p className="text-xs sm:text-sm font-semibold text-blue-200 mt-1">
              {flagship.subtitle}
            </p>
          </div>

          {/* Key Specs Bento: Date, Registration deadline, Location, Team size, Registration fee, Prize */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 pt-1">
            <div className="px-3.5 py-2.5 rounded-xl bg-white/[0.07] border border-white/10 backdrop-blur-md">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Date</span>
              <span className="text-xs font-bold text-white block mt-0.5 truncate">{flagship.dates}</span>
            </div>
            <div className="px-3.5 py-2.5 rounded-xl bg-white/[0.07] border border-white/10 backdrop-blur-md">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300 block">Deadline</span>
              <span className="text-xs font-bold text-amber-200 block mt-0.5 truncate">{flagship.registrationDeadline || 'Oct 14'}</span>
            </div>
            <div className="px-3.5 py-2.5 rounded-xl bg-white/[0.07] border border-white/10 backdrop-blur-md">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Location</span>
              <span className="text-xs font-bold text-white block mt-0.5 truncate" title={flagship.location}>
                {flagship.location}
              </span>
            </div>
            <div className="px-3.5 py-2.5 rounded-xl bg-white/[0.07] border border-white/10 backdrop-blur-md">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Team Size</span>
              <span className="text-xs font-bold text-white block mt-0.5 truncate">{flagship.squadLimits || flagship.teamSize || '2–4 Builders'}</span>
            </div>
            <div className="px-3.5 py-2.5 rounded-xl bg-white/[0.07] border border-white/10 backdrop-blur-md">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-300 block">Registration Fee</span>
              <span className="text-xs font-bold text-emerald-200 block mt-0.5 truncate">{flagship.registrationFee ? String(flagship.registrationFee).replace(/\$0/g, '₹0').replace(/\$/g, '₹') : '100% Free'}</span>
            </div>
            <div className="px-3.5 py-2.5 rounded-xl bg-white/[0.07] border border-white/10 backdrop-blur-md">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300 block">Prize</span>
              <span className="text-xs font-black text-amber-300 block mt-0.5 truncate">{flagship.prizePool ? String(flagship.prizePool).replace(/\$/g, '₹') : ''}</span>
            </div>
          </div>

          {/* Primary Action Buttons: View Details, Build a Team, Official Registration */}
          <div className="flex flex-wrap items-center gap-2.5 pt-1">
            <button
              type="button"
              onClick={() => onOpenDetails(flagship)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white font-bold text-xs border border-white/20 backdrop-blur-md active:scale-[0.98] transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-base">info</span>
              <span>View Details</span>
            </button>

            <button
              type="button"
              onClick={() => onFindSquad(flagship.title)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md shadow-blue-600/30 hover:shadow-blue-500/40 active:scale-[0.98] transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-base">groups</span>
              <span>Build a Team</span>
            </button>

            {(flagship.officialRegistrationLink || flagship.registrationLink || flagship.officialWebsite) && (
              <a
                href={flagship.officialRegistrationLink || flagship.registrationLink || flagship.officialWebsite}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs shadow-md border border-emerald-400/40 backdrop-blur-md active:scale-[0.98] transition-all"
              >
                <span>Register on Official Site</span>
                <span className="material-symbols-outlined text-sm">open_in_new</span>
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
