import { Router, json } from "@/server/http";
import authRoutes from "@/server/routes/auth";
import catalogRoutes from "@/server/routes/catalog";
import farmRoutes from "@/server/routes/farm";
import recordRoutes from "@/server/routes/records";
import eksporRoutes from "@/server/routes/ekspor";

/**
 * Router API Rotanami (gaya Express: method + pola path dengan parameter `:id`).
 * Dipasang pada satu route handler Next.js `app/api/[...rest]/route.ts`.
 */
export const apiRouter = new Router();

apiRouter.get(
  "/dokumentasi",
  () =>
    json({
      nama: "API Rotanami",
      autentikasi: "Cookie sesi HttpOnly bernama rotanami_sesi. Semua endpoint di bawah (kecuali /auth/*) memerlukan sesi aktif.",
      format: "JSON UTF-8. Kesalahan dikembalikan sebagai { error: string, fields?: Record<string,string> }.",
      endpoints: [
        "POST   /api/auth/daftar — buat akun baru",
        "POST   /api/auth/masuk — masuk dan menerima cookie sesi",
        "POST   /api/auth/keluar — akhiri sesi",
        "GET    /api/auth/saya — profil pengguna + daftar kebun",
        "PATCH  /api/auth/profil — ubah nama/email/zona waktu",
        "POST   /api/auth/kata-sandi — ubah kata sandi",
        "GET    /api/kebun — daftar kebun yang dapat diakses",
        "POST   /api/kebun — buat kebun baru",
        "POST   /api/kebun/contoh — buat kebun berisi data contoh",
        "GET    /api/kebun/:id — detail kebun",
        "PATCH  /api/kebun/:id — ubah profil kebun",
        "POST   /api/kebun/:id/aktif — jadikan kebun aktif",
        "DELETE /api/kebun/:id — hapus kebun (wajib konfirmasi nama)",
        "GET    /api/ringkasan — data dashboard kebun aktif",
        "GET    /api/petak?farmId= — daftar petak",
        "POST   /api/petak — tambah petak",
        "GET    /api/petak/:id — detail petak",
        "PATCH  /api/petak/:id — ubah petak",
        "DELETE /api/petak/:id — hapus petak (wajib konfirmasi nama)",
        "GET    /api/musim?farmId= — daftar musim",
        "POST   /api/musim — tambah musim",
        "PATCH  /api/musim/:id — ubah musim",
        "DELETE /api/musim/:id — hapus musim",
        "GET    /api/katalog/tanaman?q=&familyId=&mine=1 — cari tanaman",
        "POST   /api/katalog/tanaman — tambah tanaman ke kebun",
        "GET    /api/katalog/tanaman/:id — detail tanaman",
        "PATCH  /api/katalog/tanaman/:id — ubah tanaman milik kebun",
        "DELETE /api/katalog/tanaman/:id — hapus tanaman (wajib konfirmasi nama)",
        "POST   /api/katalog/tanaman/:id/salin — salin tanaman contoh ke kebun",
        "GET    /api/katalog/keluarga — daftar keluarga botani",
        "POST   /api/katalog/keluarga — tambah keluarga botani",
        "GET    /api/riwayat-tanam?plotId=|farmId= — riwayat penanaman",
        "POST   /api/riwayat-tanam — catat penanaman",
        "PATCH  /api/riwayat-tanam/:id — ubah catatan penanaman",
        "DELETE /api/riwayat-tanam/:id — hapus catatan penanaman",
        "GET    /api/uji-tanah?plotId=|farmId= — hasil uji tanah",
        "POST   /api/uji-tanah — simpan hasil uji tanah",
        "PATCH  /api/uji-tanah/:id — ubah hasil uji tanah",
        "DELETE /api/uji-tanah/:id — hapus hasil uji tanah",
        "GET    /api/observasi?plotId=|farmId= — catatan observasi",
        "POST   /api/observasi — simpan observasi",
        "PATCH  /api/observasi/:id — ubah observasi",
        "DELETE /api/observasi/:id — hapus observasi",
        "POST   /api/rotasi/saran — minta saran rotasi berbasis aturan",
        "GET    /api/rencana-rotasi?farmId= — daftar rencana rotasi",
        "POST   /api/rencana-rotasi — simpan rencana rotasi",
        "PATCH  /api/rencana-rotasi/:id — ubah/batalkan rencana",
        "DELETE /api/rencana-rotasi/:id — hapus rencana",
        "GET    /api/pengingat?farmId= — daftar pengingat",
        "POST   /api/pengingat — buat pengingat",
        "PATCH  /api/pengingat/:id — ubah/tandai selesai",
        "DELETE /api/pengingat/:id — hapus pengingat",
        "GET    /api/ekspor/riwayat-tanam.csv — ekspor CSV riwayat tanam",
        "GET    /api/ekspor/uji-tanah.csv — ekspor CSV hasil uji tanah",
        "GET    /api/ekspor/observasi.csv — ekspor CSV observasi",
      ],
    }),
  false,
);

apiRouter.mount(authRoutes);
apiRouter.mount(catalogRoutes);
apiRouter.mount(farmRoutes);
apiRouter.mount(recordRoutes);
apiRouter.mount(eksporRoutes);
