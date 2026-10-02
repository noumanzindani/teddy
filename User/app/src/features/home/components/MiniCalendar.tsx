import { View, Text, Pressable } from 'react-native';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useState } from 'react';

interface Props {
  appointmentDates?: Set<string>; // ISO YYYY-MM-DD
  onSelectDate?: (date: string) => void;
}

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thr', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function pad(n: number) { return n < 10 ? `0${n}` : `${n}`; }

function buildMonth(year: number, month: number) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrev = new Date(year, month, 0).getDate();

  const cells: { day: number; current: boolean; iso: string }[] = [];
  for (let i = firstDay - 1; i >= 0; i--) {
    const day = daysInPrev - i;
    const m = month === 0 ? 11 : month - 1;
    const y = month === 0 ? year - 1 : year;
    cells.push({ day, current: false, iso: `${y}-${pad(m + 1)}-${pad(day)}` });
  }
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push({ day, current: true, iso: `${year}-${pad(month + 1)}-${pad(day)}` });
  }
  while (cells.length < 42) {
    const last = cells[cells.length - 1];
    const [ly, lm, ld] = last.iso.split('-').map(Number);
    const next = new Date(ly, lm - 1, ld + 1);
    cells.push({
      day: next.getDate(),
      current: false,
      iso: `${next.getFullYear()}-${pad(next.getMonth() + 1)}-${pad(next.getDate())}`,
    });
  }
  return cells.slice(0, 42);
}

export function MiniCalendar({ appointmentDates, onSelectDate }: Props) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const todayIso = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
  const cells = buildMonth(year, month);

  const prev = () => {
    if (month === 0) { setMonth(11); setYear((y) => y - 1); } else setMonth((m) => m - 1);
  };
  const next = () => {
    if (month === 11) { setMonth(0); setYear((y) => y + 1); } else setMonth((m) => m + 1);
  };

  return (
    <View className="bg-surface-raised rounded-2xl p-4">
      <View className="flex-row items-center justify-between mb-3">
        <Pressable onPress={prev} hitSlop={10}><ChevronLeft size={20} color="#1B1B16" /></Pressable>
        <Text className="text-base font-semibold text-ink">{MONTHS[month]} {year}</Text>
        <Pressable onPress={next} hitSlop={10}><ChevronRight size={20} color="#1B1B16" /></Pressable>
      </View>
      <View className="flex-row mb-2">
        {DOW.map((d) => (
          <View key={d} className="flex-1 items-center">
            <Text className="text-xs text-ink-muted">{d}</Text>
          </View>
        ))}
      </View>
      <View className="flex-row flex-wrap">
        {cells.map((c, i) => {
          const isToday = c.iso === todayIso;
          const hasAppt = appointmentDates?.has(c.iso);
          return (
            <Pressable
              key={i}
              onPress={() => onSelectDate?.(c.iso)}
              className="items-center justify-center"
              style={{ width: `${100 / 7}%`, height: 38 }}
            >
              <View className={`w-8 h-8 rounded-full items-center justify-center ${isToday ? 'bg-sage-600' : ''}`}>
                <Text
                  className={`text-sm ${
                    isToday ? 'text-white font-semibold' : c.current ? 'text-ink' : 'text-ink-subtle'
                  }`}
                >
                  {pad(c.day)}
                </Text>
              </View>
              {hasAppt && <View className="w-1 h-1 rounded-full bg-gold-600 absolute bottom-1" />}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
