export const BASE_URL = process.env.NEXT_PUBLIC_API_URL;

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  avatarUrl: string;
  role: string;
  emailVerified: boolean;
  phone?: string;
  phoneVerified: boolean;
  hasCompletedOnboarding: boolean;
  createdAt: string;
}

// ola

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

  if (res.status === 204 || res.headers.get('content-length') === '0') {
    return undefined as T;
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

export interface Plan {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  priceCents: number;
  creditsPerMonth: number;
  maxConcurrentGenerations: number;
  hasWatermark: boolean;
  galleryRetentionDays: number | null;
  hasApiAccess: boolean;
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
  thumbnailUrl?: string;
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
  folder?: { id: string; name: string } | null;
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

export interface CreditTransaction {
  id: string;
  type: string;
  amount: number;
  source: string;
  description: string;
  generationId: string | null;
  paymentId: string | null;
  createdAt: string;
}

export interface CreditsEstimateRequest {
  type: 'TEXT_TO_IMAGE' | 'IMAGE_TO_IMAGE' | 'TEXT_TO_VIDEO' | 'IMAGE_TO_VIDEO' | 'REFERENCE_VIDEO' | 'MOTION_CONTROL';
  resolution?: string;
  durationSeconds?: number;
  hasAudio?: boolean;
  sampleCount?: number;
  modelVariant?: string;
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

export interface ImageToVideoRequest extends TextToVideoRequest {
  first_frame: string;
  first_frame_mime_type?: string;
  last_frame?: string;
  last_frame_mime_type?: string;
}

export interface MotionControlRequest {
  video: string;
  video_mime_type?: string;
  image: string;
  image_mime_type?: string;
  resolution?: '480p' | '580p' | '720p' | '1080p';
}

// ─── Video Editor ─────────────────────────────────────────────────────────────

export interface VideoProject {
  id: string;
  name: string;
  status: 'DRAFT' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  outputUrl?: string;
  outputThumbnailUrl?: string;
  durationMs?: number;
  clips: VideoClip[];
  createdAt: string;
}

export interface VideoClip {
  id: string;
  sourceUrl: string;
  thumbnailUrl?: string;
  order: number;
  startMs: number;
  endMs?: number;
  durationMs: number;
}

// ─── Folders ──────────────────────────────────────────────────────────────────

export interface Folder {
  id: string;
  name: string;
  generationCount: number;
  createdAt: string;
}

// ─── Admin ───────────────────────────────────────────────────────────────────

export interface AdminStats {
  totalUsers: number;
  activeSubscriptions: number;
  totalRevenueCents: number;
  totalGenerations: number;
  generationsByStatus: {
    pending: number;
    processing: number;
    completed: number;
    failed: number;
  };
}

export interface AdminPaginatedResponse<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  subscription: {
    planSlug: string;
    planName: string;
    status: string;
  } | null;
  credits: {
    planCreditsRemaining: number;
    bonusCreditsRemaining: number;
  } | null;
}

export interface AdminUserDetail {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  role: string;
  isActive: boolean;
  emailVerified: boolean;
  oauthProvider: string | null;
  createdAt: string;
  updatedAt: string;
  subscription: {
    id: string;
    planSlug: string;
    planName: string;
    status: string;
    currentPeriodStart: string;
    currentPeriodEnd: string;
    cancelAtPeriodEnd: boolean;
  } | null;
  credits: {
    planCreditsRemaining: number;
    bonusCreditsRemaining: number;
    planCreditsUsed: number;
    periodStart: string;
    periodEnd: string;
  } | null;
  recentGenerations: {
    id: string;
    type: string;
    status: string;
    prompt: string;
    resolution: string;
    creditsConsumed: number;
    createdAt: string;
    completedAt: string | null;
  }[];
}

export interface AdminGeneration {
  id: string;
  user: {
    id: string;
    email: string;
    name: string;
  };
  type: string;
  status: string;
  prompt: string;
  resolution: string;
  durationSeconds: number | null;
  hasAudio: boolean;
  creditsConsumed: number;
  outputUrls: string[];
  errorMessage: string | null;
  processingTimeMs: number | null;
  createdAt: string;
  completedAt: string | null;
}

export const api = {
  gallery: {
    list(accessToken: string, page = 1, limit = 20, filters?: { type?: string; favorited?: boolean; folderId?: string }) {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        sort: 'created_at:desc',
      });
      if (filters?.type) params.set('type', filters.type);
      if (filters?.favorited) params.set('favorited', 'true');
      if (filters?.folderId) params.set('folderId', filters.folderId);
      return authRequest<PaginatedResponse<Generation>>(
        `/api/v1/gallery?${params.toString()}`,
        accessToken,
      );
    },
    stats(accessToken: string) {
      return authRequest<GalleryStats>('/api/v1/gallery/stats', accessToken);
    },
    favorite(accessToken: string, generationId: string) {
      return authRequest<void>(`/api/v1/generations/${generationId}/favorite`, accessToken, {
        method: 'POST',
      });
    },
    unfavorite(accessToken: string, generationId: string) {
      return authRequest<void>(`/api/v1/generations/${generationId}/favorite`, accessToken, {
        method: 'DELETE',
      });
    },
  },

  folders: {
    async list(accessToken: string) {
      const res = await authRequest<PaginatedResponse<Folder>>('/api/v1/folders?limit=100', accessToken);
      return res.data;
    },
    create(accessToken: string, name: string) {
      return authRequest<Folder>('/api/v1/folders', accessToken, {
        method: 'POST',
        body: JSON.stringify({ name }),
      });
    },
    get(accessToken: string, id: string, page = 1, limit = 20) {
      return authRequest<PaginatedResponse<Generation>>(`/api/v1/folders/${id}?page=${page}&limit=${limit}`, accessToken);
    },
    update(accessToken: string, id: string, name: string) {
      return authRequest<Folder>(`/api/v1/folders/${id}`, accessToken, {
        method: 'PATCH',
        body: JSON.stringify({ name }),
      });
    },
    delete(accessToken: string, id: string) {
      return authRequest<void>(`/api/v1/folders/${id}`, accessToken, {
        method: 'DELETE',
      });
    },
    addGenerations(accessToken: string, folderId: string, generationIds: string[]) {
      return authRequest<void>(`/api/v1/folders/${folderId}/generations`, accessToken, {
        method: 'POST',
        body: JSON.stringify({ generationIds }),
      });
    },
    removeGeneration(accessToken: string, folderId: string, generationId: string) {
      return authRequest<void>(`/api/v1/folders/${folderId}/generations`, accessToken, {
        method: 'DELETE',
        body: JSON.stringify({ generationIds: [generationId] }),
      });
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
    imageToVideo(accessToken: string, payload: ImageToVideoRequest) {
      return authRequest<CreateGenerationResponse>('/api/v1/generations/image-to-video', accessToken, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    motionControl(accessToken: string, payload: MotionControlRequest) {
      return authRequest<CreateGenerationResponse>('/api/v1/generations/motion-control', accessToken, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    get(accessToken: string, id: string) {
      return authRequest<Generation>(`/api/v1/generations/${id}`, accessToken);
    },
    delete(accessToken: string, id: string) {
      return authRequest<void>(`/api/v1/generations/${id}`, accessToken, { method: 'DELETE' });
    },
    getFolders(accessToken: string, id: string) {
      return authRequest<Folder[]>(`/api/v1/generations/${id}/folders`, accessToken);
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
    purchase(accessToken: string, packageId: string) {
      return authRequest<{ checkoutUrl: string }>('/api/v1/credits/purchase', accessToken, {
        method: 'POST',
        body: JSON.stringify({ packageId }),
      });
    },
    transactions(accessToken: string, page = 1, limit = 20) {
      return authRequest<PaginatedResponse<CreditTransaction>>(
        `/api/v1/credits/transactions?page=${page}&limit=${limit}`,
        accessToken,
      );
    },
  },

  users: {
    me(accessToken: string) {
      return authRequest<UserProfile>('/api/v1/users/me', accessToken);
    },
    completeOnboarding(accessToken: string) {
      return authRequest<UserProfile>('/api/v1/users/me/onboarding', accessToken, {
        method: 'PATCH',
      });
    },
  },

  videoEditor: {
    async listProjects(accessToken: string) {
      const res = await authRequest<PaginatedResponse<VideoProject>>(
        '/api/v1/video-editor/projects',
        accessToken,
      );
      return res.data;
    },
    createProject(accessToken: string, name?: string) {
      return authRequest<VideoProject>('/api/v1/video-editor/projects', accessToken, {
        method: 'POST',
        body: JSON.stringify({ name }),
      });
    },
    getProject(accessToken: string, id: string) {
      return authRequest<VideoProject>(`/api/v1/video-editor/projects/${id}`, accessToken);
    },
    updateProject(accessToken: string, id: string, name: string) {
      return authRequest<VideoProject>(`/api/v1/video-editor/projects/${id}`, accessToken, {
        method: 'PATCH',
        body: JSON.stringify({ name }),
      });
    },
    deleteProject(accessToken: string, id: string) {
      return authRequest<void>(`/api/v1/video-editor/projects/${id}`, accessToken, {
        method: 'DELETE',
      });
    },
    addClip(accessToken: string, projectId: string, clip: { sourceUrl: string; thumbnailUrl?: string; durationMs: number }) {
      return authRequest<VideoClip>(`/api/v1/video-editor/projects/${projectId}/clips`, accessToken, {
        method: 'POST',
        body: JSON.stringify(clip),
      });
    },
    updateClip(accessToken: string, projectId: string, clipId: string, data: { startMs?: number; endMs?: number }) {
      return authRequest<VideoClip>(`/api/v1/video-editor/projects/${projectId}/clips/${clipId}`, accessToken, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
    },
    removeClip(accessToken: string, projectId: string, clipId: string) {
      return authRequest<void>(`/api/v1/video-editor/projects/${projectId}/clips/${clipId}`, accessToken, {
        method: 'DELETE',
      });
    },
    reorderClips(accessToken: string, projectId: string, clipIds: string[]) {
      return authRequest<void>(`/api/v1/video-editor/projects/${projectId}/reorder`, accessToken, {
        method: 'POST',
        body: JSON.stringify({ clipIds }),
      });
    },
    render(accessToken: string, projectId: string) {
      return authRequest<VideoProject>(`/api/v1/video-editor/projects/${projectId}/render`, accessToken, {
        method: 'POST',
      });
    },
  },

  subscriptions: {
    create(accessToken: string, planSlug: string) {
      return authRequest<{ checkoutUrl: string }>('/api/v1/subscriptions', accessToken, {
        method: 'POST',
        body: JSON.stringify({ planSlug }),
      });
    },
    current(accessToken: string) {
      return authRequest<Record<string, unknown> | null>('/api/v1/subscriptions/current', accessToken);
    },
    cancel(accessToken: string) {
      return authRequest<Record<string, unknown>>('/api/v1/subscriptions/cancel', accessToken, {
        method: 'POST',
      });
    },
    reactivate(accessToken: string) {
      return authRequest<Record<string, unknown>>('/api/v1/subscriptions/reactivate', accessToken, {
        method: 'POST',
      });
    },
    upgrade(accessToken: string, planSlug: string) {
      return authRequest<{ checkoutUrl: string }>('/api/v1/subscriptions/upgrade', accessToken, {
        method: 'PATCH',
        body: JSON.stringify({ planSlug }),
      });
    },
    downgrade(accessToken: string, planSlug: string) {
      return authRequest<Record<string, unknown>>('/api/v1/subscriptions/downgrade', accessToken, {
        method: 'PATCH',
        body: JSON.stringify({ planSlug }),
      });
    },
  },

  plans: {
    list(accessToken: string) {
      return authRequest<Plan[]>('/api/v1/plans', accessToken);
    },
  },

  promptEnhancer: {
    enhance(accessToken: string, prompt: string, context?: {
      type: 'image' | 'video';
      model?: string;
      resolution?: string;
      aspectRatio?: string;
      quality?: string;
      durationSeconds?: number;
      hasAudio?: boolean;
      hasReferenceImages?: boolean;
      hasFirstFrame?: boolean;
      hasLastFrame?: boolean;
      negativePrompt?: string;
      sampleCount?: number;
    }, images?: { base64: string; mime_type: string }[]) {
      return authRequest<{ enhancedPrompt: string; negativePrompt: string }>('/api/v1/prompt-enhancer/enhance', accessToken, {
        method: 'POST',
        body: JSON.stringify({ prompt, context, images }),
      });
    },
    enhanceInfluencer(accessToken: string, selections: Record<string, string>) {
      return authRequest<{ enhancedPrompt: string }>('/api/v1/prompt-enhancer/enhance-influencer', accessToken, {
        method: 'POST',
        body: JSON.stringify(selections),
      });
    },
  },

  admin: {
    stats(accessToken: string) {
      return authRequest<AdminStats>('/api/v1/admin/stats', accessToken);
    },
    users(accessToken: string, page = 1, limit = 20) {
      return authRequest<AdminPaginatedResponse<AdminUser>>(
        `/api/v1/admin/users?page=${page}&limit=${limit}`,
        accessToken,
      );
    },
    user(accessToken: string, id: string) {
      return authRequest<AdminUserDetail>(`/api/v1/admin/users/${id}`, accessToken);
    },
    adjustCredits(accessToken: string, userId: string, amount: number, description: string) {
      return authRequest<{ success: boolean; message: string }>(
        `/api/v1/admin/users/${userId}/credits`,
        accessToken,
        {
          method: 'PATCH',
          body: JSON.stringify({ amount, description }),
        },
      );
    },
    generations(accessToken: string, page = 1, limit = 20) {
      return authRequest<AdminPaginatedResponse<AdminGeneration>>(
        `/api/v1/admin/generations?page=${page}&limit=${limit}`,
        accessToken,
      );
    },
  },

  auth: {
    checkAvailability(email?: string, phone?: string) {
      return request<{ emailTaken: boolean; phoneTaken: boolean }>('/api/v1/auth/check-availability', {
        method: 'POST',
        body: JSON.stringify({ email, phone }),
      });
    },

    login(email: string, password: string) {
      return request<AuthResponse>('/api/v1/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
    },

    sendVerification(phone: string) {
      return request<{ message: string }>('/api/v1/auth/send-verification', {
        method: 'POST',
        body: JSON.stringify({ phone }),
      });
    },

    register(email: string, name: string, password: string, phone: string) {
      return request<AuthResponse>('/api/v1/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email, name, password, phone }),
      });
    },

    refresh(refreshToken: string) {
      return request<AuthResponse>('/api/v1/auth/refresh', {
        method: 'POST',
        body: JSON.stringify({ refreshToken }),
      });
    },

    google(googleToken: string) {
      return request<AuthResponse>('/api/v1/auth/google', {
        method: 'POST',
        body: JSON.stringify({ googleToken }),
      });
    },

    verifyPhone(accessToken: string, phone: string, code: string) {
      return authRequest<AuthResponse>('/api/v1/auth/verify-phone', accessToken, {
        method: 'POST',
        body: JSON.stringify({ phone, code }),
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
