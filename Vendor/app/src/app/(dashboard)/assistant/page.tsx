'use client';

import { useState, useEffect, useRef } from 'react';
import { Sparkles, Send, Bot } from 'lucide-react';
import { api } from '@/lib/api';

interface Msg { role: 'user' | 'assistant'; text: string; suggestions?: string[]; }

export default function AssistantPage() {
  const [messages, setMessages] = useState<Msg[]>([
    { role: 'assistant', text: "Hi! I'm your TEDDY assistant. Ask me about your schedule, revenue, inventory, members, or clients.", suggestions: [] },
  ]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [starter, setStarter] = useState<string[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => { api.get<string[]>('/assistant/suggestions').then(setStarter).catch(() => {}); }, []);
  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }); }, [messages]);

  async function send(question: string) {
    const text = question.trim();
    if (!text || busy) return;
    setMessages((m) => [...m, { role: 'user', text }]);
    setInput(''); setBusy(true);
    try {
      const res = await api.post<{ answer: string; suggestions?: string[] }>('/assistant/ask', { question: text });
      setMessages((m) => [...m, { role: 'assistant', text: res.answer, suggestions: res.suggestions }]);
    } catch {
      setMessages((m) => [...m, { role: 'assistant', text: 'Sorry, I could not reach your data just now — please try again.' }]);
    } finally { setBusy(false); }
  }

  return (
    <div className="p-6 max-w-3xl mx-auto h-[calc(100vh-2rem)] flex flex-col">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#E4C654] to-[#C9AD3A] flex items-center justify-center"><Sparkles size={20} className="text-[#1B1B16]" /></div>
        <div>
          <h1 className="text-xl font-bold text-[#1B1B16]">Business Assistant</h1>
          <p className="text-xs text-[#6B6B62]">Answers from your live salon data</p>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto rounded-2xl border border-[#E8E8E4] bg-white p-4 space-y-3">
        {messages.map((m, i) => (
          <div key={i} className={m.role === 'user' ? 'flex justify-end' : 'flex gap-2'}>
            {m.role === 'assistant' && <div className="w-7 h-7 rounded-lg bg-[#E4C654]/20 flex items-center justify-center shrink-0"><Bot size={15} className="text-[#C9AD3A]" /></div>}
            <div className={m.role === 'user'
              ? 'bg-[#1B1B16] text-white rounded-2xl rounded-br-sm px-4 py-2.5 max-w-[80%] text-sm'
              : 'bg-[#FAFAF8] border border-[#E8E8E4] rounded-2xl rounded-tl-sm px-4 py-2.5 max-w-[85%] text-sm text-[#1B1B16] whitespace-pre-line'}>
              {m.text}
              {!!m.suggestions?.length && (
                <div className="flex flex-wrap gap-1.5 mt-2.5">
                  {m.suggestions.map((s) => (
                    <button key={s} onClick={() => send(s)} className="text-xs bg-white border border-[#E8E8E4] rounded-full px-2.5 py-1 hover:bg-[#F0EFE8] text-[#6B6B62]">{s}</button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        {busy && <div className="flex gap-2"><div className="w-7 h-7 rounded-lg bg-[#E4C654]/20 flex items-center justify-center"><Bot size={15} className="text-[#C9AD3A]" /></div><div className="bg-[#FAFAF8] border border-[#E8E8E4] rounded-2xl px-4 py-2.5 text-sm text-[#A8A89F]">Thinking…</div></div>}
      </div>

      {/* Starter chips */}
      {messages.length <= 1 && !!starter.length && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {starter.map((s) => <button key={s} onClick={() => send(s)} className="text-xs bg-white border border-[#E8E8E4] rounded-full px-3 py-1.5 hover:bg-[#F0EFE8] text-[#6B6B62]">{s}</button>)}
        </div>
      )}

      <form onSubmit={(e) => { e.preventDefault(); send(input); }} className="flex gap-2 mt-3">
        <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask about your business…"
          className="flex-1 rounded-xl border border-[#E8E8E4] px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#E4C654]" />
        <button type="submit" disabled={busy || !input.trim()} className="w-11 h-11 rounded-xl bg-[#E4C654] text-[#1B1B16] flex items-center justify-center disabled:opacity-40"><Send size={18} /></button>
      </form>
    </div>
  );
}
