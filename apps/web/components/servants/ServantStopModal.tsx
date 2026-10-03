'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
  X,
  AlertOctagon,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  ShieldAlert,
  User,
  PowerOff,
  Sparkles,
} from 'lucide-react';

export interface ServantStopModalProps {
  isOpen: boolean;
  onClose: () => void;
  servant: {
    id: string;
    fullName: string;
    phoneNumber?: string | null;
    status?: string;
    role: {
      name: string;
      code: string;
      level: number;
    };
    currentStage?: {
      id: string;
      name: string;
    } | null;
  } | null;
  currentStageName?: string;
  onSuccess: (updatedUser?: any) => void;
}

export const ServantStopModal: React.FC<ServantStopModalProps> = ({
  isOpen,
  onClose,
  servant,
  currentStageName,
  onSuccess,
}) => {
  const isSuspended = servant?.status === 'SUSPENDED';
  const [reason, setReason] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setReason('');
      setErrorMsg(null);
      setSuccessMsg(null);
    }
  }, [isOpen, servant]);

  if (!isOpen || !servant) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const targetAction = isSuspended ? 'ACTIVATE' : 'SUSPEND';

    if (!reason.trim()) {
      setErrorMsg(
        isSuspended
          ? 'يرجى كتابة سبب إعادة التنشيط لتوثيقه في السجل الإداري'
          : 'يرجى كتابة سبب الإيقاف لتوثيقه في السجل الإداري (FR-1.4)'
      );
      return;
    }

    try {
      setIsLoading(true);
      const res = await api.post(`/api/v1/accounts/${servant.id}/status`, {
        action: targetAction,
        reason: reason.trim(),
      });

      if (res.data?.success) {
        setSuccessMsg(
          isSuspended
            ? `تم إعادة تنشيط حساب الخادم (${servant.fullName}) بنجاح!`
            : `تم إيقاف حساب الخادم (${servant.fullName}) بنجاح!`
        );
        onSuccess(res.data.user);
        setTimeout(() => {
          onClose();
        }, 1200);
      } else {
        setErrorMsg(res.data?.message || 'فشلت العملية');
      }
    } catch (err: any) {
      setErrorMsg(
        err.response?.data?.error?.message ||
        err.response?.data?.message ||
        'حدث خطأ أثناء تعديل حالة الخادم. تأكد من صلاحية الأمين العام والمحاولة مجدداً.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div
        dir="rtl"
        className="w-full max-w-[480px] bg-bg-surface border border-border-default rounded-card shadow-elevated p-6 text-right relative max-h-[90vh] overflow-y-auto"
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          disabled={isLoading}
          className="absolute top-4 left-4 text-text-secondary hover:text-text-primary p-1 rounded-button hover:bg-bg-muted transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="mb-4">
          <div className="flex items-center gap-2">
            {isSuspended ? (
              <RotateCcw className="w-5 h-5 text-status-success" />
            ) : (
              <PowerOff className="w-5 h-5 text-status-danger" />
            )}
            <h2 className="text-h2 font-bold text-text-primary">
              {isSuspended ? 'إعادة تنشيط حساب الخادم' : 'إيقاف حساب الخادم'}
            </h2>
          </div>
          <p className="text-caption text-text-secondary mt-0.5">
            صلاحية حصرية للأمين العام (FR-1.4) للتحكم بحالة الخدام وحساباتهم
          </p>
        </div>

        {/* Servant Card */}
        <div className="mb-4 p-3.5 bg-bg-muted/70 border border-border-default rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-body shrink-0 ${
                isSuspended
                  ? 'bg-status-danger-soft text-status-danger'
                  : 'bg-brand-primary-soft text-brand-primary'
              }`}
            >
              {servant.fullName.charAt(0)}
            </div>
            <div>
              <h3 className="text-body font-bold text-text-primary">{servant.fullName}</h3>
              <div className="flex items-center gap-2 mt-0.5">
                <Badge variant="neutral">{servant.role.name}</Badge>
                {isSuspended ? (
                  <Badge variant="danger">موقوف حالياً</Badge>
                ) : (
                  <Badge variant="success">نشط حالياً</Badge>
                )}
              </div>
            </div>
          </div>

          <div className="text-left text-caption text-text-secondary">
            <span className="block text-[11px] text-text-tertiary">المرحلة:</span>
            <span className="font-bold text-text-primary">
              {servant.currentStage?.name || currentStageName || '—'}
            </span>
          </div>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 bg-status-danger-soft border border-[#F5C2BE] rounded-lg flex items-start gap-2 text-right">
            <AlertTriangle className="w-4 h-4 text-status-danger shrink-0 mt-0.5" />
            <p className="text-caption text-status-danger font-medium">{errorMsg}</p>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3 bg-status-success-soft border border-[#BDE5D0] rounded-lg flex items-start gap-2 text-right">
            <CheckCircle2 className="w-4 h-4 text-status-success shrink-0 mt-0.5" />
            <p className="text-caption text-status-success font-medium">{successMsg}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Warning / Explanation Box */}
          <div
            className={`p-3.5 rounded-lg border text-caption leading-relaxed flex items-start gap-2.5 ${
              isSuspended
                ? 'bg-status-success-soft/50 border-status-success/30 text-status-success'
                : 'bg-status-danger-soft/60 border-status-danger/30 text-status-danger'
            }`}
          >
            {isSuspended ? (
              <Sparkles className="w-5 h-5 shrink-0 mt-0.5" />
            ) : (
              <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
            )}
            <div>
              <p className="font-bold mb-0.5">
                {isSuspended
                  ? 'تأكيد إعادة التنشيط:'
                  : 'تنبيه إداري قبل الإيقاف:'}
              </p>
              <p className="text-text-secondary text-[11px]">
                {isSuspended
                  ? 'بمجرد تأكيد التنشيط، سيتمكن الخادم من تسجيل الدخول فوراً، واستئناف تحضير الدروس، ومتابعة مخدوميه وجداول الحضور.'
                  : 'عند إيقاف الحساب، سيتم إنهاء كافة جلسات الخادم المفتوحة فوراً، ومنعه نهائياً من تسجيل الدخول إلى حين قيام الأمانة العامة بإعادة التنشيط.'}
              </p>
            </div>
          </div>

          {/* Reason input */}
          <div className="flex flex-col gap-1.5 text-right">
            <label className="text-body-small font-bold text-text-primary">
              {isSuspended ? 'سبب إعادة التنشيط *' : 'سبب الإيقاف وتوجيهات الأمانة العامة *'}
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={
                isSuspended
                  ? 'مثال: انتهاء فترة الإجازة، استئناف الخدمة بتوجيه الأمانة العامة...'
                  : 'مثال: إجازة رعوية مؤقتة، اعتذار لفترة امتحانات، إيقاف إداري مؤقت...'
              }
              rows={3}
              required
              className="w-full bg-bg-surface border border-border-default rounded-input p-3 text-body-small text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-brand-primary"
            />
            <p className="text-[11px] text-text-secondary">
              يتم توثيق هذا الإجراء وتاريخه والمسؤول عنه في سجل التدقيق الإداري غير القابل للتعديل.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 pt-2 border-t border-border-default">
            {isSuspended ? (
              <Button
                type="submit"
                variant="primary"
                fullWidth
                isLoading={isLoading}
                className="h-[46px] font-bold gap-1.5 bg-status-success hover:bg-status-success/90"
              >
                <RotateCcw className="w-4 h-4" />
                <span>تأكيد إعادة التنشيط</span>
              </Button>
            ) : (
              <Button
                type="submit"
                variant="danger"
                fullWidth
                isLoading={isLoading}
                className="h-[46px] font-bold gap-1.5"
              >
                <PowerOff className="w-4 h-4" />
                <span>تأكيد إيقاف الحساب</span>
              </Button>
            )}

            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
              className="h-[46px]"
            >
              إلغاء
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
