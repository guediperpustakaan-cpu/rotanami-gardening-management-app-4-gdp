"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, Check, Info, Loader2, X } from "lucide-react";
import type { StatusMeta } from "@/lib/format";

export function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}

/* --------------------------------- tombol -------------------------------- */

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "utama" | "kedua" | "halus" | "bahaya" | "tautan";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  icon?: ReactNode;
  full?: boolean;
};

const VARIANT: Record<NonNullable<ButtonProps["variant"]>, string> = {
  utama: "bg-moss-600 text-white hover:bg-moss-700 active:bg-moss-800 border border-moss-700 shadow-sm",
  kedua: "bg-white text-soil-800 hover:bg-soil-50 border border-soil-300 shadow-sm",
  halus: "bg-transparent text-moss-700 hover:bg-moss-50 border border-transparent",
  bahaya: "bg-[#a5271c] text-white hover:bg-[#8f2018] border border-[#8f2018] shadow-sm",
  tautan: "bg-transparent text-moss-700 hover:underline border border-transparent px-0",
};

const SIZE: Record<NonNullable<ButtonProps["size"]>, string> = {
  sm: "h-9 px-3 text-sm gap-1.5",
  md: "h-11 px-4 text-sm gap-2",
  lg: "h-12 px-5 text-base gap-2",
};

export function Button({
  variant = "utama",
  size = "md",
  loading = false,
  icon,
  full = false,
  className,
  children,
  disabled,
  ...rest
}: ButtonProps) {
  return (
    <button
      className={cx(
        "inline-flex items-center justify-center rounded-xl font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60",
        VARIANT[variant],
        variant === "tautan" ? "" : SIZE[size],
        full && "w-full",
        className,
      )}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : icon}
      {children}
    </button>
  );
}

/* ---------------------------------- kartu --------------------------------- */

export function Card({ className, children, ...rest }: { className?: string; children: ReactNode } & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cx("kartu p-5", className)} {...rest}>
      {children}
    </div>
  );
}

export function PageHeader({
  title,
  description,
  actions,
  eyebrow,
}: {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  eyebrow?: ReactNode;
}) {
  return (
    <header className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow ? <p className="label-kecil mb-1">{eyebrow}</p> : null}
        <h1 className="text-2xl font-bold sm:text-[28px]">{title}</h1>
        {description ? <div className="mt-1.5 max-w-2xl text-sm text-soil-600">{description}</div> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 className="text-base font-bold text-soil-900 sm:text-lg">{children}</h2>
      {action}
    </div>
  );
}

/* --------------------------------- badge ---------------------------------- */

export type Tone = "netral" | "info" | "sukses" | "perhatian" | "bahaya";

const TONE: Record<Tone, string> = {
  netral: "bg-soil-100 text-soil-700 ring-soil-200",
  info: "bg-[#e6eef6] text-[#1f4d70] ring-[#c6d8e8]",
  sukses: "bg-moss-100 text-moss-800 ring-moss-200",
  perhatian: "bg-clay-100 text-clay-800 ring-clay-200",
  bahaya: "bg-[#fbeae8] text-[#8f2018] ring-[#f2cfcb]",
};

/** Badge selalu menampilkan teks, bukan hanya warna. */
export function Badge({ tone = "netral", icon, children }: { tone?: Tone; icon?: ReactNode; children: ReactNode }) {
  return (
    <span className={cx("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset", TONE[tone])}>
      {icon ? <span aria-hidden="true">{icon}</span> : null}
      {children}
    </span>
  );
}

export function StatusBadge({ meta }: { meta: StatusMeta }) {
  const icon =
    meta.tone === "sukses" ? <Check className="size-3.5" /> : meta.tone === "bahaya" ? <X className="size-3.5" /> : meta.tone === "perhatian" ? <AlertTriangle className="size-3.5" /> : <Info className="size-3.5" />;
  return (
    <Badge tone={meta.tone} icon={icon}>
      {meta.label}
    </Badge>
  );
}

export function DemoBadge() {
  return (
    <Badge tone="perhatian" icon={<Info className="size-3.5" />}>
      Data contoh
    </Badge>
  );
}

/* --------------------------------- formulir -------------------------------- */

