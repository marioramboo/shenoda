'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import {
  Shield,
  ShieldAlert,
  Users,
  Activity,
  Key,
  UserCheck,
  UserX,
  UserPlus,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Database,
  Server,
  Layers,
  Eye,
  FileEdit,
  ArrowRightLeft,
  X,
  Lock,
  Phone,
  Mail,
  SlidersHorizontal,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';

interface OverviewStats {
  totalUsers: number;
  activeUsers: number;
  suspendedUsers: number;
  rolesDistribution: {
    admin: number;
    generalSecretary: number;
    stageSecretary: number;
    servant: number;
  };
  totalMembers: number;
  totalStages: number;
  totalSectors: number;
  activity24h: {
    memberModifications: number;
    accountStatusChanges: number;
    sensitiveDataAccess: number;
    totalAuditEvents: number;
  };
}

interface SystemHealth {
  status: string;
  uptimeSeconds: number;
  nodeVersion: string;
  memoryUsageMb: number;
  database: string;
  timestamp: string;
}

interface AuditLogEvent {
  id: string;
  logType: 'MEMBER_AUDIT' | 'ACCOUNT_STATUS' | 'SENSITIVE_ACCESS';
  actionName: string;
  actor: {
    id: string;
    name: string;
    phone?: string;
    roleName?: string;
  };
  target: {
    id: string;
    name: string;
    type: string;
  };
  details: {
    fieldName?: string;
    oldValue?: string;
    newValue?: string;
    previousStatus?: string;
    newStatus?: string;
    reason?: string;
    field?: string;
    accessType?: string;
    ipAddress?: string;
  };
  createdAt: string;
}

interface AdminAccount {
  id: string;
  fullName: string;
  phoneNumber: string;
  email: string | null;
  status: 'ACTIVE' | 'SUSPENDED';
  whatsappPhone?: string | null;
  role: {
    id: string;
    name: string;
    code: string;
    level: number;
  };
  scopes?: Array<{
    stageName?: string;
    sectorName?: string;
  }>;
  createdAt: string;
}

