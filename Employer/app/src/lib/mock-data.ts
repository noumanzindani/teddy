import { addDays, subDays, format } from 'date-fns';

const today = new Date();
const fmt = (d: Date) => format(d, 'yyyy-MM-dd');

// ─── Staff Profile ────────────────────────────────────────────────────────────
export const STAFF_PROFILE = {
  id: 'st1',
  name: 'Maya Johnson',
  title: 'Senior Esthetician',
  email: 'maya.johnson@skincuress.com',
  phone: '+1 (305) 555-0192',
  salon: 'Skincuress Salon',
  avatarInitials: 'MJ',
  bio: 'Certified esthetician with 6+ years of experience in advanced skincare, chemical peels, and HydraFacial treatments. Passionate about helping clients achieve their skin goals.',
  rating: 4.9,
  reviewCount: 142,
  completionRate: 94,
  retentionRate: 82,
  totalBookings: 38,
};

// ─── Appointments ─────────────────────────────────────────────────────────────
export type AppointmentStatus = 'upcoming' | 'in_progress' | 'completed' | 'no_show' | 'cancelled';

export interface Appointment {
  id: string;
  clientId: string;
  clientName: string;
  clientAvatar: string;
  service: string;
  date: string;
  time: string;
  durationMin: number;
  status: AppointmentStatus;
  notes?: string;
  beforePhoto?: string;
  afterPhoto?: string;
  amount: number;
}

export const APPOINTMENTS: Appointment[] = [
  {
    id: 'a1', clientId: 'c1', clientName: 'Sophia Carter', clientAvatar: 'SC',
    service: 'HydraFacial Deluxe', date: fmt(today), time: '10:00 AM',
    durationMin: 60, status: 'upcoming', amount: 120,
    notes: 'Sensitive skin — avoid glycolic acid',
  },
  {
    id: 'a2', clientId: 'c2', clientName: 'Isabelle Park', clientAvatar: 'IP',
    service: 'Signature Facial', date: fmt(today), time: '12:30 PM',
    durationMin: 45, status: 'upcoming', amount: 85,
  },
  {
    id: 'a3', clientId: 'c3', clientName: 'Rachel Torres', clientAvatar: 'RT',
    service: 'Chemical Peel — Light', date: fmt(today), time: '3:00 PM',
    durationMin: 30, status: 'upcoming', amount: 95,
    notes: 'First-time peel — patch tested 2 weeks ago',
  },
  {
    id: 'a4', clientId: 'c4', clientName: 'Nina Walsh', clientAvatar: 'NW',
    service: 'LED Light Therapy', date: fmt(addDays(today, 1)), time: '9:00 AM',
    durationMin: 30, status: 'upcoming', amount: 60,
  },
  {
    id: 'a5', clientId: 'c5', clientName: 'Mia Russo', clientAvatar: 'MR',
    service: 'Microneedling', date: fmt(addDays(today, 1)), time: '11:00 AM',
    durationMin: 75, status: 'upcoming', amount: 200,
    notes: 'Numbing cream 45 min before appointment',
  },
  {
    id: 'a6', clientId: 'c1', clientName: 'Sophia Carter', clientAvatar: 'SC',
    service: 'Express Facial', date: fmt(addDays(today, 2)), time: '2:00 PM',
    durationMin: 30, status: 'upcoming', amount: 65,
  },
  {
    id: 'a7', clientId: 'c6', clientName: 'Aisha Brown', clientAvatar: 'AB',
    service: 'HydraFacial Deluxe', date: fmt(addDays(today, 3)), time: '10:30 AM',
    durationMin: 60, status: 'upcoming', amount: 120,
  },
  {
    id: 'a8', clientId: 'c2', clientName: 'Isabelle Park', clientAvatar: 'IP',
    service: 'Signature Facial', date: fmt(subDays(today, 1)), time: '11:00 AM',
    durationMin: 45, status: 'completed', amount: 85,
    beforePhoto: 'https://images.unsplash.com/photo-1512290923902-8a9f81dc236c?w=400',
    afterPhoto: 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=400',
  },
  {
    id: 'a9', clientId: 'c3', clientName: 'Rachel Torres', clientAvatar: 'RT',
    service: 'Express Facial', date: fmt(subDays(today, 2)), time: '3:30 PM',
    durationMin: 30, status: 'completed', amount: 65,
    beforePhoto: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=400',
    afterPhoto: 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=400',
  },
  {
    id: 'a10', clientId: 'c7', clientName: 'Jordan Kim', clientAvatar: 'JK',
    service: 'Chemical Peel — Light', date: fmt(subDays(today, 3)), time: '1:00 PM',
    durationMin: 30, status: 'no_show', amount: 95,
  },
];

