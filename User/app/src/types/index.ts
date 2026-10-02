export type Mood = 'happy' | 'tired' | 'stressed' | 'glowing' | 'anxious' | 'calm' | 'energised';

export type GoalCategory = 'personal' | 'weekly' | 'professional';

export interface Goal {
  id: string;
  title: string;
  category: GoalCategory;
  progress: number; // 0-1
  streak: number;
  completed: boolean;
  count?: number;
}

export interface JournalEntry {
  id: string;
  date: string;
  preview: string;
  body: string;
  mood?: Mood;
}

export interface MoodLog { id: string; date: string; mood: Mood; note?: string }

export interface Reminder { id: string; title: string; time: string; type: 'task' | 'appointment' }

export interface Service {
  id: string;
  name: string;
  category: string;
  durationMin: number;
  price: number;
  imageUrl: string;
  description: string;
  salonId: string;
  rating: number;
  distanceKm: number;
}

export interface Salon {
  id: string;
  name: string;
  avatarUrl: string;
  coverUrl: string;
  rating: number;
  reviewCount: number;
  location: string;
  specializations: string[];
  bio: string;
  hours: { day: string; open: string; close: string }[];
  feedPosts: { id: string; mediaUrl: string; type: 'image' | 'video'; caption: string; createdAt: string }[];
}

export interface Booking {
  id: string;
  serviceId: string;
  salonId: string;
  date: string;
  time: string;
  status: 'confirmed' | 'pending' | 'completed' | 'cancelled';
  durationMin: number;
}

export interface Reward { id: string; name: string; pointsRequired: number; imageUrl?: string }

export interface PaymentCard { id: string; brand: 'visa' | 'mastercard' | 'amex'; last4: string; expiry: string; holder: string }

export interface ChatThread {
  id: string;
  salonId: string;
  salonName: string;
  avatarUrl: string;
  lastMessage: string;
  lastTimestamp: string;
  unreadCount: number;
}

export interface ChatMessage {
  id: string;
  threadId: string;
  from: 'salon' | 'user';
  text: string;
  timestamp: string;
}
