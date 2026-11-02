# 🏸 Scobad — Aplikasi Skor Badminton Ganda Campuran (BWF & Custom Rules)

**Scobad** adalah aplikasi web interaktif (*Progressive Web App / PWA*) untuk menghitung skor pertandingan badminton nomor **Ganda / Ganda Campuran (Mixed Doubles)** lengkap dengan visualisasi posisi pemain di lapangan 2D secara *real-time*.

Dirancang untuk membantu wasit dan pemain memahami aturan perpindahan kotak **Ganjil-Genap** serta perpindahan servis sesuai regulasi resmi **BWF (Badminton World Federation)** maupun aturan poin komunitas.

---

## ✨ Fitur Utama

1. **Visualisasi Lapangan 2D Interaktif**:
   - Menampilkan posisi berdiri ke-4 pemain (2 pasangan Pria `♂` & Wanita `♀`) di Kotak Kanan (Genap) dan Kotak Kiri (Ganjil).
   - Indikator otomatis **`🏸 SERVER`** dan **`🎯 RECEIVER`** beserta panah arah servis diagonal.
   - Otomatis menukar posisi pemain (Kiri ↔ Kanan) saat mencetak poin beruntun dari servis sendiri, dan mempertahankan posisi saat terjadi *Service Over* (pindah bola).

2. **Kustomisasi Poin Maksimal & Aturan Deuce (+3 Poin)**:
   - Preset cepat: **Komunitas 15 Poin** (Deuce maks 18), **Resmi BWF 21 Poin** (Deuce maks 30), **Cepat 11 Poin** (Deuce maks 14), atau **Custom Poin**.
   - Otomatis mendeteksi kondisi *Deuce / Setting*, *Game Point*, *Match Point*, hingga *Golden Point*.

3. **Manajemen Daftar Tim & Anggota (Squad Roster 4–5+ Orang)**:
   - Halaman khusus **`👥 Daftar Tim`** untuk menyimpan banyak nama tim beserta daftar anggota di dalamnya.
   - Fitur **Quick Pick** saat memulai pertandingan maupun saat **pergantian pemain di setiap akhir Set (Set 1, Set 2, Set 3)**.
   - Proteksi otomatis agar tim yang sama tidak bisa bertanding melawan dirinya sendiri.

4. **Interval Otomatis & Pindah Lapangan**:
   - Pop-up *timer* istirahat 60 detik saat mencapai poin tengah set (misal poin 8 pada game 15, atau poin 11 pada game 21).
   - Otomatis menukar sisi lapangan di akhir setiap set dan pada interval Set ke-3 (*Rubber Game*).

5. **Dukungan Offline (PWA) & Suara Wasit (TTS)**:
   - Dapat di-install ke layar utama HP Android/iOS dan berjalan tanpa internet.
   - Dilengkapi fitur *Undo* tanpa batas dan riwayat pertandingan lengkap per set.

---

## 🚀 Cara Menjalankan

### Secara Lokal (XAMPP / Browser)
Cukup letakkan folder ini di dalam `htdocs` (misal `c:\xampp\htdocs\skor-gfontimo`) dan buka melalui browser:
```
http://localhost/skor-gfontimo/
```

### Deploy ke cPanel menggunakan Git™ Version Control
1. Buka menu **Git™ Version Control** di cPanel → klik **Create**.
2. Masukkan URL repository GitHub ini: `https://github.com/alvianrhz/Scobad.git`.
3. Sesuaikan lokasi folder tujuan di dalam file [`.cpanel.yml`](./.cpanel.yml) (default: `/home/$USER/public_html/scobad/`), atau arahkan langsung *Repository Path* cPanel ke folder domain/subdomain Anda.

