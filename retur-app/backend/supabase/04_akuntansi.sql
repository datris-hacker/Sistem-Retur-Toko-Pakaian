-- =========================================================
-- 04_akuntansi.sql
-- Modul Akuntansi: COA, Jurnal Umum, Detail Jurnal, Laporan
-- Dijalankan SETELAH 01_schema.sql, 02_seed.sql, 03_functions.sql
-- =========================================================

-- ---------------------------------------------------------
-- Bersihkan (urutan: child dulu)
-- ---------------------------------------------------------
DROP VIEW  IF EXISTS v_neraca_saldo CASCADE;
DROP VIEW  IF EXISTS v_buku_besar CASCADE;
DROP TABLE IF EXISTS detail_jurnal CASCADE;
DROP TABLE IF EXISTS jurnal_umum CASCADE;
DROP TABLE IF EXISTS akun CASCADE;

-- =========================================================
-- 1) Tabel: akun (Chart of Accounts / COA)
-- =========================================================
CREATE TABLE akun (
    id_akun     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kode_akun   VARCHAR(10)  NOT NULL UNIQUE,
    nama_akun   VARCHAR(100) NOT NULL,
    tipe_akun   VARCHAR(20)  NOT NULL,
    saldo_normal VARCHAR(10) NOT NULL,

    CONSTRAINT chk_tipe_akun
        CHECK (tipe_akun IN ('aset', 'kewajiban', 'ekuitas', 'pendapatan', 'beban')),
    CONSTRAINT chk_saldo_normal
        CHECK (saldo_normal IN ('debit', 'kredit'))
);

CREATE INDEX idx_akun_kode ON akun (kode_akun);
CREATE INDEX idx_akun_tipe ON akun (tipe_akun);

-- =========================================================
-- 2) Tabel: jurnal_umum (header jurnal)
-- =========================================================
CREATE TABLE jurnal_umum (
    id_jurnal      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tanggal_jurnal DATE NOT NULL DEFAULT CURRENT_DATE,
    keterangan     TEXT NOT NULL,
    referensi_tipe VARCHAR(20),   -- 'penjualan' | 'retur' | 'manual'
    referensi_id   UUID,          -- id_transaksi atau id_retur
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_referensi_tipe
        CHECK (referensi_tipe IS NULL OR referensi_tipe IN ('penjualan', 'retur', 'manual'))
);

CREATE INDEX idx_jurnal_tanggal  ON jurnal_umum (tanggal_jurnal);
CREATE INDEX idx_jurnal_ref      ON jurnal_umum (referensi_tipe, referensi_id);

-- =========================================================
-- 3) Tabel: detail_jurnal (baris debit/kredit)
-- =========================================================
CREATE TABLE detail_jurnal (
    id_detail  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_jurnal  UUID NOT NULL,
    id_akun    UUID NOT NULL,
    debit      NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (debit  >= 0),
    kredit     NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (kredit >= 0),
    keterangan TEXT,

    CONSTRAINT fk_detail_jurnal
        FOREIGN KEY (id_jurnal)
        REFERENCES jurnal_umum (id_jurnal)
        ON DELETE CASCADE,

    CONSTRAINT fk_detail_akun
        FOREIGN KEY (id_akun)
        REFERENCES akun (id_akun)
        ON DELETE RESTRICT,

    -- Cegah baris yang debit & kredit dua-duanya nol, atau dua-duanya terisi
    CONSTRAINT chk_debit_kredit
        CHECK (
            (debit > 0 AND kredit = 0) OR
            (kredit > 0 AND debit = 0)
        )
);

CREATE INDEX idx_detail_jurnal ON detail_jurnal (id_jurnal);
CREATE INDEX idx_detail_akun   ON detail_jurnal (id_akun);

-- =========================================================
-- 4) Seed COA (Chart of Accounts)
-- =========================================================
INSERT INTO akun (kode_akun, nama_akun, tipe_akun, saldo_normal) VALUES
('10100', 'Kas',                    'aset',       'debit'),
('10200', 'Piutang Dagang',         'aset',       'debit'),
('10300', 'Persediaan Barang',      'aset',       'debit'),
('20100', 'Utang Dagang',           'kewajiban',  'kredit'),
('30100', 'Modal Pemilik',          'ekuitas',    'kredit'),
('40100', 'Penjualan',              'pendapatan', 'kredit'),
('40200', 'Retur Penjualan',        'pendapatan', 'debit'),
('50100', 'Harga Pokok Penjualan',  'beban',      'debit'),
('50200', 'Beban Operasional',      'beban',      'debit');

-- =========================================================
-- 5) Function: buat jurnal otomatis untuk penjualan
--    Debit  : Kas                 Rp total
--    Kredit : Penjualan           Rp total
-- =========================================================
CREATE OR REPLACE FUNCTION buat_jurnal_penjualan(p_id_transaksi UUID)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
    v_total        NUMERIC(14,2);
    v_tanggal      DATE;
    v_id_jurnal    UUID;
    v_id_kas       UUID;
    v_id_penjualan UUID;
