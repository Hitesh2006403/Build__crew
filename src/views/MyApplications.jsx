import { useState } from 'react';

export default function MyApplications({ 
  applications = [], 
  currentUser,
  onSelectProjectById,
  initialTab = 'received',
  onTabChange,
  onUpdateStatus
}) {
  const [userTab, setUserTab] = useState(null);
  const [prevInitialTab, setPrevInitialTab] = useState(initialTab);
  const [processingId, setProcessingId] = useState(null);

  if (prevInitialTab !== initialTab) {
    setPrevInitialTab(initialTab);
    setUserTab(null);
  }

  const activeTab = userTab || initialTab || 'received';

  const handleTabClick = (tab) => {
    setUserTab(tab);
    if (onTabChange) onTabChange(tab);
  };

  const currentUserId = String(currentUser?._id || currentUser?.id || '');

  // Sent Applications: current logged-in user is the applicant
  const sentApplications = applications.filter(app => {
    const applicantId = String(app.applicant?._id || app.applicant || '');
    return applicantId === currentUserId;
  });

  // Received Applications: other students applied to current user's projects
  const receivedApplications = applications.filter(app => {
    const applicantId = String(app.applicant?._id || app.applicant || '');
    return applicantId !== currentUserId;
  });

  const pendingReceivedCount = receivedApplications.filter(a => a.status === 'pending').length;

  const [rejectingApp, setRejectingApp] = useState(null);
  const [rejectionReasonText, setRejectionReasonText] = useState('');

  const handleStatusChange = async (appId, status, reason = '') => {
    if (processingId || !onUpdateStatus) return;
    setProcessingId(appId);
    try {
      await onUpdateStatus(appId, status, reason);
    } finally {
      setProcessingId(null);
    }
  };

  const getStatusBadge = (status) => {
    const s = String(status || 'pending').toLowerCase();
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
    return (
      <span className="px-2.5 py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed font-label-sm text-xs font-semibold flex items-center gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span>
        Pending Review
      </span>
    );
  };

  return (
    <div className="flex flex-col w-full pb-space-xl space-y-space-lg">
      {/* Header */}
      <div className="flex flex-col max-w-3xl">
        <div className="flex items-center gap-space-xs text-secondary font-label-md text-label-md uppercase tracking-wider mb-1">
          <span className="material-symbols-outlined text-base">assignment</span>
          <span>Application Tracker</span>
        </div>
        <h1 className="font-headline-lg text-headline-lg font-bold text-on-surface tracking-tight">
          My Applications
        </h1>
        <p className="font-body-lg text-body-lg text-on-surface-variant mt-1">
          Track applications received for your projects and applications you sent to other squads.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-surface-container-high pb-px">
        <button
          type="button"
          onClick={() => handleTabClick('received')}
          className={`flex items-center gap-2 px-4 py-2.5 font-title-sm text-title-sm font-semibold rounded-t-xl transition-all cursor-pointer border-b-2 ${
            activeTab === 'received'
              ? 'border-secondary text-secondary bg-surface-container-low/50'
              : 'border-transparent text-on-surface-variant hover:text-on-surface'
          }`}
        >
          <span className="material-symbols-outlined text-lg">inbox</span>
          <span>Received</span>
          {pendingReceivedCount > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-secondary text-on-secondary text-xs font-bold">
              {pendingReceivedCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => handleTabClick('sent')}
          className={`flex items-center gap-2 px-4 py-2.5 font-title-sm text-title-sm font-semibold rounded-t-xl transition-all cursor-pointer border-b-2 ${
            activeTab === 'sent'
              ? 'border-secondary text-secondary bg-surface-container-low/50'
              : 'border-transparent text-on-surface-variant hover:text-on-surface'
          }`}
        >
          <span className="material-symbols-outlined text-lg">send</span>
          <span>Sent</span>
          {sentApplications.length > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-surface-container text-on-surface-variant text-xs font-medium">
              {sentApplications.length}
            </span>
          )}
        </button>
      </div>

      {/* Tab Panels */}
      <div className="bg-surface-container-lowest rounded-2xl shadow-sm p-space-lg space-y-space-md border border-surface-container-high/40">
        {activeTab === 'received' ? (
          receivedApplications.length === 0 ? (
            <div className="py-12 text-center text-on-surface-variant">
              <span className="material-symbols-outlined text-4xl text-outline mb-2">inbox</span>
              <p className="font-body-lg text-body-lg text-on-surface font-semibold">No received applications yet</p>
              <p className="font-body-sm text-body-sm mt-1">When students apply to collaborate on your projects, their applications will appear here.</p>
            </div>
          ) : (
            <div className="space-y-space-md">
              {receivedApplications.map((app, idx) => {
                const applicantName = app.applicantName || app.applicant?.name || 'Student Applicant';
                const applicantLetter = applicantName.trim().charAt(0).toUpperCase() || 'S';
                const isPending = (app.status || 'pending').toLowerCase() === 'pending';
                const isCurrentProcessing = processingId === app._id;

                return (
                  <div
                    key={app._id || idx}
                    className="p-space-md rounded-xl bg-surface-container-low border border-surface-container-high/60 flex flex-col md:flex-row md:items-center justify-between gap-space-md hover:bg-surface-container transition-all"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-secondary/15 text-secondary font-bold text-sm flex items-center justify-center shrink-0">
                          {applicantLetter}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-title-md text-title-md font-bold text-on-surface">
                              {applicantName}
                            </h3>
                            {getStatusBadge(app.status)}
                          </div>
                          <span className="text-xs text-on-surface-variant">
                            Applied to <strong className="text-on-surface">{app.projectTitle || app.project?.title || 'Your Project'}</strong>
                          </span>
                        </div>
                      </div>

                      <div className="font-body-sm text-body-sm text-secondary font-medium">
                        Role Applied For: <span className="text-on-surface font-semibold">{app.requestedRole || app.role}</span>
                      </div>

                      {(app.note || app.message) && (
                        <p className="font-body-sm text-body-sm text-on-surface-variant max-w-xl bg-surface-container-lowest/60 p-2.5 rounded-lg border border-surface-container-high/40">
                          "{app.note || app.message}"
                        </p>
                      )}

                      <span className="text-outline text-[11px] block">
                        Submitted {app.submittedAt || (app.createdAt ? new Date(app.createdAt).toLocaleDateString() : 'recently')}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                      {isPending && onUpdateStatus ? (
                        <>
                          <button
                            type="button"
                            disabled={isCurrentProcessing}
                            onClick={() => {
                              setRejectingApp(app);
                              setRejectionReasonText('');
                            }}
                            className="px-3.5 py-2 rounded-xl bg-surface-container-lowest hover:bg-rose-50 text-rose-600 border border-surface-container-high font-title-sm text-title-sm transition-all cursor-pointer font-semibold disabled:opacity-50"
                          >
                            Reject
                          </button>
                          <button
                            type="button"
                            disabled={isCurrentProcessing}
                            onClick={() => handleStatusChange(app._id, 'accepted')}
                            className="px-4 py-2 rounded-xl bg-primary hover:bg-surface-tint text-on-primary font-title-sm text-title-sm shadow-sm transition-all cursor-pointer font-semibold disabled:opacity-50"
                          >
                            Accept
                          </button>
                        </>
                      ) : null}

                      {onSelectProjectById && (app.projectId || app.project?._id || app.project) && (
                        <button
                          type="button"
                          onClick={() => onSelectProjectById(app.projectId || app.project?._id || app.project)}
                          className="py-2 px-3.5 rounded-xl bg-surface-container-lowest hover:bg-surface text-on-surface font-title-sm text-title-sm shadow-sm transition-all cursor-pointer font-medium border border-surface-container-high/40"
                        >
                          View Project
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )
        ) : (
          sentApplications.length === 0 ? (
            <div className="py-12 text-center text-on-surface-variant">
              <span className="material-symbols-outlined text-4xl text-outline mb-2">assignment_late</span>
              <p className="font-body-lg text-body-lg text-on-surface font-semibold">You haven't submitted any applications yet</p>
              <p className="font-body-sm text-body-sm mt-1">Browse projects on the Discover page to apply for open roles.</p>
            </div>
          ) : (
            <div className="space-y-space-md">
              {sentApplications.map((app, idx) => (
                <div
                  key={app._id || idx}
                  className="p-space-md rounded-xl bg-surface-container-low border border-surface-container-high/60 flex flex-col md:flex-row md:items-center justify-between gap-space-md hover:bg-surface-container transition-all"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-title-md text-title-md font-bold text-on-surface">
                        {app.projectTitle || app.project?.title || 'Project'}
                      </h3>
                      {getStatusBadge(app.status)}
                    </div>
                    <div className="font-body-sm text-body-sm text-secondary font-medium">
                      Role Applied For: <span className="text-on-surface font-semibold">{app.requestedRole || app.role}</span>
                    </div>
                    {(app.note || app.message) && (
                      <p className="font-body-sm text-body-sm text-on-surface-variant max-w-xl">
                        "{app.note || app.message}"
                      </p>
                    )}
                    {String(app.status).toLowerCase() === 'rejected' && (app.rejectionReason || app.reason) && (
                      <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs text-rose-700 dark:text-rose-300 max-w-xl mt-1">
                        <span className="font-semibold block text-[11px] uppercase tracking-wider mb-0.5">Reason for rejection:</span>
                        {app.rejectionReason || app.reason}
                      </div>
                    )}
                    <span className="text-outline text-[11px] block mt-1">
                      Submitted {app.submittedAt || (app.createdAt ? new Date(app.createdAt).toLocaleDateString() : 'recently')}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {onSelectProjectById && (
                      <button
                        type="button"
                        onClick={() => onSelectProjectById(app.projectId || app.project?._id || app.project)}
                        className="py-2 px-4 rounded-xl bg-surface-container-lowest hover:bg-surface text-on-surface font-title-sm text-title-sm shadow-sm transition-all cursor-pointer font-medium border border-surface-container-high/40"
                      >
                        View Project
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>

      {/* Rejection Modal with Optional Reason */}
      {rejectingApp && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-modal"
          onClick={() => setRejectingApp(null)}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-surface-container-lowest rounded-2xl shadow-2xl border border-surface-container-high p-5 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-title-md text-title-md font-bold text-on-surface">
                Reject Application
              </h3>
              <button
                type="button"
                onClick={() => setRejectingApp(null)}
                className="p-1 rounded-lg hover:bg-surface-container text-on-surface-variant cursor-pointer"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            <p className="text-xs text-on-surface-variant">
              Reject application from <strong>{rejectingApp.applicantName || rejectingApp.applicant?.name || 'applicant'}</strong> for <strong>{rejectingApp.requestedRole || rejectingApp.role}</strong>?
            </p>

            <div>
              <label className="block text-xs font-semibold text-on-surface mb-1">
                Reason for rejection (optional):
              </label>
              <textarea
                rows={3}
                value={rejectionReasonText}
                onChange={(e) => setRejectionReasonText(e.target.value)}
                placeholder="e.g. This role has already been filled with another candidate."
                className="w-full px-3 py-2 rounded-xl bg-surface-container-low text-xs text-on-surface border border-surface-container-high/60 outline-none focus:ring-2 focus:ring-secondary/30 resize-none font-medium"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-surface-container-high/40">
              <button
                type="button"
                onClick={() => setRejectingApp(null)}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-surface-container hover:bg-surface-container-high text-on-surface transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={Boolean(processingId)}
                onClick={async () => {
                  const appId = rejectingApp._id;
                  const reason = rejectionReasonText.trim();
                  setRejectingApp(null);
                  await handleStatusChange(appId, 'rejected', reason);
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-error hover:bg-error/90 text-on-error shadow-sm transition-all cursor-pointer disabled:opacity-50"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
