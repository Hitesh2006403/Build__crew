import { apiClient } from './client';

export const chatApi = {
  /**
   * Fetches all chat groups current user is a part of
   */
  getGroups: async () => {
    return await apiClient('/chat/groups');
  },

  /**
   * Creates a new team group with selected teammates and group profile picture
   * @param {{ name: string, description?: string, groupProfilePic?: string, teamId?: string, memberIds: string[] }} data
   */
  createGroup: async (data) => {
    return await apiClient('/chat/groups', {
      method: 'POST',
      body: data,
    });
  },

  /**
   * Fetches messages and member details for a specific group
   * @param {string} groupId
   */
  getGroupMessages: async (groupId) => {
    return await apiClient(`/chat/groups/${groupId}/messages`);
  },

  /**
   * Sends text-only message to a group
   * @param {string} groupId
   * @param {string} text
   */
  sendGroupMessage: async (groupId, text) => {
    return await apiClient(`/chat/groups/${groupId}/messages`, {
      method: 'POST',
      body: { text },
    });
  },

  /**
   * Adds team members to an existing group (Group Admin only)
   * @param {string} groupId
   * @param {string[]} memberIds
   */
  addGroupMembers: async (groupId, memberIds) => {
    return await apiClient(`/chat/groups/${groupId}/members`, {
      method: 'POST',
      body: { memberIds },
    });
  },

  /**
   * Updates group name, description, or group profile picture (Group Admin only)
   * @param {string} groupId
   * @param {{ name?: string, description?: string, groupProfilePic?: string }} updates
   */
  updateGroup: async (groupId, updates) => {
    return await apiClient(`/chat/groups/${groupId}`, {
      method: 'PUT',
      body: updates,
    });
  },

  /**
   * Fetches formed teams the user belongs to (with member lists) for group creation
   */
  getUserTeams: async () => {
    return await apiClient('/chat/user-teams');
  },

  /**
   * Updates the user's custom chat handle / username
   * @param {string} username
   */
  updateChatUsername: async (username) => {
    return await apiClient('/chat/username', {
      method: 'PUT',
      body: { username },
    });
  },

  /**
   * Fetches existing chat messages and team details from MongoDB
   * @param {string} teamId
   */
  getTeamMessages: async (teamId) => {
    return await apiClient(`/chat/${teamId}/messages`);
  },

  /**
   * REST fallback for sending text message to team
   * @param {string} teamId
   * @param {string} text
   */
  sendMessage: async (teamId, text) => {
    return await apiClient(`/chat/${teamId}/messages`, {
      method: 'POST',
      body: { text },
    });
  },

  /**
   * Fetches team chat details and member list for chat header
   * @param {string} teamId
   */
  getTeamDetails: async (teamId) => {
    return await apiClient(`/chat/${teamId}/details`);
  },

  /**
   * Reports message delivery receipt (Point 4)
   * @param {string[]} messageIds
   */
  markDelivered: async (messageIds) => {
    return await apiClient('/chat/receipts/delivered', {
      method: 'POST',
      body: { messageIds: Array.isArray(messageIds) ? messageIds : [messageIds] },
    });
  },

  /**
   * Reports conversation/messages read receipt (Point 4)
   * @param {string} conversationId
   * @param {string[]} [messageIds]
   */
  markRead: async (conversationId, messageIds) => {
    return await apiClient('/chat/receipts/read', {
      method: 'POST',
      body: { conversationId, messageIds },
    });
  },
};

export default chatApi;

