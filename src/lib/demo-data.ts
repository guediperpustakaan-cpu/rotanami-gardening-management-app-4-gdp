/**
 * Data contoh (demo) Rotanami.
 *
 * Semua baris yang berasal dari berkas ini ditandai `isDemo = true` di database
 * dan diberi label "Data contoh" di antarmuka. Katalog contoh disimpan di
 * database (bukan dikunci di komponen antarmuka) sehingga pengguna dapat
 * menambahkan, mengubah, atau menyalin tanaman ke kebunnya sendiri.
 *
 * Catatan panduan di bawah bersifat umum dan bukan rekomendasi agronomi pasti.
 */

export type DemoFamily = {
  name: string;
  rotationGroup: string;
  description: string;
};

export const DEMO_FAMILIES: DemoFamily[] = [
  { name: "Solanaceae", rotationGroup: "buah", description: "Keluarga terung-terungan: tomat, cabai, terong." },
  { name: "Cucurbitaceae", rotationGroup: "buah", description: "Keluarga labu-labuan: mentimun, labu, pare." },
  { name: "Fabaceae", rotationGroup: "kacang", description: "Keluarga kacang-kacangan, banyak dipakai sebagai penutup tanah." },
  { name: "Brassicaceae", rotationGroup: "daun", description: "Keluarga kubis-kubisan: sawi, pakcoy, kol, brokoli." },
  { name: "Apiaceae", rotationGroup: "akar", description: "Keluarga wortel-wortelan: wortel, seledri, adas." },
  { name: "Amaryllidaceae", rotationGroup: "umbi", description: "Keluarga bawang-bawangan: bawang merah, bawang putih, daun bawang." },
  { name: "Amaranthaceae", rotationGroup: "daun", description: "Keluarga bayam-bayaman: bayam, bit." },
  { name: "Convolvulaceae", rotationGroup: "daun", description: "Keluarga kangkung-kangkungan." },
  { name: "Asteraceae", rotationGroup: "daun", description: "Keluarga kenikir-kenikiran: selada, seruni." },
  { name: "Lamiaceae", rotationGroup: "aromatik", description: "Keluarga kemangi-kemangian: kemangi, mint." },
  { name: "Poaceae", rotationGroup: "rerumputan", description: "Keluarga rumput-rumputan: jagung, padi." },
  { name: "Zingiberaceae", rotationGroup: "rimpang", description: "Keluarga jahe-jahean: jahe, kunyit, lengkuas." },
];

export type DemoCrop = {
  name: string;
  scientificName?: string;
  family: string;
  nutrientCategory?: "berat" | "sedang" | "ringan" | "pemulih";
  isCoverCrop?: boolean;
  guideNotes?: string;
};

