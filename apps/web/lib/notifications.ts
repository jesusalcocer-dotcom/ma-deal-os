/**
 * Push Notification Utilities
 * Infrastructure for approval notifications.
 */

export interface NotificationPayload {
  title: string;
  body: string;
  tag?: string;
  url?: string;
  chainId?: string;
  actions?: Array<{ action: string; title: string }>;
}

/**
 * Register the service worker.
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null;

  try {
    const registration = await navigator.serviceWorker.register('/sw.js');
    return registration;
  } catch {
    return null;
  }
}

/**
 * Request notification permission from the user.
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) return 'denied';
  return Notification.requestPermission();
}

/**
 * Send a local notification (no push server needed).
 */
export function sendLocalNotification(payload: NotificationPayload): void {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;

  const notification = new Notification(payload.title, {
    body: payload.body,
    tag: payload.tag,
    icon: '/icon-192.png',
  });

  notification.onclick = () => {
    window.focus();
    if (payload.url) {
      window.location.href = payload.url;
    }
    notification.close();
  };
}

/**
 * Build notification payload for an approval chain.
 */
export function buildApprovalNotification(chain: {
  id: string;
  summary: string;
  approval_tier: number;
  significance: number;
  deal_name?: string;
}): NotificationPayload {
  const priority = chain.significance >= 0.7 ? 'High' : chain.significance >= 0.4 ? 'Medium' : 'Low';

  return {
    title: `${chain.deal_name || 'Deal'}: ${priority} Priority`,
    body: chain.summary,
    tag: `approval-${chain.id}`,
    url: '/approval-queue',
    chainId: chain.id,
    actions: chain.approval_tier === 2
      ? [
          { action: 'approve', title: 'Approve' },
          { action: 'review', title: 'Review' },
        ]
      : [{ action: 'review', title: 'Review' }],
  };
}
