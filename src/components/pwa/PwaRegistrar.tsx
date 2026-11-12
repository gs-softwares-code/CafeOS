'use client';

import { useEffect } from 'react';

export function PwaRegistrar() {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
  }, []);

  return null;
}

export async function showPwaNotification(title: string, body: string, url = '/account') {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    if (reg) {
      await reg.showNotification(title, {
        body,
        icon: '/images/menu/cappuccino.jpg',
        badge: '/images/menu/cappuccino.jpg',
        data: { url },
      });
      return;
    }
  } catch {
    // Fallback to Notification constructor below
  }

  new Notification(title, { body, icon: '/images/menu/cappuccino.jpg' });
}

