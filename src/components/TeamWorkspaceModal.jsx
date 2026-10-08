import React, { useState, useEffect } from 'react';
import { projectsApi } from '../api/projects';
import { getSocket } from '../utils/socket';

/**
 * TeamWorkspaceModal: Simple Team Workspace (Add-on 2)
 * Provides each team with a shared task list, assigned members, and one next milestone.
 * Real-time synced for all team members via Socket.IO and MongoDB.
 */
export default function TeamWorkspaceModal({
  project,
  currentUser,
  isOpen,
  onClose,
  showToast,
}) {
  if (!isOpen || !project) return null;

  const projectId = project._id || project.id;
  const [workspace, setWorkspace] = useState({
    nextMilestone: { title: '', dueDate: '', description: '' },
    tasks: [],
  });
  const [members, setMembers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // New task form state
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskAssignedTo, setNewTaskAssignedTo] = useState('');

  // Milestone edit state
  const [isEditingMilestone, setIsEditingMilestone] = useState(false);
  const [milestoneTitle, setMilestoneTitle] = useState('');
  const [milestoneDueDate, setMilestoneDueDate] = useState('');
  const [milestoneDescription, setMilestoneDescription] = useState('');

  // Fetch initial workspace
  useEffect(() => {
    let isMounted = true;
    async function loadWorkspace() {
      try {
        setIsLoading(true);
        const res = await projectsApi.getWorkspace(projectId);
        if (isMounted && res.success) {
          const ws = res.workspace || { nextMilestone: {}, tasks: [] };
          setWorkspace(ws);
          setMembers(res.members || []);
          setMilestoneTitle(ws.nextMilestone?.title || '');
          setMilestoneDueDate(ws.nextMilestone?.dueDate || '');
          setMilestoneDescription(ws.nextMilestone?.description || '');
        }
      } catch (err) {
        console.error('Failed to load team workspace:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadWorkspace();

    // Socket.IO real-time listener for workspace updates
    const socket = getSocket();
    if (socket) {
      socket.emit('join_team', projectId);

      const handleWorkspaceUpdate = (data) => {
        if (String(data.projectId) === String(projectId)) {
          setWorkspace(data.workspace);
          setMilestoneTitle(data.workspace.nextMilestone?.title || '');
          setMilestoneDueDate(data.workspace.nextMilestone?.dueDate || '');
          setMilestoneDescription(data.workspace.nextMilestone?.description || '');
          if (data.updatedBy && String(data.updatedBy._id) !== String(currentUser?._id)) {
            if (showToast) showToast(`${data.updatedBy.name} updated the team workspace`);
          }
        }
      };

      socket.on('team_workspace_updated', handleWorkspaceUpdate);

      return () => {
        socket.off('team_workspace_updated', handleWorkspaceUpdate);
        isMounted = false;
      };
    }

    return () => {
      isMounted = false;
    };
  }, [projectId, currentUser, showToast]);

  // Save workspace changes
  const saveWorkspaceChanges = async (newWorkspace) => {
    try {
      setIsSaving(true);
      await projectsApi.updateWorkspace(projectId, newWorkspace);
      setWorkspace(newWorkspace);
    } catch (err) {
      console.error('Save workspace error:', err);
      if (showToast) showToast('Failed to save workspace changes');
    } finally {
      setIsSaving(false);
    }
  };

  // Task actions
  const handleAddTask = (e) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    const assignedMember = members.find((m) => String(m._id || m.id) === String(newTaskAssignedTo));
    const assignedName = assignedMember ? assignedMember.name : 'Unassigned';

    const newTask = {
      title: newTaskTitle.trim(),
      completed: false,
      assignedTo: newTaskAssignedTo || null,
      assignedName,
      createdAt: new Date(),
    };

    const updatedTasks = [...(workspace.tasks || []), newTask];
    const updatedWs = { ...workspace, tasks: updatedTasks };
    saveWorkspaceChanges(updatedWs);

    setNewTaskTitle('');
    setNewTaskAssignedTo('');
  };

  const handleToggleTask = (taskIndex) => {
    const updatedTasks = [...(workspace.tasks || [])];
    updatedTasks[taskIndex] = {
      ...updatedTasks[taskIndex],
      completed: !updatedTasks[taskIndex].completed,
    };
    const updatedWs = { ...workspace, tasks: updatedTasks };
    saveWorkspaceChanges(updatedWs);
  };

  const handleDeleteTask = (taskIndex) => {
    const updatedTasks = (workspace.tasks || []).filter((_, idx) => idx !== taskIndex);
    const updatedWs = { ...workspace, tasks: updatedTasks };
    saveWorkspaceChanges(updatedWs);
  };

  // Milestone save
  const handleSaveMilestone = () => {
    const updatedMilestone = {
      title: milestoneTitle.trim(),
      dueDate: milestoneDueDate.trim(),
      description: milestoneDescription.trim(),
    };
    const updatedWs = { ...workspace, nextMilestone: updatedMilestone };
    saveWorkspaceChanges(updatedWs);
    setIsEditingMilestone(false);
    if (showToast) showToast('Milestone saved for your team');
  };

  const completedCount = (workspace.tasks || []).filter((t) => t.completed).length;
  const totalCount = (workspace.tasks || []).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-on-surface/40 backdrop-blur-sm animate-fade-in">
      <div 
        className="bg-surface-container-lowest rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl border border-surface-container-high/60 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-surface-container-high/60 flex items-center justify-between bg-surface-container-low/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-secondary/10 text-secondary flex items-center justify-center">
              <span className="material-symbols-outlined text-2xl">task_alt</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-headline-sm text-lg font-bold text-on-surface">Team Workspace</h3>
                <span className="px-2 py-0.5 rounded-full bg-secondary/10 text-secondary text-[10px] font-bold">
                  Shared Live
                </span>
              </div>
              <p className="font-body-sm text-xs text-outline line-clamp-1">{project.title}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-outline hover:bg-surface-container-high hover:text-on-surface transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-3 border-secondary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {/* Section 1: One Next Milestone */}
              <div className="p-4 rounded-2xl bg-surface-container-low/70 border border-surface-container-high/60 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-secondary font-title-sm text-sm font-bold">
                    <span className="material-symbols-outlined text-lg">flag</span>
                    <span>Next Milestone</span>
                  </div>
                  {!isEditingMilestone && (
                    <button
                      type="button"
                      onClick={() => setIsEditingMilestone(true)}
                      className="text-xs text-secondary hover:underline font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-sm">edit</span>
                      <span>Edit</span>
                    </button>
                  )}
                </div>

                {isEditingMilestone ? (
                  <div className="space-y-3 pt-1">
                    <div>
                      <label className="block text-[11px] font-bold text-outline uppercase mb-1">
                        Milestone Goal
                      </label>
                      <input
                        type="text"
                        value={milestoneTitle}
                        onChange={(e) => setMilestoneTitle(e.target.value)}
                        placeholder="e.g. Build Core MVP & Test with 5 Users"
                        className="w-full px-3 py-2 rounded-xl bg-surface-container text-xs text-on-surface border border-surface-container-high focus:outline-none focus:ring-1 focus:ring-secondary"
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-outline uppercase mb-1">
                          Target Date
                        </label>
                        <input
                          type="text"
                          value={milestoneDueDate}
                          onChange={(e) => setMilestoneDueDate(e.target.value)}
                          placeholder="e.g. Oct 15, 2026 or Next Sunday"
                          className="w-full px-3 py-2 rounded-xl bg-surface-container text-xs text-on-surface border border-surface-container-high focus:outline-none focus:ring-1 focus:ring-secondary"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-outline uppercase mb-1">
                          Key Deliverable
                        </label>
                        <input
                          type="text"
                          value={milestoneDescription}
                          onChange={(e) => setMilestoneDescription(e.target.value)}
                          placeholder="e.g. Deployed preview link"
                          className="w-full px-3 py-2 rounded-xl bg-surface-container text-xs text-on-surface border border-surface-container-high focus:outline-none focus:ring-1 focus:ring-secondary"
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setIsEditingMilestone(false)}
                        className="px-3 py-1.5 rounded-xl text-xs font-semibold text-outline hover:bg-surface-container cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveMilestone}
                        disabled={isSaving}
                        className="px-4 py-1.5 rounded-xl bg-primary text-on-primary text-xs font-bold hover:bg-surface-tint transition-all cursor-pointer"
                      >
                        Save Milestone
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    {workspace.nextMilestone?.title ? (
                      <div className="space-y-1">
                        <h4 className="font-headline-sm text-base font-bold text-on-surface">
                          {workspace.nextMilestone.title}
                        </h4>
                        <div className="flex items-center gap-3 text-xs text-on-surface-variant flex-wrap">
                          {workspace.nextMilestone.dueDate && (
                            <span className="flex items-center gap-1 text-secondary font-medium">
                              <span className="material-symbols-outlined text-sm">event</span>
                              <span>Target: {workspace.nextMilestone.dueDate}</span>
                            </span>
                          )}
                          {workspace.nextMilestone.description && (
                            <span className="text-outline">
                              • {workspace.nextMilestone.description}
                            </span>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-2 text-xs text-outline">
                        No milestone defined yet. Click "Edit" to align your team on one next target!
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Section 2: Shared Task List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h4 className="font-title-sm text-sm font-bold text-on-surface">
                      Team Task List
                    </h4>
                    {totalCount > 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-surface-container text-outline text-[11px] font-semibold">
                        {completedCount}/{totalCount} done
                      </span>
                    )}
                  </div>
                  {totalCount > 0 && (
                    <div className="w-24 h-1.5 rounded-full bg-surface-container overflow-hidden">
                      <div 
                        className="h-full bg-secondary transition-all"
                        style={{ width: `${Math.round((completedCount / totalCount) * 100)}%` }}
                      />
                    </div>
                  )}
                </div>

                {/* Add Task Form */}
                <form onSubmit={handleAddTask} className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    placeholder="Add a new team task..."
                    maxLength={150}
                    className="flex-1 px-3 py-2 rounded-xl bg-surface-container text-xs text-on-surface placeholder:text-outline border border-surface-container-high focus:outline-none focus:ring-1 focus:ring-secondary"
                  />
                  <select
                    value={newTaskAssignedTo}
                    onChange={(e) => setNewTaskAssignedTo(e.target.value)}
                    className="px-3 py-2 rounded-xl bg-surface-container text-xs text-on-surface border border-surface-container-high focus:outline-none"
                  >
                    <option value="">Unassigned</option>
                    {members.map((m) => (
                      <option key={m._id || m.id} value={m._id || m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="submit"
                    disabled={!newTaskTitle.trim() || isSaving}
                    className="px-4 py-2 rounded-xl bg-primary text-on-primary text-xs font-bold hover:bg-surface-tint disabled:opacity-50 transition-all cursor-pointer whitespace-nowrap flex items-center justify-center gap-1"
                  >
                    <span className="material-symbols-outlined text-sm">add</span>
                    <span>Add Task</span>
                  </button>
                </form>

                {/* Tasks List */}
                <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                  {(workspace.tasks || []).length === 0 ? (
                    <div className="text-center py-8 text-xs text-outline border border-dashed border-surface-container-high rounded-xl">
                      No tasks created yet. Break your next milestone down into quick tasks!
                    </div>
                  ) : (
                    workspace.tasks.map((task, idx) => (
                      <div
                        key={task._id || idx}
                        className={`p-2.5 rounded-xl border flex items-center justify-between gap-3 transition-all ${
                          task.completed
                            ? 'bg-surface-container-low/40 border-surface-container-high/40 opacity-75'
                            : 'bg-surface-container-lowest border-surface-container-high/60 shadow-2xs'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 flex-1 min-w-0">
                          <button
                            type="button"
                            onClick={() => handleToggleTask(idx)}
                            className={`w-5 h-5 rounded-lg flex items-center justify-center border transition-all cursor-pointer ${
                              task.completed
                                ? 'bg-secondary border-secondary text-on-secondary'
                                : 'border-outline hover:border-secondary'
                            }`}
                          >
                            {task.completed && (
                              <span className="material-symbols-outlined text-sm">check</span>
                            )}
                          </button>
                          <span className={`text-xs break-words line-clamp-2 ${
                            task.completed ? 'line-through text-outline' : 'text-on-surface font-medium'
                          }`}>
                            {task.title}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className="px-2 py-0.5 rounded-lg bg-surface-container text-outline text-[10px] font-semibold">
                            {task.assignedName || 'Unassigned'}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleDeleteTask(idx)}
                            className="text-outline hover:text-error transition-colors p-1 cursor-pointer"
                            title="Delete task"
                          >
                            <span className="material-symbols-outlined text-sm">delete</span>
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Section 3: Team Roster Summary */}
              <div className="p-3 rounded-2xl bg-surface-container/50 border border-surface-container-high/60 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-base text-secondary">groups</span>
                  <span className="text-xs font-bold text-on-surface">Team Roster ({members.length} members)</span>
                </div>
                <div className="flex -space-x-1.5 overflow-hidden">
                  {members.map((m) => (
                    <img
                      key={m._id || m.id}
                      src={m.avatar || m.profileImage || '/default-avatar.png'}
                      alt={m.name}
                      title={m.name}
                      className="w-6 h-6 rounded-full ring-2 ring-surface object-cover"
                    />
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