BEGIN
    -- Ambil data transaksi
    SELECT total_transaksi, tanggal_transaksi
      INTO v_total, v_tanggal
      FROM transaksi_penjualan
     WHERE id_transaksi = p_id_transaksi;

    IF v_total IS NULL THEN
        RAISE EXCEPTION 'Transaksi % tidak ditemukan', p_id_transaksi;
    END IF;

    -- Ambil id akun
    SELECT id_akun INTO v_id_kas       FROM akun WHERE kode_akun = '10100';
    SELECT id_akun INTO v_id_penjualan FROM akun WHERE kode_akun = '40100';

    IF v_id_kas IS NULL OR v_id_penjualan IS NULL THEN
        RAISE EXCEPTION 'Akun Kas atau Penjualan belum ada di COA';
    END IF;

    -- Header jurnal
    INSERT INTO jurnal_umum (tanggal_jurnal, keterangan, referensi_tipe, referensi_id)
    VALUES (
        v_tanggal,
        'Penjualan tunai #' || LEFT(p_id_transaksi::text, 8),
        'penjualan',
        p_id_transaksi
    )
    RETURNING id_jurnal INTO v_id_jurnal;

    -- Detail jurnal (2 baris: debit & kredit)
    INSERT INTO detail_jurnal (id_jurnal, id_akun, debit, kredit, keterangan) VALUES
    (v_id_jurnal, v_id_kas,       v_total, 0,       'Penerimaan kas'),
    (v_id_jurnal, v_id_penjualan, 0,       v_total, 'Pendapatan penjualan');

    RETURN v_id_jurnal;
END;
$$;

-- =========================================================
-- 6) Function: buat jurnal otomatis untuk retur
--    Debit  : Retur Penjualan     Rp total
--    Kredit : Kas                 Rp total
-- =========================================================
CREATE OR REPLACE FUNCTION buat_jurnal_retur(p_id_retur UUID)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
    v_total      NUMERIC(14,2);
    v_tanggal    DATE;
    v_id_jurnal  UUID;
    v_id_kas     UUID;
    v_id_retur   UUID;
BEGIN
    -- Ambil data retur + transaksi
    SELECT t.total_transaksi, r.tanggal_retur
      INTO v_total, v_tanggal
      FROM retur r
      JOIN transaksi_penjualan t ON t.id_transaksi = r.id_transaksi
     WHERE r.id_retur = p_id_retur;

    IF v_total IS NULL THEN
        RAISE EXCEPTION 'Retur % tidak ditemukan', p_id_retur;
    END IF;

    SELECT id_akun INTO v_id_kas   FROM akun WHERE kode_akun = '10100';
    SELECT id_akun INTO v_id_retur FROM akun WHERE kode_akun = '40200';

    IF v_id_kas IS NULL OR v_id_retur IS NULL THEN
        RAISE EXCEPTION 'Akun Kas atau Retur Penjualan belum ada di COA';
    END IF;

    INSERT INTO jurnal_umum (tanggal_jurnal, keterangan, referensi_tipe, referensi_id)
    VALUES (
        v_tanggal,
        'Retur penjualan #' || LEFT(p_id_retur::text, 8),
        'retur',
        p_id_retur
    )
    RETURNING id_jurnal INTO v_id_jurnal;

    INSERT INTO detail_jurnal (id_jurnal, id_akun, debit, kredit, keterangan) VALUES
    (v_id_jurnal, v_id_retur, v_total, 0,       'Pengurangan pendapatan'),
    (v_id_jurnal, v_id_kas,   0,       v_total, 'Pengembalian kas');

    RETURN v_id_jurnal;
END;
$$;

-- =========================================================
-- 7) View: v_buku_besar
--    Menampilkan semua baris jurnal + info akun
-- =========================================================
CREATE OR REPLACE VIEW v_buku_besar AS
SELECT
    ju.id_jurnal,
    ju.tanggal_jurnal,
    ju.keterangan     AS keterangan_jurnal,
    ju.referensi_tipe,
    ju.referensi_id,
    a.kode_akun,
    a.nama_akun,
    a.tipe_akun,
    a.saldo_normal,
    dj.debit,
    dj.kredit,
    dj.keterangan     AS keterangan_detail
FROM detail_jurnal dj
JOIN jurnal_umum ju ON ju.id_jurnal = dj.id_jurnal
JOIN akun        a  ON a.id_akun    = dj.id_akun
ORDER BY ju.tanggal_jurnal DESC, ju.created_at DESC;

-- =========================================================
-- 8) View: v_neraca_saldo
--    Total debit, kredit, dan saldo per akun
-- =========================================================
CREATE OR REPLACE VIEW v_neraca_saldo AS
SELECT
    a.id_akun,
    a.kode_akun,
    a.nama_akun,
    a.tipe_akun,
    a.saldo_normal,
    COALESCE(SUM(dj.debit),  0) AS total_debit,
    COALESCE(SUM(dj.kredit), 0) AS total_kredit,
    CASE
        WHEN a.saldo_normal = 'debit'
            THEN COALESCE(SUM(dj.debit), 0) - COALESCE(SUM(dj.kredit), 0)
        ELSE
            COALESCE(SUM(dj.kredit), 0) - COALESCE(SUM(dj.debit), 0)
    END AS saldo
FROM akun a
LEFT JOIN detail_jurnal dj ON dj.id_akun = a.id_akun
GROUP BY a.id_akun, a.kode_akun, a.nama_akun, a.tipe_akun, a.saldo_normal
ORDER BY a.kode_akun;