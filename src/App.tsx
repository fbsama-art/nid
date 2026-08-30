import { useEffect, useMemo, useState } from "react";
import {
  Bell,
  BellOff,
  LayoutDashboard,
  PieChart,
  Plus,
  Wallet,
  X,
} from "lucide-react";
import { useNidStore } from "./lib/store";
import {
  CATEGORIES,
  CATEGORY_META,
  CYCLE_LABEL,
  categoryBreakdown,
  dueLabel,
  dueReminders,
  formatDay,
  formatMoney,
  isoDate,
  nextOccurrence,
  parseAmount,
  totals,
  upcoming,
  yearlyAmount,
  type Category,
  type Cycle,
  type Subscription,
} from "./lib/subscriptions";
import {
  requestNotificationPermission,
  scheduleReminders,
} from "./lib/notifications";
import "./App.css";

type Tab = "home" | "list" | "year" | "reminders";

export default function App() {
  const [tab, setTab] = useState<Tab>("home");
  const [editor, setEditor] = useState<{ open: boolean; id: string | null }>({
    open: false,
    id: null,
  });
  const subscriptions = useNidStore((s) => s.subscriptions);
  const settings = useNidStore((s) => s.settings);

  useEffect(() => {
    if (settings.notificationsEnabled) {
      void scheduleReminders(subscriptions);
    }
  }, [settings.notificationsEnabled, subscriptions]);

  return (
    <div className="shell">
      <header className="header">
        <div>
          <p className="brand">Nid</p>
          <p className="tagline">Tes charges, au calme</p>
        </div>
        <button
          type="button"
          className="btn-icon"
          aria-label="Ajouter"
          onClick={() => setEditor({ open: true, id: null })}
        >
          <Plus size={20} />
        </button>
      </header>

      <main className="main">
        {tab === "home" && (
          <Home
            onEdit={(id) => setEditor({ open: true, id })}
            onAdd={() => setEditor({ open: true, id: null })}
          />
        )}
        {tab === "list" && (
          <List
            onEdit={(id) => setEditor({ open: true, id })}
            onAdd={() => setEditor({ open: true, id: null })}
          />
        )}
        {tab === "year" && <Year />}
        {tab === "reminders" && <Reminders />}
      </main>

      <nav className="nav">
        {(
          [
            ["home", "Accueil", LayoutDashboard],
            ["list", "Abos", Wallet],
            ["year", "Année", PieChart],
            ["reminders", "Rappels", Bell],
          ] as const
        ).map(([id, label, Icon]) => (
          <button
            key={id}
            type="button"
            className={tab === id ? "nav-item active" : "nav-item"}
            onClick={() => setTab(id)}
          >
            <Icon size={20} strokeWidth={tab === id ? 2.2 : 1.8} />
            {label}
          </button>
        ))}
      </nav>

      {editor.open && (
        <Editor
          id={editor.id}
          onClose={() => setEditor({ open: false, id: null })}
        />
      )}
    </div>
  );
}

