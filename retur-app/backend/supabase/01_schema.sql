-- =========================================================
-- 01_schema.sql
-- Struktur tabel Sistem Retur Toko Pakaian
-- Database: PostgreSQL (Supabase)
-- =========================================================

-- Hapus tabel jika sudah ada (urutan: child dulu, parent terakhir)
DROP TABLE IF EXISTS retur CASCADE;
DROP TABLE IF EXISTS transaksi_penjualan CASCADE;
DROP TABLE IF EXISTS pelanggan CASCADE;

-- ---------------------------------------------------------
-- Tabel 1: pelanggan
-- ---------------------------------------------------------
CREATE TABLE pelanggan (
    id_pelanggan   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nama_pelanggan VARCHAR(100) NOT NULL,
    no_telepon     VARCHAR(20)  NOT NULL UNIQUE,
    alamat         TEXT
);

-- ---------------------------------------------------------
-- Tabel 2: transaksi_penjualan
-- ---------------------------------------------------------
CREATE TABLE transaksi_penjualan (
    id_transaksi      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_pelanggan      UUID NOT NULL,
    tanggal_transaksi DATE NOT NULL DEFAULT CURRENT_DATE,
    total_transaksi   NUMERIC(12,2) NOT NULL CHECK (total_transaksi >= 0),
    keterangan        TEXT,

    CONSTRAINT fk_transaksi_pelanggan
        FOREIGN KEY (id_pelanggan)
        REFERENCES pelanggan (id_pelanggan)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);

-- Index untuk mempercepat join & filter
CREATE INDEX idx_transaksi_pelanggan ON transaksi_penjualan (id_pelanggan);
CREATE INDEX idx_transaksi_tanggal   ON transaksi_penjualan (tanggal_transaksi);

-- ---------------------------------------------------------
-- Tabel 3: retur
-- ---------------------------------------------------------
CREATE TABLE retur (
    id_retur      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_transaksi  UUID NOT NULL,
    tanggal_retur DATE NOT NULL DEFAULT CURRENT_DATE,
    alasan_retur  TEXT NOT NULL,
    status_retur  VARCHAR(20) NOT NULL DEFAULT 'pending',
    keterangan    TEXT,

    CONSTRAINT fk_retur_transaksi
        FOREIGN KEY (id_transaksi)
        REFERENCES transaksi_penjualan (id_transaksi)
        ON DELETE CASCADE
        ON UPDATE CASCADE,

    CONSTRAINT chk_status_retur
        CHECK (status_retur IN ('pending', 'approved', 'rejected', 'completed'))
);

-- Index untuk mempercepat filter status & join
CREATE INDEX idx_retur_transaksi ON retur (id_transaksi);
CREATE INDEX idx_retur_status    ON retur (status_retur);
CREATE INDEX idx_retur_tanggal   ON retur (tanggal_retur);