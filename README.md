# Rotanami

Rotanami adalah aplikasi web berbahasa Indonesia untuk membantu **pekebun rumahan, kebun komunitas, dan petani skala
kecil** mengelola petak kebun, mencatat riwayat tanam, merencanakan rotasi tanaman, serta menyimpan hasil uji tanah.

> **Catatan nama.** “Rotanami” adalah **nama kerja yang dikarang** untuk proyek ini. Nama ini **tidak** diklaim unik
> secara global, **tidak** dinyatakan bebas merek dagang, dan **tidak** dinyatakan tersedia sebagai domain. Identitas
> visual (logo tunas sederhana, palet hijau lumut–tanah liat–krem) dibuat orisinal dan tidak memakai logo, merek, atau
> aset perusahaan/bisnis lain.

---

## 1. Fitur yang sudah berfungsi

| Area | Yang bisa dilakukan |
| --- | --- |
| Autentikasi | Daftar akun, masuk, keluar, ganti kata sandi. Sesi sisi server (tabel `sessions`) dikirim sebagai **cookie HttpOnly**; kata sandi di-hash **scrypt + salt**. Tidak ada token di `localStorage`. |
| Dashboard | Salam + kebun aktif, jumlah petak, rencana musim ini, petak yang sedang ditanami, jumlah tindakan yang perlu dilakukan, daftar petak dengan tanaman terakhir atau “Belum ada riwayat”, aktivitas berikutnya, tombol aksi “Tambah petak”, “Catat tanaman”, “Buat rencana rotasi”, serta empty state untuk memulai. |
| Kebun & petak | Buat/ubah profil kebun (nama, lokasi, zona waktu, catatan), buat banyak kebun, ganti kebun aktif, tambah/ubah/hapus petak (nama, ukuran, satuan luas, jenis tanah, catatan), halaman detail petak, hapus dengan **konfirmasi mengetik nama**. |
| Katalog tanaman | Pencarian + filter keluarga botani + filter “hanya tanaman kebun saya”, nama umum Indonesia, nama ilmiah opsional, keluarga botani/kelompok rotasi, kategori kebutuhan hara, penanda tanaman penutup tanah, catatan panduan. Katalog **disimpan di database** sehingga mudah ditambah; tanaman contoh berlabel **“Data contoh”** dan dapat **disalin ke kebun** agar bisa diubah. |
| Riwayat penanaman | Catat petak, tanaman, tanggal tanam, tanggal panen (opsional), status (direncanakan/ditanam/dipanen/dibatalkan), hasil panen + satuan (opsional), catatan. Setiap siklus disimpan sebagai **baris terpisah**, tampil urut terbaru, dapat diubah/dihapus dengan konfirmasi. |
| Perencana rotasi | Pilih petak + musim → minta saran → satu saran utama + alternatif, **alasan per saran**, daftar **data yang dipakai**, daftar **keterbatasan data**, tingkat keyakinan, disclaimer. Bila data kurang muncul pesan “Data belum cukup untuk memberi saran yang lebih spesifik” dan pengguna diarahkan memilih tanaman sendiri. Rencana dapat disimpan, diubah, dibatalkan, dihapus. |
| Kalender & pengingat | Tampilan **kalender bulan** dan **daftar agenda**: rencana tanam, tanggal tanam, tanggal panen yang sudah tercatat, dan pengingat buatan pengguna. Status tugas belum/selesai dapat diubah. Pengingat **hanya di dalam aplikasi** (tidak ada klaim email/push). |
| Catatan kesehatan tanah | Simpan hasil uji per petak: tanggal tes (wajib), pH, N, P, K, bahan organik, satuan, metode, sumber, catatan. Semua nilai **opsional**; nilai yang tidak diisi ditampilkan sebagai “tidak diukur”, tidak pernah dikarang. Tren garis sederhana (Recharts) muncul bila ada ≥ 2 hasil uji. Tidak ada diagnosis atau rekomendasi pemupukan presisi. |
| Observasi | Catat observasi per petak: kategori (hama, penyakit, pertumbuhan, cuaca, lainnya), tanggal, deskripsi, tautan ke siklus tanam. Catatan hama/penyakit ikut dibaca perencana rotasi. |
| Ekspor | CSV untuk **riwayat penanaman**, **hasil uji tanah**, dan **observasi** (pemisah titik koma + BOM UTF-8 agar ramah Excel locale Indonesia). Tombol PDF **sengaja tidak disediakan** karena ekspor PDF belum dapat dibuat andal di implementasi ini. |

