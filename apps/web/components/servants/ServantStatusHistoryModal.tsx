'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
  X,
  History,
  ArrowLeftRight,
  PowerOff,
  RotateCcw,
  Calendar,
  User,
  Clock,
  AlertCircle,
} from 'lucide-react';

export interface AccountStatusLogItem {
  id: string;
  previousStatus: string;
  newStatus: string;
  previousStage: string | null;
  newStage: string | null;
  reason: string | null;
  createdAt: string;
  changedBy: {
    id: string;
    fullName: string;
    phoneNumber: string;
  };
}

export interface ServantStatusHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  servant: {
    id: string;
    fullName: string;
    phoneNumber?: string | null;
    role: {
      name: string;
    };
  } | null;
}

export const ServantStatusHistoryModal: React.FC<ServantStatusHistoryModalProps> = ({
  isOpen,
  onClose,
  servant,
}) => {
  const [logs, setLogs] = useState<AccountStatusLogItem[]>([]);
  const [stagesMap, setStagesMap] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !servant) return;

    let isMounted = true;

    const fetchHistoryAndStages = async () => {
      try {
        setIsLoading(true);
        setErrorMsg(null);

        // Fetch stages to map IDs to friendly names
        try {
          const stagesRes = await api.get('/api/v1/stages');
          if (stagesRes.data?.success && Array.isArray(stagesRes.data.stages)) {
            const map: Record<string, string> = {};
            stagesRes.data.stages.forEach((st: any) => {
              map[st.id] = st.name;
            });
            if (isMounted) setStagesMap(map);
          }
        } catch {
          // ignore stage map failures
        }

        const res = await api.get(`/api/v1/accounts/${servant.id}/history`);
        if (res.data?.success && Array.isArray(res.data.logs)) {
          if (isMounted) setLogs(res.data.logs);
        }
      } catch (err: any) {
        if (isMounted) {
          setErrorMsg(err.response?.data?.error?.message || 'فشل في تحميل سجل الحركات الإدارية');
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchHistoryAndStages();

    return () => {
      isMounted = false;
    };
  }, [isOpen, servant]);

  if (!isOpen || !servant) return null;

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('ar-EG', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div
        dir="rtl"
        className="w-full max-w-[540px] bg-bg-surface border border-border-default rounded-card shadow-elevated p-6 text-right relative max-h-[90vh] flex flex-col"
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 left-4 text-text-secondary hover:text-text-primary p-1 rounded-button hover:bg-bg-muted transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="mb-4 pb-3 border-b border-border-default">
          <div className="flex items-center gap-2 text-brand-primary">
            <History className="w-5 h-5" />
            <h2 className="text-h2 font-bold text-text-primary">
              سجل التنقلات والإيقاف الإداري
            </h2>
          </div>
          <p className="text-caption text-text-secondary mt-0.5">
            الخادم: <span className="font-bold text-text-primary">{servant.fullName}</span> ({servant.role.name})
          </p>
        </div>

        {/* Content list */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          {isLoading ? (
            <div className="text-center py-12 text-text-secondary">
              <div className="inline-block animate-spin w-6 h-6 border-2 border-brand-primary border-t-transparent rounded-full mb-2" />
              <p className="text-body-small">جارٍ تحميل سجل الحركات الإدارية...</p>
            </div>
          ) : errorMsg ? (
            <div className="p-3 bg-status-danger-soft border border-[#F5C2BE] rounded-lg text-caption text-status-danger">
              {errorMsg}
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12 bg-bg-muted/50 rounded-card border border-dashed border-border-default">
              <History className="w-10 h-10 text-text-tertiary mx-auto mb-2 opacity-50" />
              <p className="text-body font-bold text-text-primary">لا توجد حركات مسجلة</p>
              <p className="text-caption text-text-secondary mt-1">
                لم يتم تسجيل أي تنقلات أو إيقافات لهذا الخادم حتى الآن.
              </p>
            </div>
          ) : (
            logs.map((log) => {
              const isTransfer = Boolean(log.newStage);
              const isSuspend = log.newStatus === 'SUSPENDED';
              const isActivate = log.newStatus === 'ACTIVE' && log.previousStatus === 'SUSPENDED';

              const prevStageName = log.previousStage ? (stagesMap[log.previousStage] || log.previousStage) : 'غير محدد';
              const newStageName = log.newStage ? (stagesMap[log.newStage] || log.newStage) : 'غير محدد';

              return (
                <div
                  key={log.id}
                  className="p-3.5 bg-bg-surface border border-border-default rounded-lg shadow-sm space-y-2 hover:border-brand-primary/40 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {isTransfer ? (
                        <span className="w-7 h-7 rounded-full bg-brand-primary-soft text-brand-primary flex items-center justify-center shrink-0">
                          <ArrowLeftRight className="w-4 h-4" />
                        </span>
                      ) : isSuspend ? (
                        <span className="w-7 h-7 rounded-full bg-status-danger-soft text-status-danger flex items-center justify-center shrink-0">
                          <PowerOff className="w-4 h-4" />
                        </span>
                      ) : (
                        <span className="w-7 h-7 rounded-full bg-status-success-soft text-status-success flex items-center justify-center shrink-0">
                          <RotateCcw className="w-4 h-4" />
                        </span>
                      )}

                      <span className="text-body-small font-bold text-text-primary">
                        {isTransfer
                          ? 'نقل إلى مرحلة جديدة'
                          : isSuspend
                          ? 'إيقاف حساب الخادم'
                          : 'إعادة تنشيط الحساب'}
                      </span>
                    </div>

                    <span className="text-[11px] text-text-tertiary flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>{formatDate(log.createdAt)}</span>
                    </span>
                  </div>

                  {/* Transfer Details */}
                  {isTransfer && (
                    <div className="p-2 bg-bg-muted/70 rounded border border-border-default/50 text-caption text-text-secondary flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-text-tertiary block">من مرحلة:</span>
                        <span className="font-semibold text-text-primary">{prevStageName}</span>
                      </div>
                      <ArrowLeftRight className="w-4 h-4 text-brand-primary shrink-0" />
                      <div className="text-left">
                        <span className="text-[10px] text-text-tertiary block">إلى مرحلة:</span>
                        <span className="font-bold text-brand-primary">{newStageName}</span>
                      </div>
                    </div>
                  )}

                  {/* Reason */}
                  {log.reason && (
                    <div className="text-caption text-text-secondary bg-bg-app p-2 rounded border border-border-default/40">
                      <span className="font-bold text-text-primary block text-[11px] mb-0.5">
                        السبب المدون:
                      </span>
                      <p className="leading-relaxed">{log.reason}</p>
                    </div>
                  )}

                  {/* Operator */}
                  <div className="pt-1 text-[11px] text-text-tertiary flex items-center justify-between border-t border-border-default/40">
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3 text-brand-primary" />
                      <span>المسؤول:</span>
                      <strong className="text-text-secondary">{log.changedBy?.fullName || 'الأمين العام'}</strong>
                    </span>
                    {log.changedBy?.phoneNumber && (
                      <span className="dir-ltr text-[10px]">{log.changedBy.phoneNumber}</span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 mt-3 border-t border-border-default flex justify-end">
          <Button variant="outline" onClick={onClose} className="h-[40px] px-6">
            إغلاق
          </Button>
        </div>
      </div>
    </div>
  );
};
