'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { AuthUser } from '@/context/AuthContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import {
  X,
  User,
  Phone,
  Mail,
  Calendar,
  MapPin,
  Lock,
  Heart,
  Briefcase,
  AlertCircle,
  CheckCircle2,
  KeyRound,
} from 'lucide-react';

interface AccountEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: AuthUser;
  onSuccess: (updatedUser: AuthUser) => void;
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

export const AccountEditModal: React.FC<AccountEditModalProps> = ({
  isOpen,
  onClose,
  user,
  onSuccess,
}) => {
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [address, setAddress] = useState('');
  const [fatherConfessor, setFatherConfessor] = useState('');
  const [educationOrCareer, setEducationOrCareer] = useState('');
  const [maritalStatus, setMaritalStatus] = useState('أعزب');
  const [spouseName, setSpouseName] = useState('');

  // Password change toggle & fields
  const [changePassword, setChangePassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (user && isOpen) {
      setFullName(user.fullName || '');
      setPhoneNumber(user.phoneNumber || '');
      setEmail(user.email || '');
      setDateOfBirth(formatDobForInput(user.dateOfBirth));
      setAddress(user.address || '');
      setFatherConfessor(user.fatherConfessor || '');
      setEducationOrCareer(user.educationOrCareer || '');
      setMaritalStatus(user.maritalStatus || 'أعزب');
      setSpouseName(user.spouseName || '');
      setChangePassword(false);
      setCurrentPassword('');
      setNewPassword('');
      setErrorMsg(null);
      setSuccessMsg(null);
    }
  }, [user, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (changePassword) {
      if (!currentPassword) {
        setErrorMsg('يرجى إدخال كلمة المرور الحالية لتتمكن من تعيين كلمة مرور جديدة');
        return;
      }
      if (newPassword.length < 8) {
        setErrorMsg('كلمة المرور الجديدة يجب ألا تقل عن 8 أحرف');
        return;
      }
    }

    const payload: any = {
      fullName,
      phoneNumber,
      email: email.trim() || null,
      dateOfBirth: dateOfBirth || null,
      address: address.trim() || null,
      fatherConfessor: fatherConfessor.trim() || null,
      educationOrCareer: educationOrCareer.trim() || null,
      maritalStatus: maritalStatus || null,
      spouseName: maritalStatus === 'متزوج' ? (spouseName.trim() || null) : null,
    };

    if (changePassword && currentPassword && newPassword) {
      payload.currentPassword = currentPassword;
      payload.newPassword = newPassword;
    }

    try {
      setIsLoading(true);
      const res = await api.patch('/api/v1/auth/profile', payload);

      if (res.data?.success && res.data?.user) {
        setSuccessMsg('تم تحديث بيانات حسابك الشخصي بنجاح!');
        onSuccess(res.data.user);
        setTimeout(() => {
          onClose();
        }, 800);
      } else {
        setErrorMsg(res.data?.message || 'حدث خطأ أثناء حفظ التعديلات');
      }
    } catch (err: any) {
      setErrorMsg(
        err.response?.data?.error?.message ||
        'حدث خطأ غير متوقع أثناء تحديث البيانات. يرجى التأكد من صحة المدخلات.'
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
          <h2 className="text-h2 font-bold text-brand-primary flex items-center gap-2">
            <User className="w-5 h-5" />
            <span>تعديل بيانات الحساب الشخصي</span>
          </h2>
          <p className="text-caption text-text-secondary mt-0.5">
            تحديث البيانات الشخصية ومعلومات التواصل الخاصة بك في الخدمة
          </p>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 bg-status-danger-soft border border-[#F5C2BE] rounded-lg flex items-start gap-2 text-right">
            <AlertCircle className="w-4 h-4 text-status-danger shrink-0 mt-0.5" />
            <p className="text-caption text-status-danger font-medium">{errorMsg}</p>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3 bg-status-success-soft border border-[#BCE2C9] rounded-lg flex items-start gap-2 text-right">
            <CheckCircle2 className="w-4 h-4 text-status-success shrink-0 mt-0.5" />
            <p className="text-caption text-status-success font-medium">{successMsg}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
          {/* Full Name */}
          <Input
            label="الاسم بالكامل"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            iconLeading={<User className="w-4 h-4" />}
          />

          {/* Phone and Email */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="رقم الهاتف"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              required
              placeholder="01xxxxxxxxx"
              iconLeading={<Phone className="w-4 h-4" />}
            />
            <Input
              type="email"
              label="البريد الإلكتروني"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@domain.com"
              iconLeading={<Mail className="w-4 h-4" />}
            />
          </div>

          {/* Date of Birth and Father Confessor */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              type="date"
              label="تاريخ الميلاد"
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
              iconLeading={<Calendar className="w-4 h-4" />}
            />
            <Input
              label="أب الاعتراف"
              value={fatherConfessor}
              onChange={(e) => setFatherConfessor(e.target.value)}
              placeholder="مثال: القمص متى المسكين"
            />
          </div>

          {/* Address */}
          <Input
            label="العنوان"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="الشارع، المنطقة، المدينة"
            iconLeading={<MapPin className="w-4 h-4" />}
          />

          {/* Education / Career */}
          <Input
            label="المؤهل الدراسي / الوظيفة"
            value={educationOrCareer}
            onChange={(e) => setEducationOrCareer(e.target.value)}
            placeholder="مثال: مهندس برمجيات / بكالوريوس تجارة"
            iconLeading={<Briefcase className="w-4 h-4" />}
          />

          {/* Marital Status & Spouse */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5 text-right">
              <label className="text-body-small font-medium text-text-primary">
                الحالة الاجتماعية
              </label>
              <select
                value={maritalStatus}
                onChange={(e) => setMaritalStatus(e.target.value)}
                className="w-full h-[46px] bg-bg-surface text-text-primary font-cairo text-body-default rounded-input border border-border-default px-3 focus:outline-none focus:ring-2 focus:ring-brand-primary"
              >
                <option value="أعزب">أعزب</option>
                <option value="خاطب">خاطب</option>
                <option value="متزوج">متزوج</option>
                <option value="أرمل">أرمل</option>
              </select>
            </div>

            {maritalStatus === 'متزوج' && (
              <Input
                label="اسم الزوج / الزوجة"
                value={spouseName}
                onChange={(e) => setSpouseName(e.target.value)}
                placeholder="اسم شريك الحياة"
                iconLeading={<Heart className="w-4 h-4" />}
              />
            )}
          </div>

          {/* Password Change Toggle */}
          <div className="pt-2 border-t border-border-default">
            <button
              type="button"
              onClick={() => setChangePassword(!changePassword)}
              className="flex items-center gap-2 text-body-small font-bold text-brand-primary hover:underline"
            >
              <KeyRound className="w-4 h-4" />
              <span>{changePassword ? 'إلغاء تغيير كلمة المرور' : 'تريد تغيير كلمة المرور؟'}</span>
            </button>

            {changePassword && (
              <div className="mt-3 p-3.5 bg-bg-muted/70 rounded-lg border border-border-default flex flex-col gap-3">
                <Input
                  type="password"
                  label="كلمة المرور الحالية"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="أدخل كلمة المرور الحالية للتحقق"
                  iconLeading={<Lock className="w-4 h-4" />}
                  required={changePassword}
                />
                <Input
                  type="password"
                  label="كلمة المرور الجديدة"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="8 أحرف على الأقل"
                  iconLeading={<KeyRound className="w-4 h-4" />}
                  required={changePassword}
                />
              </div>
            )}
          </div>

          {/* Action Buttons */}
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
