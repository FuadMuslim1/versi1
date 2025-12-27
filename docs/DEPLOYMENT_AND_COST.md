# Panduan Deployment & Estimasi Biaya
**English Learning Geuwat**

Dokumen ini menjelaskan cara mempublikasikan website (Deploy), mengatur domain, dan perhitungan biaya jika pengguna bertambah banyak.

---

## BAGIAN 1: DEPLOYMENT (HOSTING & DOMAIN)

Karena aplikasi ini adalah **Static Web App (React)** yang menggunakan **Firebase** sebagai backend (Serverless), Anda memiliki dua pilihan hosting terbaik:

### Opsi A: GitHub Pages (Sesuai Permintaan Awal)
**Kelebihan:** 100% Gratis, terintegrasi dengan repository GitHub Anda.
**Kekurangan:** Konfigurasi manual untuk routing (kecuali pakai HashRouter), deploy sedikit lebih lambat dari Firebase.

**Langkah-langkah:**

1.  **Pastikan Routing Aman:**
    Di file `App.tsx`, pastikan Anda menggunakan `HashRouter` (bukan `BrowserRouter`).
    *Code Anda saat ini sudah menggunakan `HashRouter`, jadi ini aman.*

2.  **Install `gh-pages`:**
    Buka terminal dan jalankan:
    ```bash
    npm install gh-pages --save-dev
    ```

3.  **Update `package.json`:**
    Tambahkan properti berikut di bagian atas file `package.json` Anda:
    ```json
    "homepage": "https://username-github-anda.github.io/nama-repo",
    ```
    *(Ganti `username-github-anda` dan `nama-repo` sesuai URL repository GitHub Anda)*.

    Lalu tambahkan script di bagian `"scripts"`:
    ```json
    "predeploy": "npm run build",
    "deploy": "gh-pages -d build"
    ```

4.  **Lakukan Deploy:**
    Jalankan perintah ini di terminal:
    ```bash
    npm run deploy
    ```
    Tunggu hingga selesai. Website akan aktif di URL yang Anda set di `homepage`.

5.  **Custom Domain (Agar tidak pakai .github.io):**
    *   Beli domain (misal: `geuwat-english.com`) di penyedia domain (Namecheap, Niagahoster, GoDaddy, dll). Biaya sekitar Rp 150.000 - Rp 200.000 / tahun.
    *   Buka Repository GitHub -> **Settings** -> **Pages**.
    *   Di bagian **Custom domain**, masukkan nama domain Anda.
    *   Di penyedia domain Anda, atur **DNS Record**:
        *   Tipe: `CNAME`
        *   Host: `www`
        *   Value: `username-github-anda.github.io`

---

### Opsi B: Firebase Hosting (Sangat Direkomendasikan)
**Kelebihan:** Sangat cepat, SSL (HTTPS) otomatis gratis, satu ekosistem dengan Database & Auth Anda, support `BrowserRouter` tanpa ribet.

**Langkah-langkah:**

1.  **Install Firebase Tools (jika belum):**
    ```bash
    npm install -g firebase-tools
    ```

2.  **Login & Init:**
    ```bash
    firebase login
    firebase init
    ```
    *   Pilih: **Hosting: Configure files for Firebase Hosting**.
    *   Use an existing project -> Pilih project `learning-english-geuwat...`.
    *   What do you want to use as your public directory? -> Ketik: `build`
    *   Configure as a single-page app? -> **Yes** (Penting!).
    *   Set up automatic builds and deploys with GitHub? -> **No** (Bisa diatur nanti).

3.  **Build & Deploy:**
    ```bash
    npm run build
    firebase deploy
    ```
    Selesai. Website akan aktif di `https://learning-english-geuwat-d7555.web.app`.

4.  **Custom Domain:**
    *   Buka Firebase Console -> Menu **Hosting**.
    *   Klik **Add Custom Domain**.
    *   Masukkan domain Anda (misal `geuwat.com`).
    *   Ikuti instruksi untuk menambahkan `TXT Record` dan `A Record` di penyedia domain Anda. SSL akan aktif otomatis dalam 1-24 jam.

