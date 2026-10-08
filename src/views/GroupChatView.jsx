import { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import chatApi from '../api/chat';
import { getSocket } from '../utils/socket';

// Curated avatar presets for Group Profile Picture
const GROUP_AVATAR_PRESETS = [
  { id: 'rocket', label: 'Launch', icon: 'rocket_launch', bg: 'from-blue-600 to-indigo-600' },
  { id: 'code', label: 'Dev', icon: 'terminal', bg: 'from-emerald-600 to-teal-700' },
  { id: 'lightning', label: 'Sprint', icon: 'bolt', bg: 'from-amber-500 to-orange-600' },
  { id: 'shield', label: 'Core', icon: 'shield', bg: 'from-purple-600 to-pink-600' },
  { id: 'flame', label: 'Fire', icon: 'local_fire_department', bg: 'from-rose-500 to-red-600' },
  { id: 'trophy', label: 'Win', icon: 'emoji_events', bg: 'from-yellow-500 to-amber-600' },
  { id: 'brain', label: 'AI/ML', icon: 'psychology', bg: 'from-cyan-500 to-blue-600' },
  { id: 'groups', label: 'Squad', icon: 'diversity_3', bg: 'from-teal-500 to-emerald-600' },
];

function formatTime(isoString) {
  if (!isoString) return '';
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDateHeader(isoString) {
  if (!isoString) return '';
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return '';
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return 'Today';
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function GroupChatView({ currentUser, onUpdateUser, showToast }) {
  const { groupId: urlGroupId } = useParams();
  const navigate = useNavigate();

  // State
  const [groups, setGroups] = useState([]);
  const [activeGroupId, setActiveGroupId] = useState(urlGroupId || null);
  const [activeGroup, setActiveGroup] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoadingGroups, setIsLoadingGroups] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);

  // Modals & Panels
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
  const [isUsernameModalOpen, setIsUsernameModalOpen] = useState(false);
  const [isGroupInfoOpen, setIsGroupInfoOpen] = useState(false);

  // Form states for Create Group
  const [userTeams, setUserTeams] = useState([]);
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [selectedAvatarPreset, setSelectedAvatarPreset] = useState(GROUP_AVATAR_PRESETS[0]);
  const [customAvatarUrl, setCustomAvatarUrl] = useState('');
  const [selectedMemberIds, setSelectedMemberIds] = useState([]);
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);

  // Form state for Username
  const [usernameInput, setUsernameInput] = useState(currentUser?.chatUsername || '');
  const [isSavingUsername, setIsSavingUsername] = useState(false);
  const [usernameError, setUsernameError] = useState('');

  // UI helpers
  const messagesEndRef = useRef(null);
  const socketRef = useRef(null);
  const currentUserId = String(currentUser?._id || currentUser?.id || '');
  const [socketConnected, setSocketConnected] = useState(true);
  const [isAddingMembers, setIsAddingMembers] = useState(false);
  const [addMemberIds, setAddMemberIds] = useState([]);
  const [eligibleAddMembers, setEligibleAddMembers] = useState([]);
  const [isLoadingEligible, setIsLoadingEligible] = useState(false);
  const userTeamsCacheRef = useRef(null);
  const activeMessagesRequestRef = useRef(0);

  // Track Socket.IO connection status (small non-blocking indicator, auto-reconnect handled by socket.js)
  useEffect(() => {
    const socket = getSocket();
    socketRef.current = socket;
    const handleConnect = () => setSocketConnected(true);
    const handleDisconnect = () => setSocketConnected(false);
    const handleConnectError = () => setSocketConnected(false);
    setSocketConnected(Boolean(socket.connected));
    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('connect_error', handleConnectError);
    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('connect_error', handleConnectError);
    };
  }, []);

  // 1. Initial groups and user teams loading
  useEffect(() => {
    let isSubscribed = true;
    setIsLoadingGroups(true);

    Promise.allSettled([chatApi.getGroups(), chatApi.getUserTeams()])
      .then(([groupsRes, teamsRes]) => {
        if (!isSubscribed) return;
        if (teamsRes.status === 'fulfilled' && teamsRes.value?.teams) {
          const loadedTeams = teamsRes.value.teams || [];
          setUserTeams(loadedTeams);
          userTeamsCacheRef.current = loadedTeams;
        }
        if (groupsRes.status === 'fulfilled') {
          const loaded = groupsRes.value?.groups || [];
          setGroups(loaded);
          setIsLoadingGroups(false);
          if (urlGroupId) {
            setActiveGroupId(urlGroupId);
          } else if (loaded.length > 0) {
            setActiveGroupId((prev) => prev || loaded[0]._id);
          }
        } else {
          setIsLoadingGroups(false);
          showToast?.('Could not load chat groups');
        }
      })
      .catch((err) => {
        console.error('Failed to load chat data:', err);
        if (isSubscribed) {
          setIsLoadingGroups(false);
          showToast?.('Could not load chat groups');
        }
      });

    return () => {
      isSubscribed = false;
    };
    // Intentionally excludes activeGroupId: this effect must not refetch the
    // full groups list every time the active group changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlGroupId]);

  // 2. Load Active Group Messages (latest history from MongoDB, chronological)
  useEffect(() => {
    if (!activeGroupId) return;

    const requestId = ++activeMessagesRequestRef.current;
    let isSubscribed = true;
    setIsLoadingMessages(true);
    chatApi.getGroupMessages(activeGroupId)
      .then((res) => {
        if (!isSubscribed || requestId !== activeMessagesRequestRef.current) return;
        setActiveGroup(res.group);
        setMessages(res.messages || []);
        setIsLoadingMessages(false);
      })
      .catch((err) => {
        console.error('Failed to load group messages:', err);
        if (!isSubscribed || requestId !== activeMessagesRequestRef.current) return;
        setIsLoadingMessages(false);
        showToast?.(err.message || 'Could not load messages for this group');
      });

    return () => {
      isSubscribed = false;
    };
  }, [activeGroupId]);

  // 3. Socket.IO Real-time Synchronization (single listener set per active group)
  useEffect(() => {
    const socket = socketRef.current || getSocket();
    socketRef.current = socket;

    const joinCurrentRoom = () => {
      if (activeGroupId) {
        socket.emit('join_group', { groupId: activeGroupId }, (res) => {
          if (res?.error) {
            console.warn('[Socket.IO] Join group warning:', res.error);
          }
        });
        socket.emit('join-chat', activeGroupId);
      }
    };

    // Join room immediately
    joinCurrentRoom();

    // Re-join the room after an automatic reconnect: Socket.IO rooms are
    // per-connection, so a reconnected socket is no longer in the group room
    // until it joins again. Without this, messages stop arriving after any
    // transient disconnect until the user switches groups or reloads.
    const handleReconnect = () => {
      joinCurrentRoom();
    };

    // Handler for incoming new group message (appends only the new message by MongoDB _id)
    const handleNewMessage = (payload) => {
      const incomingGroupId =
        payload?.groupId ||
        payload?.chatId ||
        payload?.message?.groupId ||
        payload?.message?.chatId ||
        payload?.message?.conversationId ||
        (payload?._id && payload?.groupId);

      const incomingMessage = payload?.message || payload;
      if (!incomingMessage?._id) return;

      const isForActiveGroup =
        !incomingGroupId ||
        String(incomingGroupId) === String(activeGroupId);

      if (isForActiveGroup) {
        setMessages((prev) => {
          if (prev.some((m) => String(m._id) === String(incomingMessage._id))) {
            return prev;
          }
          // If this broadcast is the server echo of our own optimistic
          // message, replace the temp bubble instead of appending a duplicate.
          const incomingSender = String(
            incomingMessage.senderId?._id ||
            incomingMessage.senderId?.id ||
            incomingMessage.senderId ||
            ''
          );
          const pendingIdx = prev.findIndex(
            (m) =>
              String(m._id || '').startsWith('temp-') &&
              m.text === incomingMessage.text &&
              String(m.senderId?._id || m.senderId?.id || m.senderId || '') === incomingSender
          );
          if (pendingIdx !== -1) {
            const next = [...prev];
            next[pendingIdx] = incomingMessage;
            return next;
          }
          return [...prev, incomingMessage];
        });

        // Report delivery & read receipt if this incoming message is from another teammate
        const incomingSender = String(
          incomingMessage.senderId?._id ||
          incomingMessage.senderId?.id ||
          incomingMessage.senderId ||
          ''
        );
        if (incomingSender && incomingSender !== currentUserId) {
          socket.emit('message_delivered', { messageId: incomingMessage._id });
          socket.emit('conversation_read', { conversationId: activeGroupId, messageIds: [incomingMessage._id] });
          chatApi.markRead(activeGroupId, [incomingMessage._id]).catch(() => {});
        }
      }

      // Update lastMessage on groups list
      const targetGroupIdentifier = incomingGroupId || activeGroupId;
      if (targetGroupIdentifier) {
        setGroups((prev) =>
          prev.map((g) => {
            if (String(g._id) === String(targetGroupIdentifier)) {
              return {
                ...g,
                lastMessage: {
                  text: incomingMessage.text,
                  senderName: incomingMessage.senderId?.name || 'Teammate',
                  senderUsername: incomingMessage.senderId?.chatUsername || '',
                  createdAt: incomingMessage.createdAt,
                },
              };
            }
            return g;
          })
        );
      }
    };

    // Handler for live receipt updates (Point 4: update sender live)
    const handleReceiptUpdated = (receipt) => {
      if (!receipt?.messageId) return;
      setMessages((prev) =>
        prev.map((m) => {
          if (String(m._id) === String(receipt.messageId)) {
            return {
              ...m,
              recipients: receipt.recipients || m.recipients,
            };
          }
          return m;
        })
      );
    };

    // Handler for new group added
    const handleGroupCreated = (newGroup) => {
      if (!newGroup?._id) return;
      setGroups((prev) => {
        if (prev.some((g) => String(g._id) === String(newGroup._id))) return prev;
        return [newGroup, ...prev];
      });
    };

    // Handler for member update
    const handleGroupMembersUpdated = (updatedGroup) => {
      if (!updatedGroup?._id) return;
      if (String(updatedGroup._id) === String(activeGroupId)) {
        setActiveGroup(updatedGroup);
      }
      setGroups((prev) => prev.map((g) => (String(g._id) === String(updatedGroup._id) ? updatedGroup : g)));
    };

    socket.on('connect', handleReconnect);
    socket.on('new_group_message', handleNewMessage);
    socket.on('receive-message', handleNewMessage);
    socket.on('receive_message', handleNewMessage);
    socket.on('new_message', handleNewMessage);
    socket.on('receipt_updated', handleReceiptUpdated);
    socket.on('group_created', handleGroupCreated);
    socket.on('group_members_updated', handleGroupMembersUpdated);

    // If active group is open, notify server that messages are read
    if (activeGroupId) {
      socket.emit('conversation_read', { conversationId: activeGroupId });
      chatApi.markRead(activeGroupId).catch(() => {});
    }

    return () => {
      if (activeGroupId) {
        socket.emit('leave_group', { groupId: activeGroupId });
        socket.emit('leave-chat', activeGroupId);
      }
      socket.off('connect', handleReconnect);
      socket.off('new_group_message', handleNewMessage);
      socket.off('receive-message', handleNewMessage);
      socket.off('receive_message', handleNewMessage);
      socket.off('new_message', handleNewMessage);
      socket.off('receipt_updated', handleReceiptUpdated);
      socket.off('group_created', handleGroupCreated);
      socket.off('group_members_updated', handleGroupMembersUpdated);
    };
  }, [activeGroupId]);

  // 3b. Fast polling fallback (always on).
  // Root cause of "only shows after refresh": Socket.IO needs a persistent
  // Node process, but Vercel serverless functions (api/index.js) cannot hold
  // WebSocket connections. So broadcasts never reach the other member and the
  // sender waits on a socket ack that never arrives. This poller runs
  // regardless of socket status and merges genuinely new messages by MongoDB
  // _id (no duplicates, no design change), so both sides see messages within
  // ~2.5s even when sockets are down. When sockets do work (local dev) the
  // socket listener above still delivers instantly (<300ms).
  useEffect(() => {
    if (!activeGroupId) return;
    let cancelled = false;
    let inFlight = false;
    const poll = async () => {
      if (inFlight) return;
      if (typeof document !== 'undefined' && document.hidden) return;
      inFlight = true;
      try {
        const res = await chatApi.getGroupMessages(activeGroupId);
        if (cancelled || !res?.messages) return;
        setMessages((prev) => {
          const known = new Set(prev.map((m) => String(m._id)));
          const fresh = res.messages.filter((m) => m?._id && !known.has(String(m._id)));
          if (!fresh.length) return prev;
          // Drop any optimistic pending message that the fresh data confirms
          // (same sender + same text), then append the real messages.
          let next = prev;
          for (const real of fresh) {
            const realSender = String(real.senderId?._id || real.senderId || '');
            const pendingIdx = next.findIndex(
              (m) =>
                String(m._id || '').startsWith('temp-') &&
                m.text === real.text &&
                String(m.senderId?._id || m.senderId || '') === realSender
            );
            if (pendingIdx !== -1) {
              next = [...next.slice(0, pendingIdx), ...next.slice(pendingIdx + 1)];
            }
          }
          return [...next, ...fresh];
        });
        // Keep the left-pane preview fresh even without sockets.
        const latest = res.messages[res.messages.length - 1];
        if (latest?._id) {
          setGroups((prev) =>
            prev.map((g) => {
              if (String(g._id) !== String(activeGroupId)) return g;
              return {
                ...g,
                lastMessage: {
                  text: latest.text,
                  senderName: latest.senderId?.name || 'Teammate',
                  senderUsername: latest.senderId?.chatUsername || '',
                  createdAt: latest.createdAt,
                },
              };
            })
          );
        }
      } catch {
        // Silent: the next poll tick retries.
      } finally {
        inFlight = false;
      }
    };
    const timer = setInterval(poll, 2500);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [activeGroupId]);

  // 4. Auto scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Reset add-members panel whenever the active group changes.
  useEffect(() => {
    setEligibleAddMembers([]);
    setAddMemberIds([]);
    setIsAddingMembers(false);
  }, [activeGroupId]);

  // 5. Send Text-Only Message (Strictly Plain Text, Max 1000 Chars)
  // Flow: validate -> show optimistic bubble + clear input INSTANTLY ->
  // persist via Socket.IO ack (primary, short timeout) or REST fallback ->
  // replace temp bubble with the real MongoDB message by _id.
  // The old flow waited up to 8s for a socket ack before showing anything,
  // which felt "slow to send" and broke entirely on serverless hosting.
  const handleSendMessage = async (e) => {
    e?.preventDefault();
    const cleanText = messageText.trim();
    if (!cleanText || !activeGroupId) return;

    if (cleanText.length > 1000) {
      showToast?.('Maximum message length is 1000 characters.');
      return;
    }

    const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const optimisticMessage = {
      _id: tempId,
      groupId: activeGroupId,
      text: cleanText,
      senderId: {
        _id: currentUserId,
        name: currentUser?.name || 'You',
        chatUsername: currentUser?.chatUsername || '',
        avatar: currentUser?.avatar || currentUser?.profileImage || '',
        profileImage: currentUser?.profileImage || currentUser?.avatar || '',
      },
      createdAt: new Date().toISOString(),
      pending: true,
    };

    // Instant UI: bubble appears and input clears with zero network wait.
    setMessages((prev) => [...prev, optimisticMessage]);
    setMessageText('');

    // Keep the left-pane preview in sync instantly too.
    setGroups((prev) =>
      prev.map((g) => {
        if (String(g._id) !== String(activeGroupId)) return g;
        return {
          ...g,
          lastMessage: {
            text: cleanText,
            senderName: currentUser?.name || 'You',
            senderUsername: currentUser?.chatUsername || '',
            createdAt: optimisticMessage.createdAt,
          },
        };
      })
    );

    const replaceTempWithReal = (realMessage) => {
      if (!realMessage?._id) return;
      setMessages((prev) => {
        if (prev.some((m) => String(m._id) === String(realMessage._id))) {
          return prev.filter((m) => String(m._id) !== String(tempId));
        }
        return prev.map((m) => (String(m._id) === String(tempId) ? realMessage : m));
      });
    };

    const removeTempAndRestore = (errorMsg) => {
      setMessages((prev) => prev.filter((m) => String(m._id) !== String(tempId)));
      setMessageText(cleanText);
      if (errorMsg) showToast?.(errorMsg);
    };

    const sendViaRestFallback = async () => {
      const res = await chatApi.sendGroupMessage(activeGroupId, cleanText);
      if (res?.message) {
        replaceTempWithReal(res.message);
        return true;
      }
      throw new Error('Message could not be sent. Please try again.');
    };

    setIsSending(true);
    try {
      const socket = socketRef.current || getSocket();

      if (socket && socket.connected) {
        const acked = await new Promise((resolve) => {
          let settled = false;
          const timer = setTimeout(() => {
            if (!settled) {
              settled = true;
              resolve({ timeout: true });
            }
          }, 3000);
          try {
            socket.emit(
              'send_group_message',
              { chatId: activeGroupId, groupId: activeGroupId, text: cleanText },
              (ack) => {
                if (settled) return;
                settled = true;
                clearTimeout(timer);
                resolve(ack);
              }
            );
          } catch (emitErr) {
            if (!settled) {
              settled = true;
              clearTimeout(timer);
              resolve({ error: emitErr?.message || 'Send failed.' });
            }
          }
        });

        if (acked?.success && acked?.message) {
          // Broadcast will also arrive via new_group_message; dedupe by _id handles both.
          replaceTempWithReal(acked.message);
        } else if (acked?.timeout) {
          // Socket ack timed out: fall back to REST once so the message is not lost.
          await sendViaRestFallback();
        } else {
          // Real backend error: remove optimistic bubble, restore text for retry.
          removeTempAndRestore(acked?.error || 'Message could not be sent. Please try again.');
          return;
        }
      } else {
        await sendViaRestFallback();
      }
    } catch (err) {
      console.error('Failed to send group message:', err);
      // Do not leave a stuck "sending" bubble; restore the text so the user can retry.
      removeTempAndRestore(err.message || 'Message could not be sent. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  // 6. Handle Create Group Modal Open (reuses cached teams; only required data)
  const handleOpenCreateGroup = async () => {
    setIsCreateGroupOpen(true);
    try {
      let teams = userTeamsCacheRef.current;
      if (!teams) {
        const res = await chatApi.getUserTeams();
        teams = res.teams || [];
        userTeamsCacheRef.current = teams;
      }
      setUserTeams(teams);
      if (teams.length > 0) {
        const firstId = teams[0].teamId;
        setSelectedTeamId((prev) => prev || firstId);
        const effectiveTeamId = selectedTeamId || firstId;
        const chosen = teams.find((t) => t.teamId === effectiveTeamId) || teams[0];
        // Default to all eligible team members selected (never an empty unmanaged chat)
        const defaultMembers = (chosen.members || [])
          .map((m) => String(m._id || m))
          .filter((id) => id !== currentUserId);
        setSelectedMemberIds(defaultMembers);
      }
    } catch (err) {
      console.error('Failed to fetch user teams:', err);
      showToast?.('Could not load your formed teams');
    }
  };

  // When selected team changes in Create Group modal
  const handleTeamChange = (teamId) => {
    setSelectedTeamId(teamId);
    const chosen = userTeams.find((t) => t.teamId === teamId);
    if (chosen) {
      const defaultMembers = (chosen.members || [])
        .map((m) => String(m._id || m))
        .filter((id) => id !== currentUserId);
      setSelectedMemberIds(defaultMembers);
      if (!groupName) {
        setGroupName(`${chosen.name} Chat`);
      }
    }
  };

  // Toggle member in create group checklist
  const toggleMemberSelection = (mId) => {
    setSelectedMemberIds((prev) =>
      prev.includes(mId) ? prev.filter((id) => id !== mId) : [...prev, mId]
    );
  };

  // Submit Create Group (single real backend call; double-click guarded)
  const handleCreateGroupSubmit = async (e) => {
    e.preventDefault();
    if (isCreatingGroup) return;
    if (!groupName.trim()) {
      showToast?.('Please enter a group name');
      return;
    }

    try {
      setIsCreatingGroup(true);
      const profilePicToUse = customAvatarUrl.trim() || selectedAvatarPreset?.id || 'rocket';

      // Calls the real backend immediately; does not wait for chat history,
      // notifications, profile, or team chart data.
      const res = await chatApi.createGroup({
        name: groupName.trim(),
        description: groupDescription.trim(),
        groupProfilePic: profilePicToUse,
        teamId: selectedTeamId || undefined,
        memberIds: selectedMemberIds,
      });

      if (res.group) {
        // Update UI from the real returned group; message history loads on demand.
        setGroups((prev) =>
          prev.some((g) => String(g._id) === String(res.group._id)) ? prev : [res.group, ...prev]
        );
        setActiveGroup(res.group);
        setMessages([]);
        setActiveGroupId(res.group._id);
        navigate(`/group-chat/${res.group._id}`);
        showToast?.(`Group "${res.group.name}" created!`);
        setIsCreateGroupOpen(false);
        // Reset fields
        setGroupName('');
        setGroupDescription('');
        setCustomAvatarUrl('');
      } else {
        showToast?.('Failed to create group');
      }
    } catch (err) {
      console.error('Failed to create group:', err);
      showToast?.(err.message || 'Failed to create group');
    } finally {
      setIsCreatingGroup(false);
    }
  };

  // 7. Save / Update Chat Username
  const handleSaveUsername = async (e) => {
    e.preventDefault();
    const cleanUser = usernameInput.trim().replace(/^@+/, '');
    if (!cleanUser) {
      setUsernameError('Username cannot be empty');
      return;
    }

    if (!/^[a-zA-Z0-9_]{3,25}$/.test(cleanUser)) {
      setUsernameError('Must be 3-25 characters: letters, numbers, and underscores only');
      return;
    }

    try {
      setIsSavingUsername(true);
      setUsernameError('');
      const res = await chatApi.updateChatUsername(cleanUser);
      if (res.user) {
        onUpdateUser?.(res.user);
        showToast?.(`Chat handle updated to @${cleanUser}`);
        setIsUsernameModalOpen(false);
      }
    } catch (err) {
      console.error('Username update failed:', err);
      setUsernameError(err.message || 'Failed to update username. It might already be taken.');
    } finally {
      setIsSavingUsername(false);
    }
  };

  // 8. Add Members: load only eligible team members, then add via backend (admin only)
  const handleLoadEligibleAddMembers = async () => {
    if (!activeGroup || isLoadingEligible) return;
    setIsLoadingEligible(true);
    try {
      let teams = userTeamsCacheRef.current;
      if (!teams) {
        const res = await chatApi.getUserTeams();
        teams = res.teams || [];
        userTeamsCacheRef.current = teams;
        setUserTeams(teams);
      }
      const existingIds = new Set((activeGroup.members || []).map((m) => String(m._id || m)));
      let eligible = [];
      if (activeGroup.teamId) {
        const linked = (teams || []).find((t) => String(t.teamId) === String(activeGroup.teamId));
        const roster = linked?.members || [];
        eligible = roster.filter((m) => !existingIds.has(String(m._id || m)));
      } else {
        // Custom group without a linked team: eligible = teammates from all user teams not yet in group.
        const seen = new Set();
        const all = [];
        for (const t of teams || []) {
          for (const m of t.members || []) {
            const id = String(m._id || m);
            if (!seen.has(id) && !existingIds.has(id) && id !== currentUserId) {
              seen.add(id);
              all.push(m);
            }
          }
        }
        eligible = all;
      }
      setEligibleAddMembers(eligible);
      setAddMemberIds([]);
    } catch (err) {
      console.error('Failed to load eligible members:', err);
      showToast?.(err.message || 'Could not load eligible members');
    } finally {
      setIsLoadingEligible(false);
    }
  };

  const toggleAddMemberSelection = (mId) => {
    setAddMemberIds((prev) =>
      prev.includes(mId) ? prev.filter((id) => id !== mId) : [...prev, mId]
    );
  };

  const handleAddMembersSubmit = async () => {
    if (!activeGroupId || addMemberIds.length === 0 || isAddingMembers) return;
    setIsAddingMembers(true);
    try {
      const res = await chatApi.addGroupMembers(activeGroupId, addMemberIds);
      if (res.group) {
        setActiveGroup(res.group);
        setGroups((prev) => prev.map((g) => (String(g._id) === String(res.group._id) ? res.group : g)));
        setEligibleAddMembers((prev) => prev.filter((m) => !addMemberIds.includes(String(m._id || m))));
        setAddMemberIds([]);
        showToast?.('Members added successfully.');
      }
    } catch (err) {
      console.error('Failed to add members:', err);
      showToast?.(err.message || 'Could not add members.');
    } finally {
      setIsAddingMembers(false);
    }
  };

  // Filter groups by search
  const filteredGroups = useMemo(() => {
    if (!searchQuery.trim()) return groups;
    const q = searchQuery.toLowerCase();
    return groups.filter(
      (g) =>
        g.name?.toLowerCase().includes(q) ||
        g.teamName?.toLowerCase().includes(q) ||
        g.description?.toLowerCase().includes(q)
    );
  }, [groups, searchQuery]);

  // Render Group Profile Pic
  const renderGroupPic = (group, size = 'w-12 h-12', textSize = 'text-xl') => {
    const pic = group?.groupProfilePic || '';
    // Check if preset id
    const preset = GROUP_AVATAR_PRESETS.find((p) => p.id === pic);
    if (preset) {
      return (
        <div
          className={`${size} rounded-2xl bg-gradient-to-tr ${preset.bg} text-white flex items-center justify-center shrink-0 shadow-sm`}
        >
          <span className={`material-symbols-outlined ${textSize}`}>{preset.icon}</span>
        </div>
      );
    }

    // Check if image URL
    if (pic.startsWith('http') || pic.startsWith('data:image')) {
      return (
        <img
          src={pic}
          alt={group?.name}
          className={`${size} rounded-2xl object-cover shrink-0 border border-surface-container-high/60 shadow-sm`}
        />
      );
    }

    // Default gradient with first letter
    return (
      <div
        className={`${size} rounded-2xl bg-gradient-to-tr from-secondary/80 to-primary/80 text-white flex items-center justify-center font-bold font-title-sm shrink-0 shadow-sm`}
      >
        <span>{(group?.name || 'G').charAt(0).toUpperCase()}</span>
      </div>
    );
  };

  // Group messages by date for date dividers
  const groupedMessages = useMemo(() => {
    const groupsMap = [];
    let currentDate = null;

    messages.forEach((msg) => {
      const dateHeader = formatDateHeader(msg.createdAt);
      if (dateHeader !== currentDate) {
        currentDate = dateHeader;
        groupsMap.push({ type: 'date', date: dateHeader });
      }
      groupsMap.push({ type: 'message', data: msg });
    });

    return groupsMap;
  }, [messages]);

  // Point 4: Exact text-only receipt ticks renderer
  const renderReceiptTicks = (msg) => {
    if (msg.pending || String(msg._id || '').startsWith('temp-')) {
      return (
        <span className="material-symbols-outlined text-[13px] text-outline select-none leading-none" title="Sending...">
          schedule
        </span>
      );
    }

    const recipients = Array.isArray(msg.recipients) ? msg.recipients : [];
    if (recipients.length === 0) {
      return (
        <span className="material-symbols-outlined text-[13px] text-outline/80 select-none leading-none" title="Saved by server">
          check
        </span>
      );
    }

    const allRead = recipients.length > 0 && recipients.every((r) => r.read);
    const allDelivered = recipients.length > 0 && recipients.every((r) => r.delivered || r.read);

    if (allRead) {
      return (
        <span className="material-symbols-outlined text-[14px] text-sky-400 font-bold select-none leading-none" title="Read by all teammates">
          done_all
        </span>
      );
    }

    if (allDelivered) {
      return (
        <span className="material-symbols-outlined text-[14px] text-outline/80 select-none leading-none" title="Delivered to all teammates">
          done_all
        </span>
      );
    }

    return (
      <span className="material-symbols-outlined text-[13px] text-outline/80 select-none leading-none" title="Saved by server">
        check
      </span>
    );
  };

  const isCurrentGroupAdmin = Boolean(
    activeGroup?.admin &&
      String(activeGroup.admin._id || activeGroup.admin) === currentUserId
  );

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-4rem)] bg-background text-on-surface overflow-hidden">
      {/* Main Split-Pane Container (WhatsApp Style) */}
      <div className="flex-1 flex w-full h-full overflow-hidden">
        
        {/* =================================================================== */}
        {/* LEFT COLUMN: Groups Navigation & List */}
        {/* =================================================================== */}
        <div
          className={`w-full lg:w-96 xl:w-105 flex flex-col bg-surface-container-lowest border-r border-surface-container-high/60 shrink-0 ${
            activeGroupId && 'hidden lg:flex'
          }`}
        >
          {/* Top Panel: User Chat Identity & Actions */}
          <div className="p-4 border-b border-surface-container-high/60 flex items-center justify-between gap-3 bg-surface-container-low/40">
            {/* User Identity Handle */}
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="relative shrink-0">
                <img
                  src={currentUser?.avatar || currentUser?.profileImage || '/default-avatar.png'}
                  alt={currentUser?.name}
                  className="w-10 h-10 rounded-full object-cover ring-2 ring-secondary/20"
                />
              </div>
              <div className="min-w-0">
                <div className="font-title-sm text-sm font-bold text-on-surface truncate">
                  {currentUser?.name || 'Builder'}
                </div>
                <button
                  type="button"
                  onClick={() => setIsUsernameModalOpen(true)}
                  className="inline-flex items-center gap-1 text-xs text-secondary hover:text-secondary/80 font-semibold cursor-pointer group"
                  title="Click to edit chat username"
                >
                  <span>
                    {currentUser?.chatUsername ? `@${currentUser.chatUsername}` : '+ Set @username'}
                  </span>
                  <span className="material-symbols-outlined text-xs group-hover:translate-x-0.5 transition-transform">
                    edit
                  </span>
                </button>
              </div>
            </div>

            {/* "+ New Group" Button */}
            <button
              type="button"
              onClick={handleOpenCreateGroup}
              className="py-2 px-3.5 rounded-xl bg-primary text-on-primary font-title-sm text-xs font-bold hover:bg-surface-tint active:scale-95 transition-all cursor-pointer flex items-center gap-1.5 shadow-xs shrink-0"
              title="Create a WhatsApp-style group with your formed team members"
            >
              <span className="material-symbols-outlined text-base">group_add</span>
              <span>New Group</span>
            </button>
          </div>

          {/* Search Bar */}
          <div className="px-4 py-2.5 border-b border-surface-container-high/40">
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-lg">
                search
              </span>
              <input
                type="text"
                placeholder="Search team groups..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-8 py-2 bg-surface-container rounded-xl text-sm text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-secondary/40 transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface"
                >
                  <span className="material-symbols-outlined text-base">close</span>
                </button>
              )}
            </div>
          </div>

          {/* Groups List */}
          <div className="flex-1 overflow-y-auto divide-y divide-surface-container-high/30">
            {isLoadingGroups ? (
              <div className="p-4 space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-3 animate-pulse">
                    <div className="w-12 h-12 rounded-2xl bg-surface-container-high"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-surface-container-high rounded w-3/4"></div>
                      <div className="h-3 bg-surface-container rounded w-1/2"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredGroups.length === 0 ? (
              <div className="p-8 text-center flex flex-col items-center justify-center h-full text-on-surface-variant">
                <div className="w-16 h-16 rounded-3xl bg-secondary/10 text-secondary flex items-center justify-center mb-3">
                  <span className="material-symbols-outlined text-3xl">diversity_3</span>
                </div>
                <h3 className="font-title-sm text-base font-bold text-on-surface mb-1">
                  {searchQuery ? 'No matching groups' : 'No Team Groups Yet'}
                </h3>
                <p className="font-body-sm text-xs text-outline max-w-xs mb-4">
                  {searchQuery
                    ? 'Try searching with a different team or project name.'
                    : userTeams.length === 0
                    ? 'You have not joined any project or hackathon teams yet. Explore projects to join a team and start chatting!'
                    : 'Create a dedicated chat group for your team to collaborate in real time.'}
                </p>
                {!searchQuery && (
                  userTeams.length === 0 ? (
                    <button
                      type="button"
                      onClick={() => navigate('/projects')}
                      className="py-2.5 px-4 rounded-xl bg-primary text-on-primary font-title-sm text-xs font-bold hover:bg-surface-tint transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
                    >
                      <span className="material-symbols-outlined text-base">explore</span>
                      <span>Explore Projects to Join a Team</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleOpenCreateGroup}
                      className="py-2.5 px-4 rounded-xl bg-secondary text-on-secondary font-title-sm text-xs font-bold hover:bg-secondary/90 transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
                    >
                      <span className="material-symbols-outlined text-base">add</span>
                      <span>Create Team Group</span>
                    </button>
                  )
                )}
              </div>
            ) : (
              filteredGroups.map((grp) => {
                const isSelected = String(grp._id) === String(activeGroupId);
                return (
                  <button
                    key={grp._id}
                    type="button"
                    onClick={() => {
                      setActiveGroupId(grp._id);
                      navigate(`/group-chat/${grp._id}`);
                    }}
                    className={`w-full p-3.5 flex items-center gap-3 text-left transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-secondary/15 border-l-4 border-secondary'
                        : 'hover:bg-surface-container-high/50'
                    }`}
                  >
                    {/* Group Profile Pic */}
                    {renderGroupPic(grp)}

                    {/* Group Metadata */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <span className="font-title-sm text-sm font-bold text-on-surface truncate">
                          {grp.name}
                        </span>
                        <span className="font-label-sm text-[11px] text-outline shrink-0">
                          {formatTime(grp.lastMessage?.createdAt || grp.updatedAt)}
                        </span>
                      </div>

                      {/* Source Team Badge */}
                      <div className="flex items-center gap-1 mb-1">
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-surface-container-high text-on-surface-variant truncate max-w-[160px]">
                          {grp.teamName || 'Team'}
                        </span>
                        {grp.members?.length > 0 && (
                          <span className="text-[10px] text-outline">
                            • {grp.members.length} members
                          </span>
                        )}
                      </div>

                      {/* Last Message Snippet */}
                      <p className="font-body-sm text-xs text-on-surface-variant truncate">
                        {grp.lastMessage?.text ? (
                          <>
                            <span className="font-semibold text-secondary">
                              {grp.lastMessage.senderUsername
                                ? `@${grp.lastMessage.senderUsername}: `
                                : grp.lastMessage.senderName
                                ? `${grp.lastMessage.senderName}: `
                                : ''}
                            </span>
                            {grp.lastMessage.text}
                          </>
                        ) : (
                          'No messages yet'
                        )}
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* =================================================================== */}
        {/* RIGHT COLUMN: Active Chat Conversation Pane */}
        {/* =================================================================== */}
        <div className={`flex-1 flex flex-col bg-background h-full overflow-hidden ${!activeGroupId && 'hidden lg:flex'}`}>
          {!activeGroupId || !activeGroup ? (
            /* WhatsApp Web Style Hero Placeholder */
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-surface-container-lowest/50">
              <div className="w-20 h-20 rounded-3xl bg-secondary/10 text-secondary flex items-center justify-center mb-4 shadow-inner">
                <span className="material-symbols-outlined text-4xl">forum</span>
              </div>
              <h2 className="font-headline-sm text-xl font-bold text-on-surface mb-2">
                BuildCrew Team Group Chat
              </h2>
              <p className="font-body-md text-sm text-on-surface-variant max-w-md mb-6 leading-relaxed">
                Connect and collaborate with your teammates in real-time. Text-only, clutter-free, and restricted exclusively to members of your formed squads.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-xl w-full text-left mb-6">
                <div className="p-3.5 rounded-2xl bg-surface-container-low border border-surface-container-high/60">
                  <div className="flex items-center gap-2 text-secondary font-bold text-xs mb-1">
                    <span className="material-symbols-outlined text-base">verified_user</span>
                    <span>Team-Protected</span>
                  </div>
                  <p className="text-[11px] text-outline">Only verified members of your formed squad can access this group.</p>
                </div>

                <div className="p-3.5 rounded-2xl bg-surface-container-low border border-surface-container-high/60">
                  <div className="flex items-center gap-2 text-secondary font-bold text-xs mb-1">
                    <span className="material-symbols-outlined text-base">alternate_email</span>
                    <span>Builder Handles</span>
                  </div>
                  <p className="text-[11px] text-outline">Set your custom @username so teammates recognize you easily.</p>
                </div>

                <div className="p-3.5 rounded-2xl bg-surface-container-low border border-surface-container-high/60">
                  <div className="flex items-center gap-2 text-secondary font-bold text-xs mb-1">
                    <span className="material-symbols-outlined text-base">cleaning_services</span>
                    <span>Storage Safe</span>
                  </div>
                  <p className="text-[11px] text-outline">Max 500 messages per group with 30-day auto cleanup.</p>
                </div>
              </div>

              {userTeams.length === 0 ? (
                <button
                  type="button"
                  onClick={() => navigate('/projects')}
                  className="py-2.5 px-5 rounded-xl bg-primary text-on-primary font-title-sm text-sm font-bold shadow-md hover:bg-surface-tint active:scale-95 transition-all cursor-pointer flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-lg">explore</span>
                  <span>Explore Projects to Join a Team</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleOpenCreateGroup}
                  className="py-2.5 px-5 rounded-xl bg-primary text-on-primary font-title-sm text-sm font-bold shadow-md hover:bg-surface-tint active:scale-95 transition-all cursor-pointer flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-lg">group_add</span>
                  <span>Create Your Team Group</span>
                </button>
              )}
            </div>
          ) : (
            /* Active Group Chat Thread */
            <>
              {/* Thread Header */}
              <div className="h-16 px-4 bg-surface-container-lowest border-b border-surface-container-high/60 flex items-center justify-between gap-3 shrink-0 shadow-xs">
                <div className="flex items-center gap-3 min-w-0">
                  {/* Mobile Back Button */}
                  <button
                    type="button"
                    onClick={() => {
                      setActiveGroupId(null);
                      setActiveGroup(null);
                      setMessages([]);
                      navigate('/group-chat');
                    }}
                    className="lg:hidden p-1.5 rounded-xl text-on-surface-variant hover:bg-surface-container"
                    aria-label="Back to groups list"
                  >
                    <span className="material-symbols-outlined text-xl">arrow_back</span>
                  </button>

                  {/* Group Avatar */}
                  {renderGroupPic(activeGroup, 'w-10 h-10', 'text-lg')}

                  {/* Group Info Text */}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-title-sm text-sm font-bold text-on-surface truncate">
                        {activeGroup.name}
                      </h3>
                      {isCurrentGroupAdmin && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-secondary/15 text-secondary">
                          Group Admin
                        </span>
                      )}
                    </div>
                    <p className="font-body-sm text-xs text-outline truncate">
                      {activeGroup.members?.length || 0} members • {activeGroup.teamName || 'Team Squad'}
                    </p>
                  </div>
                </div>

                {/* Header Actions */}
                <div className="flex items-center gap-2">
                  {!socketConnected && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold" title="Connection lost. Reconnecting automatically...">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                      Reconnecting...
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => setIsGroupInfoOpen(true)}
                    className="p-2 rounded-xl text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
                    title="View group members & details"
                  >
                    <span className="material-symbols-outlined text-lg">info</span>
                    <span className="hidden sm:inline">Group Info</span>
                  </button>
                </div>
              </div>

              {/* Messages Feed */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-surface-container-lowest/30">
                {isLoadingMessages ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="w-8 h-8 border-3 border-secondary border-t-transparent rounded-full animate-spin"></div>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center p-6 text-on-surface-variant">
                    <div className="w-14 h-14 rounded-2xl bg-secondary/10 text-secondary flex items-center justify-center mb-3">
                      <span className="material-symbols-outlined text-3xl">chat</span>
                    </div>
                    <p className="font-title-sm text-sm font-bold text-on-surface mb-1">
                      Start of #{activeGroup.name}
                    </p>
                    <p className="font-body-sm text-xs text-outline max-w-xs">
                      Send a message to your team. Plain text messages only to keep chats clean and rapid!
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Point 15: Plain chat retention policy notice */}
                    <div className="mx-auto max-w-sm my-1 px-3 py-1.5 rounded-xl bg-surface-container/70 border border-surface-container-high/60 text-center text-[11px] text-outline font-medium flex items-center justify-center gap-1.5 select-none shrink-0">
                      <span className="material-symbols-outlined text-xs text-secondary">history_toggle_off</span>
                      <span>Messages are retained for 30 days or up to 500 messages per conversation. Text only.</span>
                    </div>
                    {groupedMessages.map((item, idx) => {
                    if (item.type === 'date') {
                      return (
                        <div key={`date-${idx}`} className="flex justify-center my-3">
                          <span className="px-3 py-1 rounded-full bg-surface-container text-on-surface-variant font-label-sm text-[11px] font-semibold shadow-2xs">
                            {item.date}
                          </span>
                        </div>
                      );
                    }

                    const msg = item.data;
                    const isOwn = String(msg.senderId?._id || msg.senderId) === currentUserId;
                    const senderName = msg.senderId?.name || 'Teammate';
                    const senderUsername = msg.senderId?.chatUsername;
                    const senderAvatar = msg.senderId?.avatar || msg.senderId?.profileImage || '/default-avatar.png';

                    return (
                      <div
                        key={msg._id || idx}
                        className={`flex items-end gap-2 ${isOwn ? 'justify-end' : 'justify-start'}`}
                      >
                        {/* Teammate Avatar */}
                        {!isOwn && (
                          <img
                            src={senderAvatar}
                            alt={senderName}
                            className="w-7 h-7 rounded-full object-cover shrink-0 mb-1 ring-1 ring-surface-container-high"
                            title={senderName}
                          />
                        )}

                        <div className={`max-w-[78%] sm:max-w-[65%] flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
                          {/* Sender Header for Teammate */}
                          {!isOwn && (
                            <div className="flex items-center gap-1.5 px-1 mb-1 font-label-sm text-[11px]">
                              <span className="font-bold text-secondary">{senderName}</span>
                              {senderUsername && (
                                <span className="text-outline font-mono text-[10px]">@{senderUsername}</span>
                              )}
                            </div>
                          )}

                          {/* Message Bubble */}
                          <div
                            className={`p-3 rounded-2xl break-words text-sm whitespace-pre-wrap leading-relaxed shadow-2xs ${
                              isOwn
                                ? 'bg-primary text-on-primary rounded-br-xs'
                                : 'bg-surface-container-high text-on-surface rounded-bl-xs'
                            } ${msg.pending ? 'opacity-70' : ''}`}
                          >
                            <p>{msg.text}</p>
                            <div
                              className={`flex items-center justify-end gap-1 mt-1 text-[10px] ${
                                isOwn ? 'text-on-primary/70' : 'text-outline'
                              }`}
                            >
                              <span>{formatTime(msg.createdAt)}</span>
                              {isOwn && (
                                <span className="inline-flex items-center ml-0.5">
                                  {renderReceiptTicks(msg)}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
                <div ref={messagesEndRef} />
              </div>

              {/* Bottom Message Input Box (Text Only, Strict 1000 Chars) */}
              <div className="p-3 bg-surface-container-lowest border-t border-surface-container-high/60 shrink-0">
                <form onSubmit={handleSendMessage} className="space-y-1.5">
                  <div className="flex items-center gap-2 bg-surface-container rounded-2xl px-3 py-1.5 border border-surface-container-high/40 focus-within:ring-2 focus-within:ring-secondary/50 focus-within:border-transparent transition-all">
                    <textarea
                      rows={1}
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      placeholder={`Message #${activeGroup.name}... (Shift+Enter for newline)`}
                      maxLength={1000}
                      className="flex-1 bg-transparent text-sm text-on-surface placeholder:text-outline focus:outline-none resize-none max-h-32 py-1.5"
                    />

                    {/* Send Button */}
                    <button
                      type="submit"
                      disabled={!messageText.trim()}
                      className="w-9 h-9 rounded-xl bg-secondary text-on-secondary flex items-center justify-center shrink-0 hover:bg-secondary/90 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer shadow-xs"
                      title={isSending ? 'Sending...' : 'Send message'}
                    >
                      <span className={`material-symbols-outlined text-lg ${isSending ? 'animate-pulse' : ''}`}>
                        {isSending ? 'progress_activity' : 'send'}
                      </span>
                    </button>
                  </div>

                  {/* Character Counter & Safety Policy */}
                  <div className="flex items-center justify-between px-2 text-[11px] text-outline">
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-xs text-secondary">lock</span>
                      <span>Text only • 500-message auto retention</span>
                    </span>
                    <span className={messageText.length > 900 ? 'text-amber-500 font-bold' : ''}>
                      {messageText.length}/1000
                    </span>
                  </div>
                </form>
              </div>
            </>
          )}
        </div>
      </div>

      {/* =================================================================== */}
      {/* MODAL 1: Create Team Group (WhatsApp Style) */}
      {/* =================================================================== */}
      {isCreateGroupOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-surface-container-lowest rounded-3xl max-w-lg w-full max-h-[90vh] flex flex-col border border-surface-container-high/60 shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-surface-container-high/60 flex items-center justify-between bg-surface-container-low/40">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary text-2xl">group_add</span>
                <h3 className="font-headline-sm text-base font-bold text-on-surface">
                  Create Team Group
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateGroupOpen(false)}
                className="w-8 h-8 rounded-xl flex items-center justify-center text-on-surface-variant hover:bg-surface-container cursor-pointer"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            {userTeams.length === 0 ? (
              <div className="p-8 text-center flex flex-col items-center justify-center space-y-4">
                <div className="w-16 h-16 rounded-3xl bg-secondary/10 text-secondary flex items-center justify-center">
                  <span className="material-symbols-outlined text-3xl">diversity_3</span>
                </div>
                <div className="space-y-1">
                  <h4 className="font-title-sm text-base font-bold text-on-surface">
                    Join a Team First
                  </h4>
                  <p className="font-body-sm text-xs text-outline max-w-sm">
                    You have not joined or formed any project teams yet. Team chats are connected to your active projects and teams.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsCreateGroupOpen(false);
                    navigate('/projects');
                  }}
                  className="py-2.5 px-5 rounded-xl bg-primary text-on-primary font-title-sm text-xs font-bold hover:bg-surface-tint transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
                >
                  <span className="material-symbols-outlined text-base">explore</span>
                  <span>Explore Projects to Join a Team</span>
                </button>
              </div>
            ) : (
              <form onSubmit={handleCreateGroupSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
                {/* 1. Select Team Source */}
                <div>
                  <label className="block font-title-sm text-xs font-bold text-on-surface mb-1.5">
                    Select Formed Team <span className="text-error">*</span>
                  </label>
                  <select
                    value={selectedTeamId}
                    onChange={(e) => handleTeamChange(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container border border-surface-container-high/60 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-secondary/40"
                  >
                    {userTeams.map((t) => (
                      <option key={t.teamId} value={t.teamId}>
                        {t.name} ({t.type} • {t.isLead ? 'Lead' : 'Member'})
                      </option>
                    ))}
                  </select>
                </div>

              {/* 2. Group Name */}
              <div>
                <label className="block font-title-sm text-xs font-bold text-on-surface mb-1.5">
                  Group Name <span className="text-error">*</span>
                </label>
                <input
                  type="text"
                  required
                  maxLength={60}
                  placeholder="e.g. SIH Core Team, Frontend Sync"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container border border-surface-container-high/60 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-secondary/40"
                />
              </div>

              {/* 3. Group Profile Picture (The Only Media Permitted) */}
              <div>
                <label className="block font-title-sm text-xs font-bold text-on-surface mb-1.5">
                  Group Profile Picture
                </label>
                <p className="font-body-sm text-xs text-outline mb-2">
                  Choose an icon theme or provide an image link:
                </p>

                {/* Preset Avatar Selection */}
                <div className="grid grid-cols-4 sm:grid-cols-8 gap-2 mb-3">
                  {GROUP_AVATAR_PRESETS.map((preset) => {
                    const isSelected = selectedAvatarPreset.id === preset.id && !customAvatarUrl;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => {
                          setSelectedAvatarPreset(preset);
                          setCustomAvatarUrl('');
                        }}
                        className={`w-10 h-10 rounded-xl bg-gradient-to-tr ${preset.bg} text-white flex items-center justify-center transition-all cursor-pointer ${
                          isSelected ? 'ring-3 ring-secondary scale-105 shadow-md' : 'opacity-70 hover:opacity-100'
                        }`}
                        title={preset.label}
                      >
                        <span className="material-symbols-outlined text-lg">{preset.icon}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Custom Profile Pic URL option */}
                <input
                  type="url"
                  placeholder="Or enter custom group profile picture image URL..."
                  value={customAvatarUrl}
                  onChange={(e) => setCustomAvatarUrl(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-surface-container text-xs text-on-surface border border-surface-container-high/60 focus:outline-none focus:ring-2 focus:ring-secondary/40"
                />
              </div>

              {/* 4. Select Teammates Checklist */}
              <div>
                <label className="block font-title-sm text-xs font-bold text-on-surface mb-1">
                  Add Teammates to Group
                </label>
                <p className="font-body-sm text-xs text-outline mb-2">
                  Select which members of this team should be added to the chat group:
                </p>

                {(() => {
                  const currentTeam = userTeams.find((t) => t.teamId === selectedTeamId);
                  const availableMembers = (currentTeam?.members || []).filter(
                    (m) => String(m._id || m) !== currentUserId
                  );

                  if (availableMembers.length === 0) {
                    return (
                      <div className="p-3 rounded-xl bg-surface-container text-xs text-on-surface-variant">
                        No other members in this team yet. You will be the sole member for now and can add teammates once they join!
                      </div>
                    );
                  }

                  return (
                    <div className="max-h-40 overflow-y-auto rounded-xl bg-surface-container p-2 space-y-1.5 border border-surface-container-high/60">
                      {availableMembers.map((member) => {
                        const mId = String(member._id || member);
                        const isChecked = selectedMemberIds.includes(mId);
                        return (
                          <label
                            key={mId}
                            className="flex items-center gap-3 p-2 rounded-lg hover:bg-surface-container-high cursor-pointer transition-colors"
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => toggleMemberSelection(mId)}
                              className="rounded text-secondary focus:ring-secondary w-4 h-4 cursor-pointer"
                            />
                            <img
                              src={member.avatar || member.profileImage || '/default-avatar.png'}
                              alt={member.name}
                              className="w-7 h-7 rounded-full object-cover"
                            />
                            <div className="min-w-0 flex-1">
                              <span className="font-title-sm text-xs font-bold text-on-surface truncate block">
                                {member.name}
                              </span>
                              <span className="text-[10px] text-outline">
                                {member.chatUsername ? `@${member.chatUsername} • ` : ''}
                                {member.roleTitle || 'Builder'}
                              </span>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>

              {/* Actions */}
              <div className="pt-3 border-t border-surface-container-high/60 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsCreateGroupOpen(false)}
                  className="px-4 py-2 rounded-xl text-on-surface-variant hover:bg-surface-container text-sm font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingGroup || !groupName.trim()}
                  className="px-5 py-2.5 rounded-xl bg-primary text-on-primary font-title-sm text-sm font-bold shadow-md hover:bg-surface-tint active:scale-95 disabled:opacity-40 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  {isCreatingGroup ? (
                    <>
                      <div className="w-4 h-4 border-2 border-on-primary border-t-transparent rounded-full animate-spin"></div>
                      <span>Creating...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-lg">check</span>
                      <span>Create Group</span>
                    </>
                  )}
                </button>
              </div>
            </form>
            )}
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL 2: Create / Edit Chat Username */}
      {/* =================================================================== */}
      {isUsernameModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-surface-container-lowest rounded-3xl max-w-md w-full border border-surface-container-high/60 shadow-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary text-2xl">alternate_email</span>
                <h3 className="font-headline-sm text-base font-bold text-on-surface">
                  Set Your Chat Username
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsUsernameModalOpen(false)}
                className="w-8 h-8 rounded-xl flex items-center justify-center text-on-surface-variant hover:bg-surface-container cursor-pointer"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            <p className="font-body-sm text-xs text-outline mb-4">
              Your unique handle allows teammates to easily tag and identify you in group chats (e.g. <span className="text-secondary font-mono">@manu_dev</span>).
            </p>

            <form onSubmit={handleSaveUsername} className="space-y-4">
              <div>
                <label className="block font-title-sm text-xs font-bold text-on-surface mb-1.5">
                  Chat Username Handle
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-secondary font-bold font-mono text-sm">@</span>
                  <input
                    type="text"
                    required
                    placeholder="builder_handle"
                    value={usernameInput}
                    onChange={(e) => {
                      setUsernameInput(e.target.value);
                      setUsernameError('');
                    }}
                    className="w-full pl-8 pr-3 py-2.5 rounded-xl bg-surface-container border border-surface-container-high/60 font-mono text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-secondary/40"
                  />
                </div>
                {usernameError && (
                  <p className="text-xs text-error font-medium mt-1.5 flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">error</span>
                    <span>{usernameError}</span>
                  </p>
                )}
                <p className="text-[11px] text-outline mt-1.5">
                  Must be 3-25 alphanumeric characters or underscores.
                </p>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsUsernameModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-on-surface-variant hover:bg-surface-container text-sm font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingUsername || !usernameInput.trim()}
                  className="px-5 py-2.5 rounded-xl bg-secondary text-on-secondary font-title-sm text-sm font-bold shadow-md hover:bg-secondary/90 active:scale-95 disabled:opacity-40 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  {isSavingUsername ? 'Saving...' : 'Save Username'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* DRAWER: Group Info & Member Management */}
      {/* =================================================================== */}
      {isGroupInfoOpen && activeGroup && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-md bg-surface-container-lowest h-full border-l border-surface-container-high/60 shadow-2xl flex flex-col overflow-hidden animate-slideLeft">
            {/* Drawer Header */}
            <div className="p-4 border-b border-surface-container-high/60 flex items-center justify-between bg-surface-container-low/40">
              <h3 className="font-headline-sm text-base font-bold text-on-surface">Group Information</h3>
              <button
                type="button"
                onClick={() => setIsGroupInfoOpen(false)}
                className="w-8 h-8 rounded-xl flex items-center justify-center text-on-surface-variant hover:bg-surface-container cursor-pointer"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            {/* Drawer Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Profile Card */}
              <div className="flex flex-col items-center text-center p-4 rounded-3xl bg-surface-container-low border border-surface-container-high/60">
                {renderGroupPic(activeGroup, 'w-20 h-20', 'text-3xl')}
                <h4 className="font-title-sm text-lg font-bold text-on-surface mt-3">
                  {activeGroup.name}
                </h4>
                <p className="font-label-sm text-xs text-secondary font-semibold mt-0.5">
                  {activeGroup.teamName} ({activeGroup.teamType || 'Team'})
                </p>
                {activeGroup.description && (
                  <p className="font-body-sm text-xs text-outline mt-2 max-w-xs">
                    {activeGroup.description}
                  </p>
                )}
              </div>

              {/* Members Section */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h5 className="font-title-sm text-xs font-bold text-on-surface uppercase tracking-wider">
                    Squad Members ({activeGroup.members?.length || 0})
                  </h5>
                  {isCurrentGroupAdmin && (
                    <button
                      type="button"
                      onClick={handleLoadEligibleAddMembers}
                      disabled={isLoadingEligible}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-secondary/10 hover:bg-secondary/20 text-secondary text-[11px] font-bold transition-colors cursor-pointer disabled:opacity-50"
                      title="Add eligible team members to this group"
                    >
                      <span className="material-symbols-outlined text-sm">person_add</span>
                      <span>{isLoadingEligible ? 'Loading...' : 'Add Members'}</span>
                    </button>
                  )}
                </div>

                <div className="divide-y divide-surface-container-high/40 rounded-2xl bg-surface-container-low border border-surface-container-high/60 overflow-hidden">
                  {(activeGroup.members || []).map((m) => {
                    const isGroupCreator =
                      activeGroup.admin &&
                      String(activeGroup.admin._id || activeGroup.admin) === String(m._id || m);
                    return (
                      <div key={m._id} className="p-3 flex items-center gap-3">
                        <img
                          src={m.avatar || m.profileImage || '/default-avatar.png'}
                          alt={m.name}
                          className="w-9 h-9 rounded-full object-cover"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="font-title-sm text-xs font-bold text-on-surface truncate">
                              {m.name}
                            </span>
                            {isGroupCreator && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-secondary/15 text-secondary">
                                Admin
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-outline font-mono block truncate">
                            {m.chatUsername ? `@${m.chatUsername}` : m.college || m.roleTitle}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Add Members Panel (admin only, eligible team members only) */}
              {isCurrentGroupAdmin && eligibleAddMembers.length > 0 && (
                <div className="p-4 rounded-2xl bg-surface-container-low border border-surface-container-high/60 space-y-3">
                  <div className="flex items-center gap-2 text-secondary font-bold text-xs">
                    <span className="material-symbols-outlined text-base">person_add</span>
                    <span>Add Members ({eligibleAddMembers.length} eligible)</span>
                  </div>
                  <p className="text-[11px] text-outline">
                    Only members of the linked team can be added. Arbitrary users are not permitted.
                  </p>
                  <div className="max-h-44 overflow-y-auto space-y-1.5">
                    {eligibleAddMembers.map((m) => {
                      const mId = String(m._id || m);
                      const checked = addMemberIds.includes(mId);
                      return (
                        <label
                          key={mId}
                          className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-surface-container-high/60 cursor-pointer transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleAddMemberSelection(mId)}
                            className="rounded text-secondary focus:ring-secondary w-4 h-4 cursor-pointer"
                          />
                          <img
                            src={m.avatar || m.profileImage || '/default-avatar.png'}
                            alt={m.name}
                            className="w-7 h-7 rounded-full object-cover"
                          />
                          <span className="font-title-sm text-xs font-bold text-on-surface truncate flex-1">
                            {m.name}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                  <button
                    type="button"
                    onClick={handleAddMembersSubmit}
                    disabled={addMemberIds.length === 0 || isAddingMembers}
                    className="w-full py-2 rounded-xl bg-secondary text-on-secondary text-xs font-bold hover:bg-secondary/90 disabled:opacity-40 transition-all cursor-pointer"
                  >
                    {isAddingMembers ? 'Adding...' : `Add ${addMemberIds.length} Member${addMemberIds.length === 1 ? '' : 's'}`}
                  </button>
                </div>
              )}
              {isCurrentGroupAdmin && !isLoadingEligible && eligibleAddMembers.length === 0 && activeGroup.teamId && (
                <p className="text-[11px] text-outline px-1">
                  All eligible team members are already in this group. New team members gain access automatically.
                </p>
              )}

              {/* Chat Governance Notice */}
              <div className="p-4 rounded-2xl bg-surface-container-low border border-surface-container-high/60 space-y-2">
                <div className="flex items-center gap-2 text-secondary font-bold text-xs">
                  <span className="material-symbols-outlined text-base">shield</span>
                  <span>Chat Privacy & Limits</span>
                </div>
                <ul className="text-[11px] text-outline space-y-1 list-disc list-inside">
                  <li>Messages are strictly text-only (max 1000 characters).</li>
                  <li>No file/photo/video uploads allowed to protect bandwidth and storage.</li>
                  <li>Oldest messages are pruned automatically when exceeding 500 messages.</li>
                  <li>Messages auto-expire after 30 days.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
