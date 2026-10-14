"use client";

import { useMemo, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, ListChecks, Plus, RefreshCw, Sprout } from "lucide-react";
import { api, useApi } from "@/lib/api";
import { useShell } from "@/components/shell";
import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  ErrorNote,
  InfoNote,
  PageHeader,
  Spinner,
  cx,
  useToast,
} from "@/components/ui";
import { ReminderFormDialog } from "@/components/forms";
import { ReminderRow } from "@/components/cards";
import { LABEL_JENIS_PENGINGAT, formatTanggal, formatTanggalPanjang, labelSelisih, namaBulan, keyBulan, tanggalHariIni } from "@/lib/format";
import type { PlantingDto, PlotDto, ReminderDto, RotationPlanDto } from "@/lib/types";

type Item = {
  id: string;
  type: "pengingat" | "rencana" | "tanam" | "panen";
  title: string;
  plotName: string | null;
  isDone?: boolean;
  reminder?: ReminderDto;
};

const HARI = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

function tanggalKey(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export default function KalenderPage() {
  const { activeFarm, activeFarmId } = useShell();
  const toast = useToast();
  const today = tanggalHariIni();
  const [kursor, setKursor] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const [hariTerpilih, setHariTerpilih] = useState<string>(today);
  const [tampilan, setTampilan] = useState<"kalender" | "daftar">("kalender");
  const [dialog, setDialog] = useState(false);
  const [ubahReminder, setUbahReminder] = useState<ReminderDto | null>(null);
  const [hapusReminder, setHapusReminder] = useState<ReminderDto | null>(null);
  const [sibuk, setSibuk] = useState<string | null>(null);

  const pengingat = useApi<{ reminders: ReminderDto[] }>(activeFarmId ? `/pengingat?farmId=${activeFarmId}` : null, [activeFarmId]);
  const rencana = useApi<{ plans: RotationPlanDto[] }>(activeFarmId ? `/rencana-rotasi?farmId=${activeFarmId}` : null, [activeFarmId]);
  const riwayat = useApi<{ plantings: PlantingDto[] }>(activeFarmId ? `/riwayat-tanam?farmId=${activeFarmId}` : null, [activeFarmId]);
  const petak = useApi<{ plots: PlotDto[] }>(activeFarmId ? `/petak?farmId=${activeFarmId}` : null, [activeFarmId]);

  const muatUlang = () => {
    pengingat.reload();
    rencana.reload();
    riwayat.reload();
  };

  const perTanggal = useMemo(() => {
    const map = new Map<string, Item[]>();
    const tambah = (date: string | null, item: Item) => {
      if (!date) return;
      const list = map.get(date) ?? [];
      list.push(item);
      map.set(date, list);
    };

    for (const reminder of pengingat.data?.reminders ?? []) {
      tambah(reminder.dueDate, {
        id: reminder.id,
        type: "pengingat",
        title: reminder.title,
        plotName: reminder.plotName,
        isDone: reminder.isDone,
        reminder,
      });
    }
    for (const plan of rencana.data?.plans ?? []) {
      if (plan.status === "dibatalkan") continue;
      tambah(plan.targetPlantDate, {
        id: plan.id,
        type: "rencana",
        title: `Rencana tanam ${plan.cropName}`,
        plotName: plan.plotName,
      });
    }
    for (const planting of riwayat.data?.plantings ?? []) {
      if (planting.status === "dibatalkan") continue;
      tambah(planting.plantDate, {
        id: `${planting.id}-tanam`,
        type: "tanam",
        title: planting.status === "direncanakan" ? `Jadwal tanam ${planting.cropName}` : `Tanam ${planting.cropName}`,
        plotName: planting.plotName,
      });
      if (planting.harvestDate) {
        tambah(planting.harvestDate, { id: `${planting.id}-panen`, type: "panen", title: `Panen ${planting.cropName}`, plotName: planting.plotName });
      }
    }
    return map;
  }, [pengingat.data, rencana.data, riwayat.data]);

  const selBulan = useMemo(() => {
    const first = new Date(kursor.year, kursor.month, 1);
    const totalHari = new Date(kursor.year, kursor.month + 1, 0).getDate();
    const cells: { key: string; day: number; inMonth: boolean }[] = [];
    const offset = first.getDay();
    for (let i = 0; i < offset; i += 1) {
      const d = new Date(kursor.year, kursor.month, i - offset + 1);
      cells.push({ key: tanggalKey(d.getFullYear(), d.getMonth(), d.getDate()), day: d.getDate(), inMonth: false });
    }
    for (let day = 1; day <= totalHari; day += 1) {
      cells.push({ key: tanggalKey(kursor.year, kursor.month, day), day, inMonth: true });
    }
    while (cells.length % 7 !== 0) {
      const last = cells[cells.length - 1]!;
      const [y, m, d] = last.key.split("-").map(Number);
      const next = new Date(y!, m! - 1, d!);
      next.setDate(next.getDate() + 1);
      cells.push({ key: tanggalKey(next.getFullYear(), next.getMonth(), next.getDate()), day: next.getDate(), inMonth: false });
    }
    return cells;
  }, [kursor]);

  const itemTerpilih = perTanggal.get(hariTerpilih) ?? [];
  const daftarMendatang = useMemo(() => {
    const keys = Array.from(perTanggal.keys()).sort();
    const hasil: { date: string; items: Item[] }[] = [];
    for (const key of keys) {
      if (key < today) continue;
      hasil.push({ date: key, items: perTanggal.get(key)! });
      if (hasil.length >= 10) break;
    }
    return hasil;
  }, [perTanggal, today]);

  const pengingatTerbuka = (pengingat.data?.reminders ?? []).filter((item) => !item.isDone);

  async function toggle(reminder: ReminderDto) {
    setSibuk(reminder.id);
    try {
      await api(`/pengingat/${reminder.id}`, { method: "PATCH", body: { isDone: !reminder.isDone } });
      toast.push(reminder.isDone ? "Pengingat dibuka kembali." : "Pengingat ditandai selesai.", "sukses");
      pengingat.reload();
    } catch (error) {
      toast.push(error instanceof Error ? error.message : "Gagal memperbarui pengingat.", "bahaya");
    } finally {
      setSibuk(null);
    }
  }

  function geser(delta: number) {
    setKursor((current) => {
      const date = new Date(current.year, current.month + delta, 1);
      return { year: date.getFullYear(), month: date.getMonth() };
    });
  }

  const iconFor = (type: Item["type"]) =>
    type === "pengingat" ? <ListChecks className="size-3.5" aria-hidden="true" /> : type === "rencana" ? <RefreshCw className="size-3.5" aria-hidden="true" /> : type === "panen" ? <CalendarDays className="size-3.5" aria-hidden="true" /> : <Sprout className="size-3.5" aria-hidden="true" />;

  const toneFor = (type: Item["type"]): "netral" | "info" | "sukses" | "perhatian" =>
    type === "pengingat" ? "perhatian" : type === "rencana" ? "info" : type === "panen" ? "sukses" : "netral";

  return (
    <>
      <PageHeader
        eyebrow={activeFarm?.name}
        title="Kalender & pengingat"
        description="Semua jadwal tanam, tanggal panen yang sudah terjadi, rencana rotasi, dan pengingat buatan Anda dalam satu tempat."
        actions={
          <>
            <Button
              icon={<Plus className="size-4" aria-hidden="true" />}
              onClick={() => {
                setUbahReminder(null);
                setDialog(true);
              }}
              disabled={!activeFarmId}
            >
              Buat pengingat
            </Button>
            <div className="flex overflow-hidden rounded-xl ring-1 ring-soil-300" role="group" aria-label="Pilih tampilan">
              {(["kalender", "daftar"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setTampilan(mode)}
                  aria-pressed={tampilan === mode}
                  className={cx("px-3.5 py-2.5 text-sm font-semibold", tampilan === mode ? "bg-moss-600 text-white" : "bg-white text-soil-700 hover:bg-soil-50")}
                >
                  {mode === "kalender" ? "Kalender" : "Daftar"}
                </button>
              ))}
            </div>
          </>
        }
      />

      <InfoNote className="mb-4">
        Pengingat Rotanami hanya tampil di dalam aplikasi ini. Rotanami tidak mengirim email atau push notification, dan
        tidak menjanjikan pengingat di luar aplikasi.
      </InfoNote>

      {pengingat.error ? <ErrorNote className="mb-4">{pengingat.error}</ErrorNote> : null}
      {pengingat.loading && !pengingat.data ? <Spinner label="Memuat kalender…" /> : null}

      {tampilan === "kalender" ? (
        <Card className="mb-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-base font-bold text-soil-900">{namaBulan(keyBulan(tanggalKey(kursor.year, kursor.month, 1)))}</h2>
            <div className="flex items-center gap-1.5">
              <Button variant="kedua" size="sm" onClick={() => geser(-1)} aria-label="Bulan sebelumnya">
                <ChevronLeft className="size-4" aria-hidden="true" />
              </Button>
              <Button
                variant="kedua"
                size="sm"
                onClick={() => {
                  const now = new Date();
                  setKursor({ year: now.getFullYear(), month: now.getMonth() });
                  setHariTerpilih(today);
                }}
              >
                Hari ini
              </Button>
              <Button variant="kedua" size="sm" onClick={() => geser(1)} aria-label="Bulan berikutnya">
                <ChevronRight className="size-4" aria-hidden="true" />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center">
            {HARI.map((hari) => (
              <div key={hari} className="label-kecil py-1">
                {hari}
              </div>
            ))}
            {selBulan.map((cell) => {
              const items = perTanggal.get(cell.key) ?? [];
              const dipilih = cell.key === hariTerpilih;
              return (
                <button
                  key={cell.key}
                  type="button"
                  onClick={() => setHariTerpilih(cell.key)}
                  aria-pressed={dipilih}
                  aria-label={`${formatTanggalPanjang(cell.key)}${items.length > 0 ? `, ${items.length} agenda` : ", tidak ada agenda"}`}
                  className={cx(
                    "flex min-h-16 flex-col gap-1 rounded-lg border p-1.5 text-left align-top transition-colors sm:min-h-20",
                    cell.inMonth ? "bg-white" : "bg-soil-50/60",
                    dipilih ? "border-moss-500 ring-2 ring-moss-200" : "border-soil-200 hover:border-moss-300",
                  )}
                >
                  <span className={cx("text-xs font-bold", cell.key === today ? "text-clay-600" : "text-soil-700")}>
                    {cell.day}
                    {cell.key === today ? <span className="sr-only"> (hari ini)</span> : null}
                  </span>
                  <span className="flex flex-col gap-0.5">
                    {items.slice(0, 2).map((item) => (
                      <span
                        key={item.id}
                        className={cx(
                          "flex items-center gap-1 truncate rounded px-1 py-0.5 text-[10px] font-semibold",
                          item.type === "pengingat" && "bg-clay-100 text-clay-800",
                          item.type === "rencana" && "bg-[#e6eef6] text-[#1f4d70]",
                          item.type === "tanam" && "bg-soil-100 text-soil-700",
                          item.type === "panen" && "bg-moss-100 text-moss-800",
                          item.isDone && "line-through opacity-70",
                        )}
                      >
                        <span aria-hidden="true">{iconFor(item.type)}</span>
                        <span className="truncate">{item.title}</span>
                      </span>
                    ))}
                    {items.length > 2 ? <span className="text-[10px] font-semibold text-soil-500">+{items.length - 2} lagi</span> : null}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="mt-4 border-t border-soil-100 pt-3">
            <h3 className="text-sm font-bold text-soil-900">{formatTanggalPanjang(hariTerpilih)}</h3>
            {itemTerpilih.length === 0 ? (
              <p className="mt-1 text-sm text-soil-500">Tidak ada agenda pada tanggal ini.</p>
            ) : (
              <ul className="mt-2 flex flex-col gap-2">
                {itemTerpilih.map((item) =>
                  item.reminder ? (
                    <ReminderRow
                      key={item.id}
                      reminder={item.reminder}
                      toggling={sibuk === item.reminder.id}
                      onToggle={() => void toggle(item.reminder!)}
                      onEdit={() => {
                        setUbahReminder(item.reminder!);
                        setDialog(true);
                      }}
                      onDelete={() => setHapusReminder(item.reminder!)}
                    />
                  ) : (
                    <li key={item.id} className="flex items-center gap-2 rounded-xl border border-soil-200 bg-white p-3 text-sm">
                      <Badge tone={toneFor(item.type)} icon={iconFor(item.type)}>
                        {item.type === "rencana" ? "Rencana rotasi" : item.type === "tanam" ? "Tanam" : "Panen"}
                      </Badge>
                      <span className="font-semibold text-soil-900">{item.title}</span>
                      {item.plotName ? <span className="text-xs text-soil-500">Petak {item.plotName}</span> : null}
                    </li>
                  ),
                )}
              </ul>
            )}
          </div>
        </Card>
      ) : (
        <Card className="mb-4">
          <h2 className="mb-3 text-base font-bold text-soil-900">Agenda mendatang</h2>
          {daftarMendatang.length === 0 ? (
            <EmptyState
              icon={<CalendarDays className="size-6" />}
              title="Belum ada agenda mendatang"
              description="Buat pengingat, simpan rencana rotasi, atau catat penanaman dengan status direncanakan."
              action={
                <Button
                  onClick={() => {
                    setUbahReminder(null);
                    setDialog(true);
                  }}
                  disabled={!activeFarmId}
                >
                  Buat pengingat
                </Button>
              }
            />
          ) : (
            <ul className="flex flex-col gap-3">
              {daftarMendatang.map((group) => (
                <li key={group.date}>
                  <p className="label-kecil mb-1.5">
                    {formatTanggalPanjang(group.date)} · {labelSelisih(group.date)}
                  </p>
                  <ul className="flex flex-col gap-2">
                    {group.items.map((item) =>
                      item.reminder ? (
                        <ReminderRow
                          key={item.id}
                          reminder={item.reminder}
                          toggling={sibuk === item.reminder.id}
                          onToggle={() => void toggle(item.reminder!)}
                          onEdit={() => {
                            setUbahReminder(item.reminder!);
                            setDialog(true);
                          }}
                          onDelete={() => setHapusReminder(item.reminder!)}
                        />
                      ) : (
                        <li key={item.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-soil-200 bg-white p-3 text-sm">
                          <Badge tone={toneFor(item.type)} icon={iconFor(item.type)}>
                            {item.type === "rencana" ? "Rencana rotasi" : item.type === "tanam" ? "Tanam" : "Panen"}
                          </Badge>
                          <span className="font-semibold text-soil-900">{item.title}</span>
                          {item.plotName ? <span className="text-xs text-soil-500">Petak {item.plotName}</span> : null}
                        </li>
                      ),
                    )}
                  </ul>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      <Card>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-bold text-soil-900">Pengingat belum selesai</h2>
          <Badge tone="perhatian">{pengingatTerbuka.length} pengingat</Badge>
        </div>
        {pengingatTerbuka.length === 0 ? (
          <EmptyState
            icon={<ListChecks className="size-6" />}
            title="Tidak ada pengingat terbuka"
            description="Semua pengingat sudah ditandai selesai, atau Anda belum membuat pengingat."
            action={
              <Button
                variant="kedua"
                onClick={() => {
                  setUbahReminder(null);
                  setDialog(true);
                }}
                disabled={!activeFarmId}
              >
                Buat pengingat
              </Button>
            }
          />
        ) : (
          <ul className="flex flex-col gap-2">
            {pengingatTerbuka.map((reminder) => (
              <ReminderRow
                key={reminder.id}
                reminder={reminder}
                toggling={sibuk === reminder.id}
                onToggle={() => void toggle(reminder)}
                onEdit={() => {
                  setUbahReminder(reminder);
                  setDialog(true);
                }}
                onDelete={() => setHapusReminder(reminder)}
              />
            ))}
          </ul>
        )}
        <p className="mt-3 text-xs text-soil-500">
          Jenis pengingat yang tersedia: {Object.values(LABEL_JENIS_PENGINGAT).join(", ")}.
        </p>
      </Card>

      {activeFarmId ? (
        <ReminderFormDialog
          open={dialog}
          onClose={() => setDialog(false)}
          farmId={activeFarmId}
          plots={petak.data?.plots ?? []}
          reminder={ubahReminder}
          onSaved={muatUlang}
        />
      ) : null}

      <ConfirmDialog
        open={Boolean(hapusReminder)}
        onClose={() => setHapusReminder(null)}
        onConfirm={async () => {
          if (!hapusReminder) return;
          try {
            await api(`/pengingat/${hapusReminder.id}`, { method: "DELETE" });
            toast.push("Pengingat dihapus.", "sukses");
            setHapusReminder(null);
            muatUlang();
          } catch (error) {
            toast.push(error instanceof Error ? error.message : "Gagal menghapus pengingat.", "bahaya");
          }
        }}
        title="Hapus pengingat ini?"
        confirmLabel="Hapus pengingat"
        description={
          <span>
            Pengingat <strong>{hapusReminder?.title}</strong> akan dihapus permanen.
          </span>
        }
      />
    </>
  );
}
