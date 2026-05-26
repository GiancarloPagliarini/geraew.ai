import { readAttribution } from './tracking';

export const BASE_URL = process.env.NEXT_PUBLIC_API_URL;

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  avatarUrl: string;
  role: string;
  emailVerified: boolean;
  hasCompletedOnboarding: boolean;
  createdAt: string;
}

// ola

export interface UserProfile extends AuthUser {
  plan: Record<string, unknown> | null;
  credits: Record<string, unknown> | null;
  subscription: Record<string, unknown> | null;
  feedbackSubmitted: boolean;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

export class ApiError extends Error {
  constructor(public status: number, message: string, public code?: string) {
    super(message);
    this.name = 'ApiError';
  }
}

function getCurrentLocale(): string {
  if (typeof document === 'undefined') return 'pt-BR';
  const match = document.cookie.match(/(?:^|; )geraew-locale=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : 'pt-BR';
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Accept-Language': getCurrentLocale(),
      ...options.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(res.status, body.message || `Erro ${res.status}`, body.code);
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

export type FreeGenerationType = 'NB2' | 'NB_PRO' | 'FACE_SWAP' | 'VIRTUAL_TRY_ON' | 'GERAEW_FAST' | 'UPSCALE';

export type FreeGenerationsMap = Record<FreeGenerationType, number>;

export interface CreditsBalance {
  planCreditsRemaining: number;
  bonusCreditsRemaining: number;
  totalCreditsAvailable: number;
  planCreditsUsed: number;
  freeGenerations: FreeGenerationsMap;
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

export type PixStatus = 'PENDING' | 'PAID' | 'EXPIRED' | 'CANCELLED' | 'REFUNDED';

export interface PixCharge {
  abacatepayId: string;
  amountCents: number;
  status: PixStatus;
  brCode: string;
  brCodeBase64: string;
  expiresAt: string;
  devMode: boolean;
}

export interface Plan {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  priceCents: number;
  currency: string;
  creditsPerMonth: number;
  maxConcurrentGenerations: number;
  hasWatermark: boolean;
  galleryRetentionDays: number | null;
  hasApiAccess: boolean;
}

// ─── AI Models ───────────────────────────────────────────────────────────────

export type AiModelProvider = 'GERAEW' | 'KIE';
export type AiModelType = 'VIDEO' | 'IMAGE';

export interface AiModelPublic {
  slug: string;
  label: string;
  description: string | null;
  provider: AiModelProvider;
  isActive: boolean;
  statusMessage: string | null;
  sortOrder: number;
  /** Admin-only feature flag — don't show in generation panel dropdowns. */
  isGateway: boolean;
}

export interface AiModelAdmin {
  id: string;
  slug: string;
  label: string;
  description: string | null;
  provider: AiModelProvider;
  type: AiModelType;
  modelVariant: string;
  isActive: boolean;
  sortOrder: number;
  statusMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminPromptTemplate {
  id: string;
  categoryId: string;
  title: string;
  type: string;
  prompt: string;
  imageUrl: string | null;
  aiModel: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AdminPromptCategory {
  id: string;
  sectionId: string;
  title: string;
  sortOrder: number;
  prompts?: AdminPromptTemplate[];
}

export interface AdminPromptSection {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  icon: string | null;
  sortOrder: number;
  isActive: boolean;
  categories: AdminPromptCategory[];
}

// ─── Prompts ─────────────────────────────────────────────────────────────────

export interface ApiPromptSection {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  icon: string | null;
  categories: {
    id: string;
    title: string;
    prompts: {
      id: string;
      title: string;
      type: string;
      prompt: string;
      imageUrl: string | null;
      thumbnailUrl: string | null;
      aiModel: string | null;
    }[];
  }[];
}

// ─── Prompt Posts (Instagram-style shareable pages) ──────────────────────────

export interface PromptPostSlide {
  id: string;
  order: number;
  prompt: string;
  imageUrl: string;
  thumbnailUrl: string | null;
  aspectRatio: string | null;
  generationType: string;
  aiModel: string | null;
  copyCount: number;
  useCount: number;
}

export interface PromptPost {
  id: string;
  slug: string;
  caption: string | null;
  isPublished: boolean;
  viewCount: number;
  copyCount: number;
  useCount: number;
  createdById: string | null;
  createdAt: string;
  updatedAt: string;
  slides: PromptPostSlide[];
}

export interface PromptPostSlideInput {
  prompt: string;
  imageUrl: string;
  thumbnailUrl?: string;
  aspectRatio?: string;
  generationType?: string;
  aiModel?: string;
}

export interface PromptPostInput {
  slides: PromptPostSlideInput[];
  slug?: string;
  caption?: string;
  isPublished?: boolean;
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

/** Lightweight gallery list item — only essential fields for grid rendering */
export interface GalleryItem {
  id: string;
  type: string;
  status: GenerationStatus;
  prompt?: string;
  resolution?: string;
  durationSeconds?: number;
  hasAudio?: boolean;
  hasWatermark?: boolean;
  creditsConsumed: number;
  isFavorited?: boolean;
  thumbnailUrl?: string;
  blurDataUrl?: string;
  outputUrl?: string;
  outputCount: number;
  folder?: { id: string; name: string } | null;
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
  freeGenerationType?: FreeGenerationType;
}

export interface CreditsEstimateResponse {
  creditsRequired: number;
  hasSufficientBalance: boolean;
  canUseFreeGeneration: boolean;
  freeGenerationType: FreeGenerationType | null;
  freeGenerationsRemainingForType: number;
}

export interface GenerateImageRequest {
  prompt: string;
  model?: string;
  resolution: 'RES_1K' | 'RES_2K' | 'RES_4K';
  aspect_ratio: string;
  mime_type?: string;
  images?: { base64: string; mime_type: string }[];
  model_variant?: string;
  unlimited?: boolean;
}

export interface UpscaleRequest {
  image: string;
  mime_type?: 'image/jpeg' | 'image/png';
  model: string;
  model_variant?: string;
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
  model_variant?: string;
  unlimited?: boolean;
}

export interface UnlimitedModel {
  modelVariant: string;
  resolutions: ('RES_1K' | 'RES_2K' | 'RES_4K' | 'RES_720P' | 'RES_1080P')[];
}

export interface UnlimitedStatus {
  eligible: boolean;
  planSlug: string | null;
  models: UnlimitedModel[];
  usageCount: number;
  hasActiveJob: boolean;
}

export type UnlimitedJobStatus =
  | 'waiting'
  | 'active'
  | 'delayed'
  | 'completed'
  | 'failed'
  | 'paused';

export interface UnlimitedQueueStats {
  queueName: string;
  isPaused: boolean;
  counts: Partial<Record<UnlimitedJobStatus, number>>;
  total: number;
}

export interface UnlimitedJobUser {
  id: string;
  email: string;
  name: string;
  planSlug: string | null;
  planName: string | null;
}

export interface UnlimitedJobGeneration {
  id: string;
  status: string;
  type: string;
  modelUsed: string;
  resolution: string;
  createdAt: string;
  completedAt: string | null;
}

export interface UnlimitedJobView {
  jobId: string;
  jobName: string;
  priority: number | null;
  delayUntil: string | null;
  attemptsMade: number;
  maxAttempts: number;
  timestamp: string;
  processedOn: string | null;
  finishedOn: string | null;
  failedReason: string | null;
  user: UnlimitedJobUser | null;
  generation: UnlimitedJobGeneration | null;
  payload: {
    model: string | null;
    resolution: string | null;
    promptPreview: string | null;
  };
}

export interface UnlimitedUsageByModel {
  modelVariant: string;
  resolution: string;
  count: number;
}

export interface UnlimitedTopUser {
  userId: string;
  email: string | null;
  name: string | null;
  planSlug: string | null;
  count: number;
  manualDelay: { delayMs: number; ttlSeconds: number } | null;
}

export interface UnlimitedUsageOverview {
  windowHours: number;
  total: number;
  byModel: UnlimitedUsageByModel[];
  topUsers: UnlimitedTopUser[];
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

export interface VirtualTryOnRequest {
  influencer_image: string;
  influencer_image_mime_type?: string;
  clothing_image: string;
  clothing_image_mime_type?: string;
  additional_instructions?: string;
  model?: string;
  resolution?: string;
  aspect_ratio?: string;
  output_mime_type?: string;
  model_variant?: string;
}

export interface FaceSwapRequest {
  source_image: string;
  source_image_mime_type?: string;
  target_image: string;
  target_image_mime_type?: string;
  resolution?: string;
}

export interface TextToVideoKieRequest {
  prompt: string;
  model?: string; // 'veo3_fast' | 'veo3'
  resolution: string;
  aspect_ratio?: string;
  generate_audio?: boolean;
  seed?: number;
  model_variant?: string;
}

export interface ImageToVideoKieRequest extends TextToVideoKieRequest {
  first_frame: string;
  first_frame_mime_type?: string;
  last_frame?: string;
  last_frame_mime_type?: string;
}

export interface ReferenceToVideoKieRequest extends TextToVideoKieRequest {
  reference_images: string[];
  reference_images_mime_types?: string[];
}

export interface ImageToVideoGrokRequest {
  prompt?: string;
  resolution: string; // 'RES_480P' | 'RES_720P'
  duration_seconds: number; // 6-30
  aspect_ratio?: string;
  first_frame: string;
  first_frame_mime_type?: string;
  model_variant?: string;
}

export interface TextToSpeechRequest {
  text: string;
  voice_id: string;
  language?: string;
  speed?: number;
}

export interface VoiceCloneRequest {
  text: string;
  audio: string;
  audio_mime_type?: string;
  language?: string;
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

// ─── Voices (saved voice profiles) ──────────────────────────────────────────

export interface VoiceProfile {
  id: string;
  name: string;
  language: string;
  status: 'TRAINING' | 'READY' | 'FAILED';
  sampleUrl: string;
  /** URL of the synthesized clone output (the "say this" preview). Null for legacy profiles created before previews were persisted. */
  previewUrl: string | null;
  /** Text the user typed when cloning the voice. Null for legacy profiles. */
  previewText: string | null;
  createdAt: string;
}

export interface VoiceQuota {
  used: number;
  limit: number;
  planSlug: string;
}

export interface VoiceListResponse {
  voices: VoiceProfile[];
  quota: VoiceQuota;
}

// ─── Avatars (HeyGen Digital Twin) ──────────────────────────────────────────

export type UserAvatarStatus =
  | 'PENDING'
  | 'SUBMITTING'
  | 'PENDING_CONSENT'
  | 'TRAINING'
  | 'READY'
  | 'FAILED'
  | 'DELETING';

export type UserAvatarConsentStatus =
  | 'NOT_REQUIRED'
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED';

export interface UserAvatar {
  id: string;
  name: string;
  status: UserAvatarStatus;
  consentStatus: UserAvatarConsentStatus;
  previewImageUrl: string | null;
  previewVideoUrl: string | null;
  defaultVoiceId: string | null;
  supportedEngines: string[];
  consentUrl: string | null;
  consentApprovedAt: string | null;
  errorMessage: string | null;
  errorCode: string | null;
  creditsConsumed: number;
  trainingStartedAt: string | null;
  trainingCompletedAt: string | null;
  createdAt: string;
}

export interface UserAvatarQuota {
  used: number;
  limit: number;
  enabled: boolean;
  planSlug: string;
}

export interface UserAvatarListResponse {
  avatars: UserAvatar[];
  quota: UserAvatarQuota;
}

export type CreateUserAvatarType = 'photo' | 'digital_twin';

export interface CreateUserAvatarPayload {
  name: string;
  sourceMediaKey: string;
  /** Default 'photo'. */
  type?: CreateUserAvatarType;
}

export type AvatarVideoResolution = '720p' | '1080p' | '4k';
export type AvatarVideoAspectRatio = '16:9' | '9:16';
export type AvatarVideoEngine = 'avatar_iv' | 'avatar_v';

export interface GenerateAvatarVideoPayload {
  /** Required when customAudioUrl is NOT provided. */
  script?: string;
  /** HeyGen built-in voice id. Mutually exclusive with voiceProfileId / inworldVoiceId. */
  voiceId?: string;
  /** User's cloned VoiceProfile id (Wavespeed/OmniVoice). Backend generates audio + lip-syncs. */
  voiceProfileId?: string;
  /** Public Inworld catalog voice id (ex: "Heitor", "Sarah"). Backend synthesizes via Wavespeed + lip-syncs. */
  inworldVoiceId?: string;
  /**
   * R2 fileKey (returned by /uploads/presigned-url with purpose "avatar_audio")
   * of a user-supplied audio file (uploaded or recorded). When present, the
   * backend skips TTS and feeds HeyGen directly. Mutually exclusive with
   * script/voiceId/voiceProfileId/inworldVoiceId.
   */
  customAudioKey?: string;
  /** Duration of the custom audio in seconds — required when customAudioKey is set. */
  audioDurationSeconds?: number;
  engine?: AvatarVideoEngine;
  resolution: AvatarVideoResolution;
  aspectRatio: AvatarVideoAspectRatio;
  backgroundColor?: string;
  backgroundImageUrl?: string;
}

export interface CreateAvatarVideoResponse {
  generationId: string;
  status: GenerationStatus;
  creditsConsumed: number;
}

// ─── Inworld voices (preset catalog from inworld.ai direct) ─────────────────

export type InworldVoiceSource = 'SYSTEM' | 'IVC' | 'PVC';

export interface InworldVoice {
  voiceId: string;
  displayName: string;
  description?: string;
  langCode: string;
  tags?: string[];
  source?: InworldVoiceSource;
}

export interface InworldVoiceListResponse {
  voices: InworldVoice[];
}

// ─── Affiliates (Admin) ─────────────────────────────────────────────────────

export type AffiliateDiscountScope = 'FIRST_PURCHASE' | 'ALL_PURCHASES';
export type PixKeyType = 'CPF' | 'CNPJ' | 'EMAIL' | 'PHONE' | 'RANDOM';

export interface Affiliate {
  id: string;
  userId: string | null;
  code: string;
  name: string;
  commissionPercent: number;
  isActive: boolean;
  discountPercent: number | null;
  discountAppliesTo: AffiliateDiscountScope;
  pixKey: string | null;
  pixKeyType: PixKeyType | null;
  createdAt: string;
  user: { id: string; email: string; name: string } | null;
  _count: { earnings: number };
  totalEarningsCents: number;
  pendingEarningsCents: number;
  referralsCount: number;
  referredUsersCount: number;
}

export interface AffiliateEarning {
  id: string;
  affiliateId: string;
  paymentId: string;
  userId: string;
  amountCents: number;
  commissionCents: number;
  status: 'PENDING' | 'PAID';
  paidAt: string | null;
  createdAt: string;
  user: { id: string; email: string; name: string };
  payment: { id: string; type: string; amountCents: number; createdAt: string };
}

export interface AffiliateDashboard {
  totalAffiliates: number;
  activeAffiliates: number;
  referredUsers: number;
  totalPayments: number;
  totalRevenueCents: number;
  totalCommissionCents: number;
  pendingCommissionCents: number;
  paidCommissionCents: number;
}

export interface AffiliateReferredUser {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  plan: string;
}

export interface AffiliateEarningsResponse {
  affiliate: Omit<Affiliate, '_count' | 'totalEarningsCents' | 'pendingEarningsCents' | 'referralsCount'>;
  earnings: AffiliateEarning[];
  summary: {
    totalRevenueCents: number;
    totalCommissionCents: number;
    pendingCommissionCents: number;
    paidCommissionCents: number;
  };
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
  generationsByProvider: {
    geraew: number;
    kie: number;
    kieBreakdown: {
      nanoBanana2: number;
      nanoBananaPro: number;
      kling: number;
    };
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
    cancelAtPeriodEnd?: boolean;
  } | null;
  credits: {
    planCreditsRemaining: number;
    bonusCreditsRemaining: number;
  } | null;
}

export interface AdminFeedback {
  id: string;
  userId: string;
  user: {
    id: string;
    email: string;
    name: string;
    avatarUrl: string | null;
    plan: { slug: string; name: string } | null;
  };
  nps: number;
  rating: number;
  goal: string;
  goalOther: string | null;
  features: string[];
  highlight: string;
  improve: string;
  wishlist: string;
  creditsAwarded: number;
  createdAt: string;
}

export interface AdminFeedbackStats {
  total: number;
  avgNps: number | null;
  avgRating: number | null;
  npsScore?: number;
  npsPromoters: number;
  npsDetractors: number;
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
    freeGenerations: FreeGenerationsMap;
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
    outputs: {
      url: string;
      thumbnailUrl: string | null;
      mimeType: string;
    }[];
    createdAt: string;
    completedAt: string | null;
  }[];
}

export interface AdminUserGeneration {
  id: string;
  type: string;
  status: string;
  prompt: string;
  negativePrompt: string | null;
  resolution: string;
  durationSeconds: number | null;
  hasAudio: boolean;
  modelUsed: string | null;
  creditsConsumed: number;
  outputs: {
    id: string;
    url: string;
    thumbnailUrl: string | null;
    mimeType: string;
  }[];
  inputImages: {
    id: string;
    url: string;
    role: string;
    mimeType: string;
  }[];
  isFavorited: boolean;
  isDeleted: boolean;
  errorMessage: string | null;
  processingTimeMs: number | null;
  createdAt: string;
  completedAt: string | null;
}

export interface ProviderStat {
  provider: string;
  total: number;
  completed: number;
  failed: number;
  creditsConsumed: number;
}

export interface AdminProviderStats {
  providers: ProviderStat[];
}

// ─── Extended Admin Stats ────────────────────────────────────────────────────

export interface FinancialStats {
  mrrCents: number;
  dailyRevenue: { date: string; revenueCents: number }[];
  revenueByPlan: { planName: string; planSlug: string; revenueCents: number; paymentCount: number }[];
  boostSales: { name: string; credits: number; priceCents: number; soldCount: number; totalRevenueCents: number }[];
  arpuCents: number;
  totalRevenueCents: number;
  totalApiCostCents: number;
  marginPercent: number;
}

export interface UserStats {
  newUsersToday: number;
  newUsersWeek: number;
  newUsersMonth: number;
  dailyNewUsers: { date: string; count: number }[];
  planDistribution: { planSlug: string; planName: string; userCount: number }[];
  conversionRate: number;
  churnRate: number;
  topConsumers: { userId: string; email: string; name: string; totalCredits: number }[];
  inactiveUsers: number;
  totalUsers: number;
  paidUsers: number;
  canceledRecently: number;
}

export interface UsageStats {
  dailyGenerations: { date: string; count: number }[];
  byType: { type: string; count: number }[];
  avgProcessingByModel: { modelUsed: string; avgMs: number; p95Ms: number; count: number }[];
  errorRateByModel: { modelUsed: string; failed: number; total: number; errorRate: number }[];
  peakHours: { hour: number; count: number }[];
  stuckGenerations: { id: string; userId: string; type: string; modelUsed: string; createdAt: string; processingStartedAt: string | null }[];
}

export interface CreditStats {
  consumedToday: number;
  consumedWeek: number;
  consumedMonth: number;
  dailyConsumption: { date: string; consumed: number }[];
  allocationVsUsage: { totalUsed: number; totalAllocated: number; usagePercent: number };
  nearLimitUsers: { userId: string; email: string; name: string; planCreditsRemaining: number; creditsPerMonth: number; usagePercent: number }[];
  refunds: { count: number; totalAmount: number };
}

export interface HealthStats {
  queue: { processing: number; pending: number };
  stuckCount: number;
  recentFailuresByModel: { modelUsed: string; failedCount: number; errorCodes: string[] }[];
  failingPayments: number;
  recentErrors: { id: string; userId: string; type: string; modelUsed: string; errorMessage: string | null; errorCode: string | null; createdAt: string; safetyFallback?: boolean }[];
  alerts: { level: 'warning' | 'critical'; message: string }[];
}

export type AnnouncementVariant = 'feature' | 'maintenance' | 'promo' | 'openai' | 'gift' | 'mic' | 'unlimited';

export type AnnouncementAction =
  | { type: 'open-image-panel' }
  | { type: 'open-video-panel' }
  | { type: 'open-audio-panel' }
  | { type: 'open-weekly-claim' }
  | { type: 'open-unlimited-modal' }
  | { type: 'href'; url: string };

export interface Announcement {
  id: string;
  slug: string;
  variant: AnnouncementVariant | null;
  badge: string | null;
  title: string;
  description: string;
  imageUrl: string | null;
  ctaLabel: string | null;
  ctaAction: AnnouncementAction | null;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAnnouncementInput {
  slug: string;
  variant?: AnnouncementVariant;
  badge?: string;
  title: string;
  description: string;
  imageUrl?: string;
  ctaLabel?: string;
  ctaAction?: AnnouncementAction;
  isActive?: boolean;
  sortOrder?: number;
}

export type UpdateAnnouncementInput = Partial<Omit<CreateAnnouncementInput, 'slug'>>;

export interface WeeklyClaimStatus {
  canClaim: boolean;
  alreadyClaimedThisWeek: boolean;
  isPaying: boolean;
  amount: number;
  weekKey: string;
  isWindowOpen: boolean;
  windowOpensAt: string;
  windowClosesAt: string;
  nextWindowOpensAt: string;
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
  modelUsed: string | null;
  creditsConsumed: number;
  outputUrls: string[];
  errorMessage: string | null;
  processingTimeMs: number | null;
  createdAt: string;
  completedAt: string | null;
}

// ─── Inworld voices cache (module-level, dedupes concurrent fetches) ─────
const INWORLD_VOICES_CACHE_TTL = 60 * 60 * 1000; // 1h
let inworldVoicesCache: { at: number; voices: InworldVoice[] } | null = null;
let inworldVoicesInFlight: Promise<InworldVoiceListResponse> | null = null;

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
      return authRequest<PaginatedResponse<GalleryItem>>(
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

  voices: {
    list(accessToken: string) {
      return authRequest<VoiceListResponse>('/api/v1/voices', accessToken);
    },
    create(accessToken: string, payload: { generationId: string; name: string }) {
      return authRequest<VoiceProfile>('/api/v1/voices', accessToken, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    rename(accessToken: string, id: string, name: string) {
      return authRequest<VoiceProfile>(`/api/v1/voices/${id}`, accessToken, {
        method: 'PATCH',
        body: JSON.stringify({ name }),
      });
    },
    delete(accessToken: string, id: string) {
      return authRequest<void>(`/api/v1/voices/${id}`, accessToken, {
        method: 'DELETE',
      });
    },
  },

  avatars: {
    list(accessToken: string) {
      return authRequest<UserAvatarListResponse>('/api/v1/avatars', accessToken);
    },
    get(accessToken: string, id: string) {
      return authRequest<UserAvatar>(`/api/v1/avatars/${id}`, accessToken);
    },
    create(accessToken: string, payload: CreateUserAvatarPayload) {
      return authRequest<UserAvatar>('/api/v1/avatars', accessToken, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    delete(accessToken: string, id: string) {
      return authRequest<void>(`/api/v1/avatars/${id}`, accessToken, {
        method: 'DELETE',
      });
    },
    generateVideo(
      accessToken: string,
      id: string,
      payload: GenerateAvatarVideoPayload,
    ) {
      return authRequest<CreateAvatarVideoResponse>(
        `/api/v1/avatars/${id}/generate-video`,
        accessToken,
        { method: 'POST', body: JSON.stringify(payload) },
      );
    },
    /** SSE URL — pass to new EventSource() with auth via header isn't supported,
     *  so the page should fetch via SSR endpoint or we expose a one-shot poll. */
    eventsUrl(id: string): string {
      return `${BASE_URL}/api/v1/avatars/${id}/events`;
    },
  },

  uploads: {
    presigned(
      accessToken: string,
      payload: { filename: string; contentType: string; purpose: 'generation_input' | 'reference_video' | 'avatar_source' | 'avatar_audio' },
    ) {
      return authRequest<{ uploadUrl: string; fileKey: string }>(
        '/api/v1/uploads/presigned-url',
        accessToken,
        { method: 'POST', body: JSON.stringify(payload) },
      );
    },
  },

  inworld: {
    listVoices(language?: string) {
      // Filtered queries: always go to backend (cache is for the full list).
      if (language) {
        return request<InworldVoiceListResponse>(
          `/api/v1/inworld/voices?language=${encodeURIComponent(language)}`,
        );
      }
      const now = Date.now();
      if (
        inworldVoicesCache &&
        now - inworldVoicesCache.at < INWORLD_VOICES_CACHE_TTL
      ) {
        return Promise.resolve({ voices: inworldVoicesCache.voices });
      }
      if (inworldVoicesInFlight) return inworldVoicesInFlight;
      inworldVoicesInFlight = request<InworldVoiceListResponse>(
        '/api/v1/inworld/voices',
      )
        .then((res) => {
          inworldVoicesCache = { at: Date.now(), voices: res.voices };
          return res;
        })
        .finally(() => {
          inworldVoicesInFlight = null;
        });
      return inworldVoicesInFlight;
    },
    previewUrl(voiceId: string): string {
      return `${BASE_URL}/api/v1/inworld/voices/${encodeURIComponent(voiceId)}/preview`;
    },
  },

  generations: {
    generateImage(accessToken: string, payload: GenerateImageRequest) {
      return authRequest<CreateGenerationResponse>('/api/v1/generations/generate-image-auto', accessToken, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    upscale(accessToken: string, payload: UpscaleRequest) {
      return authRequest<CreateGenerationResponse>('/api/v1/generations/upscale', accessToken, {
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
    virtualTryOn(accessToken: string, payload: VirtualTryOnRequest) {
      return authRequest<CreateGenerationResponse>('/api/v1/generations/virtual-try-on', accessToken, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    faceSwap(accessToken: string, payload: FaceSwapRequest) {
      return authRequest<CreateGenerationResponse>('/api/v1/generations/face-swap', accessToken, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    textToVideoKie(accessToken: string, payload: TextToVideoKieRequest) {
      return authRequest<CreateGenerationResponse>('/api/v1/generations/text-to-video-kie', accessToken, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    imageToVideoKie(accessToken: string, payload: ImageToVideoKieRequest) {
      return authRequest<CreateGenerationResponse>('/api/v1/generations/image-to-video-kie', accessToken, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    referenceToVideoKie(accessToken: string, payload: ReferenceToVideoKieRequest) {
      return authRequest<CreateGenerationResponse>('/api/v1/generations/reference-to-video-kie', accessToken, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    imageToVideoGrok(accessToken: string, payload: ImageToVideoGrokRequest) {
      return authRequest<CreateGenerationResponse>('/api/v1/generations/image-to-video-grok', accessToken, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    textToSpeech(accessToken: string, payload: TextToSpeechRequest) {
      return authRequest<CreateGenerationResponse>('/api/v1/generations/text-to-speech', accessToken, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    voiceClone(accessToken: string, payload: VoiceCloneRequest) {
      return authRequest<CreateGenerationResponse>('/api/v1/generations/voice-clone', accessToken, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    get(accessToken: string, id: string) {
      return authRequest<Generation>(`/api/v1/generations/${id}`, accessToken);
    },
    getUnlimitedStatus(accessToken: string) {
      return authRequest<UnlimitedStatus>(
        '/api/v1/generations/unlimited/status',
        accessToken,
      );
    },
    delete(accessToken: string, id: string) {
      return authRequest<void>(`/api/v1/generations/${id}`, accessToken, { method: 'DELETE' });
    },
    deleteOutput(accessToken: string, generationId: string, outputId: string) {
      return authRequest<void>(`/api/v1/generations/${generationId}/outputs/${outputId}`, accessToken, { method: 'DELETE' });
    },
    getFolders(accessToken: string, id: string) {
      return authRequest<Folder[]>(`/api/v1/generations/${id}/folders`, accessToken);
    },
  },

  credits: {
    balance(accessToken: string) {
      return authRequest<CreditsBalance>('/api/v1/credits/balance', accessToken);
    },
    packages(accessToken: string, currency?: string) {
      const qs = currency ? `?currency=${encodeURIComponent(currency)}` : '';
      return authRequest<CreditPackage[]>(`/api/v1/credits/packages${qs}`, accessToken);
    },
    estimate(accessToken: string, payload: CreditsEstimateRequest) {
      return authRequest<CreditsEstimateResponse>('/api/v1/credits/estimate', accessToken, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    purchase(accessToken: string, packageId: string, currency?: string) {
      return authRequest<{ checkoutUrl: string }>('/api/v1/credits/purchase', accessToken, {
        method: 'POST',
        body: JSON.stringify({ packageId, ...(currency ? { currency } : {}) }),
      });
    },
    transactions(accessToken: string, page = 1, limit = 20) {
      return authRequest<PaginatedResponse<CreditTransaction>>(
        `/api/v1/credits/transactions?page=${page}&limit=${limit}`,
        accessToken,
      );
    },
  },

  payments: {
    createBoostPix(accessToken: string, packageId: string, taxId?: string) {
      return authRequest<PixCharge>('/api/v1/payments/pix/boost', accessToken, {
        method: 'POST',
        body: JSON.stringify({ packageId, ...(taxId ? { taxId } : {}) }),
      });
    },
    getPixStatus(accessToken: string, abacatepayId: string) {
      return authRequest<{ status: PixStatus; paid: boolean }>(
        `/api/v1/payments/pix/${encodeURIComponent(abacatepayId)}/status`,
        accessToken,
      );
    },
  },

  feedback: {
    submit(
      accessToken: string,
      body: {
        nps: number;
        rating: number;
        goal: string;
        goalOther?: string;
        features: string[];
        highlight: string;
        improve: string;
        wishlist: string;
      },
    ) {
      return authRequest<{ submitted: true; creditsAwarded: number }>(
        '/api/v1/feedback',
        accessToken,
        { method: 'POST', body: JSON.stringify(body) },
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
    updateProfile(
      accessToken: string,
      body: { name?: string; avatarUrl?: string; country?: string; locale?: string; currency?: string; timezone?: string },
    ) {
      return authRequest<UserProfile>('/api/v1/users/me', accessToken, {
        method: 'PATCH',
        body: JSON.stringify(body),
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
    create(accessToken: string, planSlug: string, currency?: string) {
      return authRequest<{ checkoutUrl: string }>('/api/v1/subscriptions', accessToken, {
        method: 'POST',
        body: JSON.stringify({ planSlug, ...(currency ? { currency } : {}) }),
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
    pause(accessToken: string) {
      return authRequest<Record<string, unknown>>('/api/v1/subscriptions/pause', accessToken, {
        method: 'POST',
      });
    },
    acceptOffer(accessToken: string, reason: string) {
      return authRequest<{ offerType: string; detail: string }>('/api/v1/subscriptions/accept-offer', accessToken, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      });
    },
    upgrade(accessToken: string, planSlug: string, currency?: string) {
      return authRequest<{ checkoutUrl: string }>('/api/v1/subscriptions/upgrade', accessToken, {
        method: 'PATCH',
        body: JSON.stringify({ planSlug, ...(currency ? { currency } : {}) }),
      });
    },
    downgrade(accessToken: string, planSlug: string) {
      return authRequest<Record<string, unknown>>('/api/v1/subscriptions/downgrade', accessToken, {
        method: 'PATCH',
        body: JSON.stringify({ planSlug }),
      });
    },
    cancelDowngrade(accessToken: string) {
      return authRequest<Record<string, unknown>>('/api/v1/subscriptions/cancel-downgrade', accessToken, {
        method: 'POST',
      });
    },
    billingPortal(accessToken: string) {
      return authRequest<{ portalUrl: string }>('/api/v1/subscriptions/billing-portal', accessToken, {
        method: 'POST',
      });
    },
  },

  prompts: {
    getAll(accessToken: string) {
      return authRequest<{ sections: ApiPromptSection[] }>('/api/v1/prompts', accessToken);
    },
    getAllPublic() {
      return request<{ sections: ApiPromptSection[] }>('/api/v1/prompts');
    },
    deleteTemplate(accessToken: string, id: string) {
      return authRequest<void>(`/api/v1/admin/prompts/templates/${id}`, accessToken, {
        method: 'DELETE',
      });
    },
    createTemplate(accessToken: string, data: {
      categoryId: string;
      title: string;
      type: string;
      prompt: string;
      imageUrl?: string;
      aiModel?: string;
    }) {
      return authRequest<{ id: string }>('/api/v1/admin/prompts/templates', accessToken, {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
  },

  plans: {
    list(accessToken: string, currency?: string) {
      const qs = currency ? `?currency=${encodeURIComponent(currency)}` : '';
      return authRequest<Plan[]>(`/api/v1/plans${qs}`, accessToken);
    },
    listPublic(currency?: string) {
      const qs = currency ? `?currency=${encodeURIComponent(currency)}` : '';
      return request<Plan[]>(`/api/v1/plans${qs}`);
    },
  },

  models: {
    listVideos() {
      return request<AiModelPublic[]>('/api/v1/models/videos');
    },
    listImages() {
      return request<AiModelPublic[]>('/api/v1/models/images');
    },
    listAudio() {
      return request<AiModelPublic[]>('/api/v1/models/audio');
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
    enhanceInfluencer(accessToken: string, selections: Record<string, string>, referenceImage?: { base64: string; mimeType: string }) {
      return authRequest<{ enhancedPrompt: string }>('/api/v1/prompt-enhancer/enhance-influencer', accessToken, {
        method: 'POST',
        body: JSON.stringify({
          ...selections,
          ...(referenceImage ? { referenceImageBase64: referenceImage.base64, referenceImageMimeType: referenceImage.mimeType } : {}),
        }),
      });
    },
  },

  promptAgent: {
    analyzeImage(accessToken: string, image: string) {
      return authRequest<{ json: any; compiledPrompt: string; creditsUsed: number }>(
        '/api/v1/prompt-agent/analyze-image',
        accessToken,
        {
          method: 'POST',
          body: JSON.stringify({ image }),
        },
      );
    },
  },

  rewards: {
    weeklyClaimStatus(accessToken: string) {
      return authRequest<WeeklyClaimStatus>('/api/v1/rewards/weekly-claim', accessToken);
    },
    claimWeekly(accessToken: string) {
      return authRequest<WeeklyClaimStatus>('/api/v1/rewards/weekly-claim', accessToken, {
        method: 'POST',
      });
    },
  },

  announcements: {
    active(accessToken: string) {
      return authRequest<Announcement[]>('/api/v1/announcements/active', accessToken);
    },
  },

  admin: {
    stats(accessToken: string) {
      return authRequest<AdminStats>('/api/v1/admin/stats', accessToken);
    },
    unlimitedQueueStats(accessToken: string) {
      return authRequest<UnlimitedQueueStats>(
        '/api/v1/admin/unlimited/queue/stats',
        accessToken,
      );
    },
    unlimitedQueueJobs(accessToken: string, status: UnlimitedJobStatus, limit = 50) {
      return authRequest<UnlimitedJobView[]>(
        `/api/v1/admin/unlimited/queue/jobs?status=${status}&limit=${limit}`,
        accessToken,
      );
    },
    unlimitedUsageOverview(accessToken: string) {
      return authRequest<UnlimitedUsageOverview>(
        '/api/v1/admin/unlimited/usage/overview',
        accessToken,
      );
    },
    unlimitedSetManualDelay(
      accessToken: string,
      userId: string,
      payload: { delaySeconds: number; ttlMinutes: number },
    ) {
      return authRequest<{ ok: boolean; userId: string; delayMs: number; ttlSeconds: number }>(
        `/api/v1/admin/unlimited/users/${userId}/manual-delay`,
        accessToken,
        { method: 'POST', body: JSON.stringify(payload) },
      );
    },
    unlimitedClearManualDelay(accessToken: string, userId: string) {
      return authRequest<{ ok: boolean; userId: string }>(
        `/api/v1/admin/unlimited/users/${userId}/manual-delay`,
        accessToken,
        { method: 'DELETE' },
      );
    },
    users(accessToken: string, page = 1, limit = 20, search?: string, subscriptionStatus?: string, excludePlanSlug?: string) {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });
      if (search && search.trim()) params.set('search', search.trim());
      if (subscriptionStatus) params.set('subscriptionStatus', subscriptionStatus);
      if (excludePlanSlug) params.set('excludePlanSlug', excludePlanSlug);
      return authRequest<AdminPaginatedResponse<AdminUser>>(
        `/api/v1/admin/users?${params.toString()}`,
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
    toggleUserStatus(accessToken: string, userId: string, isActive: boolean) {
      return authRequest<{ success: boolean; message: string }>(
        `/api/v1/admin/users/${userId}/status`,
        accessToken,
        {
          method: 'PATCH',
          body: JSON.stringify({ isActive }),
        },
      );
    },
    deleteUser(accessToken: string, userId: string) {
      return authRequest<{ success: boolean; message: string }>(
        `/api/v1/admin/users/${userId}`,
        accessToken,
        { method: 'DELETE' },
      );
    },
    userGenerations(accessToken: string, userId: string, page = 1, limit = 20) {
      return authRequest<AdminPaginatedResponse<AdminUserGeneration>>(
        `/api/v1/admin/users/${userId}/generations?page=${page}&limit=${limit}`,
        accessToken,
      );
    },
    changeUserPlan(accessToken: string, userId: string, planSlug: string) {
      return authRequest<{ success: boolean; message: string }>(
        `/api/v1/admin/users/${userId}/plan`,
        accessToken,
        {
          method: 'PATCH',
          body: JSON.stringify({ planSlug }),
        },
      );
    },
    adjustFreeGenerations(
      accessToken: string,
      userId: string,
      type: FreeGenerationType,
      amount: number,
    ) {
      return authRequest<{ success: boolean; message: string }>(
        `/api/v1/admin/users/${userId}/free-generations`,
        accessToken,
        {
          method: 'PATCH',
          body: JSON.stringify({ type, amount }),
        },
      );
    },
    generations(accessToken: string, page = 1, limit = 20) {
      return authRequest<AdminPaginatedResponse<AdminGeneration>>(
        `/api/v1/admin/generations?page=${page}&limit=${limit}`,
        accessToken,
      );
    },
    providerStats(accessToken: string) {
      return authRequest<AdminProviderStats>('/api/v1/admin/generations/providers', accessToken);
    },
    financialStats(accessToken: string, days = 30) {
      return authRequest<FinancialStats>(`/api/v1/admin/stats/financial?days=${days}`, accessToken);
    },
    userStats(accessToken: string, days = 30) {
      return authRequest<UserStats>(`/api/v1/admin/stats/users?days=${days}`, accessToken);
    },
    usageStats(accessToken: string, days = 30) {
      return authRequest<UsageStats>(`/api/v1/admin/stats/usage?days=${days}`, accessToken);
    },
    creditStats(accessToken: string, days = 30) {
      return authRequest<CreditStats>(`/api/v1/admin/stats/credits?days=${days}`, accessToken);
    },
    healthStats(accessToken: string) {
      return authRequest<HealthStats>('/api/v1/admin/stats/health', accessToken);
    },
    feedbackList(accessToken: string, page = 1, limit = 20) {
      return authRequest<{
        data: AdminFeedback[];
        meta: { page: number; limit: number; total: number };
        stats: AdminFeedbackStats;
      }>(`/api/v1/admin/feedback?page=${page}&limit=${limit}`, accessToken);
    },
    affiliatesDashboard(accessToken: string) {
      return authRequest<AffiliateDashboard>('/api/v1/admin/affiliates/dashboard', accessToken);
    },
    affiliatesList(accessToken: string) {
      return authRequest<Affiliate[]>('/api/v1/admin/affiliates', accessToken);
    },
    affiliateById(accessToken: string, id: string) {
      return authRequest<Affiliate>(`/api/v1/admin/affiliates/${id}`, accessToken);
    },
    affiliateEarnings(accessToken: string, id: string) {
      return authRequest<AffiliateEarningsResponse>(`/api/v1/admin/affiliates/${id}/earnings`, accessToken);
    },
    affiliateReferredUsers(accessToken: string, id: string) {
      return authRequest<AffiliateReferredUser[]>(`/api/v1/admin/affiliates/${id}/referred-users`, accessToken);
    },
    createAffiliate(
      accessToken: string,
      data: {
        name: string;
        code: string;
        commissionPercent?: number;
        userId?: string;
        discountPercent?: number;
        discountAppliesTo?: AffiliateDiscountScope;
      },
    ) {
      return authRequest<Affiliate>('/api/v1/admin/affiliates', accessToken, {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    updateAffiliate(
      accessToken: string,
      id: string,
      data: {
        name?: string;
        commissionPercent?: number;
        userId?: string | null;
        discountPercent?: number | null;
        discountAppliesTo?: AffiliateDiscountScope;
      },
    ) {
      return authRequest<Affiliate>(`/api/v1/admin/affiliates/${id}`, accessToken, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
    },
    toggleAffiliate(accessToken: string, id: string) {
      return authRequest<Affiliate>(`/api/v1/admin/affiliates/${id}/toggle-active`, accessToken, {
        method: 'PATCH',
      });
    },
    deleteAffiliate(accessToken: string, id: string) {
      return authRequest<{ id: string; code: string; deletedEarnings: number }>(
        `/api/v1/admin/affiliates/${id}`,
        accessToken,
        { method: 'DELETE' },
      );
    },
    markEarningsPaid(
      accessToken: string,
      earningIds: string[],
      receipt?: { base64: string; filename: string; mimeType: string },
    ) {
      return authRequest<{ updated: number }>('/api/v1/admin/affiliates/earnings/mark-paid', accessToken, {
        method: 'POST',
        body: JSON.stringify({
          earningIds,
          ...(receipt && {
            receiptBase64: receipt.base64,
            receiptFilename: receipt.filename,
            receiptMimeType: receipt.mimeType,
          }),
        }),
      });
    },
    upload(accessToken: string, filename: string, contentType: string, folder: string) {
      return authRequest<{ uploadUrl: string; fileKey: string; publicUrl: string }>(
        '/api/v1/admin/upload',
        accessToken,
        {
          method: 'POST',
          body: JSON.stringify({ filename, contentType, folder }),
        },
      );
    },
    models: {
      list(accessToken: string) {
        return authRequest<AiModelAdmin[]>('/api/v1/admin/models', accessToken);
      },
      toggle(accessToken: string, id: string, isActive: boolean, statusMessage?: string) {
        return authRequest<{ success: boolean; message: string }>(
          `/api/v1/admin/models/${id}/toggle`,
          accessToken,
          {
            method: 'PATCH',
            body: JSON.stringify({ isActive, statusMessage }),
          },
        );
      },
    },
    prompts: {
      list(accessToken: string) {
        return authRequest<AdminPromptSection[]>('/api/v1/admin/prompts', accessToken);
      },
      createSection(accessToken: string, data: {
        slug: string;
        title: string;
        description?: string;
        icon?: string;
        sortOrder?: number;
      }) {
        return authRequest<AdminPromptSection>('/api/v1/admin/prompts/sections', accessToken, {
          method: 'POST',
          body: JSON.stringify(data),
        });
      },
      updateSection(accessToken: string, id: string, data: {
        slug?: string;
        title?: string;
        description?: string;
        icon?: string;
        sortOrder?: number;
        isActive?: boolean;
      }) {
        return authRequest<AdminPromptSection>(`/api/v1/admin/prompts/sections/${id}`, accessToken, {
          method: 'PATCH',
          body: JSON.stringify(data),
        });
      },
      deleteSection(accessToken: string, id: string) {
        return authRequest<{ success: boolean }>(`/api/v1/admin/prompts/sections/${id}`, accessToken, {
          method: 'DELETE',
        });
      },
      createCategory(accessToken: string, data: { sectionId: string; title: string; sortOrder?: number }) {
        return authRequest<AdminPromptCategory>('/api/v1/admin/prompts/categories', accessToken, {
          method: 'POST',
          body: JSON.stringify(data),
        });
      },
      updateCategory(accessToken: string, id: string, data: { sectionId?: string; title?: string; sortOrder?: number }) {
        return authRequest<AdminPromptCategory>(`/api/v1/admin/prompts/categories/${id}`, accessToken, {
          method: 'PATCH',
          body: JSON.stringify(data),
        });
      },
      deleteCategory(accessToken: string, id: string) {
        return authRequest<{ success: boolean }>(`/api/v1/admin/prompts/categories/${id}`, accessToken, {
          method: 'DELETE',
        });
      },
      createTemplate(accessToken: string, data: {
        categoryId: string;
        title: string;
        type: string;
        prompt: string;
        imageUrl?: string;
        aiModel?: string;
        sortOrder?: number;
      }) {
        return authRequest<AdminPromptTemplate>('/api/v1/admin/prompts/templates', accessToken, {
          method: 'POST',
          body: JSON.stringify(data),
        });
      },
      updateTemplate(accessToken: string, id: string, data: {
        categoryId?: string;
        title?: string;
        type?: string;
        prompt?: string;
        imageUrl?: string;
        aiModel?: string;
        sortOrder?: number;
      }) {
        return authRequest<AdminPromptTemplate>(`/api/v1/admin/prompts/templates/${id}`, accessToken, {
          method: 'PATCH',
          body: JSON.stringify(data),
        });
      },
      deleteTemplate(accessToken: string, id: string) {
        return authRequest<{ success: boolean }>(`/api/v1/admin/prompts/templates/${id}`, accessToken, {
          method: 'DELETE',
        });
      },
    },
    promptPosts: {
      list(accessToken: string, params: { page?: number; limit?: number; published?: boolean } = {}) {
        const qs = new URLSearchParams();
        if (params.page) qs.set('page', String(params.page));
        if (params.limit) qs.set('limit', String(params.limit));
        if (params.published !== undefined) qs.set('published', String(params.published));
        const suffix = qs.toString() ? `?${qs.toString()}` : '';
        return authRequest<{
          data: PromptPost[];
          meta: { page: number; limit: number; total: number; totalPages: number };
        }>(`/api/v1/admin/prompt-posts${suffix}`, accessToken);
      },
      get(accessToken: string, id: string) {
        return authRequest<PromptPost>(`/api/v1/admin/prompt-posts/${id}`, accessToken);
      },
      create(accessToken: string, data: PromptPostInput) {
        return authRequest<PromptPost>('/api/v1/admin/prompt-posts', accessToken, {
          method: 'POST',
          body: JSON.stringify(data),
        });
      },
      update(accessToken: string, id: string, data: Partial<PromptPostInput>) {
        return authRequest<PromptPost>(`/api/v1/admin/prompt-posts/${id}`, accessToken, {
          method: 'PATCH',
          body: JSON.stringify(data),
        });
      },
      remove(accessToken: string, id: string) {
        return authRequest<{ success: boolean }>(`/api/v1/admin/prompt-posts/${id}`, accessToken, {
          method: 'DELETE',
        });
      },
    },
    announcements: {
      list(accessToken: string) {
        return authRequest<Announcement[]>('/api/v1/admin/announcements', accessToken);
      },
      get(accessToken: string, id: string) {
        return authRequest<Announcement>(`/api/v1/admin/announcements/${id}`, accessToken);
      },
      create(accessToken: string, data: CreateAnnouncementInput) {
        return authRequest<Announcement>('/api/v1/admin/announcements', accessToken, {
          method: 'POST',
          body: JSON.stringify(data),
        });
      },
      update(accessToken: string, id: string, data: UpdateAnnouncementInput) {
        return authRequest<Announcement>(`/api/v1/admin/announcements/${id}`, accessToken, {
          method: 'PATCH',
          body: JSON.stringify(data),
        });
      },
      toggle(accessToken: string, id: string) {
        return authRequest<Announcement>(`/api/v1/admin/announcements/${id}/toggle`, accessToken, {
          method: 'PATCH',
        });
      },
      delete(accessToken: string, id: string) {
        return authRequest<{ success: boolean }>(`/api/v1/admin/announcements/${id}`, accessToken, {
          method: 'DELETE',
        });
      },
    },
  },

  adminEmails: {
    previewCount(
      accessToken: string,
      payload: {
        recipientType: 'ALL' | 'ALL_PAID' | 'BY_PLAN' | 'CUSTOM_LIST' | 'SINGLE';
        recipientFilter?: { planSlug?: string; emails?: string[]; email?: string };
      },
    ) {
      return authRequest<{ count: number }>(
        '/api/v1/admin/emails/preview-count',
        accessToken,
        { method: 'POST', body: JSON.stringify(payload) },
      );
    },
    renderPreview(
      accessToken: string,
      payload: {
        bodyMarkdown: string;
        subject?: string;
        mergeVars?: Record<string, string>;
        format?: 'markdown' | 'html';
      },
    ) {
      return authRequest<{ html: string; subject?: string }>(
        '/api/v1/admin/emails/render-preview',
        accessToken,
        { method: 'POST', body: JSON.stringify(payload) },
      );
    },
    sendTest(
      accessToken: string,
      payload: { subject: string; bodyMarkdown: string; format?: 'markdown' | 'html' },
    ) {
      return authRequest<{ ok: boolean; sentTo: string }>(
        '/api/v1/admin/emails/test',
        accessToken,
        { method: 'POST', body: JSON.stringify(payload) },
      );
    },
    send(
      accessToken: string,
      payload: {
        subject: string;
        bodyMarkdown: string;
        recipientType: 'ALL' | 'ALL_PAID' | 'BY_PLAN' | 'CUSTOM_LIST' | 'SINGLE';
        recipientFilter?: { planSlug?: string; emails?: string[]; email?: string };
        format?: 'markdown' | 'html';
      },
    ) {
      return authRequest<{ id: string; status: string; totalRecipients: number }>(
        '/api/v1/admin/emails/send',
        accessToken,
        { method: 'POST', body: JSON.stringify(payload) },
      );
    },
    list(accessToken: string, page = 1, limit = 20) {
      return authRequest<{
        items: Array<{
          id: string;
          subject: string;
          recipientType: string;
          totalRecipients: number;
          sentCount: number;
          failedCount: number;
          status: string;
          startedAt: string | null;
          completedAt: string | null;
          createdAt: string;
          triggeredBy: { id: string; name: string; email: string };
        }>;
        total: number;
        page: number;
        limit: number;
      }>(`/api/v1/admin/emails?page=${page}&limit=${limit}`, accessToken);
    },
    detail(accessToken: string, id: string) {
      return authRequest<{
        id: string;
        subject: string;
        bodyMarkdown: string;
        bodyHtml: string;
        recipientType: string;
        recipientFilter: unknown;
        totalRecipients: number;
        sentCount: number;
        failedCount: number;
        status: string;
        errorMessage: string | null;
        startedAt: string | null;
        completedAt: string | null;
        createdAt: string;
        triggeredBy: { id: string; name: string; email: string };
        recipients: Array<{
          id: string;
          email: string;
          status: string;
          errorMessage: string | null;
          deliveredAt: string | null;
          openedAt: string | null;
          clickedAt: string | null;
          bouncedAt: string | null;
        }>;
      }>(`/api/v1/admin/emails/${id}`, accessToken);
    },
  },

  promptPosts: {
    getBySlug(slug: string) {
      return request<PromptPost>(`/api/v1/prompt-posts/${slug}`);
    },
    track(slug: string, event: 'view' | 'copy' | 'use', slideIndex?: number) {
      return request<void>(`/api/v1/prompt-posts/${slug}/track`, {
        method: 'POST',
        body: JSON.stringify({ event, slideIndex }),
      });
    },
  },

  auth: {
    checkAvailability(email?: string) {
      return request<{ emailTaken: boolean }>('/api/v1/auth/check-availability', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
    },

    login(email: string, password: string) {
      return request<AuthResponse>('/api/v1/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
    },

    register(email: string, name: string, password: string, referralCode?: string) {
      const tracking = readAttribution();
      return request<AuthResponse>('/api/v1/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          email,
          name,
          password,
          ...(referralCode && { referralCode }),
          ...(tracking && { tracking }),
        }),
      });
    },

    refresh(refreshToken: string) {
      return request<AuthResponse>('/api/v1/auth/refresh', {
        method: 'POST',
        body: JSON.stringify({ refreshToken }),
      });
    },

    google(googleToken: string, referralCode?: string) {
      const tracking = readAttribution();
      return request<AuthResponse>('/api/v1/auth/google', {
        method: 'POST',
        body: JSON.stringify({
          googleToken,
          ...(referralCode && { referralCode }),
          ...(tracking && { tracking }),
        }),
      });
    },

    logout(refreshToken: string) {
      return request<void>('/api/v1/auth/logout', {
        method: 'POST',
        body: JSON.stringify({ refreshToken }),
      });
    },

    forgotPassword(email: string) {
      return request<{ message: string }>('/api/v1/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
    },

    resetPassword(token: string, password: string) {
      return request<{ message: string }>('/api/v1/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token, password }),
      });
    },

    verifyEmail(code: string) {
      return request<{ message: string }>('/api/v1/auth/verify-email', {
        method: 'POST',
        body: JSON.stringify({ code }),
      });
    },

    resendVerification(accessToken: string) {
      return authRequest<{ message: string }>('/api/v1/auth/resend-verification', accessToken, {
        method: 'POST',
      });
    },

    resendVerificationByEmail(email: string) {
      return request<{ message: string }>('/api/v1/auth/resend-verification', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
    },

  },

  affiliates: {
    async me(accessToken: string) {
      const result = await authRequest<{
        affiliate: {
          id: string;
          code: string;
          name: string;
          commissionPercent: number;
          isActive: boolean;
          pixKey: string | null;
          pixKeyType: PixKeyType | null;
          createdAt: string;
        };
        summary: {
          referredUsers: number;
          totalPayments: number;
          totalRevenueCents: number;
          totalCommissionCents: number;
          pendingCommissionCents: number;
          availableCommissionCents: number;
          maturingCommissionCents: number;
          paidCommissionCents: number;
          maturationDays: number;
        };
        earnings: {
          id: string;
          amountCents: number;
          commissionCents: number;
          status: 'PENDING' | 'PAID';
          paidAt: string | null;
          createdAt: string;
          user: { name: string; email: string };
          payment: {
            type: string;
            amountCents: number;
            subscription: { plan: { name: string; slug: string } } | null;
            creditPackage: { name: string; credits: number } | null;
          };
        }[];
      } | null | undefined>('/api/v1/affiliates/me', accessToken);
      return result ?? null;
    },

    createMe(accessToken: string, data: { pixKey: string; pixKeyType: PixKeyType }) {
      return authRequest<{
        id: string;
        code: string;
        name: string;
        commissionPercent: number;
        isActive: boolean;
        pixKey: string | null;
        pixKeyType: PixKeyType | null;
        createdAt: string;
      }>('/api/v1/affiliates/me', accessToken, {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    updateMyPixKey(accessToken: string, data: { pixKey: string; pixKeyType: PixKeyType }) {
      return authRequest<{
        id: string;
        pixKey: string;
        pixKeyType: PixKeyType;
      }>('/api/v1/affiliates/me/pix-key', accessToken, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
    },
  },

  adminStripe: {
    overview(accessToken: string) {
      return authRequest<StripeOverview>('/api/v1/admin/stripe/overview', accessToken);
    },

    listCharges(accessToken: string, params: StripeListParams & { customer?: string } = {}) {
      const qs = buildStripeQuery(params);
      return authRequest<StripeList<StripeCharge>>(`/api/v1/admin/stripe/charges${qs}`, accessToken);
    },
    getCharge(accessToken: string, id: string) {
      return authRequest<StripeCharge>(`/api/v1/admin/stripe/charges/${id}`, accessToken);
    },
    refundCharge(accessToken: string, id: string, body: { amount?: number; reason?: 'duplicate' | 'fraudulent' | 'requested_by_customer' } = {}) {
      return authRequest<StripeRefund>(`/api/v1/admin/stripe/charges/${id}/refund`, accessToken, {
        method: 'POST',
        body: JSON.stringify(body),
      });
    },

    listCustomers(accessToken: string, params: StripeListParams & { email?: string; search?: string } = {}) {
      const qs = buildStripeQuery(params);
      return authRequest<StripeList<StripeCustomer>>(`/api/v1/admin/stripe/customers${qs}`, accessToken);
    },
    getCustomer(accessToken: string, id: string) {
      return authRequest<StripeCustomerDetail>(`/api/v1/admin/stripe/customers/${id}`, accessToken);
    },

    listProducts(accessToken: string, params: StripeListParams & { active?: boolean } = {}) {
      const qs = buildStripeQuery(params);
      return authRequest<StripeList<StripeProduct>>(`/api/v1/admin/stripe/products${qs}`, accessToken);
    },
    getProduct(accessToken: string, id: string) {
      return authRequest<StripeProduct>(`/api/v1/admin/stripe/products/${id}`, accessToken);
    },
    createProduct(accessToken: string, body: { name: string; description?: string; active?: boolean; metadata?: Record<string, string> }) {
      return authRequest<StripeProduct>('/api/v1/admin/stripe/products', accessToken, {
        method: 'POST',
        body: JSON.stringify(body),
      });
    },
    updateProduct(accessToken: string, id: string, body: { name?: string; description?: string; active?: boolean; metadata?: Record<string, string> }) {
      return authRequest<StripeProduct>(`/api/v1/admin/stripe/products/${id}`, accessToken, {
        method: 'PATCH',
        body: JSON.stringify(body),
      });
    },
    deleteProduct(accessToken: string, id: string) {
      return authRequest<StripeProduct | { deleted: true; id: string }>(`/api/v1/admin/stripe/products/${id}`, accessToken, {
        method: 'DELETE',
      });
    },

    listPrices(accessToken: string, params: StripeListParams & { product?: string; active?: boolean } = {}) {
      const qs = buildStripeQuery(params);
      return authRequest<StripeList<StripePrice>>(`/api/v1/admin/stripe/prices${qs}`, accessToken);
    },
    getPrice(accessToken: string, id: string) {
      return authRequest<StripePrice>(`/api/v1/admin/stripe/prices/${id}`, accessToken);
    },
    createPrice(accessToken: string, body: {
      product: string;
      unitAmount: number;
      currency: string;
      nickname?: string;
      recurring?: { interval: 'day' | 'week' | 'month' | 'year'; intervalCount?: number };
      metadata?: Record<string, string>;
    }) {
      return authRequest<StripePrice>('/api/v1/admin/stripe/prices', accessToken, {
        method: 'POST',
        body: JSON.stringify(body),
      });
    },
    archivePrice(accessToken: string, id: string) {
      return authRequest<StripePrice>(`/api/v1/admin/stripe/prices/${id}/archive`, accessToken, { method: 'PATCH' });
    },
    activatePrice(accessToken: string, id: string) {
      return authRequest<StripePrice>(`/api/v1/admin/stripe/prices/${id}/activate`, accessToken, { method: 'PATCH' });
    },

    listCoupons(accessToken: string, params: StripeListParams = {}) {
      const qs = buildStripeQuery(params);
      return authRequest<StripeList<StripeCoupon>>(`/api/v1/admin/stripe/coupons${qs}`, accessToken);
    },
    createCoupon(accessToken: string, body: {
      id?: string;
      name?: string;
      percentOff?: number;
      amountOff?: number;
      currency?: string;
      duration: 'once' | 'repeating' | 'forever';
      durationInMonths?: number;
      maxRedemptions?: number;
      redeemBy?: number;
      metadata?: Record<string, string>;
    }) {
      return authRequest<StripeCoupon>('/api/v1/admin/stripe/coupons', accessToken, {
        method: 'POST',
        body: JSON.stringify(body),
      });
    },
    deleteCoupon(accessToken: string, id: string) {
      return authRequest<{ id: string; deleted: true }>(`/api/v1/admin/stripe/coupons/${id}`, accessToken, { method: 'DELETE' });
    },

    listPromotionCodes(accessToken: string, params: StripeListParams & { code?: string; active?: boolean; coupon?: string } = {}) {
      const qs = buildStripeQuery(params);
      return authRequest<StripeList<StripePromotionCode>>(`/api/v1/admin/stripe/promotion-codes${qs}`, accessToken);
    },
    createPromotionCode(accessToken: string, body: {
      coupon: string;
      code?: string;
      active?: boolean;
      maxRedemptions?: number;
      expiresAt?: number;
      firstTimeTransaction?: boolean;
      minimumAmount?: number;
      minimumAmountCurrency?: string;
      metadata?: Record<string, string>;
    }) {
      return authRequest<StripePromotionCode>('/api/v1/admin/stripe/promotion-codes', accessToken, {
        method: 'POST',
        body: JSON.stringify(body),
      });
    },
    togglePromotionCode(accessToken: string, id: string, active: boolean) {
      return authRequest<StripePromotionCode>(`/api/v1/admin/stripe/promotion-codes/${id}`, accessToken, {
        method: 'PATCH',
        body: JSON.stringify({ active }),
      });
    },

    listSubscriptions(accessToken: string, params: StripeListParams & { status?: string; customer?: string; priceId?: string } = {}) {
      const qs = buildStripeQuery(params);
      return authRequest<StripeList<StripeSubscription>>(`/api/v1/admin/stripe/subscriptions${qs}`, accessToken);
    },
    getSubscription(accessToken: string, id: string) {
      return authRequest<StripeSubscription>(`/api/v1/admin/stripe/subscriptions/${id}`, accessToken);
    },
    cancelSubscription(accessToken: string, id: string, atPeriodEnd = true) {
      return authRequest<StripeSubscription>(`/api/v1/admin/stripe/subscriptions/${id}/cancel`, accessToken, {
        method: 'POST',
        body: JSON.stringify({ atPeriodEnd }),
      });
    },
    reactivateSubscription(accessToken: string, id: string) {
      return authRequest<StripeSubscription>(`/api/v1/admin/stripe/subscriptions/${id}/reactivate`, accessToken, { method: 'POST' });
    },

    listInvoices(accessToken: string, params: StripeListParams & { customer?: string; status?: string } = {}) {
      const qs = buildStripeQuery(params);
      return authRequest<StripeList<StripeInvoice>>(`/api/v1/admin/stripe/invoices${qs}`, accessToken);
    },
    getInvoice(accessToken: string, id: string) {
      return authRequest<StripeInvoice>(`/api/v1/admin/stripe/invoices/${id}`, accessToken);
    },
  },
};

// ============= Stripe admin types =============

function buildStripeQuery(params: object): string {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params as Record<string, unknown>)) {
    if (v === undefined || v === null || v === '') continue;
    qs.set(k, String(v));
  }
  const s = qs.toString();
  return s ? `?${s}` : '';
}

export interface StripeListParams {
  limit?: number;
  starting_after?: string;
  ending_before?: string;
}

export interface StripeList<T> {
  object: 'list' | 'search_result';
  data: T[];
  has_more: boolean;
  url?: string;
  next_page?: string | null;
}

export interface StripeCharge {
  id: string;
  amount: number;
  amount_refunded: number;
  currency: string;
  status: string;
  paid: boolean;
  refunded: boolean;
  created: number;
  description: string | null;
  receipt_url: string | null;
  customer: string | null;
  payment_method_details?: { type: string; card?: { brand: string; last4: string } } | null;
  metadata: Record<string, string>;
  failure_code: string | null;
  failure_message: string | null;
  outcome: {
    network_status?: string | null;
    reason?: string | null;
    risk_level?: string | null;
    seller_message?: string | null;
    type?: string | null;
  } | null;
}

export interface StripeRefund {
  id: string;
  amount: number;
  currency: string;
  status: string;
  charge: string;
  reason: string | null;
  created: number;
}

export interface StripeCustomer {
  id: string;
  email: string | null;
  name: string | null;
  phone: string | null;
  created: number;
  currency: string | null;
  balance: number;
  delinquent: boolean;
  metadata: Record<string, string>;
}

export interface StripeCustomerDetail {
  customer: StripeCustomer;
  subscriptions: StripeSubscription[];
  charges: StripeCharge[];
  invoices: StripeInvoice[];
  paymentMethods: StripePaymentMethod[];
}

export interface StripePaymentMethod {
  id: string;
  type: string;
  card?: { brand: string; last4: string; exp_month: number; exp_year: number } | null;
  created: number;
}

export interface StripeProduct {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
  created: number;
  updated: number;
  metadata: Record<string, string>;
  default_price?: string | null;
}

export interface StripePrice {
  id: string;
  product: string | StripeProduct;
  active: boolean;
  currency: string;
  unit_amount: number | null;
  nickname: string | null;
  type: 'one_time' | 'recurring';
  recurring: { interval: string; interval_count: number } | null;
  created: number;
  metadata: Record<string, string>;
}

export interface StripeCoupon {
  id: string;
  name: string | null;
  percent_off: number | null;
  amount_off: number | null;
  currency: string | null;
  duration: 'once' | 'repeating' | 'forever';
  duration_in_months: number | null;
  max_redemptions: number | null;
  times_redeemed: number;
  redeem_by: number | null;
  valid: boolean;
  created: number;
}

export interface StripePromotionCode {
  id: string;
  code: string;
  active: boolean;
  coupon: StripeCoupon;
  max_redemptions: number | null;
  times_redeemed: number;
  expires_at: number | null;
  created: number;
  restrictions: {
    first_time_transaction: boolean;
    minimum_amount: number | null;
    minimum_amount_currency: string | null;
  };
}

export interface StripeSubscription {
  id: string;
  status: 'active' | 'canceled' | 'past_due' | 'trialing' | 'paused' | 'unpaid' | 'incomplete' | 'incomplete_expired';
  customer: string | StripeCustomer;
  current_period_start?: number;
  current_period_end?: number;
  cancel_at_period_end: boolean;
  canceled_at: number | null;
  created: number;
  items: {
    data: { id: string; price: StripePrice; quantity: number }[];
  };
  discounts?: unknown[];
  metadata: Record<string, string>;
}

export interface StripeInvoice {
  id: string;
  number: string | null;
  status: string;
  amount_due: number;
  amount_paid: number;
  amount_remaining: number;
  currency: string;
  customer: string | StripeCustomer;
  hosted_invoice_url: string | null;
  invoice_pdf: string | null;
  created: number;
  period_start: number;
  period_end: number;
}

export interface StripeOverview {
  balance: {
    available: { amount: number; currency: string }[];
    pending: { amount: number; currency: string }[];
  };
  subscriptions: {
    active: { count: number; hasMore: boolean };
    pastDue: { count: number; hasMore: boolean };
    canceled: { count: number; hasMore: boolean };
    trialing: { count: number; hasMore: boolean };
  };
}