export function Field({
  label,
  htmlFor,
  hint,
  error,
  required,
  children,
  className,
}: {
  label: string;
  htmlFor: string;
  hint?: ReactNode;
  error?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cx("flex flex-col gap-1.5", className)}>
      <label htmlFor={htmlFor} className="text-sm font-semibold text-soil-800">
        {label}
        {required ? <span className="ml-0.5 text-clay-600" aria-hidden="true">*</span> : <span className="ml-1 text-xs font-normal text-soil-500">(opsional)</span>}
      </label>
      {children}
      {hint && !error ? <p className="text-xs text-soil-500">{hint}</p> : null}
      {error ? (
        <p id={`${htmlFor}-error`} className="flex items-start gap-1 text-xs font-medium text-[#8f2018]">
          <AlertTriangle className="mt-px size-3.5 shrink-0" aria-hidden="true" />
          {error}
        </p>
      ) : null}
    </div>
  );
}

const KONTROL =
  "w-full rounded-xl border bg-white px-3 text-sm text-soil-900 shadow-sm transition-colors placeholder:text-soil-400 focus:border-moss-500 disabled:bg-soil-50 disabled:text-soil-500";

export function Input({ className, invalid, ...rest }: InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }) {
  return <input className={cx(KONTROL, "h-11", invalid ? "border-[#c96a60]" : "border-soil-300", className)} aria-invalid={invalid || undefined} {...rest} />;
}

export function Textarea({ className, invalid, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }) {
  return <textarea className={cx(KONTROL, "min-h-24 py-2.5 leading-relaxed", invalid ? "border-[#c96a60]" : "border-soil-300", className)} aria-invalid={invalid || undefined} {...rest} />;
}

export function Select({ className, invalid, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean }) {
  return (
    <select
      className={cx(KONTROL, "h-11 pr-9", invalid ? "border-[#c96a60]" : "border-soil-300", className)}
      aria-invalid={invalid || undefined}
      {...rest}
    >
      {children}
    </select>
  );
}

export function Checkbox({ label, description, className, id, ...rest }: InputHTMLAttributes<HTMLInputElement> & { label: string; description?: string }) {
  // useId selalu dipanggil agar jumlah hook stabil di setiap render.
  const idOtomatis = useId();
  const idField = id ?? idOtomatis;
  return (
    <div className={cx("flex items-start gap-3 rounded-xl border border-soil-200 bg-white p-3", className)}>
      <input id={idField} type="checkbox" className="mt-0.5 size-5 shrink-0 rounded border-soil-400 text-moss-600 accent-moss-600" {...rest} />
      <label htmlFor={idField} className="text-sm">
        <span className="font-semibold text-soil-800">{label}</span>
        {description ? <span className="mt-0.5 block text-xs text-soil-500">{description}</span> : null}
      </label>
    </div>
  );
}

/* --------------------------------- dialog --------------------------------- */

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg";
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
        return;
      }
      if (event.key !== "Tab" || !panelRef.current) return;
      const focusables = panelRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (focusables.length === 0) return;
      const first = focusables[0]!;
      const last = focusables[focusables.length - 1]!;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const timer = window.setTimeout(() => {
      const target = panelRef.current?.querySelector<HTMLElement>("input:not([type=hidden]), select, textarea, button");
      target?.focus();
    }, 20);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = overflow;
      window.clearTimeout(timer);
      previous?.focus?.();
    };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-soil-900/45 p-0 backdrop-blur-[2px] sm:items-center sm:p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={cx(
          "w-full rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl",
          size === "sm" && "sm:max-w-md",
          size === "md" && "sm:max-w-xl",
          size === "lg" && "sm:max-w-3xl",
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-soil-100 px-5 py-4">
          <div>
            <h2 id={titleId} className="text-lg font-bold">
              {title}
            </h2>
            {description ? <p className="mt-1 text-sm text-soil-600">{description}</p> : null}
          </div>
          <button type="button" onClick={onClose} aria-label="Tutup dialog" className="-mr-1 rounded-lg p-2 text-soil-500 hover:bg-soil-100 hover:text-soil-800">
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>
        <div className="max-h-[65vh] overflow-y-auto px-5 py-4">{children}</div>
        {footer ? <div className="flex flex-col-reverse gap-2 border-t border-soil-100 px-5 py-4 sm:flex-row sm:justify-end">{footer}</div> : null}
      </div>
    </div>,
    document.body,
  );
}

