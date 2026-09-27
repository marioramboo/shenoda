'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { api } from '@/lib/api';
import {
  X,
  CheckCircle2,
  CalendarCheck,
  User,
  Users,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { EVENT_CATEGORY_ARABIC, EventCategory } from '@shenoda/shared';

interface Volunteer {
  id: string;
  userId: string;
  roleInEvent: string | null;
  user?: {
    id: string;
    fullName: string;
    phoneNumber: string | null;
  };
}

interface CalendarEventDetail {
  id: string;
  title: string;
  category: EventCategory;
  startDate: string;
  endDate: string;
  location: string | null;
  volunteers: Volunteer[];
  eventAttendances?: Array<{ id: string; userId: string; confirmedAt: string }>;
}

interface EventAttendanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: CalendarEventDetail | null;
  onAttendanceConfirmed?: () => void;
}

export const EventAttendanceModal: React.FC<EventAttendanceModalProps> = ({
  isOpen,
  onClose,
  event,
  onAttendanceConfirmed,
}) => {
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen || !event) return null;

  const confirmedUserIds = new Set(
    (event.eventAttendances || []).map((a) => a.userId)
  );

  const toggleSelectUser = (userId: string) => {
    if (confirmedUserIds.has(userId)) return; // Already confirmed
    setSelectedUserIds((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const handleConfirmAttendance = async () => {
    if (selectedUserIds.length === 0) return;

    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const res = await api.post(`/api/v1/events/${event.id}/confirm-attendance`, {
        servantUserIds: selectedUserIds,
      });

      if (res.data?.success) {
        setSuccessMessage(res.data.message || 'تم تأكيد الحضور بنجاح');
        setSelectedUserIds([]);
        if (onAttendanceConfirmed) {
          onAttendanceConfirmed();
        }
      }
    } catch (err: any) {
      setError(
        err.response?.data?.error?.message ||
          'حدث خطأ أثناء تسجيل وتأكيد الحضور'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div
        dir="rtl"
        className="w-full max-w-[460px] bg-bg-surface border border-border-default rounded-card shadow-elevated p-5 text-right relative max-h-[90vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-start justify-between pb-3 border-b border-border-default">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <CalendarCheck className="w-5 h-5 text-brand-primary" />
              <h3 className="text-h2 font-bold text-text-primary">
                تأكيد حضور الفعالية
              </h3>
            </div>
            <p className="text-body-small font-semibold text-brand-primary">
              {event.title}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-text-secondary hover:text-text-primary p-1 rounded-md"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Bridge Assurance Banner (FR-12.2) */}
        <div className="my-3 p-3 bg-brand-primary-soft/60 border border-[#D5E1F0] rounded-lg flex items-start gap-2.5">
          <Sparkles className="w-4 h-4 text-brand-primary shrink-0 mt-0.5" />
          <p className="text-caption text-brand-primary font-medium leading-relaxed">
            الربط المباشر بجدول المتابعة: تأكيد الحضور هنا يسجل حضور الخادم تلقائياً في سجلات الخدمة (Phase 4).
          </p>
        </div>

        {/* Status Alerts */}
        {error && (
          <div className="mb-3 p-3 bg-status-danger-soft border border-[#F5C2BE] rounded-lg flex items-center gap-2 text-caption text-status-danger font-medium">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMessage && (
          <div className="mb-3 p-3 bg-status-success-soft border border-[#BDE5D0] rounded-lg flex items-center gap-2 text-caption text-status-success font-medium">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Volunteers List */}
        <div className="flex-1 overflow-y-auto pr-0.5 flex flex-col gap-2 my-2">
          <span className="text-caption font-semibold text-text-secondary">
            الخدام المتطوعون والمسجلون بالفعالية ({event.volunteers.length}):
          </span>

          {event.volunteers.length === 0 ? (
            <div className="p-6 text-center bg-bg-app rounded-lg border border-dashed border-border-default text-text-secondary text-body-small">
              لا يوجد خدام متطوعون مسجلون في هذه الفعالية حالياً.
            </div>
          ) : (
            event.volunteers.map((vol) => {
              const isConfirmed = confirmedUserIds.has(vol.userId);
              const isSelected = selectedUserIds.includes(vol.userId);

              return (
                <div
                  key={vol.id}
                  onClick={() => toggleSelectUser(vol.userId)}
                  className={`p-3 rounded-lg border flex items-center justify-between cursor-pointer transition-colors ${
                    isConfirmed
                      ? 'bg-status-success-soft/30 border-[#BDE5D0] cursor-default'
                      : isSelected
                      ? 'bg-brand-primary-soft border-brand-primary'
                      : 'bg-bg-surface border-border-default hover:border-brand-primary/40'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-caption ${
                        isConfirmed
                          ? 'bg-status-success text-white'
                          : isSelected
                          ? 'bg-brand-primary text-white'
                          : 'bg-bg-muted text-text-secondary'
                      }`}
                    >
                      <User className="w-4 h-4" />
                    </div>

                    <div className="text-right">
                      <p className="text-body-default font-bold text-text-primary">
                        {vol.user?.fullName || 'خادم'}
                      </p>
                      {vol.roleInEvent && (
                        <p className="text-caption text-text-secondary">
                          الدور: {vol.roleInEvent}
                        </p>
                      )}
                    </div>
                  </div>

                  <div>
                    {isConfirmed ? (
                      <Badge variant="success" className="gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>تم الحضور</span>
                      </Badge>
                    ) : (
                      <div
                        className={`w-5 h-5 rounded border flex items-center justify-center ${
                          isSelected
                            ? 'bg-brand-primary border-brand-primary text-white'
                            : 'border-border-default bg-bg-surface'
                        }`}
                      >
                        {isSelected && <CheckCircle2 className="w-4 h-4" />}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Actions */}
        <div className="pt-3 border-t border-border-default flex items-center gap-2 mt-auto">
          <Button
            variant="primary"
            disabled={selectedUserIds.length === 0 || loading}
            isLoading={loading}
            onClick={handleConfirmAttendance}
            className="flex-1 font-semibold"
          >
            تأكيد حضور المحدد ({selectedUserIds.length})
          </Button>

          <Button variant="outline" onClick={onClose} className="px-4">
            إغلاق
          </Button>
        </div>
      </div>
    </div>
  );
};
