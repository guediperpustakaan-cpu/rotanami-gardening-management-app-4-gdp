import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

/**
 * Skema database Rotanami.
 *
 * Kebijakan penghapusan:
 * - Data milik kebun/petak ikut terhapus (cascade) HANYA setelah pengguna
 *   mengonfirmasi penghapusan secara eksplisit di antarmuka/API.
 * - `crops` dipakai `restrict` pada riwayat agar tanaman yang sudah punya
 *   riwayat tanam tidak bisa hilang dan merusak jejak data.
 */

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull(),
    name: text("name").notNull(),
    passwordHash: text("password_hash").notNull(),
    timezone: text("timezone").notNull().default("Asia/Jakarta"),
    // Tidak memakai foreign key agar tidak ada relasi melingkar users <-> farms.
    activeFarmId: uuid("active_farm_id"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex("users_email_key").on(t.email)],
);

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tokenHash: text("token_hash").notNull(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true, mode: "date" }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex("sessions_token_hash_key").on(t.tokenHash), index("sessions_user_id_idx").on(t.userId)],
);

export const farms = pgTable(
  "farms",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    location: text("location"),
    timezone: text("timezone").notNull().default("Asia/Jakarta"),
    /** Penanda bahwa isi kebun ini adalah data contoh, bukan data pengguna. */
    isDemo: boolean("is_demo").notNull().default(false),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("farms_owner_id_idx").on(t.ownerId)],
);

export const farmMembers = pgTable(
  "farm_members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    farmId: uuid("farm_id")
      .notNull()
      .references(() => farms.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: text("role").notNull().default("anggota"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (t) => [unique("farm_members_farm_user_key").on(t.farmId, t.userId)],
);

export const plots = pgTable(
  "plots",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    farmId: uuid("farm_id")
      .notNull()
      .references(() => farms.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    size: doublePrecision("size"),
    areaUnit: text("area_unit").notNull().default("m2"),
    soilType: text("soil_type"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("plots_farm_id_idx").on(t.farmId), unique("plots_farm_name_key").on(t.farmId, t.name)],
);

export const plantFamilies = pgTable(
  "plant_families",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    rotationGroup: text("rotation_group"),
    description: text("description"),
    isDemo: boolean("is_demo").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex("plant_families_name_key").on(t.name)],
);

export const crops = pgTable(
  "crops",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** null = katalog contoh bersama (dapat dibaca semua pengguna, tidak dapat diubah). */
    farmId: uuid("farm_id").references(() => farms.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    scientificName: text("scientific_name"),
    familyId: uuid("family_id").references(() => plantFamilies.id, { onDelete: "set null" }),
    /** berat | sedang | ringan | pemulih — boleh kosong bila tidak diketahui. */
    nutrientCategory: text("nutrient_category"),
    isCoverCrop: boolean("is_cover_crop").notNull().default(false),
    guideNotes: text("guide_notes"),
    isDemo: boolean("is_demo").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("crops_farm_id_idx").on(t.farmId),
    index("crops_family_id_idx").on(t.familyId),
    check(
      "crops_nutrient_category_check",
      sql`nutrient_category is null or nutrient_category in ('berat', 'sedang', 'ringan', 'pemulih')`,
    ),
  ],
);

export const seasons = pgTable(
  "seasons",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    farmId: uuid("farm_id")
      .notNull()
      .references(() => farms.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    startDate: date("start_date", { mode: "string" }).notNull(),
    endDate: date("end_date", { mode: "string" }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("seasons_farm_id_idx").on(t.farmId), unique("seasons_farm_name_key").on(t.farmId, t.name)],
);

export const plantings = pgTable(
  "plantings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    plotId: uuid("plot_id")
      .notNull()
      .references(() => plots.id, { onDelete: "cascade" }),
    cropId: uuid("crop_id")
      .notNull()
      .references(() => crops.id, { onDelete: "restrict" }),
    seasonId: uuid("season_id").references(() => seasons.id, { onDelete: "set null" }),
    plantDate: date("plant_date", { mode: "string" }).notNull(),
    harvestDate: date("harvest_date", { mode: "string" }),
    status: text("status").notNull().default("direncanakan"),
    yieldAmount: doublePrecision("yield_amount"),
    yieldUnit: text("yield_unit"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("plantings_plot_id_idx").on(t.plotId),
    index("plantings_plant_date_idx").on(t.plantDate),
    index("plantings_crop_id_idx").on(t.cropId),
    check("plantings_status_check", sql`status in ('direncanakan', 'ditanam', 'dipanen', 'dibatalkan')`),
  ],
);

export const soilTests = pgTable(
  "soil_tests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    plotId: uuid("plot_id")
      .notNull()
      .references(() => plots.id, { onDelete: "cascade" }),
    testDate: date("test_date", { mode: "string" }).notNull(),
    ph: doublePrecision("ph"),
    nitrogen: doublePrecision("nitrogen"),
    phosphorus: doublePrecision("phosphorus"),
    potassium: doublePrecision("potassium"),
    organicMatter: doublePrecision("organic_matter"),
    /** Satuan bebas untuk N/P/K & bahan organik, contoh: "ppm" atau "%". */
    unitLabel: text("unit_label"),
    method: text("method"),
    source: text("source"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("soil_tests_plot_id_idx").on(t.plotId),
    index("soil_tests_test_date_idx").on(t.testDate),
    check("soil_tests_ph_check", sql`ph is null or (ph >= 0 and ph <= 14)`),
  ],
);

export const observations = pgTable(
  "observations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    plotId: uuid("plot_id")
      .notNull()
      .references(() => plots.id, { onDelete: "cascade" }),
    plantingId: uuid("planting_id").references(() => plantings.id, { onDelete: "set null" }),
    category: text("category").notNull().default("lainnya"),
    observedAt: date("observed_at", { mode: "string" }).notNull(),
    description: text("description").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("observations_plot_id_idx").on(t.plotId),
    index("observations_planting_id_idx").on(t.plantingId),
    check(
      "observations_category_check",
      sql`category in ('hama', 'penyakit', 'pertumbuhan', 'cuaca', 'lainnya')`,
    ),
  ],
);

export const rotationPlans = pgTable(
  "rotation_plans",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    plotId: uuid("plot_id")
      .notNull()
      .references(() => plots.id, { onDelete: "cascade" }),
    seasonId: uuid("season_id").references(() => seasons.id, { onDelete: "set null" }),
    cropId: uuid("crop_id")
      .notNull()
      .references(() => crops.id, { onDelete: "restrict" }),
    status: text("status").notNull().default("direncanakan"),
    /** Alasan rekomendasi dalam format terstruktur (dibuat mesin aturan atau null bila manual). */
    recommendationReason: jsonb("recommendation_reason"),
    /** 'aturan' = dari perencana otomatis, 'manual' = dipilih pengguna. */
    origin: text("origin").notNull().default("manual"),
    targetPlantDate: date("target_plant_date", { mode: "string" }),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("rotation_plans_plot_id_idx").on(t.plotId),
    index("rotation_plans_season_id_idx").on(t.seasonId),
    check("rotation_plans_status_check", sql`status in ('direncanakan', 'ditanam', 'dibatalkan', 'selesai')`),
    check("rotation_plans_origin_check", sql`origin in ('aturan', 'manual')`),
  ],
);

export const reminders = pgTable(
  "reminders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    farmId: uuid("farm_id")
      .notNull()
      .references(() => farms.id, { onDelete: "cascade" }),
    plotId: uuid("plot_id").references(() => plots.id, { onDelete: "set null" }),
    plantingId: uuid("planting_id").references(() => plantings.id, { onDelete: "set null" }),
    title: text("title").notNull(),
    dueDate: date("due_date", { mode: "string" }).notNull(),
    kind: text("kind").notNull().default("lainnya"),
    isDone: boolean("is_done").notNull().default(false),
    completedAt: timestamp("completed_at", { withTimezone: true, mode: "date" }),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("reminders_farm_id_idx").on(t.farmId),
    index("reminders_due_date_idx").on(t.dueDate),
    check("reminders_kind_check", sql`kind in ('tanam', 'panen', 'uji-tanah', 'perawatan', 'lainnya')`),
  ],
);

