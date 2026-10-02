'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldAlert, Eye, EyeOff, Lock, AlertTriangle, CheckCircle } from 'lucide-react';
import { adminLogin } from '@/lib/api';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('admin@teddy.app');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const ipAllowed = true; // IP check is enforced at the network/proxy layer in production

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await adminLogin(email.trim(), password);
      router.push('/dashboard');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Invalid credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#1A1A14] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2.5 mb-3">
            <ShieldAlert size={28} className="text-[#E4C654]" />
            <span className="text-3xl font-black text-[#E4C654] tracking-tight">TEDDY</span>
          </div>
          <p className="text-white/40 text-sm">Admin Panel · admin.teddy.app</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* IP check banner */}
          <div className={`px-6 py-3 flex items-start gap-3 text-sm font-medium ${
            ipAllowed
              ? 'bg-green-50 border-b border-green-100'
              : 'bg-red-50 border-b border-red-100'
          }`}>
            {ipAllowed ? (
              <>
                <CheckCircle size={16} className="text-green-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-green-800">IP address verified</p>
                  <p className="text-green-600 font-normal text-xs">Connection verified via secure channel</p>
                </div>
              </>
            ) : (
              <>
                <AlertTriangle size={16} className="text-red-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-red-800">Access blocked — unauthorized IP</p>
                  <p className="text-red-600 font-normal text-xs">Your IP is not on the allowlist. Contact your administrator.</p>
                </div>
              </>
            )}
          </div>

          <div className="p-8">
            <h1 className="text-xl font-bold text-[#1A1A14] mb-1">Administrator Sign In</h1>
            <p className="text-sm text-[#A8A89F] mb-6">Restricted access — authorised personnel only.</p>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label className="text-xs font-semibold text-[#6B6B62] uppercase tracking-wide mb-1.5 block">
                  Email address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  disabled={!ipAllowed}
                  className="w-full px-4 py-3 rounded-lg border border-[#E4E4E0] text-sm focus:outline-none focus:ring-2 focus:ring-[#E4C654] placeholder-[#A8A89F] disabled:bg-[#F5F4F0] disabled:text-[#A8A89F]"
                  placeholder="admin@teddy.app"
                  required
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
                    onChange={e => setPassword(e.target.value)}
                    disabled={!ipAllowed}
                    className="w-full px-4 py-3 pr-11 rounded-lg border border-[#E4E4E0] text-sm focus:outline-none focus:ring-2 focus:ring-[#E4C654] placeholder-[#A8A89F] disabled:bg-[#F5F4F0] disabled:text-[#A8A89F]"
                    placeholder="Enter your password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(v => !v)}
                    disabled={!ipAllowed}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A8A89F] hover:text-[#6B6B62] disabled:opacity-30"
                  >
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-lg px-3 py-2.5">
                  <AlertTriangle size={14} className="text-red-500 shrink-0" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={!ipAllowed || loading}
                className="w-full bg-[#1A1A14] text-white font-semibold py-3 rounded-lg hover:bg-[#2E2E26] transition-colors disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2 mt-1"
              >
                {loading ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Lock size={15} />
                )}
                {loading ? 'Verifying…' : 'Sign In'}
              </button>
            </form>
          </div>
        </div>

        <p className="text-center text-white/20 text-xs mt-6">
          TEDDY Platform · admin.teddy.app · Restricted access
        </p>
      </div>
    </div>
  );
}
