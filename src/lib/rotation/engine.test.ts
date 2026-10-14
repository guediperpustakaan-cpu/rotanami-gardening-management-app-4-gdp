import { describe, expect, it } from "vitest";
import {
  ENGINE_VERSION,
  NOT_ENOUGH_DATA_HEADLINE,
  suggestRotation,
  type EngineCrop,
  type EnginePlanting,
} from "./engine";

const crop = (over: Partial<EngineCrop> & { id: string; name: string }): EngineCrop => ({
  familyName: null,
  rotationGroup: null,
  nutrientCategory: null,
  isCoverCrop: false,
  ...over,
});

const planting = (over: Partial<EnginePlanting> & { cropName: string }): EnginePlanting => ({
  familyName: null,
  rotationGroup: null,
  nutrientCategory: null,
  isCoverCrop: false,
  plantDate: "2025-01-10",
  status: "dipanen",
  ...over,
});

const crops: EngineCrop[] = [
  crop({ id: "c1", name: "Tomat", familyName: "Solanaceae", rotationGroup: "buah", nutrientCategory: "berat" }),
  crop({ id: "c2", name: "Kangkung", familyName: "Convolvulaceae", rotationGroup: "daun", nutrientCategory: "ringan" }),
  crop({ id: "c3", name: "Kacang panjang", familyName: "Fabaceae", rotationGroup: "kacang", nutrientCategory: "pemulih" }),
  crop({ id: "c4", name: "Wortel", familyName: "Apiaceae", rotationGroup: "akar", nutrientCategory: "sedang" }),
];