export function AdminCommandCenter() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'audit' | 'accounts' | 'system'>('overview');

  // Stats & System Health
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  const [loadingOverview, setLoadingOverview] = useState(true);

  // Audit Logs
  const [auditLogs, setAuditLogs] = useState<AuditLogEvent[]>([]);
  const [auditType, setAuditType] = useState<string>('ALL');
  const [auditSearch, setAuditSearch] = useState<string>('');
  const [loadingAudit, setLoadingAudit] = useState(false);

  // Accounts
  const [accounts, setAccounts] = useState<AdminAccount[]>([]);
  const [accountsSearch, setAccountsSearch] = useState<string>('');
  const [accountsRoleFilter, setAccountsRoleFilter] = useState<string>('ALL');
  const [loadingAccounts, setLoadingAccounts] = useState(false);

  // Reset Password Modal
  const [resetModalUser, setResetModalUser] = useState<AdminAccount | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetMsg, setResetMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Create Account Modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    fullName: '',
    phoneNumber: '',
    email: '',
    roleCode: 'SERVANT',
    temporaryPassword: 'InitPassword2026!',
  });
  const [createLoading, setCreateLoading] = useState(false);
  const [createMsg, setCreateMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Status Action Loading
  const [statusActionLoadingId, setStatusActionLoadingId] = useState<string | null>(null);

  // Load Overview Data
  const fetchOverview = async () => {
    try {
      setLoadingOverview(true);
      const res = await api.get('/api/v1/admin/overview');
      if (res.data?.success) {
        setStats(res.data.stats);
        setSystemHealth(res.data.systemHealth);
      }
    } catch (err: any) {
      console.error('Failed to load admin overview:', err);
    } finally {
      setLoadingOverview(false);
    }
  };

  // Load Audit Logs
  const fetchAuditLogs = async () => {
    try {
      setLoadingAudit(true);
      const res = await api.get('/api/v1/admin/audit-logs', {
        params: {
          type: auditType,
          search: auditSearch.trim() || undefined,
          limit: 100,
        },
      });
      if (res.data?.success && Array.isArray(res.data.logs)) {
        setAuditLogs(res.data.logs);
      }
    } catch (err: any) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setLoadingAudit(false);
    }
  };

  // Load Accounts
  const fetchAccounts = async () => {
    try {
      setLoadingAccounts(true);
      const res = await api.get('/api/v1/admin/accounts', {
        params: {
          roleCode: accountsRoleFilter !== 'ALL' ? accountsRoleFilter : undefined,
          search: accountsSearch.trim() || undefined,
        },
      });
      if (res.data?.success && Array.isArray(res.data.accounts)) {
        setAccounts(res.data.accounts);
      }
    } catch (err: any) {
      console.error('Failed to load accounts:', err);
    } finally {
      setLoadingAccounts(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, []);

  useEffect(() => {
    if (activeTab === 'audit') fetchAuditLogs();
    if (activeTab === 'accounts') fetchAccounts();
  }, [activeTab, auditType, accountsRoleFilter]);

  // Handle direct password reset
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetModalUser || !newPassword) return;
    setResetLoading(true);
    setResetMsg(null);
    try {
      const res = await api.post('/api/v1/admin/reset-password', {
        targetUserId: resetModalUser.id,
        newPassword,
      });
      if (res.data?.success) {
        setResetMsg({ type: 'success', text: res.data.message || 'تم تحديث كلمة المرور بنجاح!' });
        setTimeout(() => {
          setResetModalUser(null);
          setNewPassword('');
          setResetMsg(null);
        }, 1200);
      }
    } catch (err: any) {
      setResetMsg({
        type: 'error',
        text: err.response?.data?.error?.message || 'فشل إعادة تعيين كلمة المرور',
      });
    } finally {
      setResetLoading(false);
    }
  };

  // Handle account status toggle (suspend / activate)
  const handleToggleStatus = async (account: AdminAccount) => {
    const action = account.status === 'ACTIVE' ? 'SUSPEND' : 'ACTIVATE';
    const confirmText =
      action === 'SUSPEND'
        ? `هل أنت متأكد من إيقاف حساب (${account.fullName})؟ سيتم إنهاء جلساته فورياً.`
        : `هل أنت متأكد من إعادة تفعيل حساب (${account.fullName})؟`;

    if (!window.confirm(confirmText)) return;

    setStatusActionLoadingId(account.id);
    try {
      const res = await api.post('/api/v1/admin/update-status', {
        targetUserId: account.id,
        action,
        reason: action === 'SUSPEND' ? 'إيقاف إداري بواسطة مدير النظام' : 'تفعيل بواسطة مدير النظام',
      });
      if (res.data?.success) {
        setAccounts((prev) =>
          prev.map((a) => (a.id === account.id ? { ...a, status: res.data.status } : a))
        );
        fetchOverview();
      }
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'فشل تحديث حالة الحساب');
    } finally {
      setStatusActionLoadingId(null);
    }
  };

  // Handle create account
  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateLoading(true);
    setCreateMsg(null);
    try {
      const res = await api.post('/api/v1/admin/create-account', createForm);
      if (res.data?.success) {
        setCreateMsg({ type: 'success', text: res.data.message || 'تم إنشاء الحساب بنجاح!' });
        fetchAccounts();
        fetchOverview();
        setTimeout(() => {
          setIsCreateModalOpen(false);
          setCreateForm({
            fullName: '',
            phoneNumber: '',
            email: '',
            roleCode: 'SERVANT',
            temporaryPassword: 'InitPassword2026!',
          });
          setCreateMsg(null);
        }, 1200);
      }
    } catch (err: any) {
      setCreateMsg({
        type: 'error',
        text: err.response?.data?.error?.message || 'فشل إنشاء الحساب',
      });
    } finally {
      setCreateLoading(false);
    }
  };

  const formatTimeAgo = (dateStr: string) => {
    const d = new Date(dateStr);
    const diffMs = Date.now() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'الآن';
    if (diffMins < 60) return `منذ ${diffMins} دقيقة`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `منذ ${diffHours} ساعة`;
    const diffDays = Math.floor(diffHours / 24);
    return `منذ ${diffDays} يوم`;
  };

  return (
    <div dir="rtl" className="w-full max-w-5xl mx-auto px-4 py-6 flex flex-col gap-6">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-900/90 via-amber-800 to-amber-950 text-white p-6 shadow-xl border border-amber-500/30">
        <div className="absolute top-0 left-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center shadow-inner">
              <ShieldAlert className="w-8 h-8 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight">مركز القيادة والرقابة الشاملة</h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-400 text-amber-950 uppercase tracking-wide">
                  مدير النظام (Level 6)
                </span>
              </div>
              <p className="text-amber-200/90 text-sm mt-0.5">
                أهلاً بك يا {user?.fullName || 'مدير النظام'} — الصلاحيات العليا وسجل الرقابة المباشرة فوق الجميع
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto">
            <button
              onClick={() => {
                fetchOverview();
                if (activeTab === 'audit') fetchAuditLogs();
                if (activeTab === 'accounts') fetchAccounts();
              }}
              className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-sm font-semibold flex items-center gap-1.5 transition-all shadow-sm"
              title="تحديث البيانات"
            >
              <RefreshCw className="w-4 h-4" />
              <span>تحديث حي</span>
            </button>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-amber-950 text-sm font-bold flex items-center gap-1.5 transition-all shadow-md hover:shadow-lg"
            >
              <UserPlus className="w-4 h-4" />
              <span>إضافة حساب جديد</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 mt-6 pt-4 border-t border-amber-500/20 overflow-x-auto pb-1">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${
              activeTab === 'overview'
                ? 'bg-amber-400 text-amber-950 shadow-sm'
                : 'text-amber-200 hover:bg-white/10'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>نظرة عامة والنشاط</span>
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${
              activeTab === 'audit'
                ? 'bg-amber-400 text-amber-950 shadow-sm'
                : 'text-amber-200 hover:bg-white/10'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>سجل التغييرات الحية</span>
            {stats && stats.activity24h.totalAuditEvents > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-red-500 text-white font-bold">
                {stats.activity24h.totalAuditEvents}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('accounts')}
            className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${
              activeTab === 'accounts'
                ? 'bg-amber-400 text-amber-950 shadow-sm'
                : 'text-amber-200 hover:bg-white/10'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>إدارة الحسابات والأمان</span>
          </button>
          <button
            onClick={() => setActiveTab('system')}
            className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${
              activeTab === 'system'
                ? 'bg-amber-400 text-amber-950 shadow-sm'
                : 'text-amber-200 hover:bg-white/10'
            }`}
          >
            <Server className="w-4 h-4" />
            <span>حالة الخوادم وقاعدة البيانات</span>
          </button>
        </div>
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="flex flex-col gap-6">
          {/* Key KPI Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="bg-bg-surface border border-border-default rounded-xl p-3.5 shadow-sm text-center">
              <span className="text-caption text-text-secondary">إجمالي المستخدمين</span>
              <p className="text-2xl font-bold text-text-primary mt-1">{stats?.totalUsers ?? '—'}</p>
              <span className="text-[11px] text-emerald-600 font-semibold">{stats?.activeUsers ?? 0} نشط</span>
            </div>
            <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-3.5 shadow-sm text-center">
              <span className="text-caption text-amber-700 dark:text-amber-400 font-bold">مدراء النظام (Admins)</span>
              <p className="text-2xl font-bold text-amber-600 mt-1">{stats?.rolesDistribution.admin ?? 2}</p>
              <span className="text-[11px] text-amber-600/80 font-medium">جورج وماريو</span>
            </div>
            <div className="bg-bg-surface border border-border-default rounded-xl p-3.5 shadow-sm text-center">
              <span className="text-caption text-text-secondary">الأمانة العامة</span>
              <p className="text-2xl font-bold text-text-primary mt-1">{stats?.rolesDistribution.generalSecretary ?? '—'}</p>
              <span className="text-[11px] text-text-muted font-medium">الأمين العام</span>
            </div>
            <div className="bg-bg-surface border border-border-default rounded-xl p-3.5 shadow-sm text-center">
              <span className="text-caption text-text-secondary">أمناء المراحل</span>
              <p className="text-2xl font-bold text-text-primary mt-1">{stats?.rolesDistribution.stageSecretary ?? '—'}</p>
              <span className="text-[11px] text-text-muted font-medium">أمناء الخدمة</span>
            </div>
            <div className="bg-bg-surface border border-border-default rounded-xl p-3.5 shadow-sm text-center">
              <span className="text-caption text-text-secondary">الخدام المباشرين</span>
              <p className="text-2xl font-bold text-text-primary mt-1">{stats?.rolesDistribution.servant ?? '—'}</p>
              <span className="text-[11px] text-text-muted font-medium">خدام الفصول</span>
            </div>
            <div className="bg-bg-surface border border-border-default rounded-xl p-3.5 shadow-sm text-center">
              <span className="text-caption text-text-secondary">المخدومين</span>
              <p className="text-2xl font-bold text-brand-primary mt-1">{stats?.totalMembers ?? '—'}</p>
              <span className="text-[11px] text-brand-primary font-medium">{stats?.totalStages ?? 0} مراحل</span>
            </div>
          </div>

          {/* 24-Hour Activity Highlight */}
          <div className="bg-bg-surface border border-border-default rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-border-default">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-brand-primary" />
                <h2 className="text-base font-bold text-text-primary">نشاط النظام خلال آخر 24 ساعة</h2>
              </div>
              <button
                onClick={() => setActiveTab('audit')}
                className="text-xs font-bold text-brand-primary hover:underline flex items-center gap-1"
              >
                <span>عرض السجل المفصل</span>
                <span>←</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <div className="p-3.5 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center gap-3">
                <FileEdit className="w-8 h-8 text-blue-600" />
                <div>
                  <span className="text-xs text-text-secondary font-medium">تعديلات بيانات المخدومين</span>
                  <p className="text-xl font-bold text-text-primary mt-0.5">
                    {stats?.activity24h.memberModifications ?? 0} تعديل
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center gap-3">
                <ArrowRightLeft className="w-8 h-8 text-amber-600" />
                <div>
                  <span className="text-xs text-text-secondary font-medium">تغيير حالات ونقل الحسابات</span>
                  <p className="text-xl font-bold text-text-primary mt-0.5">
                    {stats?.activity24h.accountStatusChanges ?? 0} حركة
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-3">
                <Eye className="w-8 h-8 text-emerald-600" />
                <div>
                  <span className="text-xs text-text-secondary font-medium">عمليات الوصول للبيانات الحساسة</span>
                  <p className="text-xl font-bold text-text-primary mt-0.5">
                    {stats?.activity24h.sensitiveDataAccess ?? 0} وصول
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: AUDIT LOGS */}
      {activeTab === 'audit' && (
        <div className="flex flex-col gap-4">
          <div className="bg-bg-surface border border-border-default rounded-xl p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-600" />
              <h2 className="text-base font-bold text-text-primary">سجل الرقابة والتغييرات المباشرة</h2>
              <span className="text-caption text-text-secondary">({auditLogs.length} حركة مسجلة)</span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={auditType}
                onChange={(e) => setAuditType(e.target.value)}
                className="px-3 py-1.5 rounded-lg border border-border-default bg-bg-app text-xs font-bold text-text-primary focus:outline-none"
              >
                <option value="ALL">جميع أنواع الحركات</option>
                <option value="MEMBER_AUDIT">تعديلات بيانات المخدومين</option>
                <option value="ACCOUNT_STATUS">نقل وتعديل حالات الحسابات</option>
                <option value="SENSITIVE_ACCESS">الاطلاع على بيانات حساسة</option>
              </select>

              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute right-2.5 top-2.5 text-text-muted" />
                <input
                  type="text"
                  placeholder="بحث باسم الخادم أو المخدوم..."
                  value={auditSearch}
                  onChange={(e) => setAuditSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && fetchAuditLogs()}
                  className="pr-8 pl-3 py-1.5 rounded-lg border border-border-default bg-bg-app text-xs text-text-primary w-56 focus:outline-none focus:border-brand-primary"
                />
              </div>

              <button
                onClick={fetchAuditLogs}
                className="px-3 py-1.5 bg-brand-primary text-white rounded-lg text-xs font-bold hover:bg-brand-primary-hover flex items-center gap-1"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>تحديث</span>
              </button>
            </div>
          </div>

          {loadingAudit ? (
            <div className="text-center py-12 text-text-secondary text-sm">جارٍ جلب سجل الرقابة...</div>
          ) : auditLogs.length === 0 ? (
            <div className="bg-bg-surface border border-border-default rounded-xl p-8 text-center text-text-secondary text-sm">
              لم يتم العثور على حركات تطابق معايير البحث
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {auditLogs.map((log) => (
                <div
                  key={log.id}
                  className="bg-bg-surface border border-border-default rounded-xl p-4 shadow-sm hover:border-brand-primary/40 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-3"
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                        log.logType === 'MEMBER_AUDIT'
                          ? 'bg-blue-500/10 text-blue-600'
                          : log.logType === 'ACCOUNT_STATUS'
                          ? 'bg-amber-500/10 text-amber-600'
                          : 'bg-emerald-500/10 text-emerald-600'
                      }`}
                    >
                      {log.logType === 'MEMBER_AUDIT' && <FileEdit className="w-4 h-4" />}
                      {log.logType === 'ACCOUNT_STATUS' && <ArrowRightLeft className="w-4 h-4" />}
                      {log.logType === 'SENSITIVE_ACCESS' && <Eye className="w-4 h-4" />}
                    </span>

                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-text-primary">{log.actionName}</span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-bg-muted text-text-secondary">
                          {formatTimeAgo(log.createdAt)}
                        </span>
                      </div>

                      <div className="text-xs text-text-secondary flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span>
                          بواسطة: <strong className="text-text-primary">{log.actor.name}</strong>{' '}
                          {log.actor.roleName && `(${log.actor.roleName})`}
                        </span>
                        <span>•</span>
                        <span>
                          المستهدف: <strong className="text-text-primary">{log.target.name}</strong> ({log.target.type})
                        </span>
                      </div>

                      {/* Diff Details */}
                      {log.logType === 'MEMBER_AUDIT' && log.details.oldValue !== undefined && (
                        <div className="mt-1 text-xs bg-bg-muted p-2 rounded-lg font-mono flex items-center gap-2">
                          <span className="text-red-500 line-through">{log.details.oldValue || '— (فارغ)'}</span>
                          <span className="text-text-muted">➔</span>
                          <span className="text-emerald-600 font-bold">{log.details.newValue || '— (فارغ)'}</span>
                        </div>
                      )}

                      {log.logType === 'ACCOUNT_STATUS' && log.details.reason && (
                        <div className="mt-1 text-xs text-text-secondary bg-bg-muted p-2 rounded-lg">
                          السبب: <span className="font-medium text-text-primary">{log.details.reason}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="text-left text-[11px] text-text-muted self-end md:self-auto font-mono">
                    {new Date(log.createdAt).toLocaleString('ar-EG')}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: ACCOUNTS MANAGEMENT */}
      {activeTab === 'accounts' && (
        <div className="flex flex-col gap-4">
          <div className="bg-bg-surface border border-border-default rounded-xl p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-brand-primary" />
              <h2 className="text-base font-bold text-text-primary">إدارة الحسابات الشاملة</h2>
              <span className="text-caption text-text-secondary">({accounts.length} حساب)</span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={accountsRoleFilter}
                onChange={(e) => setAccountsRoleFilter(e.target.value)}
                className="px-3 py-1.5 rounded-lg border border-border-default bg-bg-app text-xs font-bold text-text-primary focus:outline-none"
              >
                <option value="ALL">جميع الرتب</option>
                <option value="ADMIN">مدير النظام (Admin)</option>
                <option value="GENERAL_SECRETARY">أمين عام</option>
                <option value="STAGE_SECRETARY">أمين خدمة</option>
                <option value="SERVANT">خادم</option>
              </select>

              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute right-2.5 top-2.5 text-text-muted" />
                <input
                  type="text"
                  placeholder="بحث بالاسم أو الهاتف..."
                  value={accountsSearch}
                  onChange={(e) => setAccountsSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && fetchAccounts()}
                  className="pr-8 pl-3 py-1.5 rounded-lg border border-border-default bg-bg-app text-xs text-text-primary w-52 focus:outline-none focus:border-brand-primary"
                />
              </div>

              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-amber-950 font-bold rounded-lg text-xs flex items-center gap-1 shadow-sm"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>إضافة حساب</span>
              </button>
            </div>
          </div>

          {loadingAccounts ? (
            <div className="text-center py-12 text-text-secondary text-sm">جارٍ تحميل الحسابات...</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {accounts.map((acc) => {
                const isAdmin = acc.role.code === 'ADMIN' || acc.role.level >= 6;
                return (
                  <div
                    key={acc.id}
                    className={`bg-bg-surface border rounded-xl p-4 shadow-sm flex flex-col justify-between gap-3 transition-all ${
                      isAdmin ? 'border-amber-500/50 bg-amber-500/[0.02]' : 'border-border-default'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-11 h-11 rounded-full flex items-center justify-center font-bold text-base shrink-0 ${
                            isAdmin
                              ? 'bg-amber-500/20 text-amber-600 border border-amber-500/40 shadow-inner'
                              : 'bg-brand-primary-soft text-brand-primary'
                          }`}
                        >
                          {acc.fullName.charAt(0)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-sm text-text-primary">{acc.fullName}</h3>
                            {isAdmin && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500 text-amber-950">
                                مدير النظام ⚡
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-text-secondary font-mono mt-0.5">{acc.phoneNumber}</p>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1">
                        <Badge
                          variant={acc.status === 'ACTIVE' ? 'success' : 'danger'}
                          className="text-[10px]"
                        >
                          {acc.status === 'ACTIVE' ? 'نشط' : 'موقوف'}
                        </Badge>
                        <span className="text-[11px] text-text-muted font-medium">{acc.role.name}</span>
                      </div>
                    </div>

                    {/* Scopes */}
                    {acc.scopes && acc.scopes.length > 0 && (
                      <div className="text-xs text-text-secondary bg-bg-muted p-2 rounded-lg flex flex-wrap gap-1.5">
                        {acc.scopes.map((sc, idx) => (
                          <span key={idx} className="bg-bg-surface px-2 py-0.5 rounded text-[11px] font-medium border border-border-default">
                            {sc.stageName || sc.sectorName || 'مرحلة'}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Admin Action Buttons */}
                    <div className="pt-2 border-t border-border-default flex items-center justify-between gap-2">
                      <button
                        onClick={() => {
                          setResetModalUser(acc);
                          setNewPassword('');
                          setResetMsg(null);
                        }}
                        className="text-xs font-bold text-brand-primary hover:text-brand-primary-hover flex items-center gap-1 px-2.5 py-1.5 rounded-lg hover:bg-brand-primary-soft transition-colors"
                      >
                        <Key className="w-3.5 h-3.5" />
                        <span>تعيين كلمة المرور</span>
                      </button>

                      <button
                        disabled={statusActionLoadingId === acc.id}
                        onClick={() => handleToggleStatus(acc)}
                        className={`text-xs font-bold flex items-center gap-1 px-2.5 py-1.5 rounded-lg transition-colors ${
                          acc.status === 'ACTIVE'
                            ? 'text-red-600 hover:bg-red-500/10'
                            : 'text-emerald-600 hover:bg-emerald-500/10'
                        }`}
                      >
                        {acc.status === 'ACTIVE' ? (
                          <>
                            <UserX className="w-3.5 h-3.5" />
                            <span>إيقاف الحساب</span>
                          </>
                        ) : (
                          <>
                            <UserCheck className="w-3.5 h-3.5" />
                            <span>تفعيل الحساب</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: SYSTEM & SERVERS */}
      {activeTab === 'system' && (
        <div className="flex flex-col gap-4">
          <div className="bg-bg-surface border border-border-default rounded-xl p-6 shadow-sm flex flex-col gap-5">
            <div className="flex items-center gap-2 pb-3 border-b border-border-default">
              <Server className="w-5 h-5 text-emerald-600" />
              <h2 className="text-base font-bold text-text-primary">حالة الخوادم والاتصال السحابي</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-bg-muted p-4 rounded-xl border border-border-default flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Database className="w-5 h-5 text-blue-600" />
                    <span className="font-bold text-sm text-text-primary">قاعدة البيانات (Neon PostgreSQL)</span>
                  </div>
                  <Badge variant="success">متصلة (Healthy)</Badge>
                </div>
                <p className="text-xs text-text-secondary mt-1">
                  قاعدة البيانات المستضافة عبر Neon Serverless تعمل بكفاءة واستجابة سريعة.
                </p>
              </div>

              <div className="bg-bg-muted p-4 rounded-xl border border-border-default flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Server className="w-5 h-5 text-purple-600" />
                    <span className="font-bold text-sm text-text-primary">خادم التطبيق (Render Web Service)</span>
                  </div>
                  <Badge variant="success">قيد التشغيل (Live)</Badge>
                </div>
                <div className="text-xs text-text-secondary mt-1 flex flex-col gap-1 font-mono">
                  <span>إصدار Node.js: {systemHealth?.nodeVersion || process.version}</span>
                  <span>الذاكرة المستخدمة: {systemHealth?.memoryUsageMb ?? '—'} MB</span>
                  <span>مدة العمل المستمر: {Math.floor((systemHealth?.uptimeSeconds || 0) / 60)} دقيقة</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: RESET PASSWORD DIRECTLY */}
      {resetModalUser && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-bg-surface border border-border-default rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-border-default">
              <div className="flex items-center gap-2">
                <Key className="w-5 h-5 text-amber-600" />
                <h3 className="font-bold text-base text-text-primary">تعيين كلمة مرور جديدة</h3>
              </div>
              <button
                onClick={() => setResetModalUser(null)}
                className="p-1 rounded-lg text-text-muted hover:text-text-primary"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleResetPassword} className="flex flex-col gap-4 mt-4">
              <p className="text-xs text-text-secondary">
                أنت تقوم بتعيين كلمة مرور مباشرة للمستخدم:{' '}
                <strong className="text-text-primary">{resetModalUser.fullName}</strong> ({resetModalUser.phoneNumber}).
                لا يشترط معرفة كلمة المرور القديمة، وسيتم إنهاء جلساته الحالية فورياً ليدخل بالجديدة.
              </p>

              <div>
                <label className="text-xs font-bold text-text-secondary block mb-1">كلمة المرور الجديدة</label>
                <div className="flex items-center gap-2">
                  <Input
                    type="text"
                    required
                    placeholder="أدخل كلمة مرور قوية (8 أحرف على الأقل)..."
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const rand = 'AdminPass' + Math.floor(1000 + Math.random() * 9000) + '!';
                      setNewPassword(rand);
                    }}
                    className="px-2.5 py-2 rounded-lg bg-bg-muted hover:bg-border-default text-xs font-bold text-text-primary shrink-0"
                    title="توليد كلمة مرور عشوائية"
                  >
                    توليد
                  </button>
                </div>
              </div>

              {resetMsg && (
                <div
                  className={`p-3 rounded-lg text-xs font-bold flex items-center gap-2 ${
                    resetMsg.type === 'success'
                      ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                      : 'bg-red-500/10 text-red-600 border border-red-500/20'
                  }`}
                >
                  {resetMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                  <span>{resetMsg.text}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setResetModalUser(null)}
                >
                  إلغاء
                </Button>
                <Button type="submit" isLoading={resetLoading} className="bg-amber-600 hover:bg-amber-500 text-white font-bold">
                  حفظ كلمة المرور
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CREATE ACCOUNT (ANY ROLE) */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-bg-surface border border-border-default rounded-2xl w-full max-w-lg p-6 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-border-default">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-amber-600" />
                <h3 className="font-bold text-base text-text-primary">إضافة حساب جديد (صلاحيات المدير)</h3>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 rounded-lg text-text-muted hover:text-text-primary"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateAccount} className="flex flex-col gap-4 mt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-text-secondary block mb-1">الاسم بالكامل *</label>
                  <Input
                    type="text"
                    required
                    placeholder="مثال: بيشوي عادل"
                    value={createForm.fullName}
                    onChange={(e) => setCreateForm({ ...createForm, fullName: e.target.value })}
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-text-secondary block mb-1">رقم الهاتف (مصر) *</label>
                  <Input
                    type="text"
                    required
                    placeholder="مثال: 01xxxxxxxxx"
                    value={createForm.phoneNumber}
                    onChange={(e) => setCreateForm({ ...createForm, phoneNumber: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-text-secondary block mb-1">البريد الإلكتروني (اختياري)</label>
                  <Input
                    type="email"
                    placeholder="name@church.com"
                    value={createForm.email}
                    onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-text-secondary block mb-1">الرتبة الكنسية / الدور *</label>
                  <select
                    value={createForm.roleCode}
                    onChange={(e) => setCreateForm({ ...createForm, roleCode: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-border-default bg-bg-app text-sm font-bold text-text-primary focus:outline-none"
                  >
                    <option value="SERVANT">خادم (Servant - Level 1)</option>
                    <option value="ASSISTANT_SECRETARY">مساعد أمين الخدمة (Level 2)</option>
                    <option value="STAGE_SECRETARY">أمين الخدمة / أمين مرحلة (Level 3)</option>
                    <option value="SECTOR_SECRETARY">أمين قطاع (Level 4)</option>
                    <option value="GENERAL_SECRETARY">أمين عام (General Secretary - Level 5)</option>
                    <option value="ADMIN">مدير النظام (Admin - Level 6)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-text-secondary block mb-1">كلمة المرور المؤقتة *</label>
                <Input
                  type="text"
                  required
                  value={createForm.temporaryPassword}
                  onChange={(e) => setCreateForm({ ...createForm, temporaryPassword: e.target.value })}
                />
              </div>

              {createMsg && (
                <div
                  className={`p-3 rounded-lg text-xs font-bold flex items-center gap-2 ${
                    createMsg.type === 'success'
                      ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                      : 'bg-red-500/10 text-red-600 border border-red-500/20'
                  }`}
                >
                  {createMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                  <span>{createMsg.text}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateModalOpen(false)}
                >
                  إلغاء
                </Button>
                <Button type="submit" isLoading={createLoading} className="bg-amber-600 hover:bg-amber-500 text-white font-bold">
                  إنشاء الحساب
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
