'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { MemberEditDrawer } from '@/components/members/MemberEditDrawer';
import { api } from '@/lib/api';
import {
  ArrowRight,
  Phone,
  MessageCircle,
  MapPin,
  Calendar,
  School,
  GraduationCap,
  Heart,
  Users,
  Shield,
  Edit3,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

export default function MemberProfilePage() {
  const { user } = useAuth();
  const params = useParams();
  const router = useRouter();
  const memberId = params?.id as string;

  const [member, setMember] = useState<any | null>(null);
  const [accessLevel, setAccessLevel] = useState<string>('NONE');
  const [isAssigned, setIsAssigned] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Edit Drawer
  const [isEditDrawerOpen, setIsEditDrawerOpen] = useState(false);

  const fetchMember = useCallback(async () => {
    if (!memberId) return;

    try {
      setIsLoading(true);
      setErrorMsg(null);
      const res = await api.get(`/api/v1/members/${memberId}`);
      if (res.data?.success) {
        setMember(res.data.member);
        setAccessLevel(res.data.accessLevel);
        setIsAssigned(res.data.isAssigned);
      }
    } catch (err: any) {
      setErrorMsg(
        err.response?.data?.error?.message || 'تعذر تحميل ملف المخدوم'
      );
    } finally {
      setIsLoading(false);
    }
  }, [memberId]);

  useEffect(() => {
    fetchMember();
  }, [fetchMember]);

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

  // Calculate age
  const birthDate = new Date(member.dateOfBirth);
  const ageYears = Math.floor(
    (Date.now() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000)
  );

  // Clean phone number for WhatsApp
  const rawPhone = member.phoneNumber?.replace(/\D/g, '') || '';
  const waPhone = rawPhone.startsWith('01') ? '2' + rawPhone : rawPhone;

  // Primary assigned servant
  const primaryAssignment = member.servantAssignments?.[0];
  const assignedServant = primaryAssignment?.servant;

  const canEdit =
    (user?.role.level || 1) >= 2 || (user?.role.level === 1 && isAssigned);

  return (
    <ProtectedRoute>
      <div dir="rtl" className="min-h-screen bg-bg-app flex flex-col items-center p-4 sm:p-6 pb-20">
        <div className="w-full max-w-[480px] flex flex-col gap-4">
          {/* Top Bar */}
          <header className="flex items-center justify-between bg-bg-surface border border-border-default rounded-card p-4 shadow-card">
            <div className="flex items-center gap-2.5">
              <Link
                href="/members"
                className="w-9 h-9 rounded-button flex items-center justify-center text-text-secondary hover:bg-bg-muted transition-colors"
                title="العودة للقائمة"
              >
                <ArrowRight className="w-5 h-5" />
              </Link>
              <div>
                <h1 className="text-body-default font-bold text-text-primary">ملف المخدوم</h1>
                <p className="text-caption text-text-secondary">
                  {member.stage?.name || 'مرحلة الخدمة'}
                </p>
              </div>
            </div>

            {canEdit && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsEditDrawerOpen(true)}
                className="gap-1.5 h-[36px]"
              >
                <Edit3 className="w-4 h-4" />
                <span>{user?.role.level === 1 ? 'تعديل التقييم' : 'تعديل السجل'}</span>
              </Button>
            )}
          </header>

          {/* 1. Member Header Card */}
          <section className="bg-bg-surface border border-border-default rounded-card p-5 shadow-card flex flex-col items-center text-center">
            {/* Avatar */}
            <div className="w-20 h-20 rounded-full bg-brand-primary-soft text-brand-primary font-bold text-2xl flex items-center justify-center border-2 border-brand-accent/30 shadow-sm mb-3">
              {member.fullName
                .trim()
                .split(/\s+/)
                .slice(0, 2)
                .map((w: string) => w.charAt(0))
                .join('') || 'م'}
            </div>

            <h2 className="text-h1 font-bold text-brand-primary">{member.fullName}</h2>
            <p className="text-body-small text-text-secondary mt-0.5 flex items-center gap-1.5">
              <span>{member.stage?.name}</span>
              <span>•</span>
              <span>{ageYears} سنة</span>
              {member.educationalGrade && (
                <>
                  <span>•</span>
                  <span>{member.educationalGrade}</span>
                </>
              )}
            </p>

            {/* Assigned Servant Badge */}
            <div className="mt-3">
              {assignedServant ? (
                <Badge variant="primary" withDot>
                  الخادم المسئول: {assignedServant.fullName}
                </Badge>
              ) : (
                <Badge variant="neutral">غير مسند لخادم بعد</Badge>
              )}
            </div>

            {/* Quick Actions Row: Call, WhatsApp, Location */}
            <div className="flex items-center justify-center gap-3 mt-4 pt-4 border-t border-border-default w-full">
              {member.phoneNumber ? (
                <>
                  <a
                    href={`tel:${member.phoneNumber}`}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 px-3 bg-brand-primary-soft text-brand-primary rounded-button text-body-small font-medium hover:bg-[#d8e3f0] transition-colors"
                  >
                    <Phone className="w-4 h-4" />
                    <span>اتصال</span>
                  </a>

                  <a
                    href={`https://wa.me/${waPhone}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 px-3 bg-status-success-soft text-status-success rounded-button text-body-small font-medium hover:bg-[#d6f0df] transition-colors"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>واتساب</span>
                  </a>
                </>
              ) : (
                <span className="text-caption text-text-disabled">لا يوجد رقم هاتف مسجل</span>
              )}
            </div>
          </section>

          {/* 2. Quick Statistics (2 Columns) */}
          <section className="grid grid-cols-2 gap-3">
            <div className="bg-bg-surface border border-border-default rounded-card p-4 shadow-card text-right flex flex-col justify-between">
              <span className="text-caption text-text-secondary">نسبة الحضور</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-bold text-status-success">85%</span>
                <Badge variant="success" className="text-caption">ممتاز</Badge>
              </div>
              <span className="text-caption text-text-secondary mt-1">
                حضور منتظم بمدارس الأحد
              </span>
            </div>

            <div className="bg-bg-surface border border-border-default rounded-card p-4 shadow-card text-right flex flex-col justify-between">
              <span className="text-caption text-text-secondary">سجل الافتقاد</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-bold text-brand-primary">4</span>
                <span className="text-caption text-text-secondary">افتقادات</span>
              </div>
              <span className="text-caption text-text-secondary mt-1">
                خلال الفصل الدراسي الحالي
              </span>
            </div>
          </section>

          {/* 3. Evaluative & Spiritual Status Card (Assumption A2 Core) */}
          <section className="bg-bg-surface border border-border-default rounded-card p-5 shadow-card text-right flex flex-col gap-3.5">
            <div className="flex items-center justify-between pb-2.5 border-b border-border-default">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-brand-accent" />
                <h3 className="text-h2 font-semibold text-text-primary">تقييم الخادم المسئول</h3>
              </div>
              <span className="text-caption text-brand-accent font-bold px-2 py-0.5 bg-brand-accent-soft rounded-pill">
                Assumption A2
              </span>
            </div>

            <div className="flex flex-col gap-3 text-body-small">
              <div>
                <span className="text-caption text-text-secondary block font-semibold mb-0.5">
                  الحالة المادية:
                </span>
                <p className="text-text-primary font-medium bg-bg-muted/40 p-2.5 rounded-lg border border-border-default">
                  {member.financialStatus || 'لم يتم تسجيل الحالة المادية بعد'}
                </p>
              </div>

              <div>
                <span className="text-caption text-text-secondary block font-semibold mb-0.5">
                  سلوكه في الخدمة:
                </span>
                <p className="text-text-primary bg-bg-muted/40 p-2.5 rounded-lg border border-border-default leading-relaxed">
                  {member.behaviorInService || 'لا توجد ملاحظات مسجلة حول السلوك في الخدمة'}
                </p>
              </div>

              <div>
                <span className="text-caption text-text-secondary block font-semibold mb-0.5">
                  اندماجه مع زملائه:
                </span>
                <p className="text-text-primary bg-bg-muted/40 p-2.5 rounded-lg border border-border-default leading-relaxed">
                  {member.peerIntegration || 'لا توجد ملاحظات مسجلة حول الاندماج الاجتماعي'}
                </p>
              </div>
            </div>
          </section>

          {/* 4. Personal & Family Data Section */}
          <section className="bg-bg-surface border border-border-default rounded-card p-5 shadow-card text-right flex flex-col gap-3">
            <h3 className="text-h2 font-semibold text-text-primary pb-2.5 border-b border-border-default">
              البيانات الشخصية والعائلية
            </h3>

            <div className="grid grid-cols-2 gap-3 text-body-small">
              <div>
                <span className="text-caption text-text-secondary block">تاريخ الميلاد:</span>
                <span className="font-medium text-text-primary">
                  {new Date(member.dateOfBirth).toLocaleDateString('ar-EG')}
                </span>
              </div>

              <div>
                <span className="text-caption text-text-secondary block">العنوان:</span>
                <span className="font-medium text-text-primary">{member.address}</span>
              </div>

              <div>
                <span className="text-caption text-text-secondary block">اسم الأب:</span>
                <span className="font-medium text-text-primary">{member.fatherName || '—'}</span>
              </div>

              <div>
                <span className="text-caption text-text-secondary block">اسم الأم:</span>
                <span className="font-medium text-text-primary">{member.motherName || '—'}</span>
              </div>

              <div>
                <span className="text-caption text-text-secondary block">المدرسة / الكلية:</span>
                <span className="font-medium text-text-primary">
                  {member.schoolOrUniversity || '—'}
                </span>
              </div>

              <div>
                <span className="text-caption text-text-secondary block">أب الاعتراف:</span>
                <span className="font-medium text-text-primary">
                  {member.fatherConfessor || '—'}
                </span>
              </div>
            </div>
          </section>
        </div>

        {/* Member Edit Drawer */}
        <MemberEditDrawer
          isOpen={isEditDrawerOpen}
          onClose={() => setIsEditDrawerOpen(false)}
          member={member}
          onSuccess={(updated) => setMember(updated)}
        />
      </div>
    </ProtectedRoute>
  );
}
