'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Button } from '@/components/ui/Button';
import { StatCard } from '@/components/ui/StatCard';
import { Badge } from '@/components/ui/Badge';
import { TabBar } from '@/components/layout/TabBar';
import { ExportReportModal } from '@/components/reports/ExportReportModal';
import { api } from '@/lib/api';
import {
  BarChart3,
  TrendingUp,
  Users,
  BookOpen,
  AlertTriangle,
  Download,
  Calendar,
  Layers,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  RefreshCw,
  ChevronDown,
} from 'lucide-react';

interface AnalyticsMetrics {
  activeMembersCount: number;
  averageAttendanceRate: number;
  prepComplianceRate: number;
  outstandingAbsenceAlerts: number;
}

interface AttendanceTrendPoint {
  date: string;
  label: string;
  massPresent: number;
  sundaySchoolPresent: number;
  totalPresent: number;
}

interface AbsenceFunnel {
  regularCount: number;
  irregularCount: number;
  highRiskCount: number;
}

interface StageComparisonItem {
  stageId: string;
  stageName: string;
  membersCount: number;
  attendanceRate: number;
  prepCompliance: number;
  activeAlertsCount: number;
}

interface DashboardAnalyticsData {
  scopeLevel: number;
  stageId?: string | null;
  targetStageId: string | null;
  targetSectorId: string | null;
  metrics: AnalyticsMetrics;
  attendanceTrends: AttendanceTrendPoint[];
  absenceFunnel: AbsenceFunnel;
  stageComparisons?: StageComparisonItem[];
}

