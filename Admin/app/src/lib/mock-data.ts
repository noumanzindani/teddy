import { addDays, format, subDays } from 'date-fns';

const today = format(new Date(), 'yyyy-MM-dd');
const d = (n: number) => format(subDays(new Date(), n), 'yyyy-MM-dd');
const fa = (n: number) => format(addDays(new Date(), n), 'yyyy-MM-dd');

// ── Vendor Applications ───────────────────────────────────────────────────────

export type VendorStatus = 'pending' | 'approved' | 'rejected' | 'suspended' | 'info_requested';

export interface VendorApplication {
  id: string;
  salonName: string;
  ownerName: string;
  email: string;
  phone: string;
  city: string;
  address: string;
  category: string;
  appliedAt: string;
  status: VendorStatus;
  bio?: string;
  monthlyRevenue?: string;
  staffCount?: number;
  rejectionReason?: string;
}

export const MOCK_VENDORS: VendorApplication[] = [
  { id: 'v1', salonName: 'Glow Studio Miami', ownerName: 'Priya Kapoor', email: 'priya@glowstudio.com', phone: '+1 305 555 0101', city: 'Miami', address: '1040 Brickell Ave, Miami, FL', category: 'Facial & Skin', appliedAt: d(1), status: 'pending', bio: 'Premium facial studio specialising in Korean skincare techniques.', monthlyRevenue: '$8,000–$12,000', staffCount: 4 },
  { id: 'v2', salonName: 'Luxe Lash Lounge', ownerName: 'Camille Bernard', email: 'camille@luxelash.com', phone: '+1 786 555 0234', city: 'Miami Beach', address: '420 Lincoln Rd, Miami Beach, FL', category: 'Lashes & Brows', appliedAt: d(3), status: 'pending', bio: 'Luxury lash extensions and brow lamination studio.', monthlyRevenue: '$5,000–$8,000', staffCount: 2 },
  { id: 'v3', salonName: 'Serenity Spa', ownerName: 'Ana Torres', email: 'ana@serenityspa.com', phone: '+1 954 555 0312', city: 'Fort Lauderdale', address: '200 SE 1st St, Fort Lauderdale, FL', category: 'Massage & Wellness', appliedAt: d(5), status: 'pending', bio: 'Full-service wellness spa with signature massage therapies.', monthlyRevenue: '$12,000–$18,000', staffCount: 6 },
  { id: 'v4', salonName: 'Chrome Nails', ownerName: 'Jenny Wu', email: 'jenny@chromenails.com', phone: '+1 305 555 0498', city: 'Coral Gables', address: '362 Miracle Mile, Coral Gables, FL', category: 'Nails', appliedAt: d(8), status: 'info_requested' },
  { id: 'v5', salonName: 'Skincuress Salon', ownerName: 'Jill Colon', email: 'jill@skincuress.com', phone: '+1 305 555 0192', city: 'Miami', address: '1242 Brickell Ave, Miami, FL', category: 'Facial & Skin', appliedAt: d(30), status: 'approved' },
  { id: 'v6', salonName: 'Bare Beauty', ownerName: 'Tasha Green', email: 'tasha@barebeauty.com', phone: '+1 786 555 0871', city: 'Wynwood', address: '2100 NW 2nd Ave, Miami, FL', category: 'Waxing', appliedAt: d(12), status: 'rejected', rejectionReason: 'Incomplete business license documentation.' },
];

// ── Users ─────────────────────────────────────────────────────────────────────

export type UserStatus = 'active' | 'warned' | 'banned';
export type UserRole = 'client' | 'staff' | 'vendor';

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  city: string;
  joinedAt: string;
  status: UserStatus;
  totalSpend: number;
  bookingCount: number;
  openDisputes: number;
  warningCount: number;
}

