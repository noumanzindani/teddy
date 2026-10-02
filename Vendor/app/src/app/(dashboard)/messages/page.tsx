'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { format, isToday, isYesterday } from 'date-fns';
import { Send, MessageSquare, Bell, CalendarCheck, Wrench, Search } from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

// ── Types ─────────────────────────────────────────────────────────────────────

type MessageType = 'text' | 'booking_confirmation' | 'appointment_reminder' | 'service_update';
type MessageSender = 'vendor' | 'client';

interface ChatMessage {
  id: string;
  threadId: string;
  sender: MessageSender;
  body: string;
  createdAt: string;
  isRead: boolean;
}

interface ApiMessage {
  id: string;
  senderRole: string;
  body: string;
  createdAt: string;
  isRead: boolean;
}

interface ChatThread {
  id: string;
  clientName: string;
  clientInitials: string;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
  messages: ChatMessage[];
}

interface ApiThread {
  id: string;
  client: { firstName: string; lastName: string };
  lastMessageAt: string;
  messages: ApiMessage[];
  _count?: { messages: number };
}

function adaptThread(t: ApiThread): ChatThread {
  const msgs = (t.messages ?? []).map(m => ({
    id: m.id,
    threadId: t.id,
    sender: (m.senderRole === 'vendor' || m.senderRole === 'staff') ? 'vendor' as MessageSender : 'client' as MessageSender,
    body: m.body,
    createdAt: m.createdAt,
    isRead: m.isRead,
  }));
  const lastMsg = msgs[msgs.length - 1];
  const unread = msgs.filter(m => !m.isRead && m.sender === 'client').length;
  return {
    id: t.id,
    clientName: `${t.client.firstName} ${t.client.lastName}`,
    clientInitials: `${t.client.firstName[0]}${t.client.lastName[0]}`,
    lastMessage: lastMsg?.body ?? '',
    lastMessageAt: t.lastMessageAt,
    unreadCount: unread,
    messages: msgs,
  };
}

// ── Constants ─────────────────────────────────────────────────────────────────

const MESSAGE_TYPE_META: Record<MessageType, { label: string; icon: React.ReactNode; pill: string }> = {
  text:                 { label: '', icon: null, pill: '' },
  booking_confirmation: { label: 'Booking Confirmation', icon: <CalendarCheck size={11} />, pill: 'bg-blue-50 text-blue-700' },
  appointment_reminder: { label: 'Appointment Reminder', icon: <Bell size={11} />,          pill: 'bg-amber-50 text-amber-700' },
  service_update:       { label: 'Service Update',        icon: <Wrench size={11} />,        pill: 'bg-purple-50 text-purple-700' },
};

const QUICK_MESSAGES = [
  { label: 'Booking Confirmation', type: 'booking_confirmation' as MessageType, text: 'Your booking is confirmed! We look forward to seeing you.' },
  { label: 'Appointment Reminder', type: 'appointment_reminder' as MessageType, text: 'Just a friendly reminder about your upcoming appointment.' },
  { label: 'Service Update',       type: 'service_update' as MessageType,       text: 'We wanted to share some exciting updates about our services.' },
];

function formatThreadTime(iso: string) {
  const d = new Date(iso);
  if (isToday(d))     return format(d, 'h:mm a');
  if (isYesterday(d)) return 'Yesterday';
  return format(d, 'MMM d');
}