---

## BAGIAN 2: ESTIMASI BIAYA (SCALING)

Firebase menggunakan model **"Pay as you go"** (Bayar sesuai pemakaian). Namun, Firebase memiliki **Free Tier (Spark Plan)** yang sangat "murah hati".

### 1. Rincian Komponen Biaya

| Komponen | Free Tier (Spark Plan) | Biaya jika Melebihi (Blaze Plan) |
| :--- | :--- | :--- |
| **Authentication** | Gratis (Email/Pass & Social) | $0.01 - $0.06 per verifikasi (Hanya utk Phone Auth) |
| **Hosting** | 10 GB Storage / 10 GB Transfer | $0.026/GB storage, $0.15/GB transfer |
| **Firestore (Database)** | **50.000 Read / hari** <br> 20.000 Write / hari <br> 20.000 Delete / hari | **$0.06 per 100.000 Reads** <br> $0.18 per 100.000 Writes |
| **Storage (Gambar)** | 5 GB Total Storage <br> 1 GB Download / hari | $0.026/GB |
| **Domain** | - | Sekitar Rp 150rb - 200rb per tahun (Bayar ke penyedia domain, bukan Firebase) |

---

### 2. Skenario Pengguna (Estimasi)

Mari kita hitung berdasarkan penggunaan Firestore (komponen yang paling mungkin berbayar).

#### Skenario A: Startup (1 - 500 User Aktif Harian)
*   **Aktivitas:** User login, load dashboard (baca profil), update progress sesekali.
*   **Estimasi Reads:** 500 user x 10 dokumen = 5.000 reads/hari.
*   **Status:** **100% GRATIS**.
*   Masih jauh di bawah batas 50.000 reads/hari.

#### Skenario B: Bertumbuh (5.000 User Aktif Harian)
*   **Aktivitas:** Banyak user belajar aktif.
*   **Estimasi Reads:** 5.000 user x 15 dokumen = 75.000 reads/hari.
*   **Analisis:**
    *   Batas gratis: 50.000.
    *   Kelebihan: 25.000 reads.
*   **Biaya:**
    *   25.000 reads / 100.000 x $0.06 = **$0.015 (Rp 240 per hari)**.
    *   **Per Bulan:** Sekitar **Rp 7.200**.

#### Skenario C: Skala Besar (50.000 User Aktif Harian)
*   **Estimasi Reads:** 50.000 user x 20 dokumen = 1.000.000 reads/hari.
*   **Kelebihan:** 950.000 reads.
*   **Biaya:**
    *   950.000 / 100.000 x $0.06 = **$0.57 (Rp 9.000 per hari)**.
    *   **Per Bulan:** Sekitar **Rp 270.000**.

---

### 3. Tips Menghemat Biaya (Optimasi)

Agar aplikasi Anda tetap murah meski user banyak:

1.  **Gunakan LocalStorage (Sudah Diterapkan):**
    Fitur "Saved Progress" yang kita buat menyimpan data di HP pengguna (`localStorage`), bukan langsung menulis ke database setiap kali klik tombol. Ini menghemat biaya **Writes** secara signifikan.

2.  **Optimalkan Pembacaan Data:**
    Jangan mengambil seluruh koleksi jika tidak perlu. Gunakan `limit()` pada query (sudah diterapkan di halaman Admin).

3.  **Authentication Session:**
    Kita menggunakan `browserLocalPersistence`, artinya user tidak perlu login ulang setiap kali buka web. Ini mengurangi pembacaan data profil user dari database.

### KESIMPULAN

1.  **Hosting:** Gunakan **Firebase Hosting** atau **GitHub Pages**. Keduanya Gratis untuk permulaan.
2.  **Domain:** Anda perlu modal sekitar **Rp 150.000/tahun** untuk membeli nama domain `.com` agar terlihat profesional.
3.  **Database:** Gratis selamanya jika user aktif harian di bawah ~3.000 orang. Jika user mencapai 5.000+, biaya hanya sekitar ribuan rupiah per bulan.

Aplikasi ini sangat efisien secara biaya (Low Cost High Scalability).
