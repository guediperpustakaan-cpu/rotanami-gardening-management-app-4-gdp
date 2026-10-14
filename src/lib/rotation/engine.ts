/**
 * Mesin aturan rotasi tanaman Rotanami.
 *
 * Prinsip:
 * - Murni (tanpa akses database/jaringan) sehingga mudah diuji.
 * - Transparan: setiap skor disertai alasan yang dapat dibaca pengguna.
 * - Konservatif: tidak mengarang masa jeda, presisi, atau klaim agronomi yang
 *   tidak didukung data katalog. Bila data kurang, hasilnya berstatus "kurang"
 *   dan pengguna diarahkan memilih tanaman secara manual.
 */

export const ENGINE_VERSION = "aturan-rotasi-v1";

export const ENGINE_DISCLAIMER =
  "Saran ini adalah panduan umum dari aturan sederhana yang membaca data Anda sendiri, bukan diagnosis agronomi. Sesuaikan dengan kondisi tanah, cuaca, dan pengamatan langsung di kebun Anda.";

export type NutrientCategory = "berat" | "sedang" | "ringan" | "pemulih";

export type EngineCrop = {
  id: string;
  name: string;
  familyName: string | null;
  rotationGroup: string | null;
  nutrientCategory: NutrientCategory | null;
  isCoverCrop: boolean;
};

export type EnginePlanting = {
  cropName: string;
  familyName: string | null;
  rotationGroup: string | null;
  nutrientCategory: NutrientCategory | null;
  isCoverCrop: boolean;
  plantDate: string;
  status: "direncanakan" | "ditanam" | "dipanen" | "dibatalkan";
};

export type EngineIssue = {
  category: "hama" | "penyakit";
  description: string;
  observedAt: string;
  cropName: string | null;
  familyName: string | null;
  rotationGroup: string | null;
};

export type EngineSoilTest = {
  testDate: string;
  ph: number | null;
  organicMatter: number | null;
};

export type EngineInput = {
  crops: EngineCrop[];
  /** Riwayat tanam petak (urutan bebas; mesin akan mengurutkan sendiri). */
  history: EnginePlanting[];
  /** Catatan observasi hama/penyakit pada petak. */
  issues: EngineIssue[];
  lastSoilTest?: EngineSoilTest | null;
};

export type Suggestion = {
  cropId: string;
  cropName: string;
  familyName: string | null;
  rotationGroup: string | null;
  nutrientCategory: NutrientCategory | null;
  isCoverCrop: boolean;
  score: number;
  reasons: string[];
  warnings: string[];
};

export type EngineResult = {
  engineVersion: string;
  /** "cukup" = saran berbasis aturan dapat diberikan; "kurang" = data belum cukup. */
  status: "cukup" | "kurang";
  confidence: "rendah" | "sedang";
  headline: string;
  primary: Suggestion | null;
  alternatives: Suggestion[];
  dataGaps: string[];
  usedData: string[];
  disclaimer: string;
};

export const NOT_ENOUGH_DATA_HEADLINE = "Data belum cukup untuk memberi saran yang lebih spesifik";

function sortHistoryDesc(history: EnginePlanting[]): EnginePlanting[] {
  return [...history].sort((a, b) => (a.plantDate < b.plantDate ? 1 : a.plantDate > b.plantDate ? -1 : 0));
}

function uniqueValues(values: (string | null | undefined)[]): string[] {
  return Array.from(new Set(values.filter((v): v is string => Boolean(v))));
}

