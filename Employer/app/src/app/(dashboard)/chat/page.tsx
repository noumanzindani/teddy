'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Store, User, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { io, Socket } from 'socket.io-client';
import { api, getToken } from '@/lib/api';
import { cn } from '@/lib/utils';
import type { MessageSender, ChatThread, ChatMessage } from '@/lib/mock-data';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

const ROLE_COLORS: Record<string, string> = {
  vendor: 'bg-[#1B1B16] text-white',
  client: 'bg-[#E4C654]/20 text-[#1B1B16]',
  staff:  'bg-[#E8F5E9] text-[#1B1B16]',
};

interface ApiMessage {
  id: string;
  senderRole: string;
  body: string;
  createdAt: string;
  isRead: boolean;
}

interface ApiThread {
  id: string;
  client: { firstName: string; lastName: string };
  lastMessageAt: string;
  messages: ApiMessage[];
}

function adaptThread(t: ApiThread): ChatThread {
  const msgs: ChatMessage[] = (t.messages ?? []).map((m) => ({
    id: m.id,
    sender: (m.senderRole === 'vendor' ? 'vendor' : m.senderRole === 'staff' ? 'staff' : 'client') as MessageSender,
    senderName: m.senderRole === 'vendor' ? 'Vendor' : m.senderRole === 'staff' ? 'Me' : `${t.client.firstName}`,
    text: m.body,
    time: format(new Date(m.createdAt), 'h:mm a'),
    read: m.isRead,
  }));
  const lastMsg = msgs[msgs.length - 1];
  const unread = msgs.filter((m) => !m.read && m.sender !== 'staff').length;
  return {
    id: t.id,
    participantName: `${t.client.firstName} ${t.client.lastName}`,
    participantRole: 'client',
    participantAvatar: `${t.client.firstName[0]}${t.client.lastName[0]}`,
    lastMessage: lastMsg?.text ?? '',
    lastTime: lastMsg ? format(new Date(t.lastMessageAt), 'h:mm a') : '',
    unread,
    messages: msgs,
  };
}

