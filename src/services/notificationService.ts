// Notification Service for browser notifications & check-in window reminders

export async function requestNotificationPermission(): Promise<boolean> {
  if (!("Notification" in window)) {
    return false;
  }
  if (Notification.permission === "granted") {
    return true;
  }
  if (Notification.permission !== "denied") {
    const perm = await Notification.requestPermission();
    return perm === "granted";
  }
  return false;
}

export function sendBrowserNotification(title: string, body: string, icon?: string) {
  if (!("Notification" in window) || Notification.permission !== "granted") {
    return;
  }
  try {
    new Notification(title, {
      body,
      icon: icon || "/favicon.ico",
    });
  } catch (error) {
    console.error("Browser notification trigger error:", error);
  }
}

// Check if current time is past check-in window and no check-in exists for today
export function isCheckInWindowMissed(
  checkInWindow?: { startHour: number; endHour: number },
  hasCheckedInToday?: boolean
): boolean {
  if (hasCheckedInToday) return false;

  const now = new Date();
  const currentHour = now.getHours();
  const endHour = checkInWindow?.endHour ?? 10;

  // Past the window end hour today
  return currentHour >= endHour;
}
