import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'TEDDY — Admin Panel',
  description: 'Platform administration portal',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
