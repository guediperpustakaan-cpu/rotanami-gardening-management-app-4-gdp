/**
 * Dipanggil sekali saat server Next.js dinyalakan.
 * Memastikan skema katalog contoh dan akun contoh tersedia di database.
 * Matikan dengan SEED_DEMO_DATA=false pada .env.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.NEXT_PHASE === "phase-production-build") return;
  if (process.env.SEED_DEMO_DATA === "false") return;
  try {
    const { runSeed } = await import("@/server/seed");
    const result = await runSeed();
    console.log(
      `[rotanami] seed siap: keluarga +${result.families}, tanaman +${result.crops}, akun contoh ${result.demoAccountCreated ? "dibuat" : "sudah ada"}`,
    );
  } catch (error) {
    console.error("[rotanami] seed otomatis gagal (aplikasi tetap jalan):", error);
  }
}
