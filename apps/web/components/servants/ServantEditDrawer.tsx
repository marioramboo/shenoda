'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { FatherConfessorFields } from '@/components/common/FatherConfessorFields';
import { X, Shield, Lock, CheckCircle2, AlertCircle } from 'lucide-react';

interface ServantEditDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  servant: any;
  onSuccess: (updatedServant: any) => void;
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

export const ServantEditDrawer: React.FC<ServantEditDrawerProps> = ({
  isOpen,
  onClose,
  servant,
  onSuccess,
}) => {
  const { user } = useAuth();
  const isSupervisor = (user?.role?.level ?? 1) >= 3;
  const isSelf = user?.id === servant?.id;

  // Profile fields
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [whatsappPhone, setWhatsappPhone] = useState('');
  const [facebookUrl, setFacebookUrl] = useState('');
  const [instagramUrl, setInstagramUrl] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [address, setAddress] = useState('');
  const [fatherConfessor, setFatherConfessor] = useState('');
  const [fatherConfessorChurch, setFatherConfessorChurch] = useState('');
  const [maritalStatus, setMaritalStatus] = useState('أعزب');
  const [spouseName, setSpouseName] = useState('');
  const [educationOrCareer, setEducationOrCareer] = useState('');
  const [isDeacon, setIsDeacon] = useState(false);
  const [deaconRank, setDeaconRank] = useState('');
  const [deaconName, setDeaconName] = useState('');

  // Evaluative fields (Supervisor only)
  const [financialStatus, setFinancialStatus] = useState('');
  const [behaviorWithMembers, setBehaviorWithMembers] = useState('');
  const [behaviorWithServants, setBehaviorWithServants] = useState('');
  const [cooperation, setCooperation] = useState('');
  const [individualInitiative, setIndividualInitiative] = useState('');
  const [evaluationNotes, setEvaluationNotes] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (servant) {
      setFullName(servant.fullName || '');
      setPhoneNumber(servant.phoneNumber || '');
      setEmail(servant.email || '');
      setWhatsappPhone(servant.whatsappPhone || servant.whatsappPhoneRaw || servant.phoneNumber || '');
      setFacebookUrl(servant.facebookUrl || '');
      setInstagramUrl(servant.instagramUrl || '');
      setDateOfBirth(formatDobForInput(servant.dateOfBirth));
      setAddress(servant.address || '');
      setFatherConfessor(servant.fatherConfessor || '');
      setFatherConfessorChurch(servant.fatherConfessorChurch || '');
      setMaritalStatus(servant.maritalStatus || 'أعزب');
      setSpouseName(servant.spouseName || '');
      setEducationOrCareer(servant.educationOrCareer || servant.jobTitle || '');
      setIsDeacon(Boolean(servant.isDeacon));
      setDeaconRank(servant.deaconRank || '');
      setDeaconName(servant.deaconName || '');

      const evalData = servant.evaluation || {};
      setFinancialStatus(evalData.financialStatus || '');
      setBehaviorWithMembers(evalData.behaviorWithMembers || '');
      setBehaviorWithServants(evalData.behaviorWithServants || '');
      setCooperation(evalData.cooperation || '');
      setIndividualInitiative(evalData.individualInitiative || '');
      setEvaluationNotes(evalData.notes || '');

      setErrorMsg(null);
    }
  }, [servant]);

  if (!isOpen || !servant) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const payload: any = {};

    if (isSupervisor) {
      payload.fullName = fullName.trim();
      payload.phoneNumber = phoneNumber.trim();
      payload.email = email.trim() || null;
      payload.whatsappPhone = whatsappPhone.trim() || null;
      payload.facebookUrl = facebookUrl.trim() || null;
      payload.instagramUrl = instagramUrl.trim() || null;
      payload.dateOfBirth = dateOfBirth || null;
      payload.address = address.trim() || null;
      payload.fatherConfessor = fatherConfessor.trim() || null;
      payload.fatherConfessorChurch = fatherConfessorChurch.trim() || null;
      payload.maritalStatus = maritalStatus || null;
      payload.spouseName = maritalStatus === 'متزوج' ? spouseName.trim() || null : null;
      payload.educationOrCareer = educationOrCareer.trim() || null;
      payload.jobTitle = educationOrCareer.trim() || null;
      payload.isDeacon = isDeacon;
      payload.deaconRank = isDeacon ? deaconRank.trim() || null : null;
      payload.deaconName = isDeacon ? deaconName.trim() || null : null;

      // Evaluative fields
      payload.financialStatus = financialStatus.trim() || null;
      payload.behaviorWithMembers = behaviorWithMembers.trim() || null;
      payload.behaviorWithServants = behaviorWithServants.trim() || null;
      payload.cooperation = cooperation.trim() || null;
      payload.individualInitiative = individualInitiative.trim() || null;
      payload.evaluationNotes = evaluationNotes.trim() || null;
    } else if (isSelf) {
      // Self update non-evaluative fields
      payload.whatsappPhone = whatsappPhone.trim() || null;
      payload.facebookUrl = facebookUrl.trim() || null;
      payload.instagramUrl = instagramUrl.trim() || null;
      payload.dateOfBirth = dateOfBirth || null;
      payload.address = address.trim() || null;
      payload.fatherConfessor = fatherConfessor.trim() || null;
      payload.fatherConfessorChurch = fatherConfessorChurch.trim() || null;
      payload.educationOrCareer = educationOrCareer.trim() || null;
      payload.jobTitle = educationOrCareer.trim() || null;
      payload.maritalStatus = maritalStatus || null;
      payload.spouseName = maritalStatus === 'متزوج' ? spouseName.trim() || null : null;
      payload.isDeacon = isDeacon;
      payload.deaconRank = isDeacon ? deaconRank.trim() || null : null;
      payload.deaconName = isDeacon ? deaconName.trim() || null : null;
    }

    try {
      setIsLoading(true);
      const res = await api.patch(`/api/v1/accounts/${servant.id}`, payload);
      if (res.data?.success) {
        onSuccess(res.data.user);
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
        className="w-full max-w-[520px] bg-bg-surface border border-border-default rounded-card shadow-elevated p-6 text-right relative max-h-[90vh] overflow-y-auto"
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
            {isSupervisor ? 'تعديل ملف وتقييم الخادم' : 'تعديل البيانات الشخصية'}
          </h2>
          <p className="text-caption text-text-secondary mt-0.5">
            الخادم: <strong className="text-text-primary">{servant.fullName}</strong>
          </p>
        </div>

        {isSupervisor ? (
          <div className="mb-4 p-3 bg-status-info-soft border border-[#BFDEFF] rounded-lg flex items-start gap-2.5 text-right">
            <CheckCircle2 className="w-4 h-4 text-status-info shrink-0 mt-0.5" />
            <p className="text-caption text-status-info font-medium leading-relaxed">
              بصفتك مشرفاً، يمكنك تعديل البيانات الشخصية والخدمية بالإضافة إلى التقييم الإشرافي للخادم.
            </p>
          </div>
        ) : (
          <div className="mb-4 p-3 bg-brand-primary-soft border border-[#C5D5E8] rounded-lg flex items-start gap-2.5 text-right">
            <Lock className="w-4 h-4 text-brand-primary shrink-0 mt-0.5" />
            <p className="text-caption text-brand-primary font-medium leading-relaxed">
              يمكنك تحديث بياناتك الشخصية والتواصلية. التقييم الإشرافي مخصص للمشرفين فقط.
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
          {/* Supervisor Evaluation Section */}
          {isSupervisor && (
            <div className="p-4 bg-bg-muted/40 rounded-xl border border-border-default flex flex-col gap-3">
              <div className="flex items-center gap-2 pb-2 border-b border-border-default">
                <Shield className="w-4 h-4 text-brand-accent" />
                <span className="text-body-small font-bold text-brand-primary">التقييم الإشرافي للخادم</span>
              </div>

              <div>
                <label className="text-caption text-text-secondary font-semibold block mb-1">
                  الحالة المادية:
                </label>
                <input
                  type="text"
                  value={financialStatus}
                  onChange={(e) => setFinancialStatus(e.target.value)}
                  placeholder="مثال: ميسور، متوسط، يحتاج مساعدة..."
                  className="w-full h-10 px-3 rounded-input border border-border-default bg-bg-surface text-body-small focus:outline-none focus:ring-2 focus:ring-brand-primary"
                />
              </div>

              <div>
                <label className="text-caption text-text-secondary font-semibold block mb-1">
                  السلوك مع المخدومين:
                </label>
                <input
                  type="text"
                  value={behaviorWithMembers}
                  onChange={(e) => setBehaviorWithMembers(e.target.value)}
                  placeholder="ملاحظات حول طريقة تعامله واهتمامه بالمخدومين..."
                  className="w-full h-10 px-3 rounded-input border border-border-default bg-bg-surface text-body-small focus:outline-none focus:ring-2 focus:ring-brand-primary"
                />
              </div>

              <div>
                <label className="text-caption text-text-secondary font-semibold block mb-1">
                  السلوك مع الزملاء الخدام:
                </label>
                <input
                  type="text"
                  value={behaviorWithServants}
                  onChange={(e) => setBehaviorWithServants(e.target.value)}
                  placeholder="التعامل مع زملائه في الخدمة..."
                  className="w-full h-10 px-3 rounded-input border border-border-default bg-bg-surface text-body-small focus:outline-none focus:ring-2 focus:ring-brand-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-caption text-text-secondary font-semibold block mb-1">
                    التعاون والعمل الجماعي:
                  </label>
                  <input
                    type="text"
                    value={cooperation}
                    onChange={(e) => setCooperation(e.target.value)}
                    placeholder="روح التعاون..."
                    className="w-full h-10 px-3 rounded-input border border-border-default bg-bg-surface text-body-small focus:outline-none focus:ring-2 focus:ring-brand-primary"
                  />
                </div>
                <div>
                  <label className="text-caption text-text-secondary font-semibold block mb-1">
                    العمل الفردي والمبادرة:
                  </label>
                  <input
                    type="text"
                    value={individualInitiative}
                    onChange={(e) => setIndividualInitiative(e.target.value)}
                    placeholder="المبادرات والالتزام..."
                    className="w-full h-10 px-3 rounded-input border border-border-default bg-bg-surface text-body-small focus:outline-none focus:ring-2 focus:ring-brand-primary"
                  />
                </div>
              </div>

              <div>
                <label className="text-caption text-text-secondary font-semibold block mb-1">
                  ملاحظات إضافية:
                </label>
                <textarea
                  rows={2}
                  value={evaluationNotes}
                  onChange={(e) => setEvaluationNotes(e.target.value)}
                  placeholder="أي ملاحظات إشرافية إضافية..."
                  className="w-full p-2.5 rounded-input border border-border-default bg-bg-surface text-body-small focus:outline-none focus:ring-2 focus:ring-brand-primary resize-none"
                />
              </div>
            </div>
          )}

          {/* Personal Info */}
          <div className="flex flex-col gap-3">
            <span className="text-body-small font-bold text-text-primary">البيانات الشخصية والخدمية</span>

            {isSupervisor && (
              <Input
                label="الاسم بالكامل"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            )}

            <div className="grid grid-cols-2 gap-3">
              {isSupervisor ? (
                <Input
                  label="رقم الهاتف الأساسي"
                  placeholder="01xxxxxxxxx"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  required
                />
              ) : (
                <div>
                  <label className="text-caption text-text-secondary font-semibold block mb-1">رقم الهاتف:</label>
                  <div className="p-2.5 rounded-input bg-bg-muted border border-border-default text-body-small font-medium text-text-secondary">
                    {phoneNumber || '—'}
                  </div>
                </div>
              )}
              <Input
                label="رقم الواتساب"
                placeholder="01xxxxxxxxx"
                value={whatsappPhone}
                onChange={(e) => setWhatsappPhone(e.target.value)}
              />
            </div>

            {isSupervisor && (
              <Input
                type="email"
                label="البريد الإلكتروني"
                placeholder="example@mail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            )}

            <Input
              type="date"
              label="تاريخ الميلاد"
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
            />

            <FatherConfessorFields
              fatherConfessor={fatherConfessor}
              fatherConfessorChurch={fatherConfessorChurch}
              onChange={(fc, fcc) => {
                setFatherConfessor(fc);
                setFatherConfessorChurch(fcc);
              }}
            />

            <Input
              label="العنوان"
              placeholder="المنطقة / الشارع"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-caption text-text-secondary font-semibold block mb-1">الحالة الاجتماعية:</label>
                <select
                  value={maritalStatus}
                  onChange={(e) => setMaritalStatus(e.target.value)}
                  className="w-full h-11 px-3 rounded-input border border-border-default bg-bg-surface text-body-small focus:outline-none focus:ring-2 focus:ring-brand-primary"
                >
                  <option value="أعزب">أعزب</option>
                  <option value="متزوج">متزوج</option>
                  <option value="خاطب">خاطب</option>
                </select>
              </div>

              {maritalStatus === 'متزوج' ? (
                <Input
                  label="اسم الزوج/ة"
                  value={spouseName}
                  onChange={(e) => setSpouseName(e.target.value)}
                />
              ) : (
                <Input
                  label="المؤهل / العمل"
                  placeholder="مثال: مهندس برمجيات"
                  value={educationOrCareer}
                  onChange={(e) => setEducationOrCareer(e.target.value)}
                />
              )}
            </div>

            {maritalStatus === 'متزوج' && (
              <Input
                label="المؤهل / العمل"
                placeholder="مثال: مهندس برمجيات"
                value={educationOrCareer}
                onChange={(e) => setEducationOrCareer(e.target.value)}
              />
            )}

            {/* Deacon Status */}
            <div className="p-3 bg-bg-muted/40 rounded-xl border border-border-default flex flex-col gap-2.5">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isDeacon}
                  onChange={(e) => setIsDeacon(e.target.checked)}
                  className="w-4 h-4 rounded text-brand-primary border-border-default focus:ring-brand-primary"
                />
                <span className="text-body-small font-bold text-text-primary">شماس مرسوم</span>
              </label>

              {isDeacon && (
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div>
                    <label className="text-caption text-text-secondary font-semibold block mb-1">رتبة الشماسية:</label>
                    <select
                      value={deaconRank}
                      onChange={(e) => setDeaconRank(e.target.value)}
                      className="w-full h-10 px-2 rounded-input border border-border-default bg-bg-surface text-body-small focus:outline-none focus:ring-2 focus:ring-brand-primary"
                    >
                      <option value="">اختر الرتبة</option>
                      <option value="إبصالتس">إبصالتس (مرتل)</option>
                      <option value="أغنسطس">أغنسطس (قارئ)</option>
                      <option value="إيبودياكون">إيبودياكون (مساعد شماس)</option>
                      <option value="دياكون">دياكون (شماس كامل)</option>
                      <option value="أرشيدياكون">أرشيدياكون (رئيس شمامسة)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-caption text-text-secondary font-semibold block mb-1">اسم الرسامة:</label>
                    <input
                      type="text"
                      value={deaconName}
                      onChange={(e) => setDeaconName(e.target.value)}
                      placeholder="الاسم بالرسامة"
                      className="w-full h-10 px-3 rounded-input border border-border-default bg-bg-surface text-body-small focus:outline-none focus:ring-2 focus:ring-brand-primary"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Social Links */}
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="رابط فيسبوك"
                placeholder="https://facebook.com/..."
                value={facebookUrl}
                onChange={(e) => setFacebookUrl(e.target.value)}
              />
              <Input
                label="رابط إنستجرام"
                placeholder="https://instagram.com/..."
                value={instagramUrl}
                onChange={(e) => setInstagramUrl(e.target.value)}
              />
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center gap-3 mt-4 pt-3 border-t border-border-default">
            <Button
              type="submit"
              variant="primary"
              fullWidth
              isLoading={isLoading}
              className="h-11"
            >
              حفظ التعديلات
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="h-11 px-5"
            >
              إلغاء
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
