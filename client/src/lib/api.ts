export let API_BASE = import.meta.env.VITE_API_URL || '/api';
if (API_BASE.endsWith('/')) API_BASE = API_BASE.slice(0, -1);
if (API_BASE.startsWith('http') && !API_BASE.endsWith('/api')) {
  API_BASE += '/api';
}

async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  let authHeader = '';
  if (url.startsWith('/admin')) {
    const adminToken = sessionStorage.getItem('adminToken');
    if (adminToken) authHeader = `Bearer ${adminToken}`;
  } else {
    const token = localStorage.getItem('accessToken');
    if (token) authHeader = `Bearer ${token}`;
  }

  const headers: Record<string, string> = options.headers 
    ? { ...(options.headers as Record<string, string>) } 
    : {};

  if (authHeader) {
    headers['Authorization'] = authHeader;
  }

  // Don't set Content-Type for FormData (browser sets multipart boundary)
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers,
    credentials: 'include',
  });

  if (res.status === 401) {
    // Do not attempt to refresh normal user token for admin routes
    if (url.startsWith('/admin')) {
      const err = await res.json().catch(() => ({ error: 'Admin authentication failed' }));
      throw new Error(err.error || 'Admin authentication failed');
    }

    // Try to refresh token
    const refreshed = await refreshToken();
    if (refreshed) {
      const newToken = localStorage.getItem('accessToken');
      headers['Authorization'] = `Bearer ${newToken}`;
      const retry = await fetch(`${API_BASE}${url}`, { ...options, headers, credentials: 'include' });
      if (!retry.ok) {
        const err = await retry.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(err.error || 'Request failed');
      }
      return retry.json();
    }
    localStorage.removeItem('accessToken');
    throw new Error('Session expired. Please login again.');
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(err.error || `Request failed with status ${res.status}`);
  }

  return res.json();
}

async function refreshToken(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    });
    if (res.ok) {
      const data = await res.json();
      localStorage.setItem('accessToken', data.accessToken);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

// ─── Auth API ───
export const authApi = {
  register: (data: { email: string; password: string; name?: string }) =>
    request<{ user: any; accessToken: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  login: (data: { email: string; password: string }) =>
    request<{ user: any; accessToken: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  loginWithGoogle: (data: { credential: string }) =>
    request<{ user: any; accessToken: string }>('/auth/google', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  logout: () => request<{ message: string }>('/auth/logout', { method: 'POST' }),

  me: () => request<{ user: any }>('/auth/me'),
};

// ─── Reports API ───
export const reportsApi = {
  getStats: () => request<{ totalReports: number; totalConfirms: number; totalLikes: number; totalCities: number }>('/reports/stats'),

  getAll: (params?: Record<string, string>) => {
    const qs = new URLSearchParams(params).toString();
    return request<{ reports: any[]; pagination: any }>(`/reports${qs ? `?${qs}` : ''}`);
  },
  getCities: () => request<{ cities: string[] }>('/reports/cities'),
  getById: (id: string) => request<any>(`/reports/${id}`),

  create: (formData: FormData) =>
    request<{ report: any; coinsEarned: number }>('/reports', {
      method: 'POST',
      body: formData,
    }),

  like: (id: string) =>
    request<{ liked: boolean; likeCount: number }>(`/reports/${id}/like`, {
      method: 'POST',
    }),

  unlike: (id: string) =>
    request<{ liked: boolean; likeCount: number }>(`/reports/${id}/like`, {
      method: 'DELETE',
    }),

  confirm: (id: string, sessionId?: string) =>
    request<{ confirmed: boolean; confirmCount: number }>(`/reports/${id}/confirm`, {
      method: 'POST',
      body: JSON.stringify({ sessionId }),
    }),
};

// ─── AQI API ───
export const aqiApi = {
  getCities: () => request<{ realStations: any[]; estimatedStations: any[] }>('/aqi/cities'),
  getCity: (name: string) => request<any>(`/aqi/city/${encodeURIComponent(name)}`),
};

// ─── WQI API ───
export const wqiApi = {
  getStations: () => request<{ stations: any[] }>('/wqi/stations'),
};

// ─── Users API ───
export const usersApi = {
  getProfile: (id: string) => request<{ user: any }>(`/users/${id}/profile`),
  getReports: (id: string, params: Record<string, string> = {}) => {
    const query = new URLSearchParams(params).toString();
    return request<{ reports: any[]; pagination: any }>(`/users/${id}/reports?${query}`);
  },
  updateMe: (data: { name?: string }) =>
    request<{ user: any }>('/users/me', {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
};

// ─── Admin API ───
export const adminApi = {
  check: () => request<void>('/admin/check'),
  login: (data: { password: string }) => request<{ success: boolean; token: string }>('/admin/login', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  logout: () => {
    sessionStorage.removeItem('adminToken');
    return request<void>('/admin/logout', { method: 'POST' });
  },
  getUsers: () => request<any[]>('/admin/users'),
  getReports: () => request<any[]>('/admin/reports'),
  deleteUser: (id: string) => request<void>(`/admin/users/${id}`, { method: 'DELETE' }),
  deleteReport: (id: string) => request<void>(`/admin/reports/${id}`, { method: 'DELETE' }),
  getModerationReports: () => request<any[]>('/admin/moderation-reports'),
  getReportComments: (reportId: string) => request<any[]>(`/admin/reports/${reportId}/comments`),
  deleteComment: (commentId: string) => request<void>(`/admin/comments/${commentId}`, { method: 'DELETE' }),
  deleteReply: (replyId: string) => request<void>(`/admin/replies/${replyId}`, { method: 'DELETE' }),
};

// ─── Comments API ───
export const commentsApi = {
  getComments: (reportId: string) => 
    request<any[]>(`/comments/report/${reportId}`),
    
  addComment: (reportId: string, content: string) => 
    request<any>(`/comments/report/${reportId}`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    }),
    
  addReply: (commentId: string, content: string) => 
    request<any>(`/comments/${commentId}/reply`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    }),
    
  interact: (type: 'comment' | 'reply', id: string, action: 'like' | 'dislike' | 'none') => {
    const endpoint = type === 'comment' 
      ? `/comments/${id}/interact` 
      : `/comments/reply/${id}/interact`;
    return request<any>(endpoint, {
      method: 'POST',
      body: JSON.stringify({ action }),
    });
  }
};

// ─── Moderation API ───
export const moderationApi = {
  submitReport: (data: { targetType: string; targetId: string; reason: string; details?: string }) => 
    request<void>('/moderation', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};