export const MOCK_USERS: AdminUser[] = [
  { id: 'u1', name: 'Sarah Mitchell',  email: 'sarah@example.com',   phone: '+1 305 555 1001', role: 'client', city: 'Miami',          joinedAt: d(90),  status: 'active',  totalSpend: 1240, bookingCount: 12, openDisputes: 0, warningCount: 0 },
  { id: 'u2', name: 'Jessica Lee',     email: 'jessica@example.com', phone: '+1 786 555 1002', role: 'client', city: 'Miami Beach',     joinedAt: d(120), status: 'active',  totalSpend: 875,  bookingCount: 8,  openDisputes: 1, warningCount: 0 },
  { id: 'u3', name: 'Amara Osei',      email: 'amara@example.com',   phone: '+1 954 555 1003', role: 'client', city: 'Fort Lauderdale', joinedAt: d(45),  status: 'warned',  totalSpend: 340,  bookingCount: 3,  openDisputes: 2, warningCount: 1 },
  { id: 'u4', name: 'Claire Dupont',   email: 'claire@example.com',  phone: '+1 305 555 1004', role: 'client', city: 'Coral Gables',   joinedAt: d(200), status: 'active',  totalSpend: 2100, bookingCount: 21, openDisputes: 0, warningCount: 0 },
  { id: 'u5', name: 'Ryan Brooks',     email: 'ryan@example.com',    phone: '+1 786 555 1005', role: 'client', city: 'Miami',          joinedAt: d(60),  status: 'banned',  totalSpend: 120,  bookingCount: 2,  openDisputes: 3, warningCount: 2 },
  { id: 'u6', name: 'Natalie Wong',    email: 'natalie@example.com', phone: '+1 305 555 1006', role: 'client', city: 'Brickell',       joinedAt: d(30),  status: 'active',  totalSpend: 560,  bookingCount: 5,  openDisputes: 0, warningCount: 0 },
  { id: 'u7', name: 'Emma Rodriguez',  email: 'emma@example.com',    phone: '+1 305 555 1007', role: 'staff',  city: 'Miami',          joinedAt: d(180), status: 'active',  totalSpend: 0,    bookingCount: 0,  openDisputes: 0, warningCount: 0 },
  { id: 'u8', name: 'Priya Kapoor',    email: 'priya@example.com',   phone: '+1 305 555 1008', role: 'vendor', city: 'Miami',          joinedAt: d(35),  status: 'active',  totalSpend: 0,    bookingCount: 0,  openDisputes: 0, warningCount: 0 },
];

// ── Disputes ──────────────────────────────────────────────────────────────────

export type DisputePriority = 'high' | 'medium' | 'low';
export type DisputeStatus = 'open' | 'resolved' | 'closed';
export type DisputeResolution = 'full_refund' | 'partial_refund' | 'no_refund' | 'vendor_suspended';

export interface DisputeMessage { sender: 'client' | 'vendor' | 'admin'; text: string; at: string; }

export interface Dispute {
  id: string;
  clientName: string;
  vendorName: string;
  service: string;
  amount: number;
  bookingDate: string;
  openedAt: string;
  priority: DisputePriority;
  status: DisputeStatus;
  issue: string;
  resolution?: DisputeResolution;
  refundAmount?: number;
  evidence: string[];
  messages: DisputeMessage[];
}

export const MOCK_DISPUTES: Dispute[] = [
  {
    id: 'd1', clientName: 'Amara Osei', vendorName: 'Skincuress Salon', service: 'HydraFacial', amount: 120, bookingDate: d(5), openedAt: d(4), priority: 'high', status: 'open',
    issue: 'Client claims she developed a skin reaction after the facial. Requesting full refund and compensation.',
    evidence: ['photo_reaction.jpg', 'medical_note.pdf'],
    messages: [
      { sender: 'client', text: 'I had a severe reaction after the service. My skin was red and irritated for 3 days.', at: d(4) },
      { sender: 'vendor', text: 'We used only certified products. The reaction may have been pre-existing.', at: d(3) },
      { sender: 'admin', text: 'Requesting medical documentation and product batch numbers from vendor.', at: d(2) },
    ],
  },
  {
    id: 'd2', clientName: 'Ryan Brooks', vendorName: 'Luxe Lash Lounge', service: 'Lash Extensions', amount: 85, bookingDate: d(10), openedAt: d(9), priority: 'medium', status: 'open',
    issue: 'Client claims lashes fell off within 48 hours of application.',
    evidence: ['before_after.jpg'],
    messages: [
      { sender: 'client', text: 'Half my lashes are already gone — this is completely unacceptable.', at: d(9) },
      { sender: 'vendor', text: 'Client did not follow aftercare instructions.', at: d(8) },
    ],
  },
  {
    id: 'd3', clientName: 'Jessica Lee', vendorName: 'Serenity Spa', service: 'Deep Tissue Massage', amount: 95, bookingDate: d(15), openedAt: d(14), priority: 'low', status: 'open',
    issue: 'Client was charged twice for the same booking.',
    evidence: ['bank_statement.pdf'],
    messages: [
      { sender: 'client', text: 'I see two charges of $95 on my statement from the same day.', at: d(14) },
      { sender: 'vendor', text: 'We only processed one payment. May be a bank hold.', at: d(13) },
    ],
  },
  {
    id: 'd4', clientName: 'Claire Dupont', vendorName: 'Chrome Nails', service: 'Gel Manicure', amount: 55, bookingDate: d(20), openedAt: d(19), priority: 'low', status: 'resolved', resolution: 'partial_refund', refundAmount: 27,
    issue: 'Gel peeled within 3 days.',
    evidence: [],
    messages: [{ sender: 'client', text: 'Gel came off completely within 3 days.', at: d(19) }],
  },
];

