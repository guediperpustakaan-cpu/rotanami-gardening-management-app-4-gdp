"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CalendarDays, Droplets, Leaf, ListChecks, Pencil, Plus, RefreshCw, Trash2 } from "lucide-react";
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
  Tabs,
  useToast,
} from "@/components/ui";
import {
  ObservationFormDialog,
  PlantingFormDialog,
  PlotFormDialog,
  ReminderFormDialog,
  SoilTestFormDialog,
} from "@/components/forms";
import { ObservationRow, PlantingRow, SoilTestRow, ReminderRow, PlanCard } from "@/components/cards";
import { STATUS_TANAM, formatTanggal, formatUkuran, labelSelisih } from "@/lib/format";
import type {
  CropDto,
  ObservationDto,
  PlantingDto,
  PlotDto,
  ReminderDto,
  RotationPlanDto,
  SeasonDto,
  SoilTestDto,
} from "@/lib/types";

type Tab = "ringkasan" | "riwayat" | "tanah" | "observasi";

export function PlotDetail({ plotId }: { plotId: string }) {
  const router = useRouter();
  const toast = useToast();
  const { activeFarmId } = useShell();
  const [tab, setTab] = useState<Tab>("ringkasan");
  const [dialog, setDialog] = useState<null | "petak" | "tanam" | "tanah" | "observasi" | "pengingat">(null);
  const [ubahTanam, setUbahTanam] = useState<PlantingDto | null>(null);
  const [ubahTanah, setUbahTanah] = useState<SoilTestDto | null>(null);
  const [ubahObs, setUbahObs] = useState<ObservationDto | null>(null);
  const [hapus, setHapus] = useState<null | { jenis: "petak" | "tanam" | "tanah" | "observasi" | "pengingat" | "rencana"; id: string; nama: string }>(null);
  const [menghapus, setMenghapus] = useState(false);
  const [errorHapus, setErrorHapus] = useState<string | null>(null);

  const profil = useApi<{ plot: PlotDto | null; seasons: SeasonDto[] }>(`/petak/${plotId}`, [plotId]);
  const farmId = profil.data?.plot?.farmId ?? activeFarmId;
  const riwayat = useApi<{ plantings: PlantingDto[] }>(`/riwayat-tanam?plotId=${plotId}`, [plotId]);
  const tanah = useApi<{ soilTests: SoilTestDto[] }>(`/uji-tanah?plotId=${plotId}`, [plotId]);
  const observasi = useApi<{ observations: ObservationDto[] }>(`/observasi?plotId=${plotId}`, [plotId]);
  const katalog = useApi<{ crops: CropDto[] }>(farmId ? `/katalog/tanaman?farmId=${farmId}` : null, [farmId]);
  const pengingat = useApi<{ reminders: ReminderDto[] }>(farmId ? `/pengingat?farmId=${farmId}` : null, [farmId]);
  const rencana = useApi<{ plans: RotationPlanDto[] }>(farmId ? `/rencana-rotasi?farmId=${farmId}` : null, [farmId]);

  const plot = profil.data?.plot ?? null;

  const muatUlang = () => {
    profil.reload();
    riwayat.reload();
    tanah.reload();
    observasi.reload();
    pengingat.reload();
    rencana.reload();
    katalog.reload();
  };

  const pengingatPetak = useMemo(
    () => (pengingat.data?.reminders ?? []).filter((item) => item.plotId === plotId),
    [pengingat.data, plotId],
  );
  const rencanaPetak = useMemo(
    () => (rencana.data?.plans ?? []).filter((item) => item.plotId === plotId),
    [rencana.data, plotId],
  );

  const trenTanah = useMemo(() => {
    const list = [...(tanah.data?.soilTests ?? [])].sort((a, b) => (a.testDate > b.testDate ? 1 : -1));
    return list.map((item) => ({
      tanggal: formatTanggal(item.testDate),
      pH: item.ph,
      N: item.nitrogen,
      P: item.phosphorus,
      K: item.potassium,
      Organik: item.organicMatter,
    }));
  }, [tanah.data]);

  const unsurTersedia = useMemo(() => {
    const list = tanah.data?.soilTests ?? [];
    return (["nitrogen", "phosphorus", "potassium", "organicMatter"] as const).filter((key) =>
      list.some((item) => item[key] !== null),
    );
  }, [tanah.data]);

  async function togglePengingat(item: ReminderDto) {
    try {
      await api(`/pengingat/${item.id}`, { method: "PATCH", body: { isDone: !item.isDone } });
      toast.push(item.isDone ? "Pengingat ditandai belum selesai." : "Pengingat ditandai selesai.", "sukses");
      pengingat.reload();
    } catch (error) {
      toast.push(error instanceof Error ? error.message : "Gagal memperbarui pengingat.", "bahaya");
    }
  }

  async function batalkanRencana(item: RotationPlanDto) {
    try {
      await api(`/rencana-rotasi/${item.id}`, { method: "PATCH", body: { status: "dibatalkan" } });
      toast.push("Rencana rotasi dibatalkan.", "info");
      rencana.reload();
    } catch (error) {
      toast.push(error instanceof Error ? error.message : "Gagal membatalkan rencana.", "bahaya");
    }
  }

  async function jalankanHapus() {
    if (!hapus) return;
    setMenghapus(true);
    setErrorHapus(null);
    const jalur =
      hapus.jenis === "petak"
        ? `/petak/${hapus.id}`
        : hapus.jenis === "tanam"
          ? `/riwayat-tanam/${hapus.id}`
          : hapus.jenis === "tanah"
            ? `/uji-tanah/${hapus.id}`
            : hapus.jenis === "observasi"
              ? `/observasi/${hapus.id}`
              : hapus.jenis === "rencana"
                ? `/rencana-rotasi/${hapus.id}`
                : `/pengingat/${hapus.id}`;
    try {
      await api(jalur, { method: "DELETE", body: hapus.jenis === "petak" ? { confirmName: hapus.nama } : {} });
      toast.push("Data berhasil dihapus.", "sukses");
      if (hapus.jenis === "petak") {
        router.push("/petak");
        return;
      }
      setHapus(null);
      muatUlang();
    } catch (error) {
      const pesan = error instanceof Error ? error.message : "Gagal menghapus data.";
      if (hapus.jenis === "petak") setErrorHapus(pesan);
      else toast.push(pesan, "bahaya");
    } finally {
      setMenghapus(false);
    }
  }

  if (profil.error && !plot) {
    return (
      <>
        <PageHeader title="Petak tidak ditemukan" description={profil.error} />
        <Card>
          <EmptyState
            title="Petak tidak dapat dibuka"
            description={profil.error}
            action={
              <Button variant="kedua" onClick={() => router.push("/petak")}>
                Kembali ke daftar petak
              </Button>
            }
          />
        </Card>
      </>
    );
  }

  if (!plot) return <Spinner label="Memuat data petak…" />;

  const riwayatList = riwayat.data?.plantings ?? [];
  const tanahList = tanah.data?.soilTests ?? [];
  const obsList = observasi.data?.observations ?? [];
  const tanamanTerakhir = riwayatList[0] ?? null;
  const ujiTerakhir = tanahList.length > 0 ? tanahList[0]! : null;

  return (
    <>
      <PageHeader
        eyebrow={
          <span className="flex flex-wrap items-center gap-2">
            <Link href="/petak" className="hover:underline">
              Petak
            </Link>
            <span aria-hidden="true">/</span>
            <span>{plot.name}</span>
          </span>
        }
        title={plot.name}
        description={
          <span>
            {formatUkuran(plot.size, plot.areaUnit)} · {plot.soilType ? `jenis tanah ${plot.soilType}` : "jenis tanah belum diisi"}
            {plot.notes ? ` · ${plot.notes}` : ""}
          </span>
        }
        actions={
          <>
            <Button icon={<Plus className="size-4" aria-hidden="true" />} onClick={() => { setUbahTanam(null); setDialog("tanam"); }}>
              Catat tanaman
            </Button>
            <Button variant="kedua" icon={<Droplets className="size-4" aria-hidden="true" />} onClick={() => { setUbahTanah(null); setDialog("tanah"); }}>
              Uji tanah
            </Button>
            <Button variant="kedua" icon={<Pencil className="size-4" aria-hidden="true" />} onClick={() => setDialog("petak")}>
              Ubah petak
            </Button>
            <Button variant="kedua" icon={<Trash2 className="size-4" aria-hidden="true" />} onClick={() => { setErrorHapus(null); setHapus({ jenis: "petak", id: plot.id, nama: plot.name }); }}>
              Hapus
            </Button>
          </>
        }
      />

      <div className="mb-5">
        <Tabs
          active={tab}
          onChange={(value) => setTab(value as Tab)}
          tabs={[
            { id: "ringkasan", label: "Ringkasan" },
            { id: "riwayat", label: "Riwayat tanam", count: riwayatList.length },
            { id: "tanah", label: "Kesehatan tanah", count: tanahList.length },
            { id: "observasi", label: "Observasi", count: obsList.length },
          ]}
        />
      </div>

      {tab === "ringkasan" ? (
        <section role="tabpanel" id="panel-ringkasan" aria-labelledby="tab-ringkasan" className="flex flex-col gap-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Riwayat tanam" value={riwayatList.length} icon={<Leaf className="size-5" />} hint={tanamanTerakhir ? `Terakhir: ${tanamanTerakhir.cropName}` : "Belum ada riwayat"} />
            <StatCard label="Hasil uji tanah" value={tanahList.length} icon={<Droplets className="size-5" />} hint={ujiTerakhir ? `Terakhir ${formatTanggal(ujiTerakhir.testDate)}` : "Belum ada uji tanah"} />
            <StatCard label="Observasi" value={obsList.length} icon={<ListChecks className="size-5" />} hint="Hama, penyakit, pertumbuhan, cuaca" />
            <StatCard label="Pengingat aktif" value={pengingatPetak.filter((item) => !item.isDone).length} icon={<CalendarDays className="size-5" />} hint="Untuk petak ini" />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <SectionTitle>Tanaman terakhir</SectionTitle>
              {tanamanTerakhir ? (
                <div className="rounded-xl bg-soil-50 p-3.5">
                  <p className="flex flex-wrap items-center gap-2 text-sm font-bold text-soil-900">
                    {tanamanTerakhir.cropName}
                    <StatusBadge meta={STATUS_TANAM[tanamanTerakhir.status] ?? { label: tanamanTerakhir.status, tone: "netral" }} />
                  </p>
                  <p className="mt-1 text-xs text-soil-600">
                    Tanam {formatTanggal(tanamanTerakhir.plantDate)}
                    {tanamanTerakhir.harvestDate ? ` · panen ${formatTanggal(tanamanTerakhir.harvestDate)}` : ""}
                    {tanamanTerakhir.familyName ? ` · keluarga ${tanamanTerakhir.familyName}` : ""}
                  </p>
                  {tanamanTerakhir.notes ? <p className="mt-1.5 text-xs text-soil-500">{tanamanTerakhir.notes}</p> : null}
                  <Link href="/rotasi" className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-moss-700 underline decoration-moss-300 underline-offset-2">
                    <RefreshCw className="size-4" aria-hidden="true" /> Minta saran rotasi untuk petak ini
                  </Link>
                </div>
              ) : (
                <EmptyState
                  icon={<Leaf className="size-6" />}
                  title="Belum ada riwayat"
                  description="Catat penanaman pertama agar perencana rotasi punya bahan pembanding."
                  action={<Button onClick={() => { setUbahTanam(null); setDialog("tanam"); }}>Catat tanaman</Button>}
                />
              )}
            </Card>

            <Card>
              <SectionTitle>Uji tanah terakhir</SectionTitle>
              {ujiTerakhir ? (
                <div className="rounded-xl bg-soil-50 p-3.5">
                  <p className="text-sm font-bold text-soil-900">{formatTanggal(ujiTerakhir.testDate)}</p>
                  <dl className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {[
                      { label: "pH", value: ujiTerakhir.ph },
                      { label: "N", value: ujiTerakhir.nitrogen },
                      { label: "P", value: ujiTerakhir.phosphorus },
                      { label: "K", value: ujiTerakhir.potassium },
                      { label: "Organik", value: ujiTerakhir.organicMatter },
                    ].map((item) => (
                      <div key={item.label} className="rounded-lg bg-white px-2.5 py-2 ring-1 ring-soil-100">
                        <dt className="text-[11px] font-semibold uppercase text-soil-500">{item.label}</dt>
                        <dd className="text-sm font-bold text-soil-900">{item.value === null ? "—" : item.value}</dd>
                      </div>
                    ))}
                  </dl>
                  <p className="mt-2 text-xs text-soil-500">
                    {ujiTerakhir.source ? `Sumber: ${ujiTerakhir.source}` : "Sumber tidak dicatat"}
                    {ujiTerakhir.method ? ` · Metode: ${ujiTerakhir.method}` : ""}
                  </p>
                </div>
              ) : (
                <EmptyState
                  icon={<Droplets className="size-6" />}
                  title="Belum ada hasil uji tanah"
                  description="Simpan hasil uji tanah bila Anda sudah melakukannya. Nilai yang tidak diukur boleh dikosongkan."
                  action={<Button variant="kedua" onClick={() => { setUbahTanah(null); setDialog("tanah"); }}>Catat hasil uji</Button>}
                />
              )}
              <InfoNote className="mt-3">
                Rotanami menampilkan hasil uji apa adanya dan tidak memberi diagnosis atau rekomendasi pemupukan presisi.
              </InfoNote>
            </Card>
          </div>

          <Card>
            <SectionTitle
              action={
                <Button variant="kedua" size="sm" icon={<Plus className="size-4" aria-hidden="true" />} onClick={() => setDialog("pengingat")}>
                  Pengingat
                </Button>
              }
            >
              Rencana & pengingat petak ini
            </SectionTitle>
            {rencanaPetak.length === 0 && pengingatPetak.length === 0 ? (
              <EmptyState
                icon={<CalendarDays className="size-6" />}
                title="Belum ada rencana atau pengingat"
                description="Simpan rencana rotasi dari halaman Rotasi, atau buat pengingat sendiri untuk petak ini."
                action={
                  <Link href="/rotasi">
                    <Button variant="kedua">Buka perencana rotasi</Button>
                  </Link>
                }
              />
            ) : (
              <div className="flex flex-col gap-3">
                {rencanaPetak.length > 0 ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {rencanaPetak.map((item) => (
                      <PlanCard key={item.id} plan={item} onCancel={() => void batalkanRencana(item)} onDelete={() => setHapus({ jenis: "rencana", id: item.id, nama: `rencana ${item.cropName}` })} />
                    ))}
                  </div>
                ) : null}
                <ul className="flex flex-col gap-2">
                  {pengingatPetak.map((item) => (
                    <ReminderRow
                      key={item.id}
                      reminder={item}
                      onToggle={() => void togglePengingat(item)}
                      onDelete={() => setHapus({ jenis: "pengingat", id: item.id, nama: item.title })}
                    />
                  ))}
                </ul>
              </div>
            )}
          </Card>
        </section>
      ) : null}

      {tab === "riwayat" ? (
        <section role="tabpanel" id="panel-riwayat" aria-labelledby="tab-riwayat" className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-soil-600">Diurutkan dari yang terbaru. Setiap siklus disimpan sebagai baris terpisah.</p>
            <Button size="sm" icon={<Plus className="size-4" aria-hidden="true" />} onClick={() => { setUbahTanam(null); setDialog("tanam"); }}>
              Catat tanaman
            </Button>
          </div>
          {riwayat.error ? <ErrorNote>{riwayat.error}</ErrorNote> : null}
          {riwayat.loading && riwayatList.length === 0 ? <Spinner label="Memuat riwayat tanam…" /> : null}
          {riwayatList.length === 0 && !riwayat.loading ? (
            <Card>
              <EmptyState
                icon={<Leaf className="size-6" />}
                title="Belum ada riwayat tanam"
                description="Catat tanaman yang sedang atau pernah tumbuh di petak ini, termasuk yang masih direncanakan."
                action={<Button onClick={() => { setUbahTanam(null); setDialog("tanam"); }}>Catat tanaman pertama</Button>}
              />
            </Card>
          ) : (
            <ul className="flex flex-col gap-2">
              {riwayatList.map((item) => (
                <PlantingRow
                  key={item.id}
                  planting={item}
                  onEdit={() => { setUbahTanam(item); setDialog("tanam"); }}
                  onDelete={() => setHapus({ jenis: "tanam", id: item.id, nama: item.cropName })}
                />
              ))}
            </ul>
          )}
        </section>
      ) : null}

      {tab === "tanah" ? (
        <section role="tabpanel" id="panel-tanah" aria-labelledby="tab-tanah" className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-soil-600">Semua nilai hasil tes opsional kecuali tanggal dan petak. Nilai kosong berarti tidak diukur.</p>
            <Button size="sm" icon={<Plus className="size-4" aria-hidden="true" />} onClick={() => { setUbahTanah(null); setDialog("tanah"); }}>
              Catat hasil uji
            </Button>
          </div>
          {tanah.error ? <ErrorNote>{tanah.error}</ErrorNote> : null}
          {tanah.loading && tanahList.length === 0 ? <Spinner label="Memuat hasil uji tanah…" /> : null}

          {tanahList.length === 0 ? (
            <Card>
              <EmptyState
                icon={<Droplets className="size-6" />}
                title="Belum ada hasil uji tanah"
                description="Simpan hasil uji dari laboratorium, kit uji sederhana, atau pH meter Anda. Rotanami tidak mengarang nilai yang tidak Anda masukkan."
                action={<Button onClick={() => { setUbahTanah(null); setDialog("tanah"); }}>Catat hasil uji tanah</Button>}
              />
            </Card>
          ) : (
            <>
              {trenTanah.length >= 2 ? (
                <Card>
                  <SectionTitle>Tren hasil uji tanah</SectionTitle>
                  <div className="grid gap-5 lg:grid-cols-2">
                    <figure>
                      <figcaption className="mb-2 text-xs font-semibold uppercase tracking-wide text-soil-500">pH dari waktu ke waktu</figcaption>
                      <div className="h-56 w-full" role="img" aria-label={`Garis tren pH tanah petak ${plot.name} dari ${trenTanah.length} hasil uji`}>
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={trenTanah} margin={{ top: 8, right: 12, bottom: 4, left: -18 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#ece7e0" />
                            <XAxis dataKey="tanggal" tick={{ fontSize: 11, fill: "#6d5a4a" }} />
                            <YAxis domain={[0, 14]} tick={{ fontSize: 11, fill: "#6d5a4a" }} />
                            <Tooltip />
                            <Legend />
                            <Line type="monotone" dataKey="pH" stroke="#3f6b39" strokeWidth={2} dot={{ r: 3 }} connectNulls />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </figure>

                    {unsurTersedia.length > 0 ? (
                      <figure>
                        <figcaption className="mb-2 text-xs font-semibold uppercase tracking-wide text-soil-500">
                          Unsur yang pernah diukur ({unsurTersedia.length})
                        </figcaption>
                        <div className="h-56 w-full" role="img" aria-label={`Garis tren unsur hara yang terukur pada petak ${plot.name}`}>
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={trenTanah} margin={{ top: 8, right: 12, bottom: 4, left: -18 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#ece7e0" />
                              <XAxis dataKey="tanggal" tick={{ fontSize: 11, fill: "#6d5a4a" }} />
                              <YAxis tick={{ fontSize: 11, fill: "#6d5a4a" }} />
                              <Tooltip />
                              <Legend />
                              {unsurTersedia.includes("nitrogen") ? <Line type="monotone" dataKey="N" name="Nitrogen (N)" stroke="#b8522a" strokeWidth={2} connectNulls /> : null}
                              {unsurTersedia.includes("phosphorus") ? <Line type="monotone" dataKey="P" name="Fosfor (P)" stroke="#1f4d70" strokeWidth={2} connectNulls /> : null}
                              {unsurTersedia.includes("potassium") ? <Line type="monotone" dataKey="K" name="Kalium (K)" stroke="#56874a" strokeWidth={2} connectNulls /> : null}
                              {unsurTersedia.includes("organicMatter") ? <Line type="monotone" dataKey="Organik" name="Bahan organik" stroke="#86715d" strokeWidth={2} connectNulls /> : null}
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                        <p className="mt-2 text-xs text-soil-500">
                          Satuan tidak diseragamkan oleh Rotanami; bandingkan hanya hasil dengan satuan dan metode yang sama.
                        </p>
                      </figure>
                    ) : null}
                  </div>
                </Card>
              ) : (
                <InfoNote>
                  Tren sederhana akan ditampilkan setelah ada minimal dua hasil uji tanah pada petak ini. Saat ini baru ada{" "}
                  {tanahList.length} hasil.
                </InfoNote>
              )}

              <ul className="flex flex-col gap-2">
                {tanahList.map((item) => (
                  <SoilTestRow
                    key={item.id}
                    test={item}
                    onEdit={() => { setUbahTanah(item); setDialog("tanah"); }}
                    onDelete={() => setHapus({ jenis: "tanah", id: item.id, nama: formatTanggal(item.testDate) })}
                  />
                ))}
              </ul>
            </>
          )}
        </section>
      ) : null}

      {tab === "observasi" ? (
        <section role="tabpanel" id="panel-observasi" aria-labelledby="tab-observasi" className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-soil-600">
              Catatan hama dan penyakit di petak ini ikut dibaca perencana rotasi sebagai bahan pertimbangan.
            </p>
            <Button size="sm" icon={<Plus className="size-4" aria-hidden="true" />} onClick={() => { setUbahObs(null); setDialog("observasi"); }}>
              Catat observasi
            </Button>
          </div>
          {observasi.error ? <ErrorNote>{observasi.error}</ErrorNote> : null}
          {observasi.loading && obsList.length === 0 ? <Spinner label="Memuat observasi…" /> : null}
          {obsList.length === 0 && !observasi.loading ? (
            <Card>
              <EmptyState
                icon={<ListChecks className="size-6" />}
                title="Belum ada catatan observasi"
                description="Catat apa yang Anda lihat di petak: hama, penyakit, pertumbuhan, atau cuaca. Tuliskan pengamatan, bukan kesimpulan."
                action={<Button onClick={() => { setUbahObs(null); setDialog("observasi"); }}>Catat observasi</Button>}
              />
            </Card>
          ) : (
            <ul className="flex flex-col gap-2">
              {obsList.map((item) => (
                <ObservationRow
                  key={item.id}
                  observation={item}
                  onEdit={() => { setUbahObs(item); setDialog("observasi"); }}
                  onDelete={() => setHapus({ jenis: "observasi", id: item.id, nama: "observasi" })}
                />
              ))}
            </ul>
          )}
        </section>
      ) : null}

      <PlotFormDialog open={dialog === "petak"} onClose={() => setDialog(null)} farmId={plot.farmId} plot={plot} onSaved={muatUlang} />
      <PlantingFormDialog
        open={dialog === "tanam"}
        onClose={() => setDialog(null)}
        plots={[plot]}
        crops={katalog.data?.crops ?? []}
        seasons={profil.data?.seasons ?? []}
        planting={ubahTanam}
        fixedPlotId={plotId}
        onSaved={muatUlang}
      />
      <SoilTestFormDialog
        open={dialog === "tanah"}
        onClose={() => setDialog(null)}
        plots={[plot]}
        soilTest={ubahTanah}
        fixedPlotId={plotId}
        onSaved={muatUlang}
      />
      <ObservationFormDialog
        open={dialog === "observasi"}
        onClose={() => setDialog(null)}
        plots={[plot]}
        plantings={riwayatList}
        observation={ubahObs}
        fixedPlotId={plotId}
        onSaved={muatUlang}
      />
      <ReminderFormDialog
        open={dialog === "pengingat"}
        onClose={() => setDialog(null)}
        farmId={plot.farmId}
        plots={[plot]}
        onSaved={muatUlang}
      />

      <ConfirmDialog
        open={Boolean(hapus)}
        onClose={() => setHapus(null)}
        onConfirm={() => void jalankanHapus()}
        submitting={menghapus}
        error={errorHapus}
        title={
          hapus?.jenis === "petak"
            ? "Hapus petak ini?"
            : hapus?.jenis === "tanam"
              ? "Hapus catatan tanam ini?"
              : hapus?.jenis === "tanah"
                ? "Hapus hasil uji tanah ini?"
                : hapus?.jenis === "observasi"
                  ? "Hapus catatan observasi ini?"
                  : hapus?.jenis === "rencana"
                    ? "Hapus rencana rotasi ini?"
                    : "Hapus pengingat ini?"
        }
        requireName={hapus?.jenis === "petak" ? hapus.nama : null}
        confirmLabel="Hapus"
        description={
          hapus?.jenis === "petak" ? (
            <span>
              Petak <strong>{hapus.nama}</strong> beserta seluruh riwayat tanam, hasil uji tanah, observasi, dan rencana
              rotasinya akan dihapus permanen.
            </span>
          ) : (
            <span>
              Data <strong>{hapus?.nama}</strong> akan dihapus permanen dari catatan kebun Anda.
            </span>
          )
        }
      />

      {pengingatPetak.some((item) => !item.isDone && item.dueDate < new Date().toISOString().slice(0, 10)) ? (
        <p className="mt-4 flex items-center gap-2 text-xs text-clay-700">
          <Badge tone="perhatian">Perhatian</Badge> Ada pengingat petak ini yang tanggalnya sudah lewat.
        </p>
      ) : null}
      {tanamanTerakhir && !tanamanTerakhir.harvestDate && tanamanTerakhir.status === "ditanam" ? (
        <p className="mt-2 flex items-center gap-2 text-xs text-soil-600">
          <Badge tone="info">Info</Badge> Tanaman sedang tumbuh ({labelSelisih(tanamanTerakhir.plantDate)} sejak tanam).
          Tanggal panen belum dicatat.
        </p>
      ) : null}
    </>
  );
}