describe("suggestRotation", () => {
  it("menyatakan data belum cukup bila petak tidak punya riwayat tanam", () => {
    const result = suggestRotation({ crops, history: [], issues: [] });
    expect(result.status).toBe("kurang");
    expect(result.headline).toBe(NOT_ENOUGH_DATA_HEADLINE);
    expect(result.primary).toBeNull();
    expect(result.alternatives).toHaveLength(0);
    expect(result.dataGaps.length).toBeGreaterThan(0);
    expect(result.engineVersion).toBe(ENGINE_VERSION);
  });

  it("menyatakan data belum cukup bila katalog kosong", () => {
    const result = suggestRotation({
      crops: [],
      history: [planting({ cropName: "Tomat", familyName: "Solanaceae" })],
      issues: [],
    });
    expect(result.status).toBe("kurang");
    expect(result.primary).toBeNull();
  });

  it("tidak menyarankan tanaman dari keluarga yang sama dengan riwayat petak", () => {
    const result = suggestRotation({
      crops,
      history: [planting({ cropName: "Tomat", familyName: "Solanaceae", rotationGroup: "buah", plantDate: "2025-03-01" })],
      issues: [],
    });
    expect(result.status).toBe("cukup");
    expect(result.primary?.cropName).not.toBe("Tomat");
    expect(result.primary && result.primary.cropId).not.toBe("c1");
    expect(result.alternatives.map((a) => a.cropId)).not.toContain("c1");
  });

  it("memakai kelompok rotasi sebagai pembanding bila keluarga botani tidak tercatat", () => {
    const result = suggestRotation({
      crops: [
        crop({ id: "a", name: "Bayam", rotationGroup: "daun" }),
        crop({ id: "b", name: "Wortel", rotationGroup: "akar" }),
      ],
      history: [planting({ cropName: "Kangkung", rotationGroup: "daun" })],
      issues: [],
    });
    expect(result.primary?.cropName).toBe("Wortel");
  });

  it("mengecualikan tanaman yang keluarganya terkait catatan hama/penyakit", () => {
    const result = suggestRotation({
      crops,
      history: [planting({ cropName: "Wortel", familyName: "Apiaceae", rotationGroup: "akar", plantDate: "2025-02-01" })],
      issues: [
        {
          category: "penyakit",
          description: "Bercak daun pada kangkung",
          observedAt: "2025-02-20",
          cropName: "Kangkung",
          familyName: "Convolvulaceae",
          rotationGroup: "daun",
        },
      ],
    });
    expect(result.primary && result.primary.cropId).not.toBe("c2");
    expect(result.usedData.join(" ")).toContain("catatan");
  });

  it("menaikkan skor tanaman ringan/pemulih setelah tanaman pemakan hara berat", () => {
    const result = suggestRotation({
      crops,
      history: [
        planting({
          cropName: "Cabai",
          familyName: "Solanaceae",
          rotationGroup: "buah",
          nutrientCategory: "berat",
          plantDate: "2025-04-01",
        }),
        planting({ cropName: "Bawang daun", familyName: "Amaryllidaceae", rotationGroup: "daun", plantDate: "2024-11-01" }),
      ],
      issues: [],
    });
    const kacang = result.alternatives.find((a) => a.cropId === "c3") ?? result.primary;
    expect(kacang?.cropId).toBe("c3");
    expect(kacang?.reasons.join(" ")).toContain("hara");
  });

  it("memberi nilai tambah pada tanaman penutup tanah bila belum ada di riwayat", () => {
    const result = suggestRotation({
      crops: [
        crop({ id: "x", name: "Selada", familyName: "Asteraceae", rotationGroup: "daun", nutrientCategory: "ringan" }),
        crop({ id: "y", name: "Orok-orok", familyName: "Fabaceae", rotationGroup: "kacang", isCoverCrop: true }),
      ],
      history: [planting({ cropName: "Tomat", familyName: "Solanaceae", rotationGroup: "buah", plantDate: "2025-05-01" })],
      issues: [],
    });
    expect(result.primary?.cropId).toBe("y");
    expect(result.primary?.reasons.join(" ")).toContain("penutup tanah");
  });

  it("menyatakan data belum cukup bila seluruh tanaman katalog tereksklusi", () => {
    const result = suggestRotation({
      crops: [crop({ id: "s1", name: "Terong", familyName: "Solanaceae" })],
      history: [planting({ cropName: "Tomat", familyName: "Solanaceae" })],
      issues: [],
    });
    expect(result.status).toBe("kurang");
    expect(result.headline).toBe(NOT_ENOUGH_DATA_HEADLINE);
    expect(result.dataGaps.join(" ")).toContain("pilih tanaman secara manual");
  });

  it("mengabaikan riwayat berstatus dibatalkan", () => {
    const result = suggestRotation({
      crops: [crop({ id: "s1", name: "Terong", familyName: "Solanaceae" })],
      history: [planting({ cropName: "Tomat", familyName: "Solanaceae", status: "dibatalkan" })],
      issues: [],
    });
    expect(result.status).toBe("kurang");
    expect(result.dataGaps.join(" ")).toContain("belum memiliki riwayat tanam");
  });

  it("mencatat kekurangan data hara dan uji tanah tanpa membuat klaim pemupukan", () => {
    const result = suggestRotation({
      crops,
      history: [planting({ cropName: "Tomat", familyName: "Solanaceae", plantDate: "2025-06-01" })],
      issues: [],
      lastSoilTest: null,
    });
    const gaps = result.dataGaps.join(" ").toLowerCase();
    expect(gaps).toContain("kategori kebutuhan hara");
    expect(gaps).toContain("uji tanah");
    expect(result.disclaimer).toContain("bukan diagnosis agronomi");
  });

  it("menyertakan alasan pada setiap saran utama dan membatasi alternatif", () => {
    const manyCrops = Array.from({ length: 12 }, (_, i) =>
      crop({ id: `m${i}`, name: `Tanaman ${i}`, familyName: `Fam${i}`, rotationGroup: `grup${i}` }),
    );
    const result = suggestRotation({
      crops: manyCrops,
      history: [planting({ cropName: "Tomat", familyName: "Solanaceae", plantDate: "2025-06-01" })],
      issues: [],
    });
    expect(result.primary).not.toBeNull();
    expect(result.primary!.reasons.length).toBeGreaterThan(0);
    expect(result.alternatives.length).toBeLessThanOrEqual(4);
    expect(result.confidence === "rendah" || result.confidence === "sedang").toBe(true);
  });
});