---

## 2. Keputusan teknis (penting dibaca)

Spesifikasi meminta **React + Vite** untuk frontend dan **Express/Fastify** untuk backend. Lingkungan eksekusi proyek
ini menjalankan **Next.js (App Router)** sebagai satu runtime yang sudah terhubung ke PostgreSQL, sehingga implementasi
ini memakai:

- **Frontend**: React 19 + TypeScript + Tailwind CSS v4 (App Router, komponen klien untuk interaksi).
- **Backend**: Node.js + TypeScript. Endpoint REST ditulis sebagai **route handler** Next.js
  (`src/app/api/[...rest]/route.ts`) yang meneruskan permintaan ke **router buatan sendiri bergaya Express**
  (`src/server/http.ts`: method + pola path `:id`, middleware autentikasi, penanganan error terpusat).
- **Database**: PostgreSQL. Driver dipilih otomatis: **Neon serverless HTTP** (`@neondatabase/serverless`) bila
  `DATABASE_URL` mengarah ke `*.neon.tech` atau `DATABASE_DRIVER=neon`, dan **node-postgres (TCP + TLS)** untuk
  PostgreSQL biasa. Connection string **hanya dibaca di sisi server**; tidak ada kredensial di bundel frontend.
- **ORM/migrasi**: Drizzle ORM + drizzle-kit.
- **Validasi**: Zod (skema di `src/lib/schemas.ts` dipakai bersama oleh formulir dan API).
- **Form**: React Hook Form + `@hookform/resolvers`.
- **Grafik**: Recharts.
- **Pengujian**: Vitest (unit test mesin aturan rotasi).

Struktur backend dipisahkan rapi (`src/server/*`) sehingga handler-nya dapat dipindahkan ke Express/Fastify tanpa
mengubah logika: `Router` menerima objek `Request` standar Web API dan mengembalikan `Response`.

---

## 3. Menjalankan secara lokal

### Prasyarat

- Node.js 20 atau lebih baru
- Akses ke PostgreSQL lokal **atau** akun Neon (gratis)

### Langkah

```bash
# 1. Pasang dependensi
npm install

# 2. Siapkan variabel lingkungan
cp .env.example .env
#    lalu isi DATABASE_URL

# 3. Terapkan skema database (migrasi)
npx drizzle-kit push

#    (opsional, alur migrasi berfile untuk produksi)
npx drizzle-kit generate
npx drizzle-kit migrate

# 4. Jalankan aplikasi (frontend + backend dalam satu proses)
npm run dev
#    buka http://localhost:3000

# 5. Mode produksi
npm run build
npm start

# 6. Unit test mesin aturan rotasi
npx vitest run

# 7. Pemeriksaan tipe
npx next typegen
npm run typecheck
```

### Seed / data contoh

Seed dijalankan **otomatis saat server menyala** (`src/instrumentation.ts`) dan bersifat idempoten:

1. `ensureDemoCatalog()` — mengisi 12 keluarga botani + 32 tanaman contoh (`is_demo = true`, `farm_id = null`).
2. `ensureDemoAccount()` — membuat akun contoh beserta kebun berisi petak, riwayat tanam, hasil uji tanah, observasi,
   pengingat, dan satu rencana rotasi (semuanya berlabel **“Data contoh”**).

Matikan dengan `SEED_DEMO_DATA=false` pada `.env`. Pengguna yang sudah masuk juga dapat memuat kebun contoh kapan saja
lewat tombol **“Muat kebun contoh”** di halaman **Pengaturan** (membuat kebun baru berlabel contoh, tidak menimpa data
Anda).

### Membuat database Neon