// ─── Clients ──────────────────────────────────────────────────────────────────
export interface Client {
  id: string;
  name: string;
  avatar: string;
  email: string;
  phone: string;
  joinedDate: string;
  totalVisits: number;
  loyaltyPoints: number;
  lastVisit: string;
  nextVisit?: string;
  skinType: string;
  notes: string;
}

export const CLIENTS: Client[] = [
  {
    id: 'c1', name: 'Sophia Carter', avatar: 'SC',
    email: 'sophia.c@example.com', phone: '+1 (305) 555-0101',
    joinedDate: '2025-08-15', totalVisits: 8, loyaltyPoints: 980,
    lastVisit: fmt(subDays(today, 14)), nextVisit: fmt(addDays(today, 2)),
    skinType: 'Combination', notes: 'Sensitive to glycolic acid. Prefers gentle pressure.',
  },
  {
    id: 'c2', name: 'Isabelle Park', avatar: 'IP',
    email: 'isabelle.p@example.com', phone: '+1 (305) 555-0102',
    joinedDate: '2025-11-02', totalVisits: 5, loyaltyPoints: 620,
    lastVisit: fmt(subDays(today, 1)), nextVisit: fmt(today),
    skinType: 'Dry', notes: 'Loves extra moisture. Always tips well.',
  },
  {
    id: 'c3', name: 'Rachel Torres', avatar: 'RT',
    email: 'rachel.t@example.com', phone: '+1 (305) 555-0103',
    joinedDate: '2026-01-20', totalVisits: 3, loyaltyPoints: 290,
    lastVisit: fmt(subDays(today, 2)), nextVisit: fmt(today),
    skinType: 'Oily', notes: 'Acne-prone. On tretinoin — avoid strong actives.',
  },
  {
    id: 'c4', name: 'Nina Walsh', avatar: 'NW',
    email: 'nina.w@example.com', phone: '+1 (305) 555-0104',
    joinedDate: '2025-06-10', totalVisits: 12, loyaltyPoints: 1540,
    lastVisit: fmt(subDays(today, 7)),
    skinType: 'Normal', notes: 'Platinum member. Monthly LED sessions.',
  },
  {
    id: 'c5', name: 'Mia Russo', avatar: 'MR',
    email: 'mia.r@example.com', phone: '+1 (305) 555-0105',
    joinedDate: '2026-02-14', totalVisits: 2, loyaltyPoints: 175,
    lastVisit: fmt(subDays(today, 30)),
    skinType: 'Sensitive', notes: 'Patch-tested for microneedling. Numbing required.',
  },
  {
    id: 'c6', name: 'Aisha Brown', avatar: 'AB',
    email: 'aisha.b@example.com', phone: '+1 (305) 555-0106',
    joinedDate: '2025-09-01', totalVisits: 7, loyaltyPoints: 830,
    lastVisit: fmt(subDays(today, 21)),
    skinType: 'Combination', notes: 'Hyperpigmentation concern. Use brightening protocols.',
  },
  {
    id: 'c7', name: 'Jordan Kim', avatar: 'JK',
    email: 'jordan.k@example.com', phone: '+1 (305) 555-0107',
    joinedDate: '2026-03-05', totalVisits: 1, loyaltyPoints: 0,
    lastVisit: fmt(subDays(today, 3)),
    skinType: 'Unknown', notes: 'No-show on last visit. Follow up recommended.',
  },
];

// ─── Chat ─────────────────────────────────────────────────────────────────────
export type MessageSender = 'staff' | 'vendor' | 'client';

export interface ChatMessage {
  id: string;
  sender: MessageSender;
  senderName: string;
  text: string;
  time: string;
  read: boolean;
}

export interface ChatThread {
  id: string;
  participantName: string;
  participantRole: 'vendor' | 'client';
  participantAvatar: string;
  lastMessage: string;
  lastTime: string;
  unread: number;
  messages: ChatMessage[];
}