function Home({
  onEdit,
  onAdd,
}: {
  onEdit: (id: string) => void;
  onAdd: () => void;
}) {
  const list = useNidStore((s) => s.subscriptions);
  const { yearly, monthly, count } = totals(list);
  const soon = upcoming(list, 14);
  const alerts = dueReminders(list);

  return (
    <div className="stack">
      <section className="hero">
        <p className="hero-label">Cette année</p>
        <p className="hero-amount">{formatMoney(yearly)}</p>
        <div className="hero-row">
          <div>
            <p className="hero-sublabel">Soit par mois</p>
            <p className="hero-month">{formatMoney(monthly)}</p>
          </div>
          <p className="hero-count">
            {count} abo{count > 1 ? "s" : ""} actif{count > 1 ? "s" : ""}
          </p>
        </div>
      </section>

      {alerts.length > 0 && (
        <section className="alert">
          <div className="alert-title">
            <Bell size={16} />
            {alerts.length === 1
              ? "Un prélèvement arrive"
              : `${alerts.length} prélèvements arrivent`}
          </div>
          <ul>
            {alerts.slice(0, 3).map((s) => (
              <li key={s.id}>
                <span>{s.name}</span>
                <span>{formatMoney(s.amount)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <div className="section-head">
          <h2>Prochains paiements</h2>
          <span>14 jours</span>
        </div>
        {soon.length === 0 ? (
          <Empty onAdd={onAdd} />
        ) : (
          <ul className="cards">
            {soon.map((s) => (
              <li key={s.id}>
                <SubRow sub={s} onClick={() => onEdit(s.id)} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function List({
  onEdit,
  onAdd,
}: {
  onEdit: (id: string) => void;
  onAdd: () => void;
}) {
  const list = useNidStore((s) => s.subscriptions);
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return list
      .filter((s) => !query || s.name.toLowerCase().includes(query))
      .sort((a, b) => {
        const da = nextOccurrence(a.nextPayment, a.cycle).getTime();
        const db = nextOccurrence(b.nextPayment, b.cycle).getTime();
        return da - db;
      });
  }, [list, q]);

  return (
    <div className="stack">
      <div>
        <h1 className="page-title">Abonnements</h1>
        <p className="muted">
          {list.length} enregistré{list.length > 1 ? "s" : ""}
        </p>
      </div>
      <input
        className="input"
        placeholder="Rechercher"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      {filtered.length === 0 ? (
        <Empty onAdd={onAdd} />
      ) : (
        <ul className="cards">
          {filtered.map((s) => (
            <li key={s.id}>
              <SubRow sub={s} onClick={() => onEdit(s.id)} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Year() {
  const list = useNidStore((s) => s.subscriptions);
  const { yearly, monthly, count } = totals(list);
  const breakdown = categoryBreakdown(list);
  const top = [...list]
    .filter((s) => s.active)
    .sort(
      (a, b) =>
        yearlyAmount(b.amount, b.cycle) - yearlyAmount(a.amount, a.cycle),
    )[0];
  const totalY = breakdown.reduce((s, r) => s + r.yearly, 0) || 1;

  return (
    <div className="stack">
      <div>
        <h1 className="page-title">Vue annuelle</h1>
        <p className="muted">Ce que tes charges représentent sur 12 mois</p>
      </div>
      <section className="hero">
        <p className="hero-label">Cette année</p>
        <p className="hero-amount">{formatMoney(yearly)}</p>
        <div className="hero-row">
          <div>
            <p className="hero-sublabel">Soit par mois</p>
            <p className="hero-month">{formatMoney(monthly)}</p>
          </div>
          <p className="hero-count">{count} actifs</p>
        </div>
      </section>
      {breakdown.length === 0 ? (
        <p className="muted">Ajoute des abonnements pour voir la répartition.</p>
      ) : (
        <>
          <section className="card-block">
            <p className="card-label">Répartition annuelle</p>
            <ul className="breakdown">
              {breakdown.map((row) => {
                const Icon = CATEGORY_META[row.category].icon;
                const pct = Math.round((row.yearly / totalY) * 100);
                return (
                  <li key={row.category}>
                    <span className="ico">
                      <Icon size={16} />
                    </span>
                    <span className="grow">
                      {CATEGORY_META[row.category].label}
                    </span>
                    <span className="muted">{pct}%</span>
                    <span className="num">{formatMoney(row.yearly)}</span>
                  </li>
                );
              })}
            </ul>
          </section>
          {top && (
            <section className="card-block">
              <p className="card-label">Le plus lourd</p>
              <p className="page-title">{top.name}</p>
              <p className="muted">
                {formatMoney(yearlyAmount(top.amount, top.cycle))} / an ·{" "}
                {CATEGORY_META[top.category].label}
              </p>
            </section>
          )}
        </>
      )}
    </div>
  );
}

function Reminders() {
  const list = useNidStore((s) => s.subscriptions);
  const settings = useNidStore((s) => s.settings);
  const updateSettings = useNidStore((s) => s.updateSettings);
  const loadDemo = useNidStore((s) => s.loadDemo);
  const clearAll = useNidStore((s) => s.clearAll);
  const alerts = dueReminders(list);
  const soon = upcoming(list, 30);
  const [msg, setMsg] = useState("");

  async function toggleNotif(on: boolean) {
    if (!on) {
      updateSettings({ notificationsEnabled: false });
      return;
    }
    const ok = await requestNotificationPermission();
    updateSettings({ notificationsEnabled: true });
    if (ok) {
      const n = await scheduleReminders(list);
      setMsg(n > 0 ? `${n} rappel(s) programmé(s)` : "Notifications activées");
    } else {
      setMsg("Permission refusée — rappels visibles dans l'app");
    }
  }

  return (
    <div className="stack">
      <div>
        <h1 className="page-title">Rappels</h1>
        <p className="muted">Un avis quelques jours avant chaque paiement</p>
      </div>

      <section className="card-block row-between">
        <div className="row-gap">
          <span className="ico">
            {settings.notificationsEnabled ? (
              <Bell size={18} />
            ) : (
              <BellOff size={18} />
            )}
          </span>
          <div>
            <p className="strong">Notifications</p>
            <p className="muted small">
              Sur Android (APK), les rappels locaux sont gérés par l'app.
            </p>
          </div>
        </div>
        <label className="switch">
          <input
            type="checkbox"
            checked={settings.notificationsEnabled}
            onChange={(e) => void toggleNotif(e.target.checked)}
          />
          <span />
        </label>
      </section>
      {msg && <p className="toast">{msg}</p>}

      <section>
        <h2 className="page-title sm">Délai par défaut</h2>
        <div className="segmented">
          {[1, 3, 7].map((d) => (
            <button
              key={d}
              type="button"
              className={settings.defaultReminderDays === d ? "on" : ""}
              onClick={() => updateSettings({ defaultReminderDays: d })}
            >
              {d} jour{d > 1 ? "s" : ""}
            </button>
          ))}
        </div>
      </section>

      <section>
        <h2 className="page-title sm">À notifier</h2>
        {alerts.length === 0 ? (
          <p className="muted">Aucun prélèvement dans la fenêtre de rappel.</p>
        ) : (
          <ul className="cards">
            {alerts.map((s) => (
              <li key={s.id}>
                <SubRow sub={s} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="page-title sm">30 prochains jours</h2>
        <ul className="cards">
          {soon.map((s) => (
            <li key={s.id}>
              <SubRow sub={s} />
            </li>
          ))}
        </ul>
      </section>

      <section className="stack-sm">
        <h2 className="page-title sm">Données</h2>
        <p className="muted">Tout reste sur cet appareil.</p>
        <button type="button" className="btn outline" onClick={() => loadDemo()}>
          Recharger l'exemple
        </button>
        <button
          type="button"
          className="btn ghost danger"
          onClick={() => clearAll()}
        >
          Tout supprimer
        </button>
      </section>
    </div>
  );
}

function SubRow({
  sub,
  onClick,
}: {
  sub: Subscription;
  onClick?: () => void;
}) {
  const due = nextOccurrence(sub.nextPayment, sub.cycle);
  const days = Math.round((due.getTime() - startOfToday()) / 86400000);
  const Icon = CATEGORY_META[sub.category].icon;
  const tone = !sub.active
    ? "badge"
    : days <= 1
      ? "badge danger"
      : days <= 7
        ? "badge warn"
        : "badge";

  return (
    <button
      type="button"
      className="sub-row"
      onClick={onClick}
      disabled={!onClick}
    >
      <span className="ico">
        <Icon size={18} />
      </span>
      <span className="grow">
        <span className="strong">
          {sub.name}
          {!sub.active && <span className="badge">Pause</span>}
        </span>
        <span className="muted small">
          {CYCLE_LABEL[sub.cycle]} · {formatDay(due)}
        </span>
      </span>
      <span className="end">
        <span className="strong num">{formatMoney(sub.amount)}</span>
        <span className={tone}>{dueLabel(days)}</span>
      </span>
    </button>
  );
}

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function Empty({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="empty">
      <p className="page-title sm">Rien à l'horizon</p>
      <p className="muted">Ajoute un abonnement pour démarrer.</p>
      <button type="button" className="btn" onClick={onAdd}>
        Ajouter
      </button>
    </div>
  );
}

function Editor({ id, onClose }: { id: string | null; onClose: () => void }) {
  const subscriptions = useNidStore((s) => s.subscriptions);
  const addSubscription = useNidStore((s) => s.addSubscription);
  const updateSubscription = useNidStore((s) => s.updateSubscription);
  const removeSubscription = useNidStore((s) => s.removeSubscription);
  const markPaid = useNidStore((s) => s.markPaid);
  const defaultReminderDays = useNidStore(
    (s) => s.settings.defaultReminderDays,
  );
  const editing = subscriptions.find((s) => s.id === id) ?? null;

  const [name, setName] = useState(editing?.name ?? "");
  const [amount, setAmount] = useState(
    editing ? String(editing.amount).replace(".", ",") : "",
  );
  const [cycle, setCycle] = useState<Cycle>(editing?.cycle ?? "monthly");
  const [nextPayment, setNextPayment] = useState(
    editing?.nextPayment ?? isoDate(new Date()),
  );
  const [category, setCategory] = useState<Category>(
    editing?.category ?? "other",
  );
  const [reminderDays, setReminderDays] = useState(
    editing?.reminderDays ?? defaultReminderDays,
  );
  const [notes, setNotes] = useState(editing?.notes ?? "");
  const [active, setActive] = useState(editing?.active ?? true);
  const [error, setError] = useState<string | null>(null);

  function submit() {
    const parsed = parseAmount(amount);
    if (!name.trim()) return setError("Donne un nom.");
    if (!Number.isFinite(parsed) || parsed <= 0)
      return setError("Montant invalide.");
    if (!nextPayment) return setError("Choisis une date.");
    const draft = {
      name: name.trim(),
      amount: Math.round(parsed * 100) / 100,
      cycle,
      nextPayment,
      category,
      reminderDays,
      notes: notes.trim(),
      active,
    };
    if (editing) updateSubscription(editing.id, draft);
    else addSubscription(draft);
    onClose();
  }

  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <div className="drawer" onClick={(e) => e.stopPropagation()}>
        <div className="drawer-head">
          <div>
            <h2 className="page-title sm">
              {editing ? "Modifier" : "Nouvel abonnement"}
            </h2>
            <p className="muted small">Téléphone, internet, électricité…</p>
          </div>
          <button
            type="button"
            className="btn-icon ghost"
            onClick={onClose}
            aria-label="Fermer"
          >
            <X size={18} />
          </button>
        </div>

        <div className="drawer-body">
          <label className="field">
            <span>Nom</span>
            <input
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Freebox, EDF…"
            />
          </label>
          <div className="grid2">
            <label className="field">
              <span>Montant (€)</span>
              <input
                className="input"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="19,99"
              />
            </label>
            <label className="field">
              <span>Prochain paiement</span>
              <input
                className="input"
                type="date"
                value={nextPayment}
                onChange={(e) => setNextPayment(e.target.value)}
              />
            </label>
          </div>
          <div className="field">
            <span>Fréquence</span>
            <div className="segmented">
              {(
                [
                  ["weekly", "Hebdo"],
                  ["monthly", "Mois"],
                  ["quarterly", "Trim."],
                  ["yearly", "An"],
                ] as const
              ).map(([v, l]) => (
                <button
                  key={v}
                  type="button"
                  className={cycle === v ? "on" : ""}
                  onClick={() => setCycle(v)}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>
          <div className="field">
            <span>Catégorie</span>
            <div className="cat-grid">
              {CATEGORIES.map((c) => {
                const Icon = CATEGORY_META[c].icon;
                return (
                  <button
                    key={c}
                    type="button"
                    className={category === c ? "cat on" : "cat"}
                    onClick={() => setCategory(c)}
                  >
                    <Icon size={14} />
                    {CATEGORY_META[c].label}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="field">
            <span>Rappel avant paiement</span>
            <div className="segmented">
              {[0, 1, 3, 7].map((d) => (
                <button
                  key={d}
                  type="button"
                  className={reminderDays === d ? "on" : ""}
                  onClick={() => setReminderDays(d)}
                >
                  {d === 0 ? "Off" : `${d} j`}
                </button>
              ))}
            </div>
          </div>
          <label className="field">
            <span>Notes</span>
            <textarea
              className="input area"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </label>
          {editing && (
            <label className="row-between card-block">
              <span>
                <span className="strong">Actif</span>
                <span className="muted small block">
                  Désactive pour exclure des totaux
                </span>
              </span>
              <input
                type="checkbox"
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
              />
            </label>
          )}
          {error && <p className="error">{error}</p>}
        </div>

        <div className="drawer-foot">
          <button type="button" className="btn" onClick={submit}>
            {editing ? "Enregistrer" : "Ajouter"}
          </button>
          {editing && (
            <div className="grid2">
              <button
                type="button"
                className="btn outline"
                onClick={() => {
                  markPaid(editing.id);
                  onClose();
                }}
              >
                Marquer payé
              </button>
              <button
                type="button"
                className="btn ghost danger"
                onClick={() => {
                  removeSubscription(editing.id);
                  onClose();
                }}
              >
                Supprimer
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
