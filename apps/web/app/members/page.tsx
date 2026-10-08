'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Chip } from '@/components/ui/Chip';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { api } from '@/lib/api';
import { TabBar } from '@/components/layout/TabBar';
import {
  MemberSessionType,
  ServantSessionType,
  SERVANT_SESSION_LABELS,
  getAllowedSessionsForRole,
} from '@shenoda/shared';
import { cn } from '@/lib/utils';
import {
  Users,
  Search,
  UserPlus,
  UploadCloud,
  AlertTriangle,
  ChevronLeft,
  X,
  Phone,
  MapPin,
  Loader2,
  Settings2,
} from 'lucide-react';

type AttStatus = 'PRESENT' | 'ABSENT';

const STATUS_BUTTONS: { key: AttStatus; label: string; active: string }[] = [
  { key: 'PRESENT', label: 'حاضر', active: 'bg-status-success text-white border-status-success' },
  { key: 'ABSENT', label: 'غائب', active: 'bg-status-danger text-white border-status-danger' },
];

// Sketch chips: القداس / الخدمة / الأنشطة (+ الافتقاد)
const MEMBER_SESSION_CHIPS: { key: MemberSessionType; label: string }[] = [
  { key: MemberSessionType.MASS, label: 'القداس' },
  { key: MemberSessionType.SERVICE_ATTENDANCE, label: 'الخدمة' },
  { key: MemberSessionType.ACTIVITY_CLUB_TRIP_CONF, label: 'الأنشطة' },
  { key: MemberSessionType.PASTORAL_VISITATION, label: 'الافتقاد' },
];

const todayLocal = () => {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
};

const initialsOf = (name: string) =>
  name.trim().split(/\s+/).slice(0, 2).map((w) => w.charAt(0)).join('') || 'م';

const StatusButtons: React.FC<{
  value?: AttStatus;
  disabled?: boolean;
  onPick: (s: AttStatus) => void;
  idPrefix: string;
  labels?: Partial<Record<AttStatus, string>>;
}> = ({ value, disabled, onPick, idPrefix, labels }) => (
  <div className="grid grid-cols-2 gap-2">
    {STATUS_BUTTONS.map((b) => (
      <button
        key={b.key}
        id={`${idPrefix}-${b.key}`}
        type="button"
        disabled={disabled}
        onClick={() => onPick(b.key)}
        className={cn(
          'h-9 rounded-button border text-caption font-semibold transition-all active:scale-[0.97] disabled:opacity-50',
          value === b.key
            ? b.active
            : 'bg-bg-surface border-border-default text-text-secondary hover:bg-bg-muted'
        )}
      >
        {labels?.[b.key] || b.label}
      </button>
    ))}
  </div>
);

