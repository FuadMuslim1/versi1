# Panduan Update & Maintenance (Post-Deployment)
**English Learning Geuwat**

Dokumen ini menjawab pertanyaan: *"Bagaimana jika saya ingin mengedit website yang sudah live?"*

---

## 1. Prinsip Dasar
Website yang sudah di-deploy hanyalah **"Snapshot"** (Foto sesaat) dari kode Anda. 
*   Saat Anda mengubah kode di komputer lokal, website live **TIDAK** otomatis berubah.
*   Anda harus melakukan proses **Re-deploy** (Upload ulang) agar perubahan muncul di internet.

---

## 2. Langkah-Langkah Mengupdate Website

Setiap kali Anda ingin mengubah warna, teks, atau menambah fitur baru, ikuti siklus ini:

### Langkah A: Edit di Lokal
1.  Buka VS Code.
2.  Lakukan perubahan kodingan (misal: Ganti warna tombol Pronunciation).
3.  Test dulu di komputer sendiri:
    ```bash
    npm start
    ```
4.  Pastikan tidak ada error.

### Langkah B: Build & Deploy Ulang

**Jika menggunakan GitHub Pages:**
Jalankan satu perintah ini saja:
```bash
npm run deploy
```
*Sistem akan otomatis mem-build ulang (`npm run build`) lalu menguploadnya ke GitHub. Tunggu 2-5 menit, perubahan akan muncul.*

**Jika menggunakan Firebase Hosting:**
Jalankan dua perintah ini berurutan:
```bash
npm run build
firebase deploy
```
*Perubahan biasanya langsung muncul dalam hitungan detik.*

---

## 3. Pertanyaan Penting (FAQ)

### Q: Apakah Database (User & Progress) akan hilang saat saya deploy ulang?
**A: TIDAK AKAN HILANG.**
Ini adalah keuntungan arsitektur kita:
*   **Hosting (Tampilan):** Menyimpan file HTML/CSS/JS. Ini yang Anda timpa saat deploy ulang.
*   **Firestore (Database):** Menyimpan data user (Email, Level, Saldo). Ini ada di "awan" Google yang terpisah.
*   **LocalStorage (Saved Progress):** Menyimpan data di browser HP user.

Jadi, Anda bebas mengganti tampilan website 1000x pun, saldo dan level user **tetap aman**.

### Q: User saya sedang membuka website, apa yang terjadi saat saya deploy?
**A:** 
1.  User tidak akan sadar ada perubahan sampai mereka me-refresh halaman atau menutup dan membuka kembali browser.
2.  Tidak akan ada error "Website Down". Versi lama akan tetap jalan sampai versi baru selesai ter-upload sempurna.

### Q: Saya sudah deploy, tapi kok di HP saya belum berubah?
**A:** Ini masalah **Cache Browser**.
Browser HP sering menyimpan versi lama agar loading cepat.
*   **Solusi:** Coba refresh (tarik layar ke bawah) beberapa kali, atau buka di Incognito Mode (Tab Penyamaran) untuk mengecek perubahan.

---

## 4. Tips Maintenance

1.  **Jangan Mengubah Logika Database Sembarangan:**
    Anda boleh mengubah warna/layout sesuka hati. Tapi hati-hati jika mengubah nama field di kodingan (misal: mengganti `user.balance` jadi `user.wallet`). Jika di database datanya masih bernama `balance`, website akan error.
    
2.  **Backup Kode:**
    Selalu lakukan `git commit` dan `git push` ke repository GitHub Anda sebelum melakukan perubahan besar, agar bisa kembali ke versi sebelumnya jika ada error.

```bash
git add .
git commit -m "Update fitur pronunciation"
git push
```