1. Buka [neon.tech](https://neon.tech) → buat proyek baru, pilih region terdekat.
2. Salin **connection string** (format
   `postgresql://user:password@ep-xxx-pooler.region.aws.neon.tech/dbname?sslmode=require`).
3. Tempel ke `DATABASE_URL` di `.env`. Jangan masukkan ke variabel `NEXT_PUBLIC_*`.
4. Jalankan `npx drizzle-kit push`.

---

## 4. Variabel lingkungan

| Variabel | Wajib | Keterangan |
| --- | --- | --- |
| `DATABASE_URL` | ya | Connection string PostgreSQL/Neon. Hanya dibaca server. |
| `DATABASE_DRIVER` | tidak | `neon` atau `node-postgres`. Default: otomatis dari host. |
| `SEED_DEMO_DATA` | tidak | `false` untuk menonaktifkan seed data contoh saat start. |
| `APP_URL` | tidak | Hanya untuk log/pesan. |

Tidak ada secret yang dikirim ke frontend: seluruh berkas di `src/lib/*` yang dipakai klien tidak membaca
`process.env`, dan koneksi database hanya ada di `src/db` + `src/server`.

---

## 5. Akun & data demo

| Item | Nilai |
| --- | --- |
| Email | `petani@contoh.rotanami` |
| Kata sandi | `rotanami-contoh` |
| Isi | Kebun “Kebun Contoh Rotanami”, 4 bedeng, 7 catatan riwayat tanam, 3 hasil uji tanah, 4 observasi, 4 pengingat, 1 rencana rotasi — semuanya berlabel **Data contoh** |

Akun ini dibuat oleh seed dan dapat diubah/dihapus. Pendaftaran akun baru **tidak** menghasilkan data kebun palsu: akun
baru langsung melihat empty state dan dipandu membuat kebun sendiri.

---

## 6. API singkat

Semua endpoint berprefix `/api`. Dokumentasi mesin dapat dibaca di **`GET /api/dokumentasi`**.

- Autentikasi: `POST /api/auth/daftar`, `POST /api/auth/masuk`, `POST /api/auth/keluar`, `GET /api/auth/saya`,
  `PATCH /api/auth/profil`, `POST /api/auth/kata-sandi`.
- Kebun & petak: `/api/kebun`, `/api/kebun/:id`, `/api/kebun/:id/aktif`, `/api/kebun/contoh`, `/api/petak`,
  `/api/petak/:id`, `/api/musim`, `/api/musim/:id`, `/api/ringkasan`.
- Katalog: `/api/katalog/tanaman`, `/api/katalog/tanaman/:id`, `/api/katalog/tanaman/:id/salin`,
  `/api/katalog/keluarga`.
- Catatan: `/api/riwayat-tanam`, `/api/uji-tanah`, `/api/observasi`, `/api/rencana-rotasi`, `/api/pengingat`
  (masing-masing mendukung `GET`/`POST` dan `/:id` untuk `PATCH`/`DELETE`).
- Rotasi: `POST /api/rotasi/saran` `{ "plotId": "..." }`.
- Ekspor: `GET /api/ekspor/riwayat-tanam.csv`, `/api/ekspor/uji-tanah.csv`, `/api/ekspor/observasi.csv`.

Konvensi:

- Input divalidasi **Zod di server**; respons error berbentuk `{ "error": "pesan bahasa Indonesia", "fields": {...} }`.
- Detail internal (stack trace, SQL, secret) **tidak** pernah dikirim ke klien.
- Otorisasi diperiksa di **setiap** endpoint: entitas ditelusuri ke kebunnya, lalu ke pemilik/anggota
  (`assertFarmAccess`). Data milik pengguna lain dikembalikan sebagai `404` agar keberadaannya tidak bocor.
- Semua kueri memakai Drizzle ORM (parameterized), tidak ada penyusunan SQL dari input mentah.
- Penghapusan kebun/petak/tanaman contoh memerlukan `confirmName` yang sama persis dengan namanya.

---

## 7. Struktur proyek

```
src/
  app/
    api/[...rest]/route.ts     # satu pintu masuk REST -> router Express-like
    api/health/route.ts        # health check platform
    (auth)/masuk, (auth)/daftar
    (app)/                     # layout bersesi + halaman aplikasi
      page.tsx                 # dashboard
      petak/, petak/[id]/      # daftar & detail petak (tab)
      katalog/, rotasi/, kalender/, pengaturan/
  components/                  # ui.tsx, shell.tsx, forms.tsx, cards.tsx, plot-detail.tsx
  db/                          # schema.ts (Drizzle), index.ts (Neon/pg)
  lib/                         # schemas.ts (Zod), types.ts, format.ts, api.ts (klien)
  lib/rotation/engine.ts       # mesin aturan rotasi (murni, teruji)
  server/                      # http.ts (router), auth.ts, data.ts, rotation.ts, seed.ts, routes/*
instrumentation.ts             # seed otomatis saat server start
```

---

## 8. Keamanan & pemisahan data

- Cookie sesi: `HttpOnly`, `SameSite=Lax`, `Path=/`, `Max-Age` 30 hari, dan `Secure` saat produksi/HTTPS.
- Hanya **hash SHA-256 dari token sesi** yang disimpan di database; token acak 32 byte.
- Kata sandi: `scrypt` (N default Node) + salt 16 byte, dibandingkan dengan `timingSafeEqual`.
- Batas data: `users → farms → plots → (plantings, soil_tests, observations, rotation_plans, reminders)`.
  `farm_members` mendukung kebun bersama dengan peran `pemilik`/`pengelola`/`anggota`.
- Kebijakan penghapusan: `farms → plots` cascade (hanya setelah konfirmasi nama), `plantings/soil_tests/observations`
  cascade mengikuti petak, `crops` **restrict** dari riwayat/rencana agar jejak data tidak rusak, `seasons` dan
  `planting` pada tabel turunan memakai `set null`.

---

## 9. Keterbatasan yang masih ada

1. **Tidak ada notifikasi keluar.** Pengingat hanya tampil di dalam aplikasi; belum ada email/push/WhatsApp.
2. **Ekspor PDF tidak disediakan.** Hanya CSV yang dianggap andal di implementasi ini.
3. **Mesin aturan rotasi bersifat dasar.** Aturannya: hindari keluarga/kelompok rotasi yang sama dengan riwayat petak,
   hindari tanaman terkait catatan hama/penyakit, selingi kategori kebutuhan hara bila datanya ada, beri nilai tambah
   pada tanaman penutup tanah bila belum ada di riwayat. Mesin **tidak** menghitung masa jeda, takaran pupuk, atau
   kompatibilitas iklim.
4. **Satuan hasil uji tanah tidak diseragamkan.** Rotanami menyimpan apa yang Anda masukkan beserta label satuannya;
   perbandingan tren hanya bermakna bila metode dan satuannya sama.
5. **Belum ada fitur kolaborasi penuh.** Tabel `farm_members` sudah tersedia, tetapi antarmuka undangan anggota belum
   dibuat (peran non-pemilik hanya dapat dibuat langsung melalui database/API).
6. **Zona waktu** disimpan per pengguna/kebun, tetapi perhitungan “hari ini” di sisi klien memakai zona waktu
   perangkat.
7. **Pengujian** baru mencakup unit test mesin aturan rotasi (Vitest). Uji integrasi API/end-to-end belum ditambahkan
   karena lingkungan ini tidak menyediakan runner browser.

---

## 10. Prinsip desain & aksesibilitas

- Seluruh label, pesan validasi, notifikasi, dan konten berbahasa Indonesia.
- Responsif mobile-first: navigasi bawah di ponsel, sidebar di desktop, target sentuh ≥ 44px.
- Status **tidak** disampaikan lewat warna saja: setiap badge punya teks + ikon.
- Semua input berlabel, punya `aria-invalid`/pesan error terkait, dialog memakai `role="dialog"` + `aria-modal` +
  jebakan fokus + tombol Escape, tab memakai `role="tablist"` dengan navigasi panah, ada tautan “Lompat ke isi utama”,
  dan fokus terlihat jelas.
- Palet alami (moss/clay/soil/cream) dengan kontras teks yang memenuhi WCAG AA pada ukuran teks yang dipakai.
- Preferensi `prefers-reduced-motion` dihormati.