/**
 * State pesan error yang otomatis dikosongkan setiap kali dialog dibuka.
 * Memakai pola "menyesuaikan state saat prop berubah" (dipanggil saat render),
 * bukan useEffect — lihat https://react.dev/learn/you-might-not-need-an-effect
 */
export function useDialogPesan(open: boolean): readonly [string | null, (value: string | null) => void] {
  const [pesan, setPesan] = useState<string | null>(null);
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) setPesan(null);
  }
  return [pesan, setPesan] as const;
}

/**
 * Dialog konfirmasi. Untuk data penting (kebun/petak/tanaman) pengguna harus
 * mengetik ulang namanya agar penghapusan tidak terjadi tanpa sengaja.
 */
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Hapus",
  requireName,
  submitting,
  error,
  children,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: (confirmName: string) => void;
  title: string;
  description: ReactNode;
  confirmLabel?: string;
  requireName?: string | null;
  submitting?: boolean;
  error?: string | null;
  children?: ReactNode;
}) {
  const [typed, setTyped] = useState("");
  const [prevOpen, setPrevOpen] = useState(open);
  // Kosongkan teks setiap kali dialog dibuka/ditutup (pola state saat render, bukan effect).
  if (open !== prevOpen) {
    setPrevOpen(open);
    setTyped("");
  }
  const inputId = useId();

  const mismatch = Boolean(requireName) && typed.trim() !== requireName!.trim();

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="kedua" onClick={onClose} type="button">
            Batal
          </Button>
          <Button variant="bahaya" type="button" loading={submitting} disabled={mismatch} onClick={() => onConfirm(typed)}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3 text-sm text-soil-700">
        <div className="flex gap-2 rounded-xl bg-clay-50 p-3 text-clay-800 ring-1 ring-clay-100">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <div>{description}</div>
        </div>
        {children}
        {requireName ? (
          <Field label={`Ketik “${requireName}” untuk konfirmasi`} htmlFor={inputId} required error={typed && mismatch ? "Nama belum sama persis." : undefined}>
            <Input id={inputId} value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" invalid={Boolean(typed) && mismatch} placeholder={requireName} />
          </Field>
        ) : null}
        {error ? <ErrorNote>{error}</ErrorNote> : null}
      </div>
    </Modal>
  );
}

/* --------------------------------- toast ---------------------------------- */

type Toast = { id: number; tone: "sukses" | "bahaya" | "info"; message: string };
type ToastContextValue = { push: (message: string, tone?: Toast["tone"]) => void };