export default function MembersListPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [members, setMembers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStageId, setSelectedStageId] = useState<string>(() => user?.scopes?.stages?.[0]?.id || '');
  const [assignedOnly, setAssignedOnly] = useState<boolean>(false);

  // Dynamic stages list (from API or user.scopes)
  const [stagesList, setStagesList] = useState<any[]>([]);
  const [bulkStageId, setBulkStageId] = useState('');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);

  // Add Member Form
  const [newFullName, setNewFullName] = useState('');
  const [newDob, setNewDob] = useState('2011-01-01');
  const [newAddress, setNewAddress] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newFatherName, setNewFatherName] = useState('');
  const [newMotherName, setNewMotherName] = useState('');
  const [newSchool, setNewSchool] = useState('');
  const [newGrade, setNewGrade] = useState('');
  const [newStageId, setNewStageId] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  // Bulk Import Form
  const [csvContent, setCsvContent] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [bulkSuccess, setBulkSuccess] = useState<string | null>(null);

  // ---- Attendance on member cards -------------------------------------------------
  const [viewTab, setViewTab] = useState<'members' | 'servants'>('members');
  const [sessionType, setSessionType] = useState<MemberSessionType>(MemberSessionType.MASS);
  const [sessionDate, setSessionDate] = useState<string>(todayLocal());
  const [statusMap, setStatusMap] = useState<Record<string, AttStatus>>({});
  const [alertMemberIds, setAlertMemberIds] = useState<Set<string>>(new Set());
  const [savingId, setSavingId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // ---- Servants tab (level 3+) ----------------------------------------------------
  const [servants, setServants] = useState<any[]>([]);
  const [servantsLoading, setServantsLoading] = useState(false);
  const [servantSession, setServantSession] = useState<ServantSessionType>(ServantSessionType.MASS);
  const [servantStatusMap, setServantStatusMap] = useState<Record<string, AttStatus>>({});

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get('tab');
      if (tabParam === 'servants' || tabParam === 'members') {
        setViewTab(tabParam);
      }
    }
  }, []);

  const isSupervisor = (user?.role?.level ?? 1) >= 3;
  const isGeneralSecretary = (user?.role?.level ?? 1) >= 5 || user?.role?.code === 'GENERAL_SECRETARY';

  // Add Servant Form (Exclusive to General Secretary / الأمين العام)
  const [isAddServantModalOpen, setIsAddServantModalOpen] = useState(false);
  const [servantFullName, setServantFullName] = useState('');
  const [servantPhone, setServantPhone] = useState('');
  const [servantEmail, setServantEmail] = useState('');
  const [servantRoleCode, setServantRoleCode] = useState('SERVANT');
  const [servantStageId, setServantStageId] = useState('');
  const [servantTempPassword, setServantTempPassword] = useState('Demo@123');
  const [isAddingServant, setIsAddingServant] = useState(false);
  const [servantAddError, setServantAddError] = useState<string | null>(null);
  const [rolesList, setRolesList] = useState<{ id?: string; code: string; name: string; level: number }[]>([]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  // Recorded attendance for the chosen stage / session / date
  useEffect(() => {
    if (!user || !selectedStageId) {
      setStatusMap({});
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get('/api/v1/attendance/members', {
          params: { stageId: selectedStageId, sessionType, sessionDate },
        });
        const map: Record<string, AttStatus> = {};
        for (const r of res.data?.data || []) map[r.memberId] = r.status;
        if (!cancelled) setStatusMap(map);
      } catch {
        if (!cancelled) setStatusMap({});
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, selectedStageId, sessionType, sessionDate]);

  // Active absence alerts => "يحتاج افتقاد" badge
  useEffect(() => {
    if (!user || !selectedStageId) {
      setAlertMemberIds(new Set());
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get('/api/v1/attendance/alerts', {
          params: { stageId: selectedStageId, status: 'ACTIVE' },
        });
        const ids = new Set<string>();
        for (const a of res.data?.data || []) {
          const id = a.memberId || a.member?.id;
          if (id) ids.add(id);
        }
        if (!cancelled) setAlertMemberIds(ids);
      } catch {
        if (!cancelled) setAlertMemberIds(new Set());
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, selectedStageId]);

  const markAttendance = async (memberId: string, status: AttStatus) => {
    if (!selectedStageId) return;
    const previous = statusMap[memberId];
    const isDeselect = previous === status;
    const nextStatus = isDeselect ? null : status;

    setStatusMap((m) => {
      const next = { ...m };
      if (isDeselect) {
        delete next[memberId];
      } else {
        next[memberId] = status;
      }
      return next;
    });

    setSavingId(memberId);
    try {
      await api.post('/api/v1/attendance/members/batch', {
        stageId: selectedStageId,
        sessionType,
        sessionDate,
        records: [{ memberId, status: nextStatus }],
      });
    } catch (err: any) {
      setStatusMap((m) => {
        const next = { ...m };
        if (previous) next[memberId] = previous;
        else delete next[memberId];
        return next;
      });
      showToast(err.response?.data?.error?.message || 'تعذر تحديث الحضور، حاول مرة أخرى');
    } finally {
      setSavingId(null);
    }
  };

  // Servants list for the stage
  const fetchServants = useCallback(async () => {
    if (!user || !isSupervisor || !selectedStageId) return;
    try {
      setServantsLoading(true);
      const res = await api.get('/api/v1/attendance/servants/list', {
        params: { stageId: selectedStageId },
      });
      if (res.data?.success) setServants(res.data.data || []);
    } catch {
      setServants([]);
    } finally {
      setServantsLoading(false);
    }
  }, [user, isSupervisor, selectedStageId]);

  useEffect(() => {
    if (viewTab === 'servants') {
      fetchServants();
    }
  }, [viewTab, fetchServants]);

  // Recorded attendance for servants for chosen stage / session / date
  useEffect(() => {
    if (!user || viewTab !== 'servants' || !selectedStageId) {
      setServantStatusMap({});
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get('/api/v1/attendance/servants', {
          params: { stageId: selectedStageId, sessionType: servantSession, sessionDate },
        });
        const map: Record<string, AttStatus> = {};
        for (const r of res.data?.data || []) {
          map[r.servantUserId] = r.status;
        }
        if (!cancelled) setServantStatusMap(map);
      } catch {
        if (!cancelled) setServantStatusMap({});
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, viewTab, selectedStageId, servantSession, sessionDate]);

  const markServant = async (servantUserId: string, status: AttStatus) => {
    const previous = servantStatusMap[servantUserId];
    const isDeselect = previous === status;
    const nextStatus = isDeselect ? null : status;

    setServantStatusMap((m) => {
      const next = { ...m };
      if (isDeselect) {
        delete next[servantUserId];
      } else {
        next[servantUserId] = status;
      }
      return next;
    });

    setSavingId(servantUserId);
    try {
      await api.post('/api/v1/attendance/servants/batch', {
        stageId: selectedStageId,
        sessionType: servantSession,
        sessionDate,
        records: [{ servantUserId, status: nextStatus }],
      });
    } catch (err: any) {
      setServantStatusMap((m) => {
        const next = { ...m };
        if (previous) next[servantUserId] = previous;
        else delete next[servantUserId];
        return next;
      });
      showToast(err.response?.data?.error?.message || 'تعذر تحديث حضور الخادم');
    } finally {
      setSavingId(null);
    }
  };

  const allowedServantSessions = useMemo(
    () => getAllowedSessionsForRole(user?.role?.level ?? 1),
    [user]
  );


  // Load reachable stages from API (fallback to user.scopes.stages)
  useEffect(() => {
    if (!user) return;
    let isMounted = true;
    const fetchStages = async () => {
      try {
        const res = await api.get('/api/v1/stages');
        if (res.data?.success && Array.isArray(res.data.stages)) {
          if (isMounted) setStagesList(res.data.stages);
        }
      } catch {
        // Fallback silently to user.scopes.stages
      }
    };
    fetchStages();
    return () => {
      isMounted = false;
    };
  }, [user]);

  const availableStages = useMemo(() => {
    return stagesList.length > 0 ? stagesList : (user?.scopes?.stages || []);
  }, [stagesList, user]);

  // Set default stage when user or stages load
  useEffect(() => {
    if (availableStages.length > 0) {
      if (!newStageId) setNewStageId(availableStages[0].id);
      if (!bulkStageId) setBulkStageId(availableStages[0].id);

      if (!selectedStageId) {
        setSelectedStageId(availableStages[0].id);
      }
    }
  }, [availableStages, selectedStageId, newStageId, bulkStageId]);

  // Fetch members
  const fetchMembers = useCallback(async () => {
    if (!user) return;
    if (availableStages.length > 0 && !selectedStageId) return;

    try {
      setIsLoading(true);
      setErrorMsg(null);

      const params: any = {};
      if (selectedStageId) params.stageId = selectedStageId;
      if (searchQuery.trim()) params.search = searchQuery.trim();
      if (assignedOnly) params.assignedOnly = 'true';

      const res = await api.get('/api/v1/members', { params });
      if (res.data?.success) {
        setMembers(res.data.members || []);
      }
    } catch (err: any) {
      setErrorMsg(
        err.response?.data?.error?.message || 'تعذر تحميل قائمة المخدومين'
      );
    } finally {
      setIsLoading(false);
    }
  }, [user, selectedStageId, searchQuery, assignedOnly, availableStages.length]);

  // Handle stage change with race-condition cancellation
  useEffect(() => {
    if (!user) return;
    // Do not query without stageId if stages exist
    if (availableStages.length > 0 && !selectedStageId) return;

    let cancelled = false;
    (async () => {
      try {
        setIsLoading(true);
        setErrorMsg(null);

        const params: any = {};
        if (selectedStageId) params.stageId = selectedStageId;
        if (searchQuery.trim()) params.search = searchQuery.trim();
        if (assignedOnly) params.assignedOnly = 'true';

        const res = await api.get('/api/v1/members', { params });
        if (!cancelled && res.data?.success) {
          setMembers(res.data.members || []);
        }
      } catch (err: any) {
        if (!cancelled) {
          setErrorMsg(
            err.response?.data?.error?.message || 'تعذر تحميل قائمة المخدومين'
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user, selectedStageId, searchQuery, assignedOnly, availableStages.length]);

  // Client-side strict stage isolation guarantee
  const displayMembers = useMemo(() => {
    if (!selectedStageId) return members;
    return members.filter((m) => {
      const mStageId = m.stageId || m.stage?.id;
      return !mStageId || mStageId === selectedStageId;
    });
  }, [members, selectedStageId]);

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError(null);

    const targetStage = newStageId || selectedStageId || availableStages[0]?.id;
    if (!targetStage) {
      setAddError('يرجى اختيار المرحلة للمخدوم');
      return;
    }

    try {
      setIsAdding(true);
      const res = await api.post('/api/v1/members', {
        fullName: newFullName,
        dateOfBirth: newDob,
        address: newAddress,
        phoneNumber: newPhone || undefined,
        fatherName: newFatherName || undefined,
        motherName: newMotherName || undefined,
        schoolOrUniversity: newSchool || undefined,
        educationalGrade: newGrade || undefined,
        stageId: targetStage,
      });

      if (res.data?.success) {
        setIsAddModalOpen(false);
        setNewFullName('');
        setNewAddress('');
        setNewPhone('');
        fetchMembers();
      }
    } catch (err: any) {
      setAddError(
        err.response?.data?.error?.message || 'حدث خطأ أثناء إضافة المخدوم'
      );
    } finally {
      setIsAdding(false);
    }
  };

  const handleBulkImport = async (e: React.FormEvent) => {
    e.preventDefault();
    setBulkError(null);
    setBulkSuccess(null);

    const targetStage = bulkStageId || selectedStageId || availableStages[0]?.id;
    if (!targetStage) {
      setBulkError('يرجى اختيار المرحلة المستهدفة للاستيراد');
      return;
    }

    if (!csvContent.trim()) {
      setBulkError('يرجى إدخال محتوى CSV للاستيراد');
      return;
    }

    try {
      setIsImporting(true);
      const res = await api.post('/api/v1/members/bulk-import', {
        stageId: targetStage,
        csvContent,
      });

      if (res.data?.success) {
        setBulkSuccess(res.data.message || 'تم الاستيراد بنجاح');
        setCsvContent('');
        fetchMembers();
      }
    } catch (err: any) {
      setBulkError(
        err.response?.data?.error?.message || 'حدث خطأ أثناء الاستيراد الجماعي'
      );
    } finally {
      setIsImporting(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    const fetchRoles = async () => {
      try {
        const res = await api.get('/api/v1/accounts/roles');
        if (res.data?.success && Array.isArray(res.data.roles) && isMounted) {
          setRolesList(res.data.roles);
        }
      } catch {
        // Fallback silently
      }
    };
    fetchRoles();
    return () => {
      isMounted = false;
    };
  }, []);

  const availableServantRoles = useMemo(() => {
    if (rolesList.length > 0) {
      return rolesList.filter((r) => r.level < 5);
    }
    return [
      { code: 'SERVANT', name: 'خادم مرحلة', level: 1 },
      { code: 'ASSISTANT_SECRETARY', name: 'مساعد أمين الخدمة', level: 2 },
      { code: 'STAGE_SECRETARY', name: 'أمين الخدمة', level: 3 },
      { code: 'SECTOR_SECRETARY', name: 'أمين قطاع', level: 4 },
    ];
  }, [rolesList]);

  const handleAddServant = async (e: React.FormEvent) => {
    e.preventDefault();
    setServantAddError(null);

    const targetStage = servantStageId || selectedStageId || availableStages[0]?.id;
    if (!targetStage) {
      setServantAddError('يرجى تحديد المرحلة المسند إليها الخادم');
      return;
    }

    try {
      setIsAddingServant(true);
      const res = await api.post('/api/v1/accounts/create', {
        fullName: servantFullName.trim(),
        phoneNumber: servantPhone.trim(),
        email: servantEmail.trim() || undefined,
        roleCode: servantRoleCode,
        stageId: targetStage,
        temporaryPassword: servantTempPassword || 'Demo@123',
      });

      if (res.data?.success) {
        setIsAddServantModalOpen(false);
        setServantFullName('');
        setServantPhone('');
        setServantEmail('');
        setServantTempPassword('Demo@123');
        showToast('تمت إضافة الخادم بنجاح');
        fetchServants();
      }
    } catch (err: any) {
      setServantAddError(
        err.response?.data?.error?.message || 'حدث خطأ أثناء إضافة الخادم'
      );
    } finally {
      setIsAddingServant(false);
    }
  };

  const canManage = (user?.role.level || 1) >= 2;

  const currentStageName =
    availableStages.find((s: any) => s.id === selectedStageId)?.name || 'المرحلة';

  const visibleServants = servants.filter((s) => s.id !== user?.id);

  return (
    <ProtectedRoute>
      <div dir="rtl" className="min-h-screen bg-bg-app flex flex-col items-center pb-24">
        <div className="w-full max-w-[480px] flex flex-col">
          {/* App bar + switcher */}
          <header className="sticky top-0 z-30 bg-brand-primary text-white shadow-card">
            <div className="h-14 px-4 flex items-center justify-between gap-2">
              <div className="min-w-0 text-right">
                <h1 className="text-h2 font-bold leading-tight truncate">
                  {viewTab === 'servants' ? 'الخدام' : 'المخدومين'} ({currentStageName})
                </h1>
              </div>
              {canManage && viewTab === 'members' && (
                <button
                  id="members-bulk-import"
                  type="button"
                  onClick={() => setIsBulkModalOpen(true)}
                  aria-label="استيراد جماعي"
                  className="w-9 h-9 rounded-button flex items-center justify-center hover:bg-white/10 transition-colors"
                >
                  <UploadCloud className="w-5 h-5" />
                </button>
              )}
            </div>

            {isSupervisor && (
              <div className="grid grid-cols-2 border-t border-white/10">
                {(['servants', 'members'] as const).map((t) => (
                  <button
                    key={t}
                    id={`members-tab-${t}`}
                    type="button"
                    onClick={() => setViewTab(t)}
                    className={cn(
                      'h-11 text-body-small font-bold transition-colors border-b-[3px]',
                      viewTab === t
                        ? 'border-brand-accent text-white bg-white/10'
                        : 'border-transparent text-white/70 hover:text-white'
                    )}
                  >
                    {t === 'servants' ? 'الخدام' : 'المخدومين'}
                  </button>
                ))}
              </div>
            )}
          </header>

          <div className="px-4 pt-3 flex flex-col gap-3">
            {/* Stage chips (only when more than one stage is reachable) */}
            {availableStages.length > 1 && (
              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none select-none">
                {availableStages.map((stg: any) => (
                  <Chip
                    key={stg.id}
                    selected={selectedStageId === stg.id}
                    onClick={() => setSelectedStageId(stg.id)}
                  >
                    {stg.name}
                  </Chip>
                ))}
              </div>
            )}

            {/* Session chips + date */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none select-none">
              {viewTab === 'members'
                ? MEMBER_SESSION_CHIPS.map((c) => (
                    <Chip key={c.key} selected={sessionType === c.key} onClick={() => setSessionType(c.key)}>
                      {c.label}
                    </Chip>
                  ))
                : allowedServantSessions.map((s) => (
                    <Chip key={s} selected={servantSession === s} onClick={() => setServantSession(s)}>
                      {SERVANT_SESSION_LABELS[s].ar}
                    </Chip>
                  ))}
            </div>

            <div className="flex items-center gap-2">
              <input
                id="members-session-date"
                type="date"
                value={sessionDate}
                onChange={(e) => setSessionDate(e.target.value || todayLocal())}
                className="h-10 px-3 rounded-input border border-border-default bg-bg-surface text-body-small text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-primary"
              />
              {viewTab === 'members' && (
                <div className="flex-1">
                  <Input
                    placeholder="ابحث بالاسم أو الهاتف..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    iconLeading={<Search className="w-4 h-4 text-text-secondary" />}
                    className="h-10 bg-bg-surface text-body-small"
                  />
                </div>
              )}
            </div>

            {viewTab === 'members' && user?.role.level === 1 && (
              <label className="flex items-center justify-between bg-bg-surface border border-border-default rounded-card px-4 py-2.5">
                <span className="text-caption font-semibold text-text-primary">
                  عرض المخدومين المسندين لي فقط
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={assignedOnly}
                  onClick={() => setAssignedOnly(!assignedOnly)}
                  className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                    assignedOnly ? 'bg-brand-primary' : 'bg-bg-muted'
                  }`}
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                      assignedOnly ? '-translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </label>
            )}
          </div>

          {/* List */}
          <main className="px-4 py-3 flex flex-col gap-3">
            {viewTab === 'servants' ? (
              <>
                {servantsLoading ? (
                  <div className="py-12 flex justify-center">
                    <Loader2 className="w-7 h-7 animate-spin text-brand-primary" />
                  </div>
                ) : visibleServants.length === 0 ? (
                  <div className="bg-bg-surface border border-border-default rounded-card p-8 text-center text-body-small text-text-secondary">
                    لا يوجد خدام في هذه المرحلة
                  </div>
                ) : (
                  visibleServants.map((s) => (
                    <div
                      key={s.id}
                      className="bg-bg-surface border border-border-default rounded-card p-3.5 shadow-card flex flex-col gap-3"
                    >
                      <button
                        type="button"
                        onClick={() => router.push(`/servants/${s.id}`)}
                        className="flex items-center gap-3 text-right w-full group cursor-pointer"
                      >
                        <div className="w-11 h-11 rounded-full bg-brand-primary-soft text-brand-primary font-bold flex items-center justify-center shrink-0 border border-[#D5E1F0]">
                          {initialsOf(s.fullName)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-body-default font-bold text-text-primary truncate group-hover:text-brand-primary transition-colors">
                            {s.fullName}
                          </h3>
                          <p className="text-caption text-text-secondary truncate">
                            {s.role?.name || 'خادم'}
                            {s.currentStage?.name ? ` • ${s.currentStage.name}` : ''}
                          </p>
                        </div>
                        {s.status === 'SUSPENDED' ? (
                          <Badge variant="neutral" className="shrink-0">موقوف</Badge>
                        ) : (
                          <Badge variant="success" className="shrink-0">
                            {s.stats?.attendanceRatePercentage ?? 100}%
                          </Badge>
                        )}
                        <ChevronLeft className="w-4 h-4 text-text-secondary shrink-0 group-hover:text-brand-primary transition-colors" />
                      </button>
                      <StatusButtons
                        idPrefix={`servant-${s.id}`}
                        value={servantStatusMap[s.id]}
                        disabled={savingId === s.id || s.status === 'SUSPENDED'}
                        onPick={(st) => markServant(s.id, st)}
                        labels={
                          servantSession === ServantSessionType.LESSON_PREPARATION
                            ? { PRESENT: 'حضر', ABSENT: 'لم يحضر' }
                            : undefined
                        }
                      />
                    </div>
                  ))
                )}
                <button
                  type="button"
                  onClick={() => router.push('/attendance?view=servants')}
                  className="mt-1 flex items-center justify-center gap-2 h-11 rounded-button border border-border-default bg-bg-surface text-body-small font-semibold text-brand-primary hover:bg-bg-muted transition-colors"
                >
                  <Settings2 className="w-4 h-4" />
                  إدارة بيانات الخدام ومتابعتهم التفصيلية
                </button>
              </>
            ) : isLoading ? (
              <div className="py-12 flex flex-col items-center justify-center gap-2 text-text-secondary">
                <Loader2 className="w-7 h-7 animate-spin text-brand-primary" />
                <span className="text-body-small">جاري تحميل سجلات المخدومين...</span>
              </div>
            ) : errorMsg ? (
              <div className="p-4 bg-status-danger-soft border border-[#F5C2BE] rounded-card text-center text-status-danger text-body-small">
                {errorMsg}
              </div>
            ) : displayMembers.length === 0 ? (
              <div className="bg-bg-surface border border-border-default rounded-card p-8 text-center flex flex-col items-center shadow-card">
                <Users className="w-12 h-12 text-text-secondary/40 mb-2" />
                <h3 className="text-body-default font-bold text-text-primary">لا يوجد مخدومين مسجلين</h3>
                <p className="text-caption text-text-secondary mt-1 max-w-xs">
                  {canManage
                    ? 'يمكنك إضافة مخدوم جديد أو استخدام خاصية الاستيراد الجماعي.'
                    : 'لم يتم العثور على مخدومين مطابقين لمعايير البحث في هذه المرحلة.'}
                </p>
              </div>
            ) : (
              displayMembers.map((member) => {
                const needsFollowUp = alertMemberIds.has(member.id);
                const canMark = Boolean(selectedStageId) && ((user?.role.level || 1) >= 2 || member.isAssigned);
                return (
                  <div
                    key={member.id}
                    className={cn(
                      'bg-bg-surface border rounded-card p-3.5 shadow-card flex flex-col gap-3',
                      needsFollowUp ? 'border-status-danger/40' : 'border-border-default'
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => router.push(`/members/${member.id}`)}
                      className="flex items-center gap-3 text-right w-full"
                    >
                      <div className="w-11 h-11 rounded-full bg-brand-primary-soft text-brand-primary font-bold flex items-center justify-center shrink-0 border border-[#D5E1F0]">
                        {initialsOf(member.fullName)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-body-default font-bold text-text-primary truncate">{member.fullName}</h3>
                        <p className="text-caption text-text-secondary truncate">
                          {member.educationalGrade || member.stage?.name}
                          {member.servantAssignments?.[0]?.servant?.fullName ? (
                            <span className="text-brand-primary font-medium"> • خادم: {member.servantAssignments[0].servant.fullName}</span>
                          ) : (
                            <span className="text-amber-600 font-medium"> • غير مسند لخادم</span>
                          )}
                        </p>
                      </div>
                      {needsFollowUp ? (
                        <Badge variant="danger" className="shrink-0">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          يحتاج افتقاد
                        </Badge>
                      ) : (
                        <Badge variant="success" withDot className="shrink-0">ملتزم</Badge>
                      )}
                      <ChevronLeft className="w-4 h-4 text-text-secondary shrink-0" />
                    </button>
                    {canMark && (
                      <StatusButtons
                        idPrefix={`member-${member.id}`}
                        value={statusMap[member.id]}
                        disabled={savingId === member.id}
                        onPick={(st) => markAttendance(member.id, st)}
                      />
                    )}
                  </div>
                );
              })
            )}
          </main>

          {toast && (
            <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 max-w-[90%] px-4 py-2.5 rounded-button bg-text-primary text-white text-body-small shadow-elevated">
              {toast}
            </div>
          )}
          {/* Floating Action Button (FAB) */}
          {viewTab === 'members' ? (
            canManage && (
              <div className="fixed bottom-20 left-4 z-30 sm:static sm:mt-2">
                <Button
                  id="btn-add-member"
                  variant="accent"
                  onClick={() => setIsAddModalOpen(true)}
                  className="shadow-elevated rounded-pill px-5 h-[48px] gap-2 font-bold text-white bg-brand-accent hover:bg-[#a67923]"
                >
                  <UserPlus className="w-5 h-5" />
                  <span>إضافة مخدوم</span>
                </Button>
              </div>
            )
          ) : (
            isGeneralSecretary && (
              <div className="fixed bottom-20 left-4 z-30 sm:static sm:mt-2">
                <Button
                  id="btn-add-servant"
                  variant="accent"
                  onClick={() => {
                    setServantAddError(null);
                    setServantStageId(selectedStageId || availableStages[0]?.id || '');
                    setIsAddServantModalOpen(true);
                  }}
                  className="shadow-elevated rounded-pill px-5 h-[48px] gap-2 font-bold text-white bg-brand-accent hover:bg-[#a67923]"
                >
                  <UserPlus className="w-5 h-5" />
                  <span>إضافة خدام</span>
                </Button>
              </div>
            )
          )}

          {/* Modal 1: Add New Member (FR-3.2) */}
          {isAddModalOpen && (
            <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
              <div
                dir="rtl"
                className="w-full max-w-[440px] bg-bg-surface border border-border-default rounded-card shadow-elevated p-6 text-right relative max-h-[90vh] overflow-y-auto"
              >
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="absolute top-4 left-4 text-text-secondary hover:text-text-primary p-1"
                >
                  <X className="w-5 h-5" />
                </button>

                <div className="mb-4">
                  <h2 className="text-h2 font-bold text-brand-primary">إضافة مخدوم جديد</h2>
                  <p className="text-caption text-text-secondary mt-0.5">
                    سجل مخدوم كنسي بدون صلاحية دخول (FR-3.4)
                  </p>
                </div>

                {addError && (
                  <div className="mb-4 p-3 bg-status-danger-soft border border-[#F5C2BE] rounded-lg text-caption text-status-danger">
                    {addError}
                  </div>
                )}

                <form onSubmit={handleAddMember} className="flex flex-col gap-3.5">
                  <Input
                    label="الاسم بالكامل"
                    placeholder="مثال: يوسف ماجد فخري"
                    value={newFullName}
                    onChange={(e) => setNewFullName(e.target.value)}
                    required
                  />

                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      type="date"
                      label="تاريخ الميلاد"
                      value={newDob}
                      onChange={(e) => setNewDob(e.target.value)}
                      required
                    />
                    <Input
                      label="رقم الهاتف"
                      placeholder="01xxxxxxxxx"
                      value={newPhone}
                      onChange={(e) => setNewPhone(e.target.value)}
                      iconLeading={<Phone className="w-4 h-4" />}
                    />
                  </div>

                  <Input
                    label="العنوان"
                    placeholder="الشارع، المنطقة، القاهرة"
                    value={newAddress}
                    onChange={(e) => setNewAddress(e.target.value)}
                    iconLeading={<MapPin className="w-4 h-4" />}
                    required
                  />

                  {/* Stage Selection */}
                  <div className="flex flex-col gap-1.5 text-right">
                    <label className="text-body-small font-medium text-text-primary">
                      المرحلة
                    </label>
                    <select
                      value={newStageId || selectedStageId || availableStages[0]?.id || ''}
                      onChange={(e) => setNewStageId(e.target.value)}
                      className="w-full h-[46px] bg-bg-surface text-text-primary font-cairo text-body-default rounded-input border border-border-default px-3 focus:outline-none focus:ring-2 focus:ring-brand-primary"
                    >
                      {availableStages.map((stg) => (
                        <option key={stg.id} value={stg.id}>
                          {stg.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      label="اسم الأب"
                      value={newFatherName}
                      onChange={(e) => setNewFatherName(e.target.value)}
                    />
                    <Input
                      label="اسم الأم"
                      value={newMotherName}
                      onChange={(e) => setNewMotherName(e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      label="المدرسة / الكلية"
                      value={newSchool}
                      onChange={(e) => setNewSchool(e.target.value)}
                    />
                    <Input
                      label="الصف الدراسي"
                      value={newGrade}
                      onChange={(e) => setNewGrade(e.target.value)}
                    />
                  </div>

                  <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border-default">
                    <Button
                      type="submit"
                      variant="primary"
                      fullWidth
                      isLoading={isAdding}
                      className="h-[46px]"
                    >
                      حفظ السجل
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsAddModalOpen(false)}
                      className="h-[46px]"
                    >
                      إلغاء
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Modal 2: Bulk CSV Import (FR-3.3) */}
          {isBulkModalOpen && (
            <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
              <div
                dir="rtl"
                className="w-full max-w-[460px] bg-bg-surface border border-border-default rounded-card shadow-elevated p-6 text-right relative max-h-[90vh] overflow-y-auto"
              >
                <button
                  type="button"
                  onClick={() => setIsBulkModalOpen(false)}
                  className="absolute top-4 left-4 text-text-secondary hover:text-text-primary p-1"
                >
                  <X className="w-5 h-5" />
                </button>

                <div className="mb-4">
                  <h2 className="text-h2 font-bold text-brand-primary">استيراد جماعي للمخدومين</h2>
                  <p className="text-caption text-text-secondary mt-0.5">
                    تحميل قائمة مخدومين بصيغة CSV إلى المرحلة المحددة
                  </p>
                </div>

                {bulkError && (
                  <div className="mb-4 p-3 bg-status-danger-soft border border-[#F5C2BE] rounded-lg text-caption text-status-danger">
                    {bulkError}
                  </div>
                )}

                {bulkSuccess && (
                  <div className="mb-4 p-3 bg-status-success-soft border border-[#BDE5D0] rounded-lg text-caption text-status-success">
                    {bulkSuccess}
                  </div>
                )}

                <form onSubmit={handleBulkImport} className="flex flex-col gap-3.5">
                  <div className="p-3 bg-bg-muted/60 rounded-lg text-caption text-text-secondary leading-relaxed">
                    <strong>الترويسات المقبولة:</strong> الاسم بالكامل، تاريخ الميلاد (YYYY-MM-DD)، العنوان، رقم الهاتف، اسم الأب، اسم الأم، المدرسة.
                  </div>

                  {/* Stage Selection for Bulk Import */}
                  <div className="flex flex-col gap-1.5 text-right">
                    <label className="text-body-small font-medium text-text-primary">
                      المرحلة المستهدفة للاستيراد
                    </label>
                    <select
                      value={bulkStageId || selectedStageId || availableStages[0]?.id || ''}
                      onChange={(e) => setBulkStageId(e.target.value)}
                      className="w-full h-[46px] bg-bg-surface text-text-primary font-cairo text-body-default rounded-input border border-border-default px-3 focus:outline-none focus:ring-2 focus:ring-brand-primary"
                    >
                      {availableStages.map((stg) => (
                        <option key={stg.id} value={stg.id}>
                          {stg.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5 text-right">
                    <label className="text-body-small font-medium text-text-primary">
                      بيانات CSV
                    </label>
                    <textarea
                      rows={6}
                      value={csvContent}
                      onChange={(e) => setCsvContent(e.target.value)}
                      placeholder={`الاسم بالكامل,تاريخ الميلاد,العنوان,رقم الهاتف\nمارك وحيد شوقي,2011-04-12,مصر القديمة,01233334444\nفادي عادل رمزي,2011-09-18,المنيل,01255556666`}
                      className="w-full bg-bg-surface text-text-primary font-mono text-body-small rounded-input border border-border-default p-3 focus:outline-none focus:ring-2 focus:ring-brand-primary resize-none"
                      required
                    />
                  </div>

                  <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border-default">
                    <Button
                      type="submit"
                      variant="primary"
                      fullWidth
                      isLoading={isImporting}
                      className="h-[46px]"
                    >
                      بدء الاستيراد
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsBulkModalOpen(false)}
                      className="h-[46px]"
                    >
                      إلغاء
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Modal 3: Add New Servant (Exclusive to General Secretary / الأمين العام) */}
          {isAddServantModalOpen && (
            <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
              <div
                dir="rtl"
                className="w-full max-w-[440px] bg-bg-surface border border-border-default rounded-card shadow-elevated p-6 text-right relative max-h-[90vh] overflow-y-auto"
              >
                <button
                  type="button"
                  onClick={() => setIsAddServantModalOpen(false)}
                  className="absolute top-4 left-4 text-text-secondary hover:text-text-primary p-1"
                >
                  <X className="w-5 h-5" />
                </button>

                <div className="mb-4">
                  <h2 className="text-h2 font-bold text-brand-primary">إضافة خادم جديد</h2>
                  <p className="text-caption text-text-secondary mt-0.5">
                    إنشاء حساب مصرح وإسناده لمرحلة الخدمة (صلاحية حصرية للأمين العام)
                  </p>
                </div>

                {servantAddError && (
                  <div className="mb-4 p-3 bg-status-danger-soft border border-[#F5C2BE] rounded-lg text-caption text-status-danger">
                    {servantAddError}
                  </div>
                )}

                <form onSubmit={handleAddServant} className="flex flex-col gap-3.5">
                  <Input
                    label="الاسم بالكامل *"
                    placeholder="مثال: يوسف ماجد فخري"
                    value={servantFullName}
                    onChange={(e) => setServantFullName(e.target.value)}
                    required
                  />

                  <Input
                    label="رقم الهاتف المحمول *"
                    type="tel"
                    placeholder="01xxxxxxxxx"
                    value={servantPhone}
                    onChange={(e) => setServantPhone(e.target.value)}
                    iconLeading={<Phone className="w-4 h-4" />}
                    required
                  />

                  <Input
                    label="البريد الإلكتروني (اختياري)"
                    type="email"
                    placeholder="servant@church.com"
                    value={servantEmail}
                    onChange={(e) => setServantEmail(e.target.value)}
                  />

                  {/* Stage Selection */}
                  <div className="flex flex-col gap-1.5 text-right">
                    <label className="text-body-small font-medium text-text-primary">
                      المرحلة المسند إليها الخادم *
                    </label>
                    <select
                      value={servantStageId || selectedStageId || availableStages[0]?.id || ''}
                      onChange={(e) => setServantStageId(e.target.value)}
                      className="w-full h-[46px] bg-bg-surface text-text-primary font-cairo text-body-default rounded-input border border-border-default px-3 focus:outline-none focus:ring-2 focus:ring-brand-primary"
                    >
                      {availableStages.map((stg: any) => (
                        <option key={stg.id} value={stg.id}>
                          {stg.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Role Selection */}
                  <div className="flex flex-col gap-1.5 text-right">
                    <label className="text-body-small font-medium text-text-primary">
                      الدور / الرتبة في الخدمة *
                    </label>
                    <select
                      value={servantRoleCode}
                      onChange={(e) => setServantRoleCode(e.target.value)}
                      className="w-full h-[46px] bg-bg-surface text-text-primary font-cairo text-body-default rounded-input border border-border-default px-3 focus:outline-none focus:ring-2 focus:ring-brand-primary"
                    >
                      {availableServantRoles.map((r: any) => (
                        <option key={r.code} value={r.code}>
                          {r.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <Input
                    label="كلمة المرور المؤقتة *"
                    type="text"
                    value={servantTempPassword}
                    onChange={(e) => setServantTempPassword(e.target.value)}
                    required
                  />

                  <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border-default">
                    <Button
                      type="submit"
                      variant="primary"
                      fullWidth
                      isLoading={isAddingServant}
                      className="h-[46px]"
                    >
                      إنشاء حساب الخادم
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsAddServantModalOpen(false)}
                      className="h-[46px]"
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
        <TabBar activeTab="members" />
      </div>
    </ProtectedRoute>
  );
}