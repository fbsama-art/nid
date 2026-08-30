import {
  addMonths,
  addWeeks,
  addYears,
  differenceInCalendarDays,
  format,
  isBefore,
  parseISO,
  startOfDay,
} from "date-fns";
import { fr } from "date-fns/locale";
import {
  CircleDot,
  Droplets,
  HeartPulse,
  Home,
  PlayCircle,
  Shield,
  Smartphone,
  TrainFront,
  Wifi,
  Zap,
  type LucideIcon,
} from "lucide-react";

export const CYCLES = ["weekly", "monthly", "quarterly", "yearly"] as const;
export type Cycle = (typeof CYCLES)[number];

export const CATEGORIES = [
  "phone",
  "internet",
  "energy",
  "water",
  "insurance",
  "streaming",
  "transport",
  "housing",
  "health",
  "other",
] as const;
export type Category = (typeof CATEGORIES)[number];

export type Subscription = {
  id: string;
  name: string;
  amount: number;
  cycle: Cycle;
  nextPayment: string;
  category: Category;
  reminderDays: number;
  notes: string;
  active: boolean;
  createdAt: string;
};

export type AppSettings = {
  notificationsEnabled: boolean;
  defaultReminderDays: number;
};

export const CYCLE_LABEL: Record<Cycle, string> = {
  weekly: "Hebdo",
  monthly: "Mensuel",
  quarterly: "Trim.",
  yearly: "Annuel",
};

export const CATEGORY_META: Record<
  Category,
  { label: string; icon: LucideIcon }
> = {
  phone: { label: "Téléphone", icon: Smartphone },
  internet: { label: "Internet", icon: Wifi },
  energy: { label: "Électricité", icon: Zap },
  water: { label: "Eau", icon: Droplets },
  insurance: { label: "Assurance", icon: Shield },
  streaming: { label: "Streaming", icon: PlayCircle },
  transport: { label: "Transport", icon: TrainFront },
  housing: { label: "Logement", icon: Home },
  health: { label: "Santé", icon: HeartPulse },
  other: { label: "Autre", icon: CircleDot },
};

const euro = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
});

export function formatMoney(amount: number): string {
  return euro.format(amount);
}

