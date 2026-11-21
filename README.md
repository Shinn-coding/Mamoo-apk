# Mamoo

**Catat pengeluaran, atur anggaran, capai target tabungan — semuanya offline.**

Mamoo adalah aplikasi pencatat keuangan pribadi yang menyimpan seluruh data **di HP kamu sendiri** (SQLite lokal). Tanpa server, tanpa akun, tanpa iklan, tanpa internet. Cocok untuk siapa saja yang ingin tahu ke mana uangnya pergi dan menabung dengan target yang jelas.

## Tujuan

- Membantu pengguna **mencatat pemasukan & pengeluaran harian** dengan cepat.
- Memberi **batas belanja per kategori** (anggaran) agar tidak boros.
- Membantu **mewujudkan target tabungan** (motor, laptop, dana darurat, dll).
- Menyajikan **laporan sederhana** yang mudah dipahami.
- Menjamin **privasi penuh**: data milikmu, di HP-mu, tidak dikirim ke mana pun.

## Fitur

- **Transaksi** — pemasukan / pengeluaran / saldo awal, edit, hapus, catatan, filter tipe & pencarian.
- **Anggaran** — batas belanja per kategori per siklus (tanggal mulai siklus bisa diatur 1–28) + jatah aman harian.
- **Dompet** — Tunai / Bank / E-Wallet bawaan; tambah, arsip, saldo awal; saldo dihitung dari transaksi.
- **Tabungan (target)** — setor/tarik dana yang mengunci sebagian saldo dompet, progress ring, tenggat & estimasi setoran bulanan.
- **Laporan** — donut pengeluaran per kategori, bar pemasukan vs pengeluaran harian, ranking kategori terbesar.
- **Backup & Ekspor** — backup semua data keuangan ke file JSON (bisa dipulihkan kapan saja), ekspor transaksi ke CSV untuk Excel/Google Sheets.
- **Profil lokal** — atur nama panggilan + foto sebagai penanda HP ini. Tanpa akun/login; foto maksimal 10 MB dan otomatis diperkecil jadi ±150 KB.
- **Kunci aplikasi** — PIN 4–6 digit (hash disimpan aman di `expo-secure-store`, bukan database) + opsional biometrik. Jumlah titik PIN mengikuti panjang PIN, maksimal **5× PIN salah → jeda 30 detik**, maksimal **3× biometrik gagal → wajib PIN**, dan aplikasi mengunci lagi otomatis **30 detik** setelah ditinggal ke background. Lupa PIN → reset dengan konfirmasi dua langkah.
- **Tema Terang / Gelap / Sistem** — pilihan tema tersimpan di SQLite. Tidak ikut file backup JSON, tidak berubah saat restore, dan kembali ke "Sistem" saat reset data.
- **Tab bar liquid glass** — panel translucent (native di iOS, panel ringan di Android). Indikator pill bisa **digeser/di-drag** lalu snap ke tab terdekat, dan tetap merespons ketukan.
- **Intro minimalis** — wordmark Mamoo putih di atas hijau brand `#179C51`, animasi fade + scale halus ±1,6 detik, bisa di-tap untuk lewati. Tanpa partikel, audio, atau animasi JS berat — dan tanpa kedipan hitam saat masuk.

## Cara Pakai

