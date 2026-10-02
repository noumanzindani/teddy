import { addDays, format, subDays } from 'date-fns';

export type BookingStatus = 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show' | 'pending';

export interface Booking {
  id: string;
  clientName: string;
  clientAvatar?: string;
  service: string;
  category: string;
  date: string;
  time: string;
  duration: number; // minutes
  price: number;
  status: BookingStatus;
  staffName: string;
  notes?: string;
  payoutAt?: string;   // ISO date — T+2 from booking date, set on completed bookings
  beforePhoto?: string;
  afterPhoto?: string;
}

export interface Service {
  id: string;
  name: string;
  category: string;
  price: number;
  duration: number;
  description?: string;
  active: boolean;
}

export interface BlockedSlot {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  reason?: string;
}

const today = format(new Date(), 'yyyy-MM-dd');
const tomorrow = format(addDays(new Date(), 1), 'yyyy-MM-dd');
const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd');
const twoDaysAgo = format(subDays(new Date(), 2), 'yyyy-MM-dd');

export const MOCK_BOOKINGS: Booking[] = [
  { id: 'b1', clientName: 'Sarah Mitchell', service: 'HydraFacial', category: 'Facial Treatments', date: today, time: '09:00', duration: 60, price: 120, status: 'confirmed', staffName: 'Emma R.' },
  { id: 'b2', clientName: 'Jessica Lee', service: 'Deep Tissue Massage', category: 'Massage', date: today, time: '10:30', duration: 90, price: 95, status: 'in_progress', staffName: 'Emma R.' },
  { id: 'b3', clientName: 'Amara Osei', service: 'Laser Hair Removal', category: 'Laser Treatments', date: today, time: '12:00', duration: 45, price: 150, status: 'confirmed', staffName: 'Priya K.' },
  { id: 'b4', clientName: 'Claire Dupont', service: 'Eyebrow Threading', category: 'Threading & Brows', date: today, time: '14:00', duration: 30, price: 35, status: 'pending', staffName: 'Priya K.' },
  { id: 'b5', clientName: 'Natalie Wong', service: 'Vitamin C Facial', category: 'Facial Treatments', date: tomorrow, time: '09:30', duration: 60, price: 110, status: 'confirmed', staffName: 'Emma R.' },
  { id: 'b6', clientName: 'Diane Foster', service: 'Full Body Wax', category: 'Waxing Services', date: tomorrow, time: '11:00', duration: 75, price: 85, status: 'confirmed', staffName: 'Priya K.' },
  { id: 'b7', clientName: 'Tara Singh', service: 'HydraFacial', category: 'Facial Treatments', date: yesterday, time: '10:00', duration: 60, price: 120, status: 'completed', staffName: 'Emma R.', payoutAt: format(addDays(new Date(), 1), 'yyyy-MM-dd') },
  { id: 'b8', clientName: 'Monica Blake', service: 'Dermaplaning', category: 'Skin Treatments', date: yesterday, time: '13:00', duration: 45, price: 80, status: 'no_show', staffName: 'Priya K.' },
  { id: 'b9', clientName: 'Rachel Turner', service: 'Chemical Peel', category: 'Skin Treatments', date: twoDaysAgo, time: '11:00', duration: 60, price: 130, status: 'completed', staffName: 'Emma R.', payoutAt: format(new Date(), 'yyyy-MM-dd') },
  { id: 'b10', clientName: 'Olivia Chen', service: 'Men\'s Grooming', category: 'Men\'s Grooming', date: twoDaysAgo, time: '15:00', duration: 45, price: 60, status: 'cancelled', staffName: 'Priya K.', notes: 'Client cancelled 2 hours before' },
];