export default function ChatPage() {
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [fetchLoading, setFetchLoading] = useState(true);
  const [sendLoading, setSendLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);
  const prevActiveId = useRef<string | null>(null);

  const active = activeId ? threads.find((t) => t.id === activeId) ?? null : null;

  // Initialise Socket.IO once
  useEffect(() => {
    const token = getToken();
    if (!token) return;
    const socket = io(API_URL, { auth: { token }, transports: ['websocket', 'polling'] });
    socketRef.current = socket;

    socket.on('message:new', (msg: { id: string; threadId: string; senderRole: string; body: string; createdAt: string; isRead: boolean }) => {
      setThreads((prev) =>
        prev.map((t) => {
          if (t.id !== msg.threadId) return t;
          const sender = (msg.senderRole === 'staff' ? 'staff' : msg.senderRole === 'vendor' ? 'vendor' : 'client') as MessageSender;
          const newMsg: ChatMessage = {
            id: msg.id,
            sender,
            senderName: sender === 'staff' ? 'Me' : sender === 'vendor' ? 'Vendor' : t.participantName,
            text: msg.body,
            time: format(new Date(msg.createdAt), 'h:mm a'),
            read: msg.isRead,
          };
          return { ...t, lastMessage: newMsg.text, lastTime: newMsg.time, messages: [...t.messages, newMsg] };
        })
      );
    });

    return () => { socket.disconnect(); };
  }, []);

  // Join/leave thread rooms when active thread changes
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;
    if (prevActiveId.current) socket.emit('chat:leave', prevActiveId.current);
    if (activeId) socket.emit('chat:join', activeId);
    prevActiveId.current = activeId;
  }, [activeId]);

  useEffect(() => {
    setFetchLoading(true);
    api.get<ApiThread[]>('/chat/threads')
      .then((data) => {
        const adapted = data.map(adaptThread);
        setThreads(adapted);
        if (adapted.length > 0) setActiveId(adapted[0].id);
      })
      .catch(() => {
        setThreads([]);
      })
      .finally(() => setFetchLoading(false));
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeId, active?.messages.length]);

  function selectThread(id: string) {
    setActiveId(id);
    setThreads((prev) =>
      prev.map((t) => t.id === id ? { ...t, unread: 0, messages: t.messages.map((m) => ({ ...m, read: true })) } : t)
    );
    // Mark as read on the server (fire and forget)
    api.patch(`/chat/threads/${id}/read`, {}).catch(() => {});
  }

  async function sendMessage() {
    if (!draft.trim() || !activeId || sendLoading) return;
    const text = draft.trim();
    setDraft('');
    setSendLoading(true);

    // Optimistic update
    const tempMsg: ChatMessage = {
      id: `m${Date.now()}`, sender: 'staff', senderName: 'Me',
      text, time: format(new Date(), 'h:mm a'), read: true,
    };
    setThreads((prev) =>
      prev.map((t) => t.id === activeId
        ? { ...t, lastMessage: tempMsg.text, lastTime: tempMsg.time, messages: [...t.messages, tempMsg] }
        : t)
    );

    try {
      await api.post(`/chat/threads/${activeId}/messages`, { body: text });
    } catch {
      // On failure, leave the optimistic message (UX choice — don't remove it)
    } finally {
      setSendLoading(false);
    }
  }

  if (fetchLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-7rem)]">
        <Loader2 size={28} className="animate-spin text-[#E4C654]" />
      </div>
    );
  }

  if (threads.length === 0) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-7rem)]">
        <div className="text-center">
          <p className="text-[#6B6B62] font-medium">No messages yet</p>
          <p className="text-sm text-[#A8A89F] mt-1">Your conversations with clients will appear here</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-0 h-[calc(100vh-7rem)] rounded-xl overflow-hidden border border-[#E8E8E4] bg-white shadow-sm">
      {/* Thread list */}
      <div className="w-72 shrink-0 border-r border-[#E8E8E4] flex flex-col">
        <div className="px-4 py-3.5 border-b border-[#E8E8E4]">
          <h3 className="font-semibold text-[#1B1B16] text-sm">Messages</h3>
          <p className="text-xs text-[#A8A89F] mt-0.5">
            {threads.reduce((s, t) => s + t.unread, 0)} unread
          </p>
        </div>
        <div className="flex-1 overflow-y-auto">
          {threads.map((t) => (
            <button
              key={t.id}
              onClick={() => selectThread(t.id)}
              className={cn(
                'w-full flex items-start gap-3 px-4 py-3.5 border-b border-[#F0EFE8] hover:bg-[#FAFAF8] transition-colors text-left',
                activeId === t.id && 'bg-[#FBF6E3] border-l-2 border-l-[#E4C654]'
              )}
            >
              <div className={cn(
                'w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0',
                t.participantRole === 'vendor' ? 'bg-[#1B1B16] text-white' : 'bg-[#E4C654]/20 text-[#1B1B16]'
              )}>
                {t.participantAvatar}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-[#1B1B16] truncate">{t.participantName}</span>
                  <span className="text-xs text-[#A8A89F] shrink-0 ml-2">{t.lastTime}</span>
                </div>
                <div className="flex items-center gap-1 mt-0.5">
                  {t.participantRole === 'vendor'
                    ? <Store size={10} className="text-[#A8A89F] shrink-0" />
                    : <User size={10} className="text-[#A8A89F] shrink-0" />}
                  <p className="text-xs text-[#6B6B62] truncate">{t.lastMessage}</p>
                </div>
              </div>
              {t.unread > 0 && (
                <span className="w-5 h-5 rounded-full bg-[#1B1B16] text-white text-xs flex items-center justify-center font-bold shrink-0">
                  {t.unread}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Message pane */}
      {active && (
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <div className="px-5 py-3.5 border-b border-[#E8E8E4] flex items-center gap-3 bg-white">
            <div className={cn(
              'w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0',
              active.participantRole === 'vendor' ? 'bg-[#1B1B16] text-white' : 'bg-[#E4C654]/20 text-[#1B1B16]'
            )}>
              {active.participantAvatar}
            </div>
            <div>
              <p className="font-semibold text-[#1B1B16] text-sm">{active.participantName}</p>
              <p className="text-xs text-[#A8A89F] capitalize">{active.participantRole}</p>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-3">
            {active.messages.map((msg) => {
              const isStaff = msg.sender === 'staff';
              return (
                <div key={msg.id} className={cn('flex flex-col', isStaff ? 'items-end' : 'items-start')}>
                  {!isStaff && (
                    <span className="text-xs text-[#A8A89F] mb-1 px-1">{msg.senderName}</span>
                  )}
                  <div className={cn(
                    'max-w-xs px-4 py-2.5 rounded-2xl text-sm leading-relaxed',
                    ROLE_COLORS[msg.sender],
                    isStaff ? 'rounded-tr-sm' : 'rounded-tl-sm'
                  )}>
                    {msg.text}
                  </div>
                  <span className="text-xs text-[#A8A89F] mt-1 px-1">{msg.time}</span>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="px-4 py-3 border-t border-[#E8E8E4] bg-white flex items-end gap-3">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
              placeholder={`Reply to ${active.participantName}…`}
              rows={1}
              className="flex-1 px-4 py-2.5 rounded-xl border border-[#E8E8E4] text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#E4C654] placeholder-[#A8A89F] min-h-[40px] max-h-28"
            />
            <button
              onClick={sendMessage}
              disabled={!draft.trim() || sendLoading}
              className="w-10 h-10 rounded-xl bg-[#1B1B16] text-white flex items-center justify-center hover:bg-[#333328] disabled:opacity-40 transition-colors shrink-0"
            >
              {sendLoading ? <Loader2 size={14} className="animate-spin" /> : <Send size={16} />}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