1. **Beranda** — lihat Saldo Bebas, pemasukan/pengeluaran periode ini, ringkasan anggaran, dan 5 transaksi terakhir.
2. **Tambah transaksi** — ketuk tombol **+** di kanan bawah → pilih Pemasukan/Pengeluaran → isi nominal, kategori, dompet, tanggal, catatan → Simpan.
3. **Transaksi** — tab ini menampilkan riwayat per siklus; gunakan ‹ › untuk pindah periode, chip untuk filter tipe, ikon cari untuk mencari catatan. Ketuk transaksi untuk edit/hapus.
4. **Anggaran** — atur batas belanja per kategori pada siklus berjalan; progress berubah hijau → kuning (80%) → merah (100%).
5. **Dompet** — kelola dompet (tambah/ubah/arsip), isi **Saldo Awal** saat membuat dompet baru, tandai satu dompet sebagai default.
6. **Tabungan** — buat target (nama, ikon, nominal, tenggat opsional) → setor dana (mengunci saldo dompet) → tarik dana bila perlu; target selesai/batal otomatis melepas dananya.
7. **Laporan** — pilih periode/siklus untuk melihat donut kategori, bar harian, dan ranking pengeluaran.
8. **Profil** — buka kartu profil di Pengaturan (atau sapaan di Beranda) → pilih foto dari galeri/kamera → isi nama → Simpan. Foto otomatis dipotong persegi dan diperkecil; foto lama dihapus agar tidak menumpuk.
9. **Pengaturan** — atur tanggal mulai siklus, **pilih tema (Sistem / Terang / Gelap)**, backup/restore JSON, ekspor CSV, kunci aplikasi & biometrik, dan reset data.

**Backup rutin:** Pengaturan → Backup & Ekspor → Backup Data (JSON) → simpan filenya (WhatsApp/Drive/Files). Data hanya ada di HP, jadi backup adalah satu-satunya cara pindah HP.

**Pulihkan:** Pengaturan → Pulihkan dari Backup → pilih file `.json` → konfirmasi. Restore berjalan dalam satu transaksi SQL (aman dari data setengah jadi).

**Profil:** nama & foto adalah identitas perangkat ini (seperti PIN), jadi **tidak ikut file backup JSON**. Saat restore di HP yang sama, profil tetap ada; saat pindah HP, atur profil sekali lagi.

## FAQ

**Apakah Mamoo butuh internet?**
Tidak. Aplikasi berjalan penuh offline setelah terpasang.

**Datanya disimpan di mana?**
Di database SQLite lokal di HP-mu. Tidak ada server maupun akun.

**Ganti HP, data hilang?**
Data tidak pindah otomatis. Lakukan **Backup JSON** di HP lama, lalu **Pulihkan** di HP baru. Nama/foto profil tidak ikut backup — atur ulang di HP baru.

**Apakah profil butuh akun atau login?**
Tidak. Profil hanya nama + foto yang disimpan lokal sebagai penanda HP. Tidak ada akun, upload, atau koneksi internet.

**Kenapa foto profil dibatasi 10 MB?**
Supaya pemilihan foto besar tidak membebani HP. Setelah dipilih, Mamoo memotongnya persegi, mengecilkannya ke 512px, dan mengompresnya jadi ±100–200 KB. Foto pengguna tidak menambah ukuran APK.

**Foto profil ikut backup?**
Tidak. File backup JSON sengaja tidak memuat foto pribadi dan tetap ringan. Nama juga tidak ikut karena profil dianggap identitas perangkat, seperti PIN.

**Setelan tema ikut backup?**
Tidak. Tema tersimpan di perangkat ini, jadi restore tidak menimpa tema HP yang dipakai. Saat **reset data**, tema kembali ke "Sistem".

**Kenapa pindah tab tidak pakai animasi?**
Perpindahan tab dibuat instan: tidak ada frame tambahan, lebih hemat RAM/baterai, dan tidak memunculkan kedipan latar saat mode gelap.

**Lupa PIN?**
Di layar kunci ketuk **Lupa PIN** → konfirmasi dua langkah → aplikasi direset (semua data terhapus). Karena tidak ada server, PIN tidak bisa dipulihkan tanpa reset. Saran: backup rutin.

**Bisa dipasang di iPhone?**
APK untuk Android. iOS butuh build terpisah (mis. via EAS + TestFlight).

**Minimal Android berapa?**
Android 7.0 (Nougat) ke atas — hampir semua HP umum.

