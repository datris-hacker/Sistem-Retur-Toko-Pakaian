// =========================================================
// transaksi.js — Logic halaman Transaksi (transaksi.html)
// =========================================================

import {
  supabase,
  formatRupiah,
  formatTanggal,
  shortId,
  escapeHtml,
  showToast,
  initSidebarToggle,
  initModalClosers,
  renderLogo,        // ← tambah
  applyBranding,      // ← tambah
  openModal,
  closeModal
} from './supabase.js';

// State global
let semuaTransaksi = [];     // data mentah
let transaksiTerpilih = null; // untuk tombol "Ajukan Retur"

// ---------- Entry ----------
document.addEventListener('DOMContentLoaded', () => {
  initSidebarToggle();
  initModalClosers();
  renderLogo();          // ← tambah
  applyBranding();       // ← tambah
  bindEvents();
  loadTransaksi();
});

// ---------- Bind event UI ----------
function bindEvents() {
  const inpSearch  = document.getElementById('inputSearchTransaksi');
  const inpTanggal = document.getElementById('filterTanggalTransaksi');
  const btnReset   = document.getElementById('btnResetFilter');
  const btnAjukan  = document.getElementById('btnAjukanReturDariModal');

  inpSearch .addEventListener('input',  renderTabel);
  inpTanggal.addEventListener('change', renderTabel);
  btnReset  .addEventListener('click',  () => {
    inpSearch.value = '';
    inpTanggal.value = '';
    renderTabel();
  });

  btnAjukan.addEventListener('click', () => {
    if (!transaksiTerpilih) return;
    // Arahkan ke halaman retur dengan parameter id transaksi
    window.location.href = `retur.html?transaksi=${encodeURIComponent(transaksiTerpilih.id_transaksi)}`;
  });
}

// ---------- Ambil data dari view ----------
async function loadTransaksi() {
  const tbody = document.getElementById('tbodyTransaksi');
  tbody.innerHTML = `<tr><td colspan="5" class="loader">Memuat data...</td></tr>`;

  const { data, error } = await supabase
    .from('v_transaksi_lengkap')
    .select('*')
    .order('tanggal_transaksi', { ascending: false });

  if (error) {
    console.error(error);
    tbody.innerHTML = `<tr><td colspan="5" class="error-text">Data gagal dimuat. Silakan coba lagi.</td></tr>`;
    showToast('Data gagal dimuat. Silakan coba lagi.', 'error');
    return;
  }

  semuaTransaksi = data || [];
  renderTabel();
}

// ---------- Render tabel (dengan filter) ----------
function renderTabel() {
  const tbody = document.getElementById('tbodyTransaksi');
  const q = (document.getElementById('inputSearchTransaksi').value || '').toLowerCase().trim();
  const tgl = document.getElementById('filterTanggalTransaksi').value;

  const filtered = semuaTransaksi.filter(t => {
    const cocokSearch =
      !q ||
      t.nama_pelanggan.toLowerCase().includes(q) ||
      t.id_transaksi.toLowerCase().includes(q);
    const cocokTanggal = !tgl || t.tanggal_transaksi === tgl;
    return cocokSearch && cocokTanggal;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="empty">Belum ada data transaksi.</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(t => `
    <tr>
      <td class="id-cell">${shortId(t.id_transaksi)}</td>
      <td>${escapeHtml(t.nama_pelanggan)}</td>
      <td>${formatTanggal(t.tanggal_transaksi)}</td>
      <td class="text-right">${formatRupiah(t.total_transaksi)}</td>
      <td class="text-center">
        <button class="btn btn-secondary btn-sm" data-detail="${t.id_transaksi}">Detail</button>
      </td>
    </tr>
  `).join('');

  // Pasang event tombol detail
  tbody.querySelectorAll('[data-detail]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-detail');
      const t = semuaTransaksi.find(x => x.id_transaksi === id);
      if (t) bukaDetail(t);
    });
  });
}

// ---------- Modal Detail ----------
function bukaDetail(t) {
  transaksiTerpilih = t;

  const body = document.getElementById('detailTransaksiBody');
  body.innerHTML = `
    <div class="detail-row"><div class="dr-label">ID Transaksi</div><div class="dr-value">${escapeHtml(t.id_transaksi)}</div></div>
    <div class="detail-row"><div class="dr-label">Pelanggan</div><div class="dr-value">${escapeHtml(t.nama_pelanggan)}</div></div>
    <div class="detail-row"><div class="dr-label">No. Telepon</div><div class="dr-value">${escapeHtml(t.no_telepon)}</div></div>
    <div class="detail-row"><div class="dr-label">Alamat</div><div class="dr-value">${escapeHtml(t.alamat || '-')}</div></div>
    <div class="detail-row"><div class="dr-label">Tanggal</div><div class="dr-value">${formatTanggal(t.tanggal_transaksi)}</div></div>
    <div class="detail-row"><div class="dr-label">Total</div><div class="dr-value">${formatRupiah(t.total_transaksi)}</div></div>
    <div class="detail-row"><div class="dr-label">Keterangan</div><div class="dr-value">${escapeHtml(t.keterangan_transaksi || '-')}</div></div>
  `;

  openModal('modalDetailTransaksi');
}