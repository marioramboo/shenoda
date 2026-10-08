'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { MemberEditDrawer } from '@/components/members/MemberEditDrawer';
import { TabBar } from '@/components/layout/TabBar';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import {
  ArrowRight,
  Phone,
  MessageCircle,
  Facebook,
  Instagram,
  Edit3,
  Loader2,
  AlertCircle,
  AlertTriangle,
  HeartHandshake,
  Shield,
  X,
  CheckCircle2,
  UserCheck,
} from 'lucide-react';

const todayLocal = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const normalizeUrl = (url?: string | null, base?: string) => {
  if (!url) return null;
  const u = url.trim();
  if (!u) return null;
  if (/^https?:\/\//i.test(u)) return u;
  return `${base || 'https://'}${u.replace(/^@/, '')}`;
};

export default function MemberProfilePage() {
  const { user } = useAuth();
  const params = useParams();
  const router = useRouter();
  const memberId = params?.id as string;

  const [member, setMember] = useState<any | null>(null);
  const [isAssigned, setIsAssigned] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [attendanceRate, setAttendanceRate] = useState<number | null>(null);
  const [visitCount, setVisitCount] = useState<number>(0);
  const [needsFollowUp, setNeedsFollowUp] = useState(false);

  const [isEditDrawerOpen, setIsEditDrawerOpen] = useState(false);

  // Servant assignment modal
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [stageServants, setStageServants] = useState<any[]>([]);
  const [selectedServantId, setSelectedServantId] = useState<string>('');
  const [loadingServants, setLoadingServants] = useState(false);
  const [assignSaving, setAssignSaving] = useState(false);
  const [assignError, setAssignError] = useState<string | null>(null);

  // Visitation modal
  const [isVisitOpen, setIsVisitOpen] = useState(false);
  const [visitNotes, setVisitNotes] = useState('');
  const [visitDate, setVisitDate] = useState(todayLocal());
  const [visitSaving, setVisitSaving] = useState(false);
  const [visitError, setVisitError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const fetchExtras = useCallback(async (stageId: string) => {
    try {
      const stats = await api.get(`/api/v1/attendance/members/${memberId}/stats`);
      setAttendanceRate(stats.data?.data?.week8?.attendanceRatePercentage ?? null);
    } catch {
      setAttendanceRate(null);
    }
    try {
      const visits = await api.get('/api/v1/attendance/members', {
        params: { memberId, sessionType: 'PASTORAL_VISITATION', stageId },
      });
      setVisitCount((visits.data?.data || []).filter((r: any) => r.status === 'PRESENT').length);
    } catch {
      setVisitCount(0);
    }
    try {
      const alerts = await api.get('/api/v1/attendance/alerts', {
        params: { stageId, status: 'ACTIVE' },
      });
      setNeedsFollowUp(
        (alerts.data?.data || []).some((a: any) => (a.memberId || a.member?.id) === memberId)
      );
    } catch {
      setNeedsFollowUp(false);
    }
  }, [memberId]);

  const fetchMember = useCallback(async () => {
    if (!memberId) return;
    try {
      setIsLoading(true);
      setErrorMsg(null);
      const res = await api.get(`/api/v1/members/${memberId}`);
      if (res.data?.success) {
        setMember(res.data.member);
        setIsAssigned(res.data.isAssigned);
        fetchExtras(res.data.member.stageId);
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error?.message || 'تعذر تحميل ملف المخدوم');
    } finally {
      setIsLoading(false);
    }
  }, [memberId, fetchExtras]);

  useEffect(() => {
    fetchMember();
  }, [fetchMember]);

  const saveVisit = async () => {
    setVisitError(null);
    try {
      setVisitSaving(true);
      await api.post('/api/v1/attendance/members/batch', {
        stageId: member.stageId,
        sessionType: 'PASTORAL_VISITATION',
        sessionDate: visitDate,
        records: [{ memberId, status: 'PRESENT', notes: visitNotes.trim() || undefined }],
      });
      setIsVisitOpen(false);
      setVisitNotes('');
      setToast('تم تسجيل الافتقاد بنجاح');
      setTimeout(() => setToast(null), 3000);
      fetchExtras(member.stageId);
    } catch (err: any) {
      setVisitError(err.response?.data?.error?.message || 'تعذر حفظ الافتقاد');
    } finally {
      setVisitSaving(false);
    }
  };

  const openAssignModal = async () => {
    setIsAssignModalOpen(true);
    setAssignError(null);
    const currentId =
      member?.servantAssignments?.[0]?.servantUserId ||
      member?.servantAssignments?.[0]?.servant?.id ||
      '';
    setSelectedServantId(currentId);
    const targetStageId = member?.stageId || member?.stage?.id;
    if (targetStageId) {
      try {
        setLoadingServants(true);
        const res = await api.get(`/api/v1/attendance/servants/list?stageId=${targetStageId}`);
        const servantsList = Array.isArray(res.data?.servants)
          ? res.data.servants
          : Array.isArray(res.data?.data)
          ? res.data.data
          : [];
        setStageServants(servantsList);
      } catch {
        setAssignError('تعذر تحميل قائمة خدام المرحلة');
      } finally {
        setLoadingServants(false);
      }
    }
  };

  const saveAssignment = async () => {
    setAssignError(null);
    try {
      setAssignSaving(true);
      const res = await api.post(`/api/v1/members/${memberId}/assign-servant`, {
        servantUserId: selectedServantId || null,
      });
      if (res.data?.success) {
        if (res.data.member) {
          setMember(res.data.member);
          const userAssigned = res.data.member.servantAssignments?.some(
            (a: any) => a.servantUserId === user?.id
          );
          setIsAssigned(Boolean(userAssigned));
        } else {
          await fetchMember();
        }
        setIsAssignModalOpen(false);
        setToast(selectedServantId ? 'تم إسناد المخدوم للخادم بنجاح' : 'تم إلغاء إسناد المخدوم');
        setTimeout(() => setToast(null), 3000);
      }
    } catch (err: any) {
      setAssignError(err.response?.data?.error?.message || 'تعذر حفظ إسناد الخادم');
    } finally {
      setAssignSaving(false);
    }
  };

  const selfAssign = async () => {
    if (!user?.id) return;
    setAssignError(null);
    try {
      setAssignSaving(true);
      const res = await api.post(`/api/v1/members/${memberId}/assign-servant`, {
        servantUserId: user.id,
      });
      if (res.data?.success) {
        if (res.data.member) {
          setMember(res.data.member);
          setIsAssigned(true);
        } else {
          await fetchMember();
        }
        setIsAssignModalOpen(false);
        setToast('تم استلام رعاية المخدوم بنجاح');
        setTimeout(() => setToast(null), 3000);
      }
    } catch (err: any) {
      setAssignError(err.response?.data?.error?.message || 'تعذر استلام رعاية المخدوم');
    } finally {
      setAssignSaving(false);
    }
  };

  if (isLoading) {
    return (
      <ProtectedRoute>
        <div dir="rtl" className="min-h-screen bg-bg-app flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 text-brand-primary animate-spin" />
          <p className="text-body-small text-text-secondary">جاري تحميل ملف المخدوم...</p>
        </div>
      </ProtectedRoute>
    );
  }

  if (errorMsg || !member) {
    return (
      <ProtectedRoute>
        <div dir="rtl" className="min-h-screen bg-bg-app flex flex-col items-center justify-center p-6 text-center">
          <div className="bg-bg-surface border border-border-default rounded-card shadow-card p-6 max-w-sm">
            <AlertCircle className="w-12 h-12 text-status-danger mx-auto mb-2" />
            <h2 className="text-h2 font-bold text-text-primary mb-1">تعذر الوصول</h2>
            <p className="text-body-small text-text-secondary mb-4">{errorMsg || 'المخدوم غير موجود'}</p>
            <Button variant="primary" fullWidth onClick={() => router.push('/members')}>
              العودة لقائمة المخدومين
            </Button>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  const birthDate = new Date(member.dateOfBirth);
  const ageYears = Math.floor((Date.now() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000));

  const rawPhone = member.phoneNumber?.replace(/\D/g, '') || '';
  const waPhone = rawPhone.startsWith('01') ? '2' + rawPhone : rawPhone;
  const assignedServant = member.servantAssignments?.[0]?.servant;

  const level = user?.role.level || 1;
  const canEdit = level >= 2 || (level === 1 && isAssigned);
  const canVisit = level >= 2 || isAssigned;
  const canAssign = level >= 2 || (level === 1 && !assignedServant);

  const socialButtons = [
    {
      id: 'call',
      label: 'اتصال',
      href: member.phoneNumber ? `tel:${member.phoneNumber}` : null,
      icon: Phone,
      cls: 'bg-brand-primary-soft text-brand-primary',
    },
    {
      id: 'whatsapp',
      label: 'واتساب',
      href: waPhone ? `https://wa.me/${waPhone}` : null,
      icon: MessageCircle,
      cls: 'bg-status-success-soft text-status-success',
    },
    {
      id: 'facebook',
      label: 'فيسبوك',
      href: normalizeUrl(member.facebookUrl, 'https://facebook.com/'),
      icon: Facebook,
      cls: 'bg-status-info-soft text-status-info',
    },
    {
      id: 'instagram',
      label: 'إنستجرام',
      href: normalizeUrl(member.instagramUrl, 'https://instagram.com/'),
      icon: Instagram,
      cls: 'bg-brand-accent-soft text-brand-accent',
    },
  ];

  return (
    <ProtectedRoute>
      <div dir="rtl" className="min-h-screen bg-bg-app flex flex-col items-center pb-24">
        <div className="w-full max-w-[480px] flex flex-col">
          {/* App bar */}
          <header className="sticky top-0 z-30 bg-brand-primary text-white shadow-card h-14 px-3 flex items-center gap-2">
            <button
              type="button"
              onClick={() => router.push('/members')}
              aria-label="الرجوع"
              className="w-9 h-9 rounded-button flex items-center justify-center hover:bg-white/10"
            >
              <ArrowRight className="w-5 h-5" />
            </button>
            <h1 className="flex-1 text-h2 font-bold">ملف المخدوم</h1>
            {canEdit && (
              <button
                id="member-edit"
                type="button"
                onClick={() => setIsEditDrawerOpen(true)}
                className="h-9 px-3 rounded-button bg-white/15 hover:bg-white/25 text-caption font-semibold flex items-center gap-1.5 transition-colors"
              >
                <Edit3 className="w-4 h-4" />
                {level === 1 ? 'تعديل التقييم' : 'تعديل'}
              </button>
            )}
          </header>

          <main className="px-4 py-4 flex flex-col gap-4">
            {/* Identity */}
            <section className="bg-bg-surface border border-border-default rounded-card p-5 shadow-card flex flex-col items-center text-center">
              <div className="w-20 h-20 rounded-full bg-brand-primary-soft text-brand-primary font-bold text-2xl flex items-center justify-center border-2 border-brand-accent/40 mb-3">
                {member.fullName.trim().split(/\s+/).slice(0, 2).map((w: string) => w.charAt(0)).join('') || 'م'}
              </div>
              <h2 className="text-h1 font-bold text-brand-primary">{member.fullName}</h2>
              <p className="text-body-small text-text-secondary mt-0.5">
                {ageYears} سنة • {member.stage?.name}
                {member.educationalGrade ? ` • ${member.educationalGrade}` : ''}
              </p>
              <div className="mt-3 flex flex-col items-center gap-2">
                <div className="flex items-center justify-center gap-2 flex-wrap">
                  {assignedServant ? (
                    <Badge variant="primary" withDot>الخادم المسئول: {assignedServant.fullName}</Badge>
                  ) : (
                    <Badge variant="neutral">غير مسند لخادم بعد</Badge>
                  )}
                  {canAssign && (
                    <button
                      id="assign-servant-btn"
                      type="button"
                      onClick={openAssignModal}
                      className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-caption font-bold bg-brand-primary-soft text-brand-primary hover:bg-brand-primary hover:text-white transition-all shadow-xs cursor-pointer"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>{assignedServant ? 'تغيير الخادم' : 'إسناد لخادم'}</span>
                    </button>
                  )}
                </div>
                {level === 1 && !assignedServant && (
                  <button
                    type="button"
                    onClick={selfAssign}
                    className="text-caption text-brand-accent hover:underline font-semibold"
                  >
                    استلام رعاية المخدوم (إسناد لنفسي)
                  </button>
                )}
              </div>

              <div className="grid grid-cols-4 gap-2 mt-4 pt-4 border-t border-border-default w-full">
                {socialButtons.map((b) => {
                  const Icon = b.icon;
                  const enabled = Boolean(b.href);
                  return enabled ? (
                    <a
                      key={b.id}
                      id={`member-${b.id}`}
                      href={b.href!}
                      target={b.id === 'call' ? undefined : '_blank'}
                      rel="noopener noreferrer"
                      className={cn('flex flex-col items-center gap-1 py-2.5 rounded-button text-caption font-semibold transition-opacity hover:opacity-80', b.cls)}
                    >
                      <Icon className="w-5 h-5" />
                      {b.label}
                    </a>
                  ) : (
                    <div
                      key={b.id}
                      className="flex flex-col items-center gap-1 py-2.5 rounded-button text-caption font-semibold bg-bg-muted text-text-disabled"
                    >
                      <Icon className="w-5 h-5" />
                      {b.label}
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Stats + visitation */}
            <section className="grid grid-cols-2 gap-3">
              <div className="bg-bg-surface border border-border-default rounded-card p-4 shadow-card text-right">
                <span className="text-caption text-text-secondary">نسبة الحضور (8 أسابيع)</span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className={cn('text-2xl font-bold', (attendanceRate ?? 100) >= 70 ? 'text-status-success' : 'text-status-danger')}>
                    {attendanceRate ?? '—'}{attendanceRate !== null && '%'}
                  </span>
                </div>
                <span className="text-caption text-text-secondary">القداس والخدمة</span>
              </div>

              <div className="bg-bg-surface border border-border-default rounded-card p-4 shadow-card text-right flex flex-col justify-between gap-2">
                <div>
                  <span className="text-caption text-text-secondary">سجل الافتقاد</span>
                  <div className="flex items-baseline gap-1.5 mt-1">
                    <span className="text-2xl font-bold text-brand-primary">{visitCount}</span>
                    <span className="text-caption text-text-secondary">افتقاد</span>
                  </div>
                </div>
                {canVisit && (
                  <Button
                    id="member-log-visit"
                    variant={needsFollowUp ? 'primary' : 'secondary'}
                    size="sm"
                    onClick={() => setIsVisitOpen(true)}
                    className="gap-1.5"
                  >
                    <HeartHandshake className="w-4 h-4" />
                    عمل افتقاد
                  </Button>
                )}
              </div>
            </section>

            {needsFollowUp && (
              <div className="flex items-center gap-2 px-4 py-3 rounded-card bg-status-danger-soft border border-[#F5C2BE] text-status-danger text-body-small font-semibold">
                <AlertTriangle className="w-5 h-5 shrink-0" />
                يحتاج افتقاد: غياب متكرر لعدة أسابيع متتالية
              </div>
            )}

            {/* Servant evaluation */}
            <section className="bg-bg-surface border border-border-default rounded-card p-5 shadow-card text-right flex flex-col gap-3">
              <div className="flex items-center gap-2 pb-2.5 border-b border-border-default">
                <Shield className="w-5 h-5 text-brand-accent" />
                <h3 className="text-h2 font-semibold text-text-primary">تقييم الخادم</h3>
              </div>
              {[
                ['الحالة المادية', member.financialStatus, 'لم يتم تسجيل الحالة المادية بعد'],
                ['سلوكه في الخدمة', member.behaviorInService, 'لا توجد ملاحظات حول السلوك في الخدمة'],
                ['اندماجه مع زملائه', member.peerIntegration, 'لا توجد ملاحظات حول الاندماج'],
              ].map(([label, value, empty]) => (
                <div key={label as string}>
                  <span className="text-caption text-text-secondary block font-semibold mb-0.5">{label}:</span>
                  <p className="text-body-small text-text-primary bg-bg-muted/40 p-2.5 rounded-lg border border-border-default leading-relaxed">
                    {(value as string) || (empty as string)}
                  </p>
                </div>
              ))}
            </section>

            {/* Personal data */}
            <section className="bg-bg-surface border border-border-default rounded-card p-5 shadow-card text-right flex flex-col gap-3">
              <h3 className="text-h2 font-semibold text-text-primary pb-2.5 border-b border-border-default">
                البيانات الشخصية
              </h3>
              <div className="grid grid-cols-2 gap-3 text-body-small">
                {[
                  ['تاريخ الميلاد', birthDate.toLocaleDateString('ar-EG')],
                  ['العنوان', member.address],
                  ['اسم الأب', member.fatherName],
                  ['اسم الأم', member.motherName],
                  ['المدرسة / الكلية', member.schoolOrUniversity],
                  ['أب الاعتراف', member.fatherConfessor],
                  ['رقم الهاتف', member.phoneNumber],
                ].map(([label, value]) => (
                  <div key={label as string}>
                    <span className="text-caption text-text-secondary block">{label}:</span>
                    <span className="font-medium text-text-primary">{(value as string) || '—'}</span>
                  </div>
                ))}
              </div>
            </section>
          </main>
        </div>

        {/* Visitation modal */}
        {isVisitOpen && (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-end sm:items-center justify-center p-4">
            <div dir="rtl" className="w-full max-w-[440px] bg-bg-surface rounded-card shadow-elevated p-5 text-right relative">
              <button
                type="button"
                onClick={() => setIsVisitOpen(false)}
                aria-label="إغلاق"
                className="absolute top-4 left-4 text-text-secondary hover:text-text-primary p-1"
              >
                <X className="w-5 h-5" />
              </button>
              <h3 className="text-h2 font-bold text-brand-primary mb-1">تسجيل افتقاد</h3>
              <p className="text-caption text-text-secondary mb-4">{member.fullName}</p>

              {visitError && (
                <div className="mb-3 p-3 bg-status-danger-soft border border-[#F5C2BE] rounded-lg text-caption text-status-danger">
                  {visitError}
                </div>
              )}

              <label className="text-body-small font-medium text-text-primary block mb-1">تاريخ الافتقاد</label>
              <input
                type="date"
                value={visitDate}
                onChange={(e) => setVisitDate(e.target.value)}
                className="w-full h-[46px] rounded-input border border-border-default px-3 mb-3 bg-bg-surface text-body-default focus:outline-none focus:ring-2 focus:ring-brand-primary"
              />
              <label className="text-body-small font-medium text-text-primary block mb-1">ملاحظات الافتقاد</label>
              <textarea
                rows={4}
                value={visitNotes}
                onChange={(e) => setVisitNotes(e.target.value)}
                placeholder="مثال: تم الاتصال وزيارة البيت، الأسرة بخير..."
                className="w-full rounded-input border border-border-default p-3 bg-bg-surface text-body-default focus:outline-none focus:ring-2 focus:ring-brand-primary resize-none"
              />
              <Button variant="primary" fullWidth isLoading={visitSaving} onClick={saveVisit} className="mt-4 h-[46px]">
                حفظ الافتقاد
              </Button>
            </div>
          </div>
        )}

        {/* Servant Assignment Modal */}
        {isAssignModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-end sm:items-center justify-center p-4">
            <div dir="rtl" className="w-full max-w-[440px] bg-bg-surface rounded-card shadow-elevated p-5 text-right relative">
              <button
                type="button"
                onClick={() => setIsAssignModalOpen(false)}
                aria-label="إغلاق"
                className="absolute top-4 left-4 text-text-secondary hover:text-text-primary p-1"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-8 h-8 rounded-full bg-brand-primary-soft text-brand-primary flex items-center justify-center">
                  <UserCheck className="w-4 h-4" />
                </div>
                <h3 className="text-h2 font-bold text-brand-primary">إسناد الخادم المسئول</h3>
              </div>
              <p className="text-caption text-text-secondary mb-4">
                المخدوم: <strong className="text-text-primary">{member.fullName}</strong> ({member.stage?.name})
              </p>

              {assignError && (
                <div className="mb-3 p-3 bg-status-danger-soft border border-[#F5C2BE] rounded-lg text-caption text-status-danger">
                  {assignError}
                </div>
              )}

              {loadingServants ? (
                <div className="py-8 flex flex-col items-center justify-center gap-2 text-text-secondary">
                  <Loader2 className="w-6 h-6 animate-spin text-brand-primary" />
                  <span className="text-caption">جاري تحميل خدام المرحلة...</span>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  <label className="text-body-small font-medium text-text-primary block">
                    اختر الخادم من مرحلة ({member.stage?.name || 'الخدمة'}):
                  </label>

                  {stageServants.length === 0 ? (
                    <div className="p-4 bg-bg-muted rounded-lg text-caption text-text-secondary text-center">
                      لا يوجد خدام مسجلين في هذه المرحلة حالياً
                    </div>
                  ) : (
                    <div className="max-h-60 overflow-y-auto flex flex-col gap-2 border border-border-default rounded-input p-2 bg-bg-muted/30">
                      {stageServants.map((s) => {
                        const isSelected = selectedServantId === s.id;
                        return (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => setSelectedServantId(s.id)}
                            className={cn(
                              'flex items-center justify-between p-3 rounded-button text-right transition-colors border',
                              isSelected
                                ? 'bg-brand-primary-soft border-brand-primary text-brand-primary font-bold shadow-xs'
                                : 'bg-bg-surface border-border-default hover:bg-bg-muted text-text-primary'
                            )}
                          >
                            <div className="flex items-center gap-2.5">
                              <div
                                className={cn(
                                  'w-8 h-8 rounded-full flex items-center justify-center text-caption font-bold shrink-0',
                                  isSelected ? 'bg-brand-primary text-white' : 'bg-bg-muted text-text-secondary'
                                )}
                              >
                                {s.fullName.trim().split(/\s+/).slice(0, 2).map((w: string) => w.charAt(0)).join('')}
                              </div>
                              <div className="flex flex-col">
                                <span className="text-body-small font-bold">{s.fullName}</span>
                                <span className="text-caption text-text-secondary">
                                  {s.role?.name || 'خادم'}{s.phoneNumber ? ` • ${s.phoneNumber}` : ''}
                                </span>
                              </div>
                            </div>
                            {isSelected && <CheckCircle2 className="w-5 h-5 text-brand-primary shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {assignedServant && (
                    <button
                      type="button"
                      onClick={() => setSelectedServantId('')}
                      className={cn(
                        'text-caption py-2 rounded-button border text-center transition-colors',
                        selectedServantId === ''
                          ? 'border-status-danger bg-status-danger-soft text-status-danger font-bold'
                          : 'border-border-default text-text-secondary hover:bg-bg-muted'
                      )}
                    >
                      إلغاء الإسناد (جعله غير مسند لأي خادم)
                    </button>
                  )}

                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border-default">
                    <Button
                      variant="primary"
                      fullWidth
                      isLoading={assignSaving}
                      onClick={saveAssignment}
                      disabled={stageServants.length === 0 && !assignedServant}
                      className="h-[46px]"
                    >
                      حفظ الإسناد
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setIsAssignModalOpen(false)}
                      className="h-[46px]"
                    >
                      إلغاء
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {toast && (
          <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-button bg-status-success text-white text-body-small shadow-elevated flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" /> {toast}
          </div>
        )}

        <MemberEditDrawer
          isOpen={isEditDrawerOpen}
          onClose={() => setIsEditDrawerOpen(false)}
          member={member}
          onSuccess={(updated) => setMember((prev: any) => ({ ...prev, ...updated }))}
        />

        <TabBar activeTab="members" />
      </div>
    </ProtectedRoute>
  );
}
