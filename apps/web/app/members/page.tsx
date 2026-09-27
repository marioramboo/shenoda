'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { MemberRow } from '@/components/ui/MemberRow';
import { Chip } from '@/components/ui/Chip';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { api } from '@/lib/api';
import { TabBar } from '@/components/layout/TabBar';
import {
  Users,
  Search,
  UserPlus,
  UploadCloud,
  Filter,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  X,
  Phone,
  Calendar,
  MapPin,
  Loader2,
  Sparkles,
} from 'lucide-react';

export default function MembersListPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [members, setMembers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStageId, setSelectedStageId] = useState<string>('');
  const [assignedOnly, setAssignedOnly] = useState<boolean>(false);

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

  // Fetch members
  const fetchMembers = useCallback(async () => {
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
  }, [selectedStageId, searchQuery, assignedOnly]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  // Set default stage when user loads
  useEffect(() => {
    if (user?.scopes.stages && user.scopes.stages.length > 0 && !selectedStageId) {
      setSelectedStageId(user.scopes.stages[0].id);
      setNewStageId(user.scopes.stages[0].id);
    }
  }, [user, selectedStageId]);

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError(null);

    const targetStage = newStageId || selectedStageId || user?.scopes.stages[0]?.id;
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

    const targetStage = selectedStageId || user?.scopes.stages[0]?.id;
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

  const canManage = (user?.role.level || 1) >= 2;

  return (
    <ProtectedRoute>
      <div dir="rtl" className="min-h-screen bg-bg-app flex flex-col items-center p-4 sm:p-6 pb-24">
        <div className="w-full max-w-[480px] flex flex-col gap-4">
          {/* Top Bar Navigation */}
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
                <h1 className="text-h2 font-bold text-text-primary">قائمة المخدومين</h1>
                <p className="text-caption text-text-secondary">
                  سجلات مخدومي الخدمة الكنسية (FR-3.4)
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {canManage && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsBulkModalOpen(true)}
                  className="gap-1 text-caption h-[36px]"
                >
                  <UploadCloud className="w-4 h-4 text-brand-primary" />
                  <span className="hidden sm:inline">استيراد CSV</span>
                </Button>
              )}
            </div>
          </header>

          {/* Search Bar */}
          <div className="relative w-full">
            <Input
              placeholder="ابحث بالاسم أو رقم الهاتف..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              iconLeading={<Search className="w-4 h-4 text-text-secondary" />}
              className="h-[46px] bg-bg-surface text-body-default shadow-card"
            />
          </div>

          {/* Stage Filter Chips Bar */}
          {user?.scopes.stages && user.scopes.stages.length > 0 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-1.5 scrollbar-none">
              <Chip
                selected={!selectedStageId}
                onClick={() => setSelectedStageId('')}
              >
                الكل
              </Chip>
              {user.scopes.stages.map((stg) => (
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

          {/* Servant Assignment Filter Toggle (For Level 1 Servants) */}
          {user?.role.level === 1 && (
            <div className="flex items-center justify-between bg-bg-surface border border-border-default rounded-card px-4 py-2.5 shadow-2xs">
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
            </div>
          )}

          {/* Members List Container */}
          <main className="flex flex-col gap-2.5">
            {isLoading ? (
              <div className="py-12 flex flex-col items-center justify-center gap-2 text-text-secondary">
                <Loader2 className="w-7 h-7 animate-spin text-brand-primary" />
                <span className="text-body-small">جاري تحميل سجلات المخدومين...</span>
              </div>
            ) : errorMsg ? (
              <div className="p-4 bg-status-danger-soft border border-[#F5C2BE] rounded-card text-center text-status-danger text-body-small">
                {errorMsg}
              </div>
            ) : members.length === 0 ? (
              <div className="bg-bg-surface border border-border-default rounded-card p-8 text-center flex flex-col items-center justify-center shadow-card">
                <Users className="w-12 h-12 text-text-secondary/40 mb-2" />
                <h3 className="text-body-default font-bold text-text-primary">
                  لا يوجد مخدومين مسجلين
                </h3>
                <p className="text-caption text-text-secondary mt-1 max-w-xs">
                  {canManage
                    ? 'يمكنك إضافة مخدوم جديد أو استخدام خاصية الاستيراد الجماعي.'
                    : 'لم يتم العثور على مخدومين مطابقين لمعايير البحث في هذه المرحلة.'}
                </p>
                {canManage && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setIsAddModalOpen(true)}
                    className="mt-4 gap-1.5"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>إضافة مخدوم الآن</span>
                  </Button>
                )}
              </div>
            ) : (
              members.map((member) => (
                <MemberRow
                  key={member.id}
                  id={member.id}
                  name={member.fullName}
                  subtitle={`${member.stage?.name || 'مرحلة غير محددة'} • ${member.address}`}
                  badgeText={member.isAssigned ? 'مسند إليك' : undefined}
                  badgeVariant={member.isAssigned ? 'success' : undefined}
                  onClick={() => router.push(`/members/${member.id}`)}
                />
              ))
            )}
          </main>

          {/* Floating Action Button (FAB) for Assistant Secretaries (Level >= 2) */}
          {canManage && (
            <div className="fixed bottom-20 left-4 z-30 sm:static sm:mt-2">
              <Button
                variant="accent"
                onClick={() => setIsAddModalOpen(true)}
                className="shadow-elevated rounded-pill px-5 h-[48px] gap-2 font-bold text-white bg-brand-accent hover:bg-[#a67923]"
              >
                <UserPlus className="w-5 h-5" />
                <span>إضافة مخدوم</span>
              </Button>
            </div>
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
                      value={newStageId}
                      onChange={(e) => setNewStageId(e.target.value)}
                      className="w-full h-[46px] bg-bg-surface text-text-primary font-cairo text-body-default rounded-input border border-border-default px-3 focus:outline-none focus:ring-2 focus:ring-brand-primary"
                    >
                      {user?.scopes.stages.map((stg) => (
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
        </div>

        {/* Bottom Tab Bar */}
        <TabBar
          activeTab="members"
          onTabChange={(tab) => {
            if (tab === 'dashboard') router.push('/dashboard');
          }}
        />
      </div>
    </ProtectedRoute>
  );
}
