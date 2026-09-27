import { apiClient } from './client';

export const projectsApi = {
  getProjects: async (params = {}) => {
    const query = new URLSearchParams();
    if (params.search) query.append('search', params.search);
    if (params.category) query.append('category', params.category);
    if (params.campus) query.append('campus', params.campus);
    if (params.role) query.append('role', params.role);
    const queryString = query.toString();
    return await apiClient(`/projects${queryString ? `?${queryString}` : ''}`);
  },

  getProjectById: async (id) => {
    return await apiClient(`/projects/${id}`);
  },

  createProject: async (projectData) => {
    return await apiClient('/projects', {
      method: 'POST',
      body: projectData,
    });
  },

  updateProject: async (id, projectData) => {
    return await apiClient(`/projects/${id}`, {
      method: 'PUT',
      body: projectData,
    });
  },

  deleteProject: async (id) => {
    return await apiClient(`/projects/${id}`, {
      method: 'DELETE',
    });
  },

  clearTeamFull: async (id) => {
    return await apiClient(`/projects/${id}/clear-team-full`, {
      method: 'PATCH',
    });
  },
};

export default projectsApi;
