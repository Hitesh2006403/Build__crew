import { useState } from 'react';

export default function HackathonDetailsModal({
  hackathon,
  isOpen,
  onClose,
  onFindSquad
}) {
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'rules' | 'schedule'

  if (!isOpen || !hackathon) return null;

  const isConcluded = hackathon.status === 'closed' || hackathon.status === 'finished';
  const directRegLink = hackathon.officialRegistrationLink || hackathon.registrationLink || hackathon.officialWebsite || '';

  const statusBadgeColor = {
    'open': 'bg-emerald-400/20 text-emerald-300 border border-emerald-400/30',
    'closing-soon': 'bg-amber-400/20 text-amber-300 border border-amber-400/30 animate-pulse-subtle',
    'team-full': 'bg-purple-400/20 text-purple-300 border border-purple-400/30',
    'upcoming': 'bg-blue-400/20 text-blue-300 border border-blue-400/30',
    'closed': 'bg-white/10 text-slate-400 border border-white/20'
  }[hackathon.status] || 'bg-white/10 text-slate-300';

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/75 backdrop-blur-md animate-fadeIn"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-4xl max-h-[92vh] bg-surface-container-lowest rounded-3xl shadow-2xl border border-surface-container-high overflow-hidden flex flex-col animate-modal"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header Banner with Competition Styling */}
        <div className="relative p-6 sm:p-8 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 sm:top-6 sm:right-6 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white/80 hover:text-white flex items-center justify-center transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-base">close</span>
          </button>

          {/* Badges Strip */}
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-200 text-xs font-bold uppercase tracking-wider">
              <span className="material-symbols-outlined text-xs text-blue-400">verified</span>
              {hackathon.circuitId || 'CIRCUIT SANCTIONED'}
            </span>

            <span className="px-2.5 py-0.5 rounded-full bg-white/10 text-slate-300 text-xs font-semibold capitalize">
              {hackathon.mode} Format
            </span>

            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold flex items-center gap-1.5 ${statusBadgeColor}`}>
              <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
              <span>{hackathon.statusLabel}</span>
            </span>

            <span className="px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 font-extrabold text-xs border border-amber-400/30 flex items-center gap-1">
              <span className="material-symbols-outlined text-xs">military_tech</span>
              <span>{hackathon.prizePool ? String(hackathon.prizePool).replace(/\$/g, '₹') : ''}</span>
            </span>
          </div>

          {/* Identity & Main Stats */}
          <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-5">
            <div className="w-16 h-16 rounded-2xl bg-white p-2 flex items-center justify-center shrink-0 shadow-lg border border-white/20">
              {hackathon.logo ? (
                <img src={hackathon.logo} alt={hackathon.title} className="w-full h-full object-contain rounded-lg" />
              ) : (
                <span className="material-symbols-outlined text-3xl text-secondary">terminal</span>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                    {hackathon.title}
                  </h2>
                  <p className="text-xs sm:text-sm font-medium text-blue-200/90 mt-0.5">
                    {hackathon.subtitle} · Hosted by <strong>{hackathon.organizer?.name}</strong>
                  </p>
                </div>

                {directRegLink && (
                  <a
                    href={directRegLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs transition-all shadow-md active:scale-[0.98]"
                  >
                    <span>Register on Official Site</span>
                    <span className="material-symbols-outlined text-sm">open_in_new</span>
                  </a>
                )}
              </div>

              {/* Quick Logistics Strip */}
              <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-slate-300 mt-3 pt-3 border-t border-white/10">
                <span className="flex items-center gap-1 font-semibold text-white">
                  <span className="material-symbols-outlined text-sm text-blue-400">calendar_month</span>
                  <span>{hackathon.dates}</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm text-indigo-400">location_on</span>
                  <span>{hackathon.location}</span>
                </span>
                <span className="flex items-center gap-1 text-emerald-300 font-semibold">
                  <span className="material-symbols-outlined text-sm text-emerald-400">payments</span>
                  <span>{hackathon.registrationFee ? String(hackathon.registrationFee).replace(/\$0/g, '₹0').replace(/\$/g, '₹') : '100% Free'}</span>
                </span>
                <span className="flex items-center gap-1 text-amber-300 font-semibold">
                  <span className="material-symbols-outlined text-sm text-amber-400">hourglass_top</span>
                  <span>Deadline: {hackathon.registrationDeadline}</span>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 px-4 sm:px-6 pt-2 border-b border-surface-container-high bg-surface-container-low shrink-0 overflow-x-auto">
          {[
            { id: 'overview', label: 'Overview & Tracks', icon: 'info' },
            { id: 'rules', label: 'Eligibility & Rules', icon: 'gavel' },
            { id: 'schedule', label: 'Schedule & Deadlines', icon: 'schedule' }
          ].map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`pb-2.5 px-3 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === tab.id
                  ? 'border-secondary text-secondary'
                  : 'border-transparent text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <span className="material-symbols-outlined text-base">{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-5 sm:p-7 overflow-y-auto space-y-6 flex-1 text-sm text-on-surface">
          {/* TAB 1: OVERVIEW & BOUNTIES */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Event Brief */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-outline mb-2">
                  Competition Brief
                </h4>
                <p className="text-xs sm:text-sm text-on-surface leading-relaxed">
                  {hackathon.description}
                </p>
              </div>

              {hackathon.heroImage && (
                <div className="rounded-2xl overflow-hidden border border-surface-container-high h-44 sm:h-52 w-full">
                  <img src={hackathon.heroImage} alt={hackathon.title} className="w-full h-full object-cover" />
                </div>
              )}

              {/* Bento Logistics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
                <div className="p-3.5 rounded-2xl bg-surface-container-low border border-surface-container-high/60">
                  <span className="text-[10px] font-extrabold uppercase text-outline block">Start / End Dates</span>
                  <span className="font-bold text-xs text-on-surface mt-1 block">
                    {hackathon.startDate ? `${hackathon.startDate} to ${hackathon.endDate}` : hackathon.dates}
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-surface-container-low border border-surface-container-high/60">
                  <span className="text-[10px] font-extrabold uppercase text-outline block">Registration Fee</span>
                  <span className="font-bold text-xs text-emerald-800 mt-1 block">
                    {hackathon.registrationFee ? String(hackathon.registrationFee).replace(/\$0/g, '₹0').replace(/\$/g, '₹') : '100% Free'}
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-surface-container-low border border-surface-container-high/60">
                  <span className="text-[10px] font-extrabold uppercase text-outline block">Application Deadline</span>
                  <span className="font-bold text-xs text-amber-800 mt-1 block">
                    {hackathon.registrationDeadline}
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-surface-container-low border border-surface-container-high/60">
                  <span className="text-[10px] font-extrabold uppercase text-outline block">Squad Limits</span>
                  <span className="font-bold text-xs text-on-surface mt-1 block">
                    {hackathon.squadLimits}
                  </span>
                </div>

                {hackathon.registeredTeams && (
                  <div className="p-3.5 rounded-2xl bg-surface-container-low border border-surface-container-high/60">
                    <span className="text-[10px] font-extrabold uppercase text-outline block">Registration Capacity</span>
                    <span className="font-bold text-xs text-on-surface mt-1 block">
                      {hackathon.registeredTeams} / {hackathon.maxCap || 500} Squads
                    </span>
                  </div>
                )}
              </div>

              {/* Prize Tracks & Bounties Breakdown */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-outline">
                    Sponsored Competition Tracks &amp; Bounties
                  </h4>
                  <span className="text-xs font-extrabold text-amber-900 bg-amber-100 px-2.5 py-0.5 rounded-full">
                    Total Pool: {hackathon.prizePool ? String(hackathon.prizePool).replace(/\$/g, '₹') : ''}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {hackathon.bounties && hackathon.bounties.length > 0 ? (
                    hackathon.bounties.map((bounty, bIdx) => (
                      <div
                        key={bIdx}
                        className="p-4 rounded-2xl bg-surface-container-low border border-surface-container-high/80 hover:border-secondary/40 transition-all flex flex-col justify-between space-y-2"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-bold text-on-surface text-xs sm:text-sm">
                            {bounty.track}
                          </span>
                          <span className="px-2.5 py-1 rounded-xl bg-amber-100 text-amber-900 font-extrabold text-xs shrink-0">
                            {bounty.prize ? String(bounty.prize).replace(/\$/g, '₹') : ''}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-on-surface-variant pt-1 border-t border-surface-container-high/60">
                          <span className="material-symbols-outlined text-sm text-secondary">token</span>
                          <span>Bounty Sponsor: <strong>{bounty.sponsor}</strong></span>
                        </div>
                      </div>
                    ))
                  ) : (
                    hackathon.trackLabels?.map((track, tIdx) => (
                      <div key={tIdx} className="p-3.5 rounded-xl bg-surface-container-low text-xs font-semibold text-on-surface">
                        {track}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ELIGIBILITY & RULES */}
          {activeTab === 'rules' && (
            <div className="space-y-6">
              {/* Eligibility & Team Requirements */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-surface-container-low border border-surface-container-high space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-secondary uppercase">
                    <span className="material-symbols-outlined text-sm">school</span>
                    <span>Student Eligibility</span>
                  </div>
                  <p className="text-xs text-on-surface leading-relaxed">
                    {hackathon.eligibility || 'Open to all currently enrolled undergraduate, master\'s, and PhD students. Valid university .edu email or student identification card required at check-in.'}
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-surface-container-low border border-surface-container-high space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-secondary uppercase">
                    <span className="material-symbols-outlined text-sm">groups</span>
                    <span>Team &amp; Squad Requirements</span>
                  </div>
                  <p className="text-xs text-on-surface leading-relaxed">
                    {hackathon.teamRequirements || 'Squads must adhere to the 2 to 4 builder limit. Solo participants can find teammates in BuildCrew matchmaking prior to project registration.'}
                  </p>
                </div>
              </div>

              {/* Official Competition Rules */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-outline mb-3">
                  Official Circuit Rules &amp; Policies
                </h4>
                <div className="space-y-2.5">
                  {hackathon.rules && hackathon.rules.length > 0 ? (
                    hackathon.rules.map((rule, rIdx) => (
                      <div
                        key={rIdx}
                        className="p-3.5 rounded-2xl bg-surface-container-low border border-surface-container-high/60 flex items-start gap-3"
                      >
                        <span className="w-5 h-5 rounded-full bg-secondary-fixed text-on-secondary-fixed font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                          {rIdx + 1}
                        </span>
                        <p className="text-xs text-on-surface leading-relaxed flex-1">
                          {rule}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-on-surface-variant">Standard Collegiate Circuit rules in effect.</p>
                  )}
                </div>
              </div>

              {/* Judging Criteria */}
              <div className="p-4 rounded-2xl bg-surface-container-low border border-surface-container-high space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-outline">
                  Standard Judging Evaluation Criteria
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-surface-container-lowest border border-surface-container-high/60">
                    <span className="font-bold text-on-surface block">Innovation (25%)</span>
                    <span className="text-[11px] text-on-surface-variant">Novel approach to unsolved problem</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-surface-container-lowest border border-surface-container-high/60">
                    <span className="font-bold text-on-surface block">Execution (25%)</span>
                    <span className="text-[11px] text-on-surface-variant">Working prototype &amp; clean architecture</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-surface-container-lowest border border-surface-container-high/60">
                    <span className="font-bold text-on-surface block">Design &amp; UX (25%)</span>
                    <span className="text-[11px] text-on-surface-variant">Intuitive interface and polish</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-surface-container-lowest border border-surface-container-high/60">
                    <span className="font-bold text-on-surface block">Bounty Impact (25%)</span>
                    <span className="text-[11px] text-on-surface-variant">Alignment with sponsor problem</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: SCHEDULE & DEADLINES */}
          {activeTab === 'schedule' && (
            <div className="space-y-5">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-outline mb-1">
                  Official Timeline &amp; Sprint Milestones
                </h4>
                <p className="text-xs text-on-surface-variant">
                  All milestones synchronized with organizer committees and venue check-in desks.
                </p>
              </div>

              <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-surface-container-high">
                {hackathon.schedule && hackathon.schedule.length > 0 ? (
                  hackathon.schedule.map((item, sIdx) => (
                    <div key={sIdx} className="relative flex items-start gap-4">
                      <div className={`absolute -left-6 top-1 w-4 h-4 rounded-full border-2 border-surface-container-lowest ${
                        item.status === 'completed'
                          ? 'bg-secondary'
                          : 'bg-amber-500'
                      }`} />
                      <div className="flex-1 p-3.5 rounded-2xl bg-surface-container-low border border-surface-container-high/60 flex items-center justify-between gap-3">
                        <span className="font-bold text-xs sm:text-sm text-on-surface">
                          {item.phase}
                        </span>
                        <span className="text-xs font-semibold text-secondary shrink-0">
                          {item.date}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-on-surface-variant">Detailed schedule will be published by organizers 2 weeks before sprint.</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="p-4 sm:p-6 bg-surface-container-low border-t border-surface-container-high flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            {directRegLink && (
              <a
                href={directRegLink}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold shadow-sm transition-all inline-flex items-center gap-1.5 active:scale-[0.98]"
              >
                <span>Register on Official Site</span>
                <span className="material-symbols-outlined text-sm">open_in_new</span>
              </a>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-semibold transition-all cursor-pointer"
            >
              Close
            </button>
            {!isConcluded && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onFindSquad(hackathon);
                }}
                className="px-5 py-2 rounded-xl bg-primary hover:bg-surface-tint text-on-primary text-xs font-bold shadow-md active:scale-[0.98] transition-all cursor-pointer flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-base">groups</span>
                <span>Build a Team</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