export function parseAmount(raw: string): number {
  const n = Number(raw.replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : NaN;
}

export function addCycle(date: Date, cycle: Cycle): Date {
  switch (cycle) {
    case "weekly":
      return addWeeks(date, 1);
    case "monthly":
      return addMonths(date, 1);
    case "quarterly":
      return addMonths(date, 3);
    case "yearly":
      return addYears(date, 1);
  }
}

export function nextOccurrence(
  iso: string,
  cycle: Cycle,
  from = new Date(),
): Date {
  const today = startOfDay(from);
  let cursor = startOfDay(parseISO(iso));
  let guard = 0;
  while (isBefore(cursor, today) && guard < 240) {
    cursor = addCycle(cursor, cycle);
    guard += 1;
  }
  return cursor;
}

export function yearlyAmount(amount: number, cycle: Cycle): number {
  switch (cycle) {
    case "weekly":
      return amount * 52;
    case "monthly":
      return amount * 12;
    case "quarterly":
      return amount * 4;
    case "yearly":
      return amount;
  }
}

export function monthlyAmount(amount: number, cycle: Cycle): number {
  return yearlyAmount(amount, cycle) / 12;
}

export function daysUntil(date: Date, from = new Date()): number {
  return differenceInCalendarDays(startOfDay(date), startOfDay(from));
}

export function dueLabel(days: number): string {
  if (days < 0) return "En retard";
  if (days === 0) return "Aujourd'hui";
  if (days === 1) return "Demain";
  return `Dans ${days} j`;
}

export function formatDay(date: Date): string {
  return format(date, "d MMM", { locale: fr });
}

export function isoDate(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

export function daysFromNow(n: number): string {
  const d = new Date();
  const utc = Date.UTC(
    d.getUTCFullYear(),
    d.getUTCMonth(),
    d.getUTCDate() + n,
  );
  return new Date(utc).toISOString().slice(0, 10);
}

export function newId(): string {
  return (
    crypto.randomUUID?.() ??
    `sub_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  );
}

export function totals(list: Subscription[]) {
  const items = list.filter((s) => s.active);
  const yearly = items.reduce(
    (sum, s) => sum + yearlyAmount(s.amount, s.cycle),
    0,
  );
  return { yearly, monthly: yearly / 12, count: items.length };
}

export function upcoming(list: Subscription[], withinDays = 30) {
  return list
    .filter((s) => s.active)
    .map((s) => {
      const due = nextOccurrence(s.nextPayment, s.cycle);
      return { ...s, due, days: daysUntil(due) };
    })
    .filter((s) => s.days <= withinDays)
    .sort(
      (a, b) => a.days - b.days || a.name.localeCompare(b.name, "fr"),
    );
}

export function dueReminders(list: Subscription[]) {
  return upcoming(list, 30).filter(
    (s) => s.reminderDays > 0 && s.days >= 0 && s.days <= s.reminderDays,
  );
}

export function categoryBreakdown(list: Subscription[]) {
  const map = new Map<Category, number>();
  for (const s of list.filter((x) => x.active)) {
    map.set(
      s.category,
      (map.get(s.category) ?? 0) + yearlyAmount(s.amount, s.cycle),
    );
  }
  return [...map.entries()]
    .map(([category, yearly]) => ({ category, yearly }))
    .sort((a, b) => b.yearly - a.yearly);
}

const DEMO = "2026-01-01T00:00:00.000Z";

export function seedSubscriptions(): Subscription[] {
  const rows: Array<Omit<Subscription, "createdAt" | "active" | "notes">> = [
    {
      id: "demo-orange",
      name: "Orange Mobile",
      amount: 19.99,
      cycle: "monthly",
      nextPayment: daysFromNow(2),
      category: "phone",
      reminderDays: 3,
    },
    {
      id: "demo-freebox",
      name: "Freebox",
      amount: 39.99,
      cycle: "monthly",
      nextPayment: daysFromNow(5),
      category: "internet",
      reminderDays: 3,
    },
    {
      id: "demo-edf",
      name: "EDF",
      amount: 87.4,
      cycle: "monthly",
      nextPayment: daysFromNow(12),
      category: "energy",
      reminderDays: 7,
    },
    {
      id: "demo-netflix",
      name: "Netflix",
      amount: 13.49,
      cycle: "monthly",
      nextPayment: daysFromNow(1),
      category: "streaming",
      reminderDays: 2,
    },
    {
      id: "demo-spotify",
      name: "Spotify",
      amount: 10.99,
      cycle: "monthly",
      nextPayment: daysFromNow(18),
      category: "streaming",
      reminderDays: 3,
    },
    {
      id: "demo-maif",
      name: "MAIF Auto",
      amount: 42,
      cycle: "monthly",
      nextPayment: daysFromNow(8),
      category: "insurance",
      reminderDays: 7,
    },
    {
      id: "demo-eau",
      name: "Eau de Paris",
      amount: 28.5,
      cycle: "monthly",
      nextPayment: daysFromNow(22),
      category: "water",
      reminderDays: 3,
    },
    {
      id: "demo-icloud",
      name: "iCloud+",
      amount: 2.99,
      cycle: "monthly",
      nextPayment: daysFromNow(3),
      category: "other",
      reminderDays: 1,
    },
    {
      id: "demo-mutuelle",
      name: "Mutuelle",
      amount: 56.8,
      cycle: "monthly",
      nextPayment: daysFromNow(15),
      category: "health",
      reminderDays: 7,
    },
    {
      id: "demo-navigo",
      name: "Navigo",
      amount: 86.4,
      cycle: "monthly",
      nextPayment: daysFromNow(6),
      category: "transport",
      reminderDays: 3,
    },
    {
      id: "demo-domaine",
      name: "Nom de domaine",
      amount: 14.99,
      cycle: "yearly",
      nextPayment: daysFromNow(40),
      category: "internet",
      reminderDays: 7,
    },
    {
      id: "demo-habitation",
      name: "Assurance habitation",
      amount: 186,
      cycle: "yearly",
      nextPayment: daysFromNow(70),
      category: "housing",
      reminderDays: 7,
    },
  ];
  return rows.map((row) => ({
    ...row,
    notes: "",
    active: true,
    createdAt: DEMO,
  }));
}
