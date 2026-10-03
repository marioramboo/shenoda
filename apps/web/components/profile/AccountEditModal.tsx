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
  Sparkles,
  Camera,
  Users,
  Award,
  Share2,
  Plus,
  Trash2,
  Info,
} from 'lucide-react';

interface AccountEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: AuthUser;
  onSuccess: (updatedUser: AuthUser) => void;
}

const TALENT_PRESETS = [
  'ألحان وترتيل',
  'شعر وكتابة',
  'تمثيل وإلقاء',
  'تكنولوجيا وبرمجة وميديا',
  'كرة قدم ورياضة',
];

const ACTIVITY_PRESETS = [
  'كورال',
  'مسرح',
  'كشافة',
  'كورة',
];

const DEACON_RANKS = [
  'إبصالتس (مرتل)',
  'أغنسطس (قارئ)',
  'إيبودياكون (مساعد شماس)',
  'دياكون (شماس كامل)',
  'أرشيدياكون (رئيس شمامسة)',
];

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
  const [activeTab, setActiveTab] = useState<'basic' | 'family' | 'talents' | 'security'>('basic');

  // Basic Info
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [whatsappPhone, setWhatsappPhone] = useState('');
  const [facebookUrl, setFacebookUrl] = useState('');
  const [instagramUrl, setInstagramUrl] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [address, setAddress] = useState('');
  const [fatherConfessor, setFatherConfessor] = useState('');
  const [educationOrCareer, setEducationOrCareer] = useState('');
  const [profilePicture, setProfilePicture] = useState('');

  // Family & Marital Status
  const [maritalStatus, setMaritalStatus] = useState('أعزب');
  const [spouseName, setSpouseName] = useState('');
  const [siblings, setSiblings] = useState<Array<{ name: string; age: string }>>([]);

  // Deacon & Talents & Activities
  const [isDeacon, setIsDeacon] = useState(false);
  const [deaconName, setDeaconName] = useState('');
  const [deaconRank, setDeaconRank] = useState('إبصالتس (مرتل)');
  const [talents, setTalents] = useState<string[]>([]);
  const [activities, setActivities] = useState<string[]>([]);

  // Password change
  const [changePassword, setChangePassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Check if caller can edit marital status (Level 3+ : Stage Secretary, Sector Secretary, General Secretary)
  const canEditMaritalStatus = (user?.role?.level ?? 1) >= 3;

  useEffect(() => {
    if (user && isOpen) {
      setFullName(user.fullName || '');
      setPhoneNumber(user.phoneNumber || '');
      setEmail(user.email || '');
      setWhatsappPhone(user.whatsappPhoneRaw || (user.whatsappPhone !== user.phoneNumber ? user.whatsappPhone || '' : ''));
      setFacebookUrl(user.facebookUrl || '');
      setInstagramUrl(user.instagramUrl || '');
      setDateOfBirth(formatDobForInput(user.dateOfBirth));
      setAddress(user.address || '');
      setFatherConfessor(user.fatherConfessor || '');
      setEducationOrCareer(user.educationOrCareer || '');
      setProfilePicture(user.profilePicture || '');

      setMaritalStatus(user.maritalStatus || 'أعزب');
      setSpouseName(user.spouseName || '');

      const initialSiblings = Array.isArray(user.siblingsInfo)
        ? user.siblingsInfo.map((s: any) => ({
            name: s.name || '',
            age: s.age !== undefined && s.age !== null ? String(s.age) : '',
          }))
        : [];
      setSiblings(initialSiblings);

      setIsDeacon(Boolean(user.isDeacon));
      setDeaconName(user.deaconName || '');
      setDeaconRank(user.deaconRank || 'إبصالتس (مرتل)');

      setTalents(Array.isArray(user.talents) ? user.talents : []);
      setActivities(Array.isArray(user.activities) ? user.activities : []);

      setChangePassword(false);
      setCurrentPassword('');
      setNewPassword('');
      setErrorMsg(null);
      setSuccessMsg(null);
    }
  }, [user, isOpen]);

  if (!isOpen) return null;

  const handleToggleTalent = (t: string) => {
    if (talents.includes(t)) {
      setTalents(talents.filter((item) => item !== t));
    } else {
      setTalents([...talents, t]);
    }
  };

  const handleToggleActivity = (a: string) => {
    if (activities.includes(a)) {
      setActivities(activities.filter((item) => item !== a));
    } else {
      setActivities([...activities, a]);
    }
  };

  const handleAddSibling = () => {
    setSiblings([...siblings, { name: '', age: '' }]);
  };

  const handleUpdateSibling = (index: number, field: 'name' | 'age', val: string) => {
    const updated = [...siblings];
    updated[index][field] = val;
    setSiblings(updated);
  };

  const handleRemoveSibling = (index: number) => {
    setSiblings(siblings.filter((_, idx) => idx !== index));
  };

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setErrorMsg('حجم الصورة يجب ألا يتجاوز 2 ميجابايت');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePicture(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

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
      whatsappPhone: whatsappPhone.trim() || null,
      facebookUrl: facebookUrl.trim() || null,
      instagramUrl: instagramUrl.trim() || null,
      dateOfBirth: dateOfBirth || null,
      address: address.trim() || null,
      fatherConfessor: fatherConfessor.trim() || null,
      educationOrCareer: educationOrCareer.trim() || null,
      profilePicture: profilePicture || null,

      // Talents, Activities & Deacon
      talents,
      activities,
      isDeacon,
      deaconName: isDeacon ? (deaconName.trim() || null) : null,
      deaconRank: isDeacon ? (deaconRank || null) : null,

      // Siblings
      siblingsInfo: siblings
        .filter((s) => s.name.trim().length > 0)
        .map((s) => ({
          name: s.name.trim(),
          age: s.age ? Number(s.age) || s.age : null,
        })),
    };

    // Only include marital status if authorized
    if (canEditMaritalStatus) {
      payload.maritalStatus = maritalStatus || null;
      payload.spouseName = maritalStatus === 'متزوج' ? (spouseName.trim() || null) : null;
    }

    if (changePassword && currentPassword && newPassword) {
      payload.currentPassword = currentPassword;
      payload.newPassword = newPassword;
    }

    try {
      setIsLoading(true);
      const res = await api.patch('/api/v1/auth/profile', payload);

      if (res.data?.success && res.data?.user) {
        setSuccessMsg('تم تحديث بيانات حسابك بنجاح!');
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
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div
        dir="rtl"
        className="w-full max-w-[620px] bg-bg-surface border border-border-default rounded-card shadow-elevated p-5 sm:p-6 text-right relative max-h-[92vh] flex flex-col"
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 left-4 text-text-secondary hover:text-text-primary p-1.5 rounded-button hover:bg-bg-muted"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="mb-3 shrink-0">
          <h2 className="text-h2 font-bold text-brand-primary flex items-center gap-2">
            <User className="w-5 h-5" />
            <span>تعديل بيانات الخادم الشخصية</span>
          </h2>
          <p className="text-caption text-text-secondary mt-0.5">
            تحديث البيانات الشخصية، الكنسية، التواصل والمواهب في الخدمة
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1.5 p-1 bg-bg-muted rounded-lg mb-4 shrink-0 overflow-x-auto text-caption font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('basic')}
            className={`flex-1 py-1.5 px-2.5 rounded-md transition-all flex items-center justify-center gap-1.5 whitespace-nowrap ${
              activeTab === 'basic'
                ? 'bg-bg-surface text-brand-primary shadow-xs font-bold'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            <User className="w-4 h-4" />
            <span>البيانات والتواصل</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('family')}
            className={`flex-1 py-1.5 px-2.5 rounded-md transition-all flex items-center justify-center gap-1.5 whitespace-nowrap ${
              activeTab === 'family'
                ? 'bg-bg-surface text-brand-primary shadow-xs font-bold'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            <Heart className="w-4 h-4" />
            <span>الحالة والأسرة</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('talents')}
            className={`flex-1 py-1.5 px-2.5 rounded-md transition-all flex items-center justify-center gap-1.5 whitespace-nowrap ${
              activeTab === 'talents'
                ? 'bg-bg-surface text-brand-primary shadow-xs font-bold'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>الشموسية والمواهب</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('security')}
            className={`flex-1 py-1.5 px-2.5 rounded-md transition-all flex items-center justify-center gap-1.5 whitespace-nowrap ${
              activeTab === 'security'
                ? 'bg-bg-surface text-brand-primary shadow-xs font-bold'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            <Lock className="w-4 h-4" />
            <span>الأمان</span>
          </button>
        </div>

        {errorMsg && (
          <div className="mb-3 p-3 bg-status-danger-soft border border-[#F5C2BE] rounded-lg flex items-start gap-2 text-right shrink-0">
            <AlertCircle className="w-4 h-4 text-status-danger shrink-0 mt-0.5" />
            <p className="text-caption text-status-danger font-medium">{errorMsg}</p>
          </div>
        )}

        {successMsg && (
          <div className="mb-3 p-3 bg-status-success-soft border border-[#BCE2C9] rounded-lg flex items-start gap-2 text-right shrink-0">
            <CheckCircle2 className="w-4 h-4 text-status-success shrink-0 mt-0.5" />
            <p className="text-caption text-status-success font-medium">{successMsg}</p>
          </div>
        )}

        {/* Scrollable Form Content */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-y-auto pr-1 pl-1">
          {/* TAB 1: BASIC & CONTACT */}
          {activeTab === 'basic' && (
            <div className="flex flex-col gap-3">
              {/* Profile Picture Upload & Preview */}
              <div className="flex items-center gap-4 p-3 bg-bg-muted rounded-card border border-border-default">
                <div className="relative w-16 h-16 rounded-full overflow-hidden bg-bg-surface border-2 border-brand-primary flex items-center justify-center shrink-0">
                  {profilePicture ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={profilePicture}
                      alt="الصورة الشخصية"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="w-8 h-8 text-brand-primary" />
                  )}
                </div>
                <div className="flex-1 flex flex-col gap-1.5">
                  <label className="text-caption font-semibold text-text-primary">
                    صورة الخادم الشخصية
                  </label>
                  <div className="flex items-center gap-2">
                    <label className="cursor-pointer px-3 py-1.5 bg-brand-primary text-white text-caption font-medium rounded-button hover:bg-brand-primary-light transition-colors flex items-center gap-1.5">
                      <Camera className="w-3.5 h-3.5" />
                      <span>اختيار صورة</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageFileChange}
                        className="hidden"
                      />
                    </label>
                    {profilePicture && (
                      <button
                        type="button"
                        onClick={() => setProfilePicture('')}
                        className="text-status-danger text-caption hover:underline"
                      >
                        حذف الصورة
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Full Name */}
              <Input
                label="الاسم بالكامل"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                iconLeading={<User className="w-4 h-4" />}
              />

              {/* Primary Phone & WhatsApp Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label="رقم الهاتف الأساسي (تسجيل الدخول)"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  required
                  placeholder="01xxxxxxxxx"
                  iconLeading={<Phone className="w-4 h-4" />}
                />
                <div>
                  <Input
                    label="رقم الواتساب (WhatsApp)"
                    value={whatsappPhone}
                    onChange={(e) => setWhatsappPhone(e.target.value)}
                    placeholder="افتراضياً: نفس رقم الهاتف"
                    iconLeading={<Phone className="w-4 h-4 text-[#25D366]" />}
                  />
                  <p className="text-[11px] text-text-secondary mt-1">
                    اتركه فارغاً إذا كان مطابقاً للرقم الأساسي
                  </p>
                </div>
              </div>

              {/* Email */}
              <Input
                type="email"
                label="البريد الإلكتروني"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@domain.com"
                iconLeading={<Mail className="w-4 h-4" />}
              />

              {/* Social Media Links */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label="رابط فيسبوك (Facebook)"
                  value={facebookUrl}
                  onChange={(e) => setFacebookUrl(e.target.value)}
                  placeholder="https://facebook.com/username"
                  iconLeading={<Share2 className="w-4 h-4 text-[#1877F2]" />}
                />
                <Input
                  label="رابط انستجرام (Instagram)"
                  value={instagramUrl}
                  onChange={(e) => setInstagramUrl(e.target.value)}
                  placeholder="https://instagram.com/username"
                  iconLeading={<Share2 className="w-4 h-4 text-[#E4405F]" />}
                />
              </div>

              {/* Date of Birth & Father Confessor */}
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
            </div>
          )}

          {/* TAB 2: MARITAL STATUS & SIBLINGS */}
          {activeTab === 'family' && (
            <div className="flex flex-col gap-4">
              {/* Marital Status Section */}
              <div className="p-3.5 bg-bg-muted rounded-card border border-border-default flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-text-primary font-bold text-body-default">
                    <Heart className="w-4 h-4 text-brand-primary" />
                    <span>الحالة الاجتماعية</span>
                  </div>
                  {!canEditMaritalStatus && (
                    <span className="px-2 py-0.5 bg-[#FFF4E5] text-[#B76E00] text-[11px] font-semibold rounded-pill border border-[#FFE1B5] flex items-center gap-1">
                      <Info className="w-3 h-3" />
                      تعديلها مقتصر على أمين الخدمة فما فوق
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5 text-right">
                    <label className="text-body-small font-medium text-text-primary">
                      الحالة
                    </label>
                    <select
                      value={maritalStatus}
                      onChange={(e) => setMaritalStatus(e.target.value)}
                      disabled={!canEditMaritalStatus}
                      className={`w-full h-[46px] bg-bg-surface text-text-primary font-cairo text-body-default rounded-input border border-border-default px-3 focus:outline-none focus:ring-2 focus:ring-brand-primary ${
                        !canEditMaritalStatus ? 'opacity-70 cursor-not-allowed bg-bg-muted' : ''
                      }`}
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
                      disabled={!canEditMaritalStatus}
                      placeholder="اسم شريك الحياة"
                      iconLeading={<Heart className="w-4 h-4" />}
                    />
                  )}
                </div>
              </div>

              {/* Siblings Section */}
              <div className="p-3.5 bg-bg-muted rounded-card border border-border-default flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-text-primary font-bold text-body-default">
                    <Users className="w-4 h-4 text-brand-primary" />
                    <span>بيانات الأخوة والأخوات وأعمارهم</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddSibling}
                    className="text-caption text-brand-primary hover:underline font-bold flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>إضافة أخ / أخت</span>
                  </button>
                </div>

                {siblings.length === 0 ? (
                  <p className="text-caption text-text-secondary py-2 text-center">
                    لم تتم إضافة أخوة بعد. اضغط على &quot;إضافة أخ / أخت&quot; لإدخال الأسماء والأعمار.
                  </p>
                ) : (
                  <div className="flex flex-col gap-2.5">
                    {siblings.map((sib, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-2 p-2 bg-bg-surface rounded-md border border-border-default"
                      >
                        <input
                          type="text"
                          placeholder="اسم الأخ / الأخت"
                          value={sib.name}
                          onChange={(e) => handleUpdateSibling(index, 'name', e.target.value)}
                          className="flex-1 h-[38px] bg-transparent text-text-primary text-body-small px-2 border-b border-border-default focus:border-brand-primary focus:outline-none"
                        />
                        <input
                          type="number"
                          placeholder="السن"
                          value={sib.age}
                          onChange={(e) => handleUpdateSibling(index, 'age', e.target.value)}
                          className="w-20 h-[38px] bg-transparent text-text-primary text-body-small px-2 border-b border-border-default focus:border-brand-primary focus:outline-none text-center"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveSibling(index)}
                          className="p-1.5 text-text-secondary hover:text-status-danger rounded hover:bg-bg-muted"
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
          )}

          {/* TAB 3: DEACON, TALENTS & ACTIVITIES */}
          {activeTab === 'talents' && (
            <div className="flex flex-col gap-4">
              {/* Deacon Section */}
              <div className="p-3.5 bg-bg-muted rounded-card border border-border-default flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Award className="w-4 h-4 text-brand-primary" />
                    <span className="font-bold text-text-primary text-body-default">
                      الرتبة الشماسية
                    </span>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer text-body-small font-semibold">
                    <input
                      type="checkbox"
                      checked={isDeacon}
                      onChange={(e) => setIsDeacon(e.target.checked)}
                      className="w-4 h-4 rounded text-brand-primary focus:ring-brand-primary"
                    />
                    <span>شماس مُرسم</span>
                  </label>
                </div>

                {isDeacon && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-border-default">
                    <Input
                      label="اسم الشماس في الرسامة"
                      value={deaconName}
                      onChange={(e) => setDeaconName(e.target.value)}
                      placeholder="مثال: الشماس بطرس / ميخائيل"
                    />

                    <div className="flex flex-col gap-1.5 text-right">
                      <label className="text-body-small font-medium text-text-primary">
                        رتبة الشماسية
                      </label>
                      <select
                        value={deaconRank}
                        onChange={(e) => setDeaconRank(e.target.value)}
                        className="w-full h-[46px] bg-bg-surface text-text-primary font-cairo text-body-default rounded-input border border-border-default px-3 focus:outline-none focus:ring-2 focus:ring-brand-primary"
                      >
                        {DEACON_RANKS.map((rank) => (
                          <option key={rank} value={rank}>
                            {rank}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </div>

              {/* Church Activities Section */}
              <div className="p-3.5 bg-bg-muted rounded-card border border-border-default flex flex-col gap-2.5">
                <span className="font-bold text-text-primary text-body-default">
                  الأنشطة الكنسية المشترك بها
                </span>
                <p className="text-caption text-text-secondary">
                  حدد الأنشطة التي يشارك فيها الخادم في الكنيسة:
                </p>
                <div className="flex flex-wrap gap-2 pt-1">
                  {ACTIVITY_PRESETS.map((act) => {
                    const isSelected = activities.includes(act);
                    return (
                      <button
                        key={act}
                        type="button"
                        onClick={() => handleToggleActivity(act)}
                        className={`px-3 py-1.5 rounded-pill text-caption font-semibold transition-all border ${
                          isSelected
                            ? 'bg-brand-primary text-white border-brand-primary shadow-xs'
                            : 'bg-bg-surface text-text-secondary border-border-default hover:bg-bg-muted'
                        }`}
                      >
                        {act} {isSelected ? '✓' : '+'}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Talents Section */}
              <div className="p-3.5 bg-bg-muted rounded-card border border-border-default flex flex-col gap-2.5">
                <span className="font-bold text-text-primary text-body-default">
                  المواهب والمهارات (Talents)
                </span>
                <p className="text-caption text-text-secondary">
                  حدد مجالات الإبداع والمواهب التي يمتلكها الخادم:
                </p>
                <div className="flex flex-wrap gap-2 pt-1">
                  {TALENT_PRESETS.map((talent) => {
                    const isSelected = talents.includes(talent);
                    return (
                      <button
                        key={talent}
                        type="button"
                        onClick={() => handleToggleTalent(talent)}
                        className={`px-3 py-1.5 rounded-pill text-caption font-semibold transition-all border ${
                          isSelected
                            ? 'bg-brand-accent text-white border-brand-accent shadow-xs'
                            : 'bg-bg-surface text-text-secondary border-border-default hover:bg-bg-muted'
                        }`}
                      >
                        {talent} {isSelected ? '★' : '+'}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: SECURITY */}
          {activeTab === 'security' && (
            <div className="flex flex-col gap-4">
              <div className="p-3.5 bg-bg-muted rounded-card border border-border-default flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-brand-primary" />
                  <span className="font-bold text-text-primary text-body-default">
                    تغيير كلمة المرور
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setChangePassword(!changePassword)}
                  className="flex items-center gap-2 text-body-small font-bold text-brand-primary hover:underline text-right"
                >
                  <KeyRound className="w-4 h-4" />
                  <span>{changePassword ? 'إلغاء تغيير كلمة المرور' : 'تريد تغيير كلمة المرور؟'}</span>
                </button>

                {changePassword && (
                  <div className="mt-2 p-3 bg-bg-surface rounded-lg border border-border-default flex flex-col gap-3">
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
            </div>
          )}

          {/* Footer Action Buttons */}
          <div className="flex items-center gap-2 mt-4 pt-3 border-t border-border-default shrink-0">
            <Button
              type="submit"
              variant="primary"
              fullWidth
              isLoading={isLoading}
              className="h-[46px] font-bold"
            >
              حفظ كافة التعديلات
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
