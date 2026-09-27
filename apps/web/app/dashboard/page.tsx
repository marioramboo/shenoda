'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { api } from '@/lib/api';
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
  Mail,
  Users,
  ChevronLeft,
} from 'lucide-react';
import { TabBar } from '@/components/layout/TabBar';

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const router = useRouter();

  // Account creation modal state
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

  const handleLogout = async () => {
    await logout();
    router.replace('/login');
  };

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);
    setCreateSuccess(null);

    // In a real app we lookup roleId by code or pass code/ID
    // Let's resolve role and stage IDs
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

  return (
    <ProtectedRoute>
      <div dir="rtl" className="min-h-screen bg-bg-app flex flex-col items-center p-4 sm:p-6 pb-24">
        <div className="w-full max-w-[480px] flex flex-col gap-5">
          {/* Header Bar */}
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
                  {user?.phoneNumber}
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

          {/* Servant Role & Scope Summary Card */}
          <section className="bg-bg-surface border border-border-default rounded-card p-5 shadow-card flex flex-col gap-4 text-right">
            <div className="flex items-center justify-between pb-3 border-b border-border-default">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-brand-accent" />
                <h2 className="text-h2 font-semibold text-text-primary">الرتبة والصلاحية</h2>
              </div>
              <Badge variant="accent">
                المستوى {user?.role.level}: {user?.role.name}
              </Badge>
            </div>

            {/* Scopes Section */}
            <div className="flex flex-col gap-2.5">
              <span className="text-caption font-semibold text-text-secondary">
                النطاق الإداري المصرح به (Scope):
              </span>

              {user?.scopes.stages && user.scopes.stages.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-body-small text-text-secondary">المراحل:</span>
                  {user.scopes.stages.map((stg) => (
                    <span
                      key={stg.id}
                      className="px-2.5 py-1 bg-brand-primary-soft text-brand-primary rounded-pill text-caption font-medium border border-[#D0DFEF]"
                    >
                      {stg.name}
                    </span>
                  ))}
                </div>
              )}

              {user?.scopes.sectors && user.scopes.sectors.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-body-small text-text-secondary">القطاعات:</span>
                  {user.scopes.sectors.map((sec) => (
                    <span
                      key={sec.id}
                      className="px-2.5 py-1 bg-bg-muted text-text-primary rounded-pill text-caption font-medium border border-border-default"
                    >
                      {sec.name}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* Members Roster Quick Access (Phase 3) */}
          <section className="bg-bg-surface border border-border-default rounded-card p-5 shadow-card flex flex-col gap-3 text-right">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-brand-primary" />
                <h2 className="text-h2 font-semibold text-text-primary">سجل المخدومين</h2>
              </div>
              <Badge variant="neutral">المرحلة النشطة</Badge>
            </div>

            <p className="text-body-small text-text-secondary leading-relaxed">
              عرض سجلات المخدومين والمتابعة والتقييم الروحي والسلوكي المباشر.
            </p>

            <Button
              variant="primary"
              onClick={() => router.push('/members')}
              className="h-[44px] gap-2 mt-1 justify-between font-semibold"
            >
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                <span>فتح قائمة المخدومين</span>
              </div>
              <ChevronLeft className="w-4 h-4" />
            </Button>
          </section>

          {/* Secretary Actions (Assumption A7 & FR-1.2: Scoped Account Creation) */}
          {user && user.role.level >= 3 && (
            <section className="bg-bg-surface border border-border-default rounded-card p-5 shadow-card flex flex-col gap-3 text-right">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-brand-primary" />
                <h2 className="text-h2 font-semibold text-text-primary">إدارة الحسابات المصرحة</h2>
              </div>

              <p className="text-body-small text-text-secondary leading-relaxed">
                بصفتك ({user.role.name})، يمكنك إنشاء وتفعيل حسابات الخدام التابعين لنطاقك الإشرافي (طبقا للبند FR-1.2 والفرضية A7).
              </p>

              <Button
                variant="outline"
                onClick={() => setIsCreateModalOpen(true)}
                className="h-[44px] gap-2 mt-1"
              >
                <UserPlus className="w-4 h-4" />
                <span>إنشاء حساب خادم جديد</span>
              </Button>
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
                    placeholder="مثال: بيتر عادل منصور"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />

                  <Input
                    label="رقم الهاتف (مصري)"
                    placeholder="01xxxxxxxxx"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    iconLeading={<Phone className="w-4 h-4" />}
                    required
                  />

                  <Input
                    label="البريد الإلكتروني (اختياري)"
                    placeholder="servant@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    iconLeading={<Mail className="w-4 h-4" />}
                  />

                  {/* Role Selector */}
                  <div className="flex flex-col gap-1.5 text-right">
                    <label className="text-body-small font-medium text-text-primary">
                      الرتبة الممنوحة
                    </label>
                    <select
                      value={roleCode}
                      onChange={(e) => setRoleCode(e.target.value)}
                      className="w-full h-[46px] bg-bg-surface text-text-primary font-cairo text-body-default rounded-input border border-border-default px-3 focus:outline-none focus:ring-2 focus:ring-brand-primary"
                    >
                      <option value="SERVANT">خادم (المستوى 1)</option>
                      {user && user.role.level >= 3 && (
                        <option value="ASSISTANT_SECRETARY">مساعد امين الخدمة (المستوى 2)</option>
                      )}
                    </select>
                  </div>

                  <Input
                    label="كلمة المرور المؤقتة"
                    value={tempPassword}
                    onChange={(e) => setTempPassword(e.target.value)}
                    iconLeading={<Lock className="w-4 h-4" />}
                    required
                  />

                  <div className="flex items-center gap-2 mt-2">
                    <Button
                      type="submit"
                      variant="primary"
                      fullWidth
                      isLoading={createLoading}
                      className="h-[44px]"
                    >
                      تأكيد إنشاء الحساب
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsCreateModalOpen(false)}
                      className="h-[44px]"
                    >
                      إلغاء
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Tab Bar */}
        <TabBar
          activeTab="dashboard"
          onTabChange={(tab) => {
            if (tab === 'members') router.push('/members');
            else if (tab === 'attendance') router.push('/attendance');
          }}
        />
      </div>
    </ProtectedRoute>
  );
}
