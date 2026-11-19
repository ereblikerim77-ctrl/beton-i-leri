export type UserRole = 'User' | 'Creator' | 'Moderator' | 'Admin';

export type OAuthProvider = 'google' | 'github' | 'facebook';

export type CardTheme = 'standard' | 'concrete' | 'olive' | 'vip';

export type ListingTier = 'standard' | 'pro' | 'vip';

export type VipFrameVariant = 'gold_olive' | 'anthracite_gold' | 'emerald_stone';

export interface ProConfig {
  highlightLabel?: string;
  customCtaText?: string;
  whatsappTemplate?: string;
  workingHours?: string;
}

export interface VipConfig {
  sloganBanner?: string;
  keyAdvantages?: string[];
  guaranteeText?: string;
  frameVariant?: VipFrameVariant;
  priorityPinOnMap?: boolean;
}

export interface PaymentSimInfo {
  plan: ListingTier;
  amountAzn: number;
  durationDays: number;
  method: 'card' | 'apple_pay' | 'terminal';
  transactionRef: string;
  paidAt: string;
  expiresAt: string;
}

export type SocialPlatform =
  | 'Instagram'
  | 'TikTok'
  | 'YouTube'
  | 'WhatsApp'
  | 'Telegram'
  | 'Veb-sayt';

export interface SocialLink {
  id: string;
  platform: SocialPlatform;
  url: string;
}

export interface MediaItem {
  id: string;
  url: string;
  type: 'image' | 'video';
  name?: string;
}

export interface AdminReply {
  text: string;
  repliedBy: string;
  repliedAt: string;
}

export interface CommentItem {
  id: string;
  listingId: string;
  userId?: string;
  authorName: string;
  authorRole: UserRole | 'Qonaq';
  text: string;
  rating?: number;
  createdAt: string;
  adminReply?: AdminReply;
}

export interface UserReview {
  id: string;
  targetUserId: string;
  authorName: string;
  rating: number;
  text: string;
  createdAt: string;
  adminReply?: AdminReply;
}

export interface User {
  id: string;
  email: string;
  passwordHash?: string;
  authProvider?: 'email' | OAuthProvider;
  firstName: string;
  lastName: string;
  companyName: string;
  phone: string;
  role: UserRole;
  verified: boolean;
  banned: boolean;
  bio: string;
  avatarUrl: string;
  coverMediaUrl: string;
  coverMediaType: 'image' | 'video';
  socialLinks: SocialLink[];
  portfolioGallery: MediaItem[];
  lastSeenAt: string;
  lastLoginAt: string;
  isOnline?: boolean;
  createdAt: string;
}

export interface Listing {
  id: string;
  userId: string;
  title: string;
  description: string;
  category: string;
  firstName: string;
  lastName: string;
  companyName: string;
  phone: string;
  socialLinks: SocialLink[];
  tags: string[];
  media: MediaItem[];
  cardTheme: CardTheme;
  tier: ListingTier;
  proConfig?: ProConfig;
  vipConfig?: VipConfig;
  paymentSim?: PaymentSimInfo;
  experienceYears: number;
  regions: string[];
  minVolumeM3: number;
  priceType: 'negotiable' | 'per_m3';
  pricePerM3?: number;
  concreteGrades: string[];
  equipmentTypes: string[];
  coordinates?: { lat: number; lng: number };
  verified: boolean;
  status: 'active' | 'pending' | 'blocked';
  views: number;
  likes: number;
  likedBy: string[];
  createdAt: string;
  updatedAt: string;
}

export interface QuoteRequest {
  id: string;
  customerName: string;
  phone: string;
  region: string;
  category: string;
  concreteGrade: string;
  volumeM3: number;
  needsPump: boolean;
  targetDate: string;
  notes: string;
  status: 'open' | 'closed';
  createdAt: string;
}

export interface GroundingSource {
  type: 'web' | 'maps';
  title: string;
  uri: string;
  snippet?: string;
}

export type AIChatMode = 'general' | 'fast' | 'search' | 'maps';

export interface AuditLogEntry {
  id: string;
  timestampMs: string;
  epochMs: number;
  ip: string;
  actorName: string;
  actorRole: string;
  action: string;
  details: string;
  severity: 'info' | 'warning' | 'critical';
}

export interface PlatformSettings {
  maintenanceMode: boolean;
  registrationEnabled: boolean;
  requireApproval: boolean;
}

export interface AnalyticsSnapshot {
  hourlyVisits: { hour: string; visits: number }[];
  tagSearches: Record<string, number>;
  deviceCounts: { mobile: number; desktop: number };
  regionCounts: Record<string, number>;
}
