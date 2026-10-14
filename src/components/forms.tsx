"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useForm, useWatch, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  cropSchema,
  familySchema,
  observationSchema,
  plantingSchema,
  plotSchema,
  reminderSchema,
  rotationPlanSchema,
  seasonSchema,
  farmCreateSchema,
  soilTestSchema,
} from "@/lib/schemas";
import { ApiClientError, api } from "@/lib/api";
import { LABEL_KATEGORI_OBSERVASI, LABEL_SATUAN_LUAS, tanggalHariIni } from "@/lib/format";
import type {
  CropDto,
  FarmDto,
  FamilyDto,
  ObservationDto,
  PlantingDto,
  PlotDto,
  ReminderDto,
  RotationPlanDto,
  SeasonDto,
  SoilTestDto,
} from "@/lib/types";
import { Button, Checkbox, ErrorNote, Field, Input, Modal, Select, Textarea, useDialogPesan, useToast } from "@/components/ui";

type DialogProps = { open: boolean; onClose: () => void; onSaved?: () => void };

function FooterActions({ formId, submitting, labelSimpan }: { formId: string; submitting: boolean; labelSimpan: string }) {
  return (
    <>
      <Button type="submit" form={formId} loading={submitting}>
        {labelSimpan}
      </Button>
    </>
  );
}

function FormError({ children }: { children: ReactNode }) {
  return <ErrorNote>{children}</ErrorNote>;
}

/* ------------------------------- kebun ---------------------------------- */