export const DEMO_CROPS: DemoCrop[] = [
  { name: "Tomat", scientificName: "Solanum lycopersicum", family: "Solanaceae", nutrientCategory: "berat", guideNotes: "Umumnya dibibitkan dulu lalu dipindah ke petak. Catatan ini contoh, sesuaikan dengan praktik setempat." },
  { name: "Cabai rawit", scientificName: "Capsicum frutescens", family: "Solanaceae", nutrientCategory: "berat" },
  { name: "Cabai merah besar", scientificName: "Capsicum annuum", family: "Solanaceae", nutrientCategory: "berat" },
  { name: "Terong", scientificName: "Solanum melongena", family: "Solanaceae", nutrientCategory: "berat" },
  { name: "Mentimun", scientificName: "Cucumis sativus", family: "Cucurbitaceae", nutrientCategory: "berat" },
  { name: "Labu kuning", scientificName: "Cucurbita moschata", family: "Cucurbitaceae", nutrientCategory: "berat" },
  { name: "Pare", scientificName: "Momordica charantia", family: "Cucurbitaceae", nutrientCategory: "sedang" },
  { name: "Semangka", scientificName: "Citrullus lanatus", family: "Cucurbitaceae", nutrientCategory: "berat" },
  { name: "Kacang panjang", scientificName: "Vigna unguiculata", family: "Fabaceae", nutrientCategory: "pemulih" },
  { name: "Buncis", scientificName: "Phaseolus vulgaris", family: "Fabaceae", nutrientCategory: "pemulih" },
  { name: "Kedelai sayur (edamame)", scientificName: "Glycine max", family: "Fabaceae", nutrientCategory: "pemulih" },
  { name: "Kacang tanah", scientificName: "Arachis hypogaea", family: "Fabaceae", nutrientCategory: "pemulih" },
  { name: "Orok-orok (penutup tanah)", scientificName: "Crotalaria juncea", family: "Fabaceae", nutrientCategory: "pemulih", isCoverCrop: true, guideNotes: "Sering dipakai sebagai tanaman penutup tanah pada contoh data ini. Periksa kesesuaiannya dengan kondisi kebun Anda." },
  { name: "Kacang penutup tanah", scientificName: "Arachis pintoi", family: "Fabaceae", nutrientCategory: "pemulih", isCoverCrop: true },
  { name: "Sawi hijau", scientificName: "Brassica rapa var. parachinensis", family: "Brassicaceae", nutrientCategory: "sedang" },
  { name: "Pakcoy", scientificName: "Brassica rapa subsp. chinensis", family: "Brassicaceae", nutrientCategory: "sedang" },
  { name: "Kol", scientificName: "Brassica oleracea var. capitata", family: "Brassicaceae", nutrientCategory: "berat" },
  { name: "Brokoli", scientificName: "Brassica oleracea var. italica", family: "Brassicaceae", nutrientCategory: "berat" },
  { name: "Lobak", scientificName: "Raphanus sativus", family: "Brassicaceae", nutrientCategory: "ringan" },
  { name: "Wortel", scientificName: "Daucus carota", family: "Apiaceae", nutrientCategory: "sedang" },
  { name: "Seledri", scientificName: "Apium graveolens", family: "Apiaceae", nutrientCategory: "sedang" },
  { name: "Bawang merah", scientificName: "Allium cepa var. aggregatum", family: "Amaryllidaceae", nutrientCategory: "sedang" },
  { name: "Bawang putih", scientificName: "Allium sativum", family: "Amaryllidaceae", nutrientCategory: "sedang" },
  { name: "Daun bawang", scientificName: "Allium fistulosum", family: "Amaryllidaceae", nutrientCategory: "sedang" },
  { name: "Bayam", scientificName: "Amaranthus tricolor", family: "Amaranthaceae", nutrientCategory: "ringan" },
  { name: "Bit", scientificName: "Beta vulgaris", family: "Amaranthaceae", nutrientCategory: "sedang" },
  { name: "Kangkung", scientificName: "Ipomoea aquatica", family: "Convolvulaceae", nutrientCategory: "ringan" },
  { name: "Selada", scientificName: "Lactuca sativa", family: "Asteraceae", nutrientCategory: "ringan" },
  { name: "Kemangi", scientificName: "Ocimum basilicum", family: "Lamiaceae", nutrientCategory: "ringan" },
  { name: "Jagung manis", scientificName: "Zea mays", family: "Poaceae", nutrientCategory: "berat" },
  { name: "Jahe", scientificName: "Zingiber officinale", family: "Zingiberaceae", nutrientCategory: "sedang" },
  { name: "Kunyit", scientificName: "Curcuma longa", family: "Zingiberaceae", nutrientCategory: "sedang" },
];

export const DEMO_ACCOUNT = {
  email: "petani@contoh.rotanami",
  password: "rotanami-contoh",
  name: "Petani Contoh",
  farmName: "Kebun Contoh Rotanami",
  location: "Data contoh — lokasi tidak diisi",
};

export const DEMO_GUIDE_NOTE =
  "Isi kebun ini adalah data contoh untuk mencoba Rotanami. Anda dapat mengubah atau menghapusnya.";
