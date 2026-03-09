const BASE_URL = 'https://clip-generator-geraew-api.ernvcw.easypanel.host';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  avatarUrl: string;
  role: string;
  emailVerified: boolean;
  createdAt: string;
}

export interface UserProfile extends AuthUser {
  plan: Record<string, unknown> | null;
  credits: Record<string, unknown> | null;
  subscription: Record<string, unknown> | null;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(res.status, body.message || `Erro ${res.status}`);
  }

  return res.json();
}

function authRequest<T>(path: string, accessToken: string, options: RequestInit = {}) {
  return request<T>(path, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...options.headers,
    },
  });
}

export interface CreditsBalance {
  planCreditsRemaining: number;
  bonusCreditsRemaining: number;
  totalCreditsAvailable: number;
  planCreditsUsed: number;
  periodStart: string;
  periodEnd: string;
}

export interface CreditPackage {
  id: string;
  name: string;
  credits: number;
  priceCents: number;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
}

export const api = {
  credits: {
    balance(accessToken: string) {
      return authRequest<CreditsBalance>('/api/v1/credits/balance', accessToken);
    },
    packages(accessToken: string) {
      return authRequest<CreditPackage[]>('/api/v1/credits/packages', accessToken);
    },
  },

  users: {
    me(accessToken: string) {
      return authRequest<UserProfile>('/api/v1/users/me', accessToken);
    },
  },

  auth: {
    login(email: string, password: string) {
      return request<AuthResponse>('/api/v1/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
    },

    register(email: string, name: string, password: string) {
      return request<AuthResponse>('/api/v1/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email, name, password }),
      });
    },

    refresh(refreshToken: string) {
      return request<AuthResponse>('/api/v1/auth/refresh', {
        method: 'POST',
        body: JSON.stringify({ refreshToken }),
      });
    },

    logout(refreshToken: string) {
      return request<void>('/api/v1/auth/logout', {
        method: 'POST',
        body: JSON.stringify({ refreshToken }),
      });
    },
  },
};
