"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import {
  BookOpen,
  CalendarDays,
  LayoutGrid,
  Leaf,
  LogOut,
  Menu,
  RefreshCw,
  Settings,
  Sprout,
  X,
} from "lucide-react";
import { api } from "@/lib/api";
import type { FarmDto, SessionUser } from "@/lib/types";
import { Badge, Button, DemoBadge, Select, useToast } from "@/components/ui";
import { cx } from "@/components/ui";

type ShellValue = {
  user: SessionUser;
  farms: FarmDto[];
  activeFarmId: string | null;
  activeFarm: FarmDto | null;
  setActiveFarm: (farmId: string) => Promise<void>;
  refreshFarms: (farms: FarmDto[]) => void;
};

const ShellContext = createContext<ShellValue | null>(null);

export function useShell(): ShellValue {
  const value = useContext(ShellContext);
  if (!value) throw new Error("useShell harus dipakai di dalam Shell aplikasi.");
  return value;
}

export function useActiveFarmId(): string | null {
  return useShell().activeFarmId;
}

const NAV = [
  { href: "/", label: "Beranda", icon: Sprout },
  { href: "/petak", label: "Petak", icon: LayoutGrid },
  { href: "/katalog", label: "Katalog", icon: BookOpen },
  { href: "/rotasi", label: "Rotasi", icon: RefreshCw },
  { href: "/kalender", label: "Kalender", icon: CalendarDays },
  { href: "/pengaturan", label: "Pengaturan", icon: Settings },
];