export function suggestRotation(input: EngineInput): EngineResult {
  const dataGaps: string[] = [];
  const usedData: string[] = [];
  const history = sortHistoryDesc(input.history.filter((h) => h.status !== "dibatalkan"));
  const issues = input.issues;

  const base = {
    engineVersion: ENGINE_VERSION,
    confidence: "rendah" as const,
    disclaimer: ENGINE_DISCLAIMER,
    dataGaps,
    usedData,
  };

  if (input.crops.length === 0) {
    dataGaps.push(
      "Katalog tanaman belum berisi data, jadi tidak ada pilihan yang bisa dibandingkan dengan riwayat petak.",
    );
    return {
      ...base,
      status: "kurang",
      headline: NOT_ENOUGH_DATA_HEADLINE,
      primary: null,
      alternatives: [],
    };
  }

  if (history.length === 0) {
    dataGaps.push(
      "Petak ini belum memiliki riwayat tanam, sehingga hubungan keluarga botani dengan tanaman sebelumnya tidak dapat diperiksa.",
    );
    dataGaps.push("Catat satu siklus tanam terlebih dahulu, atau pilih tanaman secara manual untuk rencana ini.");
    return {
      ...base,
      status: "kurang",
      headline: NOT_ENOUGH_DATA_HEADLINE,
      primary: null,
      alternatives: [],
    };
  }

  const last = history[0]!;
  usedData.push(`${history.length} catatan riwayat tanam pada petak ini`);
  usedData.push(
    `Tanaman terakhir: ${last.cropName}${last.familyName ? ` (keluarga ${last.familyName})` : " (keluarga tidak tercatat)"}`,
  );

  const historyFamilies = uniqueValues(history.map((h) => h.familyName));
  const historyGroups = uniqueValues(history.map((h) => h.rotationGroup));

  if (historyFamilies.length === 0 && historyGroups.length === 0) {
    dataGaps.push(
      "Keluarga botani dan kelompok rotasi tidak tercatat pada riwayat maupun katalog, sehingga aturan anti-keluarga-serupa tidak dapat diterapkan.",
    );
  } else {
    usedData.push(
      `Keluarga botani dalam riwayat: ${historyFamilies.length > 0 ? historyFamilies.join(", ") : "tidak tercatat"}`,
    );
    if (historyGroups.length > 0) usedData.push(`Kelompok rotasi dalam riwayat: ${historyGroups.join(", ")}`);
  }

  const issueFamilies = uniqueValues(issues.map((i) => i.familyName));
  const issueGroups = uniqueValues(issues.map((i) => i.rotationGroup));
  if (issues.length > 0) {
    usedData.push(
      `${issues.length} catatan ${uniqueValues(issues.map((i) => i.category)).join("/")} pada petak ini`,
    );
    if (issueFamilies.length === 0 && issueGroups.length === 0) {
      dataGaps.push(
        "Catatan hama/penyakit tidak terhubung ke tanaman atau keluarga tertentu, jadi hanya dipakai sebagai peringatan umum.",
      );
    }
  }

  if (!last.nutrientCategory) {
    dataGaps.push(
      "Kategori kebutuhan hara tanaman terakhir tidak diketahui, sehingga urutan pemenuhan hara tidak diperhitungkan.",
    );
  } else {
    usedData.push(`Kategori kebutuhan hara tanaman terakhir: ${last.nutrientCategory}`);
  }

  const catalogHasCoverCrop = input.crops.some((c) => c.isCoverCrop);
  const historyHasCoverCrop = history.some((h) => h.isCoverCrop);
  if (!catalogHasCoverCrop) {
    dataGaps.push(
      "Tidak ada tanaman di katalog yang ditandai sebagai tanaman penutup tanah, sehingga opsi pemulihan tanah tidak ikut dinilai.",
    );
  }

  if (input.lastSoilTest) {
    usedData.push(
      `Hasil uji tanah terakhir (${input.lastSoilTest.testDate}) dipakai sebagai konteks, bukan sebagai dasar rekomendasi pemupukan`,
    );
  } else {
    dataGaps.push(
      "Belum ada hasil uji tanah untuk petak ini. Rotanami tidak memberikan rekomendasi pemupukan tanpa data uji dan aturan yang sesuai.",
    );
  }

  const missingNutrientCount = input.crops.filter((c) => !c.nutrientCategory).length;
  if (missingNutrientCount > 0) {
    dataGaps.push(
      `${missingNutrientCount} tanaman di katalog belum memiliki kategori kebutuhan hara, jadi penilaian urutan hara hanya berlaku untuk tanaman yang datanya lengkap.`,
    );
  }

  const suggestions: Suggestion[] = [];
  const excluded: Suggestion[] = [];

  for (const crop of input.crops) {
    const reasons: string[] = [];
    const warnings: string[] = [];
    let score = 0;
    let isExcluded = false;

    // Aturan 1 & 2: keluarga botani / kelompok rotasi yang sama dengan riwayat.
    if (crop.familyName && historyFamilies.includes(crop.familyName)) {
      const contoh = history.find((h) => h.familyName === crop.familyName)?.cropName ?? "sebelumnya";
      isExcluded = true;
      reasons.push(
        `Keluarganya (${crop.familyName}) sudah tercatat di petak ini, terakhir pada ${contoh}. Aturan yang dipakai: hindari menanam keluarga yang sama pada petak yang berurutan.`,
      );
    } else if (crop.rotationGroup && historyGroups.includes(crop.rotationGroup)) {
      isExcluded = true;
      reasons.push(
        `Termasuk kelompok rotasi "${crop.rotationGroup}" yang sudah tercatat di petak ini. Data keluarga botani tidak tersedia, jadi kelompok rotasi dipakai sebagai pembanding.`,
      );
    } else {
      score += 1;
      const pembanding = crop.familyName ?? crop.rotationGroup ?? null;
      reasons.push(
        pembanding
          ? `Berbeda dari riwayat petak (kelompok/keluarga ${pembanding} tidak muncul pada ${history.length} catatan terakhir).`
          : "Tidak ada data keluarga/kelompok yang bertabrakan dengan riwayat petak ini, namun pembandingnya terbatas.",
      );
      if (!crop.familyName && !crop.rotationGroup) {
        warnings.push("Keluarga botani dan kelompok rotasi tanaman ini belum diisi di katalog.");
      }
    }

    // Aturan 3: catatan hama/penyakit.
    if (!isExcluded && ((crop.familyName && issueFamilies.includes(crop.familyName)) || (crop.rotationGroup && issueGroups.includes(crop.rotationGroup)))) {
      const cocok = crop.familyName && issueFamilies.includes(crop.familyName) ? `keluarga ${crop.familyName}` : `kelompok ${crop.rotationGroup}`;
      const catatan = issues.find(
        (i) => (crop.familyName && i.familyName === crop.familyName) || (crop.rotationGroup && i.rotationGroup === crop.rotationGroup),
      );
      isExcluded = true;
      reasons.push(
        `Ada catatan ${catatan?.category ?? "hama/penyakit"} pada ${cocok} di petak ini${catatan ? ` (${catatan.observedAt})` : ""}. Aturan yang dipakai: hindari tanaman yang terkait dengan catatan tersebut.`,
      );
    } else if (issues.length > 0 && issueFamilies.length === 0 && issueGroups.length === 0) {
      warnings.push(
        "Petak ini punya catatan hama/penyakit yang tidak terhubung ke keluarga tanaman tertentu; periksa ulang sebelum menanam.",
      );
    }

    // Aturan 4a: kategori kebutuhan hara (hanya bila datanya tersedia).
    if (!isExcluded && last.nutrientCategory && crop.nutrientCategory) {
      if (last.nutrientCategory === "berat" && (crop.nutrientCategory === "ringan" || crop.nutrientCategory === "pemulih")) {
        score += 2;
        reasons.push(
          `Tanaman terakhir tergolong pemakan hara berat, sedangkan ${crop.name} tercatat sebagai "${crop.nutrientCategory}". Aturan yang dipakai: beri jeda beban hara setelah tanaman pemakan hara berat.`,
        );
      } else if (
        (last.nutrientCategory === "ringan" || last.nutrientCategory === "pemulih") &&
        (crop.nutrientCategory === "berat" || crop.nutrientCategory === "sedang")
      ) {
        score += 2;
        reasons.push(
          `Tanaman terakhir tergolong "${last.nutrientCategory}", sedangkan ${crop.name} tercatat sebagai "${crop.nutrientCategory}". Aturan yang dipakai: selingi tanaman pemakan hara berat dengan tanaman yang lebih ringan.`,
        );
      } else if (crop.nutrientCategory === last.nutrientCategory && crop.nutrientCategory === "berat") {
        score -= 1;
        warnings.push("Sama-sama tercatat sebagai pemakan hara berat seperti tanaman terakhir.");
      }
    }

    // Aturan 4b: tanaman penutup tanah (hanya bila datanya tersedia).
    if (!isExcluded && crop.isCoverCrop && !historyHasCoverCrop) {
      score += 2;
      reasons.push(
        `Ditandai sebagai tanaman penutup tanah dan belum ada penutup tanah pada ${history.length} catatan riwayat petak ini.`,
      );
    }

    const item: Suggestion = {
      cropId: crop.id,
      cropName: crop.name,
      familyName: crop.familyName,
      rotationGroup: crop.rotationGroup,
      nutrientCategory: crop.nutrientCategory,
      isCoverCrop: crop.isCoverCrop,
      score,
      reasons,
      warnings,
    };

    if (isExcluded) excluded.push(item);
    else suggestions.push(item);
  }

  suggestions.sort((a, b) => (b.score !== a.score ? b.score - a.score : a.cropName.localeCompare(b.cropName, "id")));

  if (suggestions.length === 0) {
    dataGaps.push(
      `Semua ${input.crops.length} tanaman di katalog yang tersedia memiliki keluarga/kelompok rotasi yang sama dengan riwayat petak ini atau terkait catatan hama/penyakit yang tersimpan.`,
    );
    dataGaps.push("Tambahkan tanaman baru ke katalog, atau pilih tanaman secara manual untuk rencana ini.");
    return {
      ...base,
      status: "kurang",
      headline: NOT_ENOUGH_DATA_HEADLINE,
      primary: null,
      alternatives: [],
    };
  }

  const confidence: "rendah" | "sedang" =
    history.length >= 2 && (historyFamilies.length > 0 || historyGroups.length > 0) && dataGaps.length <= 2
      ? "sedang"
      : "rendah";

  const primary = suggestions[0]!;
  const alternatives = suggestions.slice(1, 5);

  return {
    ...base,
    status: "cukup",
    confidence,
    headline:
      confidence === "sedang"
        ? `${primary.cropName} adalah saran utama berdasarkan ${history.length} catatan riwayat petak ini.`
        : `${primary.cropName} diusulkan sebagai pilihan awal, namun datanya masih terbatas.`,
    primary,
    alternatives,
    usedData: [...usedData, `${excluded.length} tanaman dilewati karena aturan keluarga/kelompok atau catatan hama/penyakit`],
  };
}
