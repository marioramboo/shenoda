'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { AttendanceToggle } from '@/components/ui/AttendanceToggle';
import { FollowUpTable, FollowUpRecord } from '@/components/attendance/FollowUpTable';
import { Chip } from '@/components/ui/Chip';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { TabBar } from '@/components/layout/TabBar';
import { api } from '@/lib/api';
import {
  MemberSessionType,
  ServantSessionType,
  AttendanceStatus,
  MEMBER_SESSION_LABELS,
  SERVANT_SESSION_LABELS,
  getAllowedSessionsForRole,
} from '@shenoda/shared';
import {
  Calendar,
  ChevronRight,
  ChevronLeft,
  Search,
  CheckCircle,
  AlertTriangle,
  FileText,
  Save,
  Users,
  UserCheck,
  BellRing,
  X,
  Phone,
  Clock,
  Sparkles,
  Pencil,
  Plus,
  Trash2,
  HeartHandshake,
  User,
  Shield,
  Briefcase,
  Award,
  ArrowLeftRight,
  PowerOff,
  RotateCcw,
  History,
  Camera,
  MessageCircle,
  Share2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ServantTransferModal } from '@/components/servants/ServantTransferModal';
import { ServantStopModal } from '@/components/servants/ServantStopModal';
import { ServantStatusHistoryModal } from '@/components/servants/ServantStatusHistoryModal';
import { ServantDirectoryModal } from '@/components/servants/ServantDirectoryModal';

const SERVANT_TALENTS_PRESET = [
  'ألحان وترتيل',
  'شعر وكتابة',
  'تمثيل وإلقاء',
  'تكنولوجيا وبرمجة وميديا',
  'كرة قدم ورياضة',
];

const SERVANT_ACTIVITIES_PRESET = [
  'كورال',
  'مسرح',
  'كشافة',
  'كورة',
];

const SERVANT_DEACON_RANKS = [
  'إبصالتس (مرتل)',
  'أغنسطس (قارئ)',
  'إيبودياكون (مساعد شماس)',
  'دياكون (شماس كامل)',
  'أرشيدياكون (رئيس شمامسة)',
];

interface MemberItem {
  id: string;
  fullName: string;
  educationalGrade?: string | null;
  phoneNumber?: string | null;
  status: AttendanceStatus;
  notes?: string;
  consecutiveAbsences?: number;
}

interface AbsenceAlertItem {
  id: string;
  memberId?: string;
  member?: {
    id: string;
    fullName: string;
    phoneNumber?: string;
    educationalGrade?: string;
  };
  consecutiveCount: number;
  lastAttendedDate?: string;
  alertStatus: string;
  resolutionNotes?: string;
}

export interface ServantEvaluationItem {
  financialStatus?: string | null;
  behaviorWithMembers?: string | null;
  behaviorWithServants?: string | null;
  cooperation?: string | null;
  individualInitiative?: string | null;
  notes?: string | null;
}

export interface ServantChildItem {
  name: string;
  age: string;
}

export interface StageServantItem {
  id: string;
  fullName: string;
  phoneNumber?: string;
  email?: string;
  status?: string;
  fatherConfessor?: string | null;
  dateOfBirth?: string | null;
  address?: string | null;
  maritalStatus?: string | null;
  spouseName?: string | null;
  educationOrCareer?: string | null;
  childrenInfo?: any;
  whatsappPhone?: string | null;
  whatsappPhoneRaw?: string | null;
  facebookUrl?: string | null;
  instagramUrl?: string | null;
  talents?: string[] | null;
  siblingsInfo?: any;
  activities?: string[] | null;
  isDeacon?: boolean | null;
  deaconName?: string | null;
  deaconRank?: string | null;
  profilePicture?: string | null;
  role: {
    id: string;
    name: string;
    code: string;
    level: number;
  };
  evaluation?: ServantEvaluationItem | null;
  stats?: {
    attendanceRatePercentage: number;
    presentCount: number;
    absentCount: number;
    excusedCount: number;
    totalSessions: number;
  };
}

const getRoleDisplayName = (code: string, fallbackName?: string) => {
  switch (code) {
    case 'SERVANT':
      return 'خادم مرحلة (SERVANT)';
    case 'ASSISTANT_SECRETARY':
      return 'مساعد أمين الخدمة (ASSISTANT_SECRETARY)';
    case 'STAGE_SECRETARY':
      return 'أمين الخدمة / أمين مرحلة (STAGE_SECRETARY)';
    case 'SECTOR_SECRETARY':
      return 'أمين قطاع (SECTOR_SECRETARY)';
    case 'GENERAL_SECRETARY':
      return 'الأمين العام (GENERAL_SECRETARY)';
    default:
      return fallbackName ? `${fallbackName} (${code})` : code;
  }
};