const ToastContext = createContext<ToastContextValue>({ push: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const counter = useRef(0);

  const push = useCallback((message: string, tone: Toast["tone"] = "sukses") => {
    counter.current += 1;
    const id = counter.current;
    setToasts((current) => [...current, { id, tone, message }]);
    window.setTimeout(() => setToasts((current) => current.filter((t) => t.id !== id)), 5000);
  }, []);

  const value = useMemo(() => ({ push }), [push]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-20 z-[60] flex flex-col items-center gap-2 px-3 sm:bottom-4 sm:right-4 sm:left-auto sm:items-end" role="status" aria-live="polite">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={cx(
              "pointer-events-auto flex w-full max-w-sm items-start gap-2 rounded-xl px-4 py-3 text-sm font-medium shadow-lg ring-1",
              toast.tone === "sukses" && "bg-moss-700 text-white ring-moss-800",
              toast.tone === "bahaya" && "bg-[#8f2018] text-white ring-[#6f1810]",
              toast.tone === "info" && "bg-soil-800 text-white ring-soil-900",
            )}
          >
            {toast.tone === "sukses" ? <Check className="mt-0.5 size-4 shrink-0" aria-hidden="true" /> : toast.tone === "bahaya" ? <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" /> : <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />}
            <span>{toast.message}</span>
            <button type="button" className="ml-auto rounded p-1 hover:bg-white/15" aria-label="Tutup notifikasi" onClick={() => setToasts((current) => current.filter((t) => t.id !== toast.id))}>
              <X className="size-3.5" aria-hidden="true" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

/* ------------------------------ status & info ----------------------------- */

export function ErrorNote({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div role="alert" className={cx("flex items-start gap-2 rounded-xl bg-[#fbeae8] px-3 py-2.5 text-sm text-[#8f2018] ring-1 ring-[#f2cfcb]", className)}>
      <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <div>{children}</div>
    </div>
  );
}

export function InfoNote({ children, tone = "netral", className }: { children: ReactNode; tone?: "netral" | "moss" | "clay"; className?: string }) {
  return (
    <div
      className={cx(
        "flex items-start gap-2 rounded-xl px-3 py-2.5 text-sm ring-1",
        tone === "netral" && "bg-soil-50 text-soil-700 ring-soil-200",
        tone === "moss" && "bg-moss-50 text-moss-800 ring-moss-200",
        tone === "clay" && "bg-clay-50 text-clay-800 ring-clay-100",
        className,
      )}
    >
      <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <div className="min-w-0">{children}</div>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
  icon,
}: {
  title: string;
  description: ReactNode;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-soil-300 bg-white/60 px-5 py-10 text-center">
      {icon ? <div className="rounded-2xl bg-moss-50 p-3 text-moss-600 ring-1 ring-moss-100" aria-hidden="true">{icon}</div> : null}
      <div>
        <p className="font-semibold text-soil-900">{title}</p>
        <div className="mx-auto mt-1 max-w-md text-sm text-soil-600">{description}</div>
      </div>
      {action ? <div className="mt-1 flex flex-wrap justify-center gap-2">{action}</div> : null}
    </div>
  );
}

export function Spinner({ label = "Memuat data…" }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 py-6 text-sm text-soil-600" role="status">
      <Loader2 className="size-4 animate-spin text-moss-600" aria-hidden="true" />
      {label}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cx("animate-pulse rounded-lg bg-soil-100", className)} aria-hidden="true" />;
}

export function LoadingBlock({ label }: { label?: string }) {
  return (
    <div className="flex flex-col gap-3" aria-busy="true">
      <Skeleton className="h-5 w-40" />
      <Skeleton className="h-24 w-full" />
      {label ? <span className="sr-only">{label}</span> : null}
    </div>
  );
}

/* ---------------------------------- tabs ---------------------------------- */

export function Tabs({
  tabs,
  active,
  onChange,
}: {
  tabs: { id: string; label: string; count?: number }[];
  active: string;
  onChange: (id: string) => void;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const move = (delta: number) => {
    const index = tabs.findIndex((tab) => tab.id === active);
    const next = tabs[(index + delta + tabs.length) % tabs.length]!;
    onChange(next.id);
    refs.current[tabs.indexOf(next)]?.focus();
  };
  return (
    <div role="tablist" aria-label="Bagian data petak" className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1">
      {tabs.map((tab, index) => (
        <button
          key={tab.id}
          ref={(el) => {
            refs.current[index] = el;
          }}
          role="tab"
          type="button"
          id={`tab-${tab.id}`}
          aria-selected={active === tab.id}
          aria-controls={`panel-${tab.id}`}
          tabIndex={active === tab.id ? 0 : -1}
          onClick={() => onChange(tab.id)}
          onKeyDown={(e) => {
            if (e.key === "ArrowRight") move(1);
            if (e.key === "ArrowLeft") move(-1);
            if (e.key === "Home") onChange(tabs[0]!.id);
            if (e.key === "End") onChange(tabs[tabs.length - 1]!.id);
          }}
          className={cx(
            "flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-colors",
            active === tab.id ? "bg-moss-600 text-white shadow-sm" : "bg-white text-soil-700 ring-1 ring-soil-200 hover:bg-soil-50",
          )}
        >
          {tab.label}
          {typeof tab.count === "number" ? (
            <span className={cx("rounded-full px-1.5 py-0.5 text-xs font-bold", active === tab.id ? "bg-white/20 text-white" : "bg-soil-100 text-soil-600")}>{tab.count}</span>
          ) : null}
        </button>
      ))}
    </div>
  );
}

/* --------------------------------- statistik ------------------------------ */

export function StatCard({ label, value, hint, icon }: { label: string; value: ReactNode; hint?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="kartu flex items-start gap-3 p-4">
      {icon ? <div className="rounded-xl bg-moss-50 p-2 text-moss-600 ring-1 ring-moss-100" aria-hidden="true">{icon}</div> : null}
      <div className="min-w-0">
        <p className="label-kecil">{label}</p>
        <p className="mt-1 text-2xl font-bold leading-none text-soil-900">{value}</p>
        {hint ? <p className="mt-1.5 text-xs text-soil-500">{hint}</p> : null}
      </div>
    </div>
  );
}
