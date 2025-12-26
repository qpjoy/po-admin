import axios from 'axios';
import type { Provider, SSHKey, Release } from '@/types';

const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
});

// Provider API
export const providerApi = {
  list: () => api.get<Provider[]>('/providers'),
  get: (id: string) => api.get<Provider>(`/providers/${id}`),
  create: (data: Omit<Provider, 'createdAt' | 'updatedAt' | 'sshKeys'>) =>
    api.post<Provider>('/providers', data),
  update: (id: string, data: Partial<Provider>) =>
    api.put<Provider>(`/providers/${id}`, data),
  delete: (id: string) => api.delete(`/providers/${id}`),
};

// SSH Key API
export const sshKeyApi = {
  list: (providerId: string) => api.get<SSHKey[]>(`/providers/${providerId}/keys`),
  generate: (providerId: string, keyId: string, role: 'leader' | 'employee' | 'common') =>
    api.post<SSHKey>(`/providers/${providerId}/keys`, {
      id: keyId,
      name: `${role.charAt(0).toUpperCase() + role.slice(1)} Key`,
      description: `${role.charAt(0).toUpperCase() + role.slice(1)} SSH key`,
      type: role,
    }),
  delete: (providerId: string, keyId: string) =>
    api.delete(`/providers/${providerId}/keys/${keyId}`),
  rotate: async (providerId: string, keyId: string) => {
    // Rotation is implemented by deleting and re-creating the key
    // First get the current key to preserve metadata
    const currentKey = await api.get<SSHKey>(`/providers/${providerId}/keys/${keyId}`);
    // Backend returns { success: true, data: {...} }
    const keyData = (currentKey.data as any).data || currentKey.data;

    // Delete the old key
    await api.delete(`/providers/${providerId}/keys/${keyId}`);

    // Create a new key with the same ID and metadata
    return api.post<SSHKey>(`/providers/${providerId}/keys`, {
      id: keyId,
      name: keyData.name || `${keyData.type} Key`,
      description: keyData.description || `Rotated ${keyData.type} SSH key`,
      type: keyData.type || 'employee',
    });
  },
  getPublicKey: (providerId: string, keyId: string) =>
    api.get<{ publicKey: string }>(`/providers/${providerId}/keys/${keyId}`),
};

// Release API
export const releaseApi = {
  list: (providerId?: string) =>
    api.get<Release[]>('/admin/releases', { params: { provider: providerId } }),
  create: (data: Omit<Release, 'createdAt'>) => api.post<Release>('/admin/releases', data),
  rollback: (providerId: string, toVersion: string) =>
    api.post('/admin/releases/rollback', { providerId, toVersion }),
  getLatest: (providerId: string) =>
    api.get<Release>('/admin/releases/latest', { params: { provider: providerId } }),
};

export default api;
