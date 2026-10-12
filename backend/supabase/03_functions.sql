-- =========================================================
-- 03_functions.sql
-- View bantu (BUKAN stored procedure / trigger)
-- Tujuan: mempermudah query join di frontend
-- Jalankan SETELAH 01_schema.sql dan 02_seed.sql
-- =========================================================

-- ---------------------------------------------------------
-- View 1: v_transaksi_lengkap
-- Menampilkan transaksi + nama pelanggan
-- ---------------------------------------------------------
CREATE OR REPLACE VIEW v_transaksi_lengkap AS
SELECT
    t.id_transaksi,
    t.tanggal_transaksi,
    t.total_transaksi,
    t.keterangan       AS keterangan_transaksi,
    p.id_pelanggan,
    p.nama_pelanggan,
    p.no_telepon,
    p.alamat
FROM transaksi_penjualan t
JOIN pelanggan p ON p.id_pelanggan = t.id_pelanggan;

-- ---------------------------------------------------------
-- View 2: v_retur_lengkap
-- Menampilkan retur + transaksi + pelanggan
-- ---------------------------------------------------------
CREATE OR REPLACE VIEW v_retur_lengkap AS
SELECT
    r.id_retur,
    r.tanggal_retur,
    r.alasan_retur,
    r.status_retur,
    r.keterangan       AS keterangan_retur,
    t.id_transaksi,
    t.tanggal_transaksi,
    t.total_transaksi,
    p.id_pelanggan,
    p.nama_pelanggan,
    p.no_telepon
FROM retur r
JOIN transaksi_penjualan t ON t.id_transaksi = r.id_transaksi
JOIN pelanggan p           ON p.id_pelanggan = t.id_pelanggan;