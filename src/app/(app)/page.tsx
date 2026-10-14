"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarDays, Droplets, LayoutGrid, Leaf, ListChecks, Plus, RefreshCw, Sprout } from "lucide-react";
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
  SectionTitle,
  Spinner,
  StatCard,
  StatusBadge,
  useToast,
} from "@/components/ui";
import { FarmFormDialog, PlantingFormDialog, PlotFormDialog } from "@/components/forms";
import { PlotCard } from "@/components/cards";
import { STATUS_TANAM, formatTanggal, labelSelisih } from "@/lib/format";
import type { CropDto, DashboardDto, PlotDto, SeasonDto } from "@/lib/types";

function salam(): string {
  const jam = new Date().getHours();
  if (jam < 11) return "Selamat pagi";
  if (jam < 15) return "Selamat siang";
  if (jam < 19) return "Selamat sore";
  return "Selamat malam";
}

export default function DashboardPage() {
  const { user, farms, activeFarm, activeFarmId, refreshFarms } = useShell();
  const router = useRouter();
  const toast = useToast();
  const [dialog, setDialog] = useState<null | "kebun" | "petak" | "tanam">(null);
  const [hapusPetak, setHapusPetak] = useState<PlotDto | null>(null);
  const [memuatContoh, setMemuatContoh] = useState(false);

  const ringkasan = useApi<DashboardDto>(activeFarmId ? `/ringkasan?farmId=${activeFarmId}` : null, [activeFarmId]);
  const katalog = useApi<{ crops: CropDto[] }>(activeFarmId ? `/katalog/tanaman?farmId=${activeFarmId}` : null, [activeFarmId]);
  const musim = useApi<{ seasons: SeasonDto[] }>(activeFarmId ? `/musim?farmId=${activeFarmId}` : null, [activeFarmId]);

  const muatUlang = () => {
    ringkasan.reload();
    katalog.reload();
    musim.reload();
  };

  async function muatKebunContoh() {
    setMemuatContoh(true);
    try {
      const hasil = await api<{ farms: unknown[] }>("/kebun/contoh", { method: "POST" });
      refreshFarms(hasil.farms as never);
      toast.push("Kebun contoh dimuat. Semua isinya berlabel “Data contoh”.", "info");
      window.location.assign("/");
    } catch (error) {
      toast.push(error instanceof Error ? error.message : "Gagal memuat kebun contoh.", "bahaya");
    } finally {
      setMemuatContoh(false);
    }
  }

  async function hapusPetakSekarang(confirmName: string) {
    if (!hapusPetak) return;
    try {
      await api(`/petak/${hapusPetak.id}`, { method: "DELETE", body: { confirmName } });
      toast.push(`Petak “${hapusPetak.name}” dan seluruh catatan di dalamnya dihapus.`, "sukses");
      setHapusPetak(null);
      muatUlang();
    } catch (error) {
      toast.push(error instanceof Error ? error.message : "Gagal menghapus petak.", "bahaya");
    }
  }

  /* ------------------------- belum punya kebun ------------------------- */
  if (farms.length === 0) {
    return (
      <>
        <PageHeader
          eyebrow="Langkah pertama"
          title={`${salam()}, ${user.name}`}
          description="Rotanami membantu Anda mencatat petak, riwayat tanam, rencana rotasi, dan hasil uji tanah. Mulai dengan membuat kebun."
        />
        <Card>
          <EmptyState
            icon={<Sprout className="size-6" />}
            title="Anda belum memiliki kebun"
            description="Buat kebun Anda sendiri, atau muat kebun contoh berisi data berlabel “Data contoh” untuk mencoba semua fitur terlebih dahulu."
            action={
              <>
                <Button icon={<Plus className="size-4" aria-hidden="true" />} onClick={() => setDialog("kebun")}>
                  Buat kebun saya
                </Button>
                <Button variant="kedua" loading={memuatContoh} onClick={() => void muatKebunContoh()}>
                  Muat kebun contoh
                </Button>
              </>
            }
          />
          <InfoNote className="mt-4">
            Data contoh tidak menggantikan data kebun Anda. Semua baris contoh dapat diubah atau dihapus kapan saja, dan
            tidak ada hasil uji tanah maupun riwayat yang dikarang untuk akun baru.
          </InfoNote>
        </Card>
        <FarmFormDialog
          open={dialog === "kebun"}
          onClose={() => setDialog(null)}
          onSaved={() => window.location.assign("/")}
        />
      </>
    );
  }

  const data = ringkasan.data;

  return (
    <>
      <PageHeader
        eyebrow={activeFarm?.isDemo ? "Kebun contoh · data contoh" : "Kebun aktif"}
        title={`${salam()}, ${user.name}`}
        description={
          activeFarm ? (
            <span>
              Anda sedang membuka <strong className="font-semibold text-soil-900">{activeFarm.name}</strong>
              {activeFarm.location ? ` di ${activeFarm.location}` : ""}
              {data?.season ? ` · musim ${data.season.name}` : " · belum ada musim diatur"}
            </span>
          ) : (
            "Memuat kebun…"
          )
        }
        actions={
          <>
            <Button icon={<Plus className="size-4" aria-hidden="true" />} onClick={() => setDialog("petak")} disabled={!activeFarmId}>
              Tambah petak
            </Button>
            <Button variant="kedua" icon={<Sprout className="size-4" aria-hidden="true" />} onClick={() => setDialog("tanam")} disabled={!activeFarmId || (data?.plotCount ?? 0) === 0}>
              Catat tanaman
            </Button>
            <Button variant="kedua" icon={<RefreshCw className="size-4" aria-hidden="true" />} onClick={() => router.push("/rotasi")}>
              Buat rencana rotasi
            </Button>
          </>
        }
      />

      {ringkasan.error ? <ErrorNote className="mb-4">{ringkasan.error}</ErrorNote> : null}
      {ringkasan.loading && !data ? <Spinner label="Memuat ringkasan kebun…" /> : null}

      {data ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Jumlah petak" value={data.plotCount} icon={<LayoutGrid className="size-5" />} hint={data.plotCount === 0 ? "Belum ada petak" : `${data.plantedPlots} petak sedang ditanami`} />
            <StatCard label="Rencana musim ini" value={data.plannedThisSeason} icon={<RefreshCw className="size-5" />} hint={data.season ? `Musim ${data.season.name}` : "Belum ada musim diatur"} />
            <StatCard label="Riwayat tanam" value={data.plantingCount} icon={<Leaf className="size-5" />} hint="Semua siklus yang tercatat" />
            <StatCard label="Perlu tindakan" value={data.pendingActions} icon={<ListChecks className="size-5" />} hint={`${data.remindersOpen} pengingat belum selesai`} />
          </div>

          {data.plotCount === 0 ? (
            <Card className="mt-5">
              <EmptyState
                icon={<LayoutGrid className="size-6" />}
                title="Belum ada petak di kebun ini"
                description="Tambahkan petak atau bedeng terlebih dahulu. Setelah itu Anda bisa mencatat riwayat tanam, hasil uji tanah, dan meminta saran rotasi."
                action={
                  <Button icon={<Plus className="size-4" aria-hidden="true" />} onClick={() => setDialog("petak")}>
                    Tambah petak pertama
                  </Button>
                }
              />
            </Card>
          ) : (
            <section className="mt-6">
              <SectionTitle action={<Link href="/petak" className="text-sm font-semibold text-moss-700 underline decoration-moss-300 underline-offset-2">Lihat semua petak</Link>}>
                Petak Anda
              </SectionTitle>
              <div className="grid gap-3 sm:grid-cols-2">
                {data.plots.map((plot) => (
                  <PlotCard key={plot.id} plot={plot} onEdit={() => setDialog("petak")} onDelete={() => setHapusPetak(plot)} />
                ))}
              </div>
            </section>
          )}

          <section className="mt-6 grid gap-4 lg:grid-cols-2">
            <Card>
              <SectionTitle action={<Link href="/kalender" className="text-sm font-semibold text-moss-700 underline decoration-moss-300 underline-offset-2">Buka kalender</Link>}>
                Aktivitas berikutnya
              </SectionTitle>
              {data.upcoming.length === 0 ? (
                <EmptyState
                  icon={<CalendarDays className="size-6" />}
                  title="Belum ada aktivitas terjadwal"
                  description="Buat pengingat, simpan rencana rotasi, atau catat penanaman dengan status “direncanakan” agar muncul di sini."
                  action={
                    <Button variant="kedua" onClick={() => router.push("/kalender")}>
                      Buat pengingat
                    </Button>
                  }
                />
              ) : (
                <ul className="flex flex-col gap-2">
                  {data.upcoming.map((item) => (
                    <li key={`${item.type}-${item.id}`} className="flex items-start gap-3 rounded-xl border border-soil-200 bg-white p-3">
                      <span className="mt-0.5 rounded-lg bg-moss-50 p-2 text-moss-700 ring-1 ring-moss-100" aria-hidden="true">
                        {item.type === "pengingat" ? <ListChecks className="size-4" /> : item.type === "rencana" ? <RefreshCw className="size-4" /> : <Sprout className="size-4" />}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-soil-900">{item.title}</p>
                        <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-soil-600">
                          <Badge tone={item.date < new Date().toISOString().slice(0, 10) ? "perhatian" : "netral"} icon={<CalendarDays className="size-3.5" />}>
                            {formatTanggal(item.date)} · {labelSelisih(item.date)}
                          </Badge>
                          {item.plotName ? <span>Petak {item.plotName}</span> : null}
                          <Badge tone="info">
                            {item.type === "pengingat" ? "Pengingat" : item.type === "rencana" ? "Rencana rotasi" : "Jadwal tanam"}
                          </Badge>
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card>
              <SectionTitle>Riwayat terakhir per petak</SectionTitle>
              <ul className="flex flex-col gap-2">
                {data.plots.map((plot) => {
                  const status = plot.lastPlanting ? STATUS_TANAM[plot.lastPlanting.status] : null;
                  return (
                    <li key={plot.id} className="flex items-center gap-3 rounded-xl bg-soil-50 p-3">
                      <Droplets className="size-4 shrink-0 text-soil-400" aria-hidden="true" />
                      <div className="min-w-0 flex-1">
                        <Link href={`/petak/${plot.id}`} className="truncate text-sm font-semibold text-soil-900 hover:text-moss-700 hover:underline">
                          {plot.name}
                        </Link>
                        <p className="truncate text-xs text-soil-500">
                          {plot.lastPlanting ? `${plot.lastPlanting.cropName} · tanam ${formatTanggal(plot.lastPlanting.plantDate)}` : "Belum ada riwayat"}
                        </p>
                      </div>
                      {status ? <StatusBadge meta={status} /> : <Badge tone="netral">Kosong</Badge>}
                    </li>
                  );
                })}
              </ul>
              <InfoNote className="mt-4">
                Rotanami tidak menampilkan rekomendasi agronomi sebagai kepastian. Saran rotasi selalu menyertakan alasan,
                data yang dipakai, dan data yang masih kurang.
              </InfoNote>
            </Card>
          </section>
        </>
      ) : null}

      <FarmFormDialog open={dialog === "kebun"} onClose={() => setDialog(null)} onSaved={() => window.location.assign("/")} />
      {activeFarmId ? (
        <>
          <PlotFormDialog open={dialog === "petak"} onClose={() => setDialog(null)} farmId={activeFarmId} onSaved={muatUlang} />
          <PlantingFormDialog
            open={dialog === "tanam"}
            onClose={() => setDialog(null)}
            plots={data?.plots ?? []}
            crops={katalog.data?.crops ?? []}
            seasons={musim.data?.seasons ?? []}
            onSaved={muatUlang}
          />
        </>
      ) : null}
      <ConfirmDialog
        open={Boolean(hapusPetak)}
        onClose={() => setHapusPetak(null)}
        onConfirm={(name) => void hapusPetakSekarang(name)}
        title="Hapus petak ini?"
        requireName={hapusPetak?.name ?? null}
        confirmLabel="Hapus petak"
        description={
          <span>
            Menghapus petak <strong>{hapusPetak?.name}</strong> juga menghapus riwayat tanam, hasil uji tanah, observasi,
            dan rencana rotasi di dalamnya. Tindakan ini tidak dapat dibatalkan.
          </span>
        }
      />
    </>
  );
}