**Berapa ukuran APK-nya?**
APK rilis sekitar **±109 MB** karena berisi empat arsitektur CPU sekaligus (universal APK). Untuk Play Store, build `aab` hanya mengirim bagian yang cocok sehingga unduhannya jauh lebih kecil.

## Teknologi

- [Expo SDK 58](https://expo.dev) + React Native + TypeScript (strict, tanpa `any`)
- [Expo Router](https://docs.expo.dev/router/introduction/) — navigasi
- `expo-sqlite` — database lokal (migrasi via `PRAGMA user_version`)
- `zustand` — state ringan
- `react-native-svg` — grafik laporan & tab bar
- `react-native-reanimated` 4 + `react-native-gesture-handler` + `react-native-worklets` — animasi & drag tab bar di UI thread
- `expo-glass-effect` — panel liquid glass (iOS)
- `expo-system-ui` — menyelaraskan warna root window dengan tema aktif
- `expo-file-system`, `expo-sharing`, `expo-document-picker` — backup/ekspor
- `expo-secure-store`, `expo-crypto`, `expo-local-authentication` — PIN/biometrik
- `expo-splash-screen` — splash & intro
- `expo-image-picker`, `expo-image-manipulator`, `expo-image` — foto profil lokal (kompres + cache)

## Cara Menjalankan

```bash
npm install
npx expo start
```

- **Expo Go (tercepat):** scan QR dengan aplikasi Expo Go (HP & laptop satu jaringan).
- **Android:** `npx expo start --android`
- **iOS:** `npx expo start --ios`

## Build APK

Dengan EAS (butuh akun Expo gratis):

```bash
npm install -g eas-cli   # sekali saja
eas login
eas init
eas build -p android --profile preview
```

Selesai build → dapat link/QR APK → download di HP → install (izinkan "sumber tidak dikenal").

Build lokal (butuh Android Studio/SDK):

```bash
npx expo run:android --variant release
```

## Struktur Project

```
src/
  app/             # layar Expo Router (tabs, modal, pin-setup)
  components/ui/   # komponen reusable (tab bar glass, kartu, FAB, kunci PIN, splash)
  db/              # koneksi, migrasi, seed, types
  db/repositories/ # SEMUA query SQL di sini — UI tidak menyentuh SQL
  store/           # Zustand (settings, versi data)
  theme/           # design token + ThemeProvider (Sistem / Terang / Gelap)
  utils/           # tanggal lokal, rupiah, siklus, CSV, backup, PIN, biometrik
assets/
  brand/           # sumber resmi logo (brand sheet)
  images/          # ikon APK, wordmark, aset gambar
scripts/           # generator ikon APK (make-logo.mjs)
```

## Catatan Data

- Nominal disimpan **rupiah utuh (INTEGER)**, tanpa desimal.
- Tanggal transaksi memakai format lokal `YYYY-MM-DD` (bukan UTC) supaya input jam 00.00–06.59 tidak bergeser ke hari kemarin.
- Backup JSON **tidak menyertakan PIN/hash PIN** — kunci aplikasi tetap milik perangkat.
- Foto profil disimpan sebagai file JPEG kecil di folder dokumen app (bukan BLOB SQLite), supaya database tetap cepat dan backup tetap ringan.
- Profil (nama + foto) juga diperlakukan sebagai identitas perangkat: tidak ikut backup, tetapi tetap ada saat restore di HP yang sama.
- Pilihan tema disimpan di tabel `settings`: tidak ikut file backup, tidak berubah saat restore, dan kembali ke `system` saat reset data.
- Restore berjalan dalam satu transaksi SQL: gagal di tengah jalan = tidak ada data tertulis setengah.

## Lisensi

Mamoo adalah perangkat lunak **proprietary** — lihat [`LICENSE`](./LICENSE).

© 2026 Mamoo / **@Shinn-dev**. Seluruh hak dilindungi. Hanya **@Shinn-dev** yang boleh mengubah, mengembangkan, dan menerbitkan aplikasi ini.
