'use client';

import { useState, useEffect } from 'react';

export function NotificationPermission() {
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('default');

  useEffect(() => {
    if (!('Notification' in window)) {
      setPermission('unsupported');
    } else {
      setPermission(Notification.permission);
    }
  }, []);

  const handleRequest = async () => {
    if (!('Notification' in window)) return;
    const result = await Notification.requestPermission();
    setPermission(result);
  };

  if (permission === 'granted' || permission === 'unsupported') return null;

  return (
    <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 mb-4">
      <p className="text-sm font-medium mb-2">Enable Notifications</p>
      <p className="text-xs text-muted-foreground mb-3">
        Get notified when new approvals need your attention.
      </p>
      {permission === 'denied' ? (
        <p className="text-xs text-red-600">
          Notifications are blocked. Please enable them in your browser settings.
        </p>
      ) : (
        <button
          onClick={handleRequest}
          className="px-4 py-2 bg-blue-600 text-white rounded text-sm min-h-[44px]"
        >
          Enable Notifications
        </button>
      )}
    </div>
  );
}
