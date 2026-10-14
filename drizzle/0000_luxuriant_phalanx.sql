CREATE TABLE "crops" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"farm_id" uuid,
	"name" text NOT NULL,
	"scientific_name" text,
	"family_id" uuid,
	"nutrient_category" text,
	"is_cover_crop" boolean DEFAULT false NOT NULL,
	"guide_notes" text,
	"is_demo" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "crops_nutrient_category_check" CHECK (nutrient_category is null or nutrient_category in ('berat', 'sedang', 'ringan', 'pemulih'))
);
--> statement-breakpoint
CREATE TABLE "farm_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"farm_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" text DEFAULT 'anggota' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "farm_members_farm_user_key" UNIQUE("farm_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "farms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"name" text NOT NULL,
	"location" text,
	"timezone" text DEFAULT 'Asia/Jakarta' NOT NULL,
	"is_demo" boolean DEFAULT false NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "observations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plot_id" uuid NOT NULL,
	"planting_id" uuid,
	"category" text DEFAULT 'lainnya' NOT NULL,
	"observed_at" date NOT NULL,
	"description" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "observations_category_check" CHECK (category in ('hama', 'penyakit', 'pertumbuhan', 'cuaca', 'lainnya'))
);
--> statement-breakpoint
CREATE TABLE "plant_families" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"rotation_group" text,
	"description" text,
	"is_demo" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plantings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plot_id" uuid NOT NULL,
	"crop_id" uuid NOT NULL,
	"season_id" uuid,
	"plant_date" date NOT NULL,
	"harvest_date" date,
	"status" text DEFAULT 'direncanakan' NOT NULL,
	"yield_amount" double precision,
	"yield_unit" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "plantings_status_check" CHECK (status in ('direncanakan', 'ditanam', 'dipanen', 'dibatalkan'))
);
--> statement-breakpoint
CREATE TABLE "plots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"farm_id" uuid NOT NULL,
	"name" text NOT NULL,
	"size" double precision,
	"area_unit" text DEFAULT 'm2' NOT NULL,
	"soil_type" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "plots_farm_name_key" UNIQUE("farm_id","name")
);
--> statement-breakpoint
CREATE TABLE "reminders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"farm_id" uuid NOT NULL,
	"plot_id" uuid,
	"planting_id" uuid,
	"title" text NOT NULL,
	"due_date" date NOT NULL,
	"kind" text DEFAULT 'lainnya' NOT NULL,
	"is_done" boolean DEFAULT false NOT NULL,
	"completed_at" timestamp with time zone,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reminders_kind_check" CHECK (kind in ('tanam', 'panen', 'uji-tanah', 'perawatan', 'lainnya'))
);
--> statement-breakpoint
CREATE TABLE "rotation_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plot_id" uuid NOT NULL,
	"season_id" uuid,
	"crop_id" uuid NOT NULL,
	"status" text DEFAULT 'direncanakan' NOT NULL,
	"recommendation_reason" jsonb,
	"origin" text DEFAULT 'manual' NOT NULL,
	"target_plant_date" date,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "rotation_plans_status_check" CHECK (status in ('direncanakan', 'ditanam', 'dibatalkan', 'selesai')),
	CONSTRAINT "rotation_plans_origin_check" CHECK (origin in ('aturan', 'manual'))
);
--> statement-breakpoint
CREATE TABLE "seasons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"farm_id" uuid NOT NULL,
	"name" text NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "seasons_farm_name_key" UNIQUE("farm_id","name")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"token_hash" text NOT NULL,
	"user_id" uuid NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "soil_tests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plot_id" uuid NOT NULL,
	"test_date" date NOT NULL,
	"ph" double precision,
	"nitrogen" double precision,
	"phosphorus" double precision,
	"potassium" double precision,
	"organic_matter" double precision,
	"unit_label" text,
	"method" text,
	"source" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "soil_tests_ph_check" CHECK (ph is null or (ph >= 0 and ph <= 14))
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"password_hash" text NOT NULL,
	"timezone" text DEFAULT 'Asia/Jakarta' NOT NULL,
	"active_farm_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "crops" ADD CONSTRAINT "crops_farm_id_farms_id_fk" FOREIGN KEY ("farm_id") REFERENCES "public"."farms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crops" ADD CONSTRAINT "crops_family_id_plant_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."plant_families"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "farm_members" ADD CONSTRAINT "farm_members_farm_id_farms_id_fk" FOREIGN KEY ("farm_id") REFERENCES "public"."farms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "farm_members" ADD CONSTRAINT "farm_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "farms" ADD CONSTRAINT "farms_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "observations" ADD CONSTRAINT "observations_plot_id_plots_id_fk" FOREIGN KEY ("plot_id") REFERENCES "public"."plots"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "observations" ADD CONSTRAINT "observations_planting_id_plantings_id_fk" FOREIGN KEY ("planting_id") REFERENCES "public"."plantings"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plantings" ADD CONSTRAINT "plantings_plot_id_plots_id_fk" FOREIGN KEY ("plot_id") REFERENCES "public"."plots"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plantings" ADD CONSTRAINT "plantings_crop_id_crops_id_fk" FOREIGN KEY ("crop_id") REFERENCES "public"."crops"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plantings" ADD CONSTRAINT "plantings_season_id_seasons_id_fk" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plots" ADD CONSTRAINT "plots_farm_id_farms_id_fk" FOREIGN KEY ("farm_id") REFERENCES "public"."farms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reminders" ADD CONSTRAINT "reminders_farm_id_farms_id_fk" FOREIGN KEY ("farm_id") REFERENCES "public"."farms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reminders" ADD CONSTRAINT "reminders_plot_id_plots_id_fk" FOREIGN KEY ("plot_id") REFERENCES "public"."plots"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reminders" ADD CONSTRAINT "reminders_planting_id_plantings_id_fk" FOREIGN KEY ("planting_id") REFERENCES "public"."plantings"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rotation_plans" ADD CONSTRAINT "rotation_plans_plot_id_plots_id_fk" FOREIGN KEY ("plot_id") REFERENCES "public"."plots"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rotation_plans" ADD CONSTRAINT "rotation_plans_season_id_seasons_id_fk" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rotation_plans" ADD CONSTRAINT "rotation_plans_crop_id_crops_id_fk" FOREIGN KEY ("crop_id") REFERENCES "public"."crops"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seasons" ADD CONSTRAINT "seasons_farm_id_farms_id_fk" FOREIGN KEY ("farm_id") REFERENCES "public"."farms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "soil_tests" ADD CONSTRAINT "soil_tests_plot_id_plots_id_fk" FOREIGN KEY ("plot_id") REFERENCES "public"."plots"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "crops_farm_id_idx" ON "crops" USING btree ("farm_id");--> statement-breakpoint
