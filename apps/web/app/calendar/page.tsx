'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Chip } from '@/components/ui/Chip';
import { TabBar } from '@/components/layout/TabBar';
import { EventAttendanceModal } from '@/components/calendar/EventAttendanceModal';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { getCopticDate } from '@shenoda/shared';
import {
  Calendar as CalendarIcon,
  ChevronRight,
  ChevronLeft,
  MapPin,
  Clock,
  Users,
  CheckCircle2,
  CalendarCheck,
  CalendarDays,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import {
  EventCategory,
  EVENT_CATEGORY_ARABIC,
  EVENT_CATEGORY_COLORS,
} from '@shenoda/shared';

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

interface CalendarEvent {
  id: string;
  title: string;
  description: string | null;
  category: EventCategory;
  startDate: string;
  endDate: string;
  location: string | null;
  maxVolunteers: number | null;
  volunteers: Volunteer[];
  eventAttendances?: Array<{ id: string; userId: string; confirmedAt: string }>;
}

const DAYS_OF_WEEK = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

export default function CalendarPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);

  // Dynamic stages list (from API or user.scopes)
  const [stagesList, setStagesList] = useState<any[]>([]);

  useEffect(() => {
    let isMounted = true;
    const fetchStages = async () => {
      try {
        const res = await api.get('/api/v1/stages');
        if (res.data?.success && Array.isArray(res.data.stages)) {
          if (isMounted) setStagesList(res.data.stages);
        }
      } catch {
        // Fallback silently to user.scopes.stages
      }
    };
    fetchStages();
    return () => {
      isMounted = false;
    };
  }, []);

  const availableStages = useMemo(() => {
    return stagesList.length > 0 ? stagesList : (user?.scopes?.stages || []);
  }, [stagesList, user]);

  const [selectedStageId, setSelectedStageId] = useState<string>('');

  // Attendance confirmation modal
  const [activeAttendanceEvent, setActiveAttendanceEvent] = useState<CalendarEvent | null>(null);

  // Month bounds
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const startingDayIndex = firstDayOfMonth.getDay(); // 0 for Sunday
  const totalDays = lastDayOfMonth.getDate();

  // Current month Coptic title
  const midMonthDate = new Date(year, month, 15);
  const copticInfo = getCopticDate(midMonthDate);
  const gregorianMonthName = new Intl.DateTimeFormat('ar-EG', { month: 'long', year: 'numeric' }).format(currentDate);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const start = new Date(year, month, 1).toISOString();
      const end = new Date(year, month + 1, 0, 23, 59, 59).toISOString();
      const stageParam = selectedStageId ? `&stageId=${selectedStageId}` : '';

      const res = await api.get(`/api/v1/calendar?startDate=${start}&endDate=${end}${stageParam}`);
      if (res.data?.success) {
        setEvents(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load calendar events:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [currentDate, selectedStageId]);

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  // Events for a specific day
  const getEventsForDay = (day: number) => {
    return events.filter((ev) => {
      const d = new Date(ev.startDate);
      return (
        d.getFullYear() === year &&
        d.getMonth() === month &&
        d.getDate() === day
      );
    });
  };

  // Events on the currently selected date
  const selectedDayEvents = events.filter((ev) => {
    const d = new Date(ev.startDate);
    return (
      d.getFullYear() === selectedDate.getFullYear() &&
      d.getMonth() === selectedDate.getMonth() &&
      d.getDate() === selectedDate.getDate()
    );
  });

  const handleTabChange = (tab: string) => {
    if (tab === 'dashboard') router.push('/dashboard');
    else if (tab === 'members') router.push('/members');
    else if (tab === 'attendance') router.push('/attendance');
    else if (tab === 'plan') router.push('/plan');
  };

  return (
    <ProtectedRoute>
      <div dir="rtl" className="min-h-screen bg-bg-app flex flex-col items-center p-4 sm:p-6 pb-28">
        <div className="w-full max-w-[480px] flex flex-col gap-4">

          {/* Top Bar */}
          <header className="flex items-center justify-between bg-bg-surface border border-border-default rounded-card p-4 shadow-card">
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => router.push('/plan')}
                className="p-1 text-text-secondary hover:text-text-primary"
              >
                <ArrowRight className="w-5 h-5" />
              </button>
              <div className="text-right">
                <h1 className="text-body-default font-bold text-text-primary">
                  النتيجة والتقويم الكنسي
                </h1>
                <p className="text-caption text-text-secondary mt-0.5">
                  {copticInfo.monthName} {copticInfo.year} للشهداء
                </p>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push('/plan')}
              className="text-caption font-semibold h-8 px-2.5"
            >
              تدبير السنة
            </Button>
          </header>

          {/* Stage Selector Chips Bar */}
          {availableStages.length > 1 && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar select-none">
              <span className="text-caption font-bold text-text-secondary whitespace-nowrap ml-1">
                المرحلة:
              </span>
              <Chip
                selected={!selectedStageId}
                onClick={() => setSelectedStageId('')}
                className={cn(
                  'shrink-0 text-caption transition-all',
                  !selectedStageId
                    ? 'bg-brand-primary text-text-inverse shadow-sm'
                    : 'bg-bg-surface border border-border-default text-text-secondary hover:border-text-secondary hover:text-text-primary'
                )}
              >
                الكل
              </Chip>
              {availableStages.map((stage) => {
                const isSelected = selectedStageId === stage.id;
                return (
                  <Chip
                    key={stage.id}
                    selected={isSelected}
                    onClick={() => setSelectedStageId(stage.id)}
                    className={cn(
                      'shrink-0 text-caption transition-all',
                      isSelected
                        ? 'bg-brand-primary text-text-inverse shadow-sm'
                        : 'bg-bg-surface border border-border-default text-text-secondary hover:border-text-secondary hover:text-text-primary'
                    )}
                  >
                    {stage.name}
                  </Chip>
                );
              })}
            </div>
          )}

          {/* Month Navigator Header */}
          <div className="bg-bg-surface border border-border-default rounded-card p-4 shadow-card flex items-center justify-between">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1.5 rounded-lg hover:bg-bg-muted text-text-primary transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>

            <div className="text-center">
              <h2 className="text-h2 font-bold text-text-primary">
                {gregorianMonthName}
              </h2>
              <span className="text-caption font-medium text-brand-accent">
                {copticInfo.monthName} ({copticInfo.year} ش)
              </span>
            </div>

            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1.5 rounded-lg hover:bg-bg-muted text-text-primary transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          </div>

          {/* Interactive Mobile Touch Calendar Grid */}
          <div className="bg-bg-surface border border-border-default rounded-card p-3 shadow-card">
            {/* Days of Week Header */}
            <div className="grid grid-cols-7 gap-1 text-center mb-2 pb-2 border-b border-border-default">
              {DAYS_OF_WEEK.map((dayName, idx) => (
                <span
                  key={dayName}
                  className={`text-[11px] font-bold ${
                    idx === 0 ? 'text-brand-accent' : 'text-text-secondary'
                  }`}
                >
                  {dayName}
                </span>
              ))}
            </div>

            {/* Calendar Days Matrix */}
            <div className="grid grid-cols-7 gap-1">
              {/* Padding empty boxes before month start */}
              {Array.from({ length: startingDayIndex }).map((_, i) => (
                <div key={`empty-${i}`} className="h-12 rounded-lg bg-transparent" />
              ))}

              {/* Month Days */}
              {Array.from({ length: totalDays }).map((_, idx) => {
                const dayNum = idx + 1;
                const cellDate = new Date(year, month, dayNum);
                const isSelected =
                  cellDate.getDate() === selectedDate.getDate() &&
                  cellDate.getMonth() === selectedDate.getMonth() &&
                  cellDate.getFullYear() === selectedDate.getFullYear();

                const isToday =
                  cellDate.getDate() === new Date().getDate() &&
                  cellDate.getMonth() === new Date().getMonth() &&
                  cellDate.getFullYear() === new Date().getFullYear();

                const dayEvents = getEventsForDay(dayNum);
                const dayCoptic = getCopticDate(cellDate);

                return (
                  <button
                    key={`day-${dayNum}`}
                    type="button"
                    onClick={() => setSelectedDate(cellDate)}
                    className={`h-12 rounded-lg p-1 flex flex-col items-center justify-between transition-all relative ${
                      isSelected
                        ? 'bg-brand-primary text-white shadow-card font-bold'
                        : isToday
                        ? 'bg-brand-primary-soft text-brand-primary border border-brand-primary/40 font-semibold'
                        : 'bg-bg-app hover:bg-bg-muted text-text-primary'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full px-1">
                      <span className="text-[12px] leading-tight">{dayNum}</span>
                      <span
                        className={`text-[9px] ${
                          isSelected
                            ? 'text-brand-accent'
                            : 'text-text-secondary'
                        }`}
                      >
                        {dayCoptic.day}
                      </span>
                    </div>

                    {/* Category Color Dots */}
                    <div className="flex items-center gap-0.5 justify-center w-full mt-auto mb-0.5">
                      {dayEvents.slice(0, 3).map((ev, evIdx) => (
                        <span
                          key={`dot-${evIdx}`}
                          className="w-1.5 h-1.5 rounded-full"
                          style={{
                            backgroundColor: isSelected
                              ? '#FFFFFF'
                              : EVENT_CATEGORY_COLORS[ev.category] || '#1F3A5F',
                          }}
                        />
                      ))}
                      {dayEvents.length > 3 && (
                        <span className="text-[8px] leading-none opacity-80">+</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selected Day Agenda List */}
          <section className="bg-bg-surface border border-border-default rounded-card p-4 shadow-card flex flex-col gap-3 text-right">
            <div className="flex items-center justify-between pb-2 border-b border-border-default">
              <div className="flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-brand-primary" />
                <h3 className="text-h2 font-bold text-text-primary">
                  جدول فعاليات يوم{' '}
                  {selectedDate.toLocaleDateString('ar-EG', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'short',
                  })}
                </h3>
              </div>
              <Badge variant="accent">
                {getCopticDate(selectedDate).formatted}
              </Badge>
            </div>

            {selectedDayEvents.length > 0 ? (
              <div className="flex flex-col gap-3">
                {selectedDayEvents.map((ev) => (
                  <div
                    key={ev.id}
                    className="p-3.5 bg-bg-app rounded-lg border border-border-default flex flex-col gap-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <Badge
                        variant="neutral"
                        style={{
                          borderColor: EVENT_CATEGORY_COLORS[ev.category],
                          color: EVENT_CATEGORY_COLORS[ev.category],
                        }}
                      >
                        {EVENT_CATEGORY_ARABIC[ev.category] || ev.category}
                      </Badge>

                      <div className="flex items-center gap-1 text-[11px] text-text-secondary">
                        <Clock className="w-3.5 h-3.5" />
                        <span>
                          {new Date(ev.startDate).toLocaleTimeString('ar-EG', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-body-default font-bold text-text-primary">
                        {ev.title}
                      </h4>
                      {ev.description && (
                        <p className="text-caption text-text-secondary mt-0.5 leading-relaxed">
                          {ev.description}
                        </p>
                      )}
                    </div>

                    {ev.location && (
                      <div className="flex items-center gap-1.5 text-[11px] text-text-secondary">
                        <MapPin className="w-3.5 h-3.5 text-brand-accent shrink-0" />
                        <span>{ev.location}</span>
                      </div>
                    )}

                    {/* Secretary Action Bridge: Confirm Attendance (FR-12.2) */}
                    <div className="pt-2 border-t border-border-default flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-caption text-text-secondary">
                        <Users className="w-3.5 h-3.5" />
                        <span>المتطوعين: {ev.volunteers.length}</span>
                      </div>

                      {user && user.role.level >= 2 && (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => setActiveAttendanceEvent(ev)}
                          className="text-caption font-semibold h-7 px-3 gap-1"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>تسجيل الحضور</span>
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 text-center text-caption text-text-secondary">
                لا توجد فعاليات مجدولة في هذا اليوم.
              </div>
            )}
          </section>

          {/* Attendance Bridge Confirmation Modal (FR-12.2) */}
          <EventAttendanceModal
            isOpen={Boolean(activeAttendanceEvent)}
            onClose={() => setActiveAttendanceEvent(null)}
            event={activeAttendanceEvent}
            onAttendanceConfirmed={() => {
              fetchEvents();
            }}
          />

        </div>

        {/* TabBar */}
        <TabBar activeTab="plan" onTabChange={handleTabChange} />
      </div>
    </ProtectedRoute>
  );
}
