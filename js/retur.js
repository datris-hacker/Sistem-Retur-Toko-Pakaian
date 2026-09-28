// =========================================================
// retur.js — Logic halaman Retur (retur.html)
// =========================================================

import {
  supabase,
  formatTanggal,
  formatRupiah,
  shortId,
  escapeHtml,
  showToast,
  initSidebarToggle,
  initModalClosers,
  openModal,
  closeModal,
  badgeStatus,
  renderLogo,        // ← tambah
  applyBranding      // ← tambah
} from './supabase.js';

// State
let semuaRetur   = [];   // data retur + join
let semuaTransaksi = []; // untuk dropdown form
let returTerpilih = null; // untuk modal detail

// ---------- Entry ----------
document.addEventListener('DOMContentLoaded', async () => {
  initSidebarToggle();
  initModalClosers();
  renderLogo();        // ← tambah
  applyBranding();
  bindEvents();

  // Isi default tanggal retur = hari ini
  const fTanggal = document.getElementById('fTanggalRetur');
  if (fTanggal) fTanggal.value = new Date().toISOString().slice(0, 10);

  await Promise.all([loadRetur(), loadTransaksiUntukForm()]);

  // Jika URL punya ?transaksi=<id> → auto buka form
  const url = new URLSearchParams(window.location.search);
  const idTrx = url.get('transaksi');
  if (idTrx) {
    bukaFormRetur(idTrx);
  }
});

// ---------- Event UI ----------
function bindEvents() {
  const inpSearch   = document.getElementById('inputSearchRetur');
  const selStatus   = document.getElementById('filterStatusRetur');
  const btnForm     = document.getElementById('btnBukaFormRetur');
  const btnSimpan   = document.getElementById('btnSimpanRetur');
  const btnSimpanSt = document.getElementById('btnSimpanStatus');
  const selTrx      = document.getElementById('fIdTransaksi');

  inpSearch.addEventListener('input',  renderTabel);
  selStatus.addEventListener('change', renderTabel);
  btnForm  .addEventListener('click',  () => bukaFormRetur());
  btnSimpan.addEventListener('click',  submitFormRetur);
  btnSimpanSt.addEventListener('click', simpanPerubahanStatus);

  // Auto-fill nama pelanggan ketika transaksi dipilih
  selTrx.addEventListener('change', () => {
    const t = semuaTransaksi.find(x => x.id_transaksi === selTrx.value);
    document.getElementById('fPelanggan').value = t ? t.nama_pelanggan : '';
  });
}

// ---------- Ambil daftar retur (view) ----------
async function loadRetur() {
  const tbody = document.getElementById('tbodyRetur');
  tbody.innerHTML = `<tr><td colspan="7" class="loader">Memuat data...</td></tr>`;

  const { data, error } = await supabase
    .from('v_retur_lengkap')
    .select('*')
    .order('tanggal_retur', { ascending: false });

  if (error) {
    console.error(error);
    tbody.innerHTML = `<tr><td colspan="7" class="error-text">Data gagal dimuat. Silakan coba lagi.</td></tr>`;
    showToast('Data gagal dimuat. Silakan coba lagi.', 'error');
    return;
  }

  semuaRetur = data || [];
  renderTabel();
}

// ---------- Ambil transaksi untuk dropdown ----------
async function loadTransaksiUntukForm() {
  const { data, error } = await supabase
    .from('v_transaksi_lengkap')
    .select('*')
    .order('tanggal_transaksi', { ascending: false });

  if (error) { console.error(error); return; }
  semuaTransaksi = data || [];

  const sel = document.getElementById('fIdTransaksi');
  sel.innerHTML = `<option value="">— Pilih Transaksi —</option>` +
    semuaTransaksi.map(t => `
      <option value="${t.id_transaksi}">
        ${shortId(t.id_transaksi)} — ${escapeHtml(t.nama_pelanggan)} (${formatTanggal(t.tanggal_transaksi)})
      </option>
    `).join('');
}

// ---------- Render tabel retur ----------
function renderTabel() {
  const tbody = document.getElementById('tbodyRetur');
  const q = (document.getElementById('inputSearchRetur').value || '').toLowerCase().trim();
  const status = document.getElementById('filterStatusRetur').value;

  const filtered = semuaRetur.filter(r => {
    const cocokSearch =
      !q ||
      r.nama_pelanggan.toLowerCase().includes(q) ||
      r.id_retur.toLowerCase().includes(q) ||
      (r.id_transaksi || '').toLowerCase().includes(q);
    const cocokStatus = !status || r.status_retur === status;
    return cocokSearch && cocokStatus;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="empty">Belum ada data retur.</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(r => `
    <tr>
      <td class="id-cell">${shortId(r.id_retur)}</td>
      <td class="id-cell">${shortId(r.id_transaksi)}</td>
      <td>${escapeHtml(r.nama_pelanggan)}</td>
      <td>${formatTanggal(r.tanggal_retur)}</td>
      <td>${escapeHtml(r.alasan_retur)}</td>
      <td>${badgeStatus(r.status_retur)}</td>
      <td class="text-center">
        <button class="btn btn-secondary btn-sm" data-detail="${r.id_retur}">Detail</button>
      </td>
    </tr>
  `).join('');

  tbody.querySelectorAll('[data-detail]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-detail');
      const r = semuaRetur.find(x => x.id_retur === id);
      if (r) bukaDetailRetur(r);
    });
  });
}