export const MOCK_SERVICES: Service[] = [
  { id: 's1', name: 'HydraFacial', category: 'Facial Treatments', price: 120, duration: 60, description: 'Deep cleansing facial with hydration boost.', active: true },
  { id: 's2', name: 'Vitamin C Facial', category: 'Facial Treatments', price: 110, duration: 60, description: 'Brightening facial with Vitamin C serum.', active: true },
  { id: 's3', name: 'Chemical Peel', category: 'Skin Treatments', price: 130, duration: 60, description: 'Exfoliating treatment to reveal fresh skin.', active: true },
  { id: 's4', name: 'Dermaplaning', category: 'Skin Treatments', price: 80, duration: 45, description: 'Manual exfoliation using a surgical scalpel.', active: true },
  { id: 's5', name: 'Laser Hair Removal', category: 'Laser Treatments', price: 150, duration: 45, description: 'Long-lasting hair reduction.', active: true },
  { id: 's6', name: 'Deep Tissue Massage', category: 'Massage', price: 95, duration: 90, description: 'Targets deep muscle layers for relief.', active: true },
  { id: 's7', name: 'Eyebrow Threading', category: 'Threading & Brows', price: 35, duration: 30, description: 'Precise brow shaping using thread.', active: true },
  { id: 's8', name: 'Full Body Wax', category: 'Waxing Services', price: 85, duration: 75, description: 'Smooth full-body waxing service.', active: true },
  { id: 's9', name: "Men's Grooming", category: "Men's Grooming", price: 60, duration: 45, description: 'Grooming package tailored for men.', active: false },
];

export const MOCK_BLOCKED_SLOTS: BlockedSlot[] = [
  { id: 'bl1', date: today, startTime: '16:00', endTime: '18:00', reason: 'Staff training' },
  { id: 'bl2', date: tomorrow, startTime: '13:00', endTime: '14:00', reason: 'Lunch break' },
];

// ── Chat ──────────────────────────────────────────────────────────────────────

export type MessageType = 'text' | 'booking_confirmation' | 'appointment_reminder' | 'service_update';
export type MessageSender = 'vendor' | 'client';

export interface ChatMessage {
  id: string;
  threadId: string;
  sender: MessageSender;
  type: MessageType;
  text: string;
  timestamp: string; // ISO
  read: boolean;
}

export interface ChatThread {
  id: string;
  clientName: string;
  clientInitials: string;
  lastMessage: string;
  lastMessageAt: string; // ISO
  unreadCount: number;
  messages: ChatMessage[];
}

const now = new Date();
const mins = (n: number) => new Date(now.getTime() - n * 60 * 1000).toISOString();
const hrs  = (n: number) => new Date(now.getTime() - n * 60 * 60 * 1000).toISOString();
const daysAgo = (n: number) => new Date(now.getTime() - n * 24 * 60 * 60 * 1000).toISOString();

export const MOCK_THREADS: ChatThread[] = [
  {
    id: 'th1', clientName: 'Sarah Mitchell', clientInitials: 'SM',
    lastMessage: 'See you tomorrow! 😊', lastMessageAt: mins(5), unreadCount: 2,
    messages: [
      { id: 'm1', threadId: 'th1', sender: 'vendor', type: 'booking_confirmation', text: 'Hi Sarah! Your HydraFacial is confirmed for tomorrow at 9:00 AM. Please arrive 5 minutes early.', timestamp: hrs(2), read: true },
      { id: 'm2', threadId: 'th1', sender: 'client', type: 'text', text: 'Perfect, thank you! Should I avoid any skincare products beforehand?', timestamp: hrs(1), read: true },
      { id: 'm3', threadId: 'th1', sender: 'vendor', type: 'text', text: 'Great question — just skip any retinol or exfoliants for 24 hours before. Everything else is fine!', timestamp: mins(45), read: true },
      { id: 'm4', threadId: 'th1', sender: 'client', type: 'text', text: 'Got it, will do!', timestamp: mins(30), read: false },
      { id: 'm5', threadId: 'th1', sender: 'client', type: 'text', text: 'See you tomorrow! 😊', timestamp: mins(5), read: false },
    ],
  },
  {
    id: 'th2', clientName: 'Amara Osei', clientInitials: 'AO',
    lastMessage: 'Can we reschedule to 2 PM instead?', lastMessageAt: hrs(1), unreadCount: 1,
    messages: [
      { id: 'm6', threadId: 'th2', sender: 'vendor', type: 'appointment_reminder', text: 'Hi Amara, just a reminder that your Laser Hair Removal session is today at 12:00 PM.', timestamp: hrs(3), read: true },
      { id: 'm7', threadId: 'th2', sender: 'client', type: 'text', text: 'Hi! I saw the reminder. I\'m running a bit behind at work today.', timestamp: hrs(2), read: true },
      { id: 'm8', threadId: 'th2', sender: 'client', type: 'text', text: 'Can we reschedule to 2 PM instead?', timestamp: hrs(1), read: false },
    ],
  },
  {
    id: 'th3', clientName: 'Jessica Lee', clientInitials: 'JL',
    lastMessage: 'That sounds great, thank you!', lastMessageAt: hrs(5), unreadCount: 0,
    messages: [
      { id: 'm9', threadId: 'th3', sender: 'vendor', type: 'service_update', text: 'Hi Jessica! We wanted to let you know we\'ve added a new Deep Tissue + Hot Stone combo for $115. Thought of you!', timestamp: hrs(6), read: true },
      { id: 'm10', threadId: 'th3', sender: 'client', type: 'text', text: 'Oh wow, that sounds amazing!', timestamp: hrs(5), read: true },
      { id: 'm11', threadId: 'th3', sender: 'client', type: 'text', text: 'That sounds great, thank you!', timestamp: hrs(5), read: true },
    ],
  },
  {
    id: 'th4', clientName: 'Natalie Wong', clientInitials: 'NW',
    lastMessage: 'Your Vitamin C Facial is booked for tomorrow at 9:30 AM.', lastMessageAt: daysAgo(1), unreadCount: 0,
    messages: [
      { id: 'm12', threadId: 'th4', sender: 'vendor', type: 'booking_confirmation', text: 'Hi Natalie! Your Vitamin C Facial is booked for tomorrow at 9:30 AM. We look forward to seeing you!', timestamp: daysAgo(1), read: true },
    ],
  },
  {
    id: 'th5', clientName: 'Claire Dupont', clientInitials: 'CD',
    lastMessage: 'I\'ll be there on time, no worries!', lastMessageAt: daysAgo(2), unreadCount: 0,
    messages: [
      { id: 'm13', threadId: 'th5', sender: 'vendor', type: 'appointment_reminder', text: 'Hi Claire, your Eyebrow Threading session is confirmed for today at 2:00 PM.', timestamp: daysAgo(2), read: true },
      { id: 'm14', threadId: 'th5', sender: 'client', type: 'text', text: 'I\'ll be there on time, no worries!', timestamp: daysAgo(2), read: true },
    ],
  },
];

