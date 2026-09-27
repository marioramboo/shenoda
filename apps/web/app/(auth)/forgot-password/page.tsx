'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Phone, Lock, KeyRound, AlertCircle, CheckCircle2, ArrowRight } from 'lucide-react';

export default function ForgotPasswordPage() {
  const router = useRouter();

  // Steps: 1 = Enter identifier, 2 = Enter OTP and new password, 3 = Success
  const [step, setStep] = useState<1 | 2 | 3>(1);

  const [identifier, setIdentifier] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Step 1: Request OTP
  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const clean = identifier.trim();
    if (!clean) {
      setErrorMsg('يرجى إدخال رقم الهاتف أو البريد الإلكتروني');
      return;
    }

    try {
      setIsLoading(true);
      const res = await api.post('/api/v1/auth/forgot-password', {
        identifier: clean,
      });

      if (res.data?.success) {
        setSuccessMsg(res.data.message || 'تم إرسال كود التحقق بنجاح');
        if (res.data?.devOtpCode) {
          // Pre-populate in dev environment for easy testing
          setOtpCode(res.data.devOtpCode);
        }
        setStep(2);
      }
    } catch (err: any) {
      setErrorMsg(
        err.response?.data?.error?.message || 'حدث خطأ أثناء إرسال كود التحقق'
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Reset Password with OTP
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (otpCode.length !== 6) {
      setErrorMsg('كود التحقق يجب أن يتكون من 6 أرقام');
      return;
    }

    if (newPassword.length < 8) {
      setErrorMsg('كلمة المرور الجديدة يجب ألا تقل عن 8 أحرف');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg('كلمتا المرور غير متطابقتين');
      return;
    }

    try {
      setIsLoading(true);
      const res = await api.post('/api/v1/auth/reset-password', {
        identifier: identifier.trim(),
        otpCode: otpCode.trim(),
        newPassword,
      });

      if (res.data?.success) {
        setStep(3);
      }
    } catch (err: any) {
      setErrorMsg(
        err.response?.data?.error?.message || 'كود التحقق غير صحيح أو انتهت صلاحيته'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main
      dir="rtl"
      className="min-h-screen bg-bg-app flex flex-col items-center justify-center p-4 sm:p-6"
    >
      <div className="w-full max-w-[400px] flex flex-col items-center gap-6">
        {/* Header */}
        <div className="flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-2xl bg-brand-primary-soft flex items-center justify-center border border-[#D5E1F0] shadow-sm mb-3">
            <KeyRound className="w-7 h-7 text-brand-primary" />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-brand-primary tracking-tight">
            استعادة كلمة المرور
          </h1>
          <p className="text-body-small text-text-secondary mt-1">
            كنيسة القديس العظيم أنبا شنودة رئيس المتوحدين
          </p>
        </div>

        {/* Card Container */}
        <div className="w-full bg-bg-surface border border-border-default rounded-card shadow-card p-6">
          {/* Error Banner */}
          {errorMsg && (
            <div className="mb-5 p-3.5 bg-status-danger-soft border border-[#F5C2BE] rounded-lg flex items-start gap-2.5 text-right">
              <AlertCircle className="w-5 h-5 text-status-danger shrink-0 mt-0.5" />
              <p className="text-body-small text-status-danger font-medium">{errorMsg}</p>
            </div>
          )}

          {/* Step 1: Identifier Input */}
          {step === 1 && (
            <form onSubmit={handleRequestOtp} className="flex flex-col gap-4 text-right">
              <p className="text-body-small text-text-secondary mb-1">
                أدخل رقم هاتفك المسجل أو بريدك الإلكتروني لاستلام كود التحقق السري (OTP).
              </p>

              <Input
                id="reset-identifier"
                label="رقم الهاتف أو البريد الإلكتروني"
                placeholder="01xxxxxxxxx أو name@example.com"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                iconLeading={<Phone className="w-4 h-4" />}
                required
              />

              <Button
                type="submit"
                variant="primary"
                fullWidth
                isLoading={isLoading}
                className="mt-2 h-[46px]"
              >
                إرسال كود التحقق
              </Button>
            </form>
          )}

          {/* Step 2: OTP & New Password */}
          {step === 2 && (
            <form onSubmit={handleResetPassword} className="flex flex-col gap-4 text-right">
              {successMsg && (
                <div className="p-3 bg-status-success-soft border border-[#BDE5D0] rounded-lg text-body-small text-status-success font-medium">
                  {successMsg}
                </div>
              )}

              <Input
                id="reset-otp"
                label="كود التحقق (6 أرقام)"
                placeholder="123456"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value)}
                maxLength={6}
                required
              />

              <Input
                id="reset-new-password"
                type="password"
                label="كلمة المرور الجديدة"
                placeholder="8 أحرف على الأقل"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                iconLeading={<Lock className="w-4 h-4" />}
                required
              />

              <Input
                id="reset-confirm-password"
                type="password"
                label="تأكيد كلمة المرور"
                placeholder="أعد إدخال كلمة المرور"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                iconLeading={<Lock className="w-4 h-4" />}
                required
              />

              <Button
                type="submit"
                variant="primary"
                fullWidth
                isLoading={isLoading}
                className="mt-2 h-[46px]"
              >
                تعيين كلمة المرور
              </Button>
            </form>
          )}

          {/* Step 3: Success Screen */}
          {step === 3 && (
            <div className="flex flex-col items-center text-center py-4">
              <CheckCircle2 className="w-14 h-14 text-status-success mb-3" />
              <h2 className="text-h2 font-semibold text-text-primary">
                تم تغيير كلمة المرور بنجاح!
              </h2>
              <p className="text-body-small text-text-secondary mt-2 mb-6">
                يمكنك الآن تسجيل الدخول إلى حسابك بكلمة المرور الجديدة.
              </p>

              <Button
                variant="primary"
                fullWidth
                onClick={() => router.push('/login')}
                className="h-[46px]"
              >
                الانتقال لتسجيل الدخول
              </Button>
            </div>
          )}

          {/* Back to Login link */}
          {step !== 3 && (
            <div className="mt-5 pt-4 border-t border-border-default flex justify-center">
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 text-body-small font-medium text-brand-primary hover:text-brand-primary-dark"
              >
                <ArrowRight className="w-4 h-4" />
                <span>العودة لتسجيل الدخول</span>
              </Link>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
