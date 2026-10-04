'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { TabBar } from '@/components/layout/TabBar';
import { SpiritualJournal } from '@/components/spiritual/SpiritualJournal';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { ArrowRight, ChevronLeft, ChevronRight, Check, Lock, BookMarked, Loader2 } from 'lucide-react';

type Period = 'daily' | 'weekly' | 'monthly';

interface Item {
  key: string;
  label: string;
}

const SECTIONS: { id: string; title: string; period: Period; groups?: { title: string; items: Item[] }[]; items?: Item[] }[] = [
  {
    id: 'daily',
    title: 'يومي',
    period: 'daily',
    groups: [
      {
        title: 'الصلاة',
        items: [
          { key: 'PRAYER_MORNING', label: 'باكر' },
          { key: 'PRAYER_SUNSET', label: 'غروب' },
          { key: 'PRAYER_SLEEP', label: 'نوم' },
          { key: 'PRAYER_PERSONAL', label: 'صلاة خاصة' },
        ],
      },
      {
        title: 'الكتاب المقدس',
        items: [
          { key: 'BIBLE_OLD', label: 'قديم' },
          { key: 'BIBLE_NEW', label: 'جديد' },
        ],
      },
    ],
  },
  {
    id: 'weekly',
    title: 'أسبوعي',
    period: 'weekly',
    items: [
      { key: 'FASTING', label: 'الصوم الانقطاعي' },
      { key: 'MASS', label: 'القداس' },
      { key: 'COMMUNION', label: 'التناول' },
      { key: 'SPIRITUAL_BOOK', label: 'كتاب روحي' },
      { key: 'SPIRITUAL_TRAINING', label: 'تدريب روحي' },
      { key: 'SELF_ACCOUNTING', label: 'محاسبة النفس' },
      { key: 'PRAYER_FOR_SERVICE', label: 'صلاة من أجل الخدمة' },
    ],
  },
  {
    id: 'monthly',
    title: 'شهري',
    period: 'monthly',
    items: [{ key: 'CONFESSION', label: 'اعتراف' }],
  },
];

const pad = (n: number) => String(n).padStart(2, '0');

const dayKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const monthKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
/** ISO-8601 week key (weeks start Monday) */
const weekKey = (d: Date) => {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((+t - +yearStart) / 86400000 + 1) / 7);
  return `${t.getUTCFullYear()}-W${pad(week)}`;
};

