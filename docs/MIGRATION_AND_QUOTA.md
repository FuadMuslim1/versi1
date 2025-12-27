# Panduan Migrasi & Kuota AI Studio

Dokumen ini menjawab pertanyaan: *"Bagaimana cara pindah project/folder baru tanpa kehilangan data sebelumnya?"* dan *"Berapa kuota gratis Google AI Studio?"*

---

## BAGIAN 1: CARA PINDAH PROJECT TANPA KEHILANGAN DATA

### Konsep Penting
Aplikasi Anda terbagi menjadi dua bagian:
1.  **Frontend (Kode):** File `.tsx`, `.css`, `.html` yang ada di laptop/folder Anda.
2.  **Backend (Data):** Data User, Saldo, Progress yang tersimpan di **Firebase Firestore (Cloud)**.

**Kunci:** Selama Anda menggunakan **Firebase Config** yang sama, Anda bisa membuka aplikasi ini di folder mana saja, komputer mana saja, atau project baru mana saja, dan datanya akan **TETAP ADA**.

### Langkah-Langkah Migrasi (Cloning)
Jika Anda ingin membuat versi baru (V2) tanpa merusak versi lama:

1.  **Buat Folder Baru:**
    Buat folder kosong, misal `english-learning-v2`.

2.  **Copy Semua File:**
    Salin seluruh isi file dari folder lama ke folder `english-learning-v2`.
    *(Kecuali folder `node_modules`, karena ini bisa di-install ulang).*

3.  **PENTING: Jangan Ubah `firebase.ts`:**
    Pastikan file `firebase.ts` di folder baru isinya **SAMA PERSIS** dengan yang lama.
    ```typescript
    // firebase.ts
    const firebaseConfig = {
      apiKey: "AIzaSyDc...",      // JANGAN DIGANTI
      projectId: "learning...",   // JANGAN DIGANTI
      // ...
    };
    ```

4.  **Jalankan:**
    Buka terminal di folder baru:
    ```bash
    npm install
    npm start
    ```

5.  **Hasil:**
    Aplikasi baru akan berjalan. Coba login dengan akun yang sudah dibuat di versi lama. **Data, Saldo, dan Level pasti masih ada.**

---

## BAGIAN 2: KUOTA GOOGLE AI STUDIO (GEMINI API)

Jika Anda menggunakan **Google AI Studio** (aistudio.google.com) untuk membantu coding atau menggunakan API Gemini di dalam aplikasi:

### Paket Gratis (Free Tier)

Google memberikan kuota gratis yang cukup besar untuk development:

| Model | Rate Limit (RPM) | Request per Hari (RPD) | Input Token Limit |
| :--- | :--- | :--- | :--- |
| **Gemini 1.5 Flash** | **15 RPM** (Request per Menit) | **1.500 RPD** | 1 Juta Token |
| **Gemini 1.5 Pro** | **2 RPM** (Request per Menit) | **50 RPD** | 2 Juta Token |

### Ketentuan Free Tier
1.  **Privasi:** Data yang Anda kirim ke AI Studio pada tier gratis **dapat digunakan** oleh Google untuk meningkatkan kualitas model. Jangan kirim data sensitif (password asli, kunci rahasia bank) ke dalam chat AI.
2.  **Error 429:** Jika aplikasi Anda tiba-tiba error dengan kode `429 Too Many Requests`, artinya Anda melebihi batas RPM di atas. Tunggu 1 menit lalu coba lagi.

### Paket Berbayar (Pay-as-you-go)
Jika Anda butuh lebih banyak atau butuh privasi data (Enterprise):
*   Anda harus mengaktifkan billing di Google Cloud Platform.
*   Biaya dihitung per 1 juta token (Sangat murah untuk Flash, agak mahal untuk Pro).
*   Data di tier berbayar **TIDAK** dipakai untuk melatih model Google.

---

### Tips Pengembangan
Untuk aplikasi "English Learning Geuwat" saat ini:
*   Anda **TIDAK** menggunakan kuota Gemini API di dalam aplikasi (User tidak memanggil AI secara langsung).
*   Anda hanya menggunakan Firebase (Database).
*   Jadi, batas kuota AI Studio hanya berlaku saat Anda sedang **Chatting dengan AI** untuk meminta bantuan coding.
