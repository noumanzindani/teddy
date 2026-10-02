'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Lock, Mail } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { login } from '@/lib/auth';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!email || !password) { setError('Please enter your email and password.'); return; }
    setLoading(true);
    try {
      const { user } = await login(email, password);
      if (user.role !== 'vendor_owner') {
        setError('This portal is for vendor accounts only.');
        setLoading(false);
        return;
      }
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid email or password.');
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#FAFAF8] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <span className="text-4xl font-black tracking-tight text-[#1B1B16]">TEDDY</span>
          <p className="text-sm text-[#6B6B62] mt-1">Vendor Dashboard — <span className="font-medium">vendor.teddy.app</span></p>
        </div>

        <div className="bg-white rounded-2xl border border-[#E8E8E4] shadow-sm p-8">
          <h2 className="text-xl font-bold text-[#1B1B16] mb-1">Welcome back</h2>
          <p className="text-sm text-[#6B6B62] mb-6">Sign in to manage your salon</p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-[#1B1B16]">Email address</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A8A89F]" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@yoursalon.com"
                  className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-[#E8E8E4] text-sm focus:outline-none focus:ring-2 focus:ring-[#E4C654] focus:border-transparent placeholder-[#A8A89F]"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-[#1B1B16]">Password</label>
                <a href="#" className="text-xs text-[#6B6B62] hover:text-[#1B1B16]">Forgot password?</a>
              </div>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A8A89F]" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-10 py-2.5 rounded-lg border border-[#E8E8E4] text-sm focus:outline-none focus:ring-2 focus:ring-[#E4C654] focus:border-transparent placeholder-[#A8A89F]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A8A89F] hover:text-[#6B6B62]"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2.5 text-sm text-red-700">
                {error}
              </div>
            )}

            <Button type="submit" size="lg" className="w-full mt-1" disabled={loading}>
              {loading ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>

          <p className="text-xs text-center text-[#A8A89F] mt-6">
            Need access?{' '}
            <a href="mailto:support@teddy.app" className="text-[#6B6B62] hover:text-[#1B1B16]">
              Contact support
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
