import { apiClient } from './client';

export const applicationsApi = {
  getApplications: async () => {
    return await apiClient('/applications');
  },

  applyToProject: async (applicationData) => {
    return await apiClient('/applications', {
      method: 'POST',
      body: applicationData,
    });
  },

  updateStatus: async (id, status, reason = '') => {
    return await apiClient(`/applications/${id}/status`, {
      method: 'PATCH',
      body: { status, reason },
    });
  },

  withdrawApplication: async (id) => {
    return await apiClient(`/applications/${id}`, {
      method: 'DELETE',
    });
  },
};

export default applicationsApi;
