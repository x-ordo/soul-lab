/**
 * Push Notification System
 *
 * Handles:
 * - Service worker registration
 * - Push subscription management
 * - D+1 reminder notifications
 */

import { getEffectiveUserKey } from './storage';
import { track } from './analytics';

// ============================================
// Constants
// ============================================

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string;
const API_BASE = import.meta.env.VITE_API_BASE || '';

// Storage keys
const K_PUSH_SUBSCRIPTION = 'sl_push_subscription';
const K_PUSH_PERMISSION = 'sl_push_permission';

// ============================================
// Service Worker Registration
// ============================================

let swRegistration: ServiceWorkerRegistration | null = null;

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) {
    console.warn('[push] Service Worker not supported');
    return null;
  }

  try {
    swRegistration = await navigator.serviceWorker.register('/sw.js');
    console.log('[push] Service Worker registered');
    return swRegistration;
  } catch (error) {
    console.error('[push] Service Worker registration failed:', error);
    return null;
  }
}

// ============================================
// Push Subscription
// ============================================

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray.buffer as ArrayBuffer;
}

export async function subscribeToPush(): Promise<PushSubscription | null> {
  if (!swRegistration) {
    swRegistration = await registerServiceWorker();
    if (!swRegistration) return null;
  }

  if (!VAPID_PUBLIC_KEY) {
    console.warn('[push] VAPID public key not configured');
    return null;
  }

  try {
    // Request permission
    const permission = await Notification.requestPermission();
    localStorage.setItem(K_PUSH_PERMISSION, permission);

    if (permission !== 'granted') {
      track('push_permission_denied');
      return null;
    }

    track('push_permission_granted');

    // Get push subscription
    let subscription = await swRegistration.pushManager.getSubscription();

    if (!subscription) {
      subscription = await swRegistration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
    }

    // Save to server
    await saveSubscriptionToServer(subscription);

    // Cache locally
    localStorage.setItem(K_PUSH_SUBSCRIPTION, JSON.stringify(subscription.toJSON()));

    track('push_subscribed');
    return subscription;
  } catch (error) {
    console.error('[push] Subscription failed:', error);
    track('push_subscription_error', { error: String(error) });
    return null;
  }
}

async function saveSubscriptionToServer(subscription: PushSubscription): Promise<void> {
  const userKey = getEffectiveUserKey();

  try {
    const response = await fetch(`${API_BASE}/api/push/subscribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userKey,
        subscription: subscription.toJSON(),
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
  } catch (error) {
    console.error('[push] Failed to save subscription:', error);
    // Don't throw - subscription still works locally
  }
}

export async function unsubscribeFromPush(): Promise<boolean> {
  if (!swRegistration) {
    swRegistration = await registerServiceWorker();
    if (!swRegistration) return false;
  }

  try {
    const subscription = await swRegistration.pushManager.getSubscription();
    if (subscription) {
      await subscription.unsubscribe();
      localStorage.removeItem(K_PUSH_SUBSCRIPTION);
      track('push_unsubscribed');
      return true;
    }
    return false;
  } catch (error) {
    console.error('[push] Unsubscribe failed:', error);
    return false;
  }
}

// ============================================
// Permission Status
// ============================================

export function getPushPermission(): NotificationPermission | null {
  if (!('Notification' in window)) return null;
  return Notification.permission;
}

export function isPushSupported(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window;
}

export function isPushSubscribed(): boolean {
  return !!localStorage.getItem(K_PUSH_SUBSCRIPTION);
}

// ============================================
// Notification Types
// ============================================

export type NotificationType = 'd1_reminder' | 'streak_reminder' | 'chemistry_result' | 'special';

export interface NotificationPayload {
  type: NotificationType;
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  data?: Record<string, unknown>;
  actions?: { action: string; title: string }[];
}

// D+1 reminder content
export const D1_REMINDER_CONTENT: NotificationPayload = {
  type: 'd1_reminder',
  title: '오늘의 운명이 도착했어요 ✨',
  body: '어제와는 다른 별의 메시지가 기다리고 있습니다.',
  icon: '/icon-192.svg',
  badge: '/badge-72.svg',
  data: { url: '/' },
  actions: [
    { action: 'open', title: '운세 확인하기' },
    { action: 'dismiss', title: '나중에' },
  ],
};

// Streak reminder content
export const STREAK_REMINDER_CONTENT: NotificationPayload = {
  type: 'streak_reminder',
  title: '연속 방문 기록을 유지하세요! 🔥',
  body: '오늘 방문하면 연속 방문 보너스를 받을 수 있어요.',
  icon: '/icon-192.svg',
  badge: '/badge-72.svg',
  data: { url: '/' },
  actions: [
    { action: 'open', title: '지금 확인하기' },
  ],
};
