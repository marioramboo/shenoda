'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { TabBar } from '@/components/layout/TabBar';
import {
  User,
  Shield,
  Phone,
  Mail,
  LogOut,
  Calendar,
  Layers,
  ArrowRight,
  Lock,
  Heart,
  BookOpen,
  Award,
  ChevronLeft,
} from 'lucide-react';

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    try {
      setLoggingOut(true);
      await logout();
      router.replace('/login');
    } catch {
      router.replace('/login');
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <ProtectedRoute>
      <div dir="rtl" className="min-h-screen bg-bg-app flex flex-col items-center p-4 sm:p-6 pb-24">
        <div className="w-full max-w-[480px] flex flex-col gap-4">
          {/* Top Bar */}
          <header className="flex items-center justify-between bg-bg-surface border border-border-default rounded-card p-4 shadow-card">
            <div className="flex items-center gap-2.5">
              <Link
                href="/dashboard"
                className="w-9 h-9 rounded-button flex items-center justify-center text-text-secondary hover:bg-bg-muted transition-colors"
                title="العودة للوحة التحكم"
              >
                <ArrowRight className="w-5 h-5" />
              </Link>
              <div>
                <h1 className="text-h2 font-bold text-text-primary">الملف الشخصي للخدمة</h1>
                <p className="text-caption text-text-secondary">
                  بيانات الخادم والرتبة الإدارية والروحية
                </p>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              isLoading={loggingOut}
              className="text-status-danger hover:bg-status-danger-soft hover:border-[#F5C2BE] gap-1 text-caption h-[36px]"
            >
              <LogOut className="w-4 h-4" />
              <span>خروج</span>
            </Button>
          </header>

          {/* Profile Identity Card */}
          <section className="bg-bg-surface border border-border-default rounded-card p-5 shadow-card flex flex-col items-center text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-r from-brand-primary to-brand-primary-light opacity-90" />
            
            <div className="relative w-20 h-20 rounded-full bg-bg-surface border-4 border-bg-surface shadow-md flex items-center justify-center text-brand-primary font-bold text-2xl mb-3 mt-4">
              <User className="w-10 h-10 text-brand-primary" />
            </div>

            <h2 className="text-h1 font-bold text-text-primary">
              {user?.fullName || 'الخادم'}
            </h2>

            <div className="flex items-center gap-2 mt-2">
              <Badge variant="accent">
                {user?.role.name || 'خادم'}
              </Badge>
              <Badge variant="neutral">
                المستوى {user?.role.level ?? 1}
              </Badge>
            </div>

            {/* Quick Contact Info */}
            <div className="w-full mt-5 pt-4 border-t border-border-default grid grid-cols-1 gap-2.5 text-right text-body-small">
              <div className="flex items-center justify-between p-2.5 rounded-button bg-bg-muted">
                <span className="text-text-secondary text-caption flex items-center gap-1.5">
                  <Phone className="w-4 h-4 text-brand-primary" />
                  رقم الهاتف
                </span>
                <span className="font-semibold text-text-primary dir-ltr">
                  {user?.phoneNumber || '—'}
                </span>
              </div>

              {user?.email && (
                <div className="flex items-center justify-between p-2.5 rounded-button bg-bg-muted">
                  <span className="text-text-secondary text-caption flex items-center gap-1.5">
                    <Mail className="w-4 h-4 text-brand-primary" />
                    البريد الإلكتروني
                  </span>
                  <span className="font-semibold text-text-primary">
                    {user.email}
                  </span>
                </div>
              )}
            </div>
          </section>

          {/* Service Scope Card */}
          <section className="bg-bg-surface border border-border-default rounded-card p-5 shadow-card flex flex-col gap-3 text-right">
            <div className="flex items-center justify-between pb-2 border-b border-border-default">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-brand-primary" />
                <h3 className="text-h2 font-semibold text-text-primary">النطاق الإداري والخدمي</h3>
              </div>
              <Badge variant="primary">النطاق المصرح</Badge>
            </div>

            {user?.scopes.stages && user.scopes.stages.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <span className="text-caption font-semibold text-text-secondary">المراحل المسندة:</span>
                <div className="flex flex-wrap gap-2">
                  {user.scopes.stages.map((stg) => (
                    <span
                      key={stg.id}
                      className="px-3 py-1 bg-brand-primary-soft text-brand-primary rounded-pill text-caption font-medium border border-[#D0DFEF]"
                    >
                      {stg.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {user?.scopes.sectors && user.scopes.sectors.length > 0 && (
              <div className="flex flex-col gap-1.5 mt-2">
                <span className="text-caption font-semibold text-text-secondary">القطاعات الإشرافية:</span>
                <div className="flex flex-wrap gap-2">
                  {user.scopes.sectors.map((sec) => (
                    <span
                      key={sec.id}
                      className="px-3 py-1 bg-bg-muted text-text-primary rounded-pill text-caption font-medium border border-border-default"
                    >
                      {sec.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* Quick Links for Service Modules */}
          <section className="bg-bg-surface border border-border-default rounded-card p-5 shadow-card flex flex-col gap-2.5 text-right">
            <h3 className="text-h2 font-semibold text-text-primary mb-1">الوصول السريع لأقسام الخدمة</h3>

            <Link
              href="/members"
              className="flex items-center justify-between p-3 rounded-button bg-bg-muted hover:bg-[#EAE6DB] transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-brand-primary-soft flex items-center justify-center text-brand-primary">
                  <User className="w-4 h-4" />
                </div>
                <span className="text-body-default font-semibold text-text-primary">سجل المخدومين</span>
              </div>
              <ChevronLeft className="w-4 h-4 text-text-secondary" />
            </Link>

            <Link
              href="/attendance"
              className="flex items-center justify-between p-3 rounded-button bg-bg-muted hover:bg-[#EAE6DB] transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-brand-primary-soft flex items-center justify-center text-brand-primary">
                  <Calendar className="w-4 h-4" />
                </div>
                <span className="text-body-default font-semibold text-text-primary">دفتر الحضور والافتقاد</span>
              </div>
              <ChevronLeft className="w-4 h-4 text-text-secondary" />
            </Link>

            <Link
              href="/plan"
              className="flex items-center justify-between p-3 rounded-button bg-bg-muted hover:bg-[#EAE6DB] transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-brand-primary-soft flex items-center justify-center text-brand-primary">
                  <BookOpen className="w-4 h-4" />
                </div>
                <span className="text-body-default font-semibold text-text-primary">خطة ومنهج المرحلة</span>
              </div>
              <ChevronLeft className="w-4 h-4 text-text-secondary" />
            </Link>
          </section>
        </div>

        {/* Global Bottom Tab Bar */}
        <TabBar activeTab="profile" />
      </div>
    </ProtectedRoute>
  );
}