export function FarmFormDialog({ open, onClose, onSaved, farm }: DialogProps & { farm?: FarmDto | null }) {
  const toast = useToast();
  const [pesan, setPesan] = useDialogPesan(open);
  type Nilai = { name: string; location: string; timezone: string; notes: string };
  const nilaiAwal = useMemo<Nilai>(
    () => ({
      name: farm?.name ?? "",
      location: farm?.location ?? "",
      timezone: farm?.timezone ?? "Asia/Jakarta",
      notes: farm?.notes ?? "",
    }),
    [farm],
  );
  const { register, handleSubmit, reset, setError, formState } = useForm<Nilai>({
    resolver: zodResolver(farmCreateSchema) as unknown as Resolver<Nilai>,
    defaultValues: nilaiAwal,
  });
  useEffect(() => {
    if (open) {
      reset(nilaiAwal);
    }
  }, [open, nilaiAwal, reset]);

  async function onSubmit(data: Nilai) {
    setPesan(null);
    try {
      if (farm) {
        await api(`/kebun/${farm.id}`, { method: "PATCH", body: data });
        toast.push("Profil kebun diperbarui.", "sukses");
      } else {
        await api("/kebun", { method: "POST", body: data });
        toast.push("Kebun baru berhasil dibuat.", "sukses");
      }
      onSaved?.();
      onClose();
    } catch (error) {
      tangani(error, setPesan, setError);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={farm ? "Ubah profil kebun" : "Buat kebun baru"}
      description="Kebun adalah wadah untuk petak, riwayat tanam, dan catatan tanah Anda."
      footer={
        <>
          <Button variant="kedua" type="button" onClick={onClose}>
            Batal
          </Button>
          <Button type="submit" form="form-kebun" loading={formState.isSubmitting}>
            {farm ? "Simpan perubahan" : "Buat kebun"}
          </Button>
        </>
      }
    >
      <form id="form-kebun" className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
        {pesan ? <FormError>{pesan}</FormError> : null}
        <Field label="Nama kebun" htmlFor="farm-name" required error={formState.errors.name?.message}>
          <Input id="farm-name" placeholder="Contoh: Kebun belakang rumah" invalid={Boolean(formState.errors.name)} {...register("name")} />
        </Field>
        <Field label="Lokasi" htmlFor="farm-location" error={formState.errors.location?.message} hint="Boleh desa, kecamatan, atau keterangan singkat">
          <Input id="farm-location" placeholder="Contoh: Desa Sukamaju, Kecamatan Cibadak" {...register("location")} />
        </Field>
        <Field label="Zona waktu" htmlFor="farm-tz" error={formState.errors.timezone?.message} hint="Dipakai sebagai acuan tanggal di aplikasi">
          <Select id="farm-tz" {...register("timezone")}>
            {["Asia/Jakarta", "Asia/Makassar", "Asia/Jayapura", "Asia/Singapore", "UTC"].map((tz) => (
              <option key={tz} value={tz}>
                {tz}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Catatan kebun" htmlFor="farm-notes" error={formState.errors.notes?.message}>
          <Textarea id="farm-notes" placeholder="Contoh: sumber air dari sumur, sebagian lahan miring" {...register("notes")} />
        </Field>
      </form>
    </Modal>
  );
}

/* -------------------------------- petak --------------------------------- */

export function PlotFormDialog({ open, onClose, onSaved, farmId, plot }: DialogProps & { farmId: string; plot?: PlotDto | null }) {
  const toast = useToast();
  const [pesan, setPesan] = useDialogPesan(open);
  type Nilai = { farmId: string; name: string; size: string; areaUnit: string; soilType: string; notes: string };
  const nilaiAwal = useMemo<Nilai>(
    () => ({
      farmId,
      name: plot?.name ?? "",
      size: plot?.size !== null && plot?.size !== undefined ? String(plot.size) : "",
      areaUnit: plot?.areaUnit ?? "m2",
      soilType: plot?.soilType ?? "",
      notes: plot?.notes ?? "",
    }),
    [farmId, plot],
  );
  const { register, handleSubmit, reset, setError, formState } = useForm<Nilai>({
    resolver: zodResolver(plotSchema) as unknown as Resolver<Nilai>,
    defaultValues: nilaiAwal,
  });
  useEffect(() => {
    if (open) {
      reset(nilaiAwal);
    }
  }, [open, nilaiAwal, reset]);

  async function onSubmit(data: Nilai) {
    setPesan(null);
    try {
      if (plot) {
        await api(`/petak/${plot.id}`, { method: "PATCH", body: data });
        toast.push(`Petak “${data.name}” diperbarui.`, "sukses");
      } else {
        await api("/petak", { method: "POST", body: data });
        toast.push(`Petak “${data.name}” ditambahkan.`, "sukses");
      }
      onSaved?.();
      onClose();
    } catch (error) {
      tangani(error, setPesan, setError);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={plot ? "Ubah petak" : "Tambah petak"}
      description="Petak atau bedeng adalah satuan lahan yang riwayat tanamnya dicatat terpisah."
      footer={
        <>
          <Button variant="kedua" type="button" onClick={onClose}>
            Batal
          </Button>
          <FooterActions formId="form-petak" submitting={formState.isSubmitting} labelSimpan={plot ? "Simpan perubahan" : "Tambah petak"} />
        </>
      }
    >
      <form id="form-petak" className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
        {pesan ? <FormError>{pesan}</FormError> : null}
        <Field label="Nama petak" htmlFor="plot-name" required error={formState.errors.name?.message} hint="Contoh: Bedeng A — dekat sumur">
          <Input id="plot-name" placeholder="Nama petak atau bedeng" invalid={Boolean(formState.errors.name)} {...register("name")} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Ukuran" htmlFor="plot-size" error={formState.errors.size?.message} hint="Kosongkan bila belum diukur">
            <Input id="plot-size" type="text" inputMode="decimal" placeholder="Contoh: 12" {...register("size")} />
          </Field>
          <Field label="Satuan luas" htmlFor="plot-unit" error={formState.errors.areaUnit?.message}>
            <Select id="plot-unit" {...register("areaUnit")}>
              {Object.entries(LABEL_SATUAN_LUAS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <Field label="Jenis tanah" htmlFor="plot-soil" error={formState.errors.soilType?.message} hint="Isi bila Anda sudah tahu, contoh: lempung berpasir">
          <Input id="plot-soil" placeholder="Belum diketahui" {...register("soilType")} />
        </Field>
        <Field label="Catatan petak" htmlFor="plot-notes" error={formState.errors.notes?.message}>
          <Textarea id="plot-notes" placeholder="Contoh: drainase lambat saat hujan deras" {...register("notes")} />
        </Field>
      </form>
    </Modal>
  );
}

/* ------------------------------- tanaman -------------------------------- */

export function CropFormDialog({
  open,
  onClose,
  onSaved,
  farmId,
  families,
  crop,
}: DialogProps & { farmId: string; families: FamilyDto[]; crop?: CropDto | null }) {
  const toast = useToast();
  const [pesan, setPesan] = useDialogPesan(open);
  type Nilai = { name: string; scientificName: string; familyId: string; nutrientCategory: string; isCoverCrop: boolean; guideNotes: string };
  const nilaiAwal = useMemo<Nilai>(
    () => ({
      name: crop?.name ?? "",
      scientificName: crop?.scientificName ?? "",
      familyId: crop?.familyId ?? "",
      nutrientCategory: crop?.nutrientCategory ?? "",
      isCoverCrop: crop?.isCoverCrop ?? false,
      guideNotes: crop?.guideNotes ?? "",
    }),
    [crop],
  );
  const { register, handleSubmit, reset, setError, formState } = useForm<Nilai>({
    resolver: zodResolver(cropSchema) as unknown as Resolver<Nilai>,
    defaultValues: nilaiAwal,
  });
  useEffect(() => {
    if (open) {
      reset(nilaiAwal);
    }
  }, [open, nilaiAwal, reset]);

  async function onSubmit(data: Nilai) {
    setPesan(null);
    try {
      if (crop) {
        await api(`/katalog/tanaman/${crop.id}`, { method: "PATCH", body: data });
        toast.push(`Tanaman “${data.name}” diperbarui.`, "sukses");
      } else {
        await api("/katalog/tanaman", { method: "POST", body: { ...data, farmId } });
        toast.push(`Tanaman “${data.name}” ditambahkan ke katalog kebun.`, "sukses");
      }
      onSaved?.();
      onClose();
    } catch (error) {
      tangani(error, setPesan, setError);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={crop ? "Ubah tanaman" : "Tambah tanaman"}
      description="Data keluarga dan kategori hara dipakai perencana rotasi. Biarkan kosong bila tidak diketahui."
      footer={
        <>
          <Button variant="kedua" type="button" onClick={onClose}>
            Batal
          </Button>
          <FooterActions formId="form-tanaman" submitting={formState.isSubmitting} labelSimpan={crop ? "Simpan perubahan" : "Tambah tanaman"} />
        </>
      }
    >
      <form id="form-tanaman" className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
        {pesan ? <FormError>{pesan}</FormError> : null}
        <Field label="Nama umum (bahasa Indonesia)" htmlFor="crop-name" required error={formState.errors.name?.message}>
          <Input id="crop-name" placeholder="Contoh: Kacang panjang" invalid={Boolean(formState.errors.name)} {...register("name")} />
        </Field>
        <Field label="Nama ilmiah" htmlFor="crop-sci" error={formState.errors.scientificName?.message}>
          <Input id="crop-sci" placeholder="Contoh: Vigna unguiculata" {...register("scientificName")} />
        </Field>
        <Field label="Keluarga botani / kelompok rotasi" htmlFor="crop-family" error={formState.errors.familyId?.message} hint="Kosongkan bila tidak diketahui — perencana akan menyebut data ini kurang.">
          <Select id="crop-family" {...register("familyId")}>
            <option value="">Belum diketahui</option>
            {families.map((family) => (
              <option key={family.id} value={family.id}>
                {family.name}
                {family.rotationGroup ? ` · kelompok ${family.rotationGroup}` : ""}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Kategori kebutuhan hara" htmlFor="crop-nutrient" error={formState.errors.nutrientCategory?.message} hint="Perkiraan umum untuk urutan rotasi, bukan takaran pupuk.">
          <Select id="crop-nutrient" {...register("nutrientCategory")}>
            <option value="">Belum diketahui</option>
            <option value="berat">Pemakan hara berat</option>
            <option value="sedang">Pemakan hara sedang</option>
            <option value="ringan">Pemakan hara ringan</option>
            <option value="pemulih">Pemulih / penutup tanah</option>
          </Select>
        </Field>
        <Checkbox label="Dapat dipakai sebagai tanaman penutup tanah" description="Centang hanya bila Anda memang memakainya demikian." {...register("isCoverCrop")} />
        <Field label="Catatan panduan umum" htmlFor="crop-notes" error={formState.errors.guideNotes?.message}>
          <Textarea id="crop-notes" placeholder="Contoh: biasa dibibitkan dulu, tidak tahan genangan" {...register("guideNotes")} />
        </Field>
      </form>
    </Modal>
  );
}

export function FamilyFormDialog({ open, onClose, onSaved }: DialogProps) {
  const toast = useToast();
  const [pesan, setPesan] = useDialogPesan(open);
  type Nilai = { name: string; rotationGroup: string; description: string };
  const { register, handleSubmit, reset, setError, formState } = useForm<Nilai>({
    resolver: zodResolver(familySchema) as unknown as Resolver<Nilai>,
    defaultValues: { name: "", rotationGroup: "", description: "" },
  });
  useEffect(() => {
    if (open) {
      reset({ name: "", rotationGroup: "", description: "" });
    }
  }, [open, reset]);

  async function onSubmit(data: Nilai) {
    setPesan(null);
    try {
      await api("/katalog/keluarga", { method: "POST", body: data });
      toast.push(`Keluarga botani “${data.name}” ditambahkan.`, "sukses");
      onSaved?.();
      onClose();
    } catch (error) {
      tangani(error, setPesan, setError);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Tambah keluarga botani"
      size="sm"
      footer={
        <>
          <Button variant="kedua" type="button" onClick={onClose}>
            Batal
          </Button>
          <FooterActions formId="form-keluarga" submitting={formState.isSubmitting} labelSimpan="Tambah keluarga" />
        </>
      }
    >
      <form id="form-keluarga" className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
        {pesan ? <FormError>{pesan}</FormError> : null}
        <Field label="Nama keluarga botani" htmlFor="family-name" required error={formState.errors.name?.message}>
          <Input id="family-name" placeholder="Contoh: Fabaceae" invalid={Boolean(formState.errors.name)} {...register("name")} />
        </Field>
        <Field label="Kelompok rotasi" htmlFor="family-group" error={formState.errors.rotationGroup?.message} hint="Contoh: daun, buah, akar, kacang">
          <Input id="family-group" placeholder="Contoh: kacang" {...register("rotationGroup")} />
        </Field>
        <Field label="Keterangan" htmlFor="family-desc" error={formState.errors.description?.message}>
          <Textarea id="family-desc" placeholder="Anggota keluarga yang umum di kebun Anda" {...register("description")} />
        </Field>
      </form>
    </Modal>
  );
}

/* -------------------------------- musim --------------------------------- */

export function SeasonFormDialog({ open, onClose, onSaved, farmId, season }: DialogProps & { farmId: string; season?: SeasonDto | null }) {
  const toast = useToast();
  const [pesan, setPesan] = useDialogPesan(open);
  type Nilai = { farmId: string; name: string; startDate: string; endDate: string };
  const nilaiAwal = useMemo<Nilai>(
    () => ({
      farmId,
      name: season?.name ?? `Musim tanam ${new Date().getFullYear()}`,
      startDate: season?.startDate ?? tanggalHariIni(),
      endDate: season?.endDate ?? "",
    }),
    [farmId, season],
  );
  const { register, handleSubmit, reset, setError, formState } = useForm<Nilai>({
    resolver: zodResolver(seasonSchema) as unknown as Resolver<Nilai>,
    defaultValues: nilaiAwal,
  });
  useEffect(() => {
    if (open) {
      reset(nilaiAwal);
    }
  }, [open, nilaiAwal, reset]);

  async function onSubmit(data: Nilai) {
    setPesan(null);
    try {
      if (season) {
        await api(`/musim/${season.id}`, { method: "PATCH", body: data });
        toast.push("Musim diperbarui.", "sukses");
      } else {
        await api("/musim", { method: "POST", body: data });
        toast.push("Musim ditambahkan.", "sukses");
      }
      onSaved?.();
      onClose();
    } catch (error) {
      tangani(error, setPesan, setError);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={season ? "Ubah musim" : "Tambah musim"}
      size="sm"
      footer={
        <>
          <Button variant="kedua" type="button" onClick={onClose}>
            Batal
          </Button>
          <FooterActions formId="form-musim" submitting={formState.isSubmitting} labelSimpan={season ? "Simpan" : "Tambah musim"} />
        </>
      }
    >
      <form id="form-musim" className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
        {pesan ? <FormError>{pesan}</FormError> : null}
        <Field label="Nama musim" htmlFor="season-name" required error={formState.errors.name?.message} hint="Contoh: Musim hujan 2026">
          <Input id="season-name" invalid={Boolean(formState.errors.name)} {...register("name")} />
        </Field>
        <Field label="Tanggal mulai" htmlFor="season-start" required error={formState.errors.startDate?.message}>
          <Input id="season-start" type="date" {...register("startDate")} />
        </Field>
        <Field label="Tanggal selesai" htmlFor="season-end" required error={formState.errors.endDate?.message}>
          <Input id="season-end" type="date" {...register("endDate")} />
        </Field>
      </form>
    </Modal>
  );
}

/* ----------------------------- riwayat tanam ----------------------------- */

export function PlantingFormDialog({
  open,
  onClose,
  onSaved,
  plots,
  crops,
  seasons,
  planting,
  fixedPlotId,
}: DialogProps & {
  plots: PlotDto[];
  crops: CropDto[];
  seasons: SeasonDto[];
  planting?: PlantingDto | null;
  fixedPlotId?: string;
}) {
  const toast = useToast();
  const [pesan, setPesan] = useDialogPesan(open);
  type Nilai = {
    plotId: string;
    cropId: string;
    seasonId: string;
    plantDate: string;
    harvestDate: string;
    status: string;
    yieldAmount: string;
    yieldUnit: string;
    notes: string;
  };
  const nilaiAwal = useMemo<Nilai>(
    () => ({
      plotId: planting?.plotId ?? fixedPlotId ?? plots[0]?.id ?? "",
      cropId: planting?.cropId ?? "",
      seasonId: planting?.seasonId ?? "",
      plantDate: planting?.plantDate ?? tanggalHariIni(),
      harvestDate: planting?.harvestDate ?? "",
      status: planting?.status ?? "ditanam",
      yieldAmount: planting?.yieldAmount !== null && planting?.yieldAmount !== undefined ? String(planting.yieldAmount) : "",
      yieldUnit: planting?.yieldUnit ?? "",
      notes: planting?.notes ?? "",
    }),
    [planting, fixedPlotId, plots],
  );
  const { register, handleSubmit, reset, setError, formState, control } = useForm<Nilai>({
    resolver: zodResolver(plantingSchema) as unknown as Resolver<Nilai>,
    defaultValues: nilaiAwal,
  });
  useEffect(() => {
    if (open) {
      reset(nilaiAwal);
    }
  }, [open, nilaiAwal, reset]);
  const status = useWatch({ control, name: "status" });

  async function onSubmit(data: Nilai) {
    setPesan(null);
    try {
      if (planting) {
        await api(`/riwayat-tanam/${planting.id}`, { method: "PATCH", body: data });
        toast.push("Catatan tanam diperbarui.", "sukses");
      } else {
        await api("/riwayat-tanam", { method: "POST", body: data });
        toast.push("Catatan tanam tersimpan.", "sukses");
      }
      onSaved?.();
      onClose();
    } catch (error) {
      tangani(error, setPesan, setError);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={planting ? "Ubah catatan tanam" : "Catat tanaman"}
      description="Riwayat tanam disimpan per siklus sebagai baris terpisah, bukan menimpa tanaman terakhir."
      size="lg"
      footer={
        <>
          <Button variant="kedua" type="button" onClick={onClose}>
            Batal
          </Button>
          <FooterActions formId="form-tanam" submitting={formState.isSubmitting} labelSimpan={planting ? "Simpan perubahan" : "Simpan catatan"} />
        </>
      }
    >
      <form id="form-tanam" className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
        {pesan ? <FormError>{pesan}</FormError> : null}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Petak" htmlFor="planting-plot" required error={formState.errors.plotId?.message}>
            <Select id="planting-plot" disabled={Boolean(fixedPlotId)} {...register("plotId")}>
              <option value="">Pilih petak</option>
              {plots.map((plot) => (
                <option key={plot.id} value={plot.id}>
                  {plot.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Tanaman" htmlFor="planting-crop" required error={formState.errors.cropId?.message}>
            <Select id="planting-crop" {...register("cropId")}>
              <option value="">Pilih tanaman</option>
              {crops.map((crop) => (
                <option key={crop.id} value={crop.id}>
                  {crop.name}
                  {crop.familyName ? ` · ${crop.familyName}` : ""}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Tanggal tanam" htmlFor="planting-date" required error={formState.errors.plantDate?.message}>
            <Input id="planting-date" type="date" {...register("plantDate")} />
          </Field>
          <Field label="Musim" htmlFor="planting-season" error={formState.errors.seasonId?.message}>
            <Select id="planting-season" {...register("seasonId")}>
              <option value="">Tanpa musim</option>
              {seasons.map((season) => (
                <option key={season.id} value={season.id}>
                  {season.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Status" htmlFor="planting-status" required error={formState.errors.status?.message}>
            <Select id="planting-status" {...register("status")}>
              <option value="direncanakan">Direncanakan</option>
              <option value="ditanam">Sedang ditanam</option>
              <option value="dipanen">Sudah dipanen</option>
              <option value="dibatalkan">Dibatalkan</option>
            </Select>
          </Field>
          <Field
            label="Tanggal panen"
            htmlFor="planting-harvest"
            error={formState.errors.harvestDate?.message}
            hint={status === "dipanen" ? "Isi bila panen sudah terjadi" : "Isi bila panen sudah terjadi"}
          >
            <Input id="planting-harvest" type="date" {...register("harvestDate")} />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Hasil panen" htmlFor="planting-yield" error={formState.errors.yieldAmount?.message} hint="Angka saja, contoh: 4.2">
            <Input id="planting-yield" inputMode="decimal" placeholder="Belum ditimbang" {...register("yieldAmount")} />
          </Field>
          <Field label="Satuan hasil" htmlFor="planting-unit" error={formState.errors.yieldUnit?.message}>
            <Input id="planting-unit" placeholder="Contoh: kg, ikat, buah" {...register("yieldUnit")} />
          </Field>
        </div>
        <Field label="Catatan" htmlFor="planting-notes" error={formState.errors.notes?.message}>
          <Textarea id="planting-notes" placeholder="Contoh: bibit dari biji sendiri, sebagian daun menguning" {...register("notes")} />
        </Field>
      </form>
    </Modal>
  );
}

/* ------------------------------- uji tanah -------------------------------- */

export function SoilTestFormDialog({
  open,
  onClose,
  onSaved,
  plots,
  soilTest,
  fixedPlotId,
}: DialogProps & { plots: PlotDto[]; soilTest?: SoilTestDto | null; fixedPlotId?: string }) {
  const toast = useToast();
  const [pesan, setPesan] = useDialogPesan(open);
  type Nilai = {
    plotId: string;
    testDate: string;
    ph: string;
    nitrogen: string;
    phosphorus: string;
    potassium: string;
    organicMatter: string;
    unitLabel: string;
    method: string;
    source: string;
    notes: string;
  };
  const nilaiAwal = useMemo<Nilai>(
    () => ({
      plotId: soilTest?.plotId ?? fixedPlotId ?? plots[0]?.id ?? "",
      testDate: soilTest?.testDate ?? tanggalHariIni(),
      ph: soilTest?.ph !== null && soilTest?.ph !== undefined ? String(soilTest.ph) : "",
      nitrogen: soilTest?.nitrogen !== null && soilTest?.nitrogen !== undefined ? String(soilTest.nitrogen) : "",
      phosphorus: soilTest?.phosphorus !== null && soilTest?.phosphorus !== undefined ? String(soilTest.phosphorus) : "",
      potassium: soilTest?.potassium !== null && soilTest?.potassium !== undefined ? String(soilTest.potassium) : "",
      organicMatter: soilTest?.organicMatter !== null && soilTest?.organicMatter !== undefined ? String(soilTest.organicMatter) : "",
      unitLabel: soilTest?.unitLabel ?? "",
      method: soilTest?.method ?? "",
      source: soilTest?.source ?? "",
      notes: soilTest?.notes ?? "",
    }),
    [soilTest, fixedPlotId, plots],
  );
  const { register, handleSubmit, reset, setError, formState } = useForm<Nilai>({
    resolver: zodResolver(soilTestSchema) as unknown as Resolver<Nilai>,
    defaultValues: nilaiAwal,
  });
  useEffect(() => {
    if (open) {
      reset(nilaiAwal);
    }
  }, [open, nilaiAwal, reset]);

  async function onSubmit(data: Nilai) {
    setPesan(null);
    try {
      if (soilTest) {
        await api(`/uji-tanah/${soilTest.id}`, { method: "PATCH", body: data });
        toast.push("Hasil uji tanah diperbarui.", "sukses");
      } else {
        await api("/uji-tanah", { method: "POST", body: data });
        toast.push("Hasil uji tanah tersimpan.", "sukses");
      }
      onSaved?.();
      onClose();
    } catch (error) {
      tangani(error, setPesan, setError);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={soilTest ? "Ubah hasil uji tanah" : "Catat hasil uji tanah"}
      description="Hanya tanggal tes dan petak yang wajib. Kosongkan nilai yang tidak Anda ukur — Rotanami tidak mengarang angka."
      size="lg"
      footer={
        <>
          <Button variant="kedua" type="button" onClick={onClose}>
            Batal
          </Button>
          <FooterActions formId="form-tanah" submitting={formState.isSubmitting} labelSimpan={soilTest ? "Simpan perubahan" : "Simpan hasil uji"} />
        </>
      }
    >
      <form id="form-tanah" className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
        {pesan ? <FormError>{pesan}</FormError> : null}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Petak" htmlFor="soil-plot" required error={formState.errors.plotId?.message}>
            <Select id="soil-plot" disabled={Boolean(fixedPlotId)} {...register("plotId")}>
              <option value="">Pilih petak</option>
              {plots.map((plot) => (
                <option key={plot.id} value={plot.id}>
                  {plot.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Tanggal tes" htmlFor="soil-date" required error={formState.errors.testDate?.message}>
            <Input id="soil-date" type="date" {...register("testDate")} />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="pH" htmlFor="soil-ph" error={formState.errors.ph?.message} hint="Rentang 0–14">
            <Input id="soil-ph" inputMode="decimal" placeholder="Contoh: 6.5" {...register("ph")} />
          </Field>
          <Field label="Nitrogen (N)" htmlFor="soil-n" error={formState.errors.nitrogen?.message}>
            <Input id="soil-n" inputMode="decimal" placeholder="Kosongkan bila tidak diukur" {...register("nitrogen")} />
          </Field>
          <Field label="Fosfor (P)" htmlFor="soil-p" error={formState.errors.phosphorus?.message}>
            <Input id="soil-p" inputMode="decimal" placeholder="Kosongkan bila tidak diukur" {...register("phosphorus")} />
          </Field>
          <Field label="Kalium (K)" htmlFor="soil-k" error={formState.errors.potassium?.message}>
            <Input id="soil-k" inputMode="decimal" placeholder="Kosongkan bila tidak diukur" {...register("potassium")} />
          </Field>
          <Field label="Bahan organik" htmlFor="soil-om" error={formState.errors.organicMatter?.message}>
            <Input id="soil-om" inputMode="decimal" placeholder="Kosongkan bila tidak diukur" {...register("organicMatter")} />
          </Field>
          <Field label="Satuan N/P/K & organik" htmlFor="soil-unit" error={formState.errors.unitLabel?.message} hint="Contoh: ppm dan %">
            <Input id="soil-unit" placeholder="Contoh: ppm" {...register("unitLabel")} />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Metode tes" htmlFor="soil-method" error={formState.errors.method?.message} hint="Contoh: kit uji tanah, pH meter">
            <Input id="soil-method" placeholder="Metode yang dipakai" {...register("method")} />
          </Field>
          <Field label="Sumber hasil" htmlFor="soil-source" error={formState.errors.source?.message} hint="Contoh: laboratorium daerah, pengukuran mandiri">
            <Input id="soil-source" placeholder="Dari mana hasil ini diperoleh" {...register("source")} />
          </Field>
        </div>
        <Field label="Catatan" htmlFor="soil-notes" error={formState.errors.notes?.message}>
          <Textarea id="soil-notes" placeholder="Contoh: sampel diambil dari lima titik petak" {...register("notes")} />
        </Field>
      </form>
    </Modal>
  );
}

/* ------------------------------- observasi -------------------------------- */

export function ObservationFormDialog({
  open,
  onClose,
  onSaved,
  plots,
  plantings,
  observation,
  fixedPlotId,
}: DialogProps & {
  plots: PlotDto[];
  plantings: PlantingDto[];
  observation?: ObservationDto | null;
  fixedPlotId?: string;
}) {
  const toast = useToast();
  const [pesan, setPesan] = useDialogPesan(open);
  type Nilai = { plotId: string; plantingId: string; category: string; observedAt: string; description: string };
  const nilaiAwal = useMemo<Nilai>(
    () => ({
      plotId: observation?.plotId ?? fixedPlotId ?? plots[0]?.id ?? "",
      plantingId: observation?.plantingId ?? "",
      category: observation?.category ?? "pertumbuhan",
      observedAt: observation?.observedAt ?? tanggalHariIni(),
      description: observation?.description ?? "",
    }),
    [observation, fixedPlotId, plots],
  );
  const { register, handleSubmit, reset, setError, formState, control } = useForm<Nilai>({
    resolver: zodResolver(observationSchema) as unknown as Resolver<Nilai>,
    defaultValues: nilaiAwal,
  });
  useEffect(() => {
    if (open) {
      reset(nilaiAwal);
    }
  }, [open, nilaiAwal, reset]);
  const plotId = useWatch({ control, name: "plotId" });
  const siklusTersedia = plantings.filter((planting) => planting.plotId === plotId);

  async function onSubmit(data: Nilai) {
    setPesan(null);
    try {
      if (observation) {
        await api(`/observasi/${observation.id}`, { method: "PATCH", body: data });
        toast.push("Observasi diperbarui.", "sukses");
      } else {
        await api("/observasi", { method: "POST", body: data });
        toast.push("Observasi tersimpan.", "sukses");
      }
      onSaved?.();
      onClose();
    } catch (error) {
      tangani(error, setPesan, setError);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={observation ? "Ubah observasi" : "Catat observasi"}
      description="Catatan hama dan penyakit ikut dibaca oleh perencana rotasi."
      footer={
        <>
          <Button variant="kedua" type="button" onClick={onClose}>
            Batal
          </Button>
          <FooterActions formId="form-observasi" submitting={formState.isSubmitting} labelSimpan={observation ? "Simpan perubahan" : "Simpan observasi"} />
        </>
      }
    >
      <form id="form-observasi" className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
        {pesan ? <FormError>{pesan}</FormError> : null}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Petak" htmlFor="obs-plot" required error={formState.errors.plotId?.message}>
            <Select id="obs-plot" disabled={Boolean(fixedPlotId)} {...register("plotId")}>
              <option value="">Pilih petak</option>
              {plots.map((plot) => (
                <option key={plot.id} value={plot.id}>
                  {plot.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Tanggal pengamatan" htmlFor="obs-date" required error={formState.errors.observedAt?.message}>
            <Input id="obs-date" type="date" {...register("observedAt")} />
          </Field>
        </div>
        <Field label="Jenis observasi" htmlFor="obs-category" required error={formState.errors.category?.message}>
          <Select id="obs-category" {...register("category")}>
            {Object.entries(LABEL_KATEGORI_OBSERVASI).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </Field>
        <Field
          label="Siklus tanam terkait"
          htmlFor="obs-planting"
          error={formState.errors.plantingId?.message}
          hint={siklusTersedia.length === 0 ? "Petak ini belum punya riwayat tanam, biarkan kosong." : "Pilih bila observasi terkait satu siklus tanam tertentu."}
        >
          <Select id="obs-planting" disabled={siklusTersedia.length === 0} {...register("plantingId")}>
            <option value="">Tidak terhubung ke siklus tanam</option>
            {siklusTersedia.map((planting) => (
              <option key={planting.id} value={planting.id}>
                {planting.cropName} · tanam {planting.plantDate}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Deskripsi" htmlFor="obs-desc" required error={formState.errors.description?.message} hint="Tuliskan apa yang Anda lihat, bukan kesimpulan penyebabnya.">
          <Textarea id="obs-desc" placeholder="Contoh: kutu daun terlihat di pucuk, jumlah masih sedikit" invalid={Boolean(formState.errors.description)} {...register("description")} />
        </Field>
      </form>
    </Modal>
  );
}

/* ------------------------------- pengingat -------------------------------- */

export function ReminderFormDialog({
  open,
  onClose,
  onSaved,
  farmId,
  plots,
  reminder,
}: DialogProps & { farmId: string; plots: PlotDto[]; reminder?: ReminderDto | null }) {
  const toast = useToast();
  const [pesan, setPesan] = useDialogPesan(open);
  type Nilai = { farmId: string; plotId: string; title: string; dueDate: string; kind: string; notes: string };
  const nilaiAwal = useMemo<Nilai>(
    () => ({
      farmId,
      plotId: reminder?.plotId ?? "",
      title: reminder?.title ?? "",
      dueDate: reminder?.dueDate ?? tanggalHariIni(),
      kind: reminder?.kind ?? "lainnya",
      notes: reminder?.notes ?? "",
    }),
    [farmId, reminder],
  );
  const { register, handleSubmit, reset, setError, formState } = useForm<Nilai>({
    resolver: zodResolver(reminderSchema) as unknown as Resolver<Nilai>,
    defaultValues: nilaiAwal,
  });
  useEffect(() => {
    if (open) {
      reset(nilaiAwal);
    }
  }, [open, nilaiAwal, reset]);

  async function onSubmit(data: Nilai) {
    setPesan(null);
    try {
      if (reminder) {
        await api(`/pengingat/${reminder.id}`, { method: "PATCH", body: data });
        toast.push("Pengingat diperbarui.", "sukses");
      } else {
        await api("/pengingat", { method: "POST", body: data });
        toast.push("Pengingat ditambahkan.", "sukses");
      }
      onSaved?.();
      onClose();
    } catch (error) {
      tangani(error, setPesan, setError);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={reminder ? "Ubah pengingat" : "Buat pengingat"}
      description="Pengingat tampil di dalam aplikasi ini. Rotanami tidak mengirim email atau push notification."
      size="sm"
      footer={
        <>
          <Button variant="kedua" type="button" onClick={onClose}>
            Batal
          </Button>
          <FooterActions formId="form-pengingat" submitting={formState.isSubmitting} labelSimpan={reminder ? "Simpan" : "Buat pengingat"} />
        </>
      }
    >
      <form id="form-pengingat" className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
        {pesan ? <FormError>{pesan}</FormError> : null}
        <Field label="Judul pengingat" htmlFor="rem-title" required error={formState.errors.title?.message}>
          <Input id="rem-title" placeholder="Contoh: Tanam selada di Bedeng A" invalid={Boolean(formState.errors.title)} {...register("title")} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Tanggal" htmlFor="rem-date" required error={formState.errors.dueDate?.message}>
            <Input id="rem-date" type="date" {...register("dueDate")} />
          </Field>
          <Field label="Jenis" htmlFor="rem-kind" error={formState.errors.kind?.message}>
            <Select id="rem-kind" {...register("kind")}>
              <option value="tanam">Tanam</option>
              <option value="panen">Panen</option>
              <option value="uji-tanah">Uji tanah</option>
              <option value="perawatan">Perawatan</option>
              <option value="lainnya">Lainnya</option>
            </Select>
          </Field>
        </div>
        <Field label="Petak terkait" htmlFor="rem-plot" error={formState.errors.plotId?.message}>
          <Select id="rem-plot" {...register("plotId")}>
            <option value="">Tidak terhubung ke petak</option>
            {plots.map((plot) => (
              <option key={plot.id} value={plot.id}>
                {plot.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Catatan" htmlFor="rem-notes" error={formState.errors.notes?.message}>
          <Textarea id="rem-notes" placeholder="Catatan singkat" {...register("notes")} />
        </Field>
      </form>
    </Modal>
  );
}

/* ---------------------------- rencana rotasi ------------------------------ */

export function RotationPlanFormDialog({
  open,
  onClose,
  onSaved,
  plots,
  crops,
  seasons,
  plan,
  defaultPlotId,
  defaultCropId,
  defaultSeasonId,
  defaultReason,
  defaultOrigin = "manual",
}: DialogProps & {
  plots: PlotDto[];
  crops: CropDto[];
  seasons: SeasonDto[];
  plan?: RotationPlanDto | null;
  defaultPlotId?: string;
  defaultCropId?: string;
  defaultSeasonId?: string;
  defaultReason?: Record<string, unknown> | null;
  defaultOrigin?: "aturan" | "manual";
}) {
  const toast = useToast();
  const [pesan, setPesan] = useDialogPesan(open);
  type Nilai = {
    plotId: string;
    seasonId: string;
    cropId: string;
    targetPlantDate: string;
    status: string;
    notes: string;
  };
  const nilaiAwal = useMemo<Nilai>(
    () => ({
      plotId: plan?.plotId ?? defaultPlotId ?? plots[0]?.id ?? "",
      seasonId: plan?.seasonId ?? defaultSeasonId ?? seasons[0]?.id ?? "",
      cropId: plan?.cropId ?? defaultCropId ?? "",
      targetPlantDate: plan?.targetPlantDate ?? tanggalHariIni(),
      status: plan?.status ?? "direncanakan",
      notes: plan?.notes ?? "",
    }),
    [plan, defaultPlotId, defaultCropId, defaultSeasonId, plots, seasons],
  );
  const { register, handleSubmit, reset, setError, formState } = useForm<Nilai>({
    resolver: zodResolver(rotationPlanSchema) as unknown as Resolver<Nilai>,
    defaultValues: nilaiAwal,
  });
  useEffect(() => {
    if (open) {
      reset(nilaiAwal);
    }
  }, [open, nilaiAwal, reset]);

  async function onSubmit(data: Nilai) {
    setPesan(null);
    try {
      if (plan) {
        await api(`/rencana-rotasi/${plan.id}`, { method: "PATCH", body: data });
        toast.push("Rencana rotasi diperbarui.", "sukses");
      } else {
        await api("/rencana-rotasi", {
          method: "POST",
          body: { ...data, origin: defaultOrigin, recommendationReason: defaultReason ?? null },
        });
        toast.push("Rencana rotasi tersimpan dan muncul di kalender.", "sukses");
      }
      onSaved?.();
      onClose();
    } catch (error) {
      tangani(error, setPesan, setError);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={plan ? "Ubah rencana rotasi" : "Simpan rencana rotasi"}
      description={plan ? "Anda dapat mengganti tanaman, musim, atau membatalkan rencana." : "Rencana ini akan muncul di kalender dan daftar rencana kebun."}
      footer={
        <>
          <Button variant="kedua" type="button" onClick={onClose}>
            Batal
          </Button>
          <FooterActions formId="form-rencana" submitting={formState.isSubmitting} labelSimpan={plan ? "Simpan perubahan" : "Simpan rencana"} />
        </>
      }
    >
      <form id="form-rencana" className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
        {pesan ? <FormError>{pesan}</FormError> : null}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Petak" htmlFor="plan-plot" required error={formState.errors.plotId?.message}>
            <Select id="plan-plot" {...register("plotId")}>
              <option value="">Pilih petak</option>
              {plots.map((plot) => (
                <option key={plot.id} value={plot.id}>
                  {plot.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Musim" htmlFor="plan-season" error={formState.errors.seasonId?.message}>
            <Select id="plan-season" {...register("seasonId")}>
              <option value="">Tanpa musim</option>
              {seasons.map((season) => (
                <option key={season.id} value={season.id}>
                  {season.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <Field label="Tanaman yang direncanakan" htmlFor="plan-crop" required error={formState.errors.cropId?.message}>
          <Select id="plan-crop" {...register("cropId")}>
            <option value="">Pilih tanaman</option>
            {crops.map((crop) => (
              <option key={crop.id} value={crop.id}>
                {crop.name}
                {crop.familyName ? ` · ${crop.familyName}` : ""}
              </option>
            ))}
          </Select>
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Rencana tanggal tanam" htmlFor="plan-date" error={formState.errors.targetPlantDate?.message}>
            <Input id="plan-date" type="date" {...register("targetPlantDate")} />
          </Field>
          <Field label="Status rencana" htmlFor="plan-status" error={formState.errors.status?.message}>
            <Select id="plan-status" {...register("status")}>
              <option value="direncanakan">Direncanakan</option>
              <option value="ditanam">Sedang ditanam</option>
              <option value="selesai">Selesai</option>
              <option value="dibatalkan">Dibatalkan</option>
            </Select>
          </Field>
        </div>
        <Field label="Catatan" htmlFor="plan-notes" error={formState.errors.notes?.message}>
          <Textarea id="plan-notes" placeholder="Contoh: tunggu bedeng kering dulu sebelum tanam" {...register("notes")} />
        </Field>
      </form>
    </Modal>
  );
}

/** Menyamakan penanganan error server ke pesan umum + error per field formulir. */
function tangani(
  error: unknown,
  setPesan: (value: string | null) => void,
  setError: (name: never, error: { type: string; message: string }) => void,
) {
  if (error instanceof ApiClientError) {
    setPesan(error.message);
    for (const [key, message] of Object.entries(error.fields)) {
      setError(key as never, { type: "server", message });
    }
    return;
  }
  setPesan(error instanceof Error ? error.message : "Terjadi kesalahan. Coba lagi.");
}