// ---------- Buka form ajukan retur ----------
function bukaFormRetur(prefillIdTransaksi = '') {
  const form = document.getElementById('formRetur');
  form.reset();
  document.getElementById('fPelanggan').value = '';
  document.getElementById('fTanggalRetur').value = new Date().toISOString().slice(0, 10);
  document.getElementById('fStatus').value = 'pending';

  if (prefillIdTransaksi) {
    document.getElementById('fIdTransaksi').value = prefillIdTransaksi;
    const t = semuaTransaksi.find(x => x.id_transaksi === prefillIdTransaksi);
    if (t) document.getElementById('fPelanggan').value = t.nama_pelanggan;
  }

  openModal('modalFormRetur');
}

// ---------- Submit form retur ----------
async function submitFormRetur() {
  const idTransaksi = document.getElementById('fIdTransaksi').value.trim();
  const tanggal     = document.getElementById('fTanggalRetur').value;
  const alasan      = document.getElementById('fAlasan').value.trim();
  const keterangan  = document.getElementById('fKeterangan').value.trim();
  const status      = document.getElementById('fStatus').value;

  // Validasi
  if (!idTransaksi)  return showToast('ID Transaksi wajib dipilih.', 'error');
  if (!tanggal)      return showToast('Tanggal retur wajib diisi.', 'error');
  if (!alasan)       return showToast('Alasan retur wajib diisi.', 'error');
  if (!['pending', 'approved', 'rejected', 'completed'].includes(status))
    return showToast('Status tidak valid.', 'error');

  const btn = document.getElementById('btnSimpanRetur');
  btn.disabled = true;
  btn.textContent = 'Menyimpan...';

  const { error } = await supabase.from('retur').insert([{
    id_transaksi : idTransaksi,
    tanggal_retur: tanggal,
    alasan_retur : alasan,
    keterangan   : keterangan || null,
    status_retur : status
  }]);

  btn.disabled = false;
  btn.textContent = 'Simpan';

  if (error) {
    console.error(error);
    showToast('Retur gagal diajukan. Silakan coba lagi.', 'error');
    return;
  }

  showToast('Retur berhasil diajukan.', 'success');
  closeModal('modalFormRetur');
  await loadRetur();
}

// ---------- Buka detail retur ----------
function bukaDetailRetur(r) {
  returTerpilih = r;

  const body = document.getElementById('detailReturBody');
  body.innerHTML = `
    <div class="detail-row"><div class="dr-label">ID Retur</div><div class="dr-value">${escapeHtml(r.id_retur)}</div></div>
    <div class="detail-row"><div class="dr-label">ID Transaksi</div><div class="dr-value">${escapeHtml(r.id_transaksi)}</div></div>
    <div class="detail-row"><div class="dr-label">Pelanggan</div><div class="dr-value">${escapeHtml(r.nama_pelanggan)}</div></div>
    <div class="detail-row"><div class="dr-label">No. Telepon</div><div class="dr-value">${escapeHtml(r.no_telepon || '-')}</div></div>
    <div class="detail-row"><div class="dr-label">Tgl Transaksi</div><div class="dr-value">${formatTanggal(r.tanggal_transaksi)}</div></div>
    <div class="detail-row"><div class="dr-label">Total Transaksi</div><div class="dr-value">${formatRupiah(r.total_transaksi)}</div></div>
    <div class="detail-row"><div class="dr-label">Tgl Retur</div><div class="dr-value">${formatTanggal(r.tanggal_retur)}</div></div>
    <div class="detail-row"><div class="dr-label">Alasan</div><div class="dr-value">${escapeHtml(r.alasan_retur)}</div></div>
    <div class="detail-row"><div class="dr-label">Keterangan</div><div class="dr-value">${escapeHtml(r.keterangan_retur || '-')}</div></div>
    <div class="form-group" style="margin-top:14px">
      <label for="fStatusDetail">Status Retur</label>
      <select id="fStatusDetail" class="input select">
        <option value="pending"   ${r.status_retur==='pending'  ?'selected':''}>Pending</option>
        <option value="approved"  ${r.status_retur==='approved' ?'selected':''}>Approved</option>
        <option value="rejected"  ${r.status_retur==='rejected' ?'selected':''}>Rejected</option>
        <option value="completed" ${r.status_retur==='completed'?'selected':''}>Completed</option>
      </select>
    </div>
  `;

  openModal('modalDetailRetur');
}

// ---------- Simpan perubahan status ----------
async function simpanPerubahanStatus() {
  if (!returTerpilih) return;

  const sel = document.getElementById('fStatusDetail');
  const statusBaru = sel.value;
  const statusLama = returTerpilih.status_retur;

  if (statusBaru === statusLama) {
    showToast('Tidak ada perubahan status.', 'info');
    return;
  }

  const ok = confirm(`Ubah status retur dari "${statusLama}" menjadi "${statusBaru}"?`);
  if (!ok) return;

  const btn = document.getElementById('btnSimpanStatus');
  btn.disabled = true;
  btn.textContent = 'Menyimpan...';

  const { error } = await supabase
    .from('retur')
    .update({ status_retur: statusBaru })
    .eq('id_retur', returTerpilih.id_retur);

  btn.disabled = false;
  btn.textContent = 'Simpan Perubahan';

  if (error) {
    console.error(error);
    showToast('Gagal memperbarui status. Silakan coba lagi.', 'error');
    return;
  }

  showToast('Status retur berhasil diperbarui.', 'success');
  closeModal('modalDetailRetur');
  await loadRetur();
}