export default function SpiritualPage() {
  const router = useRouter();
  const [date, setDate] = useState(() => new Date());
  const [checked, setChecked] = useState<Set<string>>(new Set()); // `${periodKey}|${itemKey}`
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [journalOpen, setJournalOpen] = useState(false);

  const keys = useMemo(
    () => ({ daily: dayKey(date), weekly: weekKey(date), monthly: monthKey(date) }),
    [date]
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/v1/spiritual-life/checklist', {
        params: { periods: [keys.daily, keys.weekly, keys.monthly].join(',') },
      });
      const next = new Set<string>();
      for (const r of res.data?.data || []) next.add(`${r.periodKey}|${r.itemKey}`);
      setChecked(next);
      setError(null);
    } catch {
      setError('تعذر تحميل المفكرة الروحية');
    } finally {
      setLoading(false);
    }
  }, [keys]);

  useEffect(() => {
    load();
  }, [load]);

  const toggle = async (period: Period, itemKey: string) => {
    const periodKey = keys[period];
    const id = `${periodKey}|${itemKey}`;
    const done = !checked.has(id);
    setChecked((prev) => {
      const next = new Set(prev);
      if (done) next.add(id);
      else next.delete(id);
      return next;
    });
    try {
      await api.put('/api/v1/spiritual-life/checklist', { itemKey, periodKey, done });
    } catch {
      setChecked((prev) => {
        const next = new Set(prev);
        if (done) next.delete(id);
        else next.add(id);
        return next;
      });
      setError('تعذر حفظ التغيير، تحقق من الاتصال');
      setTimeout(() => setError(null), 3000);
    }
  };

  const shiftDay = (n: number) => {
    const d = new Date(date);
    d.setDate(d.getDate() + n);
    setDate(d);
  };

  const isToday = dayKey(date) === dayKey(new Date());
  const dateLabel = new Intl.DateTimeFormat('ar-EG', { weekday: 'long', day: 'numeric', month: 'long' }).format(date);

  const progress = (period: Period, items: Item[]) =>
    items.filter((i) => checked.has(`${keys[period]}|${i.key}`)).length;

  const renderItem = (period: Period, item: Item) => {
    const on = checked.has(`${keys[period]}|${item.key}`);
    return (
      <button
        key={item.key}
        id={`spiritual-${item.key}`}
        type="button"
        role="checkbox"
        aria-checked={on}
        onClick={() => toggle(period, item.key)}
        className={cn(
          'flex items-center gap-2.5 px-3 py-2.5 rounded-button border text-body-small font-semibold transition-all active:scale-[0.98] text-right',
          on
            ? 'bg-brand-primary-soft border-brand-primary/40 text-brand-primary'
            : 'bg-bg-surface border-border-default text-text-primary hover:bg-bg-muted'
        )}
      >
        <span
          className={cn(
            'w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-colors',
            on ? 'bg-brand-primary border-brand-primary text-white' : 'border-text-disabled bg-bg-surface'
          )}
        >
          {on && <Check className="w-3.5 h-3.5" strokeWidth={3} />}
        </span>
        <span className="flex-1">{item.label}</span>
      </button>
    );
  };

  return (
    <ProtectedRoute>
      <div dir="rtl" className="min-h-screen bg-bg-app flex flex-col items-center pb-24">
        <div className="w-full max-w-[480px] flex flex-col">
          <header className="sticky top-0 z-30 bg-brand-primary text-white shadow-card h-14 px-3 flex items-center gap-2">
            <button
              type="button"
              onClick={() => router.push('/more')}
              aria-label="الرجوع"
              className="w-9 h-9 rounded-button flex items-center justify-center hover:bg-white/10"
            >
              <ArrowRight className="w-5 h-5" />
            </button>
            <h1 className="flex-1 text-h2 font-bold">المفكرة الروحية</h1>
            <Lock className="w-4 h-4 text-brand-accent" aria-label="خاصة وسرية" />
          </header>

          <main className="px-4 py-4 flex flex-col gap-4">
            {/* Date navigator */}
            <div className="flex items-center justify-between bg-bg-surface border border-border-default rounded-card shadow-card px-2 h-12">
              <button
                id="spiritual-prev-day"
                type="button"
                onClick={() => shiftDay(-1)}
                aria-label="اليوم السابق"
                className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-bg-muted"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={() => setDate(new Date())}
                className="text-body-default font-bold text-text-primary"
              >
                {isToday ? `اليوم • ${dateLabel}` : dateLabel}
              </button>
              <button
                id="spiritual-next-day"
                type="button"
                onClick={() => shiftDay(1)}
                aria-label="اليوم التالي"
                className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-bg-muted"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="p-3 bg-status-danger-soft border border-[#F5C2BE] rounded-lg text-caption text-status-danger">
                {error}
              </div>
            )}

            {loading ? (
              <div className="py-16 flex justify-center">
                <Loader2 className="w-7 h-7 animate-spin text-brand-primary" />
              </div>
            ) : (
              SECTIONS.map((section) => {
                const all = section.groups ? section.groups.flatMap((g) => g.items) : section.items!;
                return (
                  <section
                    key={section.id}
                    className="bg-bg-surface border border-border-default rounded-card p-4 shadow-card flex flex-col gap-3"
                  >
                    <div className="flex items-center justify-between pb-2 border-b border-border-default">
                      <h2 className="text-h2 font-bold text-text-primary">{section.title}</h2>
                      <span className="text-caption font-bold text-brand-accent px-2 py-0.5 bg-brand-accent-soft rounded-pill">
                        {progress(section.period, all)}/{all.length}
                      </span>
                    </div>
                    {section.groups
                      ? section.groups.map((g) => (
                          <div key={g.title} className="flex flex-col gap-2">
                            <h3 className="text-body-small font-semibold text-text-secondary">{g.title}</h3>
                            <div className="grid grid-cols-2 gap-2">
                              {g.items.map((i) => renderItem(section.period, i))}
                            </div>
                          </div>
                        ))
                      : (
                        <div className="grid grid-cols-1 gap-2">
                          {section.items!.map((i) => renderItem(section.period, i))}
                        </div>
                      )}
                  </section>
                );
              })
            )}

            <button
              id="spiritual-open-log"
              type="button"
              onClick={() => setJournalOpen(true)}
              className="flex items-center justify-center gap-2 h-12 rounded-button border border-border-default bg-bg-surface text-body-small font-semibold text-brand-primary hover:bg-bg-muted transition-colors"
            >
              <BookMarked className="w-4 h-4" />
              سجل الاعتراف والتناول التفصيلي
            </button>

            <p className="text-caption text-text-secondary text-center flex items-center justify-center gap-1.5">
              <Lock className="w-3.5 h-3.5" /> بياناتك هنا خاصة وسرية ولا يراها أي مسؤول
            </p>
          </main>
        </div>

        <SpiritualJournal isOpen={journalOpen} onClose={() => setJournalOpen(false)} />
        <TabBar activeTab="more" />
      </div>
    </ProtectedRoute>
  );
}
