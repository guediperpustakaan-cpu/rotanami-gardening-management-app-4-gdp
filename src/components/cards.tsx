"use client";

import Link from "next/link";
import { CalendarDays, CheckCircle2, Circle, Droplets, Leaf, Pencil, Sprout, Trash2 } from "lucide-react";
import {
  LABEL_KATEGORI_OBSERVASI,
  LABEL_KATEGORI_HARA,
  LABEL_JENIS_PENGINGAT,
  STATUS_RENCANA,
  STATUS_TANAM,
  formatAngka,
  formatTanggal,
  formatUkuran,
  labelSelisih,
} from "@/lib/format";
import type {
  CropDto,
  ObservationDto,
  PlantingDto,
  PlotDto,
  ReminderDto,
  RotationPlanDto,
  SoilTestDto,
  SuggestionItem,
} from "@/lib/types";
import { Badge, Button, DemoBadge, StatusBadge, cx } from "@/components/ui";

function Aksi({ onEdit, onDelete, editLabel, deleteLabel }: { onEdit?: () => void; onDelete?: () => void; editLabel: string; deleteLabel: string }) {
  if (!onEdit && !onDelete) return null;
  return (
    <div className="flex shrink-0 items-center gap-1">
      {onEdit ? (
        <button type="button" onClick={onEdit} className="rounded-lg p-2 text-soil-500 ring-1 ring-soil-200 hover:bg-moss-50 hover:text-moss-700" aria-label={editLabel}>
          <Pencil className="size-4" aria-hidden="true" />
          <span className="sr-only">{editLabel}</span>
        </button>
      ) : null}
      {onDelete ? (
        <button type="button" onClick={onDelete} className="rounded-lg p-2 text-soil-500 ring-1 ring-soil-200 hover:bg-[#fbeae8] hover:text-[#8f2018]" aria-label={deleteLabel}>
          <Trash2 className="size-4" aria-hidden="true" />
          <span className="sr-only">{deleteLabel}</span>
        </button>
      ) : null}
    </div>
  );
}

export function PlotCard({ plot, onEdit, onDelete }: { plot: PlotDto; onEdit?: () => void; onDelete?: () => void }) {
  const status = plot.lastPlanting ? STATUS_TANAM[plot.lastPlanting.status] : null;
  return (
    <article className="kartu flex flex-col gap-3 p-4">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-base font-bold text-soil-900">
            <Link href={`/petak/${plot.id}`} className="hover:text-moss-700 hover:underline">
              {plot.name}
            </Link>
          </h3>
          <p className="mt-0.5 text-xs text-soil-500">
            {formatUkuran(plot.size, plot.areaUnit)} · {plot.soilType ? `tanah ${plot.soilType}` : "jenis tanah belum diisi"}
          </p>
        </div>
        <Aksi onEdit={onEdit} onDelete={onDelete} editLabel={`Ubah petak ${plot.name}`} deleteLabel={`Hapus petak ${plot.name}`} />
      </div>

      {plot.lastPlanting && status ? (
        <div className="rounded-xl bg-soil-50 p-3 ring-1 ring-soil-100">
          <p className="label-kecil">Tanaman terakhir</p>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-sm font-semibold text-soil-800">
            <Leaf className="size-4 text-moss-600" aria-hidden="true" />
            {plot.lastPlanting.cropName}
            <StatusBadge meta={status} />
          </p>
          <p className="mt-1 text-xs text-soil-500">
            Tanam {formatTanggal(plot.lastPlanting.plantDate)}
            {plot.lastPlanting.harvestDate ? ` · panen ${formatTanggal(plot.lastPlanting.harvestDate)}` : ""}
          </p>
        </div>
      ) : (
        <p className="rounded-xl border border-dashed border-soil-300 px-3 py-2.5 text-sm text-soil-500">
          Belum ada riwayat tanam di petak ini.
        </p>
      )}

      <div className="flex flex-wrap items-center gap-1.5 text-xs text-soil-600">
        <Badge tone="netral">{plot.counts.plantings} riwayat tanam</Badge>
        <Badge tone="netral" icon={<Droplets className="size-3.5" />}>
          {plot.counts.soilTests} uji tanah
        </Badge>
        <Badge tone="netral">{plot.counts.observations} observasi</Badge>
        {plot.counts.openReminders > 0 ? <Badge tone="perhatian">{plot.counts.openReminders} pengingat aktif</Badge> : null}
      </div>

      <Link href={`/petak/${plot.id}`} className="text-sm font-semibold text-moss-700 underline decoration-moss-300 underline-offset-2 hover:text-moss-800">
        Buka detail petak →
      </Link>
    </article>
  );
}

