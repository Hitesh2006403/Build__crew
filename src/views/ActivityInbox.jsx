import React, { useState, useMemo } from 'react';

/**
 * ActivityInbox: Unified One Activity Inbox (Add-on 1)
 * Consolidates new applications, invitations, team updates, and unread messages in one place.
 * Each item contains a clear label, status indicator, and direct button to act.
 */
export default function ActivityInbox({
  applications = [],
  receivedInvitations = [],
  sentInvitations = [],
  projects = [],
  currentUser,
  onNavigate,
  onAcceptInvitation,
  onRejectInvitation,
  onSelectProject,
}) {
  const [filter, setFilter] = useState('all'); // 'all' | 'applications' | 'invitations' | 'team-updates' | 'messages'
  const currentUserId = String(currentUser?._id || currentUser?.id || '');

  // 1. Process Applications
  const applicationItems = useMemo(() => {
    const items = [];
    (applications || []).forEach((app) => {
      const isReceived = String(app.projectOwner || app.project?.createdBy || '') === currentUserId;
      const applicantName = app.applicant?.name || app.applicantName || 'A student';
      const projectTitle = app.project?.title || app.projectTitle || 'Your Project';
      const roleName = app.role || 'Team Member';
      const status = app.status || 'pending';

      if (isReceived) {
        items.push({
          id: `app-recv-${app._id}`,
          type: 'application-received',
          category: 'applications',
          title: `New application from ${applicantName}`,
          description: `Applied for "${roleName}" in project "${projectTitle}".`,
          timestamp: app.createdAt || new Date(),
          status,
          urgent: status === 'pending',
          raw: app,
          actionLabel: 'Review Application',
          onAction: () => onNavigate ? onNavigate('/applications') : null,
        });
      } else {
        items.push({
          id: `app-sent-${app._id}`,
          type: 'application-sent',
          category: 'applications',
          title: `Application to "${projectTitle}"`,
          description: `Applied for ${roleName}. Status: ${status.toUpperCase()}.`,
          timestamp: app.createdAt || new Date(),
          status,
          urgent: false,
          raw: app,
          actionLabel: 'View Applications',
          onAction: () => onNavigate ? onNavigate('/applications') : null,
        });
      }
    });
    return items;
  }, [applications, currentUserId, onNavigate]);

  // 2. Process Invitations
  const invitationItems = useMemo(() => {
    return (receivedInvitations || []).map((inv) => {
      const inviterName = inv.invitedBy?.name || 'A teammate';
      const teamTitle = inv.project?.title || inv.team?.name || 'a team';
      const roleName = inv.role || 'Member';
      const status = inv.status || 'pending';

      return {
        id: `inv-${inv._id}`,
        type: 'invitation-received',
        category: 'invitations',
        title: `Team invitation from ${inviterName}`,
        description: `Invited you to join "${teamTitle}" as ${roleName}.`,
        timestamp: inv.createdAt || new Date(),
        status,
        urgent: status === 'pending',
        raw: inv,
        actionLabel: status === 'pending' ? 'Review & Accept' : 'View Invitations',
        onAction: () => onNavigate ? onNavigate('/invitations') : null,
        onAccept: () => onAcceptInvitation && onAcceptInvitation(inv._id),
        onReject: () => onRejectInvitation && onRejectInvitation(inv._id),
      };
    });
  }, [receivedInvitations, onNavigate, onAcceptInvitation, onRejectInvitation]);

  // 3. Process Team Updates (Next milestones & tasks from joined projects)
  const teamUpdateItems = useMemo(() => {
    const items = [];
    (projects || []).forEach((proj) => {
      const isOwner = String(proj.createdBy?._id || proj.createdBy || '') === currentUserId;
      const isMember = Array.isArray(proj.members) && proj.members.some((m) => String(m._id || m || '') === currentUserId);

      if (isOwner || isMember) {
        if (proj.workspace?.nextMilestone?.title) {
          items.push({
            id: `milestone-${proj._id}`,
            type: 'team-milestone',
            category: 'team-updates',
            title: `Milestone: ${proj.title}`,
            description: `Next Milestone: "${proj.workspace.nextMilestone.title}"${
              proj.workspace.nextMilestone.dueDate ? ` due ${proj.workspace.nextMilestone.dueDate}` : ''
            }`,
            timestamp: proj.updatedAt || proj.createdAt || new Date(),
            status: 'active',
            urgent: false,
            actionLabel: 'Open Team Workspace',
            onAction: () => {
              if (onSelectProject) onSelectProject(proj);
              else if (onNavigate) onNavigate(`/teams/${proj._id}`);
            },
          });
        }

        // Check tasks assigned to current user
        const myTasks = (proj.workspace?.tasks || []).filter(
          (t) => !t.completed && String(t.assignedTo?._id || t.assignedTo || '') === currentUserId
        );
        if (myTasks.length > 0) {
          items.push({
            id: `tasks-${proj._id}`,
            type: 'team-tasks',
            category: 'team-updates',
            title: `Assigned Tasks in ${proj.title}`,
            description: `You have ${myTasks.length} open task(s) in this team workspace.`,
            timestamp: proj.updatedAt || new Date(),
            status: 'pending',
            urgent: true,
            actionLabel: 'View Tasks',
            onAction: () => {
              if (onSelectProject) onSelectProject(proj);
              else if (onNavigate) onNavigate(`/teams/${proj._id}`);
            },
          });
        }
      }
    });
    return items;
  }, [projects, currentUserId, onSelectProject, onNavigate]);

  // Combined & Sorted Items
  const allItems = useMemo(() => {
    let combined = [...applicationItems, ...invitationItems, ...teamUpdateItems];
    if (filter !== 'all') {
      combined = combined.filter((item) => item.category === filter);
    }
    return combined.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }, [applicationItems, invitationItems, teamUpdateItems, filter]);

  const pendingCount = (receivedInvitations || []).filter((i) => i.status === 'pending').length +
    (applications || []).filter((a) => a.status === 'pending' && String(a.projectOwner || a.project?.createdBy || '') === currentUserId).length;

  return (
    <div className="flex flex-col w-full pb-space-xl space-y-space-md">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-surface-container-high/60">
        <div>
          <div className="flex items-center gap-1.5 text-secondary font-label-sm uppercase tracking-wider mb-1 font-bold">
            <span className="material-symbols-outlined text-base">inbox</span>
            <span>Unified Activity Inbox</span>
          </div>
          <h1 className="font-headline-md text-2xl font-bold text-on-surface tracking-tight">
            Activity &amp; Requests
          </h1>
          <p className="font-body-sm text-sm text-on-surface-variant mt-0.5">
            Applications, invitations, team milestones, and updates in one place.
          </p>
        </div>

        {pendingCount > 0 && (
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-secondary/10 border border-secondary/20 text-secondary text-xs font-bold self-start sm:self-auto">
            <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
            <span>{pendingCount} item{pendingCount > 1 ? 's' : ''} require action</span>
          </div>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {[
          { id: 'all', label: 'All Activity', count: applicationItems.length + invitationItems.length + teamUpdateItems.length },
          { id: 'applications', label: 'Applications', count: applicationItems.length },
          { id: 'invitations', label: 'Invitations', count: invitationItems.length },
          { id: 'team-updates', label: 'Team Updates', count: teamUpdateItems.length },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setFilter(tab.id)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
              filter === tab.id
                ? 'bg-primary text-on-primary shadow-xs'
                : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
            }`}
          >
            <span>{tab.label}</span>
            {tab.count > 0 && (
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                filter === tab.id ? 'bg-on-primary/20 text-on-primary' : 'bg-surface-container text-on-surface-variant'
              }`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Items Feed */}
      {allItems.length === 0 ? (
        <div className="bg-surface-container-lowest rounded-2xl p-12 text-center text-on-surface-variant border border-surface-container-high/40 max-w-xl mx-auto my-8">
          <div className="w-14 h-14 rounded-2xl bg-surface-container flex items-center justify-center text-outline mx-auto mb-3">
            <span className="material-symbols-outlined text-3xl">mark_email_read</span>
          </div>
          <h3 className="font-title-sm text-base font-bold text-on-surface">You're all caught up!</h3>
          <p className="font-body-sm text-xs text-outline mt-1 max-w-sm mx-auto">
            No pending applications, invitations, or updates at the moment. Discover student projects or check your teams.
          </p>
          <div className="flex items-center justify-center gap-3 mt-4">
            <button
              type="button"
              onClick={() => onNavigate && onNavigate('/projects')}
              className="py-2 px-4 rounded-xl bg-primary text-on-primary text-xs font-bold hover:bg-surface-tint transition-all cursor-pointer"
            >
              Discover Projects
            </button>
            <button
              type="button"
              onClick={() => onNavigate && onNavigate('/teams')}
              className="py-2 px-4 rounded-xl bg-surface-container-high text-on-surface text-xs font-bold hover:bg-surface-container transition-all cursor-pointer"
            >
              My Teams
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-2.5">
          {allItems.map((item) => {
            const isUrgent = item.urgent;
            return (
              <div
                key={item.id}
                className={`p-4 rounded-2xl bg-surface-container-lowest border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  isUrgent
                    ? 'border-secondary/40 shadow-xs ring-1 ring-secondary/20'
                    : 'border-surface-container-high/50 hover:border-surface-container-high'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                    item.category === 'invitations'
                      ? 'bg-blue-500/10 text-blue-600'
                      : item.category === 'applications'
                      ? 'bg-purple-500/10 text-purple-600'
                      : 'bg-emerald-500/10 text-emerald-600'
                  }`}>
                    <span className="material-symbols-outlined text-xl">
                      {item.category === 'invitations'
                        ? 'mail'
                        : item.category === 'applications'
                        ? 'assignment_ind'
                        : 'flag'}
                    </span>
                  </div>

                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-title-sm text-sm font-bold text-on-surface">
                        {item.title}
                      </h4>
                      {isUrgent && (
                        <span className="px-2 py-0.5 rounded-full bg-secondary/15 text-secondary text-[10px] font-bold">
                          Needs Action
                        </span>
                      )}
                      <span className="text-[11px] text-outline">
                        {new Date(item.timestamp).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    </div>
                    <p className="font-body-sm text-xs text-on-surface-variant line-clamp-2">
                      {item.description}
                    </p>
                  </div>
                </div>

                {/* Direct Action Buttons */}
                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                  {item.type === 'invitation-received' && item.status === 'pending' && (
                    <>
                      <button
                        type="button"
                        onClick={item.onReject}
                        className="py-1.5 px-3 rounded-xl border border-surface-container-high text-xs font-semibold text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-all cursor-pointer"
                      >
                        Decline
                      </button>
                      <button
                        type="button"
                        onClick={item.onAccept}
                        className="py-1.5 px-3.5 rounded-xl bg-secondary text-on-secondary text-xs font-bold hover:opacity-90 transition-all cursor-pointer shadow-2xs"
                      >
                        Accept
                      </button>
                    </>
                  )}

                  {item.actionLabel && (!item.onAccept || item.status !== 'pending') && (
                    <button
                      type="button"
                      onClick={item.onAction}
                      className="py-1.5 px-3.5 rounded-xl bg-primary text-on-primary text-xs font-bold hover:bg-surface-tint transition-all cursor-pointer shadow-2xs flex items-center gap-1"
                    >
                      <span>{item.actionLabel}</span>
                      <span className="material-symbols-outlined text-xs">arrow_forward</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
