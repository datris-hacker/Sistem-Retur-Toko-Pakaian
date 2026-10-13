# Sistem-Retur-Toko-Pakaian

Sistem informasi operasional dan akuntansi sederhana untuk toko pakaian. Aplikasi membantu mencatat pelanggan, transaksi penjualan, pengajuan retur, serta menyajikan laporan akuntansi dasar (COA, jurnal, buku besar, dan neraca saldo).

**Demo web:** [Buka Sistem Retur & Akuntansi](https://datris-hacker.github.io/Sistem-Retur-Toko-Pakaian/)

Demo di-host secara publik melalui GitHub Pages.

## Fitur Utama

- **Dashboard** — ringkasan statistik transaksi dan retur
- **Transaksi** — daftar & detail transaksi penjualan
- **Retur** — pengajuan retur dengan 4 status: pending, approved, rejected, completed
- **Akuntansi** — COA (9 akun), Jurnal Umum, Buku Besar, Neraca Saldo
- **Posting Jurnal Otomatis** — setiap transaksi & retur otomatis menghasilkan jurnal double-entry

## Teknologi

- **Frontend:** HTML, CSS, JavaScript (vanilla)
- **Backend:** Supabase (PostgreSQL)
- **Hosting:** GitHub Pages

## Struktur Database

**Entitas Utama (3):**
- `pelanggan` — data pelanggan
- `transaksi_penjualan` — catatan transaksi
- `retur` — pengajuan retur

**Modul Akuntansi:**
- `akun` (COA) — 9 akun standar
- `jurnal_umum` — header jurnal
- `detail_jurnal` — baris debit/kredit

## Cara Menjalankan Lokal

1. Clone repository ini
2. Jalankan server lokal di folder `frontend/`:
   ```bash
   python -m http.server 5500