export const CHAT_THREADS: ChatThread[] = [
  {
    id: 'th1', participantName: 'Skincuress Salon', participantRole: 'vendor',
    participantAvatar: 'SS', lastMessage: 'Please review the updated service menu for next week.', lastTime: '9:42 AM', unread: 2,
    messages: [
      { id: 'm1', sender: 'vendor', senderName: 'Skincuress Salon', text: 'Hi Maya! Just checking in on the new protocol for HydraFacial.', time: 'Yesterday 4:10 PM', read: true },
      { id: 'm2', sender: 'staff', senderName: 'Maya Johnson', text: 'All set — I reviewed the updated steps and tested it on a returning client. Works great!', time: 'Yesterday 4:35 PM', read: true },
      { id: 'm3', sender: 'vendor', senderName: 'Skincuress Salon', text: 'Perfect. Also, we have a group booking coming in Friday — 3 guests for Express Facials at 2 PM.', time: 'Yesterday 5:00 PM', read: true },
      { id: 'm4', sender: 'vendor', senderName: 'Skincuress Salon', text: 'Please review the updated service menu for next week.', time: '9:42 AM', read: false },
      { id: 'm5', sender: 'vendor', senderName: 'Skincuress Salon', text: 'Also please confirm your availability for Saturday.', time: '9:43 AM', read: false },
    ],
  },
  {
    id: 'th2', participantName: 'Sophia Carter', participantRole: 'client',
    participantAvatar: 'SC', lastMessage: 'Can I add an eye contour treatment to my next visit?', lastTime: '11:20 AM', unread: 1,
    messages: [
      { id: 'm1', sender: 'client', senderName: 'Sophia Carter', text: 'Hi! I wanted to say the HydraFacial last time was absolutely amazing, my skin has never looked better!', time: '2 days ago', read: true },
      { id: 'm2', sender: 'staff', senderName: 'Maya Johnson', text: "That's so wonderful to hear, Sophia! Your skin responded beautifully to the treatment 🌟", time: '2 days ago', read: true },
      { id: 'm3', sender: 'client', senderName: 'Sophia Carter', text: 'Can I add an eye contour treatment to my next visit?', time: '11:20 AM', read: false },
    ],
  },
  {
    id: 'th3', participantName: 'Isabelle Park', participantRole: 'client',
    participantAvatar: 'IP', lastMessage: 'Will you be available next Thursday afternoon?', lastTime: 'Yesterday', unread: 0,
    messages: [
      { id: 'm1', sender: 'client', senderName: 'Isabelle Park', text: 'Hi Maya, I need to reschedule my appointment on Thursday. Is there any availability on Friday?', time: '3 days ago', read: true },
      { id: 'm2', sender: 'staff', senderName: 'Maya Johnson', text: 'Hi Isabelle! Friday 2 PM works — I\'ll let the front desk know. See you then!', time: '3 days ago', read: true },
      { id: 'm3', sender: 'client', senderName: 'Isabelle Park', text: 'Will you be available next Thursday afternoon?', time: 'Yesterday', read: true },
    ],
  },
  {
    id: 'th4', participantName: 'Rachel Torres', participantRole: 'client',
    participantAvatar: 'RT', lastMessage: 'My skin is looking so much clearer!', lastTime: '2 days ago', unread: 0,
    messages: [
      { id: 'm1', sender: 'client', senderName: 'Rachel Torres', text: 'My skin is looking so much clearer!', time: '2 days ago', read: true },
      { id: 'm2', sender: 'staff', senderName: 'Maya Johnson', text: 'Amazing! Keep up with the gentle cleanser and SPF every morning 🌞', time: '2 days ago', read: true },
    ],
  },
];

// ─── Earnings ─────────────────────────────────────────────────────────────────
export interface EarningEntry {
  id: string;
  date: string;
  clientName: string;
  service: string;
  gross: number;
  staffShare: number;
  status: 'paid' | 'pending';
}

