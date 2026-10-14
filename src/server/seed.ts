import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  crops,
  farms,
  observations,
  plantFamilies,
  plantings,
  plots,
  reminders,
  rotationPlans,
  seasons,
  soilTests,
  users,
} from "@/db/schema";
import { DEMO_ACCOUNT, DEMO_CROPS, DEMO_FAMILIES, DEMO_GUIDE_NOTE } from "@/lib/demo-data";
import { hashPassword } from "./auth";
import { buildEngineInputForPlot } from "./rotation";
import { suggestRotation } from "@/lib/rotation/engine";

/** Tanggal YYYY-MM-DD relatif terhadap hari ini. */
function hari(offset: number): string {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

/**
 * Memastikan katalog contoh (keluarga botani + tanaman) tersedia.
 * Bersifat idempoten: hanya menambahkan baris yang belum ada.
 */
export async function ensureDemoCatalog(): Promise<{ families: number; crops: number }> {
  const existingFamilies = await db.query.plantFamilies.findMany({ columns: { id: true, name: true } });
  const familyByName = new Map(existingFamilies.map((f) => [f.name, f.id]));
  let familiesAdded = 0;

  for (const family of DEMO_FAMILIES) {
    if (familyByName.has(family.name)) continue;
    const id = randomUUID();
    await db.insert(plantFamilies).values({
      id,
      name: family.name,
      rotationGroup: family.rotationGroup,
      description: family.description,
      isDemo: true,
    });
    familyByName.set(family.name, id);
    familiesAdded += 1;
  }

  const existingCrops = await db.query.crops.findMany({ where: and(eq(crops.isDemo, true)) , columns: { id: true, name: true } });
  const cropNames = new Set(existingCrops.map((c) => c.name));
  let cropsAdded = 0;

  for (const crop of DEMO_CROPS) {
    if (cropNames.has(crop.name)) continue;
    await db.insert(crops).values({
      id: randomUUID(),
      farmId: null,
      name: crop.name,
      scientificName: crop.scientificName ?? null,
      familyId: familyByName.get(crop.family) ?? null,
      nutrientCategory: crop.nutrientCategory ?? null,
      isCoverCrop: Boolean(crop.isCoverCrop),
      guideNotes: crop.guideNotes ?? null,
      isDemo: true,
    });
    cropNames.add(crop.name);
    cropsAdded += 1;
  }

  return { families: familiesAdded, crops: cropsAdded };
}

let catalogPromise: Promise<{ families: number; crops: number }> | null = null;

/** Dijalankan sekali per proses server agar katalog contoh selalu tersedia. */
export function ensureDemoCatalogOnce(): Promise<{ families: number; crops: number }> {
  if (!catalogPromise) {
    catalogPromise = ensureDemoCatalog().catch((error) => {
      catalogPromise = null;
      throw error;
    });
  }
  return catalogPromise;
}

/**
 * Membuat akun contoh beserta isi kebunnya (semuanya berlabel "Data contoh").
 * Idempoten: tidak mengubah apa pun bila akun contoh sudah ada.
 */
export async function ensureDemoAccount(): Promise<{ created: boolean; email: string }> {
  const existing = await db.query.users.findFirst({ where: eq(users.email, DEMO_ACCOUNT.email) });
  if (existing) return { created: false, email: DEMO_ACCOUNT.email };

  const userId = randomUUID();
  await db.insert(users).values({
    id: userId,
    email: DEMO_ACCOUNT.email,
    name: DEMO_ACCOUNT.name,
    passwordHash: await hashPassword(DEMO_ACCOUNT.password),
    timezone: "Asia/Jakarta",
  });

  const farmId = await buatKebunContoh(userId, {
    name: DEMO_ACCOUNT.farmName,
    location: DEMO_ACCOUNT.location,
    notes: DEMO_GUIDE_NOTE,
  });
  await db.update(users).set({ activeFarmId: farmId }).where(eq(users.id, userId));

  return { created: true, email: DEMO_ACCOUNT.email };
}

/**
 * Membuat satu kebun berisi data contoh untuk pengguna tertentu.
 * Dipakai oleh seed akun contoh dan oleh tombol "Muat data contoh" di Pengaturan.
 */
export async function buatKebunContoh(
  userId: string,
  opts: { name: string; location?: string | null; notes?: string | null },
): Promise<string> {
  await ensureDemoCatalogOnce();

  const farmId = randomUUID();
  await db.insert(farms).values({
    id: farmId,
    ownerId: userId,
    name: opts.name,
    location: opts.location ?? "Data contoh \u2014 lokasi tidak diisi",
    timezone: "Asia/Jakarta",
    isDemo: true,
    notes: opts.notes ?? DEMO_GUIDE_NOTE,
  });

  const seasonId = randomUUID();
  await db.insert(seasons).values({
    id: seasonId,
    farmId,
    name: `Musim tanam ${new Date().getFullYear()} (contoh)`,
    startDate: hari(-45),
    endDate: hari(180),
  });

  const plotSpecs = [
    { name: "Bedeng A — dekat sumur", size: 12, areaUnit: "m2", soilType: "Lempung berpasir", notes: "Data contoh. Sisi ini paling cepat kering saat kemarau." },
    { name: "Bedeng B — sisi timur", size: 10, areaUnit: "m2", soilType: "Lempung", notes: "Data contoh." },
    { name: "Bedeng C — sisi barat", size: 8, areaUnit: "m2", soilType: null, notes: "Data contoh. Jenis tanah belum diperiksa." },
    { name: "Bedeng D — percobaan", size: 5, areaUnit: "m2", soilType: null, notes: "Data contoh. Belum pernah ditanami." },
  ];
  const plotIds: Record<string, string> = {};
  for (const spec of plotSpecs) {
    const id = randomUUID();
    plotIds[spec.name] = id;
    await db.insert(plots).values({ id, farmId, ...spec });
  }

  const cropIdByName = new Map(
    (await db.query.crops.findMany({ columns: { id: true, name: true } })).map((crop) => [crop.name, crop.id]),
  );
  const cropId = (name: string) => cropIdByName.get(name) ?? null;

  type PlantingSeed = { plot: string; crop: string; plantOffset: number; harvestOffset?: number; status: string; yieldAmount?: number; yieldUnit?: string; notes?: string };
  const plantingSeeds: PlantingSeed[] = [
    { plot: "Bedeng A — dekat sumur", crop: "Tomat", plantOffset: -150, harvestOffset: -95, status: "dipanen", yieldAmount: 4.2, yieldUnit: "kg", notes: "Data contoh. Sebagian buah pecah saat hujan deras." },
    { plot: "Bedeng A — dekat sumur", crop: "Kangkung", plantOffset: -60, harvestOffset: -32, status: "dipanen", yieldAmount: 1.8, yieldUnit: "kg", notes: "Data contoh." },
    { plot: "Bedeng A — dekat sumur", crop: "Selada", plantOffset: 8, status: "direncanakan", notes: "Data contoh. Rencana penanaman berikutnya." },
    { plot: "Bedeng B — sisi timur", crop: "Wortel", plantOffset: -210, harvestOffset: -140, status: "dipanen", yieldAmount: 2.4, yieldUnit: "kg" },
    { plot: "Bedeng B — sisi timur", crop: "Cabai rawit", plantOffset: -28, status: "ditanam", notes: "Data contoh. Mulai berbunga." },
    { plot: "Bedeng C — sisi barat", crop: "Kacang panjang", plantOffset: -35, status: "ditanam", notes: "Data contoh." },
    { plot: "Bedeng C — sisi barat", crop: "Jagung manis", plantOffset: -300, harvestOffset: -220, status: "dibatalkan", notes: "Data contoh. Gagal karena bibit tidak tersedia." },
  ];
  const plantingIds: Record<string, string> = {};
  for (const seed of plantingSeeds) {
    const targetCrop = cropId(seed.crop);
    const plotId = plotIds[seed.plot];
    if (!targetCrop || !plotId) continue;
    const id = randomUUID();
    plantingIds[`${seed.plot}|${seed.crop}`] = id;
    await db.insert(plantings).values({
      id,
      plotId,
      cropId: targetCrop,
      seasonId,
      plantDate: hari(seed.plantOffset),
      harvestDate: seed.harvestOffset !== undefined ? hari(seed.harvestOffset) : null,
      status: seed.status,
      yieldAmount: seed.yieldAmount ?? null,
      yieldUnit: seed.yieldUnit ?? null,
      notes: seed.notes ?? "Data contoh.",
    });
  }

  type SoilSeed = { plot: string; offset: number; ph?: number; nitrogen?: number; phosphorus?: number; potassium?: number; organicMatter?: number; unitLabel?: string; method?: string; source?: string; notes?: string };
  const soilSeeds: SoilSeed[] = [
    { plot: "Bedeng A — dekat sumur", offset: -100, ph: 6.1, nitrogen: 22, phosphorus: 14, potassium: 138, organicMatter: 2.8, unitLabel: "ppm (N, P, K) dan % (bahan organik)", method: "Kit uji tanah sederhana", source: "Data contoh — laboratorium daerah", notes: "Data contoh. Nilai ini bukan hasil pengukuran nyata." },
    { plot: "Bedeng A — dekat sumur", offset: -20, ph: 6.5, nitrogen: 26, phosphorus: 16, potassium: 151, organicMatter: 3.2, unitLabel: "ppm (N, P, K) dan % (bahan organik)", method: "Kit uji tanah sederhana", source: "Data contoh — laboratorium daerah", notes: "Data contoh." },
    { plot: "Bedeng B — sisi timur", offset: -70, ph: 5.7, method: "pH meter digital", source: "Data contoh — pengukuran mandiri", notes: "Data contoh. Hanya pH yang diukur, unsur lain belum tersedia." },
  ];
  for (const seed of soilSeeds) {
    const plotId = plotIds[seed.plot];
    if (!plotId) continue;
    await db.insert(soilTests).values({
      id: randomUUID(),
      plotId,
      testDate: hari(seed.offset),
      ph: seed.ph ?? null,
      nitrogen: seed.nitrogen ?? null,
      phosphorus: seed.phosphorus ?? null,
      potassium: seed.potassium ?? null,
      organicMatter: seed.organicMatter ?? null,
      unitLabel: seed.unitLabel ?? null,
      method: seed.method ?? null,
      source: seed.source ?? null,
      notes: seed.notes ?? null,
    });
  }

  type ObsSeed = { plot: string; crop?: string; category: string; offset: number; description: string };
  const obsSeeds: ObsSeed[] = [
    { plot: "Bedeng A — dekat sumur", crop: "Tomat", category: "penyakit", offset: -110, description: "Data contoh. Bercak cokelat pada daun tomat bagian bawah setelah minggu hujan." },
    { plot: "Bedeng B — sisi timur", crop: "Cabai rawit", category: "hama", offset: -9, description: "Data contoh. Kutu daun terlihat di pucuk cabai, jumlah masih sedikit." },
    { plot: "Bedeng C — sisi barat", crop: "Kacang panjang", category: "pertumbuhan", offset: -18, description: "Data contoh. Pertumbuhan sulur merata di seluruh bedeng." },
    { plot: "Bedeng B — sisi timur", category: "cuaca", offset: -5, description: "Data contoh. Hujan deras dua hari berturut-turut, drainase sisi timur agak lambat." },
  ];
  for (const seed of obsSeeds) {
    const plotId = plotIds[seed.plot];
    if (!plotId) continue;
    await db.insert(observations).values({
      id: randomUUID(),
      plotId,
      plantingId: seed.crop ? (plantingIds[`${seed.plot}|${seed.crop}`] ?? null) : null,
      category: seed.category,
      observedAt: hari(seed.offset),
      description: seed.description,
    });
  }

  const reminderSeeds = [
    { plot: "Bedeng A — dekat sumur", title: "Tanam selada sesuai rencana (data contoh)", due: 8, kind: "tanam", isDone: false },
    { plot: "Bedeng B — sisi timur", title: "Periksa kembali pucuk cabai (data contoh)", due: 3, kind: "perawatan", isDone: false },
    { plot: "Bedeng D — percobaan", title: "Ambil sampel tanah untuk diuji (data contoh)", due: 14, kind: "uji-tanah", isDone: false },
    { plot: "Bedeng C — sisi barat", title: "Pasang ajir kacang panjang (data contoh)", due: -12, kind: "perawatan", isDone: true },
  ];
  for (const seed of reminderSeeds) {
    await db.insert(reminders).values({
      id: randomUUID(),
      farmId,
      plotId: plotIds[seed.plot] ?? null,
      title: seed.title,
      dueDate: hari(seed.due),
      kind: seed.kind,
      isDone: seed.isDone,
      completedAt: seed.isDone ? new Date() : null,
      notes: "Data contoh.",
    });
  }

  // Satu rencana rotasi contoh yang alasannya benar-benar dihitung mesin aturan.
  const planPlotId = plotIds["Bedeng A — dekat sumur"];
  const planCropId = cropId("Kacang panjang");
  if (planPlotId && planCropId) {
    const engineInput = await buildEngineInputForPlot(planPlotId);
    const result = suggestRotation(engineInput);
    await db.insert(rotationPlans).values({
      id: randomUUID(),
      plotId: planPlotId,
      seasonId,
      cropId: planCropId,
      status: "direncanakan",
      origin: "manual",
      targetPlantDate: hari(10),
      notes: "Data contoh. Rencana ini dibuat manual oleh seed, alasan mesin aturan disertakan sebagai konteks.",
      recommendationReason: {
        engineVersion: result.engineVersion,
        status: result.status,
        confidence: result.confidence,
        headline: result.headline,
        reasons: result.primary?.cropId === planCropId ? result.primary.reasons : [],
        dataGaps: result.dataGaps,
        disclaimer: result.disclaimer,
        alternatives: result.alternatives.map((alt) => ({
          cropId: alt.cropId,
          cropName: alt.cropName,
          score: alt.score,
          reasons: alt.reasons,
        })),
        createdAt: new Date().toISOString(),
      },
    });
  }

  return farmId;
}

/** Menjalankan katalog contoh + akun contoh. Aman dipanggil berulang kali. */
export async function runSeed(): Promise<{ families: number; crops: number; demoAccountCreated: boolean }> {
  const catalog = await ensureDemoCatalog();
  const demo = await ensureDemoAccount();
  return { ...catalog, demoAccountCreated: demo.created };
}

