'use client';

import React, { useEffect, useState } from 'react';
import { Bell, X, CheckCircle2, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { api } from '@/lib/api';

export async function requestPushPermission(): Promise<NotificationPermission | null> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return null;
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted' && 'serviceWorker' in navigator) {
      try {
        const reg = await navigator.serviceWorker.ready;
        reg.showNotification('نظام خدمة الأنبا شنودة 🎉', {
          body: 'تم تفعيل إشعارات الهاتف بنجاح! ستصلك تنبيهات التحضيرات والخدمة أولاً بأول.',
          icon: '/logo.jpg',
          badge: '/logo.jpg',
          vibrate: [200, 100, 200],
          tag: 'welcome-notification',
        } as any);

      } catch (err) {
        console.warn('Failed to show welcome notification:', err);
      }

      // Update backend preference
      try {
        await api.put('/api/v1/notifications/preferences', { enablePush: true });
      } catch (err) {
        console.warn('Failed to save push preference to backend:', err);
      }
    }
    return permission;
  } catch (err) {
    console.error('Error requesting notification permission:', err);
    return null;
  }
}

export const PushNotificationPrompt: React.FC = () => {
  const [showPrompt, setShowPrompt] = useState(false);
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [justGranted, setJustGranted] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Check service worker support & register sw.js
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          console.log('Shenoda Service Worker active:', reg.scope);
        })
        .catch((err) => {
          console.warn('Service Worker registration error:', err);
        });
    }

    // Check notification support & status
    if (!('Notification' in window)) return;

    if (Notification.permission === 'default') {
      const dismissedAt = localStorage.getItem('shenoda_push_prompt_dismissed');
      if (dismissedAt) {
        const diffHours = (Date.now() - Number(dismissedAt)) / (1000 * 60 * 60);
        if (diffHours < 24) {
          return; // Don't prompt again within 24 hours if dismissed
        }
      }
      // Small timeout to let initial page render smoothly
      const timer = setTimeout(() => {
        setShowPrompt(true);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleEnableNotifications = async () => {
    setIsSubscribing(true);
    try {
      const res = await requestPushPermission();
      if (res === 'granted') {
        setJustGranted(true);
        setTimeout(() => {
          setShowPrompt(false);
        }, 3000);
      } else {
        setShowPrompt(false);
      }
    } finally {
      setIsSubscribing(false);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem('shenoda_push_prompt_dismissed', Date.now().toString());
    setShowPrompt(false);
  };

  if (!showPrompt) return null;

  return (
    <aside
      role="region"
      aria-label="تفعيل إشعارات الخدمة"
      className="fixed bottom-4 inset-x-3 sm:inset-x-auto sm:right-4 sm:max-w-md z-50 animate-in slide-in-from-bottom duration-300"
      dir="rtl"
    >
      <div className="bg-bg-surface border-2 border-brand-primary/30 rounded-card p-4 shadow-elevated text-right flex flex-col gap-3 relative">
        <button
          type="button"
          onClick={handleDismiss}
          className="absolute top-3 left-3 text-text-secondary hover:text-text-primary p-1 rounded-pill hover:bg-bg-muted transition-colors"
          aria-label="إغلاق التنبيه"
        >
          <X className="w-4 h-4" />
        </button>

        {justGranted ? (
          <div className="flex items-center gap-3 text-status-success py-1">
            <CheckCircle2 className="w-6 h-6 shrink-0" />
            <div>
              <h4 className="text-body-small font-bold">تم تفعيل الإشعارات بنجاح!</h4>
              <p className="text-caption text-text-secondary">
                ستصلك تنبيهات تحضير الدروس والاجتماعات والتذكيرات اليومية على هاتفك.
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-brand-primary-soft text-brand-primary flex items-center justify-center shrink-0 mt-0.5">
                <Bell className="w-5 h-5 animate-pulse" />
              </div>
              <div className="min-w-0 pr-1">
                <h4 className="text-body-small font-bold text-text-primary flex items-center gap-1.5">
                  <span>تفعيل إشعارات الخدمة والتحضيرات</span>
                  <Smartphone className="w-4 h-4 text-brand-primary" />
                </h4>
                <p className="text-caption text-text-secondary mt-1 leading-relaxed">
                  اسمح للموقع بإرسال إشعارات لتصلك تنبيهات تحضير الدروس والاجتماعات والتذكيرات اليومية أولاً بأول حتى تسليم التحضير.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1 border-t border-border-default/60">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleDismiss}
                className="text-caption text-text-secondary h-8 px-3"
              >
                لاحقاً
              </Button>

              <Button
                type="button"
                size="sm"
                onClick={handleEnableNotifications}
                disabled={isSubscribing}
                className="text-caption font-bold h-8 px-4 bg-brand-primary hover:bg-brand-primary/90 text-text-inverse flex items-center gap-1.5 shadow-sm"
              >
                <Bell className="w-3.5 h-3.5" />
                <span>{isSubscribing ? 'جاري التفعيل...' : 'السماح بالإشعارات الآن'}</span>
              </Button>
            </div>
          </>
        )}
      </div>
    </aside>
  );
};
