'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { X, Lock, ShieldAlert, CheckCircle2, AlertCircle } from 'lucide-react';

interface MemberEditDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  member: any;
  onSuccess: (updatedMember: any) => void;
}

const formatDobForInput = (dob?: string | Date | null): string => {
  if (!dob) return '';
  if (typeof dob === 'string') {
    return dob.split('T')[0];
  }
  if (dob instanceof Date) {
    return dob.toISOString().split('T')[0];
  }
  return '';
};

export const MemberEditDrawer: React.FC<MemberEditDrawerProps> = ({
  isOpen,
  onClose,
  member,
  onSuccess,
}) => {
  const { user } = useAuth();
  const isServantOnly = user?.role.level === 1;

  // Form states
  const [financialStatus, setFinancialStatus] = useState('');
  const [behaviorInService, setBehaviorInService] = useState('');
  const [peerIntegration, setPeerIntegration] = useState('');

  // Full fields for Level 2+
  const [fullName, setFullName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [address, setAddress] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [fatherConfessor, setFatherConfessor] = useState('');
  const [schoolOrUniversity, setSchoolOrUniversity] = useState('');
  const [educationalGrade, setEducationalGrade] = useState('');
  const [fatherName, setFatherName] = useState('');
  const [motherName, setMotherName] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (member) {
      setFinancialStatus(member.financialStatus || '');
      setBehaviorInService(member.behaviorInService || '');
      setPeerIntegration(member.peerIntegration || '');

      setFullName(member.fullName || '');
      setDateOfBirth(formatDobForInput(member.dateOfBirth));
      setAddress(member.address || '');
      setPhoneNumber(member.phoneNumber || '');
      setFatherConfessor(member.fatherConfessor || '');
      setSchoolOrUniversity(member.schoolOrUniversity || '');
      setEducationalGrade(member.educationalGrade || '');
      setFatherName(member.fatherName || '');
      setMotherName(member.motherName || '');
      setErrorMsg(null);
    }
  }, [member]);

  if (!isOpen || !member) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    let payload: any = {};

    if (isServantOnly) {
      // Assumption A2: Strictly 3 evaluative fields only
      payload = {
        financialStatus,
        behaviorInService,
        peerIntegration,
      };
    } else {
      payload = {
        fullName,
        dateOfBirth: dateOfBirth || null,
        address,
        phoneNumber: phoneNumber || null,
        fatherConfessor: fatherConfessor || null,
        schoolOrUniversity: schoolOrUniversity || null,
        educationalGrade: educationalGrade || null,
        fatherName: fatherName || null,
        motherName: motherName || null,
        financialStatus: financialStatus || null,
        behaviorInService: behaviorInService || null,
        peerIntegration: peerIntegration || null,
      };
    }

    try {
      setIsLoading(true);
      const res = await api.patch(`/api/v1/members/${member.id}`, payload);
      if (res.data?.success) {
        onSuccess(res.data.member);
        onClose();
      }
    } catch (err: any) {
      setErrorMsg(
        err.response?.data?.error?.message ||
        'حدث خطأ أثناء حفظ التعديلات. تأكد من استيفاء الصلاحيات.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div
        dir="rtl"
        className="w-full max-w-[500px] bg-bg-surface border border-border-default rounded-card shadow-elevated p-6 text-right relative max-h-[90vh] overflow-y-auto"
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 left-4 text-text-secondary hover:text-text-primary p-1 rounded-button hover:bg-bg-muted"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="mb-4">
          <h2 className="text-h2 font-bold text-brand-primary">
            {isServantOnly ? 'تعديل تقييم الخادم المسئول' : 'تعديل السجل الشامل للمخدوم'}
          </h2>
          <p className="text-caption text-text-secondary mt-0.5">
            المخدوم: <strong className="text-text-primary">{member.fullName}</strong>
          </p>
        </div>

        {/* Assumption A2 Scope Indicator Banner */}
        {isServantOnly ? (
          <div className="mb-4 p-3 bg-brand-primary-soft border border-[#C5D5E8] rounded-lg flex items-start gap-2.5 text-right">
            <ShieldAlert className="w-4 h-4 text-brand-primary shrink-0 mt-0.5" />
            <p className="text-caption text-brand-primary font-medium leading-relaxed">
              <strong>قيد الصلاحية (Assumption A2):</strong> بصفتك خادماً، يسمح لك حصرياً بتعديل الحقول التقييمية الثلاثة للمخدوم المسند إليك (الحالة المادية، السلوك، والاندماج).
            </p>
          </div>
        ) : (
          <div className="mb-4 p-3 bg-status-info-soft border border-[#BFDEFF] rounded-lg flex items-start gap-2.5 text-right">
            <CheckCircle2 className="w-4 h-4 text-status-info shrink-0 mt-0.5" />
            <p className="text-caption text-status-info font-medium leading-relaxed">
              بصفتك ({user?.role.name})، تمتلك صلاحية التعديل الشامل لكافة بيانات المخدوم داخل المرحلة.
            </p>
          </div>
        )}

        {errorMsg && (
          <div className="mb-4 p-3 bg-status-danger-soft border border-[#F5C2BE] rounded-lg flex items-start gap-2 text-right">
            <AlertCircle className="w-4 h-4 text-status-danger shrink-0 mt-0.5" />
            <p className="text-caption text-status-danger font-medium">{errorMsg}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Read-Only Locked Fields for Servants */}
          {isServantOnly && (
            <div className="p-3 bg-bg-muted/60 rounded-lg border border-border-default flex flex-col gap-2">
              <span className="text-caption font-semibold text-text-secondary flex items-center gap-1">
                <Lock className="w-3.5 h-3.5 text-text-secondary" />
                <span>البيانات الأساسية (محمية ومقروءة فقط للخادم):</span>
              </span>
              <div className="text-body-small text-text-primary grid grid-cols-3 gap-2">
                <div>
                  <span className="text-caption text-text-secondary block">تاريخ الميلاد:</span>
                  <span>
                    {member.dateOfBirth
                      ? new Date(member.dateOfBirth).toLocaleDateString('ar-EG')
                      : '—'}
                  </span>
                </div>
                <div>
                  <span className="text-caption text-text-secondary block">رقم الهاتف:</span>
                  <span>{member.phoneNumber || '—'}</span>
                </div>
                <div>
                  <span className="text-caption text-text-secondary block">العنوان:</span>
                  <span>{member.address || '—'}</span>
                </div>
              </div>
            </div>
          )}

          {/* Full Fields for Level 2+ Assistant Secretaries */}
          {!isServantOnly && (
            <div className="flex flex-col gap-3">
              <Input
                label="الاسم بالكامل"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />

              <div className="grid grid-cols-2 gap-3">
                <Input
                  type="date"
                  label="تاريخ الميلاد"
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                  required
                />
                <Input
                  label="رقم الهاتف"
                  placeholder="01xxxxxxxxx"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                />
              </div>

              <Input
                label="العنوان"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                required
              />

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="المدرسة أو الكلية"
                  value={schoolOrUniversity}
                  onChange={(e) => setSchoolOrUniversity(e.target.value)}
                />
                <Input
                  label="الصف الدراسي"
                  value={educationalGrade}
                  onChange={(e) => setEducationalGrade(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="اسم الأب"
                  value={fatherName}
                  onChange={(e) => setFatherName(e.target.value)}
                />
                <Input
                  label="اسم الأم"
                  value={motherName}
                  onChange={(e) => setMotherName(e.target.value)}
                />
              </div>

              <Input
                label="أب الاعتراف"
                value={fatherConfessor}
                onChange={(e) => setFatherConfessor(e.target.value)}
              />
            </div>
          )}

          {/* 3 Evaluative Fields (Editable by both Servant and Assistant) */}
          <div className="pt-2 border-t border-border-default flex flex-col gap-3">
            <span className="text-body-small font-bold text-brand-primary">
              الحقول التقييمية للخدمة:
            </span>

            {/* Financial Status */}
            <div className="flex flex-col gap-1.5 text-right">
              <label className="text-body-small font-medium text-text-primary">
                الحالة المادية
              </label>
              <select
                value={financialStatus}
                onChange={(e) => setFinancialStatus(e.target.value)}
                className="w-full h-[46px] bg-bg-surface text-text-primary font-cairo text-body-default rounded-input border border-border-default px-3 focus:outline-none focus:ring-2 focus:ring-brand-primary"
              >
                <option value="">(اختر الحالة المادية)</option>
                <option value="ميسور">ميسور</option>
                <option value="متوسط">متوسط</option>
                <option value="يحتاج مساعدة مدرسية">يحتاج مساعدة مدرسية</option>
                <option value="يحتاج رعاية مادية دورية">يحتاج رعاية مادية دورية</option>
              </select>
            </div>

            {/* Behavior in Service */}
            <div className="flex flex-col gap-1.5 text-right">
              <label className="text-body-small font-medium text-text-primary">
                سلوكه في الخدمة
              </label>
              <textarea
                rows={2}
                value={behaviorInService}
                onChange={(e) => setBehaviorInService(e.target.value)}
                placeholder="سلوكه العام، انتظامه، ومدى التزامه الروحي والكنسي..."
                className="w-full bg-bg-surface text-text-primary font-cairo text-body-default rounded-input border border-border-default p-3 focus:outline-none focus:ring-2 focus:ring-brand-primary resize-none"
              />
            </div>

            {/* Peer Integration */}
            <div className="flex flex-col gap-1.5 text-right">
              <label className="text-body-small font-medium text-text-primary">
                اندماجه مع زملائه
              </label>
              <textarea
                rows={2}
                value={peerIntegration}
                onChange={(e) => setPeerIntegration(e.target.value)}
                placeholder="علاقته بزملائه، العمل الجماعي، والمشاركة في الأنشطة..."
                className="w-full bg-bg-surface text-text-primary font-cairo text-body-default rounded-input border border-border-default p-3 focus:outline-none focus:ring-2 focus:ring-brand-primary resize-none"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border-default">
            <Button
              type="submit"
              variant="primary"
              fullWidth
              isLoading={isLoading}
              className="h-[46px]"
            >
              حفظ التعديلات
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
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
