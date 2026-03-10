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

// ─── Generations ──────────────────────────────────────────────────────────────

export type GenerationStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
export type AspectRatio =
  | '1:1' | '1:4' | '1:8' | '2:3' | '3:2' | '3:4'
  | '4:1' | '4:3' | '4:5' | '5:4' | '8:1' | '9:16'
  | '16:9' | '21:9' | 'auto';

export interface CreateGenerationResponse {
  id: string;
  status: GenerationStatus;
  creditsConsumed: number;
}

export interface Generation {
  id: string;
  type: string;
  status: GenerationStatus;
  prompt?: string;
  resolution?: string;
  outputUrl?: string;
  thumbnailUrl?: string;
  hasWatermark?: boolean;
  durationSeconds?: number;
  creditsConsumed: number;
  isFavorited?: boolean;
  errorMessage?: string;
  errorCode?: string;
  createdAt?: string;
  completedAt?: string;
}

export interface GalleryStats {
  totalGenerations: number;
  totalCreditsUsed: number;
  generationsByType: {
    TEXT_TO_IMAGE: number;
    IMAGE_TO_IMAGE: number;
    TEXT_TO_VIDEO: number;
    IMAGE_TO_VIDEO: number;
    MOTION_CONTROL: number;
  };
  favoriteCount: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface TextToImageRequest {
  prompt: string;
  negativePrompt?: string;
  resolution: 'RES_1K' | 'RES_2K' | 'RES_4K';
  aspectRatio?: AspectRatio;
  outputFormat?: 'png' | 'jpg';
  googleSearch?: boolean;
  imageModel?: 'gemini-3.1-pro-preview' | 'gemini-3.1-flash-image-preview';
  parameters?: Record<string, unknown>;
}

export const api = {
  gallery: {
    list(accessToken: string, page = 1, limit = 20) {
      return authRequest<PaginatedResponse<Generation>>(
        `/api/v1/gallery?page=${page}&limit=${limit}&sort=created_at:desc`,
        accessToken,
      );
    },
    stats(accessToken: string) {
      return authRequest<GalleryStats>('/api/v1/gallery/stats', accessToken);
    },
  },

  generations: {
    textToImage(accessToken: string, payload: TextToImageRequest) {
      return authRequest<CreateGenerationResponse>('/api/v1/generations/text-to-image', accessToken, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    get(accessToken: string, id: string) {
      return authRequest<Generation>(`/api/v1/generations/${id}`, accessToken);
    },
  },

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
