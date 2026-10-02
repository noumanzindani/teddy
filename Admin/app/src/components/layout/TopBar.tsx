'use client';

import { Bell, Search } from 'lucide-react';
import { usePathname } from 'next/navigation';

const PAGE_TITLES: Record<string, string> = {
  '/dashboard':  'Dashboard',
  '/vendors':    'Vendor Approval',
  '/users':      'Users',
  '/disputes':   'Disputes',
  '/analytics':  'Analytics',
  '/payouts':    'Payouts',
  '/reviews':    'Reviews',
  '/settings':   'Platform Settings',
};

export function TopBar() {
  const pathname = usePathname();
  const base = '/' + pathname.split('/')[1];
  const title = PAGE_TITLES[base] ?? 'Admin Panel';

  return (
    <header className="h-16 border-b border-[#E4E4E0] bg-white flex items-center px-6 gap-4 sticky top-0 z-10">
      <h1 className="text-lg font-bold text-[#1A1A14] flex-1">{title}</h1>

      <div className="relative hidden md:block">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A8A89F]" />
        <input
          type="text"
          placeholder="Search vendors, users..."
          className="pl-9 pr-4 py-2 text-sm rounded-lg border border-[#E4E4E0] bg-[#F5F4F0] focus:outline-none focus:ring-2 focus:ring-[#E4C654] w-64 placeholder-[#A8A89F]"
        />
      </div>

      <button className="relative p-2 rounded-lg hover:bg-[#ECEAE4] transition-colors">
        <Bell size={18} className="text-[#6B6B62]" />
        <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
      </button>

      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-full bg-red-100 border border-red-200 flex items-center justify-center text-red-700 font-bold text-xs">
          SA
        </div>
        <div className="hidden md:block">
          <p className="text-xs font-semibold text-[#1A1A14]">Super Admin</p>
          <p className="text-[10px] text-[#A8A89F]">admin@teddy.app</p>
        </div>
      </div>
    </header>
  );
}