export type User = typeof users.$inferSelect;
export type Farm = typeof farms.$inferSelect;
export type Plot = typeof plots.$inferSelect;
export type Crop = typeof crops.$inferSelect;
export type PlantFamily = typeof plantFamilies.$inferSelect;
export type Season = typeof seasons.$inferSelect;
export type Planting = typeof plantings.$inferSelect;
export type SoilTest = typeof soilTests.$inferSelect;
export type Observation = typeof observations.$inferSelect;
export type RotationPlan = typeof rotationPlans.$inferSelect;
export type Reminder = typeof reminders.$inferSelect;

export const AREA_UNITS = ["m2", "hektar", "are", "bedeng"] as const;
export const PLANTING_STATUSES = ["direncanakan", "ditanam", "dipanen", "dibatalkan"] as const;
export const OBSERVATION_CATEGORIES = ["hama", "penyakit", "pertumbuhan", "cuaca", "lainnya"] as const;
export const ROTATION_PLAN_STATUSES = ["direncanakan", "ditanam", "selesai", "dibatalkan"] as const;
export const REMINDER_KINDS = ["tanam", "panen", "uji-tanah", "perawatan", "lainnya"] as const;
export const NUTRIENT_CATEGORIES = ["berat", "sedang", "ringan", "pemulih"] as const;

export const AREA_UNIT_LABELS: Record<(typeof AREA_UNITS)[number], string> = {
  m2: "m²",
  hektar: "hektar",
  are: "are",
  bedeng: "bedeng",
};