function formatBubbleTime(iso: string) {
  return format(new Date(iso), 'h:mm a');
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function MessagesPage() {
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<ChatThread | null>(null);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState('');
  const [showQuick, setShowQuick] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const fetchThreads = useCallback(async () => {
    try {
      const data = await api.get<ApiThread[]>('/chat/threads');
      setThreads(data.map(adaptThread));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchThreads(); }, [fetchThreads]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selected?.messages.length]);

  async function selectThread(t: ChatThread) {
    setSelected(t);
    // Mark as read
    try {
      await api.patch(`/chat/threads/${t.id}/read`, {});
      setThreads(prev => prev.map(x => x.id === t.id ? { ...x, unreadCount: 0 } : x));
    } catch { /* ignore */ }
  }

  async function sendMessage(text: string, type: MessageType = 'text') {
    if (!selected || !text.trim() || sending) return;
    setSending(true);
    try {
      const msg = await api.post<ApiMessage>(`/chat/threads/${selected.id}/messages`, { body: text });
      const newMsg: ChatMessage = {
        id: msg.id,
        threadId: selected.id,
        sender: 'vendor',
        body: msg.body,
        createdAt: msg.createdAt,
        isRead: true,
      };
      setSelected(prev => prev ? { ...prev, messages: [...prev.messages, newMsg], lastMessage: text } : null);
      setThreads(prev => prev.map(t => t.id === selected.id ? { ...t, lastMessage: text, lastMessageAt: msg.createdAt } : t));
      setInput('');
    } catch (err) {
      console.error(err);
    } finally {
      setSending(false);
    }
  }

  const filteredThreads = threads.filter(t =>
    !search || t.clientName.toLowerCase().includes(search.toLowerCase())
  );

  const totalUnread = threads.reduce((s, t) => s + t.unreadCount, 0);

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-0 rounded-2xl overflow-hidden border border-[#E8E8E4] bg-white">
      {/* Thread list */}
      <div className="w-72 shrink-0 border-r border-[#E8E8E4] flex flex-col">
        <div className="p-4 border-b border-[#E8E8E4]">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-[#1B1B16]">Messages</h2>
            {totalUnread > 0 && (
              <span className="bg-[#E4C654] text-[#1B1B16] text-xs font-bold rounded-full px-2 py-0.5">{totalUnread}</span>
            )}
          </div>
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#A8A89F]" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search…"
              className="w-full pl-8 pr-3 py-2 text-sm rounded-lg border border-[#E8E8E4] focus:outline-none focus:ring-2 focus:ring-[#E4C654] placeholder-[#A8A89F]"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="w-6 h-6 border-2 border-[#E4C654] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filteredThreads.length === 0 ? (
            <div className="flex flex-col items-center py-10 text-[#A8A89F]">
              <MessageSquare size={28} className="mb-2 opacity-40" />
              <p className="text-sm">No conversations</p>
            </div>
          ) : filteredThreads.map(t => (
            <button
              key={t.id}
              onClick={() => selectThread(t)}
              className={cn(
                'w-full text-left px-4 py-3.5 border-b border-[#F0EFE8] hover:bg-[#FAFAF8] transition-colors',
                selected?.id === t.id && 'bg-[#FBF6E3]'
              )}
            >
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-full bg-[#E4C654]/30 flex items-center justify-center text-[#1B1B16] font-bold text-xs shrink-0">
                  {t.clientInitials}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <p className="text-sm font-semibold text-[#1B1B16] truncate">{t.clientName}</p>
                    <span className="text-[11px] text-[#A8A89F] shrink-0 ml-1">{formatThreadTime(t.lastMessageAt)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-[#6B6B62] truncate">{t.lastMessage}</p>
                    {t.unreadCount > 0 && (
                      <span className="ml-1 bg-[#E4C654] text-[#1B1B16] text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center shrink-0">
                        {t.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Chat area */}
      {selected ? (
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <div className="px-5 py-4 border-b border-[#E8E8E4] flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#E4C654]/30 flex items-center justify-center text-[#1B1B16] font-bold text-xs">
              {selected.clientInitials}
            </div>
            <div>
              <p className="font-semibold text-[#1B1B16]">{selected.clientName}</p>
              <p className="text-xs text-[#6B6B62]">Client</p>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-3">
            {selected.messages.map(m => {
              const isVendor = m.sender === 'vendor';
              return (
                <div key={m.id} className={cn('flex flex-col', isVendor ? 'items-end' : 'items-start')}>
                  <div className={cn(
                    'max-w-xs lg:max-w-sm rounded-2xl px-4 py-2.5 text-sm',
                    isVendor
                      ? 'bg-[#1B1B16] text-white rounded-br-sm'
                      : 'bg-[#F0EFE8] text-[#1B1B16] rounded-bl-sm'
                  )}>
                    {m.body}
                  </div>
                  <span className="text-[11px] text-[#A8A89F] mt-1 px-1">{formatBubbleTime(m.createdAt)}</span>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="px-4 py-3 border-t border-[#E8E8E4]">
            {/* Quick messages */}
            <div className="flex gap-2 mb-2 overflow-x-auto pb-1">
              {QUICK_MESSAGES.map(q => (
                <button
                  key={q.type}
                  onClick={() => sendMessage(q.text, q.type)}
                  className={cn(
                    'flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-medium whitespace-nowrap transition-colors',
                    MESSAGE_TYPE_META[q.type].pill || 'bg-[#F0EFE8] text-[#1B1B16] border-transparent hover:bg-[#E8E8E4]'
                  )}
                >
                  {MESSAGE_TYPE_META[q.type].icon}
                  {q.label}
                </button>
              ))}
            </div>
            <form
              onSubmit={e => { e.preventDefault(); sendMessage(input); }}
              className="flex items-center gap-2"
            >
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Type a message…"
                className="flex-1 px-4 py-2.5 rounded-xl border border-[#E8E8E4] text-sm focus:outline-none focus:ring-2 focus:ring-[#E4C654] placeholder-[#A8A89F]"
              />
              <button
                type="submit"
                disabled={!input.trim() || sending}
                className="w-10 h-10 rounded-xl bg-[#E4C654] hover:bg-[#D4B444] disabled:opacity-40 flex items-center justify-center transition-colors shrink-0"
              >
                <Send size={16} className="text-[#1B1B16]" />
              </button>
            </form>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-[#A8A89F] gap-3">
          <MessageSquare size={40} className="opacity-30" />
          <p className="text-sm">Select a conversation to view messages</p>
        </div>
      )}
    </div>
  );
}
