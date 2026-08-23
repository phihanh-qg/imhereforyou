export type UserRole = 'parent' | 'child' | 'trusted_contact';

export type MoodType = 'happy' | 'normal' | 'tired' | 'sad';

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
  role: UserRole;
  familyId?: string | null;
  elderlyTitle?: string; // 'Mẹ', 'Bố', 'Bà', 'Ông', etc.
  relationship?: string; // 'Mẹ ruột', 'Bố ruột', 'Con gái', 'Con trai cả', etc.
  phoneNumber?: string;
  emergencyPhone?: string;
  checkInWindow?: {
    startHour: number; // e.g. 7 (07:00)
    endHour: number;   // e.g. 10 (10:00)
  };
  createdAt: string;
  updatedAt: string;
}

export interface MeetingParticipant {
  userId: string;
  displayName: string;
  role: UserRole;
  joinedAt: string;
  lastSeenAt?: string;
}

export interface ActiveMeeting {
  isOpen: boolean;
  meetingId: string;
  meetUrl: string;
  fixedMeetUrl?: string;
  createdById: string;
  createdByName: string;
  createdByRole: UserRole;
  startedAt: string;
  participants?: MeetingParticipant[];
  title?: string;
}

export interface Family {
  id: string;
  name: string;
  createdBy: string;
  parentIds: string[];
  childIds: string[];
  trustedContactIds: string[];
  inviteCode: string;
  fixedMeetUrl?: string;
  activeMeeting?: ActiveMeeting | null;
  createdAt: string;
  updatedAt: string;
}

export interface FamilyMember {
  id: string;
  familyId: string;
  userId: string;
  userEmail: string;
  displayName: string;
  photoURL?: string;
  role: UserRole;
  relationship: string;
  permissions?: {
    canViewAudio: boolean;
    canViewAiInsights: boolean;
    receiveAlerts: boolean;
  };
  joinedAt: string;
}

export interface CheckInRecord {
  id: string;
  familyId: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  relationship?: string;
  status: 'ok' | 'need_help';
  note?: string;
  timestamp: string; // ISO string
  dateStr: string;   // YYYY-MM-DD
  timezone: string;
  parentId?: string; // backward compatibility
  parentName?: string; // backward compatibility
}

export interface MoodRecord {
  id: string;
  familyId: string;
  userId: string;
  userName?: string;
  userRole?: UserRole;
  parentId?: string; // backward compatibility
  mood: MoodType;
  moodLabel: string;
  timestamp: string; // ISO string
  dateStr: string;   // YYYY-MM-DD
}

export interface ChatMessageRecord {
  id: string;
  familyId: string;
  senderId: string;
  senderName: string;
  senderRole: UserRole;
  senderAvatar?: string;
  type: 'text' | 'voice' | 'quick_preset';
  text?: string;
  audioDataUrl?: string;
  duration?: number;
  transcript?: string;
  timestamp: string; // ISO string
  reactions?: { [emoji: string]: string[] }; // emoji -> [userId]
}

export interface VoiceMessageRecord {
  id: string;
  familyId: string;
  senderId: string;
  senderName: string;
  senderRole: UserRole;
  audioDataUrl: string; // Base64 or Storage URL
  duration: number; // seconds
  transcript?: string;
  timestamp: string; // ISO string
  listenedBy?: string[];
}

export interface AlertRecord {
  id: string;
  familyId: string;
  parentId: string;
  parentName: string;
  type: 'help_request' | 'missed_checkin' | 'pattern_alert';
  message: string;
  location?: {
    lat: number;
    lng: number;
    address?: string;
  } | null;
  status: 'active' | 'resolved';
  createdAt: string;
  resolvedAt?: string | null;
}

export interface AiInsightRecord {
  id?: string;
  familyId: string;
  parentId: string;
  status: 'normal' | 'attention' | 'alert';
  summary: string;
  changes: string[];
  recommendation: string;
  suggestedActionTitle: string;
  confidence: number;
  analyzedAt: string;
}

export interface FamilyInvitation {
  id: string;
  familyId: string;
  familyName: string;
  inviterId: string;
  inviterName: string;
  intendedRole: UserRole;
  inviteCode: string;
  status: 'pending' | 'accepted' | 'expired' | 'revoked';
  expiresAt: string;
  createdAt: string;
}
