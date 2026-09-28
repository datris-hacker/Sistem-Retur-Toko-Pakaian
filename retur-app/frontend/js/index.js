// =========================================================
// index.js — Logic halaman Dashboard (index.html)
// =========================================================

import {
  supabase,
  formatRupiah,
  formatTanggal,
  shortId,
  escapeHtml,
  showToast,
  initSidebarToggle,
  badgeStatus,
  renderLogo,        // ← tambah
  applyBranding      // ← tambah
} from './supabase.js';

// ---------- Entry point ----------
document.addEventListener('DOMContentLoaded', () => {
  initSidebarToggle();
  isiTanggalHero();
  renderLogo();        // ← tambah
  applyBranding();
  loadDashboard();
});

// Isi tanggal di hero banner
function isiTanggalHero() {
  const el = document.getElementById('heroTanggal');
  if (!el) return;
  const bulan = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
  const d = new Date();
  el.textContent = `${d.getDate()} ${bulan[d.getMonth()]} ${d.getFullYear()}`;
}

// ---------- Load semua data dashboard ----------
async function loadDashboard() {
  try {
    await Promise.all([
      loadStatistik(),
      loadTransaksiTerbaru(),
      loadReturTerbaru()
    ]);
  } catch (err) {
    console.error(err);
    showToast('Data gagal dimuat. Silakan coba lagi.', 'error');
  }
}

// ---------- Statistik ----------
async function loadStatistik() {
  // Total transaksi
  const { count: totalTransaksi, error: e1 } = await supabase
    .from('transaksi_penjualan')
    .select('*', { count: 'exact', head: true });
  if (e1) throw e1;

  // Total retur
  const { count: totalRetur, error: e2 } = await supabase
    .from('retur')
    .select('*', { count: 'exact', head: true });
  if (e2) throw e2;

  // Retur pending
  const { count: pending, error: e3 } = await supabase
    .from('retur')
    .select('*', { count: 'exact', head: true })
    .eq('status_retur', 'pending');
  if (e3) throw e3;

  // Retur approved
  const { count: approved, error: e4 } = await supabase
    .from('retur')
    .select('*', { count: 'exact', head: true })
    .eq('status_retur', 'approved');
  if (e4) throw e4;

  setText('statTotalTransaksi', totalTransaksi ?? 0);
  setText('statTotalRetur',     totalRetur     ?? 0);
  setText('statReturPending',   pending        ?? 0);
  setText('statReturApproved',  approved       ?? 0);
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

// ---------- Transaksi Terbaru (5) ----------
async function loadTransaksiTerbaru() {
  const wrap = document.getElementById('listTransaksiTerbaru');
  if (!wrap) return;

  const { data, error } = await supabase
    .from('v_transaksi_lengkap')
    .select('*')
    .order('tanggal_transaksi', { ascending: false })
    .limit(5);

  if (error) {
    wrap.innerHTML = `<div class="error-text">Data gagal dimuat.</div>`;
    return;
  }

  if (!data || data.length === 0) {
    wrap.innerHTML = `<div class="empty">Belum ada data transaksi.</div>`;
    return;
  }

  wrap.innerHTML = data.map(t => `
    <div class="list-item">
      <div class="li-main">
        <div class="li-title">${escapeHtml(t.nama_pelanggan)}</div>
        <div class="li-sub">${shortId(t.id_transaksi)} · ${formatTanggal(t.tanggal_transaksi)}</div>
      </div>
      <div class="li-value">${formatRupiah(t.total_transaksi)}</div>
    </div>
  `).join('');
}

// ---------- Retur Terbaru (5) ----------
async function loadReturTerbaru() {
  const wrap = document.getElementById('listReturTerbaru');
  if (!wrap) return;

  const { data, error } = await supabase
    .from('v_retur_lengkap')
    .select('*')
    .order('tanggal_retur', { ascending: false })
    .limit(5);

  if (error) {
    wrap.innerHTML = `<div class="error-text">Data gagal dimuat.</div>`;
    return;
  }

  if (!data || data.length === 0) {
    wrap.innerHTML = `<div class="empty">Belum ada data retur.</div>`;
    return;
  }

  wrap.innerHTML = data.map(r => `
    <div class="list-item">
      <div class="li-main">
        <div class="li-title">${escapeHtml(r.nama_pelanggan)}</div>
        <div class="li-sub">${shortId(r.id_retur)} · ${formatTanggal(r.tanggal_retur)}</div>
      </div>
      <div>${badgeStatus(r.status_retur)}</div>
    </div>
  `).join('');
}