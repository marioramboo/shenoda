'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { TabBar } from '@/components/layout/TabBar';
import { AccountEditModal } from '@/components/profile/AccountEditModal';
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
  Edit3,
  MapPin,
  Briefcase,
  Sparkles,
  Users,
  Church,
  ExternalLink,
  MessageCircle,
} from 'lucide-react';

export default function ProfilePage() {
  const { user, logout, updateUser } = useAuth();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

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

  const cleanWaNumber = (user?.whatsappPhone || user?.phoneNumber || '').replace(/[^0-9]/g, '');
  const waLink = cleanWaNumber
    ? `https://wa.me/${cleanWaNumber.startsWith('0') ? '2' + cleanWaNumber : cleanWaNumber}`
    : null;

  return (
    <ProtectedRoute>
      <div dir="rtl" className="min-h-screen bg-bg-app flex flex-col items-center p-4 sm:p-6 pb-24">
        <div className="w-full max-w-[500px] flex flex-col gap-4">
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

            {/* Avatar or Picture */}
            <div className="relative w-20 h-20 rounded-full bg-bg-surface border-4 border-bg-surface shadow-md flex items-center justify-center overflow-hidden mb-3 mt-4">
              {user?.profilePicture ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.profilePicture}
                  alt={user.fullName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <User className="w-10 h-10 text-brand-primary" />
              )}
            </div>

            <h2 className="text-h1 font-bold text-text-primary">
              {user?.fullName || 'الخادم'}
            </h2>

            <div className="flex flex-wrap items-center justify-center gap-2 mt-2">
              <Badge variant="accent">
                {user?.role.name || 'خادم'}
              </Badge>
              <Badge variant="neutral">
                المستوى {user?.role.level ?? 1}
              </Badge>
              {user?.isDeacon && (
                <span className="px-2.5 py-0.5 bg-[#E6F4EA] text-[#137333] border border-[#CEEAD6] rounded-pill text-caption font-bold flex items-center gap-1">
                  <Award className="w-3.5 h-3.5" />
                  <span>شماس: {user.deaconRank || 'مرتل'}</span>
                </span>
              )}
            </div>

            {user?.isDeacon && user.deaconName && (
              <p className="text-caption text-text-secondary mt-1 font-medium">
                اسم الرسامة: <span className="text-brand-primary font-bold">{user.deaconName}</span>
              </p>
            )}

            {/* Quick Contact Info */}
            <div className="w-full mt-5 pt-4 border-t border-border-default grid grid-cols-1 gap-2 text-right text-body-small">
              {/* Primary Phone */}
              <div className="flex items-center justify-between p-2.5 rounded-button bg-bg-muted">
                <span className="text-text-secondary text-caption flex items-center gap-1.5">
                  <Phone className="w-4 h-4 text-brand-primary" />
                  رقم الهاتف الأساسي
                </span>
                <span className="font-semibold text-text-primary dir-ltr">
                  {user?.phoneNumber || '—'}
                </span>
              </div>

              {/* WhatsApp Phone */}
              <div className="flex items-center justify-between p-2.5 rounded-button bg-bg-muted">
                <span className="text-text-secondary text-caption flex items-center gap-1.5">
                  <MessageCircle className="w-4 h-4 text-[#25D366]" />
                  رقم الواتساب
                </span>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-text-primary dir-ltr">
                    {user?.whatsappPhone || user?.phoneNumber || '—'}
                  </span>
                  {waLink && (
                    <a
                      href={waLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2 py-0.5 bg-[#25D366] text-white rounded text-[11px] font-bold hover:bg-[#1DA851] flex items-center gap-1"
                    >
                      <span>محادثة</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>

              {/* Email */}
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

              {/* Social Media Links */}
              {(user?.facebookUrl || user?.instagramUrl) && (
                <div className="flex items-center justify-between p-2.5 rounded-button bg-bg-muted">
                  <span className="text-text-secondary text-caption flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-brand-accent" />
                    حسابات التواصل
                  </span>
                  <div className="flex items-center gap-2">
                    {user.facebookUrl && (
                      <a
                        href={user.facebookUrl.startsWith('http') ? user.facebookUrl : `https://${user.facebookUrl}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2.5 py-0.5 bg-[#1877F2] text-white rounded text-[11px] font-bold hover:opacity-90 flex items-center gap-1"
                      >
                        <span>فيسبوك</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                    {user.instagramUrl && (
                      <a
                        href={user.instagramUrl.startsWith('http') ? user.instagramUrl : `https://${user.instagramUrl}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2.5 py-0.5 bg-[#E4405F] text-white rounded text-[11px] font-bold hover:opacity-90 flex items-center gap-1"
                      >
                        <span>انستجرام</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* Date of birth */}
              {user?.dateOfBirth && (
                <div className="flex items-center justify-between p-2.5 rounded-button bg-bg-muted">
                  <span className="text-text-secondary text-caption flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-brand-primary" />
                    تاريخ الميلاد
                  </span>
                  <span className="font-semibold text-text-primary">
                    {new Date(user.dateOfBirth).toLocaleDateString('ar-EG')}
                  </span>
                </div>
              )}

              {/* Father Confessor */}
              {user?.fatherConfessor && (
                <div className="flex items-center justify-between p-2.5 rounded-button bg-bg-muted">
                  <span className="text-text-secondary text-caption flex items-center gap-1.5">
                    <User className="w-4 h-4 text-brand-primary" />
                    أب الاعتراف
                  </span>
                  <span className="font-semibold text-text-primary">
                    {user.fatherConfessor}
                  </span>
                </div>
              )}

              {user?.fatherConfessorChurch && (
                <div className="flex items-center justify-between p-2.5 rounded-button bg-bg-muted">
                  <span className="text-text-secondary text-caption flex items-center gap-1.5">
                    <Church className="w-4 h-4 text-brand-accent" />
                    كنيسة أب الاعتراف
                  </span>
                  <span className="font-semibold text-text-primary">
                    {user.fatherConfessorChurch}
                  </span>
                </div>
              )}

              {/* Address */}
              {user?.address && (
                <div className="flex items-center justify-between p-2.5 rounded-button bg-bg-muted">
                  <span className="text-text-secondary text-caption flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-brand-primary" />
                    العنوان
                  </span>
                  <span className="font-semibold text-text-primary">
                    {user.address}
                  </span>
                </div>
              )}

              {/* Education / Career */}
              {user?.educationOrCareer && (
                <div className="flex items-center justify-between p-2.5 rounded-button bg-bg-muted">
                  <span className="text-text-secondary text-caption flex items-center gap-1.5">
                    <Briefcase className="w-4 h-4 text-brand-primary" />
                    المؤهل / الوظيفة
                  </span>
                  <span className="font-semibold text-text-primary">
                    {user.educationOrCareer}
                  </span>
                </div>
              )}

              {/* Marital status */}
              {user?.maritalStatus && (
                <div className="flex items-center justify-between p-2.5 rounded-button bg-bg-muted">
                  <span className="text-text-secondary text-caption flex items-center gap-1.5">
                    <Heart className="w-4 h-4 text-brand-primary" />
                    الحالة الاجتماعية
                  </span>
                  <span className="font-semibold text-text-primary">
                    {user.maritalStatus} {user.spouseName ? `(${user.spouseName})` : ''}
                  </span>
                </div>
              )}
            </div>

            {/* Edit Account Button */}
            <Button
              variant="outline"
              onClick={() => setIsEditModalOpen(true)}
              className="w-full mt-4 h-[42px] border-brand-primary text-brand-primary hover:bg-brand-primary-soft flex items-center justify-center gap-2 font-semibold shadow-xs"
            >
              <Edit3 className="w-4 h-4" />
              <span>تعديل بيانات الحساب</span>
            </Button>
          </section>

          {/* Talents & Church Activities Card */}
          {((user?.talents && user.talents.length > 0) || (user?.activities && user.activities.length > 0)) && (
            <section className="bg-bg-surface border border-border-default rounded-card p-5 shadow-card flex flex-col gap-3 text-right">
              <div className="flex items-center justify-between pb-2 border-b border-border-default">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-brand-accent" />
                  <h3 className="text-h2 font-semibold text-text-primary">المواهب والأنشطة الكنسية</h3>
                </div>
              </div>

              {user?.talents && user.talents.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  <span className="text-caption font-semibold text-text-secondary">المواهب والمهارات:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {user.talents.map((t) => (
                      <span
                        key={t}
                        className="px-2.5 py-1 bg-brand-accent-soft text-brand-accent rounded-pill text-caption font-semibold border border-[#E8DAB2]"
                      >
                        ★ {t}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {user?.activities && user.activities.length > 0 && (
                <div className="flex flex-col gap-1.5 mt-1">
                  <span className="text-caption font-semibold text-text-secondary">الأنشطة المشارك بها:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {user.activities.map((a) => (
                      <span
                        key={a}
                        className="px-2.5 py-1 bg-brand-primary-soft text-brand-primary rounded-pill text-caption font-semibold border border-[#D0DFEF]"
                      >
                        ✓ {a}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </section>
          )}

          {/* Siblings Card */}
          {user?.siblingsInfo && user.siblingsInfo.length > 0 && (
            <section className="bg-bg-surface border border-border-default rounded-card p-5 shadow-card flex flex-col gap-3 text-right">
              <div className="flex items-center justify-between pb-2 border-b border-border-default">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-brand-primary" />
                  <h3 className="text-h2 font-semibold text-text-primary">بيانات الأسرة والأخوة</h3>
                </div>
                <Badge variant="neutral">{user.siblingsInfo.length} إخوة</Badge>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {user.siblingsInfo.map((sib, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-2.5 rounded-button bg-bg-muted text-body-small"
                  >
                    <span className="font-semibold text-text-primary">{sib.name}</span>
                    {sib.age ? (
                      <span className="text-caption text-text-secondary">{sib.age} سنة</span>
                    ) : null}
                  </div>
                ))}
              </div>
            </section>
          )}

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

        {/* Account Edit Modal */}
        {user && (
          <AccountEditModal
            isOpen={isEditModalOpen}
            onClose={() => setIsEditModalOpen(false)}
            user={user}
            onSuccess={(updated) => updateUser(updated)}
          />
        )}

        {/* Global Bottom Tab Bar */}
        <TabBar activeTab="profile" />
      </div>
    </ProtectedRoute>
  );
}
