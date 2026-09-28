-- =========================================================
-- 02_seed.sql
-- Dummy data untuk testing
-- Jalankan SETELAH 01_schema.sql
-- =========================================================

-- Bersihkan data lama (opsional, untuk re-run)
TRUNCATE TABLE retur, transaksi_penjualan, pelanggan RESTART IDENTITY CASCADE;

-- ---------------------------------------------------------
-- 1) Insert Pelanggan (5 data)
-- ---------------------------------------------------------
INSERT INTO pelanggan (id_pelanggan, nama_pelanggan, no_telepon, alamat) VALUES
('11111111-1111-1111-1111-111111111111', 'Andi Saputra',   '081234567801', 'Jl. Merdeka No. 10, Jakarta'),
('22222222-2222-2222-2222-222222222222', 'Budi Santoso',   '081234567802', 'Jl. Sudirman No. 25, Bandung'),
('33333333-3333-3333-3333-333333333333', 'Citra Lestari',  '081234567803', 'Jl. Diponegoro No. 5, Surabaya'),
('44444444-4444-4444-4444-444444444444', 'Dewi Anggraini', '081234567804', 'Jl. Gatot Subroto No. 8, Medan'),
('55555555-5555-5555-5555-555555555555', 'Eko Prasetyo',   '081234567805', 'Jl. Ahmad Yani No. 12, Semarang');

-- ---------------------------------------------------------
-- 2) Insert Transaksi Penjualan (7 data)
-- ---------------------------------------------------------
INSERT INTO transaksi_penjualan (id_transaksi, id_pelanggan, tanggal_transaksi, total_transaksi, keterangan) VALUES
('aaaaaaaa-0001-0001-0001-000000000001', '11111111-1111-1111-1111-111111111111', '2026-01-05', 250000.00, 'Pembelian 1 kemeja'),
('aaaaaaaa-0002-0002-0002-000000000002', '22222222-2222-2222-2222-222222222222', '2026-01-08', 180000.00, 'Pembelian 1 kaos'),
('aaaaaaaa-0003-0003-0003-000000000003', '33333333-3333-3333-3333-333333333333', '2026-01-10', 420000.00, 'Pembelian 2 celana'),
('aaaaaaaa-0004-0004-0004-000000000004', '11111111-1111-1111-1111-111111111111', '2026-01-12', 150000.00, 'Pembelian 1 jaket'),
('aaaaaaaa-0005-0005-0005-000000000005', '44444444-4444-4444-4444-444444444444', '2026-01-15', 300000.00, 'Pembelian 1 dress'),
('aaaaaaaa-0006-0006-0006-000000000006', '55555555-5555-5555-5555-555555555555', '2026-01-18', 220000.00, 'Pembelian 1 kemeja batik'),
('aaaaaaaa-0007-0007-0007-000000000007', '22222222-2222-2222-2222-222222222222', '2026-01-20', 275000.00, 'Pembelian 1 sweater');

-- ---------------------------------------------------------
-- 3) Insert Retur (4 data dengan status berbeda)
-- ---------------------------------------------------------
INSERT INTO retur (id_retur, id_transaksi, tanggal_retur, alasan_retur, status_retur, keterangan) VALUES
('bbbbbbbb-0001-0001-0001-000000000001', 'aaaaaaaa-0001-0001-0001-000000000001', '2026-01-07', 'Ukuran tidak sesuai', 'pending',  'Menunggu konfirmasi admin'),
('bbbbbbbb-0002-0002-0002-000000000002', 'aaaaaaaa-0003-0003-0003-000000000003', '2026-01-11', 'Barang rusak',        'approved', 'Sudah disetujui, menunggu barang dikirim'),
('bbbbbbbb-0003-0003-0003-000000000003', 'aaaaaaaa-0005-0005-0005-000000000005', '2026-01-16', 'Salah warna',         'rejected', 'Warna sudah sesuai pesanan'),
('bbbbbbbb-0004-0004-0004-000000000004', 'aaaaaaaa-0006-0006-0006-000000000006', '2026-01-19', 'Tidak cocok',         'completed','Barang sudah diterima kembali');