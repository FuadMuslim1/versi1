# Panduan Setup Database Firestore (English Learning Geuwat)

Dokumen ini berisi struktur data, contoh pengisian value, dan aturan validasi untuk database Firestore. Gunakan panduan ini saat melakukan input manual via Firebase Console atau debugging.

---

## 1. Setup Akun Admin Khusus

Aplikasi ini memiliki logika khusus untuk email: `adminreferralcodegeuwat@email.com`.
Akun ini **TIDAK** disimpan di collection `users` biasa, melainkan di collection `admin_referral_code`.

**Cara Setup Manual:**
1. **Parent Path:** `Root` (Kolom Pertama di Firestore Console).
2. Buat Collection ID: `admin_referral_code`
3. Buat Document ID: `adminreferralcodegeuwat@email.com` (Harus persis).
4. Isi Field berikut:

| Field | Tipe | Contoh Isi | Keterangan |
| :--- | :--- | :--- | :--- |
| `email` | string | `adminreferralcodegeuwat@email.com` | **Wajib**. Harus sama dengan Doc ID. |
| `role` | string | `admin referral code` | **Wajib**. Format role baru. |
| `fullName` | string | `Admin Referral Code` | Nama tampilan di dashboard. |

---

## 2. Struktur Koleksi (Collection)

Semua koleksi di bawah ini berada di **Root Level** (Akar Database). Jika Anda diminta "Parent Path" saat membuat collection via kode atau console, gunakan `/`.

### A. `users`
**Parent Path:** `/` (Root)
Menyimpan profil pengguna yang **sudah aktif** dan bisa login.
*   **Document ID:** Email user (huruf kecil semua). Contoh: `fuadmuslim4@gmail.com`.

| Field | Tipe | Contoh Isi | Jika Kosong / Default |
| :--- | :--- | :--- | :--- |
| `fullName` | string | `Fuad Muslim` | Wajib diisi saat register. |
| `email` | string | `fuadmuslim4@gmail.com` | Wajib. |
| `role` | string | `user` | Default: `user`. Lihat Tabel Role di bawah. |
| `balance` | number | `1500` | Default: `0`. |
| `level` | string | `Beginner` | Default: `Rookie`. |
| `referralCode`| string | `FU331224251` | Default: `-` (Strip) jika belum digenerate admin. |
| `photoURL` | string | `https://lh3.google...` | Default: `null` (Akan pakai inisial nama). |
| `validUntil` | string | `2025-12-31` | Default: `null` (Akses seumur hidup/free tier). |

### B. `registrations`
**Parent Path:** `/` (Root)
Ini adalah **Meja Resepsionis**. Menyimpan antrian orang yang mendaftar manual via Admin.
*   **Document ID:** Auto-generated (Acak).

| Field | Tipe | Contoh Isi | Penjelasan Logika |
| :--- | :--- | :--- | :--- |
| `fullName` | string | `Siti Aminah` | Nama pendaftar. |
| `whatsapp` | string | `082338792512` | Nomor WA pendaftar. |
| `email` | string | `siti@gmail.com` | Email pendaftar. |
| `usedReferralCode` | string | `FU331224251` | Kode undangan milik *Teman*. Isi `-` jika tidak ada. |
| `generatedReferralCode` | string | `SI1210125251` | Kode baru milik *Siti*. |
| `status` | string | `DRAFT` | **Satu field saja**. Nilainya berubah sesuai proses (Lihat Alur di bawah). |
| `notifiedRewardAdmin` | boolean | `true` | Penanda untuk admin reward. |

#### Alur Perubahan Status (Lifecycle)
Field `status` hanya boleh diisi salah satu dari kata berikut (Sesuai urutan waktu):

1.  **`DRAFT`**: Saat data pertama kali diketik admin.
2.  **`PAID`**: Saat admin mengonfirmasi uang pendaftaran diterima.
3.  **`SENT_TO_DB`**: Saat admin membuatkan akun & kode referral untuk user.
4.  **`VERIFIED`**: (Otomatis) Saat sistem mendeteksi user sudah berhasil login.

### C. `admin_reward`
**Parent Path:** `/` (Root)
Menyimpan inventory reward/hadiah yang bisa ditukar user.
*   **Document ID:** Auto-generated.

| Field | Tipe | Contoh Isi | Jika Kosong / Default |
| :--- | :--- | :--- | :--- |
| `title` | string | `1 Month Premium Access` | Wajib. |
| `cost` | number | `500` | Wajib (Angka). |
| `description` | string | `Bebas akses ke Subject Speaking...` | Boleh dikosongkan (Empty string `""`). |

### D. `admin_notification`
**Parent Path:** `/` (Root)
Menyimpan riwayat broadcast pesan.
*   **Document ID:** Auto-generated.

| Field | Tipe | Contoh Isi | Jika Kosong / Default |
| :--- | :--- | :--- | :--- |
| `title` | string | `Maintenance Server` | Wajib. |
| `message` | string | `Server akan down jam 12 malam.` | Wajib. |
| `target` | string | `ALL` | Pilihan: `ALL`, `PREMIUM`, `FREE`, atau `SPECIFIC`. |
| `targetEmail` | string | `budi@gmail.com` | **Opsional**. Hanya diisi jika `target` == `SPECIFIC`. |

---

## 3. Daftar Role (Hak Akses)

Gunakan nilai teks persis di bawah ini saat mengisi field `role` di database manual.

| Teks Role (Isi Database) | Nama Dashboard | Deskripsi |
| :--- | :--- | :--- |
| `user` | User Dashboard | Pengguna biasa (Murid). |
| `admin referral code` | Admin Referral | Mengelola pendaftaran & generate kode. |
| `admin database` | Master Database | **Super Admin**. Bisa edit/hapus semua data mentah. |
| `admin reward` | Reward Inventory | Mengelola item hadiah/toko. |
| `admin notification`| Broadcast Center| Mengirim pengumuman ke user. |

---

## 4. Security Rules & Validasi

*   **Email Unik:** Document ID pada collection `users` menggunakan email. Ini mencegah satu email memiliki dua profil.
*   **Case Sensitive:** Email harus selalu disimpan dalam **huruf kecil (lowercase)**.
    *   Salah: `Fuad@Gmail.com`
    *   Benar: `fuad@gmail.com`
*   **Referral Code:** Format `AAWWRMMDDYYN`.
    *   `AA`: 2 Huruf awal email (Kapital).
    *   `WW`: 2 Digit terakhir WA.
    *   `R`: `1` (Pakai ref), `2` (Tidak pakai).
    *   `MMDDYY`: Tanggal hari ini.
    *   `N`: Nomor urut pendaftaran hari ini.