// ── Payouts ───────────────────────────────────────────────────────────────────

export type PayoutStatus = 'paid' | 'pending' | 'flagged' | 'failed';

export interface Payout {
  id: string;
  vendorName: string;
  vendorId: string;
  amount: number;
  commission: number;
  net: number;
  bookingCount: number;
  period: string;
  scheduledAt: string;
  paidAt?: string;
  status: PayoutStatus;
  flagNote?: string;
}

export const MOCK_PAYOUTS: Payout[] = [
  { id: 'p1', vendorName: 'Skincuress Salon',   vendorId: 'v5', amount: 1240, commission: 124, net: 1116, bookingCount: 11, period: 'Apr 28–30', scheduledAt: fa(0),  status: 'pending' },
  { id: 'p2', vendorName: 'Luxe Lash Lounge',   vendorId: 'v2', amount: 680,  commission: 68,  net: 612,  bookingCount: 8,  period: 'Apr 28–30', scheduledAt: fa(0),  status: 'pending' },
  { id: 'p3', vendorName: 'Serenity Spa',        vendorId: 'v3', amount: 1940, commission: 194, net: 1746, bookingCount: 18, period: 'Apr 26–28', scheduledAt: d(1),   paidAt: d(1), status: 'paid' },
  { id: 'p4', vendorName: 'Chrome Nails',        vendorId: 'v4', amount: 340,  commission: 34,  net: 306,  bookingCount: 6,  period: 'Apr 26–28', scheduledAt: d(1),   paidAt: d(1), status: 'paid' },
  { id: 'p5', vendorName: 'Glow Studio Miami',   vendorId: 'v1', amount: 870,  commission: 87,  net: 783,  bookingCount: 9,  period: 'Apr 24–26', scheduledAt: d(3),   paidAt: d(3), status: 'paid' },
  { id: 'p6', vendorName: 'Bare Beauty',         vendorId: 'v6', amount: 290,  commission: 29,  net: 261,  bookingCount: 4,  period: 'Apr 24–26', scheduledAt: d(3),   status: 'flagged', flagNote: 'Unusually high refund rate this period — manual review required.' },
  { id: 'p7', vendorName: 'Skincuress Salon',    vendorId: 'v5', amount: 1580, commission: 158, net: 1422, bookingCount: 14, period: 'Apr 22–24', scheduledAt: d(5),   paidAt: d(5), status: 'paid' },
  { id: 'p8', vendorName: 'Serenity Spa',        vendorId: 'v3', amount: 2100, commission: 210, net: 1890, bookingCount: 20, period: 'Apr 22–24', scheduledAt: d(5),   status: 'failed', flagNote: 'Stripe transfer failed — bank account details need verification.' },
];

// ── Reviews ───────────────────────────────────────────────────────────────────

export type ReviewStatus = 'flagged' | 'visible' | 'hidden';

export interface FlaggedReview {
  id: string;
  clientName: string;
  vendorName: string;
  service: string;
  rating: number;
  body: string;
  flaggedAt: string;
  bookingDate: string;
  status: ReviewStatus;
  flagReason: string;
}

export const MOCK_REVIEWS: FlaggedReview[] = [
  { id: 'r1', clientName: 'Ryan Brooks',   vendorName: 'Skincuress Salon', service: 'HydraFacial',  rating: 1, body: 'Absolute scam!!! This place should be shut down. The staff is incompetent and the owner is a liar. AVOID AT ALL COSTS!!!', flaggedAt: d(1), bookingDate: d(8),  status: 'flagged', flagReason: 'Abusive language and unverified claims' },
  { id: 'r2', clientName: 'Unknown User',  vendorName: 'Luxe Lash Lounge', service: 'Lash Extensions', rating: 5, body: 'Best lashes in Miami! Check out deallux.io for 50% off your first visit 😍', flaggedAt: d(2), bookingDate: d(10), status: 'flagged', flagReason: 'Suspected spam / promotional link' },
  { id: 'r3', clientName: 'Amara Osei',    vendorName: 'Serenity Spa',     service: 'Massage', rating: 2, body: 'Not a great experience. The therapist was 20 mins late and did not apologise once.', flaggedAt: d(3), bookingDate: d(15), status: 'flagged', flagReason: 'Vendor reported as inaccurate' },
  { id: 'r4', clientName: 'Natalie Wong',  vendorName: 'Chrome Nails',     service: 'Gel Manicure', rating: 1, body: 'The owner threatened me after I left an honest review elsewhere. Disgusting behaviour.', flaggedAt: d(4), bookingDate: d(20), status: 'flagged', flagReason: 'Harassment claim — requires investigation' },
];

