'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ServantEditDrawer } from '@/components/servants/ServantEditDrawer';
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
  Shield,
  CheckCircle2,
  Users,
  ChevronLeft,
  Calendar,
  Sparkles,
} from 'lucide-react';

const normalizeUrl = (url?: string | null, base?: string) => {
  if (!url) return null;
  const u = url.trim();
  if (!u) return null;
  if (/^https?:\/\//i.test(u)) return u;
  return `${base || 'https://'}${u.replace(/^@/, '')}`;
};

export default function ServantProfilePage() {
  const { user } = useAuth();
  const params = useParams();
  const router = useRouter();
  const servantId = params?.id as string;

  const [servant, setServant] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [isEditDrawerOpen, setIsEditDrawerOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const fetchServant = useCallback(async () => {
    if (!servantId) return;
    try {
      setIsLoading(true);
      setErrorMsg(null);
      const res = await api.get(`/api/v1/accounts/${servantId}`);
      if (res.data?.success && (res.data.servant || res.data.data)) {
        setServant(res.data.servant || res.data.data);
      } else {
        setErrorMsg('الخادم غير موجود');
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error?.message || 'تعذر تحميل ملف الخادم');
    } finally {
      setIsLoading(false);
    }
  }, [servantId]);

  useEffect(() => {
    fetchServant();
  }, [fetchServant]);

  if (isLoading) {
    return (
      <ProtectedRoute>
        <div dir="rtl" className="min-h-screen bg-bg-app flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 text-brand-primary animate-spin" />
          <p className="text-body-small text-text-secondary">جاري تحميل ملف الخادم...</p>
        </div>
      </ProtectedRoute>
    );
  }

  if (errorMsg || !servant) {
    return (
      <ProtectedRoute>
        <div dir="rtl" className="min-h-screen bg-bg-app flex flex-col items-center justify-center p-6 text-center">
          <div className="bg-bg-surface border border-border-default rounded-card shadow-card p-6 max-w-sm">
            <AlertCircle className="w-12 h-12 text-status-danger mx-auto mb-2" />
            <h2 className="text-h2 font-bold text-text-primary mb-1">تعذر الوصول</h2>
            <p className="text-body-small text-text-secondary mb-4">{errorMsg || 'الخادم غير موجود'}</p>
            <Button variant="primary" fullWidth onClick={() => router.push('/members?tab=servants')}>
              العودة لقائمة الخدام
            </Button>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  const level = user?.role?.level || 1;
  const isSupervisor = level >= 3 || user?.role?.code === 'GENERAL_SECRETARY';
  const isSelf = user?.id === servant.id;
  const canEdit = isSupervisor || isSelf;

  const rawPhone = (servant.whatsappPhone || servant.whatsappPhoneRaw || servant.phoneNumber || '').replace(/\D/g, '');
  const waPhone = rawPhone.startsWith('01') ? '2' + rawPhone : rawPhone;

  const birthDate = servant.dateOfBirth ? new Date(servant.dateOfBirth) : null;
  const ageYears = birthDate && !isNaN(birthDate.getTime())
    ? Math.floor((Date.now() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000))
    : null;

  const attendanceRate = servant.stats?.attendanceRatePercentage ?? null;
  const assignedMembersCount = servant.assignedMembersCount ?? (servant.assignedMembers ? servant.assignedMembers.length : 0);

  const socialButtons = [
    {
      id: 'call',
      label: 'اتصال',
      href: servant.phoneNumber ? `tel:${servant.phoneNumber}` : null,
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
      href: normalizeUrl(servant.facebookUrl, 'https://facebook.com/'),
      icon: Facebook,
      cls: 'bg-status-info-soft text-status-info',
    },
    {
      id: 'instagram',
      label: 'إنستجرام',
      href: normalizeUrl(servant.instagramUrl, 'https://instagram.com/'),
      icon: Instagram,
      cls: 'bg-brand-accent-soft text-brand-accent',
    },
  ];

  const initials = servant.fullName
    ? servant.fullName.trim().split(/\s+/).slice(0, 2).map((w: string) => w.charAt(0)).join('')
    : 'خ';

  return (
    <ProtectedRoute>
      <div dir="rtl" className="min-h-screen bg-bg-app flex flex-col items-center pb-24">
        <div className="w-full max-w-[480px] flex flex-col">
          {/* App bar */}
          <header className="sticky top-0 z-30 bg-brand-primary text-white shadow-card h-14 px-3 flex items-center gap-2">
            <button
              type="button"
              onClick={() => router.push('/members?tab=servants')}
              aria-label="الرجوع"
              className="w-9 h-9 rounded-button flex items-center justify-center hover:bg-white/10"
            >
              <ArrowRight className="w-5 h-5" />
            </button>
            <h1 className="flex-1 text-h2 font-bold">ملف الخادم</h1>
            {canEdit && (
              <button
                id="servant-edit"
                type="button"
                onClick={() => setIsEditDrawerOpen(true)}
                className="h-9 px-3 rounded-button bg-white/15 hover:bg-white/25 text-caption font-semibold flex items-center gap-1.5 transition-colors"
              >
                <Edit3 className="w-4 h-4" />
                تعديل
              </button>
            )}
          </header>

          <main className="px-4 py-4 flex flex-col gap-4">
            {/* Identity Card */}
            <section className="bg-bg-surface border border-border-default rounded-card p-5 shadow-card flex flex-col items-center text-center">
              <div className="w-20 h-20 rounded-full bg-brand-primary-soft text-brand-primary font-bold text-2xl flex items-center justify-center border-2 border-brand-accent/40 mb-3">
                {initials}
              </div>
              <h2 className="text-h1 font-bold text-brand-primary">{servant.fullName}</h2>
              <p className="text-body-small text-text-secondary mt-0.5">
                {ageYears ? `${ageYears} سنة • ` : ''}
                {servant.role?.name || 'خادم'}
                {servant.currentStage?.name ? ` • ${servant.currentStage.name}` : ''}
              </p>

              <div className="mt-3 flex items-center justify-center gap-2 flex-wrap">
                {servant.status === 'SUSPENDED' ? (
                  <Badge variant="neutral">موقوف عن الخدمة</Badge>
                ) : servant.status === 'TRANSFERRED' ? (
                  <Badge variant="warning">منقول</Badge>
                ) : (
                  <Badge variant="success" withDot>نشط في الخدمة</Badge>
                )}
                {servant.isDeacon && (
                  <Badge variant="primary">
                    شماس{servant.deaconRank ? ` (${servant.deaconRank})` : ''}
                  </Badge>
                )}
                {servant.currentSector?.name && (
                  <Badge variant="neutral">قطاع {servant.currentSector.name}</Badge>
                )}
              </div>

              {/* 4 Social/Action Buttons */}
              <div className="grid grid-cols-4 gap-2 mt-4 pt-4 border-t border-border-default w-full">
                {socialButtons.map((b) => {
                  const Icon = b.icon;
                  const enabled = Boolean(b.href);
                  return enabled ? (
                    <a
                      key={b.id}
                      id={`servant-${b.id}`}
                      href={b.href!}
                      target={b.id === 'call' ? undefined : '_blank'}
                      rel="noopener noreferrer"
                      className={cn(
                        'flex flex-col items-center gap-1 py-2.5 rounded-button text-caption font-semibold transition-opacity hover:opacity-80',
                        b.cls
                      )}
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

            {/* Stats Cards */}
            <section className="grid grid-cols-2 gap-3">
              <div className="bg-bg-surface border border-border-default rounded-card p-4 shadow-card text-right">
                <span className="text-caption text-text-secondary">نسبة الحضور (8 أسابيع)</span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span
                    className={cn(
                      'text-2xl font-bold',
                      (attendanceRate ?? 100) >= 70 ? 'text-status-success' : 'text-status-danger'
                    )}
                  >
                    {attendanceRate ?? '100'}%
                  </span>
                </div>
                <span className="text-caption text-text-secondary">القداس والخدمة</span>
              </div>

              <div className="bg-bg-surface border border-border-default rounded-card p-4 shadow-card text-right flex flex-col justify-between">
                <div>
                  <span className="text-caption text-text-secondary">المخدومين المسندين</span>
                  <div className="flex items-baseline gap-1.5 mt-1">
                    <span className="text-2xl font-bold text-brand-primary">{assignedMembersCount}</span>
                    <span className="text-caption text-text-secondary">مخدوم</span>
                  </div>
                </div>
                <span className="text-caption text-text-secondary">تحت رعايته المباشرة</span>
              </div>
            </section>

            {/* Supervisory Evaluation Section */}
            <section className="bg-bg-surface border border-border-default rounded-card p-5 shadow-card text-right flex flex-col gap-3">
              <div className="flex items-center gap-2 pb-2.5 border-b border-border-default">
                <Shield className="w-5 h-5 text-brand-accent" />
                <h3 className="text-h2 font-semibold text-text-primary">تقييم الخادم</h3>
              </div>
              {[
                [
                  'الحالة المادية',
                  servant.evaluation?.financialStatus,
                  'لم يتم تسجيل الحالة المادية بعد',
                ],
                [
                  'السلوك مع المخدومين',
                  servant.evaluation?.behaviorWithMembers,
                  'لا توجد ملاحظات حول السلوك مع المخدومين',
                ],
                [
                  'السلوك مع الزملاء الخدام',
                  servant.evaluation?.behaviorWithServants,
                  'لا توجد ملاحظات حول السلوك مع الزملاء الخدام',
                ],
                [
                  'التعاون والعمل الجماعي',
                  servant.evaluation?.cooperation,
                  'لا توجد ملاحظات حول التعاون',
                ],
                [
                  'العمل الفردي والمبادرة',
                  servant.evaluation?.individualInitiative,
                  'لا توجد ملاحظات حول المبادرة',
                ],
                [
                  'ملاحظات إضافية',
                  servant.evaluation?.notes,
                  'لا توجد ملاحظات إضافية',
                ],
              ].map(([label, value, empty]) => (
                <div key={label as string}>
                  <span className="text-caption text-text-secondary block font-semibold mb-0.5">
                    {label}:
                  </span>
                  <p className="text-body-small text-text-primary bg-bg-muted/40 p-2.5 rounded-lg border border-border-default leading-relaxed">
                    {(value as string) || (empty as string)}
                  </p>
                </div>
              ))}
            </section>

            {/* Personal and Ministry Details */}
            <section className="bg-bg-surface border border-border-default rounded-card p-5 shadow-card text-right flex flex-col gap-3">
              <h3 className="text-h2 font-semibold text-text-primary pb-2.5 border-b border-border-default">
                البيانات الشخصية والخدمية
              </h3>
              <div className="grid grid-cols-2 gap-3 text-body-small">
                {[
                  [
                    'تاريخ الميلاد',
                    birthDate && !isNaN(birthDate.getTime())
                      ? birthDate.toLocaleDateString('ar-EG')
                      : '—',
                  ],
                  ['العنوان', servant.address],
                  ['أب الاعتراف', servant.fatherConfessor],
                  ['رقم الهاتف', servant.phoneNumber],
                  ['البريد الإلكتروني', servant.email],
                  ['الحالة الاجتماعية', servant.maritalStatus || 'أعزب'],
                  [
                    'اسم الزوج/ة',
                    servant.maritalStatus === 'متزوج' ? servant.spouseName : null,
                  ],
                  ['المؤهل / الوظيفة', servant.educationOrCareer || servant.jobTitle],
                  ['رتبة الشماسية', servant.isDeacon ? servant.deaconRank : null],
                  ['اسم الرسامة', servant.isDeacon ? servant.deaconName : null],
                ]
                  .filter(([_, value]) => value !== null && value !== undefined)
                  .map(([label, value]) => (
                    <div key={label as string}>
                      <span className="text-caption text-text-secondary block">{label}:</span>
                      <span className="font-medium text-text-primary">{(value as string) || '—'}</span>
                    </div>
                  ))}
              </div>
            </section>

            {/* Assigned Members Section */}
            {servant.assignedMembers && servant.assignedMembers.length > 0 && (
              <section className="bg-bg-surface border border-border-default rounded-card p-5 shadow-card text-right flex flex-col gap-3">
                <div className="flex items-center justify-between pb-2.5 border-b border-border-default">
                  <div className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-brand-primary" />
                    <h3 className="text-h2 font-semibold text-text-primary">المخدومين تحت رعايته</h3>
                  </div>
                  <Badge variant="primary">{servant.assignedMembers.length}</Badge>
                </div>
                <div className="flex flex-col gap-2">
                  {servant.assignedMembers.map((m: any) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => router.push(`/members/${m.id}`)}
                      className="flex items-center justify-between p-3 rounded-button bg-bg-muted/40 hover:bg-bg-muted border border-border-default text-right transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-brand-primary-soft text-brand-primary font-bold flex items-center justify-center text-caption shrink-0">
                          {m.fullName.trim().split(/\s+/).slice(0, 2).map((w: string) => w.charAt(0)).join('')}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-body-small font-bold text-text-primary">{m.fullName}</span>
                          <span className="text-caption text-text-secondary">
                            {m.educationalGrade || m.stage?.name || 'مخدوم'}
                            {m.phoneNumber ? ` • ${m.phoneNumber}` : ''}
                          </span>
                        </div>
                      </div>
                      <ChevronLeft className="w-4 h-4 text-text-secondary shrink-0" />
                    </button>
                  ))}
                </div>
              </section>
            )}
          </main>
        </div>

        {/* Edit Drawer */}
        <ServantEditDrawer
          isOpen={isEditDrawerOpen}
          onClose={() => setIsEditDrawerOpen(false)}
          servant={servant}
          onSuccess={(updated) => {
            setServant((prev: any) => ({ ...prev, ...updated }));
            setToast('تم تحديث بيانات الخادم بنجاح');
            setTimeout(() => setToast(null), 3500);
          }}
        />

        {toast && (
          <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-button bg-status-success text-white text-body-small shadow-elevated flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" /> {toast}
          </div>
        )}

        <TabBar activeTab="members" />
      </div>
    </ProtectedRoute>
  );
}