/** Logo orisinal Rotanami: tunas sederhana dalam lingkaran tanah. */
function Mark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cx("size-8", className)} role="img" aria-label="Logo Rotanami: tunas di atas tanah">
      <circle cx="16" cy="16" r="15" className="fill-moss-700" />
      <path d="M16 25V13" stroke="#e2eddd" strokeWidth="2" strokeLinecap="round" />
      <path d="M16 15c-4.6 0-7-2.4-7-6.4 4.8-.4 7 1.8 7 6.4Z" fill="#9fc192" />
      <path d="M16 18c4.4 0 6.6-2.2 6.6-6-4.6-.4-6.6 1.7-6.6 6Z" fill="#c6dbbd" />
      <path d="M8 25.5h16" stroke="#dd8351" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function Shell({
  user,
  farms,
  children,
}: {
  user: SessionUser;
  farms: FarmDto[];
  children: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const toast = useToast();
  const [farmList, setFarmList] = useState<FarmDto[]>(farms);
  const [activeFarmId, setActiveFarmId] = useState<string | null>(user.activeFarmId ?? farms[0]?.id ?? null);
  const [switching, setSwitching] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const activeFarm = useMemo(() => farmList.find((farm) => farm.id === activeFarmId) ?? farmList[0] ?? null, [farmList, activeFarmId]);

  const setActiveFarm = useCallback(
    async (farmId: string) => {
      setSwitching(true);
      try {
        await api(`/kebun/${farmId}/aktif`, { method: "POST" });
        setActiveFarmId(farmId);
        toast.push(`Kebun aktif: ${farmList.find((f) => f.id === farmId)?.name ?? "diperbarui"}`, "info");
        router.refresh();
      } catch (error) {
        toast.push(error instanceof Error ? error.message : "Gagal mengganti kebun aktif.", "bahaya");
      } finally {
        setSwitching(false);
      }
    },
    [farmList, router, toast],
  );

  const keluar = useCallback(async () => {
    try {
      await api("/auth/keluar", { method: "POST" });
    } finally {
      window.location.assign("/masuk");
    }
  }, []);

  const value = useMemo<ShellValue>(
    () => ({
      user,
      farms: farmList,
      activeFarmId: activeFarm?.id ?? null,
      activeFarm,
      setActiveFarm,
      refreshFarms: setFarmList,
    }),
    [user, farmList, activeFarm, setActiveFarm],
  );

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <ShellContext.Provider value={value}>
      <a href="#isi" className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-[70] focus:rounded-lg focus:bg-white focus:px-3 focus:py-2 focus:text-sm focus:font-semibold">
        Lompat ke isi utama
      </a>

      <div className="min-h-dvh lg:flex">
        {/* Navigasi samping (desktop) */}
        <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-soil-200 bg-white/70 px-4 py-5 lg:flex">
          <Link href="/" className="mb-6 flex items-center gap-2.5">
            <Mark />
            <span className="text-lg font-extrabold tracking-tight text-moss-800">Rotanami</span>
          </Link>

          <div className="mb-5">
            <label htmlFor="kebun-aktif-samping" className="label-kecil mb-1.5 block">
              Kebun aktif
            </label>
            <Select
              id="kebun-aktif-samping"
              value={activeFarm?.id ?? ""}
              disabled={switching || farmList.length === 0}
              onChange={(event) => void setActiveFarm(event.target.value)}
            >
              {farmList.length === 0 ? <option value="">Belum ada kebun</option> : null}
              {farmList.map((farm) => (
                <option key={farm.id} value={farm.id}>
                  {farm.name}
                  {farm.isDemo ? " (data contoh)" : ""}
                </option>
              ))}
            </Select>
            {activeFarm?.isDemo ? <div className="mt-2"><DemoBadge /></div> : null}
            {activeFarm?.location ? <p className="mt-2 text-xs text-soil-500">{activeFarm.location}</p> : null}
          </div>

          <nav aria-label="Navigasi utama" className="flex flex-1 flex-col gap-1">
            {NAV.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={isActive(item.href) ? "page" : undefined}
                  className={cx(
                    "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors",
                    isActive(item.href) ? "bg-moss-600 text-white shadow-sm" : "text-soil-700 hover:bg-moss-50 hover:text-moss-800",
                  )}
                >
                  <Icon className="size-4.5 shrink-0" aria-hidden="true" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="mt-4 border-t border-soil-200 pt-4">
            <p className="truncate text-sm font-semibold text-soil-800">{user.name}</p>
            <p className="truncate text-xs text-soil-500">{user.email}</p>
            <Button variant="kedua" size="sm" className="mt-3 w-full" icon={<LogOut className="size-4" aria-hidden="true" />} onClick={() => void keluar()}>
              Keluar
            </Button>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          {/* Bar atas (ponsel/tablet) */}
          <header className="sticky top-0 z-40 border-b border-soil-200 bg-cream/95 px-3 py-2.5 backdrop-blur sm:px-5 lg:hidden">
            <div className="flex items-center gap-2">
              <Link href="/" className="flex items-center gap-2" aria-label="Rotanami beranda">
                <Mark className="size-7" />
                <span className="text-base font-extrabold text-moss-800">Rotanami</span>
              </Link>
              <div className="ml-auto flex items-center gap-1.5">
                <Link href="/pengaturan" className="rounded-xl p-2.5 text-soil-700 ring-1 ring-soil-200 hover:bg-white" aria-label="Buka pengaturan akun dan kebun">
                  <Settings className="size-5" aria-hidden="true" />
                </Link>
                <button
                  type="button"
                  onClick={() => setMenuOpen((open) => !open)}
                  className="rounded-xl p-2.5 text-soil-700 ring-1 ring-soil-200 hover:bg-white"
                  aria-expanded={menuOpen}
                  aria-label={menuOpen ? "Tutup daftar kebun" : "Ganti kebun aktif"}
                >
                  {menuOpen ? <X className="size-5" aria-hidden="true" /> : <Menu className="size-5" aria-hidden="true" />}
                </button>
              </div>
            </div>

            {menuOpen ? (
              <div className="mt-2.5 rounded-2xl border border-soil-200 bg-white p-3 shadow-lg">
                <label htmlFor="kebun-aktif-atas" className="label-kecil mb-1.5 block">
                  Kebun aktif
                </label>
                <Select
                  id="kebun-aktif-atas"
                  value={activeFarm?.id ?? ""}
                  disabled={switching || farmList.length === 0}
                  onChange={(event) => void setActiveFarm(event.target.value)}
                >
                  {farmList.length === 0 ? <option value="">Belum ada kebun</option> : null}
                  {farmList.map((farm) => (
                    <option key={farm.id} value={farm.id}>
                      {farm.name}
                      {farm.isDemo ? " (data contoh)" : ""}
                    </option>
                  ))}
                </Select>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {activeFarm?.isDemo ? <DemoBadge /> : null}
                  <Badge tone="netral" icon={<Leaf className="size-3.5" />}>
                    {activeFarm ? `${activeFarm.plotCount} petak` : "0 petak"}
                  </Badge>
                </div>
                <div className="mt-3 flex gap-2 border-t border-soil-100 pt-3">
                  <p className="min-w-0 flex-1 truncate text-xs text-soil-600">
                    {user.name} · {user.email}
                  </p>
                  <Button variant="kedua" size="sm" icon={<LogOut className="size-3.5" aria-hidden="true" />} onClick={() => void keluar()}>
                    Keluar
                  </Button>
                </div>
              </div>
            ) : null}
          </header>

          <main id="isi" className="min-w-0 flex-1 px-3 pb-28 pt-4 sm:px-5 lg:px-8 lg:pb-10 lg:pt-7">
            <div className="mx-auto w-full max-w-5xl">{children}</div>
          </main>
        </div>
      </div>

      {/* Navigasi bawah (ponsel) */}
      <nav aria-label="Navigasi utama ponsel" className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-soil-200 bg-white/95 backdrop-blur lg:hidden">
        <ul className="mx-auto flex max-w-lg items-stretch justify-between px-1">
          {NAV.slice(0, 5).map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <li key={item.href} className="flex-1">
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cx(
                    "flex h-16 flex-col items-center justify-center gap-1 rounded-xl text-[11px] font-semibold transition-colors",
                    active ? "text-moss-700" : "text-soil-500 hover:text-soil-800",
                  )}
                >
                  <Icon className={cx("size-5", active && "text-moss-600")} aria-hidden="true" />
                  <span className={cx(active && "underline decoration-moss-300 decoration-2 underline-offset-2")}>{item.label}</span>
                  {active ? <span className="sr-only">(halaman aktif)</span> : null}
                </Link>
              </li>
            );
          })}
          <li className="flex-1">
            <Link
              href="/pengaturan"
              aria-current={isActive("/pengaturan") ? "page" : undefined}
              className={cx(
                "flex h-16 flex-col items-center justify-center gap-1 rounded-xl text-[11px] font-semibold",
                isActive("/pengaturan") ? "text-moss-700" : "text-soil-500",
              )}
            >
              <Settings className="size-5" aria-hidden="true" />
              <span>Akun</span>
            </Link>
          </li>
        </ul>
      </nav>
    </ShellContext.Provider>
  );
}
