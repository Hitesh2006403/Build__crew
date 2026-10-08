import { useState, useEffect, useRef, useCallback } from 'react';
import { getSocket } from '../utils/socket';
import { chatApi } from '../api/chat';

export default function TeamChatModal({ team, currentUser, isOpen, onClose }) {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [teamDetails, setTeamDetails] = useState(null);
  const [showMembers, setShowMembers] = useState(false);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const teamRef = useRef(team);
  teamRef.current = team;

  const teamId = team?._id || team?.id;
  const currentUserId = String(currentUser?._id || currentUser?.id || '');
  const [socketConnected, setSocketConnected] = useState(true);

  const scrollToBottom = useCallback((smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
  }, []);

  // Fetch chat history from MongoDB and setup Socket.IO room subscription
  // Depends only on isOpen/teamId so object identity changes don't refetch history.
  useEffect(() => {
    if (!isOpen || !teamId) return;

    let isMounted = true;
    const socket = getSocket();
    const fallbackTeam = teamRef.current;

    const fetchHistory = async () => {
      setIsLoading(true);
      setLoadError(null);
      setSendError(null);
      try {
        const data = await chatApi.getTeamMessages(teamId);
        if (!isMounted) return;
        setMessages(data.messages || []);
        if (data.teamName || data.members) {
          setTeamDetails({
            teamName: data.teamName || fallbackTeam?.teamName || fallbackTeam?.title,
            members: data.members || fallbackTeam?.members || [],
          });
        }
      } catch (err) {
        if (!isMounted) return;
        console.error('Failed to load chat history:', err);
        setLoadError(err.message || 'Could not load chat history.');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchHistory().then(() => {
      if (isMounted) {
        setTimeout(() => scrollToBottom(false), 50);
      }
    });

    // 2. Join Socket.IO team room
    socket.emit('join_team', { teamId }, (response) => {
      if (response?.error) {
        if (isMounted) {
          setLoadError(response.error);
        }
      }
    });
    socket.emit('join-chat', teamId);

    const handleConnect = () => {
      if (!isMounted) return;
      setSocketConnected(true);
      socket.emit('join_team', { teamId }, (response) => {
        if (response?.error && isMounted) {
          setLoadError(response.error);
        }
      });
      socket.emit('join-chat', teamId);
    };
    const handleDisconnect = () => { if (isMounted) setSocketConnected(false); };
    setSocketConnected(Boolean(socket.connected));
    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);

    // 3. Listen for real-time incoming messages broadcasted via Socket.IO
    const handleNewMessage = (payload) => {
      const incomingMessage = payload?.message || payload;
      if (!isMounted || !incomingMessage?._id) return;
      const targetTeamId = payload?.teamId || payload?.chatId || incomingMessage?.teamId || incomingMessage?.chatId;
      if (!targetTeamId || String(targetTeamId) === String(teamId)) {
        setMessages((prev) => {
          if (prev.some((m) => String(m._id) === String(incomingMessage._id))) {
            return prev.map((m) => (String(m._id) === String(incomingMessage._id) ? incomingMessage : m));
          }
          const incomingSender = String(
            typeof incomingMessage.senderId === 'object' && incomingMessage.senderId !== null
              ? incomingMessage.senderId._id || incomingMessage.senderId.id || incomingMessage.senderId
              : incomingMessage.senderId || ''
          );
          const pendingIdx = prev.findIndex(
            (m) =>
              String(m._id || '').startsWith('temp-') &&
              m.text === incomingMessage.text &&
              String(
                typeof m.senderId === 'object' && m.senderId !== null
                  ? m.senderId._id || m.senderId.id || m.senderId
                  : m.senderId || ''
              ) === incomingSender
          );
          if (pendingIdx !== -1) {
            const next = [...prev];
            next[pendingIdx] = incomingMessage;
            return next;
          }
          return [...prev, incomingMessage];
        });

        // Report delivery & read receipt if this incoming message is from another teammate
        const incomingSenderId = String(
          typeof incomingMessage.senderId === 'object' && incomingMessage.senderId !== null
            ? incomingMessage.senderId._id || incomingMessage.senderId.id || incomingMessage.senderId
            : incomingMessage.senderId || ''
        );
        if (incomingSenderId !== currentUserId) {
          socket.emit('message_delivered', { messageId: incomingMessage._id });
          socket.emit('conversation_read', { conversationId: teamId, messageIds: [incomingMessage._id] });
          chatApi.markRead(teamId, [incomingMessage._id]).catch(() => {});
        }

        setTimeout(() => {
          if (isMounted) scrollToBottom(true);
        }, 50);
      }
    };

    // 4. Listen for live receipt updates (Point 4: update sender live)
    const handleReceiptUpdated = (receipt) => {
      if (!receipt?.messageId || !isMounted) return;
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

    socket.on('new_message', handleNewMessage);
    socket.on('receive-message', handleNewMessage);
    socket.on('receive_message', handleNewMessage);
    socket.on('new_group_message', handleNewMessage);
    socket.on('receipt_updated', handleReceiptUpdated);

    // Mark conversation read on initial open
    socket.emit('conversation_read', { conversationId: teamId });
    chatApi.markRead(teamId).catch(() => {});

    // Focus input field when chat opens
    setTimeout(() => {
      inputRef.current?.focus();
    }, 200);

    return () => {
      isMounted = false;
      socket.emit('leave_team', { teamId });
      socket.emit('leave-chat', teamId);
      socket.off('new_message', handleNewMessage);
      socket.off('receive-message', handleNewMessage);
      socket.off('receive_message', handleNewMessage);
      socket.off('new_group_message', handleNewMessage);
      socket.off('receipt_updated', handleReceiptUpdated);
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
    };
  }, [isOpen, teamId, currentUserId, scrollToBottom]);

  // Fast polling fallback (always on): Socket.IO needs a persistent Node
  // process, but serverless hosting cannot hold WebSockets. Polling merges
  // new messages by _id so both sides see messages without refresh.
  useEffect(() => {
    if (!isOpen || !teamId) return;
    let cancelled = false;
    let inFlight = false;
    const poll = async () => {
      if (inFlight) return;
      if (typeof document !== 'undefined' && document.hidden) return;
      inFlight = true;
      try {
        const data = await chatApi.getTeamMessages(teamId);
        if (cancelled || !data?.messages) return;
        setMessages((prev) => {
          const known = new Set(prev.map((m) => String(m._id)));
          const fresh = data.messages.filter((m) => m?._id && !known.has(String(m._id)));
          if (!fresh.length) return prev;
          let next = prev;
          for (const real of fresh) {
            const realSender = String(
              typeof real.senderId === 'object' && real.senderId !== null
                ? real.senderId._id || real.senderId.id || real.senderId
                : real.senderId || ''
            );
            const pendingIdx = next.findIndex(
              (m) =>
                String(m._id || '').startsWith('temp-') &&
                m.text === real.text &&
                String(
                  typeof m.senderId === 'object' && m.senderId !== null
                    ? m.senderId._id || m.senderId.id || m.senderId
                    : m.senderId || ''
                ) === realSender
            );
            if (pendingIdx !== -1) {
              next = [...next.slice(0, pendingIdx), ...next.slice(pendingIdx + 1)];
            }
          }
          return [...next, ...fresh];
        });
      } catch {
        // Silent: next tick retries.
      } finally {
        inFlight = false;
      }
    };
    const timer = setInterval(poll, 2500);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [isOpen, teamId]);

  // Point 4: Exact text-only receipt ticks renderer
  const renderReceiptTicks = (msg) => {
    // 1. Clock while sending (pending/optimistic)
    if (msg.pending || String(msg._id || '').startsWith('temp-')) {
      return (
        <span className="material-symbols-outlined text-[13px] text-outline select-none leading-none" title="Sending...">
          schedule
        </span>
      );
    }

    const recipients = Array.isArray(msg.recipients) ? msg.recipients : [];

    // If no recipients snapshot: show single grey tick
    if (recipients.length === 0) {
      return (
        <span className="material-symbols-outlined text-[13px] text-outline/80 select-none leading-none" title="Saved by server">
          check
        </span>
      );
    }

    const allRead = recipients.length > 0 && recipients.every((r) => r.read);
    const allDelivered = recipients.length > 0 && recipients.every((r) => r.delivered || r.read);

    // 4. Two blue ticks when every intended recipient opens conversation and sees it
    if (allRead) {
      return (
        <span className="material-symbols-outlined text-[14px] text-sky-400 font-bold select-none leading-none" title="Read by all teammates">
          done_all
        </span>
      );
    }

    // 3. Two grey ticks when every intended recipient receives it
    if (allDelivered) {
      return (
        <span className="material-symbols-outlined text-[14px] text-outline/80 select-none leading-none" title="Delivered to all teammates">
          done_all
        </span>
      );
    }

    // 2. One grey tick after server saves it
    return (
      <span className="material-symbols-outlined text-[13px] text-outline/80 select-none leading-none" title="Saved by server">
        check
      </span>
    );
  };

  // Send message handler (optimistic: bubble appears instantly)
  const handleSendMessage = async (e) => {
    if (e) e.preventDefault();
    const trimmed = inputText.trim();

    if (!trimmed) return;

    if (trimmed.length > 1000) {
      setSendError('Message cannot exceed 1000 characters.');
      return;
    }

    const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const optimisticMessage = {
      _id: tempId,
      teamId,
      text: trimmed,
      senderId: {
        _id: currentUserId,
        name: currentUser?.name || 'You',
        avatar: currentUser?.avatar || currentUser?.profileImage || '',
        profileImage: currentUser?.profileImage || currentUser?.avatar || '',
      },
      createdAt: new Date().toISOString(),
      pending: true,
    };

    setMessages((prev) => [...prev, optimisticMessage]);
    setInputText('');
    setIsSending(true);
    setSendError(null);

    const replaceTempWithReal = (realMessage) => {
      if (!realMessage?._id) return;
      setMessages((prev) => {
        if (prev.some((m) => String(m._id) === String(realMessage._id))) {
          return prev.filter((m) => String(m._id) !== String(tempId));
        }
        return prev.map((m) => (String(m._id) === String(tempId) ? realMessage : m));
      });
    };

    const removeTempAndRestore = () => {
      setMessages((prev) => prev.filter((m) => String(m._id) !== String(tempId)));
      setInputText(trimmed);
    };

    const socket = getSocket();

    // Primary real-time flow: send via Socket.IO with acknowledgment
    if (socket && socket.connected) {
      socket.timeout(3000).emit('send_message', { teamId, text: trimmed }, (err, response) => {
        if (err || response?.error || !response?.success) {
          console.warn('[Socket.IO] Send failed, trying REST fallback:', err || response?.error);
          // Fallback to REST API if socket acknowledgment timed out
          fallbackRestSend(trimmed, replaceTempWithReal, removeTempAndRestore);
        } else {
          replaceTempWithReal(response.message || response?.message);
          setSendError(null);
          setIsSending(false);
        }
      });
    } else {
      // If socket is disconnected, use REST API directly
      fallbackRestSend(trimmed, replaceTempWithReal, removeTempAndRestore);
    }
  };

  const fallbackRestSend = async (textToSend, replaceTemp, removeTemp) => {
    try {
      const res = await chatApi.sendMessage(teamId, textToSend);
      if (res?.message) {
        if (replaceTemp) {
          replaceTemp(res.message);
        } else {
          setMessages((prev) => {
            if (prev.some((m) => String(m._id) === String(res.message._id))) {
              return prev;
            }
            return [...prev, res.message];
          });
        }
        setInputText('');
        setSendError(null);
      } else {
        if (removeTemp) removeTemp();
        else setInputText(textToSend);
        setSendError('Message could not be sent. Please try again.');
      }
    } catch (err) {
      console.error('REST chat send error:', err);
      if (removeTemp) removeTemp();
      else setInputText(textToSend);
      setSendError('Message could not be sent. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!isOpen || !team) return null;

  const displayTitle = teamDetails?.teamName || team.teamName || team.title || 'Team Chat';
  const membersList = teamDetails?.members || team.members || [];
  const memberCount = membersList.length > 0 ? membersList.length : (team.filledCount || 1);

  const formatTime = (isoString) => {
    if (!isoString) return '';
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-primary-container/40 backdrop-blur-sm animate-modal">
      <div className="fixed inset-0" onClick={onClose} />

      <div className="relative w-full max-w-2xl h-[90vh] max-h-[700px] flex flex-col bg-surface-container-lowest rounded-2xl shadow-2xl border border-surface-container-high overflow-hidden z-10">
        {/* Top Header */}
        <div className="px-space-md py-3 bg-surface-container-low border-b border-surface-container-high/60 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-space-sm min-w-0">
            <div className="w-10 h-10 rounded-xl bg-secondary/10 text-secondary flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-xl">forum</span>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="font-headline-sm text-base font-bold text-on-surface truncate">
                  {displayTitle}
                </h2>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold shrink-0 ${socketConnected ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-100 text-amber-800'}`}>
                  <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${socketConnected ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                  {socketConnected ? 'Live Chat' : 'Reconnecting...'}
                </span>
              </div>
              <p className="font-body-sm text-xs text-on-surface-variant truncate">
                Team Chat • {memberCount} {memberCount === 1 ? 'member' : 'members'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setShowMembers(!showMembers)}
              className={`p-2 rounded-xl transition-colors cursor-pointer flex items-center gap-1 text-xs font-semibold ${
                showMembers
                  ? 'bg-secondary text-on-secondary'
                  : 'bg-surface-container text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
              }`}
              title="Toggle Team Members"
            >
              <span className="material-symbols-outlined text-lg">group</span>
              <span className="hidden sm:inline">Members</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
              aria-label="Close Chat"
            >
              <span className="material-symbols-outlined text-xl">close</span>
            </button>
          </div>
        </div>

        {/* Expandable Team Members Panel */}
        {showMembers && (
          <div className="bg-surface-container-low/70 border-b border-surface-container-high/60 p-space-md shrink-0 animate-fadeIn">
            <div className="flex items-center justify-between mb-2">
              <span className="font-label-sm text-xs uppercase tracking-wider text-outline font-bold">
                Team Roster ({membersList.length})
              </span>
              <span className="text-[11px] text-outline">All team members can chat here</span>
            </div>
            <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto pr-1">
              {membersList.length === 0 ? (
                <span className="text-xs text-on-surface-variant">No member profiles loaded.</span>
              ) : (
                membersList.map((m, idx) => {
                  const mId = m._id || m.id || idx;
                  const mName = m.name || 'Member';
                  const mAvatar = m.avatar || m.profileImage;
                  const isCurrent = String(mId) === currentUserId;

                  return (
                    <div
                      key={mId}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-container border border-surface-container-high/60 text-xs text-on-surface"
                    >
                      <div className="relative shrink-0">
                        {mAvatar ? (
                          <img
                            src={mAvatar}
                            alt=""
                            className="w-5 h-5 rounded-full object-cover"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        ) : null}
                        <div
                          style={{ display: mAvatar ? 'none' : 'flex' }}
                          className="w-5 h-5 rounded-full bg-secondary/15 text-secondary font-bold text-[10px] items-center justify-center shrink-0"
                        >
                          {mName.charAt(0).toUpperCase()}
                        </div>
                      </div>
                      <span className="font-medium truncate max-w-[120px]">
                        {mName} {isCurrent ? '(You)' : ''}
                      </span>
                      {m.roleTitle && (
                        <span className="text-[10px] text-outline truncate max-w-[80px]">
                          • {m.roleTitle}
                        </span>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Chat Messages Body */}
        <div className="flex-1 p-space-md overflow-y-auto space-y-3 bg-surface-container-lowest flex flex-col">
          {isLoading ? (
            <div className="flex-1 flex flex-col items-center justify-center text-on-surface-variant space-y-2">
              <span className="material-symbols-outlined text-3xl animate-spin text-secondary">
                progress_activity
              </span>
              <p className="font-body-sm text-xs">Loading team chat history...</p>
            </div>
          ) : loadError ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-space-md space-y-2">
              <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center">
                <span className="material-symbols-outlined text-2xl">lock</span>
              </div>
              <h3 className="font-headline-sm text-sm font-bold text-on-surface">{loadError}</h3>
              <p className="font-body-sm text-xs text-on-surface-variant max-w-xs">
                You must be an accepted member or leader of this team to access team messages.
              </p>
              <button
                type="button"
                onClick={onClose}
                className="mt-2 py-1.5 px-4 rounded-xl bg-surface-container hover:bg-surface-container-high text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-space-lg text-on-surface-variant space-y-2 my-auto">
              <div className="w-14 h-14 rounded-2xl bg-surface-container-low flex items-center justify-center text-secondary mb-1">
                <span className="material-symbols-outlined text-3xl">chat</span>
              </div>
              <p className="font-headline-sm text-sm font-bold text-on-surface">No messages yet</p>
              <p className="font-body-sm text-xs max-w-sm text-on-surface-variant">
                Say hello to your squad! Messages sent here are instantly visible to all team members.
              </p>
            </div>
          ) : (
            <>
              {/* Point 15: Plainly explain chat retention policy */}
              <div className="mx-auto max-w-sm my-1 px-3 py-1.5 rounded-xl bg-surface-container/70 border border-surface-container-high/60 text-center text-[11px] text-outline font-medium flex items-center justify-center gap-1.5 select-none shrink-0">
                <span className="material-symbols-outlined text-xs text-secondary">history_toggle_off</span>
                <span>Messages are retained for 30 days or up to 500 messages. Text only.</span>
              </div>
              {messages.map((msg, index) => {
              const senderObj = typeof msg.senderId === 'object' && msg.senderId !== null ? msg.senderId : {};
              const senderId = String(senderObj._id || senderObj.id || msg.senderId || '');
              const isMe = senderId === currentUserId;
              const senderName = isMe ? 'You' : (senderObj.name || 'Teammate');
              const senderAvatar = isMe
                ? (currentUser?.avatar || currentUser?.profileImage)
                : (senderObj.avatar || senderObj.profileImage || '');

              return (
                <div
                  key={msg._id || index}
                  className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-[85%] sm:max-w-[75%] ${
                    isMe ? 'self-end' : 'self-start'
                  }`}
                >
                  {/* Sender Header for Incoming Messages */}
                  {!isMe && (
                    <div className="flex items-center gap-1.5 mb-1 px-1">
                      <div className="relative shrink-0">
                        {senderAvatar ? (
                          <img
                            src={senderAvatar}
                            alt=""
                            className="w-4 h-4 rounded-full object-cover"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        ) : null}
                        <div
                          style={{ display: senderAvatar ? 'none' : 'flex' }}
                          className="w-4 h-4 rounded-full bg-secondary/15 text-secondary font-bold text-[9px] items-center justify-center shrink-0"
                        >
                          {senderName.charAt(0).toUpperCase()}
                        </div>
                      </div>
                      <span className="font-title-sm text-xs font-semibold text-secondary">
                        {senderName}
                      </span>
                    </div>
                  )}

                  {/* Message Bubble */}
                  <div
                    className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap break-words ${
                      isMe
                        ? 'bg-primary text-on-primary rounded-br-xs shadow-xs'
                        : 'bg-surface-container text-on-surface rounded-bl-xs border border-surface-container-high/40'
                    }`}
                  >
                    {msg.text}
                  </div>

                  {/* Timestamp & Point 4 Receipt Ticks */}
                  <div className={`flex items-center gap-1 mt-0.5 px-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <span className="text-[10px] text-outline font-medium">
                      {isMe ? 'You • ' : ''}
                      {formatTime(msg.createdAt)}
                    </span>
                    {isMe && (
                      <span className="inline-flex items-center ml-0.5">
                        {renderReceiptTicks(msg)}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </>
        )}
        <div ref={messagesEndRef} />
        </div>

        {/* Clear Send Error Alert */}
        {sendError && (
          <div className="mx-space-md mb-2 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-center justify-between shrink-0 animate-fadeIn">
            <div className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-base text-rose-600">error</span>
              <span>{sendError}</span>
            </div>
            <button
              type="button"
              onClick={() => setSendError(null)}
              className="p-1 hover:bg-rose-100 rounded-lg text-rose-700 cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm">close</span>
            </button>
          </div>
        )}

        {/* Message Input Footer */}
        <form
          onSubmit={handleSendMessage}
          className="p-space-md bg-surface-container-low border-t border-surface-container-high/60 shrink-0"
        >
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <input
                ref={inputRef}
                type="text"
                value={inputText}
                onChange={(e) => {
                  setInputText(e.target.value);
                  if (sendError) setSendError(null);
                }}
                onKeyDown={handleKeyDown}
                disabled={isLoading || Boolean(loadError)}
                maxLength={1000}
                placeholder={
                  loadError
                    ? 'Chat unavailable'
                    : 'Type a message... (Press Enter to send)'
                }
                className="w-full py-2.5 pl-3.5 pr-14 rounded-xl bg-surface-container-lowest border border-surface-container-high text-sm text-on-surface placeholder:text-outline focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary disabled:opacity-50 transition-all"
              />
              {inputText.length > 800 && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-outline font-mono">
                  {1000 - inputText.length}
                </span>
              )}
            </div>

            <button
              type="submit"
              disabled={!inputText.trim() || isLoading || Boolean(loadError)}
              className="py-2.5 px-4 rounded-xl bg-primary text-on-primary hover:bg-surface-tint font-title-sm text-xs font-bold transition-all cursor-pointer shadow-xs disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 shrink-0 active:scale-[0.98]"
            >
              {isSending ? (
                <>
                  <span className="material-symbols-outlined text-sm animate-spin">
                    progress_activity
                  </span>
                  <span>Sending</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-sm">send</span>
                  <span>Send</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