export function PlantingRow({
  planting,
  onEdit,
  onDelete,
  showPlot = false,
}: {
  planting: PlantingDto;
  onEdit?: () => void;
  onDelete?: () => void;
  showPlot?: boolean;
}) {
  const status = STATUS_TANAM[planting.status] ?? { label: planting.status, tone: "netral" as const };
  return (
    <li className="flex flex-col gap-2 rounded-xl border border-soil-200 bg-white p-3.5 sm:flex-row sm:items-center">
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-soil-900">
          <Sprout className="size-4 shrink-0 text-moss-600" aria-hidden="true" />
          {planting.cropName}
          {planting.cropScientificName ? <span className="text-xs font-normal italic text-soil-500">{planting.cropScientificName}</span> : null}
          <StatusBadge meta={status} />
        </p>
        <p className="mt-1 text-xs text-soil-600">
          {showPlot ? `Petak ${planting.plotName} · ` : ""}Tanam {formatTanggal(planting.plantDate)}
          {planting.harvestDate ? ` · panen ${formatTanggal(planting.harvestDate)}` : ""}
          {planting.seasonName ? ` · ${planting.seasonName}` : ""}
          {planting.familyName ? ` · keluarga ${planting.familyName}` : ""}
        </p>
        {planting.yieldAmount !== null ? (
          <p className="mt-1 text-xs font-medium text-moss-700">
            Hasil: {formatAngka(planting.yieldAmount)} {planting.yieldUnit ?? ""}
          </p>
        ) : null}
        {planting.notes ? <p className="mt-1 text-xs text-soil-500">{planting.notes}</p> : null}
      </div>
      <Aksi onEdit={onEdit} onDelete={onDelete} editLabel={`Ubah catatan tanam ${planting.cropName}`} deleteLabel={`Hapus catatan tanam ${planting.cropName}`} />
    </li>
  );
}

export function SoilTestRow({ test, onEdit, onDelete }: { test: SoilTestDto; onEdit?: () => void; onDelete?: () => void }) {
  const nilai: { label: string; value: number | null }[] = [
    { label: "pH", value: test.ph },
    { label: "N", value: test.nitrogen },
    { label: "P", value: test.phosphorus },
    { label: "K", value: test.potassium },
    { label: "Bahan organik", value: test.organicMatter },
  ];
  return (
    <li className="rounded-xl border border-soil-200 bg-white p-3.5">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-soil-900">{formatTanggal(test.testDate)}</p>
          <p className="text-xs text-soil-500">
            {test.method ? `Metode: ${test.method}` : "Metode tidak dicatat"}
            {test.source ? ` · Sumber: ${test.source}` : ""}
          </p>
        </div>
        <Aksi onEdit={onEdit} onDelete={onDelete} editLabel={`Ubah hasil uji tanah ${test.testDate}`} deleteLabel={`Hapus hasil uji tanah ${test.testDate}`} />
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
        {nilai.map((item) => (
          <div key={item.label} className="rounded-lg bg-soil-50 px-2.5 py-2">
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-soil-500">{item.label}</dt>
            <dd className="mt-0.5 text-sm font-bold text-soil-900">
              {item.value === null ? <span className="font-medium text-soil-400">tidak diukur</span> : formatAngka(item.value)}
            </dd>
          </div>
        ))}
      </dl>
      {test.unitLabel ? <p className="mt-2 text-xs text-soil-500">Satuan tercatat: {test.unitLabel}</p> : null}
      {test.notes ? <p className="mt-1 text-xs text-soil-600">{test.notes}</p> : null}
    </li>
  );
}

