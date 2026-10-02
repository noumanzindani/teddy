import type {
  Goal, JournalEntry, MoodLog, Reminder, Service, Salon, Booking,
  Reward, PaymentCard, ChatThread, ChatMessage,
} from '@app-types/index';

export const mockUser = {
  id: 'u1',
  name: 'John Smith',
  firstName: 'John',
  email: 'john.smith@example.com',
  phone: '+1 555 123 4567',
  avatarUrl: 'https://i.pravatar.cc/150?img=12',
  points: 1250,
};

export const goals: Goal[] = [
  { id: 'g1', title: 'Drink 8 Glass of Water', category: 'personal', progress: 0.6, streak: 8, completed: false },
  { id: 'g2', title: 'Finish Daily Journal', category: 'personal', progress: 1, streak: 3, completed: true },
  { id: 'g3', title: 'Workout for 30 min', category: 'personal', progress: 0.3, streak: 1, completed: false, count: 1 },
];

export const recommendedGoals = [
  { id: 'rg1', title: 'Clear Skin in 7 Days', description: 'Follow a simple daily skincare routine', durationDays: 7, tasksPerDay: 3 },
  { id: 'rg2', title: 'Korean Glass Skin Routine', description: '30-day glow routine', durationDays: 30, tasksPerDay: 4 },
  { id: 'rg3', title: '30-Day Hydration Challenge', description: 'Build the hydration habit', durationDays: 30, tasksPerDay: 2 },
];

export const reminders: Reminder[] = [
  { id: 'r1', title: 'Drink Water', time: '10:00 AM', type: 'task' },
  { id: 'r2', title: 'Workout', time: '8:00 AM', type: 'task' },
];

export const journalEntries: JournalEntry[] = [
  { id: 'j1', date: '2026-04-23', preview: 'Felt amazing after the facial...', body: 'Felt amazing after the facial today. Skin glowing.', mood: 'glowing' },
  { id: 'j2', date: '2026-04-20', preview: 'A bit stressed with work deadlines...', body: 'A bit stressed with work deadlines but tried to relax in the evening.', mood: 'stressed' },
];

export const moodLogs: MoodLog[] = [
  { id: 'm1', date: '2026-04-23', mood: 'glowing' },
  { id: 'm2', date: '2026-04-22', mood: 'happy' },
  { id: 'm3', date: '2026-05-12', mood: 'stressed' },
];

export const salons: Salon[] = [
  {
    id: 's1', name: 'Glow Up Aesthetics',
    avatarUrl: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=200',
    coverUrl: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=800',
    rating: 4.8, reviewCount: 234, location: 'New York, USA',
    specializations: ['Esthetician', 'Skincare Consultant'],
    bio: 'Premium skincare and aesthetics in the heart of NYC.',
    hours: [{ day: 'Mon', open: '09:00', close: '20:00' }, { day: 'Tue', open: '09:00', close: '20:00' }],
    feedPosts: [
      { id: 'p1', mediaUrl: 'https://images.unsplash.com/photo-1505944270255-72b8c68c6a70?w=800', type: 'image', caption: 'Lorem ipsum', createdAt: '2d Ago' },
      { id: 'p2', mediaUrl: 'https://images.unsplash.com/photo-1519415510236-718bdfcd89c8?w=800', type: 'image', caption: 'Lorem ipsum', createdAt: '3d Ago' },
    ],
  },
  {
    id: 's2', name: 'Liam Carter Studio',
    avatarUrl: 'https://i.pravatar.cc/150?img=33',
    coverUrl: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800',
    rating: 4.6, reviewCount: 156, location: 'Brooklyn, USA',
    specializations: ['Hair', 'Makeup'],
    bio: 'Hair and makeup experts.', hours: [], feedPosts: [],
  },
];

export const services: Service[] = [
  { id: 'sv1', name: 'Signature Manicure', category: 'Nails', durationMin: 45, price: 35, imageUrl: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=400', description: 'Classic manicure', salonId: 's1', rating: 4.8, distanceKm: 1.2 },
  { id: 'sv2', name: 'Deluxe Pedicure', category: 'Nails', durationMin: 60, price: 55, imageUrl: 'https://images.unsplash.com/photo-1519415943484-9fa1873496d4?w=400', description: 'Spa pedicure', salonId: 's1', rating: 4.7, distanceKm: 1.2 },
  { id: 'sv3', name: 'Aromatherapy Massage', category: 'Massage', durationMin: 60, price: 95, imageUrl: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=400', description: 'Relaxing massage', salonId: 's2', rating: 4.9, distanceKm: 2.4 },
  { id: 'sv4', name: 'Express Facial', category: 'Facials', durationMin: 30, price: 65, imageUrl: 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=400', description: 'Quick facial refresh', salonId: 's1', rating: 4.7, distanceKm: 1.2 },
];

export const bookings: Booking[] = [
  { id: 'b1', serviceId: 'sv4', salonId: 's1', date: '2026-01-10', time: '7:00 PM', status: 'confirmed', durationMin: 45 },
  { id: 'b2', serviceId: 'sv4', salonId: 's1', date: '2026-01-10', time: '7:00 PM', status: 'confirmed', durationMin: 45 },
];

export const rewards: Reward[] = [
  { id: 'rw1', name: 'Free Express Facial', pointsRequired: 800 },
  { id: 'rw2', name: '$10 off next booking', pointsRequired: 500 },
  { id: 'rw3', name: 'Free Manicure Upgrade', pointsRequired: 1000 },
];

export const paymentCards: PaymentCard[] = [
  { id: 'c1', brand: 'visa', last4: '4242', expiry: '12/27', holder: 'John Smith' },
];

export const chatThreads: ChatThread[] = [
  { id: 't1', salonId: 's1', salonName: 'Glow Up Aesthetics', avatarUrl: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=100', lastMessage: 'Thanks a bunch! Have a great day!', lastTimestamp: 'Today', unreadCount: 0 },
  { id: 't2', salonId: 's2', salonName: 'Liam Carter', avatarUrl: 'https://i.pravatar.cc/150?img=33', lastMessage: 'Thanks a bunch! Have a great day!', lastTimestamp: 'Yesterday', unreadCount: 2 },
];

export const chatMessages: ChatMessage[] = [
  { id: 'cm1', threadId: 't1', from: 'salon', text: 'Hi John, your appointment is confirmed for Jan 10 at 7 PM.', timestamp: '10:00 AM' },
  { id: 'cm2', threadId: 't1', from: 'user', text: 'Great, see you then!', timestamp: '10:02 AM' },
  { id: 'cm3', threadId: 't1', from: 'salon', text: 'Thanks a bunch! Have a great day!', timestamp: '10:03 AM' },
];
