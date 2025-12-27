export enum UserRole {
  USER = 'user',
  ADMIN_REFERRAL = 'admin referral code',
  ADMIN_DATABASE = 'admin database',
  ADMIN_REWARD = 'admin reward',
  ADMIN_NOTIFICATION = 'admin notification',
  ADMIN_LORD = 'admin lord', // Super Admin
}

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  role: UserRole;
  createdAt: any;
  // Additional fields from Firestore
  balance?: number;
  level?: string;
  referralCode?: string;
  validUntil?: string;
  lastSessionId?: string; // Untuk fitur Single Session (Like WhatsApp)
}

export interface AuthState {
  user: UserProfile | null;
  loading: boolean;
  error: string | null;
}

export type RegistrationStatus = 'DRAFT' | 'PAID' | 'SENT_TO_DB' | 'VERIFIED';

export interface RegistrationRequest {
  id: string;
  fullName: string;
  whatsapp: string;
  email: string;
  usedReferralCode: string; // Kode yg dipakai saat daftar
  generatedReferralCode: string; // Kode baru yg di-generate admin (jadi password jg)
  status: RegistrationStatus;
  createdAt: any;
  createdBy: string;
}