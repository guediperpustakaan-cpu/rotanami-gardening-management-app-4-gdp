"use client";

import { useMemo, useState } from "react";
import { LayoutGrid, Plus, Search } from "lucide-react";
import { api, useApi } from "@/lib/api";
import { useShell } from "@/components/shell";
import {
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  ErrorNote,
  Input,
  PageHeader,
  Spinner,
  useToast,
} from "@/components/ui";
import { PlotFormDialog } from "@/components/forms";
import { PlotCard } from "@/components/cards";
import type { PlotDto } from "@/lib/types";

export default function DaftarPetakPage() {
  const { activeFarm, activeFarmId } = useShell();
  const toast = useToast();
  const [cari, setCari] = useState("");
  const [dialog, setDialog] = useState(false);
  const [ubah, setUbah] = useState<PlotDto | null>(null);
  const [hapus, setHapus] = useState<PlotDto | null>(null);
  const [menghapus, setMenghapus] = useState(false);
  const [errorHapus, setErrorHapus] = useState<string | null>(null);

  const sumber = useApi<{ plots: PlotDto[] }>(activeFarmId ? `/petak?farmId=${activeFarmId}` : null, [activeFarmId]);

  const daftar = useMemo(() => {
    const list = sumber.data?.plots ?? [];
    const q = cari.trim().toLowerCase();
    return q
      ? list.filter((plot) => plot.name.toLowerCase().includes(q) || (plot.soilType ?? "").toLowerCase().includes(q))
      : list;
  }, [sumber.data, cari]);

  async function hapusPetak(confirmName: string) {
    if (!hapus) return;
    setMenghapus(true);
    setErrorHapus(null);
    try {
      await api(`/petak/${hapus.id}`, { method: "DELETE", body: { confirmName } });
      toast.push(`Petak “${hapus.name}” dihapus.`, "sukses");
      setHapus(null);
      sumber.reload();
    } catch (error) {
      setErrorHapus(error instanceof Error ? error.message : "Gagal menghapus petak.");
    } finally {
      setMenghapus(false);
    }
  }

  if (!activeFarmId) {
    return (
      <>
        <PageHeader title="Petak kebun" description="Daftar semua petak atau bedeng pada kebun aktif." />
        <Card>
          <EmptyState
            icon={<LayoutGrid className="size-6" />}
            title="Belum ada kebun aktif"
            description="Buat kebun terlebih dahulu dari halaman Beranda atau Pengaturan."
          />
        </Card>
      </>
    );
  }

  return (
    <>
      <PageHeader
        eyebrow={activeFarm?.name}
        title="Petak kebun"
        description="Setiap petak menyimpan riwayat tanam, hasil uji tanah, dan catatan observasinya sendiri."
        actions={
          <Button
            icon={<Plus className="size-4" aria-hidden="true" />}
            onClick={() => {
              setUbah(null);
              setDialog(true);
            }}
          >
            Tambah petak
          </Button>
        }
      />

      {activeFarm?.isDemo ? (
        <p className="mb-3 text-sm text-clay-800">
          Kebun ini berisi <strong>data contoh</strong>. Anda bebas mengubah atau menghapusnya.
        </p>
      ) : null}

      <div className="mb-4 max-w-sm">
        <label htmlFor="cari-petak" className="label-kecil mb-1.5 block">
          Cari petak
        </label>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-soil-400" aria-hidden="true" />
          <Input
            id="cari-petak"
            className="pl-9"
            placeholder="Nama petak atau jenis tanah"
            value={cari}
            onChange={(event) => setCari(event.target.value)}
          />
        </div>
      </div>

      {sumber.error ? <ErrorNote className="mb-4">{sumber.error}</ErrorNote> : null}
      {sumber.loading && !sumber.data ? <Spinner label="Memuat daftar petak…" /> : null}

      {sumber.data ? (
        daftar.length === 0 ? (
          <Card>
            <EmptyState
              icon={<LayoutGrid className="size-6" />}
              title={cari ? "Tidak ada petak yang cocok" : "Belum ada petak"}
              description={
                cari
                  ? `Tidak ada petak yang cocok dengan kata kunci “${cari}”. Coba kata kunci lain.`
                  : "Tambahkan petak atau bedeng untuk mulai mencatat riwayat tanam, uji tanah, dan observasi."
              }
              action={
                cari ? (
                  <Button variant="kedua" onClick={() => setCari("")}>
                    Bersihkan pencarian
                  </Button>
                ) : (
                  <Button
                    icon={<Plus className="size-4" aria-hidden="true" />}
                    onClick={() => {
                      setUbah(null);
                      setDialog(true);
                    }}
                  >
                    Tambah petak
                  </Button>
                )
              }
            />
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {daftar.map((plot) => (
              <PlotCard
                key={plot.id}
                plot={plot}
                onEdit={() => {
                  setUbah(plot);
                  setDialog(true);
                }}
                onDelete={() => {
                  setErrorHapus(null);
                  setHapus(plot);
                }}
              />
            ))}
          </div>
        )
      ) : null}

      <PlotFormDialog open={dialog} onClose={() => setDialog(false)} farmId={activeFarmId} plot={ubah} onSaved={sumber.reload} />
      <ConfirmDialog
        open={Boolean(hapus)}
        onClose={() => setHapus(null)}
        onConfirm={(name) => void hapusPetak(name)}
        title="Hapus petak ini?"
        requireName={hapus?.name ?? null}
        confirmLabel="Hapus petak"
        submitting={menghapus}
        error={errorHapus}
        description={
          <span>
            Petak <strong>{hapus?.name}</strong> beserta riwayat tanam, hasil uji tanah, observasi, dan rencana rotasinya
            akan dihapus permanen.
          </span>
        }
      />
    </>
  );
}
