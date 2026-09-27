'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Phone, Lock, Eye, EyeOff, Info, AlertCircle, ShieldCheck } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanIdentifier = identifier.trim();
    if (!cleanIdentifier) {
      setErrorMsg('يرجى إدخال رقم الهاتف أو البريد الإلكتروني');
      return;
    }

    if (!password) {
      setErrorMsg('يرجى إدخال كلمة المرور');
      return;
    }

    try {
      setIsSubmitting(true);
      await login(cleanIdentifier, password);
      router.push('/dashboard');
    } catch (err: any) {
      const serverMessage =
        err.response?.data?.error?.message ||
        err.message ||
        'حدث خطأ غير متوقع أثناء تسجيل الدخول';
      setErrorMsg(serverMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main
      dir="rtl"
      className="min-h-screen bg-bg-app flex flex-col items-center justify-center p-4 sm:p-6"
    >
      <div className="w-full max-w-[400px] flex flex-col items-center gap-6">
        {/* 1. Header Brand Unit */}
        <div className="flex flex-col items-center text-center">
          {/* Coptic Cross / Emblem Icon */}
          <div className="w-16 h-16 rounded-2xl bg-brand-primary-soft flex items-center justify-center border border-[#D5E1F0] shadow-sm mb-3">
            <svg
              className="w-10 h-10 text-brand-accent"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {/* Coptic / Liturgical Cross Design */}
              <line x1="12" y1="2" x2="12" y2="22" />
              <line x1="4" y1="9" x2="20" y2="9" />
              <circle cx="12" cy="9" r="2.5" />
              <circle cx="12" cy="3.5" r="1" />
              <circle cx="12" cy="20.5" r="1" />
              <circle cx="5" cy="9" r="1" />
              <circle cx="19" cy="9" r="1" />
            </svg>
          </div>

          <h1 className="text-2xl sm:text-[26px] font-bold text-brand-primary tracking-tight">
            نظام إدارة الخدمة
          </h1>
          <p className="text-body-small text-text-secondary mt-1">
            كنيسة القديس العظيم أنبا شنودة رئيس المتوحدين
          </p>
        </div>

        {/* 2. Login Form Container */}
        <div className="w-full bg-bg-surface border border-border-default rounded-card shadow-card p-6">
          <div className="mb-5 text-right">
            <h2 className="text-h2 font-semibold text-text-primary">تسجيل الدخول</h2>
            <p className="text-caption text-text-secondary mt-0.5">
              أدخل بيانات حسابك المصرح به للمتابعة
            </p>
          </div>

          {/* Error Alert Banner */}
          {errorMsg && (
            <div className="mb-5 p-3.5 bg-status-danger-soft border border-[#F5C2BE] rounded-lg flex items-start gap-2.5 text-right">
              <AlertCircle className="w-5 h-5 text-status-danger shrink-0 mt-0.5" />
              <p className="text-body-small text-status-danger font-medium leading-relaxed">
                {errorMsg}
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Identifier Input */}
            <Input
              id="login-identifier"
              label="رقم الهاتف أو البريد الإلكتروني"
              placeholder="01xxxxxxxxx أو name@example.com"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              iconLeading={<Phone className="w-4 h-4" />}
              autoComplete="username"
              required
            />

            {/* Password Input */}
            <div className="w-full flex flex-col gap-1.5 text-right">
              <label
                htmlFor="login-password"
                className="text-body-small font-medium text-text-primary select-none"
              >
                كلمة المرور
              </label>
              <div className="relative flex items-center">
                <div className="absolute right-3.5 flex items-center justify-center pointer-events-none text-text-secondary">
                  <Lock className="w-4 h-4" />
                </div>

                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-[46px] bg-bg-surface text-text-primary font-cairo text-body-default rounded-input border border-border-default pr-11 pl-11 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-colors"
                  autoComplete="current-password"
                  required
                />

                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-3.5 flex items-center justify-center text-text-secondary hover:text-text-primary focus:outline-none p-1"
                  aria-label={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Actions Row: Remember Me & Forgot Password */}
            <div className="flex items-center justify-between text-body-small mt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none text-text-secondary hover:text-text-primary">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-border-default text-brand-primary focus:ring-brand-primary cursor-pointer accent-brand-primary"
                />
                <span>تذكرني على هذا الجهاز</span>
              </label>

              <Link
                href="/forgot-password"
                className="text-brand-primary hover:text-brand-primary-dark font-medium transition-colors"
              >
                نسيت كلمة المرور؟
              </Link>
            </div>

            {/* Submit Button */}
            <Button
              id="login-submit-btn"
              type="submit"
              variant="primary"
              fullWidth
              size="md"
              isLoading={isSubmitting}
              className="mt-2 h-[46px] text-body-medium font-semibold"
            >
              تسجيل الدخول
            </Button>
          </form>
        </div>

        {/* 3. No-Self-Registration Notice Card (Assumption A7) */}
        <div className="w-full bg-brand-primary-soft border border-[#C5D5E8] rounded-card p-4 flex items-start gap-3 text-right">
          <div className="w-7 h-7 rounded-full bg-white flex items-center justify-center shrink-0 text-brand-primary shadow-2xs mt-0.5">
            <Info className="w-4 h-4" />
          </div>
          <p className="text-body-small text-brand-primary leading-relaxed">
            <strong className="font-semibold block mb-0.5">تنبيه هام (عدم وجود تسجيل ذاتي):</strong>
            حسابات الخدام يتم إنشاؤها وتفعيلها فقط عبر أمين الخدمة أو أمين القطاع المسئول. لا يوجد تسجيل ذاتي.
          </p>
        </div>

        {/* Footer Security Badge */}
        <div className="flex items-center gap-1.5 text-caption text-text-secondary opacity-75">
          <ShieldCheck className="w-3.5 h-3.5 text-status-success" />
          <span>اتصال مشفر وآمن طبقاً لمعايير الخدمة الكنسية</span>
        </div>
      </div>
    </main>
  );
}
