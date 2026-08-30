import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";
import { dueReminders, formatMoney, type Subscription } from "./subscriptions";

export async function requestNotificationPermission(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) {
    if (!("Notification" in window)) return false;
    const result = await Notification.requestPermission();
    return result === "granted";
  }
  const perm = await LocalNotifications.requestPermissions();
  return perm.display === "granted";
}

export async function scheduleReminders(list: Subscription[]): Promise<number> {
  const due = dueReminders(list);
  if (due.length === 0) return 0;

  if (!Capacitor.isNativePlatform()) {
    if (Notification.permission !== "granted") return 0;
    for (const s of due) {
      new Notification(`Nid · ${s.name}`, {
        body:
          s.days === 0
            ? `Prélèvement aujourd'hui · ${formatMoney(s.amount)}`
            : `Prélèvement dans ${s.days} jour${s.days > 1 ? "s" : ""} · ${formatMoney(s.amount)}`,
        tag: `nid-${s.id}`,
      });
    }
    return due.length;
  }

  const pending = await LocalNotifications.getPending();
  if (pending.notifications.length) {
    await LocalNotifications.cancel({
      notifications: pending.notifications.map((n) => ({ id: n.id })),
    });
  }

  let id = 1;
  const notifications = due.map((s) => {
    const when = new Date();
    when.setSeconds(when.getSeconds() + 2 + id);
    return {
      id: id++,
      title: `Nid · ${s.name}`,
      body:
        s.days === 0
          ? `Prélèvement aujourd'hui · ${formatMoney(s.amount)}`
          : `Prélèvement dans ${s.days} jour${s.days > 1 ? "s" : ""} · ${formatMoney(s.amount)}`,
      schedule: { at: when },
      extra: { subscriptionId: s.id },
    };
  });

  await LocalNotifications.schedule({ notifications });
  return notifications.length;
}
