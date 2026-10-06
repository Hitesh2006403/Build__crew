import { apiClient } from './client';

export const hackathonsApi = {
  getHackathons: async () => {
    return await apiClient('/hackathons');
  },

  getHackathonById: async (id) => {
    return await apiClient(`/hackathons/${id}`);
  },

  createHackathon: async (data) => {
    return await apiClient('/hackathons', {
      method: 'POST',
      body: data,
    });
  },

  updateHackathon: async (id, data) => {
    return await apiClient(`/hackathons/${id}`, {
      method: 'PUT',
      body: data,
    });
  },

  togglePublish: async (id, isPublished) => {
    return await apiClient(`/hackathons/${id}/publish`, {
      method: 'PATCH',
      body: { isPublished },
    });
  },

  deleteHackathon: async (id) => {
    return await apiClient(`/hackathons/${id}`, {
      method: 'DELETE',
    });
  },

  getHackathonTeams: async (hackathonId) => {
    return await apiClient(`/hackathons/${hackathonId}/teams`);
  },

  createHackathonTeam: async (hackathonId, data) => {
    return await apiClient(`/hackathons/${hackathonId}/teams`, {
      method: 'POST',
      body: data,
    });
  },

  syncKarnatakaHackathons: async () => {
    return await apiClient('/hackathons/sync-karnataka', {
      method: 'POST',
    });
  },
};

export default hackathonsApi;
