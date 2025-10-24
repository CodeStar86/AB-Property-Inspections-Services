import { projectId, publicAnonKey } from '../utils/supabase/info';

// Server API base URL
const API_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-be68fc60`;

// Helper to make API calls
async function apiCall(endpoint: string, body: any) {
  const url = `${API_BASE}${endpoint}`;
  console.log(`KV API call: ${url}`, body);
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${publicAnonKey}`,
      },
      body: JSON.stringify(body),
    });

    console.log(`KV API response status (${endpoint}):`, response.status);

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      console.error(`KV API error (${endpoint}):`, error);
      throw new Error(error.error || 'API request failed');
    }

    const data = await response.json();
    console.log(`KV API success (${endpoint}):`, data);
    return data;
  } catch (err: any) {
    console.error(`KV API call failed (${endpoint}):`, err);
    throw new Error(err.message || 'Network error');
  }
}

// Client-side KV store wrapper using server API
export const kvStore = {
  async set(key: string, value: any): Promise<void> {
    await apiCall('/kv/set', { key, value });
  },

  async get(key: string): Promise<any> {
    const { value } = await apiCall('/kv/get', { key });
    return value;
  },

  async delete(key: string): Promise<void> {
    await apiCall('/kv/delete', { key });
  },

  async getByPrefix(prefix: string): Promise<any[]> {
    const { values } = await apiCall('/kv/get-by-prefix', { prefix });
    return values;
  },

  async mget(keys: string[]): Promise<any[]> {
    if (keys.length === 0) return [];
    // Use batch endpoint for better performance
    const { values } = await apiCall('/kv/mget', { keys });
    return values;
  },

  async mset(records: { key: string; value: any }[]): Promise<void> {
    await apiCall('/kv/mset', { records });
  },

  // Batch fetch multiple photo data entries
  async batchGetPhotos(inspectionId: string, photoIds: string[]): Promise<any[]> {
    const keys = photoIds.map(photoId => `photo-data:${inspectionId}:${photoId}`);
    return this.mget(keys);
  },
};
