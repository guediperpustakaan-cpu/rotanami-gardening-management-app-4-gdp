"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Info, ListChecks, RefreshCw, Save, Sparkles } from "lucide-react";
import { api, useApi } from "@/lib/api";
import { useShell } from "@/components/shell";
import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  ErrorNote,
  Field,
  InfoNote,
  PageHeader,
  Select,
  Spinner,
  useToast,
} from "@/components/ui";
import { RotationPlanFormDialog } from "@/components/forms";
import { PlanCard, SuggestionCard } from "@/components/cards";
import { ENGINE_VERSION } from "@/lib/rotation/engine";
import type { CropDto, PlotDto, RotationPlanDto, RotationSuggestionResult, SeasonDto } from "@/lib/types";

export default function RotasiPage() {
  const { activeFarm, activeFarmId } = useShell();
  const toast = useToast();
  const [plotId, setPlotId] = useState("");
  const [seasonId, setSeasonId] = useState("");
  const [hasil, setHasil] = useState<RotationSuggestionResult | null>(null);
  const [memuat, setMemuat] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dialog, setDialog] = useState<null | "aturan" | "manual" | "ubah">(null);
  const [cropTerpilih, setCropTerpilih] = useState<CropDto | null>(null);
  const [ubahPlan, setUbahPlan] = useState<RotationPlanDto | null>(null);
  const [hapusPlan, setHapusPlan] = useState<RotationPlanDto | null>(null);

  const petak = useApi<{ plots: PlotDto[] }>(activeFarmId ? `/petak?farmId=${activeFarmId}` : null, [activeFarmId]);
  const musim = useApi<{ seasons: SeasonDto[] }>(activeFarmId ? `/musim?farmId=${activeFarmId}` : null, [activeFarmId]);
  const katalog = useApi<{ crops: CropDto[] }>(activeFarmId ? `/katalog/tanaman?farmId=${activeFarmId}` : null, [activeFarmId]);
  const rencana = useApi<{ plans: RotationPlanDto[] }>(activeFarmId ? `/rencana-rotasi?farmId=${activeFarmId}` : null, [activeFarmId]);

  const daftarPetak = useMemo(() => petak.data?.plots ?? [], [petak.data]);
  const daftarMusim = useMemo(() => musim.data?.seasons ?? [], [musim.data]);
  const daftarRencana = rencana.data?.plans ?? [];

  // Pilihan efektif: pakai pilihan pengguna, atau default otomatis (petak
  // pertama / musim yang aktif hari ini). Nilai turunan, bukan state, agar
  // tidak perlu setState di dalam effect.
  const plotIdEfektif = plotId || daftarPetak[0]?.id || "";
  const seasonIdEfektif = useMemo(() => {
    if (seasonId) return seasonId;
    const today = new Date().toISOString().slice(0, 10);
    return (daftarMusim.find((item) => item.startDate <= today && today <= item.endDate) ?? daftarMusim[0])?.id ?? "";
  }, [daftarMusim, seasonId]);

  function gantiPetak(value: string) {
    setPlotId(value);
    setHasil(null);
    setError(null);
  }

  async function mintaSaran() {
    if (!plotIdEfektif) {
      setError("Pilih petak terlebih dahulu.");
      return;
    }
    setMemuat(true);
    setError(null);
    try {
      const result = await api<RotationSuggestionResult>("/rotasi/saran", { method: "POST", body: { plotId: plotIdEfektif } });
      setHasil(result);
      if (result.status === "kurang") {
        toast.push("Data belum cukup untuk saran spesifik. Anda tetap dapat memilih tanaman secara manual.", "info");
      } else {
        toast.push("Saran rotasi berhasil dihitung.", "sukses");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menghitung saran.");
      setHasil(null);
    } finally {
      setMemuat(false);
    }
  }

  async function batalkan(plan: RotationPlanDto) {
    try {
      await api(`/rencana-rotasi/${plan.id}`, { method: "PATCH", body: { status: "dibatalkan" } });
      toast.push("Rencana dibatalkan.", "info");
      rencana.reload();
    } catch (err) {
      toast.push(err instanceof Error ? err.message : "Gagal membatalkan rencana.", "bahaya");
    }
  }

  async function hapusRencana() {
    if (!hapusPlan) return;
    try {
      await api(`/rencana-rotasi/${hapusPlan.id}`, { method: "DELETE" });
      toast.push("Rencana rotasi dihapus.", "sukses");
      setHapusPlan(null);
      rencana.reload();
    } catch (err) {
      toast.push(err instanceof Error ? err.message : "Gagal menghapus rencana.", "bahaya");
    }
  }

  const plotTerpilih = daftarPetak.find((item) => item.id === plotIdEfektif) ?? null;

  return (
    <>
      <PageHeader
        eyebrow={activeFarm?.name}
        title="Perencana rotasi tanaman"
        description="Saran dihitung dari riwayat tanam petak, keluarga botani/kelompok rotasi, catatan hama-penyakit, serta kategori kebutuhan hara dan status penutup tanah bila datanya tersedia."
        actions={
          <Badge tone="netral" icon={<Info className="size-3.5" />}>
            Mesin aturan {ENGINE_VERSION}
          </Badge>
        }
      />

      {daftarPetak.length === 0 && !petak.loading ? (
        <Card>
          <EmptyState
            icon={<RefreshCw className="size-6" />}
            title="Belum ada petak untuk direncanakan"
            description="Rotasi direncanakan per petak. Tambahkan petak terlebih dahulu, lalu catat minimal satu riwayat tanam agar perencana punya bahan pembanding."
          />
        </Card>
      ) : (
        <>
          <Card className="mb-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Petak yang direncanakan" htmlFor="rotasi-petak" required hint={plotTerpilih?.lastPlanting ? `Tanaman terakhir: ${plotTerpilih.lastPlanting.cropName}` : "Petak ini belum punya riwayat tanam"}>
                <Select id="rotasi-petak" value={plotIdEfektif} onChange={(event) => gantiPetak(event.target.value)}>
                  <option value="">Pilih petak</option>
                  {daftarPetak.map((plot) => (
                    <option key={plot.id} value={plot.id}>
                      {plot.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Musim / rentang waktu" htmlFor="rotasi-musim" hint="Musim dipakai saat menyimpan rencana, bukan untuk menghitung masa jeda.">
                <Select id="rotasi-musim" value={seasonIdEfektif} onChange={(event) => setSeasonId(event.target.value)}>
                  <option value="">Tanpa musim</option>
                  {daftarMusim.map((season) => (
                    <option key={season.id} value={season.id}>
                      {season.name} ({season.startDate} s.d. {season.endDate})
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button icon={<Sparkles className="size-4" aria-hidden="true" />} loading={memuat} onClick={() => void mintaSaran()} disabled={!plotIdEfektif}>
                Minta saran tanaman berikutnya
              </Button>
              <Button
                variant="kedua"
                icon={<ListChecks className="size-4" aria-hidden="true" />}
                onClick={() => {
                  setCropTerpilih(null);
                  setDialog("manual");
                }}
                disabled={!plotId}
              >
                Pilih tanaman sendiri
              </Button>
            </div>
            {error ? <ErrorNote className="mt-3">{error}</ErrorNote> : null}
            {memuat ? <Spinner label="Menghitung saran dari data petak…" /> : null}
          </Card>

          {hasil ? (
            <section className="mb-5 flex flex-col gap-3" aria-live="polite">
              <Card>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="label-kecil">Hasil perencana</p>
                    <h2 className="mt-1 text-lg font-bold text-soil-900">{hasil.headline}</h2>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {hasil.status === "cukup" ? (
                        <Badge tone="sukses" icon={<CheckCircle2 className="size-3.5" />}>
                          Saran berbasis aturan tersedia
                        </Badge>
                      ) : (
                        <Badge tone="perhatian" icon={<AlertTriangle className="size-3.5" />}>
                          Data belum cukup
                        </Badge>
                      )}
                      <Badge tone={hasil.confidence === "sedang" ? "info" : "netral"}>
                        Tingkat keyakinan: {hasil.confidence}
                      </Badge>
                      <Badge tone="netral">Mesin {hasil.engineVersion}</Badge>
                    </div>
                  </div>
                  {hasil.primary ? (
                    <Button
                      icon={<Save className="size-4" aria-hidden="true" />}
                      onClick={() => {
                        setCropTerpilih(hasil.primary!.crop);
                        setDialog("aturan");
                      }}
                    >
                      Simpan saran sebagai rencana
                    </Button>
                  ) : (
                    <Button
                      icon={<ListChecks className="size-4" aria-hidden="true" />}
                      onClick={() => {
                        setCropTerpilih(null);
                        setDialog("manual");
                      }}
                    >
                      Pilih tanaman manual
                    </Button>
                  )}
                </div>

                {hasil.status === "kurang" ? (
                  <InfoNote tone="clay" className="mt-3">
                    <strong>{hasil.headline}.</strong> Rotanami tidak menebak urutan tanaman tanpa data pembanding.
                    Silakan pilih tanaman sendiri, atau lengkapi data (riwayat tanam, keluarga botani, catatan
                    hama/penyakit) lalu minta saran ulang.
                  </InfoNote>
                ) : null}
              </Card>

              {hasil.primary ? (
                <SuggestionCard
                  item={hasil.primary}
                  primary
                  pickLabel="Simpan sebagai rencana"
                  onPick={(crop) => {
                    setCropTerpilih(crop);
                    setDialog("aturan");
                  }}
                />
              ) : null}

              {hasil.alternatives.length > 0 ? (
                <div>
                  <h3 className="mb-2 text-sm font-bold text-soil-800">Alternatif lain ({hasil.alternatives.length})</h3>
                  <div className="grid gap-3 lg:grid-cols-2">
                    {hasil.alternatives.map((item) => (
                      <SuggestionCard
                        key={item.crop.id}
                        item={item}
                        pickLabel="Pilih ini"
                        onPick={(crop) => {
                          setCropTerpilih(crop);
                          setDialog("aturan");
                        }}
                      />
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="grid gap-3 lg:grid-cols-2">
                <Card>
                  <h3 className="text-sm font-bold text-soil-800">Data yang dipakai</h3>
                  {hasil.usedData.length > 0 ? (
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-soil-600">
                      {hasil.usedData.map((item, index) => (
                        <li key={index}>{item}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-2 text-sm text-soil-500">Tidak ada data petak yang dipakai untuk saran ini.</p>
                  )}
                </Card>
                <Card>
                  <h3 className="text-sm font-bold text-soil-800">Keterbatasan data</h3>
                  {hasil.dataGaps.length > 0 ? (
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-clay-800">
                      {hasil.dataGaps.map((item, index) => (
                        <li key={index}>{item}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-2 text-sm text-soil-500">
                      Tidak ada kekurangan data yang terdeteksi. Saran tetap perlu disesuaikan dengan kondisi setempat.
                    </p>
                  )}
                </Card>
              </div>

              <InfoNote>{hasil.disclaimer}</InfoNote>
            </section>
          ) : null}
        </>
      )}

      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-bold text-soil-900 sm:text-lg">Rencana rotasi tersimpan</h2>
          <Badge tone="netral">{daftarRencana.length} rencana</Badge>
        </div>
        {rencana.loading && daftarRencana.length === 0 ? <Spinner label="Memuat rencana rotasi…" /> : null}
        {daftarRencana.length === 0 && !rencana.loading ? (
          <Card>
            <EmptyState
              icon={<Save className="size-6" />}
              title="Belum ada rencana rotasi"
              description="Minta saran lalu simpan, atau pilih tanaman sendiri. Rencana yang tersimpan akan muncul di halaman Kalender."
              action={
                <Button
                  variant="kedua"
                  onClick={() => {
                    setCropTerpilih(null);
                    setDialog("manual");
                  }}
                disabled={!plotIdEfektif}
              >
                Buat rencana manual
                </Button>
              }
            />
          </Card>
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {daftarRencana.map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                onEdit={() => {
                  setUbahPlan(plan);
                  setDialog("ubah");
                }}
                onCancel={() => void batalkan(plan)}
                onDelete={() => setHapusPlan(plan)}
              />
            ))}
          </div>
        )}
      </section>

      {activeFarmId ? (
        <RotationPlanFormDialog
          open={dialog !== null}
          onClose={() => {
            setDialog(null);
            setUbahPlan(null);
          }}
          plots={daftarPetak}
          crops={katalog.data?.crops ?? []}
          seasons={daftarMusim}
          plan={dialog === "ubah" ? ubahPlan : null}
          defaultPlotId={plotIdEfektif}
          defaultCropId={cropTerpilih?.id}
          defaultSeasonId={seasonIdEfektif}
          defaultOrigin={dialog === "aturan" ? "aturan" : "manual"}
          onSaved={() => {
            rencana.reload();
            setDialog(null);
            setUbahPlan(null);
          }}
        />
      ) : null}

      <ConfirmDialog
        open={Boolean(hapusPlan)}
        onClose={() => setHapusPlan(null)}
        onConfirm={() => void hapusRencana()}
        title="Hapus rencana rotasi ini?"
        confirmLabel="Hapus rencana"
        description={
          <span>
            Rencana menanam <strong>{hapusPlan?.cropName}</strong> di petak {hapusPlan?.plotName} akan dihapus permanen.
          </span>
        }
      />
    </>
  );
}
