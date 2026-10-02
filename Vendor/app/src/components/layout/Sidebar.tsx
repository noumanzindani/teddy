'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, CalendarDays, BookOpen, Scissors,
  MessageSquare, BarChart2, Settings, LogOut, ChevronRight,
  Package, Gift, Crown, Clock, FileText, Sparkles,
  Users, ListOrdered, ListTodo, ShieldCheck, SlidersHorizontal, Target, Send,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Assistant', href: '/assistant', icon: Sparkles },
  { label: 'Bookings', href: '/bookings', icon: BookOpen },
  { label: 'Calendar', href: '/calendar', icon: CalendarDays },
  { label: 'Clients', href: '/clients', icon: Users },
  { label: 'Waitlist', href: '/waitlist', icon: ListOrdered },
  { label: 'Services', href: '/services', icon: Scissors },
  { label: 'Products', href: '/products', icon: Package },
  { label: 'Forms', href: '/forms', icon: FileText },
  { label: 'Gift Cards', href: '/gift-cards', icon: Gift },
  { label: 'Memberships', href: '/memberships', icon: Crown },
  { label: 'Availability', href: '/availability', icon: Clock },
  { label: 'Team', href: '/team', icon: ShieldCheck },
  { label: 'Client Preferences', href: '/preferences', icon: SlidersHorizontal },
  { label: 'Goals', href: '/goals', icon: Target },
  { label: 'Auto Messages', href: '/messaging', icon: Send },
  { label: 'Tasks', href: '/tasks', icon: ListTodo },
  { label: 'Messages', href: '/messages', icon: MessageSquare },
  { label: 'Analytics', href: '/analytics', icon: BarChart2 },
  { label: 'Settings', href: '/settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 shrink-0 h-screen sticky top-0 flex flex-col bg-[#1B1B16] text-white overflow-y-auto">
      {/* Logo */}
      <div className="px-6 py-6 border-b border-white/10">
        <span className="text-2xl font-black tracking-tight text-[#E4C654]">TEDDY</span>
        <p className="text-xs text-white/40 mt-0.5">Vendor Dashboard</p>
      </div>

      {/* Salon info */}
      <div className="px-4 py-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-[#E4C654] flex items-center justify-center text-[#1B1B16] font-bold text-sm shrink-0">
            SC
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate">Skincuress Salon</p>
            <p className="text-xs text-white/40 truncate">skincuress@teddy.app</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 flex flex-col gap-1">
        {NAV_ITEMS.map(({ label, href, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors group',
                active
                  ? 'bg-[#E4C654] text-[#1B1B16]'
                  : 'text-white/70 hover:bg-white/10 hover:text-white'
              )}
            >
              <Icon size={18} />
              <span className="flex-1">{label}</span>
              {active && <ChevronRight size={14} />}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="px-3 py-4 border-t border-white/10">
        <Link
          href="/login"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-white/70 hover:bg-white/10 hover:text-white transition-colors"
        >
          <LogOut size={18} />
          <span>Logout</span>
        </Link>
      </div>
    </aside>
  );
}
