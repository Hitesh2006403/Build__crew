import { apiClient } from './client';

export const chatApi = {
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
};

export default chatApi;
