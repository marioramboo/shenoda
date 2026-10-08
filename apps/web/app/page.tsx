'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { MobileShell } from '@/components/layout/MobileShell';
import { AppBar } from '@/components/layout/AppBar';
import { TabBar, TabKey } from '@/components/layout/TabBar';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Chip } from '@/components/ui/Chip';
import { AttendanceToggle } from '@/components/ui/AttendanceToggle';
import { StatCard } from '@/components/ui/StatCard';
import { MemberRow } from '@/components/ui/MemberRow';
import { AttendanceStatus, CANONICAL_STAGES, ROLES, RoleKey } from '@shenoda/shared';
import {
  Bell,
  Search,
  Users,
  CheckCircle2,
  Calendar,
  Layers,
  Sparkles,
  Server,
  Activity,
  UserCheck,
} from 'lucide-react';

export default function DesignSystemCatalogPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const [activeTab, setActiveTab] = useState<TabKey>('dashboard');
  const [selectedStage, setSelectedStage] = useState<string>('stage_prep_boys');
  const [attendanceValue, setAttendanceValue] = useState<AttendanceStatus>('PRESENT');
  const [buttonLoading, setButtonLoading] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [inputError, setInputError] = useState<string>('');
  const [backendHealth, setBackendHealth] = useState<{
    status: string;
    database: string;
    timestamp: string;
  } | null>(null);
  const [healthChecking, setHealthChecking] = useState<boolean>(false);

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      router.replace('/dashboard');
    }
  }, [authLoading, isAuthenticated, router]);

  // Check backend health endpoint via standard API route (avoids adblocker /health blocks)
  const checkHealth = async () => {
    setHealthChecking(true);
    try {
      const res = await api.get('/api/v1/system-status');
      if (res.data && (res.data.status === 'ok' || res.data.database === 'connected')) {
        setBackendHealth(res.data);
      } else {
        setBackendHealth({
          status: 'error',
          database: 'disconnected',
          timestamp: new Date().toISOString(),
        });
      }
    } catch {
      setBackendHealth({
        status: 'unreachable',
        database: 'disconnected',
        timestamp: new Date().toISOString(),
      });
    } finally {
      setHealthChecking(false);
    }
  };

  useEffect(() => {
    checkHealth();
  }, []);

  return (
    <MobileShell
      header={
        <AppBar
          title="نظام إدارة الخدمة"
          subtitle="مكتبة المكونات ونظام التصميم (Phase 0)"
          actions={
            <button
              type="button"
              aria-label="التنبيهات"
              className="w-9 h-9 flex items-center justify-center rounded-button hover:bg-white/10 active:bg-white/20 transition-colors"
            >
              <Bell className="w-5 h-5 text-white" />
            </button>
          }
        />
      }
      footer={<TabBar />}
    >
      <div className="flex flex-col gap-6">
        {/* Phase 2 Auth & Login Banner */}
        <section className="bg-brand-primary text-text-inverse rounded-card p-5 shadow-card flex flex-col gap-3 text-right">
          <div className="flex items-center justify-between">
            <span className="text-caption font-bold px-2 py-0.5 bg-brand-accent text-white rounded-pill">
              المرحلة 2 (Phase 2)
            </span>
            <span className="text-caption text-brand-primary-soft">
              تسجيل الدخول وإدارة الحسابات
            </span>
          </div>
          <div>
            <h2 className="text-h2 font-bold text-white">شاشة تسجيل الدخول المعتمدة (Figma)</h2>
            <p className="text-body-small text-brand-primary-soft mt-1 leading-relaxed">
              شاشة تسجيل الدخول المتوافقة 1:1 مع تصميم فيجما (390px Mobile Viewport) مع منع التسجيل الذاتي العام، وحماية Brute-force، وتدوير رموز JWT.
            </p>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <Link href="/login" className="flex-1">
              <Button variant="accent" fullWidth size="md">
                شاشة تسجيل الدخول (Figma)
              </Button>
            </Link>
            <Link href="/dashboard" className="flex-1">
              <Button variant="secondary" fullWidth size="md">
                لوحة تحكم الخادم
              </Button>
            </Link>
          </div>
        </section>

        {/* API & System Status Banner */}
        <section className="bg-bg-surface border border-border-default rounded-card p-4 shadow-card">
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <Server className="w-5 h-5 text-brand-primary" />
              <h2 className="text-h2 font-bold text-text-primary">
                حالة النظام والتكامل
              </h2>
            </div>
            <Button
              variant="outline"
              size="sm"
              isLoading={healthChecking}
              onClick={checkHealth}
              iconLeading={<Activity className="w-4 h-4" />}
            >
              فحص
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-2 text-body-small">
            <div className="bg-bg-muted p-2.5 rounded-button flex flex-col">
              <span className="text-text-secondary text-caption">خادم Express API</span>
              <span className="font-semibold text-text-primary flex items-center gap-1.5 mt-0.5">
                {backendHealth?.status === 'ok' ? (
                  <Badge variant="success" withDot>متصل (200 OK)</Badge>
                ) : backendHealth?.status === 'degraded' ? (
                  <Badge variant="warning" withDot>محدود (Degraded)</Badge>
                ) : (
                  <Badge variant="neutral" withDot>قيد الانتظار / غير نشط</Badge>
                )}
              </span>
            </div>

            <div className="bg-bg-muted p-2.5 rounded-button flex flex-col">
              <span className="text-text-secondary text-caption">قاعدة بيانات PostgreSQL</span>
              <span className="font-semibold text-text-primary flex items-center gap-1.5 mt-0.5">
                {backendHealth?.database === 'connected' ? (
                  <Badge variant="success" withDot>متصلة</Badge>
                ) : (
                  <Badge variant="danger" withDot>غير متصلة</Badge>
                )}
              </span>
            </div>
          </div>
        </section>

        {/* Brand Tokens Palette Showcase */}
        <section className="bg-bg-surface border border-border-default rounded-card p-4 shadow-card">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-5 h-5 text-brand-accent" />
            <h2 className="text-h2 font-bold text-text-primary">
              لوحة الألوان المعتمدة (Figma Tokens)
            </h2>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="flex flex-col items-center p-2 rounded-button bg-brand-primary text-white text-center">
              <span className="text-caption font-bold">Deep Coptic Blue</span>
              <span className="text-[11px] opacity-80">#1F3A5F</span>
            </div>
            <div className="flex flex-col items-center p-2 rounded-button bg-brand-accent text-white text-center">
              <span className="text-caption font-bold">Liturgical Gold</span>
              <span className="text-[11px] opacity-90">#B8892B</span>
            </div>
            <div className="flex flex-col items-center p-2 rounded-button bg-bg-muted text-text-primary text-center border border-border-default">
              <span className="text-caption font-bold">Parchment BG</span>
              <span className="text-[11px] text-text-secondary">#F6F4EE</span>
            </div>
          </div>
        </section>

        {/* 1. StatCards */}
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-h2 font-bold text-text-primary">
              بطاقات الإحصائيات (StatCard)
            </h2>
            <Badge variant="primary">3 نماذج</Badge>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <StatCard
              label="حضور القداس"
              value="87%"
              subtitle="قداس الجمعة السابق"
              icon={<CheckCircle2 className="w-5 h-5" />}
              trend={{ value: '+4%', direction: 'up' }}
            />
            <StatCard
              label="المخدومين المسجلين"
              value="142"
              subtitle="مرحلة إعدادي بنين"
              icon={<Users className="w-5 h-5" />}
              trend={{ value: 'مستقر', direction: 'neutral' }}
            />
          </div>
        </section>

        {/* 2. Chip Filters */}
        <section className="bg-bg-surface border border-border-default rounded-card p-4 shadow-card">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-brand-primary" />
              <h2 className="text-h2 font-bold text-text-primary">
                محدد المراحل (Chip Component)
              </h2>
            </div>
            <span className="text-caption text-text-secondary">
              {CANONICAL_STAGES.length} مراحل
            </span>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            {CANONICAL_STAGES.map((stg) => (
              <Chip
                key={stg.id}
                selected={selectedStage === stg.id}
                onClick={() => setSelectedStage(stg.id)}
              >
                {stg.arabicName}
              </Chip>
            ))}
          </div>
        </section>

        {/* 3. Fast Attendance Segment Toggle */}
        <section className="bg-bg-surface border border-border-default rounded-card p-4 shadow-card">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-h2 font-bold text-text-primary">
              محدد الحضور السريع (AttendanceToggle)
            </h2>
            <Badge
              variant={
                attendanceValue === 'PRESENT'
                  ? 'success'
                  : attendanceValue === 'ABSENT'
                  ? 'danger'
                  : 'neutral'
              }
            >
              الحالة الحالية
            </Badge>
          </div>

          <div className="flex justify-center">
            <AttendanceToggle
              value={attendanceValue}
              onChange={setAttendanceValue}
            />
          </div>
        </section>

        {/* 4. Form Inputs */}
        <section className="bg-bg-surface border border-border-default rounded-card p-4 shadow-card">
          <h2 className="text-h2 font-bold text-text-primary mb-3">
            حقول الإدخال (Input Component)
          </h2>

          <div className="flex flex-col gap-4">
            <Input
              label="بحث في سجل المخدومين"
              placeholder="اكتب الاسم أو رقم الهاتف..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              iconLeading={<Search className="w-5 h-5" />}
              helperText="بحث فوري في نطاق المرحلة المحددة"
            />

            <Input
              label="حقل مع حالة خطأ تحققي"
              placeholder="أدخل الرقم القومي المكون من 14 رقم..."
              error={inputError}
              onChange={(e) => {
                if (e.target.value.length > 0 && e.target.value.length < 14) {
                  setInputError('الرقم القومي يجب أن يتكون من 14 رقماً بالتمام');
                } else {
                  setInputError('');
                }
              }}
            />
          </div>
        </section>

        {/* 5. Member Row List */}
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-h2 font-bold text-text-primary">
              قائمة المخدومين (MemberRow)
            </h2>
            <Badge variant="info">نماذج حية</Badge>
          </div>

          <div className="flex flex-col gap-2">
            <MemberRow
              id="1"
              name="يوحنا مينا فايز"
              subtitle="إعدادي بنين — فصل أولى أول • الخادم: بيتر عادل"
              badgeText="حاضر"
              badgeVariant="success"
              onClick={() => alert('تفاصيل المخدوم: يوحنا مينا فايز')}
            />

            <MemberRow
              id="3"
              name="أبانوب سامي رزق"
              subtitle="إعدادي بنين — فصل أولى أول • يحتاج افتقاد فوري"
              badgeText="غائب"
              badgeVariant="danger"
              onClick={() => alert('تفاصيل المخدوم: أبانوب سامي رزق')}
            />
          </div>
        </section>

        {/* 6. Badges & Chips Showcase */}
        <section className="bg-bg-surface border border-border-default rounded-card p-4 shadow-card">
          <h2 className="text-h2 font-bold text-text-primary mb-3">
            شارات الحالة (Badge Variants)
          </h2>

          <div className="flex flex-wrap gap-2">
            <Badge variant="success" withDot>حاضر (Success)</Badge>
            <Badge variant="danger" withDot>غائب (Danger)</Badge>
            <Badge variant="info" withDot>ملاحظة (Info)</Badge>
            <Badge variant="neutral" withDot>محايد (Neutral)</Badge>
            <Badge variant="primary" withDot>رئيسي (Primary)</Badge>
          </div>

          <h3 className="text-body-medium font-semibold text-text-primary mt-4 mb-2">
            أدوار الهيكل الكنسي المعتمدة (Shared Roles)
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {Object.values(ROLES).map((role) => (
              <span
                key={role.key}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-pill bg-brand-primary-soft text-brand-primary text-caption font-semibold"
              >
                <UserCheck className="w-3.5 h-3.5" />
                {role.arabicName}
              </span>
            ))}
          </div>
        </section>

        {/* 7. Action Buttons */}
        <section className="bg-bg-surface border border-border-default rounded-card p-4 shadow-card">
          <h2 className="text-h2 font-bold text-text-primary mb-3">
            الأزرار التفاعلية (Button Component)
          </h2>

          <div className="flex flex-col gap-3">
            <Button
              variant="primary"
              size="md"
              fullWidth
              isLoading={buttonLoading}
              onClick={() => {
                setButtonLoading(true);
                setTimeout(() => setButtonLoading(false), 1200);
              }}
              iconLeading={<Calendar className="w-5 h-5" />}
            >
              زر رئيسي (Primary CTA) — اضغط لاختبار التحميل
            </Button>

            <div className="grid grid-cols-2 gap-2">
              <Button variant="secondary" size="md">
                زر ثانوي (Secondary)
              </Button>
              <Button variant="accent" size="md">
                زر ذهبي (Accent)
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" size="md">
                زر إطار (Outline)
              </Button>
              <Button variant="danger" size="md">
                زر تحذيري (Danger)
              </Button>
            </div>
          </div>
        </section>
      </div>
    </MobileShell>
  );
}