CREATE INDEX "crops_family_id_idx" ON "crops" USING btree ("family_id");--> statement-breakpoint
CREATE INDEX "farms_owner_id_idx" ON "farms" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "observations_plot_id_idx" ON "observations" USING btree ("plot_id");--> statement-breakpoint
CREATE INDEX "observations_planting_id_idx" ON "observations" USING btree ("planting_id");--> statement-breakpoint
CREATE UNIQUE INDEX "plant_families_name_key" ON "plant_families" USING btree ("name");--> statement-breakpoint
CREATE INDEX "plantings_plot_id_idx" ON "plantings" USING btree ("plot_id");--> statement-breakpoint
CREATE INDEX "plantings_plant_date_idx" ON "plantings" USING btree ("plant_date");--> statement-breakpoint
CREATE INDEX "plantings_crop_id_idx" ON "plantings" USING btree ("crop_id");--> statement-breakpoint
CREATE INDEX "plots_farm_id_idx" ON "plots" USING btree ("farm_id");--> statement-breakpoint
CREATE INDEX "reminders_farm_id_idx" ON "reminders" USING btree ("farm_id");--> statement-breakpoint
CREATE INDEX "reminders_due_date_idx" ON "reminders" USING btree ("due_date");--> statement-breakpoint
CREATE INDEX "rotation_plans_plot_id_idx" ON "rotation_plans" USING btree ("plot_id");--> statement-breakpoint
CREATE INDEX "rotation_plans_season_id_idx" ON "rotation_plans" USING btree ("season_id");--> statement-breakpoint
CREATE INDEX "seasons_farm_id_idx" ON "seasons" USING btree ("farm_id");--> statement-breakpoint
CREATE UNIQUE INDEX "sessions_token_hash_key" ON "sessions" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "sessions_user_id_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "soil_tests_plot_id_idx" ON "soil_tests" USING btree ("plot_id");--> statement-breakpoint
CREATE INDEX "soil_tests_test_date_idx" ON "soil_tests" USING btree ("test_date");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_key" ON "users" USING btree ("email");