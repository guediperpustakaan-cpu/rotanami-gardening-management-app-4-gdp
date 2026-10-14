"use client";

import { useState } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CalendarRange, Download, KeyRound, Leaf, LogOut, Pencil, Plus, Trash2, UserRound } from "lucide-react";
import { ApiClientError, api, unduhCsv, useApi } from "@/lib/api";
import { useShell } from "@/components/shell";
import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  DemoBadge,
  EmptyState,
  ErrorNote,
  Field,
  InfoNote,
  Input,
  PageHeader,
  SectionTitle,
  Spinner,
  useToast,
} from "@/components/ui";
import { FarmFormDialog, SeasonFormDialog } from "@/components/forms";
import { changePasswordSchema, profileSchema } from "@/lib/schemas";
import { formatTanggal } from "@/lib/format";
import type { FarmDto, SeasonDto } from "@/lib/types";

type NilaiProfil = { name: string; email: string; timezone: string };
type NilaiSandi = { currentPassword: string; newPassword: string };

export default function PengaturanPage() {
  const { user, farms, activeFarm, activeFarmId, setActiveFarm, refreshFarms } = useShell();
  const toast = useToast();
  const [pesanProfil, setPesanProfil] = useState<string | null>(null);
  const [pesanSandi, setPesanSandi] = useState<string | null>(null);
  const [dialogKebun, setDialogKebun] = useState<null | "baru" | "ubah">(null);
  const [kebunDipilih, setKebunDipilih] = useState<FarmDto | null>(null);
  const [dialogMusim, setDialogMusim] = useState(false);
  const [ubahMusim, setUbahMusim] = useState<SeasonDto | null>(null);
  const [hapusKebun, setHapusKebun] = useState<FarmDto | null>(null);
  const [hapusMusim, setHapusMusim] = useState<SeasonDto | null>(null);
  const [menghapus, setMenghapus] = useState(false);
  const [errorHapus, setErrorHapus] = useState<string | null>(null);
  const [memuatContoh, setMemuatContoh] = useState(false);
  const [mengganti, setMengganti] = useState<string | null>(null);

  const musim = useApi<{ seasons: SeasonDto[] }>(activeFarmId ? `/musim?farmId=${activeFarmId}` : null, [activeFarmId]);

  const profil = useForm<NilaiProfil>({
    resolver: zodResolver(profileSchema) as unknown as Resolver<NilaiProfil>,
    values: { name: user.name, email: user.email, timezone: user.timezone },
  });
  const sandi = useForm<NilaiSandi>({
    resolver: zodResolver(changePasswordSchema) as unknown as Resolver<NilaiSandi>,
    defaultValues: { currentPassword: "", newPassword: "" },
  });

  async function simpanProfil(data: NilaiProfil) {
    setPesanProfil(null);
    try {
      await api("/auth/profil", { method: "PATCH", body: data });
      toast.push("Profil diperbarui.", "sukses");
      window.location.reload();
    } catch (error) {
      setPesanProfil(error instanceof Error ? error.message : "Gagal memperbarui profil.");
    }
  }

  async function gantiSandi(data: NilaiSandi) {
    setPesanSandi(null);
    try {
      await api("/auth/kata-sandi", { method: "POST", body: data });
      toast.push("Kata sandi berhasil diganti.", "sukses");
      sandi.reset({ currentPassword: "", newPassword: "" });
    } catch (error) {
      if (error instanceof ApiClientError) {
        setPesanSandi(error.message);
        for (const [key, message] of Object.entries(error.fields)) sandi.setError(key as "currentPassword", { type: "server", message });
        return;
      }
      setPesanSandi(error instanceof Error ? error.message : "Gagal mengganti kata sandi.");
    }
  }

  async function muatKebunContoh() {
    setMemuatContoh(true);
    try {
      const hasil = await api<{ farms: FarmDto[] }>("/kebun/contoh", { method: "POST" });
      refreshFarms(hasil.farms);
      toast.push("Kebun contoh berhasil dimuat. Semua isinya berlabel “Data contoh”.", "info");
      window.location.assign("/");
    } catch (error) {
      toast.push(error instanceof Error ? error.message : "Gagal memuat kebun contoh.", "bahaya");
    } finally {
      setMemuatContoh(false);
    }
  }

  async function hapusKebunSekarang(confirmName: string) {
    if (!hapusKebun) return;
    setMenghapus(true);
    setErrorHapus(null);
    try {
      const hasil = await api<{ farms: FarmDto[] }>(`/kebun/${hapusKebun.id}`, { method: "DELETE", body: { confirmName } });
      refreshFarms(hasil.farms);
      toast.push(`Kebun “${hapusKebun.name}” dan seluruh datanya dihapus.`, "sukses");
      setHapusKebun(null);
      window.location.reload();
    } catch (error) {
      setErrorHapus(error instanceof Error ? error.message : "Gagal menghapus kebun.");
    } finally {
      setMenghapus(false);
    }
  }

  async function hapusMusimSekarang() {
    if (!hapusMusim) return;
    setMenghapus(true);
    try {
      await api(`/musim/${hapusMusim.id}`, { method: "DELETE" });
      toast.push("Musim dihapus. Riwayat tanam yang terhubung tetap tersimpan tanpa musim.", "info");
      setHapusMusim(null);
      musim.reload();
    } catch (error) {
      toast.push(error instanceof Error ? error.message : "Gagal menghapus musim.", "bahaya");
    } finally {
      setMenghapus(false);
    }
  }

  async function keluar() {
    try {
      await api("/auth/keluar", { method: "POST" });
    } finally {
      window.location.assign("/masuk");
    }
  }

  return (
    <>
      <PageHeader
        title="Pengaturan"
        description="Kelola profil Anda, kebun, musim, ekspor data, dan lihat keterbatasan aplikasi."
        actions={
          <Button variant="kedua" icon={<LogOut className="size-4" aria-hidden="true" />} onClick={() => void keluar()}>
            Keluar
          </Button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <SectionTitle>Profil pengguna</SectionTitle>
          {pesanProfil ? <ErrorNote className="mb-3">{pesanProfil}</ErrorNote> : null}
          <form className="flex flex-col gap-4" onSubmit={profil.handleSubmit(simpanProfil)} noValidate>
            <Field label="Nama" htmlFor="profil-nama" required error={profil.formState.errors.name?.message}>
              <Input id="profil-nama" invalid={Boolean(profil.formState.errors.name)} {...profil.register("name")} />
            </Field>
            <Field label="Email" htmlFor="profil-email" required error={profil.formState.errors.email?.message}>
              <Input id="profil-email" type="email" autoComplete="email" invalid={Boolean(profil.formState.errors.email)} {...profil.register("email")} />
            </Field>
            <Field label="Zona waktu" htmlFor="profil-tz" error={profil.formState.errors.timezone?.message} hint="Acuan tanggal untuk kebun Anda">
              <Input id="profil-tz" placeholder="Asia/Jakarta" {...profil.register("timezone")} />
            </Field>
            <Button type="submit" loading={profil.formState.isSubmitting} icon={<UserRound className="size-4" aria-hidden="true" />}>
              Simpan profil
            </Button>
          </form>
        </Card>

        <Card>
          <SectionTitle>Ganti kata sandi</SectionTitle>
          {pesanSandi ? <ErrorNote className="mb-3">{pesanSandi}</ErrorNote> : null}
          <form className="flex flex-col gap-4" onSubmit={sandi.handleSubmit(gantiSandi)} noValidate>
            <Field label="Kata sandi saat ini" htmlFor="sandi-lama" required error={sandi.formState.errors.currentPassword?.message}>
              <Input id="sandi-lama" type="password" autoComplete="current-password" invalid={Boolean(sandi.formState.errors.currentPassword)} {...sandi.register("currentPassword")} />
            </Field>
            <Field label="Kata sandi baru" htmlFor="sandi-baru" required error={sandi.formState.errors.newPassword?.message} hint="Minimal 8 karakter">
              <Input id="sandi-baru" type="password" autoComplete="new-password" invalid={Boolean(sandi.formState.errors.newPassword)} {...sandi.register("newPassword")} />
            </Field>
            <Button type="submit" variant="kedua" loading={sandi.formState.isSubmitting} icon={<KeyRound className="size-4" aria-hidden="true" />}>
              Ganti kata sandi
            </Button>
            <InfoNote>
              Kata sandi disimpan sebagai hash scrypt dengan salt unik. Sesi login disimpan di database dan dikirim ke
              peramban sebagai cookie HttpOnly — tidak ada token di localStorage.
            </InfoNote>
          </form>
        </Card>
      </div>

      <Card className="mt-4">
        <SectionTitle
          action={
            <>
              <Button size="sm" icon={<Plus className="size-4" aria-hidden="true" />} onClick={() => { setKebunDipilih(null); setDialogKebun("baru"); }}>
                Buat kebun
              </Button>
              <Button size="sm" variant="kedua" loading={memuatContoh} icon={<Leaf className="size-4" aria-hidden="true" />} onClick={() => void muatKebunContoh()}>
                Muat kebun contoh
              </Button>
            </>
          }
        >
          Kebun Anda
        </SectionTitle>
        {farms.length === 0 ? (
          <EmptyState
            icon={<Leaf className="size-6" />}
            title="Belum ada kebun"
            description="Buat kebun Anda sendiri atau muat kebun contoh berisi data berlabel “Data contoh”."
            action={<Button onClick={() => { setKebunDipilih(null); setDialogKebun("baru"); }}>Buat kebun</Button>}
          />
        ) : (
          <ul className="flex flex-col gap-2">
            {farms.map((farm) => (
              <li key={farm.id} className="flex flex-col gap-2 rounded-xl border border-soil-200 bg-white p-3.5 sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 text-sm font-bold text-soil-900">
                    {farm.name}
                    {farm.id === activeFarm?.id ? <Badge tone="sukses">Kebun aktif</Badge> : null}
                    {farm.isDemo ? <DemoBadge /> : null}
                    <Badge tone="netral">{farm.role}</Badge>
                  </p>
                  <p className="mt-1 text-xs text-soil-600">
                    {farm.location ?? "Lokasi tidak diisi"} · {farm.plotCount} petak · {farm.timezone} · dibuat {formatTanggal(farm.createdAt)}
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  {farm.id !== activeFarm?.id ? (
                    <Button
                      size="sm"
                      variant="kedua"
                      loading={mengganti === farm.id}
                      onClick={async () => {
                        setMengganti(farm.id);
                        await setActiveFarm(farm.id);
                        setMengganti(null);
                        window.location.reload();
                      }}
                    >
                      Jadikan aktif
                    </Button>
                  ) : null}
                  <Button
                    size="sm"
                    variant="kedua"
                    icon={<Pencil className="size-4" aria-hidden="true" />}
                    onClick={() => { setKebunDipilih(farm); setDialogKebun("ubah"); }}
                  >
                    Ubah
                  </Button>
                  {farm.role === "pemilik" ? (
                    <Button
                      size="sm"
                      variant="kedua"
                      icon={<Trash2 className="size-4" aria-hidden="true" />}
                      onClick={() => { setErrorHapus(null); setHapusKebun(farm); }}
                    >
                      Hapus
                    </Button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="mt-4">
        <SectionTitle
          action={
            <Button
              size="sm"
              icon={<Plus className="size-4" aria-hidden="true" />}
              disabled={!activeFarmId}
              onClick={() => { setUbahMusim(null); setDialogMusim(true); }}
            >
              Tambah musim
            </Button>
          }
        >
          Musim kebun aktif
        </SectionTitle>
        {!activeFarmId ? (
          <p className="text-sm text-soil-600">Pilih kebun aktif terlebih dahulu.</p>
        ) : musim.loading && !musim.data ? (
          <Spinner label="Memuat musim…" />
        ) : (musim.data?.seasons ?? []).length === 0 ? (
          <EmptyState
            icon={<CalendarRange className="size-6" />}
            title="Belum ada musim"
            description="Musim membantu mengelompokkan rencana dan riwayat tanam, misalnya “Musim hujan 2026”."
            action={<Button variant="kedua" onClick={() => { setUbahMusim(null); setDialogMusim(true); }}>Tambah musim</Button>}
          />
        ) : (
          <ul className="flex flex-col gap-2">
            {(musim.data?.seasons ?? []).map((season) => (
              <li key={season.id} className="flex flex-col gap-2 rounded-xl border border-soil-200 bg-white p-3.5 sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-soil-900">{season.name}</p>
                  <p className="mt-0.5 text-xs text-soil-600">
                    {formatTanggal(season.startDate)} – {formatTanggal(season.endDate)} · {season.planCount} rencana · {season.plantingCount} riwayat tanam
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button size="sm" variant="kedua" icon={<Pencil className="size-4" aria-hidden="true" />} onClick={() => { setUbahMusim(season); setDialogMusim(true); }}>
                    Ubah
                  </Button>
                  <Button size="sm" variant="kedua" icon={<Trash2 className="size-4" aria-hidden="true" />} onClick={() => setHapusMusim(season)}>
                    Hapus
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="mt-4">
        <SectionTitle>Ekspor data</SectionTitle>
        <p className="mb-3 text-sm text-soil-600">
          Unduh data kebun aktif dalam format CSV (dipisahkan titik koma agar sesuai Excel locale Indonesia). Ekspor PDF
          sengaja tidak disediakan karena belum dapat dibuat dengan andal di implementasi ini.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="kedua"
            icon={<Download className="size-4" aria-hidden="true" />}
            disabled={!activeFarmId}
            onClick={() => unduhCsv(`/ekspor/riwayat-tanam.csv?farmId=${activeFarmId}`, "rotanami-riwayat-tanam.csv")}
          >
            Riwayat penanaman (CSV)
          </Button>
          <Button
            variant="kedua"
            icon={<Download className="size-4" aria-hidden="true" />}
            disabled={!activeFarmId}
            onClick={() => unduhCsv(`/ekspor/uji-tanah.csv?farmId=${activeFarmId}`, "rotanami-uji-tanah.csv")}
          >
            Hasil uji tanah (CSV)
          </Button>
          <Button
            variant="kedua"
            icon={<Download className="size-4" aria-hidden="true" />}
            disabled={!activeFarmId}
            onClick={() => unduhCsv(`/ekspor/observasi.csv?farmId=${activeFarmId}`, "rotanami-observasi.csv")}
          >
            Observasi (CSV)
          </Button>
          <a
            href="/api/dokumentasi"
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-soil-300 bg-white px-4 text-sm font-semibold text-soil-800 shadow-sm hover:bg-soil-50"
          >
            Lihat dokumentasi API
          </a>
        </div>
      </Card>

      <Card className="mt-4">
        <SectionTitle>Tentang & keterbatasan</SectionTitle>
        <ul className="list-disc space-y-1.5 pl-5 text-sm text-soil-700">
          <li>Rotanami adalah nama kerja proyek ini; identitas visualnya dibuat orisinal dan tidak meniru merek lain.</li>
          <li>Saran rotasi berasal dari mesin aturan sederhana ({ENGINE_LABEL}) yang hanya membaca data yang Anda simpan. Saran bersifat panduan umum, bukan diagnosis agronomi.</li>
          <li>Rotanami tidak menampilkan masa jeda, takaran pupuk, atau klaim presisi lain yang tidak didukung data katalog dan hasil uji Anda.</li>
          <li>Pengingat hanya tampil di dalam aplikasi; tidak ada email atau push notification.</li>
          <li>Tidak ada fitur berbayar, iklan, atau integrasi komersial.</li>
          <li>Data setiap pengguna dipisahkan di level API dan database melalui kepemilikan kebun dan daftar anggota.</li>
        </ul>
      </Card>

      <FarmFormDialog
        open={dialogKebun !== null}
        onClose={() => setDialogKebun(null)}
        farm={dialogKebun === "ubah" ? kebunDipilih : null}
        onSaved={() => window.location.reload()}
      />
      {activeFarmId ? (
        <SeasonFormDialog
          open={dialogMusim}
          onClose={() => setDialogMusim(false)}
          farmId={activeFarmId}
          season={ubahMusim}
          onSaved={musim.reload}
        />
      ) : null}
      <ConfirmDialog
        open={Boolean(hapusKebun)}
        onClose={() => setHapusKebun(null)}
        onConfirm={(name) => void hapusKebunSekarang(name)}
        title="Hapus kebun ini?"
        requireName={hapusKebun?.name ?? null}
        confirmLabel="Hapus kebun"
        submitting={menghapus}
        error={errorHapus}
        description={
          <span>
            Kebun <strong>{hapusKebun?.name}</strong> beserta semua petak, riwayat tanam, hasil uji tanah, observasi,
            rencana rotasi, dan pengingatnya akan dihapus permanen.
          </span>
        }
      />
      <ConfirmDialog
        open={Boolean(hapusMusim)}
        onClose={() => setHapusMusim(null)}
        onConfirm={() => void hapusMusimSekarang()}
        title="Hapus musim ini?"
        confirmLabel="Hapus musim"
        submitting={menghapus}
        description={
          <span>
            Musim <strong>{hapusMusim?.name}</strong> akan dihapus. Riwayat tanam dan rencana yang terhubung tetap ada,
            hanya label musimnya yang hilang.
          </span>
        }
      />
    </>
  );
}

const ENGINE_LABEL = "aturan-rotasi-v1";
