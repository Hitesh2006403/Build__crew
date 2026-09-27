import React, { useState } from 'react';

function cleanText(text) {
  if (!text) return '';
  const trimmed = String(text).trim();
  const lower = trimmed.toLowerCase();
  if (lower === 'campus member' || lower === 'collegiate campus' || lower === 'nothing' || lower === 'n/a') {
    return '';
  }
  return trimmed;
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  } catch {
    return String(dateStr);
  }
}

export default function Invitations({
  receivedInvitations = [],
  sentInvitations = [],
  onAcceptInvitation,
  onRejectInvitation,
  onCancelInvitation,
  onViewProfile,
  onSelectProject,
  currentUser,
  isLoading = false
}) {
  const [activeTab, setActiveTab] = useState('received'); // 'received' | 'sent'
  const [processingId, setProcessingId] = useState(null);
  const [contactMember, setContactMember] = useState(null);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);

  const handleOpenContact = (person) => {
    if (!person) return;
    setContactMember({
      name: person.name || 'Teammate',
      avatar: person.avatar || person.profileImage || '',
      college: cleanText(person.college || person.university),
      email: person.email || '',
      github: person.github || '',
      linkedin: person.linkedin || '',
      showEmailToTeam: person.showEmailToTeam !== false,
      userId: person._id,
    });
    setIsContactModalOpen(true);
  };

  const handleCloseContact = () => {
    setContactMember(null);
    setIsContactModalOpen(false);
  };

  const handleAccept = async (id) => {
    if (processingId || !onAcceptInvitation) return;
    setProcessingId(id);
    try {
      await onAcceptInvitation(id);
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (id) => {
    if (processingId || !onRejectInvitation) return;
    setProcessingId(id);
    try {
      await onRejectInvitation(id);
    } finally {
      setProcessingId(null);
    }
  };

  const handleCancel = async (id) => {
    if (processingId || !onCancelInvitation) return;
    setProcessingId(id);
    try {
      await onCancelInvitation(id);
    } finally {
      setProcessingId(null);
    }
  };

  const getStatusBadge = (status) => {
    const s = String(status).toLowerCase();
    if (s === 'accepted') {
      return (
        <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-label-sm text-xs font-semibold flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
          Accepted
        </span>
      );
    }
    if (s === 'rejected') {
      return (
        <span className="px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 font-label-sm text-xs font-semibold flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
          Rejected
        </span>
      );
    }
    if (s === 'cancelled') {
      return (
        <span className="px-2.5 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant font-label-sm text-xs font-semibold flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-outline"></span>
          Cancelled
        </span>
      );
    }
    return (
      <span className="px-2.5 py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed font-label-sm text-xs font-semibold flex items-center gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse"></span>
        Pending
      </span>
    );
  };

  const pendingReceivedCount = receivedInvitations.filter(i => i.status === 'pending').length;

  return (
    <div className="flex flex-col w-full pb-space-xl space-y-space-lg max-w-5xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-md">
        <div className="flex flex-col">
          <div className="flex items-center gap-space-xs text-secondary font-label-md text-label-md uppercase tracking-wider mb-1">
            <span className="material-symbols-outlined text-base">mail</span>
            <span>Team Invitations</span>
          </div>
          <h1 className="font-headline-lg text-headline-lg font-bold text-on-surface tracking-tight">
            Invitations
          </h1>
          <p className="font-body-lg text-body-lg text-on-surface-variant mt-1">
            Manage incoming team invitations and track invitations you've sent to other students.
          </p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-surface-container-high/60 pb-1">
        <button
          type="button"
          onClick={() => setActiveTab('received')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-title-sm text-title-sm transition-all cursor-pointer ${
            activeTab === 'received'
              ? 'bg-surface-container-high text-on-surface font-bold shadow-xs'
              : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
          }`}
        >
          <span className="material-symbols-outlined text-lg">inbox</span>
          <span>Received</span>
          {pendingReceivedCount > 0 && (
            <span className="ml-1 px-2 py-0.5 rounded-full bg-secondary text-on-secondary text-xs font-bold">
              {pendingReceivedCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('sent')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-title-sm text-title-sm transition-all cursor-pointer ${
            activeTab === 'sent'
              ? 'bg-surface-container-high text-on-surface font-bold shadow-xs'
              : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
          }`}
        >
          <span className="material-symbols-outlined text-lg">outbox</span>
          <span>Sent</span>
          {sentInvitations.length > 0 && (
            <span className="ml-1 px-2 py-0.5 rounded-full bg-surface-container-highest text-on-surface-variant text-xs font-semibold">
              {sentInvitations.length}
            </span>
          )}
        </button>
      </div>

      {/* Content Container */}
      <div className="bg-surface-container-lowest rounded-2xl shadow-sm p-space-lg space-y-space-md border border-surface-container-high/40">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center p-12 text-center text-on-surface-variant gap-3">
            <span className="material-symbols-outlined text-3xl text-secondary animate-spin">sync</span>
            <p className="font-medium text-sm">Fetching invitations from MongoDB...</p>
          </div>
        ) : activeTab === 'received' ? (
          /* ===================== RECEIVED TAB ===================== */
          receivedInvitations.length === 0 ? (
            <div className="py-14 text-center text-on-surface-variant space-y-2">
              <span className="material-symbols-outlined text-4xl text-outline mb-1">mail</span>
              <p className="font-headline-sm text-base font-bold text-on-surface">No invitations yet.</p>
              <p className="font-body-sm text-xs max-w-sm mx-auto text-on-surface-variant">
                When team leaders or fellow builders invite you to their squad, their invitations will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-space-md">
              {receivedInvitations.map((inv) => {
                const sender = typeof inv.sender === 'object' && inv.sender !== null ? inv.sender : {};
                const senderName = sender.name || 'Student Builder';
                const senderCollege = cleanText(sender.college || sender.university);
                const senderAvatar = sender.avatar || sender.profileImage || '';
                const teamTitle = inv.teamName || inv.project?.title || inv.hackathonTeam?.teamName || 'Squad';
                const projectTitle = inv.project?.title;
                const hackathonTitle = inv.hackathonTeam?.hackathonTitle || inv.hackathonTeam?.teamName;
                const roleOffered = inv.role || 'Teammate / Contributor';
                const dateText = formatDate(inv.createdAt);
                const isPending = inv.status === 'pending';

                return (
                  <div
                    key={inv._id}
                    className="p-space-md rounded-2xl bg-surface-container-low border border-surface-container-high/50 flex flex-col md:flex-row md:items-center justify-between gap-space-md hover:bg-surface-container/70 transition-all"
                  >
                    {/* Left: Sender details & Team Info */}
                    <div className="flex items-start gap-space-md min-w-0">
                      <div className="relative shrink-0 mt-0.5">
                        {senderAvatar ? (
                          <img
                            src={senderAvatar}
                            alt=""
                            className="w-12 h-12 rounded-full object-cover shadow-sm shrink-0"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                              if (e.currentTarget.nextElementSibling) {
                                e.currentTarget.nextElementSibling.style.display = 'flex';
                              }
                            }}
                          />
                        ) : null}
                        <div
                          style={{ display: senderAvatar ? 'none' : 'flex' }}
                          className="w-12 h-12 rounded-full bg-secondary/15 text-secondary font-bold text-base items-center justify-center shadow-sm shrink-0"
                        >
                          {(senderName || 'S').charAt(0).toUpperCase()}
                        </div>
                      </div>

                      <div className="space-y-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-title-md text-title-md font-bold text-on-surface truncate">
                            {senderName}
                          </h3>
                          {senderCollege && (
                            <span className="font-label-sm text-xs text-on-surface-variant truncate">
                              · {senderCollege}
                            </span>
                          )}
                          {getStatusBadge(inv.status)}
                        </div>

                        <div className="text-body-sm text-body-sm">
                          <span className="text-on-surface-variant">Invited you to join </span>
                          <span className="font-bold text-on-surface">[{teamTitle}]</span>
                        </div>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-on-surface-variant pt-0.5">
                          {projectTitle && (
                            <div className="flex items-center gap-1">
                              <span className="material-symbols-outlined text-sm text-primary">rocket_launch</span>
                              <span className="font-medium text-on-surface">Project: {projectTitle}</span>
                            </div>
                          )}
                          {!projectTitle && hackathonTitle && (
                            <div className="flex items-center gap-1">
                              <span className="material-symbols-outlined text-sm text-secondary">terminal</span>
                              <span className="font-medium text-on-surface">Hackathon: {hackathonTitle}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-sm text-secondary">badge</span>
                            <span>Role: <span className="font-semibold text-secondary">{roleOffered}</span></span>
                          </div>
                          {dateText && (
                            <div className="flex items-center gap-1 text-outline">
                              <span className="material-symbols-outlined text-sm">calendar_today</span>
                              <span>{dateText}</span>
                            </div>
                          )}
                        </div>

                        {inv.message && cleanText(inv.message) && (
                          <p className="text-xs text-on-surface-variant italic bg-surface-container-lowest/80 p-2 rounded-xl border border-surface-container-high/40 mt-1 max-w-xl">
                            "{inv.message}"
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-2 shrink-0 md:self-center pt-2 md:pt-0 border-t md:border-t-0 border-surface-container-high/40">
                      {isPending ? (
                        <>
                          <button
                            type="button"
                            disabled={processingId === inv._id}
                            onClick={() => handleAccept(inv._id)}
                            className="py-2 px-4 rounded-xl bg-primary hover:bg-surface-tint text-on-primary font-title-sm text-xs font-bold shadow-xs transition-all cursor-pointer flex items-center gap-1 active:scale-[0.98] disabled:opacity-50"
                          >
                            <span className="material-symbols-outlined text-sm">check</span>
                            <span>{processingId === inv._id ? 'Accepting...' : 'Accept'}</span>
                          </button>
                          <button
                            type="button"
                            disabled={processingId === inv._id}
                            onClick={() => handleReject(inv._id)}
                            className="py-2 px-3.5 rounded-xl bg-surface-container-lowest hover:bg-surface-container text-on-surface font-semibold text-xs transition-all cursor-pointer flex items-center gap-1 border border-surface-container-high/60 disabled:opacity-50"
                          >
                            <span className="material-symbols-outlined text-sm">close</span>
                            <span>{processingId === inv._id ? 'Declining...' : 'Reject'}</span>
                          </button>
                        </>
                      ) : null}

                      {inv.status === 'accepted' && (
                        <button
                          type="button"
                          onClick={() => handleOpenContact(sender)}
                          className="py-2 px-3 rounded-xl bg-secondary/10 hover:bg-secondary/20 text-secondary font-semibold text-xs transition-all cursor-pointer flex items-center gap-1"
                        >
                          <span className="material-symbols-outlined text-sm">chat</span>
                          <span>Contact</span>
                        </button>
                      )}

                      {sender._id && onViewProfile && (
                        <button
                          type="button"
                          onClick={() => onViewProfile(sender._id)}
                          className="py-2 px-3 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface font-medium text-xs transition-all cursor-pointer"
                          title="View student profile"
                        >
                          View Profile
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )
        ) : (
          /* ===================== SENT TAB ===================== */
          sentInvitations.length === 0 ? (
            <div className="py-14 text-center text-on-surface-variant space-y-2">
              <span className="material-symbols-outlined text-4xl text-outline mb-1">outbox</span>
              <p className="font-headline-sm text-base font-bold text-on-surface">No invitations yet.</p>
              <p className="font-body-sm text-xs max-w-sm mx-auto text-on-surface-variant">
                You haven't sent any squad invitations. Find teammates and invite students to build together.
              </p>
            </div>
          ) : (
            <div className="space-y-space-md">
              {sentInvitations.map((inv) => {
                const receiver = typeof inv.receiver === 'object' && inv.receiver !== null ? inv.receiver : {};
                const receiverName = receiver.name || 'Invited Teammate';
                const receiverCollege = cleanText(receiver.college || receiver.university);
                const receiverAvatar = receiver.avatar || receiver.profileImage || '';
                const teamTitle = inv.teamName || inv.project?.title || inv.hackathonTeam?.teamName || 'Squad';
                const projectTitle = inv.project?.title;
                const hackathonTitle = inv.hackathonTeam?.hackathonTitle || inv.hackathonTeam?.teamName;
                const role = inv.role || 'Teammate / Contributor';
                const dateText = formatDate(inv.createdAt);
                const isPending = inv.status === 'pending';

                return (
                  <div
                    key={inv._id}
                    className="p-space-md rounded-2xl bg-surface-container-low border border-surface-container-high/50 flex flex-col md:flex-row md:items-center justify-between gap-space-md hover:bg-surface-container/70 transition-all"
                  >
                    {/* Left: Receiver details & Team Info */}
                    <div className="flex items-start gap-space-md min-w-0">
                      <div className="relative shrink-0 mt-0.5">
                        {receiverAvatar ? (
                          <img
                            src={receiverAvatar}
                            alt=""
                            className="w-12 h-12 rounded-full object-cover shadow-sm shrink-0"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                              if (e.currentTarget.nextElementSibling) {
                                e.currentTarget.nextElementSibling.style.display = 'flex';
                              }
                            }}
                          />
                        ) : null}
                        <div
                          style={{ display: receiverAvatar ? 'none' : 'flex' }}
                          className="w-12 h-12 rounded-full bg-secondary/15 text-secondary font-bold text-base items-center justify-center shadow-sm shrink-0"
                        >
                          {(receiverName || 'R').charAt(0).toUpperCase()}
                        </div>
                      </div>

                      <div className="space-y-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-title-md text-title-md font-bold text-on-surface truncate">
                            {receiverName}
                          </h3>
                          {receiverCollege && (
                            <span className="font-label-sm text-xs text-on-surface-variant truncate">
                              · {receiverCollege}
                            </span>
                          )}
                          {getStatusBadge(inv.status)}
                        </div>

                        <div className="text-body-sm text-body-sm">
                          <span className="text-on-surface-variant">Invited to join </span>
                          <span className="font-bold text-on-surface">[{teamTitle}]</span>
                        </div>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-on-surface-variant pt-0.5">
                          {projectTitle && (
                            <div className="flex items-center gap-1">
                              <span className="material-symbols-outlined text-sm text-primary">rocket_launch</span>
                              <span className="font-medium text-on-surface">Project: {projectTitle}</span>
                            </div>
                          )}
                          {!projectTitle && hackathonTitle && (
                            <div className="flex items-center gap-1">
                              <span className="material-symbols-outlined text-sm text-secondary">terminal</span>
                              <span className="font-medium text-on-surface">Hackathon: {hackathonTitle}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-sm text-secondary">badge</span>
                            <span>Role: <span className="font-semibold text-secondary">{role}</span></span>
                          </div>
                          {dateText && (
                            <div className="flex items-center gap-1 text-outline">
                              <span className="material-symbols-outlined text-sm">calendar_today</span>
                              <span>{dateText}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-2 shrink-0 md:self-center pt-2 md:pt-0 border-t md:border-t-0 border-surface-container-high/40">
                      {isPending && onCancelInvitation && (
                        <button
                          type="button"
                          disabled={processingId === inv._id}
                          onClick={() => handleCancel(inv._id)}
                          className="py-1.5 px-3 rounded-xl bg-surface-container-lowest hover:bg-surface-container text-on-surface-variant hover:text-rose-600 font-semibold text-xs transition-all cursor-pointer flex items-center gap-1 border border-surface-container-high/60 disabled:opacity-50"
                        >
                          <span className="material-symbols-outlined text-sm">cancel</span>
                          <span>{processingId === inv._id ? 'Cancelling...' : 'Cancel Invitation'}</span>
                        </button>
                      )}

                      {inv.status === 'accepted' && (
                        <button
                          type="button"
                          onClick={() => handleOpenContact(receiver)}
                          className="py-1.5 px-3 rounded-xl bg-secondary/10 hover:bg-secondary/20 text-secondary font-semibold text-xs transition-all cursor-pointer flex items-center gap-1"
                        >
                          <span className="material-symbols-outlined text-sm">chat</span>
                          <span>Contact</span>
                        </button>
                      )}

                      {receiver._id && onViewProfile && (
                        <button
                          type="button"
                          onClick={() => onViewProfile(receiver._id)}
                          className="py-1.5 px-3 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface font-medium text-xs transition-all cursor-pointer"
                        >
                          View Profile
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}
      </div>

      {/* Real Contact Information Modal */}
      {isContactModalOpen && contactMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-primary-container/40 backdrop-blur-sm animate-modal">
          <div className="fixed inset-0" onClick={handleCloseContact} />
          <div className="relative w-full max-w-md bg-surface-container-lowest rounded-2xl shadow-2xl border border-surface-container-high overflow-hidden z-10 p-space-lg">
            <div className="flex items-start justify-between mb-space-md">
              <div className="flex items-center gap-3">
                <div className="relative shrink-0">
                  {contactMember.avatar ? (
                    <img
                      src={contactMember.avatar}
                      alt=""
                      className="w-12 h-12 rounded-full object-cover shadow-sm shrink-0"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-secondary/15 text-secondary font-bold text-lg flex items-center justify-center shrink-0">
                      {(contactMember.name || 'M').charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div>
                  <h3 className="font-title-md text-title-md font-bold text-on-surface">
                    {contactMember.name}
                  </h3>
                  {contactMember.college && (
                    <p className="font-body-sm text-xs text-on-surface-variant">
                      {contactMember.college}
                    </p>
                  )}
                </div>
              </div>
              <button 
                type="button" 
                onClick={handleCloseContact}
                className="p-1.5 rounded-xl hover:bg-surface-container text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>

            <div className="space-y-3.5 pt-1">
              {/* Email (only if allowed by privacy setting or viewer is self/admin) */}
              {contactMember.email && (contactMember.showEmailToTeam || String(contactMember.userId) === String(currentUser?._id) || currentUser?.role === 'admin') ? (
                <div className="p-3 rounded-xl bg-surface-container-low border border-surface-container-high/50 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <span className="font-label-sm text-[11px] text-outline uppercase tracking-wider block">
                      Email Address
                    </span>
                    <span className="font-body-sm text-sm text-on-surface font-medium truncate block">
                      {contactMember.email}
                    </span>
                  </div>
                  <a
                    href={`mailto:${contactMember.email}`}
                    className="px-3.5 py-1.5 rounded-xl bg-primary text-on-primary font-title-sm text-xs font-semibold hover:bg-surface-tint transition-all shrink-0 inline-flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-sm">mail</span>
                    <span>Send Email</span>
                  </a>
                </div>
              ) : contactMember.email && !contactMember.showEmailToTeam ? (
                <div className="p-3 rounded-xl bg-surface-container-low border border-surface-container-high/50 text-xs text-on-surface-variant">
                  <span className="material-symbols-outlined text-sm align-middle mr-1">lock</span>
                  Email hidden by member privacy settings.
                </div>
              ) : null}

              {/* GitHub */}
              {contactMember.github && cleanText(contactMember.github) && (
                <div className="p-3 rounded-xl bg-surface-container-low border border-surface-container-high/50 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <span className="font-label-sm text-[11px] text-outline uppercase tracking-wider block">
                      GitHub
                    </span>
                    <span className="font-body-sm text-sm text-on-surface font-medium truncate block">
                      {contactMember.github}
                    </span>
                  </div>
                  <a
                    href={contactMember.github.startsWith('http') ? contactMember.github : `https://${contactMember.github}`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3.5 py-1.5 rounded-xl bg-surface-container-highest text-on-surface font-title-sm text-xs font-semibold hover:bg-surface-container transition-all shrink-0 inline-flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-sm">code</span>
                    <span>GitHub</span>
                    <span className="material-symbols-outlined text-xs">arrow_outward</span>
                  </a>
                </div>
              )}

              {/* LinkedIn */}
              {contactMember.linkedin && cleanText(contactMember.linkedin) && (
                <div className="p-3 rounded-xl bg-surface-container-low border border-surface-container-high/50 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <span className="font-label-sm text-[11px] text-outline uppercase tracking-wider block">
                      LinkedIn
                    </span>
                    <span className="font-body-sm text-sm text-on-surface font-medium truncate block">
                      {contactMember.linkedin}
                    </span>
                  </div>
                  <a
                    href={contactMember.linkedin.startsWith('http') ? contactMember.linkedin : `https://${contactMember.linkedin}`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3.5 py-1.5 rounded-xl bg-surface-container-highest text-on-surface font-title-sm text-xs font-semibold hover:bg-surface-container transition-all shrink-0 inline-flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-sm">link</span>
                    <span>LinkedIn</span>
                    <span className="material-symbols-outlined text-xs">arrow_outward</span>
                  </a>
                </div>
              )}

              {/* If no contact info stored */}
              {(!contactMember.email || (!contactMember.showEmailToTeam && String(contactMember.userId) !== String(currentUser?._id) && currentUser?.role !== 'admin')) &&
               (!contactMember.github || !cleanText(contactMember.github)) &&
               (!contactMember.linkedin || !cleanText(contactMember.linkedin)) && (
                <div className="py-6 text-center text-on-surface-variant font-body-sm text-sm bg-surface-container-low rounded-xl">
                  No public contact information shared by this member.
                </div>
              )}
            </div>

            <div className="pt-space-md mt-space-md border-t border-surface-container-high/40 flex justify-end">
              <button
                type="button"
                onClick={handleCloseContact}
                className="px-4 py-2 rounded-xl bg-surface-container-low hover:bg-surface-container text-on-surface font-title-sm text-title-sm transition-all cursor-pointer font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
