'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Store, Users, AlertTriangle,
  BarChart2, Banknote, Star, Settings, LogOut, ChevronRight,
  ShieldAlert,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV = [
  { label: 'Dashboard',       href: '/dashboard',  icon: LayoutDashboard },
  { label: 'Vendor Approval', href: '/vendors',    icon: Store },
  { label: 'Users',           href: '/users',      icon: Users },
  { label: 'Disputes',        href: '/disputes',   icon: AlertTriangle },
  { label: 'Analytics',       href: '/analytics',  icon: BarChart2 },
  { label: 'Payouts',         href: '/payouts',    icon: Banknote },
  { label: 'Reviews',         href: '/reviews',    icon: Star },
  { label: 'Settings',        href: '/settings',   icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 shrink-0 h-screen sticky top-0 flex flex-col bg-[#1A1A14] text-white overflow-y-auto">
      {/* Logo */}
      <div className="px-6 py-6 border-b border-white/10">
        <div className="flex items-center gap-2">
          <ShieldAlert size={18} className="text-[#E4C654]" />
          <span className="text-xl font-black tracking-tight text-[#E4C654]">TEDDY</span>
        </div>
        <p className="text-xs text-white/40 mt-0.5 pl-6">Admin Panel</p>
      </div>

      {/* Admin badge */}
      <div className="px-4 py-3.5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-red-500/20 border border-red-500/40 flex items-center justify-center shrink-0">
            <ShieldAlert size={14} className="text-red-400" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate">Super Admin</p>
            <p className="text-xs text-white/40 truncate">admin@teddy.app</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 flex flex-col gap-0.5">
        {NAV.map(({ label, href, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                active
                  ? 'bg-[#E4C654] text-[#1A1A14]'
                  : 'text-white/70 hover:bg-white/8 hover:text-white'
              )}
            >
              <Icon size={17} />
              <span className="flex-1">{label}</span>
              {active && <ChevronRight size={13} />}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="px-3 py-4 border-t border-white/10">
        <Link
          href="/login"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-white/50 hover:bg-white/8 hover:text-white transition-colors"
        >
          <LogOut size={17} />
          <span>Sign out</span>
        </Link>
      </div>
    </aside>
  );
}
