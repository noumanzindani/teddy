import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'TEDDY — Vendor Dashboard',
  description: 'Salon management portal',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
