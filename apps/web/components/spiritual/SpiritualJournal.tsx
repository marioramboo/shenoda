'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import {
  SpiritualSacrament,
  SPIRITUAL_SACRAMENT_LABELS,
} from '@shenoda/shared';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import {
  ShieldCheck,
  Lock,
  Calendar,
  Sparkles,
  BookOpen,
  Plus,
  Trash2,
  X,
  Heart,
  Flame,
  Church,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SpiritualEntry {
  id: string;
  sacrament: SpiritualSacrament;
  entryDate: string;
  notes?: string | null;
  fatherName?: string | null;
  createdAt: string;
}

export interface SpiritualJournalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SpiritualJournal: React.FC<SpiritualJournalProps> = ({
  isOpen,
  onClose,
}) => {
  const [entries, setEntries] = useState<SpiritualEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  // New entry form state
  const [sacrament, setSacrament] = useState<SpiritualSacrament>(SpiritualSacrament.COMMUNION);
  const [entryDate, setEntryDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [fatherName, setFatherName] = useState('');
  const [notes, setNotes] = useState('');
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const fetchEntries = async () => {
      try {
        setIsLoading(true);
        const res = await api.get('/api/v1/spiritual-life/me');
        if (res.data?.data) {
          setEntries(res.data.data);
        }
      } catch (err) {
        console.error('Failed to load spiritual entries:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchEntries();
  }, [isOpen]);

  const handleCreateEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      const res = await api.post('/api/v1/spiritual-life', {
        sacrament,
        entryDate,
        fatherName: fatherName.trim() || undefined,
        notes: notes.trim() || undefined,
      });

      if (res.data?.success) {
        setEntries((prev) => [res.data.data, ...prev]);
        setShowAddForm(false);
        setFatherName('');
        setNotes('');
        setFeedbackMessage('تم حفظ السجل الروحي بنجاح');
        setTimeout(() => setFeedbackMessage(null), 3000);
      }
    } catch (err) {
      console.error('Failed to save spiritual entry:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteEntry = async (id: string) => {
    try {
      await api.delete(`/api/v1/spiritual-life/${id}`);
      setEntries((prev) => prev.filter((e) => e.id !== id));
    } catch (err) {
      console.error('Failed to delete spiritual entry:', err);
    }
  };

  const getSacramentIcon = (s: SpiritualSacrament) => {
    switch (s) {
      case SpiritualSacrament.COMMUNION:
        return <Church className="w-4 h-4 text-brand-primary" />;
      case SpiritualSacrament.CONFESSION:
        return <Heart className="w-4 h-4 text-status-warning" />;
      case SpiritualSacrament.PRAYER_RULE:
        return <Flame className="w-4 h-4 text-status-danger" />;
      case SpiritualSacrament.FASTING:
        return <Sparkles className="w-4 h-4 text-status-info" />;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-bg-surface w-full max-w-md max-h-[90vh] flex flex-col rounded-t-sheet sm:rounded-card border border-border-default shadow-card overflow-hidden">
        {/* Drawer Header */}
        <div className="p-4 border-b border-border-default flex items-center justify-between bg-bg-surface shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-brand-primary-soft text-brand-primary flex items-center justify-center">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-body font-bold text-text-primary">
                مذكرتي الروحية (الحياة الروحية)
              </h3>
              <p className="text-caption text-text-secondary">سجل شخصي وخاص جداً</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-full hover:bg-bg-muted text-text-secondary"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Scrollable Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Privacy Assurance Banner (NFR-3.4) */}
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-card p-3 flex items-start gap-2.5">
            <ShieldCheck className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-caption font-medium text-amber-600 dark:text-amber-400">
              بياناتك الروحية مشفرة وخاصة بك بالكامل. نظام الخدمة يمنع منعاً باتاً أي مسؤول أو أمين
              من الاطلاع عليها تحت أي ظرف.
            </p>
          </div>

          {feedbackMessage && (
            <div className="p-2.5 bg-status-success-soft text-status-success rounded-card text-caption font-medium text-center">
              {feedbackMessage}
            </div>
          )}

          {/* Quick Action Buttons */}
          {!showAddForm && (
            <div className="space-y-2">
              <Button
                variant="primary"
                fullWidth
                onClick={() => setShowAddForm(true)}
                className="h-[42px] text-body-small font-bold"
              >
                <Plus className="w-4 h-4 ml-1.5" />
                <span>تسجيل ممارسة روحية جديدة</span>
              </Button>
            </div>
          )}

          {/* Inline Add Form */}
          {showAddForm && (
            <form
              onSubmit={handleCreateEntry}
              className="bg-bg-muted p-3.5 rounded-card border border-border-default space-y-3"
            >
              <div className="flex items-center justify-between border-b border-border-default/60 pb-2">
                <span className="text-caption font-bold text-text-primary">
                  تسجيل ممارسة جديدة
                </span>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="text-caption text-text-secondary hover:text-text-primary"
                >
                  إلغاء
                </button>
              </div>

              {/* Sacrament Selector */}
              <div>
                <label className="text-caption font-semibold text-text-secondary block mb-1">
                  الممارسة الروحية:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(Object.values(SpiritualSacrament) as SpiritualSacrament[]).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSacrament(s)}
                      className={cn(
                        'flex items-center gap-1.5 px-3 py-2 rounded-card text-caption font-medium border text-right transition-all',
                        sacrament === s
                          ? 'border-brand-primary bg-brand-primary/10 text-brand-primary font-bold'
                          : 'border-border-default bg-bg-surface text-text-secondary hover:border-text-secondary'
                      )}
                    >
                      {getSacramentIcon(s)}
                      <span className="truncate">{SPIRITUAL_SACRAMENT_LABELS[s]?.ar}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Date */}
              <div>
                <label className="text-caption font-semibold text-text-secondary block mb-1">
                  التاريخ:
                </label>
                <input
                  type="date"
                  value={entryDate}
                  onChange={(e) => setEntryDate(e.target.value)}
                  className="w-full bg-bg-surface border border-border-default rounded-card px-3 py-1.5 text-body-small text-text-primary focus:outline-none focus:border-brand-primary"
                  required
                />
              </div>

              {/* Father Confessor (Optional) */}
              {sacrament === SpiritualSacrament.CONFESSION && (
                <div>
                  <label className="text-caption font-semibold text-text-secondary block mb-1">
                    أب الاعتراف:
                  </label>
                  <input
                    type="text"
                    value={fatherName}
                    onChange={(e) => setFatherName(e.target.value)}
                    placeholder="مثال: أبونا يوحنا"
                    className="w-full bg-bg-surface border border-border-default rounded-card px-3 py-1.5 text-body-small text-text-primary focus:outline-none focus:border-brand-primary"
                  />
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="text-caption font-semibold text-text-secondary block mb-1">
                  خواطر وتأملات شخصية (اختياري):
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="ملاحظات شخصية لا يراها أحد سواك..."
                  rows={2}
                  className="w-full bg-bg-surface border border-border-default rounded-card px-3 py-1.5 text-body-small text-text-primary focus:outline-none focus:border-brand-primary"
                />
              </div>

              <Button
                type="submit"
                variant="primary"
                fullWidth
                isLoading={isSubmitting}
                className="h-[38px] text-body-small"
              >
                تأكيد وحفظ
              </Button>
            </form>
          )}

          {/* Past Entries List */}
          <div className="space-y-2">
            <h4 className="text-caption font-bold text-text-secondary">سجل الممارسات الأخيرة</h4>

            {isLoading ? (
              <div className="text-center py-6 text-text-secondary text-caption">
                جارٍ تحميل السجل الروحي...
              </div>
            ) : entries.length === 0 ? (
              <div className="text-center py-8 bg-bg-muted rounded-card border border-border-default">
                <BookOpen className="w-8 h-8 text-text-tertiary mx-auto mb-1.5 opacity-50" />
                <p className="text-caption text-text-secondary font-medium">
                  لا توجد ممارسات مسجلة بعد
                </p>
                <p className="text-[11px] text-text-tertiary mt-0.5">
                  سجل مواعيد التناول والاعتراف لمتابعة مسيرتك الروحية
                </p>
              </div>
            ) : (
              entries.map((entry) => {
                const formatted = new Date(entry.entryDate).toLocaleDateString('ar-EG', {
                  weekday: 'short',
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                });

                return (
                  <div
                    key={entry.id}
                    className="p-3 bg-bg-surface border border-border-default rounded-card shadow-sm flex items-start justify-between gap-2.5"
                  >
                    <div className="flex items-start gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-bg-muted flex items-center justify-center shrink-0 mt-0.5">
                        {getSacramentIcon(entry.sacrament)}
                      </div>
                      <div>
                        <span className="text-body-small font-bold text-text-primary block">
                          {SPIRITUAL_SACRAMENT_LABELS[entry.sacrament]?.ar}
                        </span>
                        <span className="text-caption text-text-secondary flex items-center gap-1 mt-0.5">
                          <Calendar className="w-3 h-3 text-text-tertiary" />
                          <span>{formatted}</span>
                        </span>
                        {entry.fatherName && (
                          <span className="text-[11px] text-text-tertiary block mt-0.5">
                            مع: {entry.fatherName}
                          </span>
                        )}
                        {entry.notes && (
                          <p className="text-caption text-text-secondary mt-1 bg-bg-muted/60 p-1.5 rounded">
                            {entry.notes}
                          </p>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeleteEntry(entry.id)}
                      className="p-1 rounded text-text-tertiary hover:text-status-danger transition-colors shrink-0"
                      title="حذف"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
