'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
  X,
  Search,
  Users,
  ArrowLeftRight,
  PowerOff,
  RotateCcw,
  History,
  Layers,
  Phone,
  Shield,
  Filter,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ServantTransferModal } from './ServantTransferModal';
import { ServantStopModal } from './ServantStopModal';
import { ServantStatusHistoryModal } from './ServantStatusHistoryModal';

export interface ServantDirectoryItem {
  id: string;
  fullName: string;
  phoneNumber?: string | null;
  email?: string | null;
  status: string;
  role: {
    id: string;
    name: string;
    code: string;
    level: number;
  };
  currentStage?: {
    id: string;
    name: string;
  } | null;
  currentSector?: {
    id: string;
    name: string;
  } | null;
}

export interface ServantDirectoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onServantUpdated?: () => void;
}

export const ServantDirectoryModal: React.FC<ServantDirectoryModalProps> = ({
  isOpen,
  onClose,
  onServantUpdated,
}) => {
  const [servants, setServants] = useState<ServantDirectoryItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'SUSPENDED'>('ALL');
  const [stageFilter, setStageFilter] = useState<string>('ALL');
  const [stages, setStages] = useState<Array<{ id: string; name: string }>>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Sub-modals state
  const [transferServant, setTransferServant] = useState<ServantDirectoryItem | null>(null);
  const [stopServant, setStopServant] = useState<ServantDirectoryItem | null>(null);
  const [historyServant, setHistoryServant] = useState<ServantDirectoryItem | null>(null);

  const fetchServants = async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/api/v1/accounts/servants');
      const list = Array.isArray(res.data?.servants)
        ? res.data.servants
        : Array.isArray(res.data?.data)
        ? res.data.data
        : [];
      if (res.data?.success && list.length >= 0) {
        setServants(list);
      }
    } catch (err) {
      console.error('Failed to load servants directory:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStages = async () => {
    try {
      const res = await api.get('/api/v1/stages');
      if (res.data?.success && Array.isArray(res.data.stages)) {
        setStages(res.data.stages);
      }
    } catch {
      // fallback
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchServants();
      fetchStages();
    }
  }, [isOpen]);

  const filteredServants = useMemo(() => {
    return servants.filter((s) => {
      // Status filter
      if (statusFilter !== 'ALL' && s.status !== statusFilter) {
        return false;
      }

      // Stage filter
      if (stageFilter !== 'ALL' && s.currentStage?.id !== stageFilter) {
        return false;
      }

      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = s.fullName.toLowerCase().includes(q);
        const matchesPhone = s.phoneNumber ? s.phoneNumber.includes(q) : false;
        const matchesStage = s.currentStage?.name ? s.currentStage.name.toLowerCase().includes(q) : false;
        return matchesName || matchesPhone || matchesStage;
      }

      return true;
    });
  }, [servants, searchQuery, statusFilter, stageFilter]);

  const handleSubActionSuccess = async () => {
    await fetchServants();
    if (onServantUpdated) onServantUpdated();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div
        dir="rtl"
        className="w-full max-w-[680px] bg-bg-surface border border-border-default rounded-card shadow-elevated p-5 sm:p-6 text-right relative max-h-[92vh] flex flex-col"
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 left-4 text-text-secondary hover:text-text-primary p-1.5 rounded-button hover:bg-bg-muted transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="mb-4 pb-3 border-b border-border-default">
          <div className="flex items-center gap-2 text-brand-primary">
            <Users className="w-6 h-6" />
            <h2 className="text-h2 font-bold text-text-primary">
              إدارة وتنقلات خدام الكنيسة (الأمانة العامة)
            </h2>
          </div>
          <p className="text-caption text-text-secondary mt-0.5">
            البحث عن أي خادم بالكنيسة وإيقافه أو نقله لمرحلة أخرى وسجل حركاته
          </p>
        </div>

        {/* Search & Filters */}
        <div className="space-y-3 mb-4">
          <div className="relative">
            <Search className="w-4 h-4 text-text-tertiary absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث باسم الخادم، أو رقم الهاتف، أو اسم المرحلة..."
              className="w-full bg-bg-muted border border-border-default rounded-input py-2.5 pr-10 pl-4 text-body-small text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-brand-primary"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            {/* Status Tabs */}
            <div className="flex items-center gap-1 bg-bg-muted p-1 rounded-card border border-border-default text-caption">
              <button
                type="button"
                onClick={() => setStatusFilter('ALL')}
                className={cn(
                  'px-3 py-1 rounded font-bold transition-all',
                  statusFilter === 'ALL'
                    ? 'bg-bg-surface text-brand-primary shadow-xs'
                    : 'text-text-secondary hover:text-text-primary'
                )}
              >
                الكل ({servants.length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('ACTIVE')}
                className={cn(
                  'px-3 py-1 rounded font-bold transition-all',
                  statusFilter === 'ACTIVE'
                    ? 'bg-bg-surface text-status-success shadow-xs'
                    : 'text-text-secondary hover:text-text-primary'
                )}
              >
                النشطون ({servants.filter((s) => s.status === 'ACTIVE').length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('SUSPENDED')}
                className={cn(
                  'px-3 py-1 rounded font-bold transition-all',
                  statusFilter === 'SUSPENDED'
                    ? 'bg-bg-surface text-status-danger shadow-xs'
                    : 'text-text-secondary hover:text-text-primary'
                )}
              >
                الموقوفون ({servants.filter((s) => s.status === 'SUSPENDED').length})
              </button>
            </div>

            {/* Stage filter dropdown */}
            {stages.length > 0 && (
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-text-secondary">المرحلة:</span>
                <select
                  value={stageFilter}
                  onChange={(e) => setStageFilter(e.target.value)}
                  className="bg-bg-surface border border-border-default rounded-card px-2.5 py-1 text-caption text-text-primary focus:outline-none focus:border-brand-primary"
                >
                  <option value="ALL">جميع المراحل</option>
                  {stages.map((st) => (
                    <option key={st.id} value={st.id}>
                      {st.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Servants List */}
        <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
          {isLoading ? (
            <div className="text-center py-16 text-text-secondary">
              <div className="inline-block animate-spin w-6 h-6 border-2 border-brand-primary border-t-transparent rounded-full mb-2" />
              <p className="text-body-small">جارٍ تحميل دليل الخدام...</p>
            </div>
          ) : filteredServants.length === 0 ? (
            <div className="text-center py-16 bg-bg-muted/40 rounded-card border border-dashed border-border-default">
              <Users className="w-10 h-10 text-text-tertiary mx-auto mb-2 opacity-50" />
              <p className="text-body font-bold text-text-primary">لم يتم العثور على خدام</p>
              <p className="text-caption text-text-secondary mt-1">
                جرب تغيير كلمات البحث أو خيارات التصفية
              </p>
            </div>
          ) : (
            filteredServants.map((s) => {
              const isSuspended = s.status === 'SUSPENDED';

              return (
                <div
                  key={s.id}
                  className="bg-bg-surface border border-border-default rounded-card p-3.5 shadow-sm hover:border-brand-primary/40 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  {/* Servant Identity */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={cn(
                        'w-10 h-10 rounded-full font-bold flex items-center justify-center shrink-0 text-body',
                        isSuspended
                          ? 'bg-status-danger-soft text-status-danger'
                          : 'bg-brand-primary-soft text-brand-primary'
                      )}
                    >
                      {s.fullName.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-body-small font-bold text-text-primary truncate">
                          {s.fullName}
                        </h4>
                        <Badge variant="neutral" className="text-[10px]">
                          {s.role.name}
                        </Badge>
                        {isSuspended ? (
                          <Badge variant="danger" className="text-[10px]">
                            موقوف
                          </Badge>
                        ) : (
                          <Badge variant="success" className="text-[10px]">
                            نشط
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-3 text-caption text-text-secondary mt-1 flex-wrap">
                        <span className="flex items-center gap-1">
                          <Layers className="w-3.5 h-3.5 text-brand-primary" />
                          <span>المرحلة:</span>
                          <strong className="text-text-primary">
                            {s.currentStage?.name || 'غير مسند لمرحلة'}
                          </strong>
                        </span>

                        {s.phoneNumber && (
                          <span className="flex items-center gap-1 dir-ltr text-[11px]">
                            <Phone className="w-3 h-3 text-text-tertiary" />
                            <span>{s.phoneNumber}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions for General Secretary */}
                  <div className="flex items-center gap-1.5 justify-end shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-border-default/50">
                    {/* Transfer Button */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setTransferServant(s)}
                      className="h-8 px-2.5 text-caption font-semibold gap-1 text-brand-primary hover:bg-brand-primary-soft"
                      title="نقل الخادم لمرحلة أخرى"
                    >
                      <ArrowLeftRight className="w-3.5 h-3.5" />
                      <span>نقل لمرحلة</span>
                    </Button>

                    {/* Stop / Activate Button */}
                    <Button
                      variant={isSuspended ? 'outline' : 'outline'}
                      size="sm"
                      onClick={() => setStopServant(s)}
                      className={cn(
                        'h-8 px-2.5 text-caption font-semibold gap-1',
                        isSuspended
                          ? 'text-status-success hover:bg-status-success-soft hover:border-status-success/30'
                          : 'text-status-danger hover:bg-status-danger-soft hover:border-status-danger/30'
                      )}
                      title={isSuspended ? 'إعادة تنشيط الخادم' : 'إيقاف حساب الخادم'}
                    >
                      {isSuspended ? (
                        <>
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>إلغاء الإيقاف</span>
                        </>
                      ) : (
                        <>
                          <PowerOff className="w-3.5 h-3.5" />
                          <span>إيقاف</span>
                        </>
                      )}
                    </Button>

                    {/* History Button */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setHistoryServant(s)}
                      className="h-8 px-2 text-caption text-text-secondary hover:text-text-primary hover:bg-bg-muted"
                      title="سجل الحركات والتنقلات"
                    >
                      <History className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Sub-modals */}
        {transferServant && (
          <ServantTransferModal
            isOpen={Boolean(transferServant)}
            onClose={() => setTransferServant(null)}
            servant={transferServant}
            currentStageId={transferServant.currentStage?.id}
            onSuccess={handleSubActionSuccess}
          />
        )}

        {stopServant && (
          <ServantStopModal
            isOpen={Boolean(stopServant)}
            onClose={() => setStopServant(null)}
            servant={stopServant}
            currentStageName={stopServant.currentStage?.name}
            onSuccess={handleSubActionSuccess}
          />
        )}

        {historyServant && (
          <ServantStatusHistoryModal
            isOpen={Boolean(historyServant)}
            onClose={() => setHistoryServant(null)}
            servant={historyServant}
          />
        )}
      </div>
    </div>
  );
};