export const EARNINGS: EarningEntry[] = [
  { id: 'e1',  date: fmt(subDays(today, 1)),  clientName: 'Isabelle Park',  service: 'Signature Facial',       gross: 85,  staffShare: 42,  status: 'paid' },
  { id: 'e2',  date: fmt(subDays(today, 2)),  clientName: 'Rachel Torres',  service: 'Express Facial',         gross: 65,  staffShare: 32,  status: 'paid' },
  { id: 'e3',  date: fmt(subDays(today, 4)),  clientName: 'Nina Walsh',     service: 'LED Light Therapy',      gross: 60,  staffShare: 30,  status: 'paid' },
  { id: 'e4',  date: fmt(subDays(today, 5)),  clientName: 'Sophia Carter',  service: 'HydraFacial Deluxe',     gross: 120, staffShare: 60,  status: 'paid' },
  { id: 'e5',  date: fmt(subDays(today, 7)),  clientName: 'Aisha Brown',    service: 'Chemical Peel — Light',  gross: 95,  staffShare: 47,  status: 'paid' },
  { id: 'e6',  date: fmt(subDays(today, 8)),  clientName: 'Mia Russo',      service: 'Microneedling',          gross: 200, staffShare: 100, status: 'paid' },
  { id: 'e7',  date: fmt(subDays(today, 9)),  clientName: 'Isabelle Park',  service: 'Signature Facial',       gross: 85,  staffShare: 42,  status: 'paid' },
  { id: 'e8',  date: fmt(subDays(today, 11)), clientName: 'Sophia Carter',  service: 'Express Facial',         gross: 65,  staffShare: 32,  status: 'paid' },
  { id: 'e9',  date: fmt(subDays(today, 12)), clientName: 'Rachel Torres',  service: 'Signature Facial',       gross: 85,  staffShare: 42,  status: 'paid' },
  { id: 'e10', date: fmt(subDays(today, 14)), clientName: 'Nina Walsh',     service: 'LED Light Therapy',      gross: 60,  staffShare: 30,  status: 'paid' },
  { id: 'e11', date: fmt(subDays(today, 15)), clientName: 'Aisha Brown',    service: 'HydraFacial Deluxe',     gross: 120, staffShare: 60,  status: 'paid' },
  { id: 'e12', date: fmt(subDays(today, 18)), clientName: 'Jordan Kim',     service: 'Chemical Peel — Light',  gross: 95,  staffShare: 47,  status: 'paid' },
  { id: 'e13', date: fmt(subDays(today, 20)), clientName: 'Sophia Carter',  service: 'Signature Facial',       gross: 85,  staffShare: 42,  status: 'paid' },
  { id: 'e14', date: fmt(subDays(today, 21)), clientName: 'Isabelle Park',  service: 'Express Facial',         gross: 65,  staffShare: 32,  status: 'paid' },
  { id: 'e15', date: fmt(subDays(today, 25)), clientName: 'Mia Russo',      service: 'Microneedling',          gross: 200, staffShare: 100, status: 'paid' },
];

// ─── Performance ──────────────────────────────────────────────────────────────
export const PERFORMANCE_WEEKLY = [
  { week: 'Apr 7',  rating: 4.8, bookings: 8,  completion: 100, retention: 75 },
  { week: 'Apr 14', rating: 4.9, bookings: 9,  completion: 89,  retention: 78 },
  { week: 'Apr 21', rating: 4.9, bookings: 10, completion: 100, retention: 80 },
  { week: 'Apr 28', rating: 5.0, bookings: 11, completion: 91,  retention: 82 },
];

export const RATING_BREAKDOWN = [
  { stars: 5, count: 119 },
  { stars: 4, count: 18  },
  { stars: 3, count: 4   },
  { stars: 2, count: 1   },
  { stars: 1, count: 0   },
];

export const STATUS_META: Record<AppointmentStatus, { label: string; color: string; bg: string }> = {
  upcoming:    { label: 'Upcoming',    color: 'text-blue-700',   bg: 'bg-blue-50'   },
  in_progress: { label: 'In Progress', color: 'text-amber-700',  bg: 'bg-amber-50'  },
  completed:   { label: 'Completed',   color: 'text-green-700',  bg: 'bg-green-50'  },
  no_show:     { label: 'No-Show',     color: 'text-red-700',    bg: 'bg-red-50'    },
  cancelled:   { label: 'Cancelled',   color: 'text-gray-500',   bg: 'bg-gray-100'  },
};
