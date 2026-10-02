'use client';

import { Bell, Search } from 'lucide-react';
import { usePathname } from 'next/navigation';

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/bookings': 'Bookings',
  '/calendar': 'Calendar',
  '/services': 'Services',
  '/messages': 'Messages',
  '/analytics': 'Analytics',
  '/settings': 'Settings',
};

export function TopBar() {
  const pathname = usePathname();
  const base = '/' + pathname.split('/')[1];
  const title = PAGE_TITLES[base] ?? 'Vendor Portal';

  return (
    <header className="h-16 border-b border-[#E8E8E4] bg-white flex items-center px-6 gap-4 sticky top-0 z-10">
      <h1 className="text-lg font-bold text-[#1B1B16] flex-1">{title}</h1>

      {/* Search */}
      <div className="relative hidden md:block">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A8A89F]" />
        <input
          type="text"
          placeholder="Search bookings, clients..."
          className="pl-9 pr-4 py-2 text-sm rounded-lg border border-[#E8E8E4] bg-[#FAFAF8] focus:outline-none focus:ring-2 focus:ring-[#E4C654] w-64 placeholder-[#A8A89F]"
        />
      </div>

      {/* Notifications */}
      <button className="relative p-2 rounded-lg hover:bg-[#F0EFE8] transition-colors">
        <Bell size={18} className="text-[#6B6B62]" />
        <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
      </button>

      {/* Avatar */}
      <div className="w-8 h-8 rounded-full bg-[#E4C654] flex items-center justify-center text-[#1B1B16] font-bold text-sm cursor-pointer">
        SC
      </div>
    </header>
  );
}
