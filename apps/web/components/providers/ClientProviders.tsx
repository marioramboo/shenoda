'use client';

import React from 'react';
import { AuthProvider } from '@/context/AuthContext';
import { PushNotificationPrompt } from '@/components/notifications/PushNotificationPrompt';

export function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      {children}
      <PushNotificationPrompt />
    </AuthProvider>
  );
}

