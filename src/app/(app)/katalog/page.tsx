"use client";

import { useEffect, useMemo, useState } from "react";
import { BookOpen, Copy, Plus, Search } from "lucide-react";
import { api, useApi } from "@/lib/api";
import { useShell } from "@/components/shell";
import {
  Badge,
  Button,
  Card,
  Checkbox,
  ConfirmDialog,
  EmptyState,
  ErrorNote,
  Field,
  InfoNote,
  Input,
  PageHeader,
  Select,
  Spinner,
  useToast,
} from "@/components/ui";
import { CropFormDialog, FamilyFormDialog } from "@/components/forms";
import { CropRow } from "@/components/cards";
import type { CropDto, FamilyDto } from "@/lib/types";

export default function KatalogPage() {
  const { activeFarm, activeFarmId } = useShell();
  const toast = useToast();
  const [cari, setCari] = useState("");
  const [cariTerpakai, setCariTerpakai] = useState("");
  const [familyId, setFamilyId] = useState("");
  const [hanyaMilikSaya, setHanyaMilikSaya] = useState(false);
  const [dialog, setDialog] = useState<null | "tanaman" | "keluarga">(null);
  const [ubah, setUbah] = useState<CropDto | null>(null);
  const [hapus, setHapus] = useState<CropDto | null>(null);
  const [menghapus, setMenghapus] = useState(false);
  const [errorHapus, setErrorHapus] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setCariTerpakai(cari.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [cari]);

  const query = useMemo(() => {
    if (!activeFarmId) return null;
    const params = new URLSearchParams({ farmId: activeFarmId });
    if (cariTerpakai) params.set("q", cariTerpakai);
    if (familyId) params.set("familyId", familyId);
    if (hanyaMilikSaya) params.set("mine", "1");
    return `/katalog/tanaman?${params.toString()}`;
  }, [activeFarmId, cariTerpakai, familyId, hanyaMilikSaya]);

  const sumber = useApi<{ crops: CropDto[]; total: number }>(query, [query]);
  const keluarga = useApi<{ families: FamilyDto[] }>("/katalog/keluarga", []);

  async function salin(crop: CropDto) {
    if (!activeFarmId) return;
    try {
      await api(`/katalog/tanaman/${crop.id}/salin?farmId=${activeFarmId}`, { method: "POST" });
      toast.push(`“${crop.name}” disalin ke katalog kebun Anda dan kini dapat diubah.`, "sukses");
      sumber.reload();
    } catch (error) {
      toast.push(error instanceof Error ? error.message : "Gagal menyalin tanaman.", "bahaya");
    }
  }

  async function hapusTanaman(confirmName: string) {
    if (!hapus) return;
    setMenghapus(true);
    setErrorHapus(null);
    try {
      await api(`/katalog/tanaman/${hapus.id}`, { method: "DELETE", body: { confirmName } });
      toast.push(`Tanaman “${hapus.name}” dihapus.`, "sukses");
      setHapus(null);
      sumber.reload();
    } catch (error) {
      setErrorHapus(error instanceof Error ? error.message : "Gagal menghapus tanaman.");
    } finally {
      setMenghapus(false);
    }
  }

  const daftar = sumber.data?.crops ?? [];

  return (
    <>
      <PageHeader
        eyebrow={activeFarm?.name}
        title="Katalog tanaman"
        description="Daftar tanaman yang dapat dipilih saat mencatat riwayat tanam atau membuat rencana rotasi. Katalog disimpan di database, jadi Anda bebas menambah dan mengembangkannya."
        actions={
          <>
            <Button
              icon={<Plus className="size-4" aria-hidden="true" />}
              onClick={() => {
                setUbah(null);
                setDialog("tanaman");
              }}
              disabled={!activeFarmId}
            >
              Tambah tanaman
            </Button>
            <Button variant="kedua" icon={<Plus className="size-4" aria-hidden="true" />} onClick={() => setDialog("keluarga")}>
              Tambah keluarga botani
            </Button>
          </>
        }
      />

      <Card className="mb-4">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,16rem)]">
          <Field label="Cari tanaman" htmlFor="cari-tanaman" hint="Cocokkan nama umum atau nama ilmiah">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-soil-400" aria-hidden="true" />
              <Input
                id="cari-tanaman"
                className="pl-9"
                placeholder="Contoh: kacang, tomat, Ocimum"
                value={cari}
                onChange={(event) => setCari(event.target.value)}
              />
            </div>
          </Field>
          <Field label="Filter keluarga botani" htmlFor="filter-keluarga">
            <Select id="filter-keluarga" value={familyId} onChange={(event) => setFamilyId(event.target.value)}>
              <option value="">Semua keluarga</option>
              {(keluarga.data?.families ?? []).map((family) => (
                <option key={family.id} value={family.id}>
                  {family.name}
                  {family.rotationGroup ? ` · ${family.rotationGroup}` : ""} ({family.cropCount})
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <Checkbox
            label="Hanya tanaman kebun saya"
            description="Sembunyikan tanaman contoh bawaan"
            checked={hanyaMilikSaya}
            onChange={(event) => setHanyaMilikSaya(event.target.checked)}
          />
          <div className="flex flex-wrap items-center gap-2 text-xs text-soil-600">
            <Badge tone="netral">{daftar.length} tanaman ditampilkan</Badge>
            <Badge tone="perhatian">{daftar.filter((crop) => crop.isDemo).length} data contoh</Badge>
            <Badge tone="sukses">{daftar.filter((crop) => crop.editable).length} milik kebun ini</Badge>
          </div>
        </div>
      </Card>

      <InfoNote className="mb-4">
        Tanaman bertanda <strong>Data contoh</strong> adalah bawaan aplikasi dan tidak dapat diubah agar tetap tersedia
        untuk semua pengguna. Gunakan <strong>Salin ke kebun saya</strong> untuk membuat salinan yang bisa Anda ubah.
      </InfoNote>

      {sumber.error ? <ErrorNote className="mb-4">{sumber.error}</ErrorNote> : null}
      {sumber.loading && daftar.length === 0 ? <Spinner label="Memuat katalog tanaman…" /> : null}

      {sumber.data && daftar.length === 0 ? (
        <Card>
          <EmptyState
            icon={<BookOpen className="size-6" />}
            title={cariTerpakai || familyId ? "Tidak ada tanaman yang cocok" : "Katalog masih kosong"}
            description={
              cariTerpakai || familyId
                ? "Coba ubah kata kunci atau pilih keluarga botani lain."
                : "Tambahkan tanaman pertama Anda ke katalog kebun."
            }
            action={
              cariTerpakai || familyId ? (
                <Button
                  variant="kedua"
                  onClick={() => {
                    setCari("");
                    setFamilyId("");
                  }}
                >
                  Bersihkan filter
                </Button>
              ) : (
                <Button onClick={() => { setUbah(null); setDialog("tanaman"); }}>Tambah tanaman</Button>
              )
            }
          />
        </Card>
      ) : (
        <ul className="flex flex-col gap-2">
          {daftar.map((crop) => (
            <CropRow
              key={crop.id}
              crop={crop}
              onCopy={crop.isDemo && activeFarmId ? () => void salin(crop) : undefined}
              onEdit={crop.editable ? () => { setUbah(crop); setDialog("tanaman"); } : undefined}
              onDelete={crop.editable ? () => { setErrorHapus(null); setHapus(crop); } : undefined}
            />
          ))}
        </ul>
      )}

      {activeFarmId ? (
        <CropFormDialog
          open={dialog === "tanaman"}
          onClose={() => setDialog(null)}
          farmId={activeFarmId}
          families={keluarga.data?.families ?? []}
          crop={ubah}
          onSaved={() => {
            sumber.reload();
            keluarga.reload();
          }}
        />
      ) : null}
      <FamilyFormDialog
        open={dialog === "keluarga"}
        onClose={() => setDialog(null)}
        onSaved={() => {
          keluarga.reload();
          sumber.reload();
        }}
      />
      <ConfirmDialog
        open={Boolean(hapus)}
        onClose={() => setHapus(null)}
        onConfirm={(name) => void hapusTanaman(name)}
        title="Hapus tanaman ini?"
        requireName={hapus?.name ?? null}
        confirmLabel="Hapus tanaman"
        submitting={menghapus}
        error={errorHapus}
        description={
          <span>
            Tanaman <strong>{hapus?.name}</strong> akan dihapus dari katalog kebun Anda. Bila sudah dipakai pada riwayat
            tanam, penghapusan ditolak agar jejak data tetap utuh.
          </span>
        }
      />
    </>
  );
}
