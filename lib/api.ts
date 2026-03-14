export const BASE_URL = 'https://clip-generator-geraew-api.ernvcw.easypanel.host';

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

// ─── 401 refresh interceptor ──────────────────────────────────────────────────

type RefreshHandler = () => Promise<string>;
let _refreshHandler: RefreshHandler | null = null;
let _refreshPromise: Promise<string> | null = null;

export function setRefreshHandler(fn: RefreshHandler) {
  _refreshHandler = fn;
}

async function authRequest<T>(path: string, accessToken: string, options: RequestInit = {}): Promise<T> {
  const makeRequest = (token: string) =>
    request<T>(path, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        ...options.headers,
      },
    });

  try {
    return await makeRequest(accessToken);
  } catch (err) {
    if (err instanceof ApiError && err.status === 401 && _refreshHandler) {
      // Coalesce simultaneous 401s into a single refresh call
      if (!_refreshPromise) {
        _refreshPromise = _refreshHandler().finally(() => {
          _refreshPromise = null;
        });
      }
      const newToken = await _refreshPromise;
      return makeRequest(newToken);
    }
    throw err;
  }
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

export interface GenerationOutput {
  id: string;
  url: string;
  order: number;
}

export interface GenerationInputImage {
  id: string;
  role: string;
  mimeType: string;
  order: number;
  url?: string;
  referenceType?: string;
}

export interface Generation {
  id: string;
  type: string;
  status: GenerationStatus;
  prompt?: string;
  resolution?: string;
  durationSeconds?: number;
  hasAudio?: boolean;
  modelUsed?: string;
  parameters?: Record<string, unknown>;
  outputs: GenerationOutput[];
  inputImages?: GenerationInputImage[];
  hasWatermark?: boolean;
  creditsConsumed: number;
  processingTimeMs?: number;
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

export interface CreditsEstimateRequest {
  type: 'TEXT_TO_IMAGE' | 'IMAGE_TO_IMAGE' | 'TEXT_TO_VIDEO' | 'IMAGE_TO_VIDEO' | 'REFERENCE_VIDEO';
  resolution?: string;
  durationSeconds?: number;
  hasAudio?: boolean;
}

export interface CreditsEstimateResponse {
  creditsRequired: number;
  hasSufficientBalance: boolean;
}

export interface GenerateImageRequest {
  prompt: string;
  model?: string;
  resolution: 'RES_1K' | 'RES_2K' | 'RES_4K';
  aspect_ratio: string;
  mime_type?: string;
  images?: { base64: string; mime_type: string }[];
}

export interface TextToVideoRequest {
  prompt: string;
  model: string;
  resolution: string;
  duration_seconds: number;
  aspect_ratio?: string;
  generate_audio?: boolean;
  sample_count?: number;
  negative_prompt?: string;
}

export interface VideoWithReferencesRequest extends TextToVideoRequest {
  reference_images: { base64: string; mime_type: string; reference_type: 'asset' }[];
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
    generateImage(accessToken: string, payload: GenerateImageRequest) {
      return authRequest<CreateGenerationResponse>('/api/v1/generations/generate-image-auto', accessToken, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    textToVideo(accessToken: string, payload: TextToVideoRequest) {
      return authRequest<CreateGenerationResponse>('/api/v1/generations/text-to-video', accessToken, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    videoWithReferences(accessToken: string, payload: VideoWithReferencesRequest) {
      return authRequest<CreateGenerationResponse>('/api/v1/generations/video-with-references', accessToken, {
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
    estimate(accessToken: string, payload: CreditsEstimateRequest) {
      return authRequest<CreditsEstimateResponse>('/api/v1/credits/estimate', accessToken, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
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