export default function AttendancePage() {
  const { user } = useAuth();
  const router = useRouter();

  const isSupervisor = Boolean(user && user.role && user.role.level >= 3);

  // Active top view tab: 'members' (تسجيل حضور المخدومين) | 'servants' (متابعة الخدام) | 'alerts' (تنبيهات الافتقاد)
  const [activeView, setActiveView] = useState<'members' | 'servants' | 'alerts'>('members');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const viewParam = params.get('view');
      if (viewParam === 'servants' || viewParam === 'alerts' || viewParam === 'members') {
        setActiveView(viewParam);
      }
    }
  }, []);

  // Date selection (default to nearest Friday)
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const now = new Date();
    const day = now.getDay();
    // Friday is day 5
    const diff = (5 - day + 7) % 7;
    const friday = new Date(now);
    friday.setDate(now.getDate() + diff);
    return friday.toISOString().split('T')[0];
  });

  // Selected session types
  const [memberSessionType, setMemberSessionType] = useState<MemberSessionType>(
    MemberSessionType.SERVICE_ATTENDANCE
  );
  const [servantSessionType, setServantSessionType] = useState<ServantSessionType>(
    ServantSessionType.SERVICE_ATTENDANCE
  );

  // Dynamic stages list (from API or user.scopes)
  const [stagesList, setStagesList] = useState<any[]>([]);

  useEffect(() => {
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
  }, []);

  const availableStages = stagesList.length > 0 ? stagesList : (user?.scopes?.stages || []);

  // Stage selection (from user scopes)
  const primaryStageId = availableStages[0]?.id || user?.scopes?.stages?.[0]?.id || '';
  const [selectedStageId, setSelectedStageId] = useState<string>(primaryStageId);

  // Sync selectedStageId when stages load
  useEffect(() => {
    if (availableStages.length > 0 && !selectedStageId) {
      setSelectedStageId(availableStages[0].id);
    }
  }, [availableStages, selectedStageId]);

  // Members list & state
  const [members, setMembers] = useState<MemberItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);
  const [saveErrorMessage, setSaveErrorMessage] = useState<string | null>(null);

  // Active note editing modal
  const [noteModalMember, setNoteModalMember] = useState<MemberItem | null>(null);
  const [noteDraft, setNoteDraft] = useState('');

  // Alerts state
  const [alerts, setAlerts] = useState<AbsenceAlertItem[]>([]);
  const [isLoadingAlerts, setIsLoadingAlerts] = useState(false);
  const [resolveModalAlert, setResolveModalAlert] = useState<AbsenceAlertItem | null>(null);
  const [resolveOutcomeText, setResolveOutcomeText] = useState('');
  const [isResolvingAlert, setIsResolvingAlert] = useState(false);

  // Servant follow-up records state
  const [servantRecords, setServantRecords] = useState<FollowUpRecord[]>([]);
  const [servantStats, setServantStats] = useState<any>(null);
  const [isLoadingServants, setIsLoadingServants] = useState(false);

  // Stage Servants List & Supervision (Level 3+)
  const [stageServants, setStageServants] = useState<StageServantItem[]>([]);
  const [selectedServantId, setSelectedServantId] = useState<string | null>(null);
  const [isLoadingServantsList, setIsLoadingServantsList] = useState(false);

  // Servant attendance recording modal (Level 3+)
  const [isRecordServantModalOpen, setIsRecordServantModalOpen] = useState(false);
  const [recordServantDate, setRecordServantDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [recordServantSessionType, setRecordServantSessionType] = useState<ServantSessionType>(ServantSessionType.SERVICE_ATTENDANCE);
  const [recordServantStatus, setRecordServantStatus] = useState<AttendanceStatus>('PRESENT');
  const [recordServantNotes, setRecordServantNotes] = useState('');
  const [isSavingServantAttendance, setIsSavingServantAttendance] = useState(false);
  const [servantFeedbackMessage, setServantFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // General Secretary Exclusives (FR-1.4: Transfer & Suspend Servants)
  const isGeneralSecretary = Boolean(user && (user.role.level >= 5 || user.role.code === 'GENERAL_SECRETARY'));
  const [transferModalServant, setTransferModalServant] = useState<StageServantItem | null>(null);
  const [stopModalServant, setStopModalServant] = useState<StageServantItem | null>(null);
  const [historyModalServant, setHistoryModalServant] = useState<StageServantItem | null>(null);
  const [isDirectoryModalOpen, setIsDirectoryModalOpen] = useState(false);
  const [servantsStatusTab, setServantsStatusTab] = useState<'ALL' | 'ACTIVE' | 'SUSPENDED'>('ALL');

  // Edit Servant Modal (Level 3+ / أمين الخدمة)
  const [isEditServantModalOpen, setIsEditServantModalOpen] = useState(false);
  const [editingServant, setEditingServant] = useState<StageServantItem | null>(null);
  const [editServantTab, setEditServantTab] = useState<'profile' | 'talents' | 'evaluation'>('profile');
  const [editFullName, setEditFullName] = useState('');
  const [editPhoneNumber, setEditPhoneNumber] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editRoleCode, setEditRoleCode] = useState('SERVANT');
  const [editTempPassword, setEditTempPassword] = useState('');
  const [isEditingServantLoading, setIsEditingServantLoading] = useState(false);
  const [editServantError, setEditServantError] = useState<string | null>(null);
  const [rolesList, setRolesList] = useState<any[]>([]);

  // 13 Fields: Personal & Church Profile
  const [editFatherConfessor, setEditFatherConfessor] = useState('');
  const [editDateOfBirth, setEditDateOfBirth] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editMaritalStatus, setEditMaritalStatus] = useState<string>('أعزب');
  const [editSpouseName, setEditSpouseName] = useState('');
  const [editEducationOrCareer, setEditEducationOrCareer] = useState('');
  const [editChildrenList, setEditChildrenList] = useState<ServantChildItem[]>([]);

  // Extended Profile Fields (WhatsApp, Social, Talents, Activities, Siblings, Deacon, Picture)
  const [editWhatsappPhone, setEditWhatsappPhone] = useState('');
  const [editFacebookUrl, setEditFacebookUrl] = useState('');
  const [editInstagramUrl, setEditInstagramUrl] = useState('');
  const [editTalents, setEditTalents] = useState<string[]>([]);
  const [editActivities, setEditActivities] = useState<string[]>([]);
  const [editSiblingsList, setEditSiblingsList] = useState<Array<{ name: string; age: string }>>([]);
  const [editIsDeacon, setEditIsDeacon] = useState(false);
  const [editDeaconName, setEditDeaconName] = useState('');
  const [editDeaconRank, setEditDeaconRank] = useState('إبصالتس (مرتل)');
  const [editProfilePicture, setEditProfilePicture] = useState('');

  // 13 Fields: Evaluative fields added by Stage Secretary (تضاف من أمين الخدمة)
  const [editFinancialStatus, setEditFinancialStatus] = useState('');
  const [editBehaviorWithMembers, setEditBehaviorWithMembers] = useState('');
  const [editBehaviorWithServants, setEditBehaviorWithServants] = useState('');
  const [editCooperation, setEditCooperation] = useState('');
  const [editIndividualInitiative, setEditIndividualInitiative] = useState('');
  const [editEvaluationNotes, setEditEvaluationNotes] = useState('');

  // Helpers for managing servant children
  const handleAddChild = () => {
    setEditChildrenList((prev) => [...prev, { name: '', age: '' }]);
  };

  const handleRemoveChild = (index: number) => {
    setEditChildrenList((prev) => prev.filter((_, i) => i !== index));
  };

  const handleChildChange = (index: number, field: 'name' | 'age', value: string) => {
    setEditChildrenList((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  };

  // Helpers for managing servant siblings
  const handleAddSibling = () => {
    setEditSiblingsList((prev) => [...prev, { name: '', age: '' }]);
  };

  const handleRemoveSibling = (index: number) => {
    setEditSiblingsList((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSiblingChange = (index: number, field: 'name' | 'age', value: string) => {
    setEditSiblingsList((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  };

  const handleToggleServantTalent = (t: string) => {
    setEditTalents((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  };

  const handleToggleServantActivity = (a: string) => {
    setEditActivities((prev) => (prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]));
  };

  // Active selected servant object
  const selectedServant = useMemo(() => {
    if (!selectedServantId) return null;
    return stageServants.find((s) => s.id === selectedServantId) || null;
  }, [stageServants, selectedServantId]);

  // Allowed sessions for the selected servant (or current user)
  const allowedServantSessions = useMemo(() => {
    const level = selectedServant?.role?.level || user?.role?.level || 1;
    return getAllowedSessionsForRole(level);
  }, [selectedServant, user]);

  // Fetch members & initial attendance records for selected stage & date
  useEffect(() => {
    if (!selectedStageId) return;

    const fetchMembersAndAttendance = async () => {
      try {
        setIsLoadingMembers(true);
        // 1. Fetch stage members (Level 1 servant filters assigned members, falls back to stage members)
        const isServant = user?.role?.level === 1;
        const assignedParam = isServant ? '&assignedOnly=true' : '';
        const membersRes = await api.get(`/api/v1/members?stageId=${selectedStageId}&limit=150${assignedParam}`);
        let rawMembers = membersRes.data?.members || membersRes.data?.data || [];

        // If assignedOnly returned empty for a servant (e.g. not yet assigned), fallback to stage members
        if (isServant && rawMembers.length === 0) {
          const allRes = await api.get(`/api/v1/members?stageId=${selectedStageId}&limit=150`);
          rawMembers = allRes.data?.members || allRes.data?.data || [];
        }

        // 2. Fetch recorded attendance for this date & session
        let existingRecordsMap: Record<string, { status: AttendanceStatus; notes?: string }> = {};
        try {
          const attRes = await api.get(
            `/api/v1/attendance/members?stageId=${selectedStageId}&sessionType=${memberSessionType}&sessionDate=${selectedDate}`
          );
          const attRecords = attRes.data?.data || attRes.data?.records || [];
          if (Array.isArray(attRecords)) {
            for (const r of attRecords) {
              existingRecordsMap[r.memberId] = {
                status: r.status,
                notes: r.notes || '',
              };
            }
          }
        } catch {
          // If no existing attendance, fallback to default
        }

        // Merge members with existing attendance or default UNSET
        const merged: MemberItem[] = rawMembers.map((m: any) => ({
          id: m.id,
          fullName: m.fullName,
          educationalGrade: m.educationalGrade,
          phoneNumber: m.phoneNumber,
          status: existingRecordsMap[m.id]?.status || 'UNSET',
          notes: existingRecordsMap[m.id]?.notes || '',
        }));

        setMembers(merged);
      } catch (err: any) {
        console.error('Failed to fetch members or attendance:', err);
      } finally {
        setIsLoadingMembers(false);
      }
    };

    fetchMembersAndAttendance();
  }, [selectedStageId, selectedDate, memberSessionType, user]);

  // Fetch absence alerts for the stage
  useEffect(() => {
    if (!selectedStageId) return;

    const fetchAlerts = async () => {
      try {
        setIsLoadingAlerts(true);
        const res = await api.get(`/api/v1/attendance/alerts?stageId=${selectedStageId}&status=ACTIVE`);
        if (res.data?.data) {
          setAlerts(res.data.data);
        }
      } catch (err) {
        console.error('Failed to load absence alerts:', err);
      } finally {
        setIsLoadingAlerts(false);
      }
    };

    fetchAlerts();
  }, [selectedStageId]);

  // Fetch servants list for supervisor (Level 3+)
  const fetchStageServants = async () => {
    if (!selectedStageId) return;
    try {
      setIsLoadingServantsList(true);
      const res = await api.get(`/api/v1/attendance/servants/list?stageId=${selectedStageId}&includeSuspended=true`);
      if (res.data?.success && Array.isArray(res.data.data)) {
        const servantsData: StageServantItem[] = res.data.data;
        setStageServants(servantsData);

        // If no servant currently selected, select the first subordinate servant or first servant
        if (!selectedServantId && servantsData.length > 0) {
          const firstSubordinate = servantsData.find((s) => s.id !== user?.id) || servantsData[0];
          setSelectedServantId(firstSubordinate.id);
        }
      }
    } catch (err) {
      console.error('Failed to load stage servants:', err);
    } finally {
      setIsLoadingServantsList(false);
    }
  };

  const displayedStageServants = useMemo(() => {
    if (servantsStatusTab === 'ACTIVE') {
      return stageServants.filter((s) => s.status !== 'SUSPENDED');
    }
    if (servantsStatusTab === 'SUSPENDED') {
      return stageServants.filter((s) => s.status === 'SUSPENDED');
    }
    return stageServants;
  }, [stageServants, servantsStatusTab]);

  useEffect(() => {
    if (activeView === 'servants' && isSupervisor) {
      fetchStageServants();
    }
  }, [activeView, selectedStageId, isSupervisor]);

  // Fetch available system roles for editing accounts (Supervisor Level 3+)
  useEffect(() => {
    if (!isSupervisor) return;
    let isMounted = true;
    const fetchRoles = async () => {
      try {
        const res = await api.get('/api/v1/accounts/roles');
        if (res.data?.success && Array.isArray(res.data.roles)) {
          if (isMounted) setRolesList(res.data.roles);
        }
      } catch (err) {
        console.warn('Failed to load accounts roles:', err);
      }
    };
    fetchRoles();
    return () => {
      isMounted = false;
    };
  }, [isSupervisor]);

  // Available roles for assignment based on caller authority
  const availableEditRoles = useMemo(() => {
    const callerLevel = user?.role?.level ?? 1;

    const defaultRoles = [
      { code: 'SERVANT', name: 'خادم مرحلة (SERVANT)', level: 1 },
      { code: 'ASSISTANT_SECRETARY', name: 'مساعد أمين الخدمة (ASSISTANT_SECRETARY)', level: 2 },
      { code: 'STAGE_SECRETARY', name: 'أمين الخدمة / أمين مرحلة (STAGE_SECRETARY)', level: 3 },
      { code: 'SECTOR_SECRETARY', name: 'أمين قطاع (SECTOR_SECRETARY)', level: 4 },
    ];

    let list: Array<{ code: string; name: string; level: number }> = [];

    if (rolesList.length > 0) {
      list = rolesList.map((r: any) => ({
        code: r.code,
        name: getRoleDisplayName(r.code, r.name),
        level: r.level,
      }));
    } else {
      list = defaultRoles.filter((r) => r.level < callerLevel);
    }

    // Filter strictly below caller level if not level 5 (General Secretary)
    if (callerLevel < 5) {
      list = list.filter((r) => r.level < callerLevel);
    }

    // Always ensure the target user's current role is included in options so the select matches accurately
    if (editingServant?.role && !list.some((r) => r.code === editingServant.role.code)) {
      list.push({
        code: editingServant.role.code,
        name: getRoleDisplayName(editingServant.role.code, editingServant.role.name),
        level: editingServant.role.level,
      });
      list.sort((a, b) => a.level - b.level);
    }

    return list;
  }, [rolesList, user, editingServant]);

  const canEditRole = Boolean(
    user &&
    (user.role.level > (editingServant?.role?.level || 0) || user.role.level >= 5)
  );

  // Fetch servant history for selected servant (or self if servant)
  const fetchServantHistory = async (targetId?: string) => {
    const idToFetch = targetId || selectedServantId || user?.id;
    if (!idToFetch) return;

    try {
      setIsLoadingServants(true);
      const queryParam = idToFetch ? `?servantUserId=${idToFetch}` : '';
      const res = await api.get(`/api/v1/attendance/servants/history${queryParam}`);
      if (res.data?.data) {
        setServantRecords(res.data.data.records || []);
        setServantStats(res.data.data.stats || null);
      }
    } catch (err) {
      console.error('Failed to load servant follow-up history:', err);
    } finally {
      setIsLoadingServants(false);
    }
  };

  useEffect(() => {
    if (activeView !== 'servants') return;
    const targetId = isSupervisor ? (selectedServantId || user?.id) : user?.id;
    if (targetId) {
      fetchServantHistory(targetId);
    }
  }, [activeView, selectedServantId, isSupervisor, user?.id]);

  // Save Supervisor Recording Servant Attendance
  const handleSaveServantAttendance = async () => {
    if (!selectedServantId) return;
    setServantFeedbackMessage(null);

    if (selectedServantId === user?.id) {
      setServantFeedbackMessage({
        type: 'error',
        text: 'لا يمكن تسجيل الحضور لنفسك. تسجل متابعتك بواسطة المشرف المسؤول.',
      });
      return;
    }

    try {
      setIsSavingServantAttendance(true);
      const res = await api.post('/api/v1/attendance/servants/batch', {
        stageId: selectedStageId,
        sessionType: recordServantSessionType,
        sessionDate: recordServantDate,
        records: [
          {
            servantUserId: selectedServantId,
            status: recordServantStatus,
            notes: recordServantNotes.trim() || undefined,
          },
        ],
      });

      if (res.data?.success) {
        setServantFeedbackMessage({
          type: 'success',
          text: `تم تسجيل حضور الخادم (${selectedServant?.fullName}) بنجاح!`,
        });
        setIsRecordServantModalOpen(false);
        setRecordServantNotes('');
        await fetchServantHistory(selectedServantId);
        await fetchStageServants();
        setTimeout(() => setServantFeedbackMessage(null), 4000);
      }
    } catch (err: any) {
      console.error('Failed to record servant attendance:', err);
      setServantFeedbackMessage({
        type: 'error',
        text: err.response?.data?.error?.message || 'حدث خطأ أثناء حفظ حضور الخادم',
      });
    } finally {
      setIsSavingServantAttendance(false);
    }
  };

  // Open Edit Servant Modal
  const handleOpenEditServant = (servant: StageServantItem) => {
    setEditingServant(servant);
    setEditServantTab('profile');
    setEditFullName(servant.fullName || '');
    setEditPhoneNumber(servant.phoneNumber || '');
    setEditEmail(servant.email || '');
    setEditRoleCode(servant.role?.code || 'SERVANT');
    setEditTempPassword('');

    // Personal & Church fields (1-5, 7-9)
    setEditFatherConfessor(servant.fatherConfessor || '');
    setEditDateOfBirth(
      servant.dateOfBirth
        ? typeof servant.dateOfBirth === 'string'
          ? servant.dateOfBirth.split('T')[0]
          : ''
        : ''
    );
    setEditAddress(servant.address || '');
    setEditMaritalStatus(
      servant.maritalStatus === 'متزوج' || servant.maritalStatus === 'MARRIED' ? 'متزوج' : 'أعزب'
    );
    setEditSpouseName(servant.spouseName || '');
    setEditEducationOrCareer(servant.educationOrCareer || '');

    // Parse children info
    let children: ServantChildItem[] = [];
    if (servant.childrenInfo) {
      if (Array.isArray(servant.childrenInfo)) {
        children = servant.childrenInfo.map((c: any) => ({
          name: typeof c === 'string' ? c : c?.name || '',
          age: typeof c === 'object' && c?.age ? String(c.age) : '',
        }));
      } else if (typeof servant.childrenInfo === 'string') {
        try {
          const parsed = JSON.parse(servant.childrenInfo);
          if (Array.isArray(parsed)) {
            children = parsed.map((c: any) => ({
              name: typeof c === 'string' ? c : c?.name || '',
              age: typeof c === 'object' && c?.age ? String(c.age) : '',
            }));
          }
        } catch {
          children = [{ name: servant.childrenInfo, age: '' }];
        }
      }
    }
    setEditChildrenList(children);

    // Parse extended fields
    setEditWhatsappPhone(
      servant.whatsappPhoneRaw || (servant.whatsappPhone !== servant.phoneNumber ? servant.whatsappPhone || '' : '')
    );
    setEditFacebookUrl(servant.facebookUrl || '');
    setEditInstagramUrl(servant.instagramUrl || '');
    setEditTalents(Array.isArray(servant.talents) ? servant.talents : []);
    setEditActivities(Array.isArray(servant.activities) ? servant.activities : []);

    let sibs: Array<{ name: string; age: string }> = [];
    if (servant.siblingsInfo && Array.isArray(servant.siblingsInfo)) {
      sibs = servant.siblingsInfo.map((s: any) => ({
        name: typeof s === 'string' ? s : s?.name || '',
        age: typeof s === 'object' && s?.age ? String(s.age) : '',
      }));
    }
    setEditSiblingsList(sibs);

    setEditIsDeacon(Boolean(servant.isDeacon));
    setEditDeaconName(servant.deaconName || '');
    setEditDeaconRank(servant.deaconRank || 'إبصالتس (مرتل)');
    setEditProfilePicture(servant.profilePicture || '');

    // Evaluative fields added by Stage Secretary (6, 10-13)
    const evalData = servant.evaluation;
    setEditFinancialStatus(evalData?.financialStatus || '');
    setEditBehaviorWithMembers(evalData?.behaviorWithMembers || '');
    setEditBehaviorWithServants(evalData?.behaviorWithServants || '');
    setEditCooperation(evalData?.cooperation || '');
    setEditIndividualInitiative(evalData?.individualInitiative || '');
    setEditEvaluationNotes(evalData?.notes || '');

    setEditServantError(null);
    setIsEditServantModalOpen(true);
  };

  // Submit Update Servant Data (PATCH /api/v1/accounts/:userId)
  const handleUpdateServant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingServant) return;

    try {
      setIsEditingServantLoading(true);
      setEditServantError(null);

      // Clean children list
      const validChildren = editChildrenList
        .filter((c) => c.name.trim().length > 0)
        .map((c) => ({ name: c.name.trim(), age: c.age.trim() }));

      // Clean siblings list
      const validSiblings = editSiblingsList
        .filter((s) => s.name.trim().length > 0)
        .map((s) => ({ name: s.name.trim(), age: s.age ? Number(s.age) || s.age : null }));

      const payload: any = {
        fullName: editFullName.trim(),
        phoneNumber: editPhoneNumber.trim(),
        email: editEmail.trim() || null,
        whatsappPhone: editWhatsappPhone.trim() || null,
        facebookUrl: editFacebookUrl.trim() || null,
        instagramUrl: editInstagramUrl.trim() || null,
        ...(canEditRole ? { roleCode: editRoleCode } : {}),
        fatherConfessor: editFatherConfessor.trim() || null,
        dateOfBirth: editDateOfBirth || null,
        address: editAddress.trim() || null,
        maritalStatus: editMaritalStatus,
        spouseName: editMaritalStatus === 'متزوج' ? editSpouseName.trim() || null : null,
        educationOrCareer: editEducationOrCareer.trim() || null,
        childrenInfo: validChildren.length > 0 ? validChildren : null,
        siblingsInfo: validSiblings.length > 0 ? validSiblings : null,
        talents: editTalents,
        activities: editActivities,
        isDeacon: editIsDeacon,
        deaconName: editIsDeacon ? (editDeaconName.trim() || null) : null,
        deaconRank: editIsDeacon ? (editDeaconRank || null) : null,
        profilePicture: editProfilePicture || null,
        financialStatus: editFinancialStatus.trim() || null,
        behaviorWithMembers: editBehaviorWithMembers.trim() || null,
        behaviorWithServants: editBehaviorWithServants.trim() || null,
        cooperation: editCooperation.trim() || null,
        individualInitiative: editIndividualInitiative.trim() || null,
        evaluationNotes: editEvaluationNotes.trim() || null,
      };

      if (editTempPassword.trim()) {
        if (editTempPassword.trim().length < 8) {
          setEditServantError('كلمة المرور المؤقتة يجب ألا تقل عن 8 أحرف');
          setIsEditingServantLoading(false);
          return;
        }
        payload.temporaryPassword = editTempPassword.trim();
      }

      const res = await api.patch(`/api/v1/accounts/${editingServant.id}`, payload);

      if (res.data?.success) {
        setIsEditServantModalOpen(false);
        setEditingServant(null);
        setServantFeedbackMessage({
          type: 'success',
          text: `تم تحديث كافة بيانات وملف الخادم (${editFullName}) بنجاح!`,
        });
        setTimeout(() => setServantFeedbackMessage(null), 4000);
        await fetchStageServants();
      }
    } catch (err: any) {
      setEditServantError(
        err.response?.data?.error?.message ||
        err.response?.data?.message ||
        'فشل في تحديث بيانات الخادم'
      );
    } finally {
      setIsEditingServantLoading(false);
    }
  };

  // Date jump helpers
  const handleDateShift = (days: number) => {
    const current = new Date(selectedDate);
    current.setDate(current.getDate() + days);
    setSelectedDate(current.toISOString().split('T')[0]);
  };

  const formattedSelectedDate = useMemo(() => {
    try {
      const d = new Date(selectedDate);
      return d.toLocaleDateString('ar-EG', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return selectedDate;
    }
  }, [selectedDate]);

  // Filtered members list based on search
  const filteredMembers = useMemo(() => {
    if (!searchQuery.trim()) return members;
    const q = searchQuery.toLowerCase();
    return members.filter(
      (m) =>
        m.fullName.toLowerCase().includes(q) ||
        (m.educationalGrade && m.educationalGrade.toLowerCase().includes(q))
    );
  }, [members, searchQuery]);

  // Attendance summary metrics
  const metrics = useMemo(() => {
    let present = 0;
    let absent = 0;
    let unset = 0;

    for (const m of members) {
      if (m.status === 'PRESENT') present++;
      else if (m.status === 'ABSENT') absent++;
      else unset++;
    }

    return { present, absent, unset, total: members.length };
  }, [members]);

  // Update member status locally with tactile feedback
  const handleStatusChange = (memberId: string, newStatus: AttendanceStatus) => {
    setMembers((prev) =>
      prev.map((m) => (m.id === memberId ? { ...m, status: newStatus } : m))
    );
  };

  // Mark all members as present
  const handleMarkAllPresent = () => {
    setMembers((prev) => prev.map((m) => ({ ...m, status: 'PRESENT' })));
  };

  // Batch Save Attendance to API (FR-4.1, NFR-4.2)
  const handleSaveAttendance = async () => {
    setSaveErrorMessage(null);
    setSaveSuccessMessage(null);

    // Filter only members that have a non-unset status
    const recordsToSave = members
      .filter((m) => m.status !== 'UNSET')
      .map((m) => ({
        memberId: m.id,
        status: m.status,
        notes: m.notes || undefined,
      }));

    if (recordsToSave.length === 0) {
      setSaveErrorMessage('يرجى تحديد حالة الحضور لمخدوم واحد على الأقل قبل الحفظ');
      return;
    }

    const idempotencyKey = `batch_${selectedStageId}_${memberSessionType}_${selectedDate}_${Date.now()}`;

    try {
      setIsSaving(true);
      const res = await api.post(
        '/api/v1/attendance/members/batch',
        {
          stageId: selectedStageId,
          sessionType: memberSessionType,
          sessionDate: selectedDate,
          records: recordsToSave,
        },
        {
          headers: {
            'X-Idempotency-Key': idempotencyKey,
          },
        }
      );

      if (res.data?.success) {
        setSaveSuccessMessage(`تم حفظ حضور (${recordsToSave.length}) مخدوم بنجاح!`);
        // Refresh alerts in case absences triggered new alerts
        const alertsRes = await api.get(`/api/v1/attendance/alerts?stageId=${selectedStageId}&status=ACTIVE`);
        if (alertsRes.data?.data) {
          setAlerts(alertsRes.data.data);
        }
        setTimeout(() => setSaveSuccessMessage(null), 4000);
      }
    } catch (err: any) {
      console.error('Error saving batch attendance:', err);
      setSaveErrorMessage(
        err.response?.data?.error?.message || 'حدث خطأ أثناء حفظ الحضور. يرجى إعادة المحاولة.'
      );
    } finally {
      setIsSaving(false);
    }
  };

  // Handle Note Save
  const handleSaveNote = () => {
    if (!noteModalMember) return;
    setMembers((prev) =>
      prev.map((m) =>
        m.id === noteModalMember.id ? { ...m, notes: noteDraft.trim() } : m
      )
    );
    setNoteModalMember(null);
    setNoteDraft('');
  };

  // Handle Resolve Alert
  const handleConfirmResolveAlert = async () => {
    if (!resolveModalAlert) return;

    try {
      setIsResolvingAlert(true);
      await api.patch(`/api/v1/attendance/alerts/${resolveModalAlert.id}/resolve`, {
        resolutionNotes: resolveOutcomeText.trim() || 'تم الافتقاد التليفوني وتأكيد الحضور',
      });

      // Remove from active alerts list
      setAlerts((prev) => prev.filter((a) => a.id !== resolveModalAlert.id));
      setResolveModalAlert(null);
      setResolveOutcomeText('');
    } catch (err) {
      console.error('Failed to resolve alert:', err);
    } finally {
      setIsResolvingAlert(false);
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-bg-app text-text-primary pb-28">
        {/* Top Header App Bar */}
        <header className="sticky top-0 z-30 bg-bg-surface/95 backdrop-blur-md border-b border-border-default shadow-sm">
          <div className="max-w-md mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-h2 font-bold text-text-primary">
                  تسجيل الحضور والمتابعة
                </h1>
                <p className="text-caption text-text-secondary mt-0.5">
                  {availableStages.find((s) => s.id === selectedStageId)?.name || user?.scopes.stages[0]?.name || 'المرحلة الدراسية'}
                </p>
              </div>

              {/* View Switcher Tabs */}
              <div className="inline-flex p-1 bg-bg-muted rounded-pill border border-border-default text-caption">
                <button
                  type="button"
                  onClick={() => setActiveView('members')}
                  className={cn(
                    'px-3 py-1 rounded-pill font-medium transition-all',
                    activeView === 'members'
                      ? 'bg-brand-primary text-white shadow-sm'
                      : 'text-text-secondary hover:text-text-primary'
                  )}
                >
                  المخدومين
                </button>
                <button
                  type="button"
                  onClick={() => setActiveView('servants')}
                  className={cn(
                    'px-3 py-1 rounded-pill font-medium transition-all',
                    activeView === 'servants'
                      ? 'bg-brand-primary text-white shadow-sm'
                      : 'text-text-secondary hover:text-text-primary'
                  )}
                >
                  جدول الخدام
                </button>
                <button
                  type="button"
                  onClick={() => setActiveView('alerts')}
                  className={cn(
                    'px-3 py-1 rounded-pill font-medium transition-all relative',
                    activeView === 'alerts'
                      ? 'bg-brand-primary text-white shadow-sm'
                      : 'text-text-secondary hover:text-text-primary'
                  )}
                >
                  التنبيهات
                  {alerts.length > 0 && (
                    <span className="mr-1 inline-flex items-center justify-center w-4 h-4 rounded-full bg-status-danger text-white text-[10px] font-bold">
                      {alerts.length}
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* Date Navigator Bar */}
            {activeView === 'members' && (
              <div className="mt-3 flex items-center justify-between bg-bg-muted p-1.5 rounded-card border border-border-default">
                <button
                  type="button"
                  onClick={() => handleDateShift(7)}
                  className="p-1.5 rounded-full hover:bg-bg-surface text-text-secondary hover:text-text-primary transition-colors"
                  title="الجمعة القادمة"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>

                <div className="flex items-center gap-2 text-center">
                  <Calendar className="w-4 h-4 text-brand-primary" />
                  <span className="text-body-small font-bold text-text-primary">
                    {formattedSelectedDate}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => handleDateShift(-7)}
                  className="p-1.5 rounded-full hover:bg-bg-surface text-text-secondary hover:text-text-primary transition-colors"
                  title="الجمعة السابقة"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
              </div>
            )}

            {/* Stage Selector Chips Bar for multi-stage roles (General & Sector Secretaries) */}
            {availableStages.length > 1 && (
              <div className="mt-3 flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar select-none">
                {availableStages.map((stg) => (
                  <Chip
                    key={stg.id}
                    selected={selectedStageId === stg.id}
                    onClick={() => {
                      setSelectedStageId(stg.id);
                      setSelectedServantId(null);
                    }}
                  >
                    {stg.name}
                  </Chip>
                ))}
              </div>
            )}
          </div>
        </header>

        {/* Main Content Area */}
        <main className="max-w-md mx-auto px-4 pt-3">
          {/* VIEW 1: MEMBER ATTENDANCE (تسجيل حضور المخدومين) */}
          {activeView === 'members' && (
            <div className="space-y-4">
              {/* Session Type Chips */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar select-none">
                <Chip
                  selected={memberSessionType === MemberSessionType.SERVICE_ATTENDANCE}
                  onClick={() => setMemberSessionType(MemberSessionType.SERVICE_ATTENDANCE)}
                >
                  {MEMBER_SESSION_LABELS.SERVICE_ATTENDANCE.ar}
                </Chip>
                <Chip
                  selected={memberSessionType === MemberSessionType.MASS}
                  onClick={() => setMemberSessionType(MemberSessionType.MASS)}
                >
                  {MEMBER_SESSION_LABELS.MASS.ar}
                </Chip>
                <Chip
                  selected={memberSessionType === MemberSessionType.PASTORAL_VISITATION}
                  onClick={() => setMemberSessionType(MemberSessionType.PASTORAL_VISITATION)}
                >
                  {MEMBER_SESSION_LABELS.PASTORAL_VISITATION.ar}
                </Chip>
                <Chip
                  selected={memberSessionType === MemberSessionType.ACTIVITY_CLUB_TRIP_CONF}
                  onClick={() => setMemberSessionType(MemberSessionType.ACTIVITY_CLUB_TRIP_CONF)}
                >
                  {MEMBER_SESSION_LABELS.ACTIVITY_CLUB_TRIP_CONF.ar}
                </Chip>
              </div>

              {/* Consecutive Absence Alert Banner (FR-4.3 & FR-11.1) */}
              {alerts.length > 0 && (
                <div className="bg-status-danger-soft border border-status-danger/30 rounded-card p-3 flex items-start gap-3 shadow-sm animate-pulse-subtle">
                  <AlertTriangle className="w-5 h-5 text-status-danger shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="text-body-small font-bold text-status-danger">
                      تنبيه افتقاد هام ({alerts.length} مخدومين)
                    </h4>
                    <p className="text-caption text-text-primary mt-0.5">
                      يوجد مخدومين متغيبين لأكثر من أسبوعين متتاليين بحاجة للمتابعة العاجلة.
                    </p>
                    <button
                      type="button"
                      onClick={() => setActiveView('alerts')}
                      className="mt-2 text-caption font-bold text-status-danger underline block"
                    >
                      عرض قائمة الافتقاد ومتابعة الحالات &larr;
                    </button>
                  </div>
                </div>
              )}

              {/* Session Summary Stats & Quick "Mark All" Action */}
              <div className="bg-bg-surface rounded-card p-3 border border-border-default shadow-card flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="success">حاضر: {metrics.present}</Badge>
                  <Badge variant="danger">غائب: {metrics.absent}</Badge>
                </div>

                <button
                  type="button"
                  onClick={handleMarkAllPresent}
                  className="inline-flex items-center gap-1 text-caption font-bold text-brand-primary hover:text-brand-primary-dark transition-colors px-2 py-1 rounded-pill bg-brand-primary-soft hover:bg-brand-primary/20"
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>الكل حاضر</span>
                </button>
              </div>

              {/* Member Search Bar */}
              <div className="relative">
                <Search className="w-4 h-4 text-text-tertiary absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="بحث باسم المخدوم..."
                  className="w-full bg-bg-surface border border-border-default rounded-card py-2 pr-9 pl-4 text-body-small text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary"
                />
              </div>

              {/* Feedback Notifications */}
              {saveSuccessMessage && (
                <div className="p-3 bg-status-success-soft border border-status-success text-status-success rounded-card text-body-small font-medium flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  <span>{saveSuccessMessage}</span>
                </div>
              )}

              {saveErrorMessage && (
                <div className="p-3 bg-status-danger-soft border border-status-danger text-status-danger rounded-card text-body-small font-medium flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  <span>{saveErrorMessage}</span>
                </div>
              )}

              {/* Members Attendance List (Virtualized/Optimized Mobile Layout) */}
              <div className="space-y-2">
                {isLoadingMembers ? (
                  <div className="text-center py-12 text-text-secondary">
                    <div className="inline-block animate-spin w-6 h-6 border-2 border-brand-primary border-t-transparent rounded-full mb-2" />
                    <p className="text-body-small">جارٍ تحميل قائمة المخدومين...</p>
                  </div>
                ) : filteredMembers.length === 0 ? (
                  <div className="text-center py-12 bg-bg-surface rounded-card border border-border-default">
                    <Users className="w-10 h-10 text-text-tertiary mx-auto mb-2 opacity-50" />
                    <p className="text-body font-medium text-text-secondary">لا يوجد مخدومين مسجلين</p>
                  </div>
                ) : (
                  filteredMembers.map((member) => (
                    <div
                      key={member.id}
                      className="bg-bg-surface rounded-card p-3 border border-border-default shadow-card flex flex-col gap-2.5 transition-all hover:border-brand-primary/30"
                    >
                      {/* Member Info Row */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-9 h-9 rounded-full bg-brand-primary-soft text-brand-primary font-bold flex items-center justify-center shrink-0 text-body-small">
                            {member.fullName.charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <h3 className="text-body-small font-bold text-text-primary truncate">
                              {member.fullName}
                            </h3>
                            {member.educationalGrade && (
                              <span className="text-caption text-text-secondary block truncate">
                                {member.educationalGrade}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Note Icon Button */}
                        <button
                          type="button"
                          onClick={() => {
                            setNoteModalMember(member);
                            setNoteDraft(member.notes || '');
                          }}
                          className={cn(
                            'p-2 rounded-full transition-colors relative',
                            member.notes
                              ? 'text-brand-primary bg-brand-primary-soft'
                              : 'text-text-tertiary hover:text-text-primary hover:bg-bg-muted'
                          )}
                          title="إضافة ملاحظة"
                        >
                          <FileText className="w-4 h-4" />
                          {member.notes && (
                            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-brand-primary" />
                          )}
                        </button>
                      </div>

                      {/* Display Note Preview if exists */}
                      {member.notes && (
                        <div className="bg-bg-muted/70 px-2.5 py-1.5 rounded-card text-caption text-text-secondary flex items-start gap-1.5 border border-border-default/50">
                          <span className="font-bold text-text-primary shrink-0">ملاحظة:</span>
                          <span className="truncate">{member.notes}</span>
                        </div>
                      )}

                      {/* 3-State Attendance Toggle */}
                      <div className="flex justify-end pt-1">
                        <AttendanceToggle
                          value={member.status}
                          onChange={(newStatus) => handleStatusChange(member.id, newStatus)}
                          showLabels={true}
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* VIEW 2: SERVANT FOLLOW-UP HISTORY (متابعة الخدام) */}
          {activeView === 'servants' && (
            <div className="space-y-4">
              {/* Feedback Toast */}
              {servantFeedbackMessage && (
                <div
                  className={cn(
                    'p-3.5 rounded-card flex items-center gap-2 text-body-small border',
                    servantFeedbackMessage.type === 'success'
                      ? 'bg-status-success-soft text-status-success border-status-success/30'
                      : 'bg-status-danger-soft text-status-danger border-status-danger/30'
                  )}
                >
                  {servantFeedbackMessage.type === 'success' ? (
                    <CheckCircle className="w-5 h-5 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 shrink-0" />
                  )}
                  <span className="font-semibold">{servantFeedbackMessage.text}</span>
                </div>
              )}

              {/* Supervisor Servant Selector Carousel */}
              {isSupervisor && (
                <div className="bg-bg-surface rounded-card p-4 border border-border-default shadow-card space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <Users className="w-5 h-5 text-brand-primary" />
                      <h3 className="text-body font-bold text-text-primary">
                        خدام المرحلة ({stageServants.length})
                      </h3>
                    </div>

                    <div className="flex items-center gap-2">
                      {isGeneralSecretary && (
                        <>
                          {/* Filter Tabs for General Secretary */}
                          <div className="flex items-center gap-1 bg-bg-muted p-0.5 rounded text-[11px] border border-border-default">
                            <button
                              type="button"
                              onClick={() => setServantsStatusTab('ALL')}
                              className={cn(
                                'px-2 py-0.5 rounded font-semibold transition-all',
                                servantsStatusTab === 'ALL'
                                  ? 'bg-bg-surface text-brand-primary shadow-xs'
                                  : 'text-text-secondary hover:text-text-primary'
                              )}
                            >
                              الكل
                            </button>
                            <button
                              type="button"
                              onClick={() => setServantsStatusTab('ACTIVE')}
                              className={cn(
                                'px-2 py-0.5 rounded font-semibold transition-all',
                                servantsStatusTab === 'ACTIVE'
                                  ? 'bg-bg-surface text-status-success shadow-xs'
                                  : 'text-text-secondary hover:text-text-primary'
                              )}
                            >
                              النشطون
                            </button>
                            <button
                              type="button"
                              onClick={() => setServantsStatusTab('SUSPENDED')}
                              className={cn(
                                'px-2 py-0.5 rounded font-semibold transition-all',
                                servantsStatusTab === 'SUSPENDED'
                                  ? 'bg-bg-surface text-status-danger shadow-xs'
                                  : 'text-text-secondary hover:text-text-primary'
                              )}
                            >
                              الموقوفون
                            </button>
                          </div>

                          {/* Church-wide Servant Directory Button */}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setIsDirectoryModalOpen(true)}
                            className="h-8 px-2.5 text-caption font-semibold gap-1.5 text-brand-primary border-brand-primary/30 hover:bg-brand-primary-soft"
                            title="دليل وبحث كافة خدام الكنيسة"
                          >
                            <Users className="w-3.5 h-3.5" />
                            <span>دليل كل الخدام</span>
                          </Button>
                        </>
                      )}
                    </div>
                  </div>

                  {isLoadingServantsList ? (
                    <div className="text-center py-4 text-caption text-text-secondary">
                      جارٍ تحميل قائمة خدام المرحلة...
                    </div>
                  ) : displayedStageServants.length === 0 ? (
                    <p className="text-caption text-text-secondary text-center py-2">
                      لا يوجد خدام مطابقين في هذه المرحلة حالياً
                    </p>
                  ) : (
                    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
                      {displayedStageServants.map((s) => {
                        const isSelected = (selectedServantId || user?.id) === s.id;
                        const isSelf = s.id === user?.id;
                        const canEdit = !isSelf && (s.role.level < (user?.role?.level || 0) || isGeneralSecretary);
                        const isSuspended = s.status === 'SUSPENDED';

                        return (
                          <div
                            key={s.id}
                            onClick={() => setSelectedServantId(s.id)}
                            className={cn(
                              'relative flex flex-col items-center gap-1.5 p-2.5 rounded-card border min-w-[115px] max-w-[135px] shrink-0 text-center transition-all cursor-pointer',
                              isSelected
                                ? 'bg-brand-primary/10 border-brand-primary shadow-sm ring-1 ring-brand-primary'
                                : 'bg-bg-muted/50 border-border-default hover:bg-bg-muted',
                              isSuspended && 'border-status-danger/40 bg-status-danger-soft/20'
                            )}
                          >
                            {canEdit && (
                              <button
                                type="button"
                                title="تعديل بيانات الخادم"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenEditServant(s);
                                }}
                                className="absolute top-1.5 left-1.5 p-1 rounded-full text-text-secondary hover:text-brand-primary hover:bg-bg-surface transition-colors"
                              >
                                <Pencil className="w-3 h-3" />
                              </button>
                            )}

                            <div
                              className={cn(
                                'w-9 h-9 rounded-full flex items-center justify-center font-bold text-caption overflow-hidden',
                                isSuspended
                                  ? 'bg-status-danger-soft text-status-danger'
                                  : isSelected
                                    ? 'bg-brand-primary text-white'
                                    : 'bg-bg-surface text-text-primary border border-border-default'
                              )}
                            >
                              {s.profilePicture ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={s.profilePicture} alt={s.fullName} className="w-full h-full object-cover" />
                              ) : (
                                s.fullName.charAt(0)
                              )}
                            </div>
                            <span className="text-caption font-bold text-text-primary truncate w-full">
                              {s.fullName.split(' ')[0]} {s.fullName.split(' ')[1] || ''}
                            </span>
                            <div className="flex items-center gap-1 flex-wrap justify-center">
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-bg-surface border border-border-default text-text-secondary">
                                {isSelf ? 'أنت' : s.role.name}
                              </span>
                              {s.isDeacon && (
                                <span
                                  className="text-[9px] px-1 py-0.2 rounded-full bg-[#E6F4EA] text-[#137333] border border-[#CEEAD6] font-bold"
                                  title={`شماس: ${s.deaconRank || 'مرتل'}`}
                                >
                                  شماس
                                </span>
                              )}
                              {isSuspended ? (
                                <span className="text-[10px] px-1 py-0.5 rounded-full bg-status-danger-soft text-status-danger border border-status-danger/30 font-bold">
                                  موقوف
                                </span>
                              ) : s.stats ? (
                                <span className="text-[10px] font-bold text-status-success">
                                  {s.stats.attendanceRatePercentage}%
                                </span>
                              ) : null}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Action buttons for the selected subordinate */}
                  {selectedServantId && selectedServantId !== user?.id && (
                    <div className="pt-2 border-t border-border-default flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-caption text-text-secondary">
                          متابعة: <strong className="text-text-primary">{selectedServant?.fullName}</strong>
                        </span>
                        {selectedServant?.status === 'SUSPENDED' && (
                          <Badge variant="danger" className="text-[10px]">حساب موقوف</Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 flex-wrap">
                        {/* Edit Servant (Supervisors and General Secretary) */}
                        {selectedServant && (selectedServant.role.level < (user?.role?.level || 0) || isGeneralSecretary) && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenEditServant(selectedServant)}
                            className="h-8 px-2.5 text-caption font-semibold gap-1 text-text-primary hover:bg-bg-muted"
                          >
                            <Pencil className="w-3.5 h-3.5 text-brand-primary" />
                            <span>تعديل</span>
                          </Button>
                        )}

                        {/* General Secretary Actions: Move / Transfer & Stop / Suspend & History */}
                        {isGeneralSecretary && selectedServant && (
                          <>
                            {/* Transfer to another stage */}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setTransferModalServant(selectedServant)}
                              className="h-8 px-2.5 text-caption font-semibold gap-1 text-brand-primary border-brand-primary/30 hover:bg-brand-primary-soft"
                              title="نقل الخادم لمرحلة أخرى (صلاحية الأمين العام)"
                            >
                              <ArrowLeftRight className="w-3.5 h-3.5" />
                              <span>نقل لمرحلة</span>
                            </Button>

                            {/* Stop or Reactivate */}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setStopModalServant(selectedServant)}
                              className={cn(
                                'h-8 px-2.5 text-caption font-semibold gap-1',
                                selectedServant.status === 'SUSPENDED'
                                  ? 'text-status-success hover:bg-status-success-soft hover:border-status-success/30'
                                  : 'text-status-danger hover:bg-status-danger-soft hover:border-status-danger/30'
                              )}
                              title={selectedServant.status === 'SUSPENDED' ? 'إعادة تنشيط حساب الخادم' : 'إيقاف حساب الخادم'}
                            >
                              {selectedServant.status === 'SUSPENDED' ? (
                                <>
                                  <RotateCcw className="w-3.5 h-3.5" />
                                  <span>تنشيط</span>
                                </>
                              ) : (
                                <>
                                  <PowerOff className="w-3.5 h-3.5" />
                                  <span>إيقاف</span>
                                </>
                              )}
                            </Button>

                            {/* Status and Transfer Audit History */}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setHistoryModalServant(selectedServant)}
                              className="h-8 px-2 text-caption text-text-secondary hover:text-text-primary hover:bg-bg-muted"
                              title="سجل الحركات والتنقلات"
                            >
                              <History className="w-3.5 h-3.5" />
                            </Button>
                          </>
                        )}

                        {/* Record Attendance */}
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => {
                            setRecordServantNotes('');
                            setIsRecordServantModalOpen(true);
                          }}
                          className="h-8 px-3 text-caption font-semibold gap-1.5"
                        >
                          <UserCheck className="w-4 h-4" />
                          <span>تسجيل حضور</span>
                        </Button>
                      </div>
                    </div>
                  )}

                  {selectedServantId && selectedServantId === user?.id && (
                    <div className="pt-2 border-t border-border-default text-caption text-text-secondary">
                      (سجلك الشخصي كأمين خدمة — للقراءة فقط، يسجل بمعرفة الأمانة العامة)
                    </div>
                  )}
                </div>
              )}

              {/* FollowUpTable Component */}
              <FollowUpTable
                servantName={
                  isSupervisor
                    ? selectedServant?.fullName || user?.fullName || 'الخادم'
                    : user?.fullName || 'الخادم'
                }
                roleName={
                  isSupervisor
                    ? selectedServant?.role?.name || user?.role?.name
                    : user?.role?.name
                }
                records={servantRecords}
                allowedSessions={allowedServantSessions}
                stats={servantStats}
                isLoading={isLoadingServants}
              />
            </div>
          )}

          {/* VIEW 3: ABSENCE ALERTS & PASTORAL TASKS (تنبيهات الافتقاد) */}
          {activeView === 'alerts' && (
            <div className="space-y-3">
              <div className="p-3 bg-bg-surface rounded-card border border-border-default">
                <h3 className="text-body font-bold text-text-primary">
                  حالات الغياب المتتالي المحتاجة افتقاد
                </h3>
                <p className="text-caption text-text-secondary mt-0.5">
                  يتم رصد الغياب المتكرر تلقائياً (أسبوعين متتاليين) لضمان عدم فقدان أي مخدوم
                </p>
              </div>

              {isLoadingAlerts ? (
                <div className="text-center py-12 text-text-secondary">
                  <div className="inline-block animate-spin w-6 h-6 border-2 border-brand-primary border-t-transparent rounded-full mb-2" />
                  <p className="text-body-small">جارٍ تحميل التنبيهات...</p>
                </div>
              ) : alerts.length === 0 ? (
                <div className="text-center py-12 bg-bg-surface rounded-card border border-border-default">
                  <Sparkles className="w-10 h-10 text-status-success mx-auto mb-2" />
                  <p className="text-body font-bold text-text-primary">ممتاز! لا توجد تنبيهات غياب نشطة</p>
                  <p className="text-caption text-text-secondary mt-1">
                    جميع المخدومين منتظمون في الحضور والمتابعة.
                  </p>
                </div>
              ) : (
                alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className="bg-bg-surface rounded-card p-4 border border-border-default shadow-card space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-full bg-status-danger-soft text-status-danger font-bold flex items-center justify-center text-body-small">
                          {alert.member?.fullName?.charAt(0) || 'م'}
                        </div>
                        <div>
                          <h4 className="text-body-small font-bold text-text-primary">
                            {alert.member?.fullName || 'مخدوم'}
                          </h4>
                          {alert.member?.educationalGrade && (
                            <span className="text-caption text-text-secondary block">
                              {alert.member.educationalGrade}
                            </span>
                          )}
                        </div>
                      </div>

                      <Badge variant="danger" withDot>
                        غائب {alert.consecutiveCount} أسابيع
                      </Badge>
                    </div>

                    {alert.member?.phoneNumber && (
                      <div className="flex items-center gap-2 text-caption text-text-secondary bg-bg-muted p-2 rounded-card">
                        <Phone className="w-3.5 h-3.5 text-brand-primary" />
                        <span>رقم الهاتف:</span>
                        <a
                          href={`tel:${alert.member.phoneNumber}`}
                          className="font-bold text-brand-primary underline"
                        >
                          {alert.member.phoneNumber}
                        </a>
                      </div>
                    )}

                    <Button
                      variant="primary"
                      fullWidth
                      className="h-[38px] text-body-small"
                      onClick={() => {
                        setResolveModalAlert(alert);
                        setResolveOutcomeText('');
                      }}
                    >
                      تسجيل نتيجة الافتقاد وحل التنبيه
                    </Button>
                  </div>
                ))
              )}
            </div>
          )}
        </main>

        {/* Fixed Bottom Save Action Bar for Member Attendance */}
        {activeView === 'members' && (
          <div className="fixed bottom-16 left-0 right-0 z-30 bg-bg-surface/95 backdrop-blur-md border-t border-border-default p-3 shadow-lg">
            <div className="max-w-md mx-auto flex items-center gap-3">
              <Button
                variant="primary"
                fullWidth
                isLoading={isSaving}
                onClick={handleSaveAttendance}
                className="h-[46px] text-body font-bold shadow-md"
              >
                <Save className="w-4 h-4 ml-1.5" />
                <span>حفظ الحضور ({metrics.present + metrics.absent} مخدوم)</span>
              </Button>
            </div>
          </div>
        )}

        {/* Note Editing Modal */}
        {noteModalMember && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
            <div className="bg-bg-surface w-full max-w-md rounded-t-sheet sm:rounded-card p-4 border border-border-default shadow-card space-y-4">
              <div className="flex items-center justify-between border-b border-border-default pb-3">
                <h3 className="text-body font-bold text-text-primary">
                  ملاحظة على حضور: {noteModalMember.fullName}
                </h3>
                <button
                  type="button"
                  onClick={() => setNoteModalMember(null)}
                  className="p-1 rounded-full hover:bg-bg-muted text-text-secondary"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <textarea
                value={noteDraft}
                onChange={(e) => setNoteDraft(e.target.value)}
                placeholder="اكتب سبب الغياب، أو تفاصيل الزيارة، أو أي ملاحظات سلوكية..."
                rows={4}
                className="w-full bg-bg-muted border border-border-default rounded-card p-3 text-body-small text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-brand-primary"
              />

              <div className="flex items-center gap-2 pt-1">
                <Button variant="primary" fullWidth onClick={handleSaveNote} className="h-[40px]">
                  حفظ الملاحظة
                </Button>
                <Button
                  variant="outline"
                  fullWidth
                  onClick={() => setNoteModalMember(null)}
                  className="h-[40px]"
                >
                  إلغاء
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Resolve Alert Modal */}
        {resolveModalAlert && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
            <div className="bg-bg-surface w-full max-w-md rounded-t-sheet sm:rounded-card p-4 border border-border-default shadow-card space-y-4">
              <div className="flex items-center justify-between border-b border-border-default pb-3">
                <h3 className="text-body font-bold text-text-primary">
                  تسجيل نتيجة افتقاد: {resolveModalAlert.member?.fullName}
                </h3>
                <button
                  type="button"
                  onClick={() => setResolveModalAlert(null)}
                  className="p-1 rounded-full hover:bg-bg-muted text-text-secondary"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-2">
                <label className="text-caption font-semibold text-text-secondary block">
                  نتيجة التواصل والافتقاد:
                </label>
                <textarea
                  value={resolveOutcomeText}
                  onChange={(e) => setResolveOutcomeText(e.target.value)}
                  placeholder="مثال: تم الاتصال بوالد المخدوم واعتذر بسبب ظروف صحية وسيحضر الجمعة القادمة..."
                  rows={4}
                  className="w-full bg-bg-muted border border-border-default rounded-card p-3 text-body-small text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-brand-primary"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <Button
                  variant="primary"
                  fullWidth
                  isLoading={isResolvingAlert}
                  onClick={handleConfirmResolveAlert}
                  className="h-[40px]"
                >
                  تأكيد حل التنبيه
                </Button>
                <Button
                  variant="outline"
                  fullWidth
                  onClick={() => setResolveModalAlert(null)}
                  className="h-[40px]"
                >
                  إلغاء
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Supervisor Records Servant Attendance */}
        {isRecordServantModalOpen && selectedServant && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-bg-surface border border-border-default rounded-card w-full max-w-md p-5 shadow-elevated text-right space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-border-default">
                <div>
                  <h3 className="text-h2 font-bold text-text-primary">
                    تسجيل حضور خادم
                  </h3>
                  <p className="text-caption text-text-secondary mt-0.5">
                    الخادم: <span className="font-bold text-brand-primary">{selectedServant.fullName}</span> ({selectedServant.role.name})
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsRecordServantModalOpen(false)}
                  className="p-1 rounded-full hover:bg-bg-muted text-text-secondary"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3">
                {/* Session Type */}
                <div>
                  <label className="text-caption font-semibold text-text-secondary block mb-1">
                    نوع النشاط / الجلسة
                  </label>
                  <select
                    value={recordServantSessionType}
                    onChange={(e) => setRecordServantSessionType(e.target.value as ServantSessionType)}
                    className="w-full bg-bg-muted border border-border-default rounded-card p-2.5 text-body-small text-text-primary focus:outline-none focus:border-brand-primary"
                  >
                    {allowedServantSessions.map((st) => (
                      <option key={st} value={st}>
                        {SERVANT_SESSION_LABELS[st]?.ar || st}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Date */}
                <div>
                  <label className="text-caption font-semibold text-text-secondary block mb-1">
                    تاريخ الجلسة
                  </label>
                  <Input
                    type="date"
                    value={recordServantDate}
                    onChange={(e) => setRecordServantDate(e.target.value)}
                  />
                </div>

                {/* Status Selection */}
                <div>
                  <label className="text-caption font-semibold text-text-secondary block mb-1.5">
                    حالة الحضور
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setRecordServantStatus('PRESENT')}
                      className={cn(
                        'py-2 px-3 rounded-card text-caption font-bold border transition-all text-center',
                        recordServantStatus === 'PRESENT'
                          ? 'bg-status-success text-white border-status-success shadow-sm'
                          : 'bg-bg-muted text-text-secondary border-border-default hover:bg-bg-muted/80'
                      )}
                    >
                      حاضر
                    </button>
                    <button
                      type="button"
                      onClick={() => setRecordServantStatus('ABSENT')}
                      className={cn(
                        'py-2 px-3 rounded-card text-caption font-bold border transition-all text-center',
                        recordServantStatus === 'ABSENT'
                          ? 'bg-status-danger text-white border-status-danger shadow-sm'
                          : 'bg-bg-muted text-text-secondary border-border-default hover:bg-bg-muted/80'
                      )}
                    >
                      غائب
                    </button>
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="text-caption font-semibold text-text-secondary block mb-1">
                    ملاحظات وتوجيهات المشرف (اختياري)
                  </label>
                  <textarea
                    value={recordServantNotes}
                    onChange={(e) => setRecordServantNotes(e.target.value)}
                    placeholder="مثال: تم إبلاغ الخادم مسبقاً، أو اعتذر لظروف امتحانات..."
                    rows={2}
                    className="w-full bg-bg-muted border border-border-default rounded-card p-2.5 text-body-small text-text-primary focus:outline-none focus:border-brand-primary"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-border-default">
                <Button
                  variant="primary"
                  fullWidth
                  isLoading={isSavingServantAttendance}
                  onClick={handleSaveServantAttendance}
                  className="h-[40px] font-semibold text-caption"
                >
                  حفظ الحضور
                </Button>
                <Button
                  variant="outline"
                  fullWidth
                  disabled={isSavingServantAttendance}
                  onClick={() => setIsRecordServantModalOpen(false)}
                  className="h-[40px] text-text-secondary hover:text-text-primary text-caption"
                >
                  إلغاء
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL: EDIT SERVANT DATA (13 Fields + Role & Security) */}
        {isEditServantModalOpen && editingServant && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-bg-surface w-full max-w-2xl max-h-[92vh] flex flex-col rounded-modal border border-border-default shadow-modal overflow-hidden">
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-border-default p-4 sm:p-5 shrink-0 bg-bg-surface">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-full bg-brand-primary-soft text-brand-primary flex items-center justify-center font-bold">
                    <Pencil className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-body font-bold text-text-primary">
                      {editingServant.role.level >= 4
                        ? 'تعديل ملف وبيانات أمين القطاع'
                        : editingServant.role.level === 3
                          ? 'تعديل ملف وبيانات أمين الخدمة'
                          : 'تعديل ملف وبيانات الخادم'}
                    </h3>
                    <p className="text-caption text-text-secondary">
                      {editingServant.fullName} ({editingServant.role.name})
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsEditServantModalOpen(false)}
                  className="p-1.5 rounded-full text-text-secondary hover:text-text-primary hover:bg-bg-muted transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Navigation Tabs between Personal Data, Talents & Supervisor Evaluation */}
              <div className="flex border-b border-border-default bg-bg-muted/30 px-4 pt-2 gap-2 shrink-0 overflow-x-auto">
                <button
                  type="button"
                  onClick={() => setEditServantTab('profile')}
                  className={cn(
                    'flex items-center gap-1.5 py-2.5 px-3 text-caption sm:text-body-small font-bold border-b-2 transition-all whitespace-nowrap',
                    editServantTab === 'profile'
                      ? 'border-brand-primary text-brand-primary'
                      : 'border-transparent text-text-secondary hover:text-text-primary'
                  )}
                >
                  <User className="w-4 h-4" />
                  <span>البيانات الأساسية والتواصل</span>
                </button>
                <button
                  type="button"
                  onClick={() => setEditServantTab('talents')}
                  className={cn(
                    'flex items-center gap-1.5 py-2.5 px-3 text-caption sm:text-body-small font-bold border-b-2 transition-all whitespace-nowrap',
                    editServantTab === 'talents'
                      ? 'border-brand-primary text-brand-primary'
                      : 'border-transparent text-text-secondary hover:text-text-primary'
                  )}
                >
                  <Sparkles className="w-4 h-4" />
                  <span>الشموسية والمواهب والأسرة</span>
                </button>
                <button
                  type="button"
                  onClick={() => setEditServantTab('evaluation')}
                  className={cn(
                    'flex items-center gap-1.5 py-2.5 px-3 text-caption sm:text-body-small font-bold border-b-2 transition-all relative whitespace-nowrap',
                    editServantTab === 'evaluation'
                      ? 'border-brand-primary text-brand-primary'
                      : 'border-transparent text-text-secondary hover:text-text-primary'
                  )}
                >
                  <Award className="w-4 h-4" />
                  <span>
                    {editingServant.role.level >= 3 ? 'تقييم المشرف' : 'تقييم أمين الخدمة'}
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-status-warning-soft text-status-warning font-semibold border border-status-warning/30 hidden sm:inline-block">
                    خاص بالمشرف
                  </span>
                </button>
              </div>

              {/* Error Alert */}
              {editServantError && (
                <div className="mx-4 mt-3 p-3 bg-status-danger-soft text-status-danger border border-status-danger/30 rounded-card text-caption flex items-center gap-2 shrink-0">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{editServantError}</span>
                </div>
              )}

              {/* Scrollable Form Body */}
              <form onSubmit={handleUpdateServant} className="flex flex-col flex-1 overflow-hidden">
                <div className="overflow-y-auto p-4 sm:p-5 space-y-4 flex-1">
                  {editServantTab === 'profile' ? (
                    <div className="space-y-3.5">
                      {/* 1) اسمه & 5) التليفون */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-caption font-semibold text-text-secondary block mb-1">
                            1. اسمه (الاسم الثلاثي للخادم) *
                          </label>
                          <input
                            type="text"
                            required
                            value={editFullName}
                            onChange={(e) => setEditFullName(e.target.value)}
                            placeholder="مثال: مينا فريد نبيل"
                            className="w-full bg-bg-muted border border-border-default rounded-card p-2.5 text-body-small text-text-primary focus:outline-none focus:border-brand-primary"
                          />
                        </div>
                        <div>
                          <label className="text-caption font-semibold text-text-secondary block mb-1">
                            5. التليفون الأساسي (01xxxxxxxxx) *
                          </label>
                          <input
                            type="tel"
                            required
                            value={editPhoneNumber}
                            onChange={(e) => setEditPhoneNumber(e.target.value)}
                            placeholder="01xxxxxxxxx"
                            dir="ltr"
                            className="w-full bg-bg-muted border border-border-default rounded-card p-2.5 text-body-small text-text-primary focus:outline-none focus:border-brand-primary text-left"
                          />
                        </div>
                      </div>

                      {/* WhatsApp Phone & Email */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-caption font-semibold text-text-secondary block mb-1">
                            رقم الواتساب (WhatsApp)
                          </label>
                          <input
                            type="tel"
                            value={editWhatsappPhone}
                            onChange={(e) => setEditWhatsappPhone(e.target.value)}
                            placeholder="افتراضياً: نفس رقم الهاتف الأساسي"
                            dir="ltr"
                            className="w-full bg-bg-muted border border-border-default rounded-card p-2.5 text-body-small text-text-primary focus:outline-none focus:border-brand-primary text-left"
                          />
                          <p className="text-[11px] text-text-secondary mt-0.5">
                            اتركه فارغاً إذا كان مطابقاً للرقم الأساسي
                          </p>
                        </div>
                        <div>
                          <label className="text-caption font-semibold text-text-secondary block mb-1">
                            البريد الإلكتروني (اختياري)
                          </label>
                          <input
                            type="email"
                            value={editEmail}
                            onChange={(e) => setEditEmail(e.target.value)}
                            placeholder="servant@example.com"
                            dir="ltr"
                            className="w-full bg-bg-muted border border-border-default rounded-card p-2.5 text-body-small text-text-primary focus:outline-none focus:border-brand-primary text-left"
                          />
                        </div>
                      </div>

                      {/* Social Media: Facebook & Instagram */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-caption font-semibold text-text-secondary block mb-1">
                            رابط فيسبوك (Facebook)
                          </label>
                          <input
                            type="text"
                            value={editFacebookUrl}
                            onChange={(e) => setEditFacebookUrl(e.target.value)}
                            placeholder="https://facebook.com/username"
                            dir="ltr"
                            className="w-full bg-bg-muted border border-border-default rounded-card p-2.5 text-body-small text-text-primary focus:outline-none focus:border-brand-primary text-left"
                          />
                        </div>
                        <div>
                          <label className="text-caption font-semibold text-text-secondary block mb-1">
                            رابط انستجرام (Instagram)
                          </label>
                          <input
                            type="text"
                            value={editInstagramUrl}
                            onChange={(e) => setEditInstagramUrl(e.target.value)}
                            placeholder="https://instagram.com/username"
                            dir="ltr"
                            className="w-full bg-bg-muted border border-border-default rounded-card p-2.5 text-body-small text-text-primary focus:outline-none focus:border-brand-primary text-left"
                          />
                        </div>
                      </div>

                      {/* 2) اب الاعتراف & 3) تاريخ الميلاد */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-caption font-semibold text-text-secondary block mb-1">
                            2. اب الاعتراف
                          </label>
                          <input
                            type="text"
                            value={editFatherConfessor}
                            onChange={(e) => setEditFatherConfessor(e.target.value)}
                            placeholder="مثال: أبونا شنودة، أبونا بولا..."
                            className="w-full bg-bg-muted border border-border-default rounded-card p-2.5 text-body-small text-text-primary focus:outline-none focus:border-brand-primary"
                          />
                        </div>
                        <div>
                          <label className="text-caption font-semibold text-text-secondary block mb-1">
                            3. تاريخ الميلاد
                          </label>
                          <input
                            type="date"
                            value={editDateOfBirth}
                            onChange={(e) => setEditDateOfBirth(e.target.value)}
                            className="w-full bg-bg-muted border border-border-default rounded-card p-2.5 text-body-small text-text-primary focus:outline-none focus:border-brand-primary"
                          />
                        </div>
                      </div>

                      {/* 4) العنوان & 8) المرحلة الدراسية */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-caption font-semibold text-text-secondary block mb-1">
                            4. العنوان ومحل الإقامة
                          </label>
                          <input
                            type="text"
                            value={editAddress}
                            onChange={(e) => setEditAddress(e.target.value)}
                            placeholder="مثال: 14 شارع الكنيسة، شبرا، القاهرة"
                            className="w-full bg-bg-muted border border-border-default rounded-card p-2.5 text-body-small text-text-primary focus:outline-none focus:border-brand-primary"
                          />
                        </div>
                        <div>
                          <label className="text-caption font-semibold text-text-secondary block mb-1">
                            8. المرحلة الدراسية (يدرس/ جيش/ متخرج)
                          </label>
                          <div className="space-y-1.5">
                            <input
                              type="text"
                              value={editEducationOrCareer}
                              onChange={(e) => setEditEducationOrCareer(e.target.value)}
                              placeholder="يدرس / جيش / متخرج / التخصص والوظيفة..."
                              className="w-full bg-bg-muted border border-border-default rounded-card p-2.5 text-body-small text-text-primary focus:outline-none focus:border-brand-primary"
                            />
                            <div className="flex flex-wrap gap-1.5">
                              {['يدرس', 'جيش', 'متخرج', 'طالب جامعي', 'موظف'].map((opt) => (
                                <button
                                  key={opt}
                                  type="button"
                                  onClick={() => setEditEducationOrCareer(opt)}
                                  className={cn(
                                    'text-[11px] px-2 py-0.5 rounded-full border transition-colors',
                                    editEducationOrCareer === opt
                                      ? 'bg-brand-primary text-white border-brand-primary'
                                      : 'bg-bg-surface text-text-secondary border-border-default hover:border-brand-primary/40'
                                  )}
                                >
                                  {opt}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* 7) متزوج (اسم الزوج/ة) - تعديلها بواسطة أمين الخدمة فما فوق */}
                      <div className="p-3 bg-bg-muted/40 rounded-card border border-border-default space-y-2.5">
                        <div className="flex items-center justify-between">
                          <label className="text-caption font-bold text-text-primary">
                            7. الحالة الاجتماعية: متزوج (اسم الزوج/ة)
                          </label>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setEditMaritalStatus('أعزب')}
                              className={cn(
                                'px-3 py-1 rounded-pill text-caption font-semibold border transition-all',
                                editMaritalStatus === 'أعزب'
                                  ? 'bg-brand-primary text-white border-brand-primary'
                                  : 'bg-bg-surface text-text-secondary border-border-default'
                              )}
                            >
                              أعزب
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditMaritalStatus('متزوج')}
                              className={cn(
                                'px-3 py-1 rounded-pill text-caption font-semibold border transition-all',
                                editMaritalStatus === 'متزوج'
                                  ? 'bg-brand-primary text-white border-brand-primary'
                                  : 'bg-bg-surface text-text-secondary border-border-default'
                              )}
                            >
                              متزوج
                            </button>
                          </div>
                        </div>

                        {editMaritalStatus === 'متزوج' && (
                          <div className="pt-2 border-t border-border-default animate-fade-in">
                            <label className="text-caption font-semibold text-text-secondary block mb-1">
                              اسم الزوج / الزوجة
                            </label>
                            <input
                              type="text"
                              value={editSpouseName}
                              onChange={(e) => setEditSpouseName(e.target.value)}
                              placeholder="اسم الزوج/ة بالكامل..."
                              className="w-full bg-bg-surface border border-border-default rounded-card p-2 text-body-small text-text-primary focus:outline-none focus:border-brand-primary"
                            />
                          </div>
                        )}
                      </div>

                      {/* Additional Account Details: Role, Temp Password */}
                      <div className="pt-2 border-t border-border-default space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="text-caption font-semibold text-text-secondary block mb-1">
                              المسؤولية / الرتبة الخدمية
                            </label>
                            <select
                              value={editRoleCode}
                              disabled={!canEditRole}
                              onChange={(e) => setEditRoleCode(e.target.value)}
                              className={cn(
                                'w-full bg-bg-muted border border-border-default rounded-card p-2.5 text-body-small text-text-primary focus:outline-none focus:border-brand-primary',
                                !canEditRole && 'opacity-75 cursor-not-allowed bg-bg-surface'
                              )}
                            >
                              {availableEditRoles.map((r) => (
                                <option key={r.code} value={r.code}>
                                  {r.name}
                                </option>
                              ))}
                            </select>
                            {!canEditRole && (
                              <p className="text-[11px] text-text-tertiary mt-1">
                                لا تملك الصلاحية لتغيير رتبة هذا الحساب
                              </p>
                            )}
                          </div>

                          <div>
                            <label className="text-caption font-semibold text-text-secondary block mb-1">
                              تعيين كلمة مرور جديدة (اتركه فارغاً للإبقاء)
                            </label>
                            <input
                              type="password"
                              value={editTempPassword}
                              onChange={(e) => setEditTempPassword(e.target.value)}
                              placeholder="كلمة مرور جديدة (8 أحرف على الأقل)..."
                              className="w-full bg-bg-muted border border-border-default rounded-card p-2.5 text-body-small text-text-primary focus:outline-none focus:border-brand-primary"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : editServantTab === 'talents' ? (
                    /* TAB 2: DEACON, TALENTS, ACTIVITIES, SIBLINGS & CHILDREN */
                    <div className="space-y-4 animate-fade-in">
                      {/* Profile Picture */}
                      <div className="p-3.5 bg-bg-muted/40 rounded-card border border-border-default flex items-center gap-4">
                        <div className="relative w-16 h-16 rounded-full overflow-hidden bg-bg-surface border-2 border-brand-primary flex items-center justify-center shrink-0">
                          {editProfilePicture ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={editProfilePicture}
                              alt="صورة الخادم"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <User className="w-8 h-8 text-brand-primary" />
                          )}
                        </div>
                        <div className="flex-1 space-y-1.5">
                          <label className="text-caption font-bold text-text-primary block">
                            صورة الخادم الشخصية
                          </label>
                          <div className="flex items-center gap-2">
                            <label className="cursor-pointer px-3 py-1 bg-brand-primary text-white text-caption font-semibold rounded-pill hover:bg-brand-primary-light transition-colors flex items-center gap-1">
                              <Camera className="w-3.5 h-3.5" />
                              <span>رفع صورة</span>
                              <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    const reader = new FileReader();
                                    reader.onloadend = () => setEditProfilePicture(reader.result as string);
                                    reader.readAsDataURL(file);
                                  }
                                }}
                                className="hidden"
                              />
                            </label>
                            {editProfilePicture && (
                              <button
                                type="button"
                                onClick={() => setEditProfilePicture('')}
                                className="text-status-danger text-caption hover:underline font-semibold"
                              >
                                حذف الصورة
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Deacon Status */}
                      <div className="p-3.5 bg-bg-muted/40 rounded-card border border-border-default space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Award className="w-4 h-4 text-brand-primary" />
                            <span className="font-bold text-text-primary text-body-small">
                              الرتبة الشماسية (شماس)
                            </span>
                          </div>
                          <label className="flex items-center gap-2 cursor-pointer text-caption font-semibold">
                            <input
                              type="checkbox"
                              checked={editIsDeacon}
                              onChange={(e) => setEditIsDeacon(e.target.checked)}
                              className="w-4 h-4 rounded text-brand-primary focus:ring-brand-primary"
                            />
                            <span>شماس مُرسم</span>
                          </label>
                        </div>

                        {editIsDeacon && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-border-default">
                            <div>
                              <label className="text-caption font-semibold text-text-secondary block mb-1">
                                اسم الشماس في الرسامة
                              </label>
                              <input
                                type="text"
                                value={editDeaconName}
                                onChange={(e) => setEditDeaconName(e.target.value)}
                                placeholder="مثال: الشماس بطرس / أثناسيوس"
                                className="w-full bg-bg-surface border border-border-default rounded-card p-2 text-body-small text-text-primary focus:outline-none focus:border-brand-primary"
                              />
                            </div>
                            <div>
                              <label className="text-caption font-semibold text-text-secondary block mb-1">
                                رتبة الشماسية
                              </label>
                              <select
                                value={editDeaconRank}
                                onChange={(e) => setEditDeaconRank(e.target.value)}
                                className="w-full bg-bg-surface border border-border-default rounded-card p-2 text-body-small text-text-primary focus:outline-none focus:border-brand-primary"
                              >
                                {SERVANT_DEACON_RANKS.map((rk) => (
                                  <option key={rk} value={rk}>
                                    {rk}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Church Activities */}
                      <div className="p-3.5 bg-bg-muted/40 rounded-card border border-border-default space-y-2">
                        <span className="font-bold text-text-primary text-body-small block">
                          الأنشطة الكنسية المشترك بها (كورال, مسرح, كشافة, كورة)
                        </span>
                        <div className="flex flex-wrap gap-2 pt-1">
                          {SERVANT_ACTIVITIES_PRESET.map((act) => {
                            const isSelected = editActivities.includes(act);
                            return (
                              <button
                                key={act}
                                type="button"
                                onClick={() => handleToggleServantActivity(act)}
                                className={cn(
                                  'px-3 py-1 rounded-pill text-caption font-semibold transition-all border',
                                  isSelected
                                    ? 'bg-brand-primary text-white border-brand-primary shadow-xs'
                                    : 'bg-bg-surface text-text-secondary border-border-default hover:bg-bg-muted'
                                )}
                              >
                                {act} {isSelected ? '✓' : '+'}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Talents */}
                      <div className="p-3.5 bg-bg-muted/40 rounded-card border border-border-default space-y-2">
                        <span className="font-bold text-text-primary text-body-small block">
                          المواهب والمهارات (ألحان/ترتيل، شعر وكتابة، تمثيل وإلقاء، تكنولوجيا، كورة)
                        </span>
                        <div className="flex flex-wrap gap-2 pt-1">
                          {SERVANT_TALENTS_PRESET.map((tal) => {
                            const isSelected = editTalents.includes(tal);
                            return (
                              <button
                                key={tal}
                                type="button"
                                onClick={() => handleToggleServantTalent(tal)}
                                className={cn(
                                  'px-3 py-1 rounded-pill text-caption font-semibold transition-all border',
                                  isSelected
                                    ? 'bg-brand-accent text-white border-brand-accent shadow-xs'
                                    : 'bg-bg-surface text-text-secondary border-border-default hover:bg-bg-muted'
                                )}
                              >
                                {tal} {isSelected ? '★' : '+'}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Siblings */}
                      <div className="p-3.5 bg-bg-muted/40 rounded-card border border-border-default space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-caption font-bold text-text-primary block">
                            بيانات الأخوة والأخوات وأعمارهم
                          </span>
                          <button
                            type="button"
                            onClick={handleAddSibling}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-pill bg-brand-primary-soft text-brand-primary text-caption font-bold hover:bg-brand-primary/20 transition-colors"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>إضافة أخ / أخت</span>
                          </button>
                        </div>

                        {editSiblingsList.length === 0 ? (
                          <p className="text-[11px] text-text-tertiary text-center py-2">
                            لم تتم إضافة أخوة
                          </p>
                        ) : (
                          <div className="space-y-2 pt-1">
                            {editSiblingsList.map((sib, index) => (
                              <div key={index} className="flex items-center gap-2">
                                <input
                                  type="text"
                                  placeholder="اسم الأخ / الأخت..."
                                  value={sib.name}
                                  onChange={(e) => handleSiblingChange(index, 'name', e.target.value)}
                                  className="flex-1 bg-bg-surface border border-border-default rounded-card p-2 text-body-small text-text-primary focus:outline-none focus:border-brand-primary"
                                />
                                <input
                                  type="number"
                                  placeholder="السن..."
                                  value={sib.age}
                                  onChange={(e) => handleSiblingChange(index, 'age', e.target.value)}
                                  className="w-20 bg-bg-surface border border-border-default rounded-card p-2 text-body-small text-text-primary focus:outline-none focus:border-brand-primary text-center"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleRemoveSibling(index)}
                                  className="p-2 rounded-full text-status-danger hover:bg-status-danger-soft transition-colors"
                                  title="حذف"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* 9) الأبناء (اختياري) وسنهم */}
                      <div className="p-3.5 bg-bg-muted/40 rounded-card border border-border-default space-y-2.5">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-caption font-bold text-text-primary block">
                              9. الأبناء (اختياري) وسنهم
                            </span>
                            <span className="text-[11px] text-text-secondary">
                              إضافة أسماء وأعمار أبناء الخادم
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={handleAddChild}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-pill bg-brand-primary-soft text-brand-primary text-caption font-bold hover:bg-brand-primary/20 transition-colors"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>إضافة ابن/ابنة</span>
                          </button>
                        </div>

                        {editChildrenList.length === 0 ? (
                          <p className="text-[11px] text-text-tertiary text-center py-2">
                            لم تتم إضافة أبناء (اختياري)
                          </p>
                        ) : (
                          <div className="space-y-2 pt-1">
                            {editChildrenList.map((child, index) => (
                              <div key={index} className="flex items-center gap-2">
                                <input
                                  type="text"
                                  placeholder="اسم الابن/الابنة..."
                                  value={child.name}
                                  onChange={(e) => handleChildChange(index, 'name', e.target.value)}
                                  className="flex-1 bg-bg-surface border border-border-default rounded-card p-2 text-body-small text-text-primary focus:outline-none focus:border-brand-primary"
                                />
                                <input
                                  type="text"
                                  placeholder="السن..."
                                  value={child.age}
                                  onChange={(e) => handleChildChange(index, 'age', e.target.value)}
                                  className="w-20 bg-bg-surface border border-border-default rounded-card p-2 text-body-small text-text-primary focus:outline-none focus:border-brand-primary text-center"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleRemoveChild(index)}
                                  className="p-2 rounded-full text-status-danger hover:bg-status-danger-soft transition-colors"
                                  title="حذف"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    /* TAB 2: SUPERVISOR EVALUATION */
                    <div className="space-y-4 animate-fade-in">
                      <div className="p-3 bg-brand-primary-soft/60 border border-brand-primary/20 rounded-card flex items-start gap-2.5">
                        <Shield className="w-5 h-5 text-brand-primary shrink-0 mt-0.5" />
                        <div>
                          <h4 className="text-body-small font-bold text-brand-primary">
                            {user?.role?.level && user.role.level >= 5
                              ? 'تقييم ومتابعة الأمانة العامة (5 بنود سرية)'
                              : user?.role?.level === 4
                                ? 'تقييم ومتابعة أمين القطاع (5 بنود سرية)'
                                : 'تقييم ومتابعة أمين الخدمة (5 بنود سرية)'}
                          </h4>
                          <p className="text-caption text-text-secondary mt-0.5">
                            هذه الحقول التقييمية تضاف من المشرف المسؤول لمتابعة كفاءة وأداء الخادم، ولا تظهر للمخدومين.
                          </p>
                        </div>
                      </div>

                      {/* 6) الحالة المادية */}
                      <div>
                        <label className="text-caption font-semibold text-text-secondary flex items-center justify-between mb-1">
                          <span className="font-bold text-text-primary">
                            6. الحالة المادية (تقييم المشرف المسؤول)
                          </span>
                          <span className="text-[11px] text-brand-primary">سرية</span>
                        </label>
                        <input
                          type="text"
                          value={editFinancialStatus}
                          onChange={(e) => setEditFinancialStatus(e.target.value)}
                          placeholder="مثال: مستقرة، تحتاج افتقاد ودعم، ميسورة..."
                          className="w-full bg-bg-muted border border-border-default rounded-card p-2.5 text-body-small text-text-primary focus:outline-none focus:border-brand-primary"
                        />
                        <div className="flex flex-wrap gap-1.5 mt-1.5">
                          {['مستقرة', 'متوسطة', 'تحتاج افتقاد ودعم', 'ميسورة'].map((st) => (
                            <button
                              key={st}
                              type="button"
                              onClick={() => setEditFinancialStatus(st)}
                              className={cn(
                                'text-[11px] px-2 py-0.5 rounded-full border transition-colors',
                                editFinancialStatus === st
                                  ? 'bg-brand-primary text-white border-brand-primary'
                                  : 'bg-bg-surface text-text-secondary border-border-default hover:border-brand-primary/40'
                              )}
                            >
                              {st}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* 10) السلوك مع المخدومين */}
                      <div>
                        <label className="text-caption font-semibold text-text-secondary block mb-1">
                          <span className="font-bold text-text-primary">
                            10. السلوك مع المخدومين (تقييم المشرف المسؤول)
                          </span>
                        </label>
                        <textarea
                          rows={2}
                          value={editBehaviorWithMembers}
                          onChange={(e) => setEditBehaviorWithMembers(e.target.value)}
                          placeholder="تقييم علاقة الخادم بالمخدومين، أسلوب الاحتواء والافتقاد والشرح..."
                          className="w-full bg-bg-muted border border-border-default rounded-card p-2.5 text-body-small text-text-primary focus:outline-none focus:border-brand-primary resize-none"
                        />
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {[
                            'محب ومحتوي ومواظب',
                            'علاقة ممتازة وافتقاد دوري',
                            'جيد ويحتاج تنشيط الافتقاد',
                            'يحتاج تطوير أسلوب التواصل والتواجد',
                          ].map((text) => (
                            <button
                              key={text}
                              type="button"
                              onClick={() => setEditBehaviorWithMembers(text)}
                              className="text-[11px] px-2 py-0.5 rounded-full bg-bg-surface text-text-secondary border border-border-default hover:border-brand-primary/40"
                            >
                              {text}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* 11) السلوك مع الخدام */}
                      <div>
                        <label className="text-caption font-semibold text-text-secondary block mb-1">
                          <span className="font-bold text-text-primary">
                            11. السلوك مع الخدام والزملاء (تقييم المشرف المسؤول)
                          </span>
                        </label>
                        <textarea
                          rows={2}
                          value={editBehaviorWithServants}
                          onChange={(e) => setEditBehaviorWithServants(e.target.value)}
                          placeholder="تقييم روح المحبة، قبول التوجيه، التنسيق مع زملائه الخدام..."
                          className="w-full bg-bg-muted border border-border-default rounded-card p-2.5 text-body-small text-text-primary focus:outline-none focus:border-brand-primary resize-none"
                        />
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {[
                            'روح محبة وتواضع ومرونة',
                            'متعاون جداً مع الفريق',
                            'هادئ وملتزم بدوره',
                            'يحتاج اندماج أكثر في روح الفريق',
                          ].map((text) => (
                            <button
                              key={text}
                              type="button"
                              onClick={() => setEditBehaviorWithServants(text)}
                              className="text-[11px] px-2 py-0.5 rounded-full bg-bg-surface text-text-secondary border border-border-default hover:border-brand-primary/40"
                            >
                              {text}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* 12) التعاون */}
                      <div>
                        <label className="text-caption font-semibold text-text-secondary block mb-1">
                          <span className="font-bold text-text-primary">
                            12. التعاون والمشاركة (تقييم المشرف المسؤول)
                          </span>
                        </label>
                        <input
                          type="text"
                          value={editCooperation}
                          onChange={(e) => setEditCooperation(e.target.value)}
                          placeholder="مدى التعاون في أنشطة المرحلة والرحلات والاحتفالات..."
                          className="w-full bg-bg-muted border border-border-default rounded-card p-2.5 text-body-small text-text-primary focus:outline-none focus:border-brand-primary"
                        />
                        <div className="flex flex-wrap gap-1.5 mt-1.5">
                          {[
                            'متعاون جداً ويبادر بالمساعدة',
                            'ملتزم تماماً بما يكلف به',
                            'متوسط ويحتاج تشجيع ومتابعة',
                            'يحتاج مشاركة أكثر في الأنشطة',
                          ].map((text) => (
                            <button
                              key={text}
                              type="button"
                              onClick={() => setEditCooperation(text)}
                              className="text-[11px] px-2 py-0.5 rounded-full bg-bg-surface text-text-secondary border border-border-default hover:border-brand-primary/40"
                            >
                              {text}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* 13) العمل الفردي */}
                      <div>
                        <label className="text-caption font-semibold text-text-secondary block mb-1">
                          <span className="font-bold text-text-primary">
                            13. العمل الفردي والمبادرة (تقييم المشرف المسؤول)
                          </span>
                        </label>
                        <input
                          type="text"
                          value={editIndividualInitiative}
                          onChange={(e) => setEditIndividualInitiative(e.target.value)}
                          placeholder="القدرة على الافتقاد الفردي، حل المشكلات، الابتكار..."
                          className="w-full bg-bg-muted border border-border-default rounded-card p-2.5 text-body-small text-text-primary focus:outline-none focus:border-brand-primary"
                        />
                        <div className="flex flex-wrap gap-1.5 mt-1.5">
                          {[
                            'مبادر ومبتكر في العمل الفردي',
                            'نشط في الافتقاد الشخصي للمخدومين',
                            'جيد في إنجاز المهام الفردية',
                            'يحتاج توجيه وإشراف مستمر',
                          ].map((text) => (
                            <button
                              key={text}
                              type="button"
                              onClick={() => setEditIndividualInitiative(text)}
                              className="text-[11px] px-2 py-0.5 rounded-full bg-bg-surface text-text-secondary border border-border-default hover:border-brand-primary/40"
                            >
                              {text}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* ملاحظات وتوجيهات إضافية */}
                      <div>
                        <label className="text-caption font-semibold text-text-secondary block mb-1">
                          ملاحظات وتوجيهات إضافية للمشرف المسؤول
                        </label>
                        <textarea
                          rows={2}
                          value={editEvaluationNotes}
                          onChange={(e) => setEditEvaluationNotes(e.target.value)}
                          placeholder="أي ملاحظات رعوية خاصة بمتابعة الخادم وتطويره..."
                          className="w-full bg-bg-muted border border-border-default rounded-card p-2.5 text-body-small text-text-primary focus:outline-none focus:border-brand-primary resize-none"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Modal Footer with Actions */}
                <div className="flex items-center gap-3 p-4 sm:p-5 border-t border-border-default bg-bg-surface shrink-0">
                  <Button
                    type="submit"
                    variant="primary"
                    fullWidth
                    isLoading={isEditingServantLoading}
                    className="h-[42px] font-bold text-caption sm:text-body-small gap-2"
                  >
                    <Save className="w-4 h-4" />
                    <span>حفظ كافة التعديلات والتقييمات</span>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isEditingServantLoading}
                    onClick={() => setIsEditServantModalOpen(false)}
                    className="h-[42px] px-6 text-text-secondary hover:text-text-primary text-caption sm:text-body-small shrink-0"
                  >
                    إلغاء
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}



        {/* Modal: General Secretary Transfers Servant to Another Stage */}
        {transferModalServant && (
          <ServantTransferModal
            isOpen={Boolean(transferModalServant)}
            onClose={() => setTransferModalServant(null)}
            servant={transferModalServant}
            currentStageId={selectedStageId}
            onSuccess={async () => {
              setServantFeedbackMessage({
                type: 'success',
                text: `تم نقل الخادم (${transferModalServant.fullName}) بنجاح!`,
              });
              setTimeout(() => setServantFeedbackMessage(null), 4000);
              await fetchStageServants();
            }}
          />
        )}

        {/* Modal: General Secretary Stops or Reactivates Servant Account */}
        {stopModalServant && (
          <ServantStopModal
            isOpen={Boolean(stopModalServant)}
            onClose={() => setStopModalServant(null)}
            servant={stopModalServant}
            currentStageName={availableStages.find((s) => s.id === selectedStageId)?.name}
            onSuccess={async () => {
              const wasSuspended = stopModalServant.status === 'SUSPENDED';
              setServantFeedbackMessage({
                type: 'success',
                text: wasSuspended
                  ? `تم إعادة تنشيط حساب الخادم (${stopModalServant.fullName}) بنجاح!`
                  : `تم إيقاف حساب الخادم (${stopModalServant.fullName}) بنجاح!`,
              });
              setTimeout(() => setServantFeedbackMessage(null), 4000);
              await fetchStageServants();
            }}
          />
        )}

        {/* Modal: General Secretary Views Status and Transfer Audit History */}
        {historyModalServant && (
          <ServantStatusHistoryModal
            isOpen={Boolean(historyModalServant)}
            onClose={() => setHistoryModalServant(null)}
            servant={historyModalServant}
          />
        )}

        {/* Modal: General Secretary Church-Wide Servant Directory */}
        {isDirectoryModalOpen && (
          <ServantDirectoryModal
            isOpen={isDirectoryModalOpen}
            onClose={() => setIsDirectoryModalOpen(false)}
            onServantUpdated={async () => {
              await fetchStageServants();
            }}
          />
        )}

        {/* Global Bottom Tab Bar */}
        <TabBar activeTab="attendance" />
      </div>
    </ProtectedRoute>
  );
}
