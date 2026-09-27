'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import {
  Bell,
  X,
  AlertTriangle,
  FileText,
  Calendar,
  Vote,
  Settings,
  Check,
  CheckCircle2,
  Smartphone,
  Mail,
  Send,
} from 'lucide-react';

export interface NotificationLogItem {
  id: string;
  type: string;
  channel: string;
  title: string;
  body: string;
  dataPayload?: any;
  isDelivered: boolean;
  sentAt: string;
}

export interface UserPreferences {
  enablePush: boolean;
  enableSms: boolean;
  enableEmail: boolean;
}

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({
  isOpen,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'notifications' | 'preferences'>('notifications');
  const [notifications, setNotifications] = useState<NotificationLogItem[]>([]);
  const [preferences, setPreferences] = useState<UserPreferences>({
    enablePush: true,
    enableSms: true,
    enableEmail: false,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isSavingPref, setIsSavingPref] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
      fetchPreferences();
    }
  }, [isOpen]);

  const fetchNotifications = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/api/v1/notifications/logs');
      if (res.data.success) {
        setNotifications(res.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPreferences = async () => {
    try {
      const res = await api.get('/api/v1/notifications/preferences');
      if (res.data.success) {
        setPreferences({
          enablePush: res.data.data.enablePush,
          enableSms: res.data.data.enableSms,
          enableEmail: res.data.data.enableEmail,
        });
      }
    } catch (err) {
      console.error('Failed to fetch notification preferences:', err);
    }
  };

  const handleUpdatePreferences = async (updated: Partial<UserPreferences>) => {
    setIsSavingPref(true);
    setSaveSuccess(false);
    const newPrefs = { ...preferences, ...updated };
    setPreferences(newPrefs);

    try {
      await api.put('/api/v1/notifications/preferences', newPrefs);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (err) {
      console.error('Failed to update notification preferences:', err);
    } finally {
      setIsSavingPref(false);
    }
  };

  if (!isOpen) return null;

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'ABSENCE_ALERT':
        return <AlertTriangle className="w-4 h-4 text-status-danger" />;
      case 'PREP_DEADLINE':
        return <Calendar className="w-4 h-4 text-status-warning" />;
      case 'POLL_CREATED':
        return <Vote className="w-4 h-4 text-brand-primary" />;
      default:
        return <FileText className="w-4 h-4 text-brand-accent" />;
    }
  };

  const formatTimestamp = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('ar-EG', {
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
    <div className="fixed inset-0 z-50 flex justify-end" dir="rtl">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Slide-over panel */}
      <div className="relative w-full max-w-md bg-bg-surface h-full shadow-2xl flex flex-col z-10 animate-in slide-in-from-left duration-300">
        {/* Header */}
        <div className="p-4 bg-brand-primary text-text-inverse flex items-center justify-between border-b border-white/10">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-brand-accent" />
            <h2 className="text-h2 font-bold">مركز الإشعارات والتنبيهات</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-button text-white/80 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-border-default bg-bg-app/50 p-1 gap-1">
          <button
            type="button"
            onClick={() => setActiveTab('notifications')}
            className={`flex-1 py-2 rounded-input text-caption font-semibold flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'notifications'
                ? 'bg-bg-surface text-brand-primary shadow-sm'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            <Bell className="w-4 h-4" />
            الإشعارات المستلمة ({notifications.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('preferences')}
            className={`flex-1 py-2 rounded-input text-caption font-semibold flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'preferences'
                ? 'bg-bg-surface text-brand-primary shadow-sm'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            <Settings className="w-4 h-4" />
            تفضيلات القنوات
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === 'notifications' ? (
            <div>
              {isLoading ? (
                <div className="py-12 text-center text-text-secondary text-body-small">
                  جارٍ تحميل الإشعارات...
                </div>
              ) : notifications.length === 0 ? (
                <div className="py-16 text-center text-text-secondary space-y-2">
                  <CheckCircle2 className="w-10 h-10 text-brand-primary/40 mx-auto" />
                  <p className="text-body-default font-semibold text-text-primary">
                    لا توجد تنبيهات جديدة
                  </p>
                  <p className="text-caption">
                    ستظهر هنا تنبيهات الغياب ومواعيد التحضير والإعلانات.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {notifications.map((item) => (
                    <div
                      key={item.id}
                      className="p-3.5 rounded-card border border-border-default bg-bg-surface shadow-card hover:border-brand-primary/30 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 rounded-full bg-bg-app shrink-0">
                            {getTypeIcon(item.type)}
                          </div>
                          <h4 className="text-body-default font-bold text-text-primary">
                            {item.title}
                          </h4>
                        </div>
                        <span className="text-caption text-text-secondary shrink-0">
                          {formatTimestamp(item.sentAt)}
                        </span>
                      </div>
                      <p className="text-body-small text-text-secondary leading-relaxed pr-8">
                        {item.body}
                      </p>
                      <div className="mt-2 pr-8 flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-bg-app text-text-secondary">
                          قناة: {item.channel}
                        </span>
                        {item.isDelivered && (
                          <span className="text-[11px] text-status-success font-medium flex items-center gap-1">
                            <Check className="w-3 h-3" /> تم الإرسال
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-6 py-2">
              <div>
                <h3 className="text-h2 font-bold text-text-primary mb-1">
                  إعدادات قنوات الإشعار (FR-11.4)
                </h3>
                <p className="text-body-small text-text-secondary">
                  حدد القنوات المسموح للمنظومة بإرسال التنبيهات الرسمية من خلالها.
                </p>
              </div>

              {saveSuccess && (
                <div className="p-3 rounded-input bg-status-success-soft text-status-success text-body-small font-medium flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>تم حفظ تفضيلات الإشعارات بنجاح</span>
                </div>
              )}

              <div className="space-y-3">
                {/* Web Push */}
                <div className="p-4 rounded-card border border-border-default bg-bg-surface flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-input bg-brand-primary-soft text-brand-primary">
                      <Send className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-body-default font-bold text-text-primary">
                        إشعارات المتصفح والموبايل (Push)
                      </p>
                      <p className="text-caption text-text-secondary">
                        تنبيهات فورية على الهاتف وشاشة القفل
                      </p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={preferences.enablePush}
                    onChange={(e) =>
                      handleUpdatePreferences({ enablePush: e.target.checked })
                    }
                    className="w-5 h-5 rounded text-brand-primary focus:ring-brand-primary cursor-pointer"
                  />
                </div>

                {/* SMS */}
                <div className="p-4 rounded-card border border-border-default bg-bg-surface flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-input bg-brand-accent-soft text-brand-accent">
                      <Smartphone className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-body-default font-bold text-text-primary">
                        الرسائل النصية القصيرة (SMS)
                      </p>
                      <p className="text-caption text-text-secondary">
                        تنبيهات الغياب العاجل والقرارات المصيرية
                      </p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={preferences.enableSms}
                    onChange={(e) =>
                      handleUpdatePreferences({ enableSms: e.target.checked })
                    }
                    className="w-5 h-5 rounded text-brand-primary focus:ring-brand-primary cursor-pointer"
                  />
                </div>

                {/* Email */}
                <div className="p-4 rounded-card border border-border-default bg-bg-surface flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-input bg-bg-app text-text-secondary">
                      <Mail className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-body-default font-bold text-text-primary">
                        البريد الإلكتروني (Email)
                      </p>
                      <p className="text-caption text-text-secondary">
                        تقارير الخدمة الأسبوعية وتدبير الخطة
                      </p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={preferences.enableEmail}
                    onChange={(e) =>
                      handleUpdatePreferences({ enableEmail: e.target.checked })
                    }
                    className="w-5 h-5 rounded text-brand-primary focus:ring-brand-primary cursor-pointer"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