export function ObservationRow({
  observation,
  onEdit,
  onDelete,
}: {
  observation: ObservationDto;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  const tone = observation.category === "hama" || observation.category === "penyakit" ? "perhatian" : observation.category === "cuaca" ? "info" : "sukses";
  return (
    <li className="flex flex-col gap-2 rounded-xl border border-soil-200 bg-white p-3.5 sm:flex-row sm:items-start">
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-soil-900">
          <Badge tone={tone}>{LABEL_KATEGORI_OBSERVASI[observation.category] ?? observation.category}</Badge>
          <span className="text-xs font-normal text-soil-500">{formatTanggal(observation.observedAt)}</span>
        </p>
        <p className="mt-1.5 text-sm text-soil-700">{observation.description}</p>
        {observation.plantingLabel ? <p className="mt-1 text-xs text-soil-500">Terkait siklus: {observation.plantingLabel}</p> : null}
      </div>
      <Aksi onEdit={onEdit} onDelete={onDelete} editLabel="Ubah observasi" deleteLabel="Hapus observasi" />
    </li>
  );
}

export function ReminderRow({
  reminder,
  onToggle,
  onEdit,
  onDelete,
  toggling,
}: {
  reminder: ReminderDto;
  onToggle?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  toggling?: boolean;
}) {
  const lewat = !reminder.isDone && reminder.dueDate < new Date().toISOString().slice(0, 10);
  return (
    <li className={cx("flex items-start gap-3 rounded-xl border bg-white p-3.5", reminder.isDone ? "border-soil-200 opacity-75" : lewat ? "border-clay-300" : "border-soil-200")}>
      <button
        type="button"
        onClick={onToggle}
        disabled={toggling || !onToggle}
        aria-pressed={reminder.isDone}
        className={cx("mt-0.5 rounded-full p-0.5", reminder.isDone ? "text-moss-600" : "text-soil-400 hover:text-moss-600")}
        aria-label={reminder.isDone ? `Tandai belum selesai: ${reminder.title}` : `Tandai selesai: ${reminder.title}`}
      >
        {reminder.isDone ? <CheckCircle2 className="size-6" aria-hidden="true" /> : <Circle className="size-6" aria-hidden="true" />}
      </button>
      <div className="min-w-0 flex-1">
        <p className={cx("text-sm font-semibold text-soil-900", reminder.isDone && "line-through")}>{reminder.title}</p>
        <p className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-soil-600">
          <Badge tone="netral" icon={<CalendarDays className="size-3.5" />}>
            {formatTanggal(reminder.dueDate)} · {labelSelisih(reminder.dueDate)}
          </Badge>
          <Badge tone={reminder.kind === "panen" ? "sukses" : "info"}>{LABEL_JENIS_PENGINGAT[reminder.kind] ?? reminder.kind}</Badge>
          {reminder.plotName ? <span>Petak: {reminder.plotName}</span> : null}
          {reminder.isDone ? <Badge tone="sukses" icon={<CheckCircle2 className="size-3.5" />}>Selesai</Badge> : lewat ? <Badge tone="perhatian">Sudah lewat</Badge> : null}
        </p>
        {reminder.notes ? <p className="mt-1 text-xs text-soil-500">{reminder.notes}</p> : null}
      </div>
      <Aksi onEdit={onEdit} onDelete={onDelete} editLabel={`Ubah pengingat ${reminder.title}`} deleteLabel={`Hapus pengingat ${reminder.title}`} />
    </li>
  );
}

export function PlanCard({
  plan,
  onEdit,
  onCancel,
  onDelete,
}: {
  plan: RotationPlanDto;
  onEdit?: () => void;
  onCancel?: () => void;
  onDelete?: () => void;
}) {
  const status = STATUS_RENCANA[plan.status] ?? { label: plan.status, tone: "netral" as const };
  const reason = plan.recommendationReason;
  return (
    <article className="kartu p-4">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-2 text-sm font-bold text-soil-900">
            <RefreshIcon />
            {plan.cropName}
            <StatusBadge meta={status} />
            <Badge tone={plan.origin === "aturan" ? "info" : "netral"}>{plan.origin === "aturan" ? "Dari perencana" : "Dipilih manual"}</Badge>
          </p>
          <p className="mt-1 text-xs text-soil-600">
            Petak {plan.plotName}
            {plan.seasonName ? ` · ${plan.seasonName}` : " · tanpa musim"}
            {plan.targetPlantDate ? ` · rencana tanam ${formatTanggal(plan.targetPlantDate)} (${labelSelisih(plan.targetPlantDate)})` : ""}
            {plan.familyName ? ` · keluarga ${plan.familyName}` : ""}
          </p>
        </div>
        <Aksi onEdit={onEdit} onDelete={onDelete} editLabel="Ubah rencana rotasi" deleteLabel="Hapus rencana rotasi" />
      </div>

      {reason ? (
        <div className="mt-3 rounded-xl bg-soil-50 p-3 ring-1 ring-soil-100">
          <p className="label-kecil">Alasan tersimpan ({reason.engineVersion})</p>
          <p className="mt-1 text-sm text-soil-700">{reason.headline}</p>
          {reason.reasons.length > 0 ? (
            <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-soil-600">
              {reason.reasons.map((item, index) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-xs text-soil-500">Alasan rinci tidak disimpan untuk rencana ini.</p>
          )}
          {reason.dataGaps.length > 0 ? (
            <p className="mt-2 text-xs text-clay-700">Data yang kurang saat itu: {reason.dataGaps.length} butir.</p>
          ) : null}
        </div>
      ) : null}

      {plan.notes ? <p className="mt-2 text-xs text-soil-600">Catatan: {plan.notes}</p> : null}

      {onCancel && plan.status !== "dibatalkan" ? (
        <Button variant="kedua" size="sm" className="mt-3" onClick={onCancel}>
          Batalkan rencana
        </Button>
      ) : null}
    </article>
  );
}

function RefreshIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4 shrink-0 text-moss-600" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M21 12a9 9 0 1 1-3-6.7" strokeLinecap="round" />
      <path d="M21 3v6h-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function SuggestionCard({
  item,
  primary,
  onPick,
  pickLabel,
}: {
  item: SuggestionItem;
  primary?: boolean;
  onPick: (crop: CropDto) => void;
  pickLabel?: string;
}) {
  return (
    <article className={cx("rounded-2xl border p-4", primary ? "border-moss-300 bg-moss-50/70" : "border-soil-200 bg-white")}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-2 text-base font-bold text-soil-900">
            {item.crop.name}
            {primary ? <Badge tone="sukses">Saran utama</Badge> : <Badge tone="netral">Alternatif</Badge>}
          </p>
          <p className="mt-0.5 text-xs text-soil-600">
            {item.crop.familyName ? `Keluarga ${item.crop.familyName}` : "Keluarga botani tidak tercatat"}
            {item.crop.rotationGroup ? ` · kelompok ${item.crop.rotationGroup}` : ""}
            {item.crop.nutrientCategory ? ` · ${LABEL_KATEGORI_HARA[item.crop.nutrientCategory]}` : " · kebutuhan hara tidak diketahui"}
            {item.crop.isDemo ? " · data contoh" : ""}
          </p>
        </div>
        <Button variant={primary ? "utama" : "kedua"} size="sm" onClick={() => onPick(item.crop)}>
          {pickLabel ?? "Pilih"}
        </Button>
      </div>

      <ul className="mt-3 space-y-1.5">
        {item.reasons.map((reason, index) => (
          <li key={index} className="flex gap-2 text-sm text-soil-700">
            <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-moss-500" aria-hidden="true" />
            {reason}
          </li>
        ))}
      </ul>

      {item.warnings.length > 0 ? (
        <ul className="mt-2 space-y-1.5">
          {item.warnings.map((warning, index) => (
            <li key={index} className="flex gap-2 text-sm text-clay-800">
              <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-clay-500" aria-hidden="true" />
              {warning}
            </li>
          ))}
        </ul>
      ) : null}
    </article>
  );
}

export function CropRow({
  crop,
  onEdit,
  onDelete,
  onCopy,
}: {
  crop: CropDto;
  onEdit?: () => void;
  onDelete?: () => void;
  onCopy?: () => void;
}) {
  return (
    <li className="flex flex-col gap-2 rounded-xl border border-soil-200 bg-white p-3.5 sm:flex-row sm:items-center">
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-2 text-sm font-bold text-soil-900">
          <Leaf className="size-4 shrink-0 text-moss-600" aria-hidden="true" />
          {crop.name}
          {crop.isDemo ? <DemoBadge /> : null}
          {crop.isCoverCrop ? <Badge tone="sukses">Penutup tanah</Badge> : null}
        </p>
        <p className="mt-1 text-xs text-soil-600">
          {crop.scientificName ? <span className="italic">{crop.scientificName} · </span> : null}
          {crop.familyName ? `Keluarga ${crop.familyName}` : "Keluarga botani tidak tercatat"}
          {crop.rotationGroup ? ` · kelompok ${crop.rotationGroup}` : ""}
        </p>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {crop.nutrientCategory ? <Badge tone="netral">{LABEL_KATEGORI_HARA[crop.nutrientCategory]}</Badge> : <Badge tone="netral">Kebutuhan hara belum diisi</Badge>}
        </div>
        {crop.guideNotes ? <p className="mt-1.5 text-xs text-soil-500">{crop.guideNotes}</p> : null}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {onCopy ? (
          <Button variant="kedua" size="sm" onClick={onCopy}>
            Salin ke kebun saya
          </Button>
        ) : null}
        <Aksi onEdit={onEdit} onDelete={onDelete} editLabel={`Ubah tanaman ${crop.name}`} deleteLabel={`Hapus tanaman ${crop.name}`} />
      </div>
    </li>
  );
}