// ── Analytics ─────────────────────────────────────────────────────────────────

export interface DailyRevenue { date: string; revenue: number; bookings: number; }
export interface ServiceRevenue { service: string; revenue: number; count: number; }
export interface WeeklyStats { week: string; revenue: number; completed: number; noShow: number; cancelled: number; }

export const MOCK_DAILY_REVENUE: DailyRevenue[] = Array.from({ length: 30 }, (_, i) => {
  const d = subDays(new Date(), 29 - i);
  const bookings = Math.floor(Math.random() * 6) + 1;
  return { date: format(d, 'MMM d'), revenue: bookings * (60 + Math.floor(Math.random() * 60)), bookings };
});

export const MOCK_SERVICE_REVENUE: ServiceRevenue[] = [
  { service: 'HydraFacial', revenue: 1440, count: 12 },
  { service: 'Laser Hair Removal', revenue: 1200, count: 8 },
  { service: 'Chemical Peel', revenue: 910, count: 7 },
  { service: 'Deep Tissue Massage', revenue: 760, count: 8 },
  { service: 'Vitamin C Facial', revenue: 660, count: 6 },
  { service: 'Dermaplaning', revenue: 480, count: 6 },
  { service: 'Full Body Wax', revenue: 425, count: 5 },
  { service: 'Eyebrow Threading', revenue: 280, count: 8 },
];

export const MOCK_WEEKLY_STATS: WeeklyStats[] = [
  { week: 'Week 1', revenue: 1240, completed: 10, noShow: 1, cancelled: 1 },
  { week: 'Week 2', revenue: 1580, completed: 13, noShow: 0, cancelled: 2 },
  { week: 'Week 3', revenue: 1390, completed: 11, noShow: 2, cancelled: 1 },
  { week: 'Week 4', revenue: 1840, completed: 15, noShow: 1, cancelled: 2 },
];

export const STATUS_META: Record<BookingStatus, { label: string; color: string; bg: string }> = {
  confirmed: { label: 'Confirmed', color: 'text-blue-700', bg: 'bg-blue-50' },
  in_progress: { label: 'In Progress', color: 'text-amber-700', bg: 'bg-amber-50' },
  completed: { label: 'Completed', color: 'text-green-700', bg: 'bg-green-50' },
  cancelled: { label: 'Cancelled', color: 'text-red-700', bg: 'bg-red-50' },
  no_show: { label: 'No Show', color: 'text-gray-600', bg: 'bg-gray-100' },
  pending: { label: 'Pending', color: 'text-purple-700', bg: 'bg-purple-50' },
};
