'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { AttendanceToggle } from '@/components/ui/AttendanceToggle';
import { FollowUpTable, FollowUpRecord } from '@/components/attendance/FollowUpTable';
import { Chip } from '@/components/ui/Chip';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { TabBar } from '@/components/layout/TabBar';
import { api } from '@/lib/api';
import {
  MemberSessionType,
  ServantSessionType,
  AttendanceStatus,
  MEMBER_SESSION_LABELS,
  SERVANT_SESSION_LABELS,
  getAllowedSessionsForRole,
} from '@shenoda/shared';
import {
  Calendar,
  ChevronRight,
  ChevronLeft,
  Search,
  CheckCircle,
  AlertTriangle,
  FileText,
  Save,
  Users,
  UserCheck,
  BellRing,
  X,
  Phone,
  Clock,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface MemberItem {
  id: string;
  fullName: string;
  educationalGrade?: string | null;
  phoneNumber?: string | null;
  status: AttendanceStatus;
  notes?: string;
  consecutiveAbsences?: number;
}

interface AbsenceAlertItem {
  id: string;
  memberId?: string;
  member?: {
    id: string;
    fullName: string;
    phoneNumber?: string;
    educationalGrade?: string;
  };
  consecutiveCount: number;
  lastAttendedDate?: string;
  alertStatus: string;
  resolutionNotes?: string;
}

export default function AttendancePage() {
  const { user } = useAuth();
  const router = useRouter();

  // Active top view tab: 'members' (تسجيل حضور المخدومين) | 'servants' (متابعة الخدام) | 'alerts' (تنبيهات الافتقاد)
  const [activeView, setActiveView] = useState<'members' | 'servants' | 'alerts'>('members');

  // Date selection (default to nearest Friday)
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const now = new Date();
    const day = now.getDay();
    // Friday is day 5
    const diff = (5 - day + 7) % 7;
    const friday = new Date(now);
    friday.setDate(now.getDate() + diff);
    return friday.toISOString().split('T')[0];
  });

  // Selected session types
  const [memberSessionType, setMemberSessionType] = useState<MemberSessionType>(
    MemberSessionType.SERVICE_ATTENDANCE
  );
  const [servantSessionType, setServantSessionType] = useState<ServantSessionType>(
    ServantSessionType.SERVICE_ATTENDANCE
  );

  // Stage selection (from user scopes)
  const primaryStageId = user?.scopes?.stages?.[0]?.id || '';
  const [selectedStageId, setSelectedStageId] = useState<string>(primaryStageId);

  // Sync selectedStageId when user profile loads asynchronously
  useEffect(() => {
    if (user?.scopes?.stages && user.scopes.stages.length > 0 && !selectedStageId) {
      setSelectedStageId(user.scopes.stages[0].id);
    }
  }, [user, selectedStageId]);

  // Members list & state
  const [members, setMembers] = useState<MemberItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);
  const [saveErrorMessage, setSaveErrorMessage] = useState<string | null>(null);

  // Active note editing modal
  const [noteModalMember, setNoteModalMember] = useState<MemberItem | null>(null);
  const [noteDraft, setNoteDraft] = useState('');

  // Alerts state
  const [alerts, setAlerts] = useState<AbsenceAlertItem[]>([]);
  const [isLoadingAlerts, setIsLoadingAlerts] = useState(false);
  const [resolveModalAlert, setResolveModalAlert] = useState<AbsenceAlertItem | null>(null);
  const [resolveOutcomeText, setResolveOutcomeText] = useState('');
  const [isResolvingAlert, setIsResolvingAlert] = useState(false);

  // Servant follow-up records state
  const [servantRecords, setServantRecords] = useState<FollowUpRecord[]>([]);
  const [servantStats, setServantStats] = useState<any>(null);
  const [isLoadingServants, setIsLoadingServants] = useState(false);

  // Fetch members & initial attendance records for selected stage & date
  useEffect(() => {
    if (!selectedStageId) return;

    const fetchMembersAndAttendance = async () => {
      try {
        setIsLoadingMembers(true);
        // 1. Fetch stage members (Level 1 servant filters assigned members, falls back to stage members)
        const isServant = user?.role?.level === 1;
        const assignedParam = isServant ? '&assignedOnly=true' : '';
        const membersRes = await api.get(`/api/v1/members?stageId=${selectedStageId}&limit=150${assignedParam}`);
        let rawMembers = membersRes.data?.members || membersRes.data?.data || [];

        // If assignedOnly returned empty for a servant (e.g. not yet assigned), fallback to stage members
        if (isServant && rawMembers.length === 0) {
          const allRes = await api.get(`/api/v1/members?stageId=${selectedStageId}&limit=150`);
          rawMembers = allRes.data?.members || allRes.data?.data || [];
        }

        // 2. Fetch recorded attendance for this date & session
        let existingRecordsMap: Record<string, { status: AttendanceStatus; notes?: string }> = {};
        try {
          const attRes = await api.get(
            `/api/v1/attendance/members?stageId=${selectedStageId}&sessionType=${memberSessionType}&sessionDate=${selectedDate}`
          );
          const attRecords = attRes.data?.data || attRes.data?.records || [];
          if (Array.isArray(attRecords)) {
            for (const r of attRecords) {
              existingRecordsMap[r.memberId] = {
                status: r.status,
                notes: r.notes || '',
              };
            }
          }
        } catch {
          // If no existing attendance, fallback to default
        }

        // Merge members with existing attendance or default UNSET
        const merged: MemberItem[] = rawMembers.map((m: any) => ({
          id: m.id,
          fullName: m.fullName,
          educationalGrade: m.educationalGrade,
          phoneNumber: m.phoneNumber,
          status: existingRecordsMap[m.id]?.status || 'UNSET',
          notes: existingRecordsMap[m.id]?.notes || '',
        }));

        setMembers(merged);
      } catch (err: any) {
        console.error('Failed to fetch members or attendance:', err);
      } finally {
        setIsLoadingMembers(false);
      }
    };

    fetchMembersAndAttendance();
  }, [selectedStageId, selectedDate, memberSessionType, user]);

  // Fetch absence alerts for the stage
  useEffect(() => {
    if (!selectedStageId) return;

    const fetchAlerts = async () => {
      try {
        setIsLoadingAlerts(true);
        const res = await api.get(`/api/v1/attendance/alerts?stageId=${selectedStageId}&status=ACTIVE`);
        if (res.data?.data) {
          setAlerts(res.data.data);
        }
      } catch (err) {
        console.error('Failed to load absence alerts:', err);
      } finally {
        setIsLoadingAlerts(false);
      }
    };

    fetchAlerts();
  }, [selectedStageId]);

  // Fetch servant history if on servants tab
  useEffect(() => {
    if (activeView !== 'servants') return;

    const fetchServantHistory = async () => {
      try {
        setIsLoadingServants(true);
        const res = await api.get('/api/v1/attendance/servants/history');
        if (res.data?.data) {
          setServantRecords(res.data.data.records || []);
          setServantStats(res.data.data.stats || null);
        }
      } catch (err) {
        console.error('Failed to load servant follow-up history:', err);
      } finally {
        setIsLoadingServants(false);
      }
    };

    fetchServantHistory();
  }, [activeView]);

  // Date jump helpers
  const handleDateShift = (days: number) => {
    const current = new Date(selectedDate);
    current.setDate(current.getDate() + days);
    setSelectedDate(current.toISOString().split('T')[0]);
  };

  const formattedSelectedDate = useMemo(() => {
    try {
      const d = new Date(selectedDate);
      return d.toLocaleDateString('ar-EG', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return selectedDate;
    }
  }, [selectedDate]);

  // Filtered members list based on search
  const filteredMembers = useMemo(() => {
    if (!searchQuery.trim()) return members;
    const q = searchQuery.toLowerCase();
    return members.filter(
      (m) =>
        m.fullName.toLowerCase().includes(q) ||
        (m.educationalGrade && m.educationalGrade.toLowerCase().includes(q))
    );
  }, [members, searchQuery]);

  // Attendance summary metrics
  const metrics = useMemo(() => {
    let present = 0;
    let absent = 0;
    let excused = 0;
    let unset = 0;

    for (const m of members) {
      if (m.status === 'PRESENT') present++;
      else if (m.status === 'ABSENT') absent++;
      else if (m.status === 'EXCUSED') excused++;
      else unset++;
    }

    return { present, absent, excused, unset, total: members.length };
  }, [members]);

  // Update member status locally with tactile feedback
  const handleStatusChange = (memberId: string, newStatus: AttendanceStatus) => {
    setMembers((prev) =>
      prev.map((m) => (m.id === memberId ? { ...m, status: newStatus } : m))
    );
  };

  // Mark all members as present
  const handleMarkAllPresent = () => {
    setMembers((prev) => prev.map((m) => ({ ...m, status: 'PRESENT' })));
  };

  // Batch Save Attendance to API (FR-4.1, NFR-4.2)
  const handleSaveAttendance = async () => {
    setSaveErrorMessage(null);
    setSaveSuccessMessage(null);

    // Filter only members that have a non-unset status
    const recordsToSave = members
      .filter((m) => m.status !== 'UNSET')
      .map((m) => ({
        memberId: m.id,
        status: m.status,
        notes: m.notes || undefined,
      }));

    if (recordsToSave.length === 0) {
      setSaveErrorMessage('يرجى تحديد حالة الحضور لمخدوم واحد على الأقل قبل الحفظ');
      return;
    }

    const idempotencyKey = `batch_${selectedStageId}_${memberSessionType}_${selectedDate}_${Date.now()}`;

    try {
      setIsSaving(true);
      const res = await api.post(
        '/api/v1/attendance/members/batch',
        {
          stageId: selectedStageId,
          sessionType: memberSessionType,
          sessionDate: selectedDate,
          records: recordsToSave,
        },
        {
          headers: {
            'X-Idempotency-Key': idempotencyKey,
          },
        }
      );

      if (res.data?.success) {
        setSaveSuccessMessage(`تم حفظ حضور (${recordsToSave.length}) مخدوم بنجاح!`);
        // Refresh alerts in case absences triggered new alerts
        const alertsRes = await api.get(`/api/v1/attendance/alerts?stageId=${selectedStageId}&status=ACTIVE`);
        if (alertsRes.data?.data) {
          setAlerts(alertsRes.data.data);
        }
        setTimeout(() => setSaveSuccessMessage(null), 4000);
      }
    } catch (err: any) {
      console.error('Error saving batch attendance:', err);
      setSaveErrorMessage(
        err.response?.data?.error?.message || 'حدث خطأ أثناء حفظ الحضور. يرجى إعادة المحاولة.'
      );
    } finally {
      setIsSaving(false);
    }
  };

  // Handle Note Save
  const handleSaveNote = () => {
    if (!noteModalMember) return;
    setMembers((prev) =>
      prev.map((m) =>
        m.id === noteModalMember.id ? { ...m, notes: noteDraft.trim() } : m
      )
    );
    setNoteModalMember(null);
    setNoteDraft('');
  };

  // Handle Resolve Alert
  const handleConfirmResolveAlert = async () => {
    if (!resolveModalAlert) return;

    try {
      setIsResolvingAlert(true);
      await api.patch(`/api/v1/attendance/alerts/${resolveModalAlert.id}/resolve`, {
        resolutionNotes: resolveOutcomeText.trim() || 'تم الافتقاد التليفوني وتأكيد الحضور',
      });

      // Remove from active alerts list
      setAlerts((prev) => prev.filter((a) => a.id !== resolveModalAlert.id));
      setResolveModalAlert(null);
      setResolveOutcomeText('');
    } catch (err) {
      console.error('Failed to resolve alert:', err);
    } finally {
      setIsResolvingAlert(false);
    }
  };

  const allowedServantSessions = useMemo(() => {
    return getAllowedSessionsForRole(user?.role.level || 1);
  }, [user?.role.level]);

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-bg-app text-text-primary pb-28">
        {/* Top Header App Bar */}
        <header className="sticky top-0 z-30 bg-bg-surface/95 backdrop-blur-md border-b border-border-default shadow-sm">
          <div className="max-w-md mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-h2 font-bold text-text-primary">
                  تسجيل الحضور والمتابعة
                </h1>
                <p className="text-caption text-text-secondary mt-0.5">
                  {user?.scopes.stages[0]?.name || 'المرحلة الدراسية'}
                </p>
              </div>

              {/* View Switcher Tabs */}
              <div className="inline-flex p-1 bg-bg-muted rounded-pill border border-border-default text-caption">
                <button
                  type="button"
                  onClick={() => setActiveView('members')}
                  className={cn(
                    'px-3 py-1 rounded-pill font-medium transition-all',
                    activeView === 'members'
                      ? 'bg-brand-primary text-white shadow-sm'
                      : 'text-text-secondary hover:text-text-primary'
                  )}
                >
                  المخدومين
                </button>
                <button
                  type="button"
                  onClick={() => setActiveView('servants')}
                  className={cn(
                    'px-3 py-1 rounded-pill font-medium transition-all',
                    activeView === 'servants'
                      ? 'bg-brand-primary text-white shadow-sm'
                      : 'text-text-secondary hover:text-text-primary'
                  )}
                >
                  جدول الخدام
                </button>
                <button
                  type="button"
                  onClick={() => setActiveView('alerts')}
                  className={cn(
                    'px-3 py-1 rounded-pill font-medium transition-all relative',
                    activeView === 'alerts'
                      ? 'bg-brand-primary text-white shadow-sm'
                      : 'text-text-secondary hover:text-text-primary'
                  )}
                >
                  التنبيهات
                  {alerts.length > 0 && (
                    <span className="mr-1 inline-flex items-center justify-center w-4 h-4 rounded-full bg-status-danger text-white text-[10px] font-bold">
                      {alerts.length}
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* Date Navigator Bar */}
            {activeView === 'members' && (
              <div className="mt-3 flex items-center justify-between bg-bg-muted p-1.5 rounded-card border border-border-default">
                <button
                  type="button"
                  onClick={() => handleDateShift(7)}
                  className="p-1.5 rounded-full hover:bg-bg-surface text-text-secondary hover:text-text-primary transition-colors"
                  title="الجمعة القادمة"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>

                <div className="flex items-center gap-2 text-center">
                  <Calendar className="w-4 h-4 text-brand-primary" />
                  <span className="text-body-small font-bold text-text-primary">
                    {formattedSelectedDate}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => handleDateShift(-7)}
                  className="p-1.5 rounded-full hover:bg-bg-surface text-text-secondary hover:text-text-primary transition-colors"
                  title="الجمعة السابقة"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Main Content Area */}
        <main className="max-w-md mx-auto px-4 pt-3">
          {/* VIEW 1: MEMBER ATTENDANCE (تسجيل حضور المخدومين) */}
          {activeView === 'members' && (
            <div className="space-y-4">
              {/* Session Type Chips */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar select-none">
                <Chip
                  selected={memberSessionType === MemberSessionType.SERVICE_ATTENDANCE}
                  onClick={() => setMemberSessionType(MemberSessionType.SERVICE_ATTENDANCE)}
                >
                  {MEMBER_SESSION_LABELS.SERVICE_ATTENDANCE.ar}
                </Chip>
                <Chip
                  selected={memberSessionType === MemberSessionType.MASS}
                  onClick={() => setMemberSessionType(MemberSessionType.MASS)}
                >
                  {MEMBER_SESSION_LABELS.MASS.ar}
                </Chip>
                <Chip
                  selected={memberSessionType === MemberSessionType.PASTORAL_VISITATION}
                  onClick={() => setMemberSessionType(MemberSessionType.PASTORAL_VISITATION)}
                >
                  {MEMBER_SESSION_LABELS.PASTORAL_VISITATION.ar}
                </Chip>
                <Chip
                  selected={memberSessionType === MemberSessionType.ACTIVITY_CLUB_TRIP_CONF}
                  onClick={() => setMemberSessionType(MemberSessionType.ACTIVITY_CLUB_TRIP_CONF)}
                >
                  {MEMBER_SESSION_LABELS.ACTIVITY_CLUB_TRIP_CONF.ar}
                </Chip>
              </div>

              {/* Consecutive Absence Alert Banner (FR-4.3 & FR-11.1) */}
              {alerts.length > 0 && (
                <div className="bg-status-danger-soft border border-status-danger/30 rounded-card p-3 flex items-start gap-3 shadow-sm animate-pulse-subtle">
                  <AlertTriangle className="w-5 h-5 text-status-danger shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="text-body-small font-bold text-status-danger">
                      تنبيه افتقاد هام ({alerts.length} مخدومين)
                    </h4>
                    <p className="text-caption text-text-primary mt-0.5">
                      يوجد مخدومين متغيبين لأكثر من أسبوعين متتاليين بحاجة للمتابعة العاجلة.
                    </p>
                    <button
                      type="button"
                      onClick={() => setActiveView('alerts')}
                      className="mt-2 text-caption font-bold text-status-danger underline block"
                    >
                      عرض قائمة الافتقاد ومتابعة الحالات &larr;
                    </button>
                  </div>
                </div>
              )}

              {/* Session Summary Stats & Quick "Mark All" Action */}
              <div className="bg-bg-surface rounded-card p-3 border border-border-default shadow-card flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="success">حاضر: {metrics.present}</Badge>
                  <Badge variant="danger">غائب: {metrics.absent}</Badge>
                  <Badge variant="warning">معتذر: {metrics.excused}</Badge>
                </div>

                <button
                  type="button"
                  onClick={handleMarkAllPresent}
                  className="inline-flex items-center gap-1 text-caption font-bold text-brand-primary hover:text-brand-primary-dark transition-colors px-2 py-1 rounded-pill bg-brand-primary-soft hover:bg-brand-primary/20"
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>الكل حاضر</span>
                </button>
              </div>

              {/* Member Search Bar */}
              <div className="relative">
                <Search className="w-4 h-4 text-text-tertiary absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="بحث باسم المخدوم..."
                  className="w-full bg-bg-surface border border-border-default rounded-card py-2 pr-9 pl-4 text-body-small text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary"
                />
              </div>

              {/* Feedback Notifications */}
              {saveSuccessMessage && (
                <div className="p-3 bg-status-success-soft border border-status-success text-status-success rounded-card text-body-small font-medium flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  <span>{saveSuccessMessage}</span>
                </div>
              )}

              {saveErrorMessage && (
                <div className="p-3 bg-status-danger-soft border border-status-danger text-status-danger rounded-card text-body-small font-medium flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  <span>{saveErrorMessage}</span>
                </div>
              )}

              {/* Members Attendance List (Virtualized/Optimized Mobile Layout) */}
              <div className="space-y-2">
                {isLoadingMembers ? (
                  <div className="text-center py-12 text-text-secondary">
                    <div className="inline-block animate-spin w-6 h-6 border-2 border-brand-primary border-t-transparent rounded-full mb-2" />
                    <p className="text-body-small">جارٍ تحميل قائمة المخدومين...</p>
                  </div>
                ) : filteredMembers.length === 0 ? (
                  <div className="text-center py-12 bg-bg-surface rounded-card border border-border-default">
                    <Users className="w-10 h-10 text-text-tertiary mx-auto mb-2 opacity-50" />
                    <p className="text-body font-medium text-text-secondary">لا يوجد مخدومين مسجلين</p>
                  </div>
                ) : (
                  filteredMembers.map((member) => (
                    <div
                      key={member.id}
                      className="bg-bg-surface rounded-card p-3 border border-border-default shadow-card flex flex-col gap-2.5 transition-all hover:border-brand-primary/30"
                    >
                      {/* Member Info Row */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-9 h-9 rounded-full bg-brand-primary-soft text-brand-primary font-bold flex items-center justify-center shrink-0 text-body-small">
                            {member.fullName.charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <h3 className="text-body-small font-bold text-text-primary truncate">
                              {member.fullName}
                            </h3>
                            {member.educationalGrade && (
                              <span className="text-caption text-text-secondary block truncate">
                                {member.educationalGrade}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Note Icon Button */}
                        <button
                          type="button"
                          onClick={() => {
                            setNoteModalMember(member);
                            setNoteDraft(member.notes || '');
                          }}
                          className={cn(
                            'p-2 rounded-full transition-colors relative',
                            member.notes
                              ? 'text-brand-primary bg-brand-primary-soft'
                              : 'text-text-tertiary hover:text-text-primary hover:bg-bg-muted'
                          )}
                          title="إضافة ملاحظة"
                        >
                          <FileText className="w-4 h-4" />
                          {member.notes && (
                            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-brand-primary" />
                          )}
                        </button>
                      </div>

                      {/* Display Note Preview if exists */}
                      {member.notes && (
                        <div className="bg-bg-muted/70 px-2.5 py-1.5 rounded-card text-caption text-text-secondary flex items-start gap-1.5 border border-border-default/50">
                          <span className="font-bold text-text-primary shrink-0">ملاحظة:</span>
                          <span className="truncate">{member.notes}</span>
                        </div>
                      )}

                      {/* 3-State Attendance Toggle */}
                      <div className="flex justify-end pt-1">
                        <AttendanceToggle
                          value={member.status}
                          onChange={(newStatus) => handleStatusChange(member.id, newStatus)}
                          showLabels={true}
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* VIEW 2: SERVANT FOLLOW-UP HISTORY (متابعة الخدام) */}
          {activeView === 'servants' && (
            <div className="space-y-4">
              <FollowUpTable
                servantName={user?.fullName || 'الخادم'}
                roleName={user?.role.name}
                records={servantRecords}
                allowedSessions={allowedServantSessions}
                stats={servantStats}
                isLoading={isLoadingServants}
              />
            </div>
          )}

          {/* VIEW 3: ABSENCE ALERTS & PASTORAL TASKS (تنبيهات الافتقاد) */}
          {activeView === 'alerts' && (
            <div className="space-y-3">
              <div className="p-3 bg-bg-surface rounded-card border border-border-default">
                <h3 className="text-body font-bold text-text-primary">
                  حالات الغياب المتتالي المحتاجة افتقاد
                </h3>
                <p className="text-caption text-text-secondary mt-0.5">
                  يتم رصد الغياب المتكرر تلقائياً (أسبوعين متتاليين) لضمان عدم فقدان أي مخدوم
                </p>
              </div>

              {isLoadingAlerts ? (
                <div className="text-center py-12 text-text-secondary">
                  <div className="inline-block animate-spin w-6 h-6 border-2 border-brand-primary border-t-transparent rounded-full mb-2" />
                  <p className="text-body-small">جارٍ تحميل التنبيهات...</p>
                </div>
              ) : alerts.length === 0 ? (
                <div className="text-center py-12 bg-bg-surface rounded-card border border-border-default">
                  <Sparkles className="w-10 h-10 text-status-success mx-auto mb-2" />
                  <p className="text-body font-bold text-text-primary">ممتاز! لا توجد تنبيهات غياب نشطة</p>
                  <p className="text-caption text-text-secondary mt-1">
                    جميع المخدومين منتظمون في الحضور والمتابعة.
                  </p>
                </div>
              ) : (
                alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className="bg-bg-surface rounded-card p-4 border border-border-default shadow-card space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-full bg-status-danger-soft text-status-danger font-bold flex items-center justify-center text-body-small">
                          {alert.member?.fullName?.charAt(0) || 'م'}
                        </div>
                        <div>
                          <h4 className="text-body-small font-bold text-text-primary">
                            {alert.member?.fullName || 'مخدوم'}
                          </h4>
                          {alert.member?.educationalGrade && (
                            <span className="text-caption text-text-secondary block">
                              {alert.member.educationalGrade}
                            </span>
                          )}
                        </div>
                      </div>

                      <Badge variant="danger" withDot>
                        غائب {alert.consecutiveCount} أسابيع
                      </Badge>
                    </div>

                    {alert.member?.phoneNumber && (
                      <div className="flex items-center gap-2 text-caption text-text-secondary bg-bg-muted p-2 rounded-card">
                        <Phone className="w-3.5 h-3.5 text-brand-primary" />
                        <span>رقم الهاتف:</span>
                        <a
                          href={`tel:${alert.member.phoneNumber}`}
                          className="font-bold text-brand-primary underline"
                        >
                          {alert.member.phoneNumber}
                        </a>
                      </div>
                    )}

                    <Button
                      variant="primary"
                      fullWidth
                      className="h-[38px] text-body-small"
                      onClick={() => {
                        setResolveModalAlert(alert);
                        setResolveOutcomeText('');
                      }}
                    >
                      تسجيل نتيجة الافتقاد وحل التنبيه
                    </Button>
                  </div>
                ))
              )}
            </div>
          )}
        </main>

        {/* Fixed Bottom Save Action Bar for Member Attendance */}
        {activeView === 'members' && (
          <div className="fixed bottom-16 left-0 right-0 z-30 bg-bg-surface/95 backdrop-blur-md border-t border-border-default p-3 shadow-lg">
            <div className="max-w-md mx-auto flex items-center gap-3">
              <Button
                variant="primary"
                fullWidth
                isLoading={isSaving}
                onClick={handleSaveAttendance}
                className="h-[46px] text-body font-bold shadow-md"
              >
                <Save className="w-4 h-4 ml-1.5" />
                <span>حفظ الحضور ({metrics.present + metrics.absent + metrics.excused} مخدوم)</span>
              </Button>
            </div>
          </div>
        )}

        {/* Note Editing Modal */}
        {noteModalMember && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
            <div className="bg-bg-surface w-full max-w-md rounded-t-sheet sm:rounded-card p-4 border border-border-default shadow-card space-y-4">
              <div className="flex items-center justify-between border-b border-border-default pb-3">
                <h3 className="text-body font-bold text-text-primary">
                  ملاحظة على حضور: {noteModalMember.fullName}
                </h3>
                <button
                  type="button"
                  onClick={() => setNoteModalMember(null)}
                  className="p-1 rounded-full hover:bg-bg-muted text-text-secondary"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <textarea
                value={noteDraft}
                onChange={(e) => setNoteDraft(e.target.value)}
                placeholder="اكتب سبب الغياب، أو تفاصيل الزيارة، أو أي ملاحظات سلوكية..."
                rows={4}
                className="w-full bg-bg-muted border border-border-default rounded-card p-3 text-body-small text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-brand-primary"
              />

              <div className="flex items-center gap-2 pt-1">
                <Button variant="primary" fullWidth onClick={handleSaveNote} className="h-[40px]">
                  حفظ الملاحظة
                </Button>
                <Button
                  variant="outline"
                  fullWidth
                  onClick={() => setNoteModalMember(null)}
                  className="h-[40px]"
                >
                  إلغاء
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Resolve Alert Modal */}
        {resolveModalAlert && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
            <div className="bg-bg-surface w-full max-w-md rounded-t-sheet sm:rounded-card p-4 border border-border-default shadow-card space-y-4">
              <div className="flex items-center justify-between border-b border-border-default pb-3">
                <h3 className="text-body font-bold text-text-primary">
                  تسجيل نتيجة افتقاد: {resolveModalAlert.member?.fullName}
                </h3>
                <button
                  type="button"
                  onClick={() => setResolveModalAlert(null)}
                  className="p-1 rounded-full hover:bg-bg-muted text-text-secondary"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-2">
                <label className="text-caption font-semibold text-text-secondary block">
                  نتيجة التواصل والافتقاد:
                </label>
                <textarea
                  value={resolveOutcomeText}
                  onChange={(e) => setResolveOutcomeText(e.target.value)}
                  placeholder="مثال: تم الاتصال بوالد المخدوم واعتذر بسبب ظروف صحية وسيحضر الجمعة القادمة..."
                  rows={4}
                  className="w-full bg-bg-muted border border-border-default rounded-card p-3 text-body-small text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-brand-primary"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <Button
                  variant="primary"
                  fullWidth
                  isLoading={isResolvingAlert}
                  onClick={handleConfirmResolveAlert}
                  className="h-[40px]"
                >
                  تأكيد حل التنبيه
                </Button>
                <Button
                  variant="outline"
                  fullWidth
                  onClick={() => setResolveModalAlert(null)}
                  className="h-[40px]"
                >
                  إلغاء
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Global Bottom Tab Bar */}
        <TabBar activeTab="attendance" />
      </div>
    </ProtectedRoute>
  );
}