export default function AnalyticsPage() {
  const router = useRouter();
  const { user } = useAuth();

  const [analytics, setAnalytics] = useState<DashboardAnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStageId, setSelectedStageId] = useState<string>('');
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  // Available stages for selector
  const stagesList = user?.scopes?.stages || [];

  useEffect(() => {
    if (stagesList.length > 0 && !selectedStageId) {
      setSelectedStageId(stagesList[0].id);
    }
  }, [stagesList, selectedStageId]);

  const fetchAnalytics = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const url = selectedStageId
        ? `/api/v1/analytics/dashboard?stageId=${selectedStageId}`
        : '/api/v1/analytics/dashboard';
      const response = await api.get(url);
      if (response.data.success) {
        setAnalytics(response.data.data);
      }
    } catch (err: any) {
      console.error('Failed to load analytics:', err);
      setError(
        err.response?.data?.error?.message ||
        'تعذر تحميل بيانات التحليلات والمؤشرات الرعوية'
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchAnalytics();
    }
  }, [user, selectedStageId]);

  const currentStageName =
    stagesList.find((s) => s.id === selectedStageId)?.name ||
    'المرحلة الحالية';

  // Calculate funnel total
  const funnelTotal = analytics?.absenceFunnel
    ? (analytics.absenceFunnel.regularCount || 0) +
      (analytics.absenceFunnel.irregularCount || 0) +
      (analytics.absenceFunnel.highRiskCount || 0)
    : 0;

  const regularPct = funnelTotal > 0 ? Math.round(((analytics?.absenceFunnel.regularCount || 0) / funnelTotal) * 100) : 0;
  const irregularPct = funnelTotal > 0 ? Math.round(((analytics?.absenceFunnel.irregularCount || 0) / funnelTotal) * 100) : 0;
  const highRiskPct = funnelTotal > 0 ? Math.round(((analytics?.absenceFunnel.highRiskCount || 0) / funnelTotal) * 100) : 0;

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-bg-base text-text-primary pb-24 rtl text-right">
        {/* Top Header */}
        <header className="bg-bg-surface border-b border-border-default sticky top-0 z-30 shadow-card">
          <div className="max-w-6xl mx-auto px-4 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push('/dashboard')}
                className="w-9 h-9 rounded-xl border border-border-default bg-bg-surface flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-bg-muted transition-colors"
                title="الرجوع للرئيسية"
              >
                <ArrowRight className="w-5 h-5" />
              </button>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold text-text-primary tracking-tight">
                    مؤشرات الأداء والتحليلات الرعوية
                  </h1>
                  <Badge variant="primary">
                    {user?.role?.code || 'خادم'}
                  </Badge>
                </div>
                <p className="text-xs text-text-secondary mt-0.5">
                  رصد معدلات الحضور والتحضير وقمع مخاطر الغياب
                </p>
              </div>
            </div>

            {/* Actions & Scope Filter */}
            <div className="flex items-center gap-3 self-end md:self-auto">
              {stagesList.length > 1 && (
                <div className="relative">
                  <select
                    value={selectedStageId}
                    onChange={(e) => setSelectedStageId(e.target.value)}
                    className="h-10 pl-8 pr-3 rounded-xl border border-border-default bg-bg-surface text-sm font-medium text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-primary appearance-none cursor-pointer"
                  >
                    {stagesList.map((st) => (
                      <option key={st.id} value={st.id}>
                        {st.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-text-tertiary absolute left-2.5 top-3 pointer-events-none" />
                </div>
              )}

              <Button
                variant="primary"
                onClick={() => setIsExportModalOpen(true)}
                className="gap-2 shadow-sm font-bold"
              >
                <Download className="w-4 h-4" />
                <span>تصدير التقارير</span>
              </Button>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
          {error && (
            <div className="p-4 bg-status-danger-soft border border-status-danger/30 rounded-2xl flex items-center justify-between text-status-danger text-sm font-medium">
              <span>{error}</span>
              <Button variant="outline" size="sm" onClick={fetchAnalytics}>
                إعادة المحاولة
              </Button>
            </div>
          )}

          {isLoading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3 text-text-tertiary">
              <RefreshCw className="w-8 h-8 animate-spin text-brand-primary" />
              <p className="text-sm">جاري تجميع المؤشرات واستخراج الإحصائيات...</p>
            </div>
          ) : !analytics ? null : (
            <>
              {/* 1. Executive Metrics Grid */}
              <section>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-base font-bold text-text-primary">
                    المؤشرات التنفيذية الرئيسية
                  </h2>
                  <span className="text-xs text-text-secondary font-medium">
                    نطاق: {currentStageName}
                  </span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <StatCard
                    label="المخدومين النشطين"
                    value={analytics.metrics.activeMembersCount}
                    subtitle="إجمالي المخدومين المقيدين"
                    icon={<Users className="w-5 h-5" />}
                  />

                  <StatCard
                    label="نسبة الحضور العام"
                    value={`${analytics.metrics.averageAttendanceRate}%`}
                    subtitle="متوسط آخر 8 أسابيع"
                    icon={<BarChart3 className="w-5 h-5" />}
                    trend={{
                      value: `${analytics.metrics.averageAttendanceRate}%`,
                      direction:
                        analytics.metrics.averageAttendanceRate >= 75
                          ? 'up'
                          : analytics.metrics.averageAttendanceRate >= 50
                          ? 'neutral'
                          : 'down',
                    }}
                  />

                  <StatCard
                    label="التزام تحضير الدروس"
                    value={`${analytics.metrics.prepComplianceRate}%`}
                    subtitle="نسبة تسليم دفاتر التحضير"
                    icon={<BookOpen className="w-5 h-5" />}
                    trend={{
                      value: `${analytics.metrics.prepComplianceRate}%`,
                      direction:
                        analytics.metrics.prepComplianceRate >= 80 ? 'up' : 'neutral',
                    }}
                  />

                  <StatCard
                    label="تنبيهات الغياب النشطة"
                    value={analytics.metrics.outstandingAbsenceAlerts}
                    subtitle="حالات انقطاع تحتاج افتقاد"
                    icon={<AlertTriangle className="w-5 h-5 text-amber-500" />}
                    trend={{
                      value: analytics.metrics.outstandingAbsenceAlerts,
                      direction:
                        analytics.metrics.outstandingAbsenceAlerts === 0
                          ? 'up'
                          : 'down',
                    }}
                  />
                </div>
              </section>

              {/* 2. Visual Charts & Funnel Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* 2.1 Absence Risk Funnel */}
                <div className="bg-bg-surface border border-border-default rounded-2xl p-5 shadow-card flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-base font-bold text-text-primary">
                          قمع مخاطر الغياب
                        </h3>
                        <p className="text-xs text-text-secondary mt-0.5">
                          تصنيف المخدومين حسب الاستمرارية
                        </p>
                      </div>
                      <Badge variant="neutral">
                        {funnelTotal} مخدوم
                      </Badge>
                    </div>

                    <div className="space-y-4">
                      {/* Regular Group */}
                      <div className="p-3.5 rounded-xl border border-emerald-500/20 bg-emerald-500/5">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300">
                            منتظم (حضور ≥ 80%)
                          </span>
                          <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300">
                            {analytics.absenceFunnel.regularCount} ({regularPct}%)
                          </span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-emerald-200 dark:bg-emerald-950 overflow-hidden">
                          <div
                            className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                            style={{ width: `${regularPct}%` }}
                          />
                        </div>
                      </div>

                      {/* Irregular Group */}
                      <div className="p-3.5 rounded-xl border border-amber-500/20 bg-amber-500/5">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs font-bold text-amber-700 dark:text-amber-300">
                            غير منتظم (50% – 79%)
                          </span>
                          <span className="text-xs font-bold text-amber-700 dark:text-amber-300">
                            {analytics.absenceFunnel.irregularCount} ({irregularPct}%)
                          </span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-amber-200 dark:bg-amber-950 overflow-hidden">
                          <div
                            className="h-full bg-amber-500 rounded-full transition-all duration-500"
                            style={{ width: `${irregularPct}%` }}
                          />
                        </div>
                      </div>

                      {/* High Risk Group */}
                      <div className="p-3.5 rounded-xl border border-rose-500/20 bg-rose-500/5">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs font-bold text-rose-700 dark:text-rose-300">
                            في دائرة الخطر (&lt; 50% أو منقطع)
                          </span>
                          <span className="text-xs font-bold text-rose-700 dark:text-rose-300">
                            {analytics.absenceFunnel.highRiskCount} ({highRiskPct}%)
                          </span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-rose-200 dark:bg-rose-950 overflow-hidden">
                          <div
                            className="h-full bg-rose-500 rounded-full transition-all duration-500"
                            style={{ width: `${highRiskPct}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-border-default text-xs text-text-secondary flex items-center justify-between">
                    <span>تحتاج متابعة فورية</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push('/attendance')}
                      className="text-xs text-brand-primary"
                    >
                      فتح جدول المتابعة ←
                    </Button>
                  </div>
                </div>

                {/* 2.2 Attendance Trends Weekly Chart */}
                <div className="lg:col-span-2 bg-bg-surface border border-border-default rounded-2xl p-5 shadow-card flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-base font-bold text-text-primary">
                          مسار الحضور الأسبوعي
                        </h3>
                        <p className="text-xs text-text-secondary mt-0.5">
                          تطور الحضور بين القداس الإلهي ومدارس الأحد
                        </p>
                      </div>

                      {/* Legend */}
                      <div className="flex items-center gap-3 text-xs font-medium">
                        <div className="flex items-center gap-1.5">
                          <div className="w-3 h-3 rounded-sm bg-brand-primary" />
                          <span>القداس الإلهي</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div className="w-3 h-3 rounded-sm bg-amber-500" />
                          <span>مدارس الأحد</span>
                        </div>
                      </div>
                    </div>

                    {/* Chart Columns */}
                    {analytics.attendanceTrends.length === 0 ? (
                      <div className="h-48 flex items-center justify-center text-xs text-text-tertiary">
                        لا توجد سجلات حضور كافية لعرض الرسم البياني
                      </div>
                    ) : (
                      <div className="h-48 flex items-end justify-between gap-3 pt-6 pb-2 px-2 border-b border-border-default">
                        {analytics.attendanceTrends.map((pt, idx) => {
                          const maxAttendees = Math.max(
                            ...analytics.attendanceTrends.map((t) =>
                              Math.max(t.massPresent, t.sundaySchoolPresent, 1)
                            )
                          );
                          const massHeight = Math.round((pt.massPresent / maxAttendees) * 100);
                          const ssHeight = Math.round((pt.sundaySchoolPresent / maxAttendees) * 100);

                          return (
                            <div
                              key={idx}
                              className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group"
                            >
                              <div className="w-full flex items-end justify-center gap-1 h-36">
                                {/* Mass Column */}
                                <div
                                  className="w-1/2 max-w-[16px] bg-brand-primary rounded-t-md transition-all group-hover:brightness-110 relative"
                                  style={{ height: `${Math.max(massHeight, 6)}%` }}
                                >
                                  <span className="opacity-0 group-hover:opacity-100 absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] font-bold bg-bg-surface px-1.5 py-0.5 rounded shadow border border-border-default z-10 transition-opacity">
                                    {pt.massPresent}
                                  </span>
                                </div>

                                {/* Sunday School Column */}
                                <div
                                  className="w-1/2 max-w-[16px] bg-amber-500 rounded-t-md transition-all group-hover:brightness-110 relative"
                                  style={{ height: `${Math.max(ssHeight, 6)}%` }}
                                >
                                  <span className="opacity-0 group-hover:opacity-100 absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] font-bold bg-bg-surface px-1.5 py-0.5 rounded shadow border border-border-default z-10 transition-opacity">
                                    {pt.sundaySchoolPresent}
                                  </span>
                                </div>
                              </div>

                              <span className="text-[11px] font-medium text-text-secondary truncate max-w-[60px]">
                                {pt.label}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div className="mt-4 pt-3 flex items-center justify-between text-xs text-text-secondary">
                    <span>إجمالي جلسات الرصد المسجلة: {analytics.attendanceTrends.length} أسابيع</span>
                    <span className="font-medium text-brand-primary">بيانات محدثة في الوقت الفعلي</span>
                  </div>
                </div>
              </div>

              {/* 3. Stage Comparison Matrix (for Sector & General Secretaries - Level 4+) */}
              {analytics.stageComparisons && analytics.stageComparisons.length > 0 && (
                <section className="bg-bg-surface border border-border-default rounded-2xl p-5 shadow-card space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-bold text-text-primary">
                        مصفوفة المقارنة التجميعية للمراحل (Sector Overview)
                      </h3>
                      <p className="text-xs text-text-secondary mt-0.5">
                        مقارنة الأداء العام ونسب الحضور والالتزام عبر مراحل القطاع
                      </p>
                    </div>
                    <Badge variant="primary">
                      {analytics.stageComparisons.length} مراحل
                    </Badge>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-right">
                      <thead>
                        <tr className="border-b border-border-default text-text-secondary text-xs">
                          <th className="py-3 px-4 font-bold">المرحلة</th>
                          <th className="py-3 px-4 font-bold">المخدومين</th>
                          <th className="py-3 px-4 font-bold">نسبة الحضور</th>
                          <th className="py-3 px-4 font-bold">التزام التحضير</th>
                          <th className="py-3 px-4 font-bold">تنبيهات الغياب</th>
                          <th className="py-3 px-4 font-bold">الحالة</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border-default">
                        {analytics.stageComparisons.map((st) => (
                          <tr
                            key={st.stageId}
                            className="hover:bg-bg-muted/40 transition-colors"
                          >
                            <td className="py-3 px-4 font-semibold text-text-primary">
                              {st.stageName}
                            </td>
                            <td className="py-3 px-4 text-text-secondary font-medium">
                              {st.membersCount}
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-xs">{st.attendanceRate}%</span>
                                <div className="w-16 h-1.5 rounded-full bg-bg-muted overflow-hidden">
                                  <div
                                    className={`h-full rounded-full ${
                                      st.attendanceRate >= 75
                                        ? 'bg-emerald-500'
                                        : st.attendanceRate >= 50
                                        ? 'bg-amber-500'
                                        : 'bg-rose-500'
                                    }`}
                                    style={{ width: `${st.attendanceRate}%` }}
                                  />
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-4 font-medium text-xs">
                              {st.prepCompliance}%
                            </td>
                            <td className="py-3 px-4">
                              {st.activeAlertsCount > 0 ? (
                                <Badge variant="warning">
                                  {st.activeAlertsCount} تنبيهات
                                </Badge>
                              ) : (
                                <span className="text-xs text-text-tertiary">لا توجد</span>
                              )}
                            </td>
                            <td className="py-3 px-4">
                              <Badge
                                variant={
                                  st.attendanceRate >= 75
                                    ? 'success'
                                    : st.attendanceRate >= 50
                                    ? 'warning'
                                    : 'danger'
                                }
                              >
                                {st.attendanceRate >= 75
                                  ? 'أداء متميز'
                                  : st.attendanceRate >= 50
                                  ? 'متوسط'
                                  : 'يحتاج متابعة'}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}
            </>
          )}
        </main>

        {/* Export Report Modal */}
        <ExportReportModal
          isOpen={isExportModalOpen}
          onClose={() => setIsExportModalOpen(false)}
          stageId={selectedStageId}
          stageName={currentStageName}
          userRoleLevel={user?.role?.level || 1}
        />

        {/* Bottom TabBar Navigation */}
        <TabBar activeTab="dashboard" onTabChange={(tab) => {
          if (tab === 'dashboard') router.push('/dashboard');
          if (tab === 'members') router.push('/members');
          if (tab === 'attendance') router.push('/attendance');
          if (tab === 'plan') router.push('/plan');
          if (tab === 'profile') router.push('/dashboard');
        }} />
      </div>
    </ProtectedRoute>
  );
}
