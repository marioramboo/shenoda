'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { TabBar } from '@/components/layout/TabBar';
import { SpiritualJournal } from '@/components/spiritual/SpiritualJournal';
import { api } from '@/lib/api';
import { getCopticDate } from '@shenoda/shared';
import {
  User,
  Shield,
  Layers,
  LogOut,
  UserPlus,
  CheckCircle2,
  AlertCircle,
  X,
  Phone,
  Lock,
  Users,
  ChevronLeft,
  BookOpen,
  CalendarCheck,
  HeartHandshake,
  Clock,
  Sparkles,
  ExternalLink,
  ClipboardList,
  Megaphone,
  BarChart3,
} from 'lucide-react';

interface ServantDashboardData {
  servant: {
    id: string;
    roleCode: string;
    roleLevel: number;
  };
  metrics: {
    attendanceRatePercentage: number;
    attendancePresentCount: number;
    attendanceTotalSessions: number;
    preparationsCount: number;
    assignedMembersCount: number;
    daysSinceLastConfession: number | null;
  };
  upcomingLessons: Array<{
    id: string;
    title: string;
    lessonDate: string;
    scriptureRef: string | null;
    status: string;
    stage?: { id: string; name: string };
  }>;
  assignedMembers: Array<{
    id: string;
    fullName: string;
    phoneNumber: string | null;
    educationalGrade: string;
  }>;
  urgentAbsenceAlerts: Array<{
    id: string;
    consecutiveCount: number;
    lastAttendedDate: string | null;
    member?: {
      id: string;
      fullName: string;
      phoneNumber: string | null;
      educationalGrade: string;
    };
  }>;
}

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<ServantDashboardData | null>(null);
  const [isSpiritualJournalOpen, setIsSpiritualJournalOpen] = useState(false);

  // Account creation modal state (Level 3+)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [roleCode, setRoleCode] = useState('SERVANT');
  const [stageId, setStageId] = useState('');
  const [tempPassword, setTempPassword] = useState('InitPassword2026!');
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSuccess, setCreateSuccess] = useState<string | null>(null);

  // Coptic Date
  const copticDate = getCopticDate();
  const gregorianDate = new Intl.DateTimeFormat('ar-EG', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date());

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/v1/dashboard/servant-summary');
      if (res.data?.success) {
        setDashboardData(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load servant dashboard summary:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleLogout = async () => {
    await logout();
    router.replace('/login');
  };

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);
    setCreateSuccess(null);

    const resolvedStageId = stageId || user?.scopes.stages[0]?.id;

    try {
      setCreateLoading(true);
      const res = await api.post('/api/v1/accounts/create', {
        fullName,
        phoneNumber,
        email: email || undefined,
        roleId: roleCode === 'SERVANT' ? 'role-servant' : 'role-assistant',
        stageId: resolvedStageId,
        temporaryPassword: tempPassword,
      });

      if (res.data?.success) {
        setCreateSuccess(`تم إنشاء حساب الخادم (${fullName}) بنجاح!`);
        setFullName('');
        setPhoneNumber('');
        setEmail('');
      }
    } catch (err: any) {
      setCreateError(
        err.response?.data?.error?.message ||
          'حدث خطأ أثناء إنشاء الحساب. تأكد من استيفاء الصلاحيات.'
      );
    } finally {
      setCreateLoading(false);
    }
  };


  const handleTabChange = (tab: string) => {
    if (tab === 'members') router.push('/members');
    else if (tab === 'attendance') router.push('/attendance');
    else if (tab === 'plan') router.push('/year-plan');
  };


  return (
    <ProtectedRoute>
      <div dir="rtl" className="min-h-screen bg-bg-app flex flex-col items-center p-4 sm:p-6 pb-28">
        <div className="w-full max-w-[480px] flex flex-col gap-4">
          
          {/* Top Bar */}
          <header className="flex items-center justify-between bg-bg-surface border border-border-default rounded-card p-4 shadow-card">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-full bg-brand-primary-soft border border-[#D5E1F0] flex items-center justify-center text-brand-primary font-bold">
                <User className="w-5 h-5 text-brand-primary" />
              </div>
              <div className="text-right">
                <h1 className="text-body-default font-bold text-text-primary leading-tight">
                  {user?.fullName}
                </h1>
                <p className="text-caption text-text-secondary mt-0.5">
                  المستوى {user?.role.level}: {user?.role.name}
                </p>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="text-status-danger hover:bg-status-danger-soft hover:border-[#F5C2BE] gap-1.5"
            >
              <LogOut className="w-4 h-4" />
              <span>خروج</span>
            </Button>
          </header>

          {/* Coptic Greeting Card (TASK-05-8) */}
          <section className="bg-gradient-to-br from-brand-primary via-[#264875] to-[#162B47] text-white rounded-card p-5 shadow-elevated relative overflow-hidden text-right">
            <div className="absolute top-0 left-0 w-36 h-36 bg-brand-accent/15 rounded-full blur-2xl pointer-events-none" />
            <div className="relative z-10 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-brand-accent animate-pulse" />
                  <span className="text-caption text-brand-accent font-semibold tracking-wide">
                    خدمة كنيستنا الأرثوذكسية
                  </span>
                </div>
                <Badge variant="accent" className="bg-brand-accent/20 text-brand-accent border-brand-accent/30">
                  {copticDate.formatted}
                </Badge>
              </div>

              <div>
                <h2 className="text-h1 font-bold text-white leading-snug">
                  أهلاً بك يا خادم المسيح / {user?.fullName.split(' ')[0]}
                </h2>
                <p className="text-body-small text-white/80 mt-1">
                  اليوم {gregorianDate}
                </p>
              </div>

              {/* Private Spiritual Journal Trigger */}
              <div className="pt-2 border-t border-white/10 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setIsSpiritualJournalOpen(true)}
                  className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg bg-white/10 hover:bg-white/15 border border-white/15 text-white transition-all text-body-small font-medium group"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-brand-accent text-brand-primary flex items-center justify-center font-bold">
                      <Lock className="w-4 h-4" />
                    </div>
                    <div className="text-right">
                      <p className="text-body-small font-bold text-brand-accent">
                        المفكرة الروحية الخاصة
                      </p>
                      <p className="text-[11px] text-white/70">
                        سجل التناول والاعتراف (مشفر وسري بالكامل)
                      </p>
                    </div>
                  </div>
                  <ChevronLeft className="w-4 h-4 text-brand-accent group-hover:-translate-x-1 transition-transform" />
                </button>
              </div>
            </div>
          </section>

          {/* Personal Metrics Row (StatCards) */}
          <section className="grid grid-cols-3 gap-2.5">
            {/* StatCard 1: Attendance Rate */}
            <div className="bg-bg-surface border border-border-default rounded-card p-3.5 shadow-card flex flex-col items-center text-center">
              <div className="w-8 h-8 rounded-full bg-status-success-soft text-status-success flex items-center justify-center mb-1.5">
                <CalendarCheck className="w-4 h-4" />
              </div>
              <span className="text-h2 font-bold text-text-primary">
                {dashboardData?.metrics.attendanceRatePercentage ?? 100}%
              </span>
              <span className="text-[11px] text-text-secondary mt-0.5">
                حضور الخدمة (8 أسابيع)
              </span>
            </div>

            {/* StatCard 2: Preparations Count */}
            <div
              onClick={() => router.push('/preparations')}
              className="bg-bg-surface border border-border-default rounded-card p-3.5 shadow-card flex flex-col items-center text-center cursor-pointer hover:border-brand-primary/50 transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-brand-primary-soft text-brand-primary flex items-center justify-center mb-1.5">
                <BookOpen className="w-4 h-4" />
              </div>
              <span className="text-h2 font-bold text-text-primary">
                {dashboardData?.metrics.preparationsCount ?? 0}
              </span>
              <span className="text-[11px] text-text-secondary mt-0.5">
                دروس محضرة
              </span>
            </div>

            {/* StatCard 3: Assigned Members */}
            <div
              onClick={() => router.push('/members')}
              className="bg-bg-surface border border-border-default rounded-card p-3.5 shadow-card flex flex-col items-center text-center cursor-pointer hover:border-brand-primary/50 transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-brand-accent-soft text-brand-accent flex items-center justify-center mb-1.5">
                <HeartHandshake className="w-4 h-4" />
              </div>
              <span className="text-h2 font-bold text-text-primary">
                {dashboardData?.metrics.assignedMembersCount ?? 0}
              </span>
              <span className="text-[11px] text-text-secondary mt-0.5">
                مخدومين برعايتي
              </span>
            </div>
          </section>

          {/* Action Required: Urgent Absence Alerts */}
          {dashboardData && dashboardData.urgentAbsenceAlerts.length > 0 && (
            <section className="bg-bg-surface border border-status-danger/30 rounded-card p-4 shadow-card flex flex-col gap-3 text-right">
              <div className="flex items-center justify-between pb-2 border-b border-border-default">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-status-danger" />
                  <h3 className="text-h2 font-bold text-text-primary">
                    تنبيهات الافتقاد العاجلة ({dashboardData.urgentAbsenceAlerts.length})
                  </h3>
                </div>
                <Badge variant="danger">متابعة فورية</Badge>
              </div>

              <div className="flex flex-col gap-2.5">
                {dashboardData.urgentAbsenceAlerts.slice(0, 3).map((alert) => (
                  <div
                    key={alert.id}
                    className="p-3 bg-status-danger-soft/40 border border-[#F5C2BE] rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                  >
                    <div>
                      <h4 className="text-body-default font-bold text-text-primary">
                        {alert.member?.fullName || 'مخدوم'}
                      </h4>
                      <p className="text-caption text-status-danger font-medium mt-0.5">
                        غائب لـ {alert.consecutiveCount} أسابيع متتالية ({alert.member?.educationalGrade})
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {alert.member?.phoneNumber && (
                        <a
                          href={`tel:${alert.member.phoneNumber}`}
                          className="px-3 py-1.5 bg-bg-surface border border-border-default rounded-pill text-caption font-semibold text-brand-primary flex items-center gap-1.5 hover:bg-bg-muted"
                        >
                          <Phone className="w-3.5 h-3.5 text-brand-primary" />
                          <span>اتصال</span>
                        </a>
                      )}
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => router.push('/attendance')}
                        className="text-caption font-semibold py-1 px-3 h-8"
                      >
                        تسجيل افتقاد
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Upcoming Lesson Obligation */}
          <section className="bg-bg-surface border border-border-default rounded-card p-4 shadow-card flex flex-col gap-3 text-right">
            <div className="flex items-center justify-between pb-2 border-b border-border-default">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-brand-primary" />
                <h3 className="text-h2 font-bold text-text-primary">التحضير الأسبوعي القادم</h3>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push('/preparations')}
                className="text-caption font-semibold py-1 px-2.5 h-8 gap-1"
              >
                <span>كل الدروس</span>
                <ChevronLeft className="w-3.5 h-3.5" />
              </Button>
            </div>

            {dashboardData && dashboardData.upcomingLessons.length > 0 ? (
              <div className="p-3.5 bg-bg-app rounded-lg border border-border-default flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-caption font-bold text-brand-primary">
                    {new Date(dashboardData.upcomingLessons[0].lessonDate).toLocaleDateString('ar-EG', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'short',
                    })}
                  </span>
                  <Badge variant={dashboardData.upcomingLessons[0].status === 'REVIEWED' ? 'success' : 'accent'}>
                    {dashboardData.upcomingLessons[0].status === 'REVIEWED' ? 'تمت المراجعة' : 'مقدم'}
                  </Badge>
                </div>
                <h4 className="text-body-default font-bold text-text-primary">
                  {dashboardData.upcomingLessons[0].title}
                </h4>
                {dashboardData.upcomingLessons[0].scriptureRef && (
                  <p className="text-caption text-text-secondary">
                    الشاهد: {dashboardData.upcomingLessons[0].scriptureRef}
                  </p>
                )}
              </div>
            ) : (
              <div className="p-4 bg-bg-app rounded-lg border border-dashed border-border-default text-center flex flex-col items-center gap-2">
                <p className="text-body-small text-text-secondary">
                  لا توجد تحضيرات قادمة مسجلة حالياً
                </p>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => router.push('/preparations')}
                  className="font-semibold"
                >
                  كتابة تحضير جديد
                </Button>
              </div>
            )}
          </section>

          {/* Quick Action Navigation Grid */}
          <section className="grid grid-cols-2 gap-3 text-right">
            <button
              type="button"
              onClick={() => router.push('/members')}
              className="p-4 bg-bg-surface border border-border-default rounded-card shadow-card flex flex-col gap-2 hover:border-brand-primary transition-all text-right group"
            >
              <div className="w-10 h-10 rounded-lg bg-brand-primary-soft text-brand-primary flex items-center justify-center group-hover:scale-105 transition-transform">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-body-default font-bold text-text-primary">سجل المخدومين</h4>
                <p className="text-[11px] text-text-secondary mt-0.5">
                  بيانات المخدومين والتسجيل الشامل
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => router.push('/attendance')}
              className="p-4 bg-bg-surface border border-border-default rounded-card shadow-card flex flex-col gap-2 hover:border-brand-primary transition-all text-right group"
            >
              <div className="w-10 h-10 rounded-lg bg-status-success-soft text-status-success flex items-center justify-center group-hover:scale-105 transition-transform">
                <ClipboardList className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-body-default font-bold text-text-primary">حضور وافتقاد</h4>
                <p className="text-[11px] text-text-secondary mt-0.5">
                  رصد الغياب وبطاقات الافتقاد
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => router.push('/announcements')}
              className="p-4 bg-bg-surface border border-border-default rounded-card shadow-card flex items-center gap-3 hover:border-brand-accent transition-all text-right group"
            >
              <div className="w-10 h-10 rounded-lg bg-brand-accent-soft text-brand-accent flex items-center justify-center group-hover:scale-105 transition-transform shrink-0">
                <Megaphone className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h4 className="text-body-default font-bold text-text-primary">الإعلانات والاستطلاعات</h4>
                <p className="text-[11px] text-text-secondary mt-0.5">
                  البيانات الرسمية والتصويت
                </p>
              </div>
              <ChevronLeft className="w-4 h-4 text-text-secondary group-hover:text-brand-accent transition-colors" />
            </button>

            <button
              type="button"
              onClick={() => router.push('/analytics')}
              className="p-4 bg-bg-surface border border-border-default rounded-card shadow-card flex items-center gap-3 hover:border-brand-primary transition-all text-right group"
            >
              <div className="w-10 h-10 rounded-lg bg-brand-primary-soft text-brand-primary flex items-center justify-center group-hover:scale-105 transition-transform shrink-0">
                <BarChart3 className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h4 className="text-body-default font-bold text-text-primary">التحليلات والتقارير</h4>
                <p className="text-[11px] text-text-secondary mt-0.5">
                  مؤشرات الحضور وتصدير PDF/Excel
                </p>
              </div>
              <ChevronLeft className="w-4 h-4 text-text-secondary group-hover:text-brand-primary transition-colors" />
            </button>
          </section>

          {/* Administrative Secretarial Scopes (Level 3+) */}
          {user && user.role.level >= 3 && (
            <section className="bg-bg-surface border border-border-default rounded-card p-4 shadow-card flex flex-col gap-3 text-right">
              <div className="flex items-center justify-between pb-2 border-b border-border-default">
                <div className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-brand-accent" />
                  <h3 className="text-h2 font-bold text-text-primary">إدارة الخدمة والخدام</h3>
                </div>
                <Badge variant="accent">أمين المرحلة</Badge>
              </div>

              <p className="text-body-small text-text-secondary leading-relaxed">
                بصفتك ({user.role.name})، يمكنك إنشاء وتفعيل حسابات الخدام ومراجعة تحضيرات المرحلة.
              </p>

              <div className="flex items-center gap-2">
                <Button
                  variant="primary"
                  onClick={() => setIsCreateModalOpen(true)}
                  className="flex-1 h-[40px] gap-1.5 font-semibold text-caption"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>إضافة خادم جديد</span>
                </Button>

                <Button
                  variant="outline"
                  onClick={() => router.push('/preparations')}
                  className="flex-1 h-[40px] gap-1.5 font-semibold text-caption"
                >
                  <BookOpen className="w-4 h-4" />
                  <span>مراجعة التحضيرات</span>
                </Button>
              </div>
            </section>
          )}

          {/* Modal: Scoped Account Creation */}
          {isCreateModalOpen && (
            <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="w-full max-w-[420px] bg-bg-surface border border-border-default rounded-card shadow-elevated p-6 text-right relative max-h-[90vh] overflow-y-auto">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="absolute top-4 left-4 text-text-secondary hover:text-text-primary p-1"
                >
                  <X className="w-5 h-5" />
                </button>

                <div className="mb-4">
                  <h3 className="text-h2 font-bold text-brand-primary">إنشاء حساب خادم مصرح</h3>
                  <p className="text-caption text-text-secondary mt-0.5">
                    إسناد مباشر للخدمة دون تسجيل ذاتي عام
                  </p>
                </div>

                {createError && (
                  <div className="mb-4 p-3 bg-status-danger-soft border border-[#F5C2BE] rounded-lg flex items-start gap-2 text-right">
                    <AlertCircle className="w-4 h-4 text-status-danger shrink-0 mt-0.5" />
                    <p className="text-caption text-status-danger font-medium">{createError}</p>
                  </div>
                )}

                {createSuccess && (
                  <div className="mb-4 p-3 bg-status-success-soft border border-[#BDE5D0] rounded-lg flex items-start gap-2 text-right">
                    <CheckCircle2 className="w-4 h-4 text-status-success shrink-0 mt-0.5" />
                    <p className="text-caption text-status-success font-medium">{createSuccess}</p>
                  </div>
                )}

                <form onSubmit={handleCreateAccount} className="flex flex-col gap-3.5">
                  <Input
                    label="الاسم بالكامل"
                    placeholder="مثال: يوسف عادل جورج"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />

                  <Input
                    label="رقم الهاتف المحمول"
                    type="tel"
                    placeholder="010XXXXXXXX"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    required
                  />

                  <Input
                    label="البريد الإلكتروني (اختياري)"
                    type="email"
                    placeholder="servant@church.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />

                  <div className="flex flex-col gap-1.5 text-right">
                    <label className="text-caption font-semibold text-text-primary">
                      الرتبة في المرحلة
                    </label>
                    <select
                      value={roleCode}
                      onChange={(e) => setRoleCode(e.target.value)}
                      className="h-11 px-3 rounded-button border border-border-default bg-bg-surface text-body-default text-text-primary focus:outline-none focus:border-brand-primary"
                    >
                      <option value="SERVANT">خادم مرحلة (المستوى 1)</option>
                      {user && user.role.level >= 3 && (
                        <option value="ASSISTANT_SECRETARY">مساعد أمين الخدمة (المستوى 2)</option>
                      )}
                    </select>
                  </div>

                  <Input
                    label="كلمة المرور المؤقتة"
                    value={tempPassword}
                    onChange={(e) => setTempPassword(e.target.value)}
                    required
                  />

                  <div className="flex items-center gap-2 mt-2">
                    <Button
                      type="submit"
                      variant="primary"
                      isLoading={createLoading}
                      className="flex-1 h-11 font-semibold"
                    >
                      تأكيد إنشاء الحساب
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsCreateModalOpen(false)}
                      className="h-11 px-4"
                    >
                      إلغاء
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Spiritual Journal Drawer (TASK-05-7) */}
          <SpiritualJournal
            isOpen={isSpiritualJournalOpen}
            onClose={() => setIsSpiritualJournalOpen(false)}
          />

        </div>

        {/* Bottom Tab Bar Navigation */}
        <TabBar activeTab="dashboard" />
      </div>
    </ProtectedRoute>
  );
}
