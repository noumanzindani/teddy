'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, AlertCircle, Loader2 } from 'lucide-react';
import { login } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(email, password);
      if (user.role !== 'vendor_staff') {
        setError('This portal is for staff members only.');
        return;
      }
      router.push('/schedule');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Invalid email or password. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#FAFAF8] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <span className="text-4xl font-black tracking-tight text-[#1B1B16]">TEDDY</span>
          <p className="text-sm text-[#6B6B62] mt-1">Staff Portal · staff.teddy.app</p>
        </div>

        <div className="bg-white border border-[#E8E8E4] rounded-2xl shadow-sm p-8">
          <h2 className="text-xl font-bold text-[#1B1B16] mb-1">Welcome back</h2>
          <p className="text-sm text-[#6B6B62] mb-6">Sign in to manage your schedule and clients</p>

          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-xl px-4 py-3 mb-5 text-sm text-red-700">
              <AlertCircle size={15} className="shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="text-xs font-semibold text-[#6B6B62] uppercase tracking-wide mb-1.5 block">
                Email address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                className="w-full px-4 py-3 rounded-xl border border-[#E8E8E4] text-sm focus:outline-none focus:ring-2 focus:ring-[#E4C654] placeholder-[#A8A89F] text-[#1B1B16]"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-[#6B6B62] uppercase tracking-wide mb-1.5 block">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  className="w-full px-4 py-3 pr-11 rounded-xl border border-[#E8E8E4] text-sm focus:outline-none focus:ring-2 focus:ring-[#E4C654] placeholder-[#A8A89F] text-[#1B1B16]"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A8A89F] hover:text-[#6B6B62]"
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-[#1B1B16] text-white text-sm font-bold rounded-xl hover:bg-[#333328] transition-colors disabled:opacity-60 flex items-center justify-center gap-2 mt-2"
            >
              {loading && <Loader2 size={16} className="animate-spin" />}
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          <p className="text-xs text-[#A8A89F] text-center mt-6">
            Don&apos;t have an account?{' '}
            <a href="/accept-invite" className="text-[#1B1B16] font-semibold hover:underline">
              Accept an invite
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