// ── Analytics ─────────────────────────────────────────────────────────────────

export interface DailyMetric { date: string; revenue: number; bookings: number; newUsers: number; }
export interface TopVendor { name: string; city: string; revenue: number; bookings: number; rating: number; }

export const MOCK_DAILY: DailyMetric[] = Array.from({ length: 30 }, (_, i) => {
  const dt = subDays(new Date(), 29 - i);
  const bookings = 8 + Math.floor(Math.random() * 20);
  const newUsers = 2 + Math.floor(Math.random() * 8);
  return { date: format(dt, 'MMM d'), revenue: bookings * (60 + Math.floor(Math.random() * 60)), bookings, newUsers };
});

export const MOCK_TOP_VENDORS: TopVendor[] = [
  { name: 'Skincuress Salon',  city: 'Miami',          revenue: 18400, bookings: 148, rating: 4.9 },
  { name: 'Serenity Spa',      city: 'Fort Lauderdale', revenue: 14200, bookings: 122, rating: 4.7 },
  { name: 'Glow Studio Miami', city: 'Miami',          revenue: 9800,  bookings: 86,  rating: 4.8 },
  { name: 'Luxe Lash Lounge',  city: 'Miami Beach',    revenue: 7600,  bookings: 98,  rating: 4.6 },
  { name: 'Chrome Nails',      city: 'Coral Gables',   revenue: 5400,  bookings: 91,  rating: 4.2 },
];

export const MOCK_CATEGORY_SPLIT = [
  { name: 'Facial & Skin',     value: 38 },
  { name: 'Massage & Wellness', value: 22 },
  { name: 'Lashes & Brows',   value: 15 },
  { name: 'Waxing',            value: 12 },
  { name: 'Nails',             value: 8  },
  { name: 'Other',             value: 5  },
];

// ── Status meta ───────────────────────────────────────────────────────────────

export const VENDOR_STATUS_META: Record<VendorStatus, { label: string; color: string; bg: string }> = {
  pending:        { label: 'Pending',        color: 'text-amber-700',  bg: 'bg-amber-50'  },
  approved:       { label: 'Approved',       color: 'text-green-700',  bg: 'bg-green-50'  },
  rejected:       { label: 'Rejected',       color: 'text-red-700',    bg: 'bg-red-50'    },
  suspended:      { label: 'Suspended',      color: 'text-gray-600',   bg: 'bg-gray-100'  },
  info_requested: { label: 'Info Requested', color: 'text-blue-700',   bg: 'bg-blue-50'   },
};

export const USER_STATUS_META: Record<UserStatus, { label: string; color: string; bg: string }> = {
  active: { label: 'Active', color: 'text-green-700', bg: 'bg-green-50' },
  warned: { label: 'Warned', color: 'text-amber-700', bg: 'bg-amber-50' },
  banned: { label: 'Banned', color: 'text-red-700',   bg: 'bg-red-50'   },
};

export const DISPUTE_PRIORITY_META: Record<DisputePriority, { label: string; color: string; bg: string }> = {
  high:   { label: 'High',   color: 'text-red-700',   bg: 'bg-red-50'   },
  medium: { label: 'Medium', color: 'text-amber-700', bg: 'bg-amber-50' },
  low:    { label: 'Low',    color: 'text-blue-700',  bg: 'bg-blue-50'  },
};

export const PAYOUT_STATUS_META: Record<PayoutStatus, { label: string; color: string; bg: string }> = {
  paid:    { label: 'Paid',    color: 'text-green-700', bg: 'bg-green-50' },
  pending: { label: 'Pending', color: 'text-amber-700', bg: 'bg-amber-50' },
  flagged: { label: 'Flagged', color: 'text-orange-700',bg: 'bg-orange-50'},
  failed:  { label: 'Failed',  color: 'text-red-700',   bg: 'bg-red-50'   },
};
