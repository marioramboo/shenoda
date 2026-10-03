'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
  X,
  ArrowLeftRight,
  AlertTriangle,
  CheckCircle2,
  Layers,
  User,
  Shield,
  HelpCircle,
} from 'lucide-react';

export interface StageOption {
  id: string;
  name: string;
  sectorId?: string;
  sector?: {
    id: string;
    name: string;
  };
}

export interface ServantTransferModalProps {
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
  currentStageId?: string;
  onSuccess: (updatedUser?: any) => void;
}

export const ServantTransferModal: React.FC<ServantTransferModalProps> = ({
  isOpen,
  onClose,
  servant,
  currentStageId,
  onSuccess,
}) => {
  const [stages, setStages] = useState<StageOption[]>([]);
  const [selectedStageId, setSelectedStageId] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isLoadingStages, setIsLoadingStages] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Fetch available stages across the organization
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    const fetchStages = async () => {
      try {
        setIsLoadingStages(true);
        const res = await api.get('/api/v1/stages');
        if (res.data?.success && Array.isArray(res.data.stages)) {
          if (isMounted) {
            setStages(res.data.stages);
            // Default select first stage that is not the current stage
            const availableNew = res.data.stages.find(
              (s: StageOption) => s.id !== (servant?.currentStage?.id || currentStageId)
            );
            if (availableNew) {
              setSelectedStageId(availableNew.id);
            }
          }
        }
      } catch (err) {
        console.error('Failed to load stages for transfer:', err);
      } finally {
        if (isMounted) setIsLoadingStages(false);
      }
    };

    fetchStages();
    setReason('');
    setErrorMsg(null);
    setSuccessMsg(null);

    return () => {
      isMounted = false;
    };
  }, [isOpen, servant, currentStageId]);

  if (!isOpen || !servant) return null;

  const currentStageName =
    servant.currentStage?.name ||
    stages.find((s) => s.id === currentStageId)?.name ||
    'المرحلة الحالية';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!selectedStageId) {
      setErrorMsg('يرجى اختيار المرحلة الجديدة لنقل الخادم إليها');
      return;
    }

    if (selectedStageId === (servant.currentStage?.id || currentStageId)) {
      setErrorMsg('الخادم مسند بالفعل إلى هذه المرحلة. يرجى اختيار مرحلة مختلفة.');
      return;
    }

    if (!reason.trim()) {
      setErrorMsg('يرجى كتابة سبب النقل لتوثيقه في السجل الإداري (FR-1.4)');
      return;
    }

    try {
      setIsLoading(true);
      const res = await api.post(`/api/v1/accounts/${servant.id}/status`, {
        action: 'TRANSFER',
        newStageId: selectedStageId,
        reason: reason.trim(),
      });

      if (res.data?.success) {
        const destStage = stages.find((s) => s.id === selectedStageId);
        setSuccessMsg(`تم نقل الخادم (${servant.fullName}) بنجاح إلى (${destStage?.name || 'المرحلة الجديدة'})!`);
        onSuccess(res.data.user);
        setTimeout(() => {
          onClose();
        }, 1200);
      } else {
        setErrorMsg(res.data?.message || 'فشل في إتمام عملية نقل الخادم');
      }
    } catch (err: any) {
      setErrorMsg(
        err.response?.data?.error?.message ||
        err.response?.data?.message ||
        'حدث خطأ أثناء نقل الخادم. يرجى التأكد من صلاحية الأمين العام والمحاولة مجدداً.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div
        dir="rtl"
        className="w-full max-w-[500px] bg-bg-surface border border-border-default rounded-card shadow-elevated p-6 text-right relative max-h-[90vh] overflow-y-auto"
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
          <div className="flex items-center gap-2 text-brand-primary">
            <ArrowLeftRight className="w-5 h-5 text-brand-primary" />
            <h2 className="text-h2 font-bold text-text-primary">
              نقل الخادم إلى مرحلة أخرى
            </h2>
          </div>
          <p className="text-caption text-text-secondary mt-0.5">
            صلاحية حصرية للأمين العام (FR-1.4) لإعادة توزيع ونقل الخدام بين المراحل والقطاعات
          </p>
        </div>

        {/* Target Servant Summary Card */}
        <div className="mb-4 p-3.5 bg-bg-muted/70 border border-border-default rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-brand-primary-soft text-brand-primary font-bold flex items-center justify-center text-body shrink-0">
              {servant.fullName.charAt(0)}
            </div>
            <div>
              <h3 className="text-body font-bold text-text-primary">{servant.fullName}</h3>
              <div className="flex items-center gap-2 mt-0.5">
                <Badge variant="neutral">{servant.role.name}</Badge>
                {servant.status === 'SUSPENDED' && (
                  <Badge variant="danger">موقوف</Badge>
                )}
              </div>
            </div>
          </div>

          <div className="text-left text-caption text-text-secondary">
            <span className="block text-[11px] text-text-tertiary">المرحلة الحالية:</span>
            <span className="font-bold text-text-primary">{currentStageName}</span>
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
          {/* Target Stage Selection */}
          <div className="flex flex-col gap-1.5 text-right">
            <label className="text-body-small font-bold text-text-primary flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-brand-primary" />
              <span>اختر المرحلة الجديدة المراد النقل إليها *</span>
            </label>
            {isLoadingStages ? (
              <div className="p-3 text-caption text-text-secondary bg-bg-muted rounded-input text-center">
                جارٍ تحميل المراحل الدراسية بالكنيسة...
              </div>
            ) : (
              <select
                value={selectedStageId}
                onChange={(e) => setSelectedStageId(e.target.value)}
                className="w-full h-[46px] bg-bg-surface text-text-primary font-cairo text-body-default rounded-input border border-border-default px-3 focus:outline-none focus:ring-2 focus:ring-brand-primary"
                required
              >
                <option value="" disabled>
                  -- اختر المرحلة الدراسية المستهدفة --
                </option>
                {stages.map((st) => {
                  const isCurrent = st.id === (servant.currentStage?.id || currentStageId);
                  return (
                    <option key={st.id} value={st.id} disabled={isCurrent}>
                      {st.name} {st.sector?.name ? `(${st.sector.name})` : ''} {isCurrent ? '— [المرحلة الحالية]' : ''}
                    </option>
                  );
                })}
              </select>
            )}
          </div>

          {/* Transfer Reason */}
          <div className="flex flex-col gap-1.5 text-right">
            <label className="text-body-small font-bold text-text-primary">
              سبب النقل وملاحظات الأمانة العامة *
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="مثال: تلبية احتياج خدمة إعدادي بنين، إعادة توزيع الخدام السنوي بتوجيه الأمانة العامة..."
              rows={3}
              required
              className="w-full bg-bg-surface border border-border-default rounded-input p-3 text-body-small text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-brand-primary"
            />
            <p className="text-[11px] text-text-secondary">
              يتم حفظ هذا السبب بصورة دائمة وغير قابلة للتعديل في سجل الحركات الإدارية (Audit Trail).
            </p>
          </div>

          {/* Notice Box */}
          <div className="p-3 bg-brand-primary-soft/50 border border-brand-primary/20 rounded-lg flex items-start gap-2 text-right">
            <HelpCircle className="w-4 h-4 text-brand-primary shrink-0 mt-0.5" />
            <p className="text-[11px] text-text-secondary leading-relaxed">
              عند إتمام النقل، سيتم تحديث نطاق الخادم فوراً، وربطه بأمين المرحلة الجديدة، كما سيتم تنشيط حسابه تلقائياً إذا كان موقوفاً.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 pt-2 border-t border-border-default">
            <Button
              type="submit"
              variant="primary"
              fullWidth
              isLoading={isLoading}
              className="h-[46px] font-bold gap-1.5"
            >
              <ArrowLeftRight className="w-4 h-4" />
              <span>تأكيد نقل الخادم</span>
            </Button>
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
