import { API_BASE_URL, toApiUrl } from '../lib/apiBase';
import { getAccessToken } from './api';

/**
 * Upload an image file to the backend.
 * Returns the public URL path (e.g. "/uploads/1234-abc.jpg").
 */
export const uploadImage = async (file: File, _path: string): Promise<string> => {
  const formData = new FormData();
  formData.append('file', file);

  const headers: Record<string, string> = {};
  const token = getAccessToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(toApiUrl('/upload'), {
    method: 'POST',
    headers,
    body: formData,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Upload failed (${res.status})`);
  }

  const { url } = await res.json();
  return url as string;
};
