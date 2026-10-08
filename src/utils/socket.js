import { io } from 'socket.io-client';
import { getToken } from '../api/client';

let socketInstance = null;
let currentToken = null;

const getSocketUrl = () => {
  if (import.meta.env.VITE_SOCKET_URL) {
    return import.meta.env.VITE_SOCKET_URL;
  }
  const apiUrl = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL;
  if (apiUrl) {
    const base = apiUrl.replace(/\/api\/?$/, '');
    // A relative API base (e.g. '/api' on a single-domain deployment) has no
    // host for Socket.IO to connect to, so use the page origin instead.
    if (!base || !/^https?:\/\//i.test(base)) {
      return typeof window !== 'undefined' ? window.location.origin : base;
    }
    return base;
  }
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname || 'localhost';
    const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:';
    return `${protocol}//${hostname}:5000`;
  }
  return 'http://localhost:5000';
};

/**
 * Returns an authenticated Socket.IO singleton instance
 */
export function getSocket() {
  const token = getToken();

  // If token has changed, re-initialize
  if (socketInstance && currentToken !== token) {
    socketInstance.disconnect();
    socketInstance = null;
  }

  if (!socketInstance) {
    currentToken = token;
    socketInstance = io(getSocketUrl(), {
      auth: { token },
      autoConnect: true,
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 10000,
    });

    socketInstance.on('connect_error', (err) => {
      // Quietly log connection warning without throwing or polluting console
      if (typeof console !== 'undefined' && console.debug) {
        console.debug('[Socket.IO] Offline or reconnecting:', err.message);
      }
    });
  } else {
    if (token) {
      socketInstance.auth = { token };
    }
    if (!socketInstance.connected) {
      socketInstance.connect();
    }
  }

  return socketInstance;
}

/**
 * Emit delivery receipt for incoming messages (Point 4)
 */
export function emitDeliveredReceipt(messageIds) {
  if (!messageIds || (Array.isArray(messageIds) && messageIds.length === 0)) return;
  const s = getSocket();
  const ids = Array.isArray(messageIds) ? messageIds : [messageIds];
  if (s && s.connected) {
    s.emit('message_delivered', { messageIds: ids });
  }
}

/**
 * Emit read receipt when conversation is opened and viewed (Point 4)
 */
export function emitReadReceipt(conversationId, messageIds) {
  if (!conversationId && (!messageIds || messageIds.length === 0)) return;
  const s = getSocket();
  if (s && s.connected) {
    s.emit('conversation_read', { conversationId, messageIds });
  }
}

/**
 * Disconnects socket instance (e.g. on logout)
 */
export function disconnectSocket() {
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
    currentToken = null;
  }
}

