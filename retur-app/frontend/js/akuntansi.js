// =========================================================
// akuntansi.js — Logic halaman Akuntansi (akuntansi.html)
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
  openModal,
  closeModal,
  renderLogo,        // ← tambah
  applyBranding      // ← tambah
} from './supabase.js';

// ---------- State ----------
let semuaAkun       = [];
let semuaJurnal     = [];
let semuaNeraca     = [];

// ---------- Entry ----------
document.addEventListener('DOMContentLoaded', () => {
  initSidebarToggle();
  renderLogo();        // ← tambah
  applyBranding();      // ← tambah
  initModalClosers();
  bindEvents();
  loadAll();
});

// ---------- Bind Event ----------
function bindEvents() {
  // Tab switching
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  // Tombol posting
  document.getElementById('btnPostingPenjualan').addEventListener('click', postingSemuaPenjualan);
  document.getElementById('btnPostingRetur').addEventListener('click', postingSemuaRetur);
  document.getElementById('btnRefreshJurnal').addEventListener('click', () => loadJurnal());

  // Filter buku besar
  document.getElementById('filterAkunBukuBesar').addEventListener('change', e => {
    const idAkun = e.target.value;
    if (idAkun) {
      loadBukuBesar(idAkun);
    } else {
      document.getElementById('tbodyBukuBesar').innerHTML =
        `<tr><td colspan="5" class="empty">Pilih akun untuk melihat buku besar.</td></tr>`;
      document.getElementById('judulBukuBesar').textContent = 'Buku Besar';
    }
  });
}

// ---------- Tab switching ----------
function switchTab(namaTab) {
  // Update tombol
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === namaTab);
  });
  // Update panel
  document.querySelectorAll('.tab-panel').forEach(panel => {
    panel.classList.toggle('active', panel.id === 'tab-' + namaTab);
  });
}

// ---------- Load semua saat halaman dibuka ----------
async function loadAll() {
  await Promise.all([
    loadCoa(),
    loadJurnal(),
    loadNeracaSaldo()
  ]);
}

// =========================================================
// TAB 1: COA
// =========================================================
async function loadCoa() {
  const tbody = document.getElementById('tbodyCoa');
  tbody.innerHTML = `<tr><td colspan="4" class="loader">Memuat data...</td></tr>`;

  const { data, error } = await supabase
    .from('akun')
    .select('*')
    .order('kode_akun', { ascending: true });

  if (error) {
    console.error(error);
    tbody.innerHTML = `<tr><td colspan="4" class="error-text">Data gagal dimuat.</td></tr>`;
    return;
  }

  semuaAkun = data || [];

  if (semuaAkun.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" class="empty">Belum ada akun.</td></tr>`;
    return;
  }

  tbody.innerHTML = semuaAkun.map(a => `
    <tr>
      <td class="id-cell">${escapeHtml(a.kode_akun)}</td>
      <td>${escapeHtml(a.nama_akun)}</td>
      <td><span class="badge-tipe ${a.tipe_akun}">${escapeHtml(a.tipe_akun)}</span></td>
      <td>${escapeHtml(a.saldo_normal)}</td>
    </tr>
  `).join('');

  // Populate filter akun buku besar
  const sel = document.getElementById('filterAkunBukuBesar');
  sel.innerHTML = `<option value="">— Pilih Akun —</option>` +
    semuaAkun.map(a => `
      <option value="${a.id_akun}">${escapeHtml(a.kode_akun)} — ${escapeHtml(a.nama_akun)}</option>
    `).join('');
}

// =========================================================
// TAB 2: JURNAL UMUM
// =========================================================
async function loadJurnal() {
  const tbody = document.getElementById('tbodyJurnal');
  tbody.innerHTML = `<tr><td colspan="5" class="loader">Memuat data...</td></tr>`;

  // Ambil header jurnal
  const { data: jurnal, error: errJurnal } = await supabase
    .from('jurnal_umum')
    .select('*')
    .order('tanggal_jurnal', { ascending: false })
    .order('created_at', { ascending: false });

  if (errJurnal) {
    console.error(errJurnal);
    tbody.innerHTML = `<tr><td colspan="5" class="error-text">Data gagal dimuat.</td></tr>`;
    return;
  }

  semuaJurnal = jurnal || [];

  if (semuaJurnal.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="empty">Belum ada jurnal. Klik "Posting" untuk membuat jurnal otomatis.</td></tr>`;
    return;
  }

  // Ambil detail untuk menghitung total debit per jurnal
  const ids = semuaJurnal.map(j => j.id_jurnal);
  const { data: detail, error: errDetail } = await supabase
    .from('detail_jurnal')
    .select('id_jurnal, debit, kredit')
    .in('id_jurnal', ids);

  if (errDetail) {
    console.error(errDetail);
  }

  const totalMap = {};
  (detail || []).forEach(d => {
    if (!totalMap[d.id_jurnal]) totalMap[d.id_jurnal] = 0;
    totalMap[d.id_jurnal] += Number(d.debit);
  });

  tbody.innerHTML = semuaJurnal.map(j => `
    <tr>
      <td>${formatTanggal(j.tanggal_jurnal)}</td>
      <td>${escapeHtml(j.keterangan)}</td>
      <td class="id-cell">${escapeHtml(j.referensi_tipe || '-')} · ${shortId(j.referensi_id)}</td>
      <td class="text-right">${formatRupiah(totalMap[j.id_jurnal] || 0)}</td>
      <td class="text-center">
        <button class="btn btn-secondary btn-sm" data-detail-jurnal="${j.id_jurnal}">Detail</button>
      </td>
    </tr>
  `).join('');

  // Bind detail
  tbody.querySelectorAll('[data-detail-jurnal]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-detail-jurnal');
      bukaDetailJurnal(id);
    });
  });
}

async function bukaDetailJurnal(idJurnal) {
  const jurnal = semuaJurnal.find(j => j.id_jurnal === idJurnal);
  if (!jurnal) return;

  const body = document.getElementById('detailJurnalBody');
  body.innerHTML = `<div class="loader">Memuat detail...</div>`;
  openModal('modalDetailJurnal');

  const { data, error } = await supabase
    .from('v_buku_besar')
    .select('*')
    .eq('id_jurnal', idJurnal);

  if (error) {
    body.innerHTML = `<div class="error-text">Gagal memuat detail.</div>`;
    return;
  }

  let totalDebit = 0, totalKredit = 0;
  const rows = (data || []).map(d => {
    totalDebit  += Number(d.debit);
    totalKredit += Number(d.kredit);
    return `
      <tr>
        <td class="id-cell">${escapeHtml(d.kode_akun)}</td>
        <td>${escapeHtml(d.nama_akun)}</td>
        <td class="text-right">${d.debit  > 0 ? formatRupiah(d.debit)  : '—'}</td>
        <td class="text-right">${d.kredit > 0 ? formatRupiah(d.kredit) : '—'}</td>
      </tr>
    `;
  }).join('');

  body.innerHTML = `
    <div class="detail-row">
      <div class="dr-label">Tanggal</div>
      <div class="dr-value">${formatTanggal(jurnal.tanggal_jurnal)}</div>
    </div>
    <div class="detail-row">
      <div class="dr-label">Keterangan</div>
      <div class="dr-value">${escapeHtml(jurnal.keterangan)}</div>
    </div>
    <div class="detail-row">
      <div class="dr-label">Referensi</div>
      <div class="dr-value">${escapeHtml(jurnal.referensi_tipe || '-')} · ${escapeHtml(jurnal.referensi_id || '-')}</div>
    </div>
    <div class="table-wrap" style="margin-top:14px">
      <table class="table">
        <thead>
          <tr>
            <th>Kode</th>
            <th>Akun</th>
            <th class="text-right">Debit</th>
            <th class="text-right">Kredit</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
        <tfoot>
          <tr>
            <td colspan="2">TOTAL</td>
            <td class="text-right">${formatRupiah(totalDebit)}</td>
            <td class="text-right">${formatRupiah(totalKredit)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  `;
}

// =========================================================
// TAB 3: NERACA SALDO
// =========================================================
async function loadNeracaSaldo() {
  const tbody = document.getElementById('tbodyNeracaSaldo');
  const tfoot = document.getElementById('tfootNeracaSaldo');
  tbody.innerHTML = `<tr><td colspan="6" class="loader">Memuat data...</td></tr>`;
  tfoot.innerHTML = '';

  const { data, error } = await supabase
    .from('v_neraca_saldo')
    .select('*')
    .order('kode_akun', { ascending: true });

  if (error) {
    console.error(error);
    tbody.innerHTML = `<tr><td colspan="6" class="error-text">Data gagal dimuat.</td></tr>`;
    return;
  }

  semuaNeraca = data || [];

  if (semuaNeraca.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="empty">Belum ada data akun.</td></tr>`;
    return;
  }

  let totalDebit = 0, totalKredit = 0, totalSaldo = 0;

  tbody.innerHTML = semuaNeraca.map(n => {
    const d = Number(n.total_debit);
    const k = Number(n.total_kredit);
    const s = Number(n.saldo);

    // Saldo muncul di kolom debit/kredit sesuai saldo_normal
    const kolomDebit  = n.saldo_normal === 'debit'  ? s : 0;
    const kolomKredit = n.saldo_normal === 'kredit' ? s : 0;

    totalDebit  += kolomDebit;
    totalKredit += kolomKredit;

    return `
      <tr>
        <td class="id-cell">${escapeHtml(n.kode_akun)}</td>
        <td>${escapeHtml(n.nama_akun)}</td>
        <td><span class="badge-tipe ${n.tipe_akun}">${escapeHtml(n.tipe_akun)}</span></td>
        <td class="text-right">${kolomDebit  > 0 ? formatRupiah(kolomDebit)  : '—'}</td>
        <td class="text-right">${kolomKredit > 0 ? formatRupiah(kolomKredit) : '—'}</td>
        <td class="text-right">${formatRupiah(s)}</td>
      </tr>
    `;
  }).join('');

  const balanceOk = totalDebit === totalKredit;
  tfoot.innerHTML = `
    <tr>
      <td colspan="3">TOTAL ${balanceOk ? '✓ Balance' : '⚠ Tidak Balance'}</td>
      <td class="text-right">${formatRupiah(totalDebit)}</td>
      <td class="text-right">${formatRupiah(totalKredit)}</td>
      <td class="text-right">—</td>
    </tr>
  `;

  document.getElementById('neracaSaldoDate').textContent =
    'Per ' + formatTanggal(new Date().toISOString().slice(0, 10));
}

// =========================================================
// TAB 4: BUKU BESAR
// =========================================================
async function loadBukuBesar(idAkun) {
  const tbody = document.getElementById('tbodyBukuBesar');
  tbody.innerHTML = `<tr><td colspan="5" class="loader">Memuat data...</td></tr>`;

  const akun = semuaAkun.find(a => a.id_akun === idAkun);
  document.getElementById('judulBukuBesar').textContent =
    akun ? `Buku Besar — ${akun.kode_akun} ${akun.nama_akun}` : 'Buku Besar';

  const { data, error } = await supabase
    .from('v_buku_besar')
    .select('*')
    .eq('kode_akun', akun ? akun.kode_akun : '')
    .order('tanggal_jurnal', { ascending: true });

  if (error) {
    console.error(error);
    tbody.innerHTML = `<tr><td colspan="5" class="error-text">Data gagal dimuat.</td></tr>`;
    return;
  }

  if (!data || data.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="empty">Belum ada transaksi untuk akun ini.</td></tr>`;
    return;
  }

  let saldoBerjalan = 0;
  const akunSaldoNormal = akun ? akun.saldo_normal : 'debit';

  tbody.innerHTML = data.map(row => {
    if (akunSaldoNormal === 'debit') {
      saldoBerjalan += Number(row.debit) - Number(row.kredit);
    } else {
      saldoBerjalan += Number(row.kredit) - Number(row.debit);
    }

    return `
      <tr>
        <td>${formatTanggal(row.tanggal_jurnal)}</td>
        <td>${escapeHtml(row.keterangan_detail || row.keterangan_jurnal)}</td>
        <td class="id-cell">${escapeHtml(row.referensi_tipe || '-')}</td>
        <td class="text-right">${row.debit  > 0 ? formatRupiah(row.debit)  : '—'}</td>
        <td class="text-right">${row.kredit > 0 ? formatRupiah(row.kredit) : '—'}</td>
      </tr>
    `;
  }).join('') + `
    <tr style="background:#F8FAF9;font-weight:600">
      <td colspan="3" class="text-right">Saldo Akhir</td>
      <td colspan="2" class="text-right">${formatRupiah(saldoBerjalan)}</td>
    </tr>
  `;
}

// =========================================================
// POSTING JURNAL OTOMATIS
// =========================================================

// Posting semua transaksi penjualan yang belum punya jurnal
async function postingSemuaPenjualan() {
  const ok = confirm('Posting jurnal untuk SEMUA transaksi penjualan yang belum memiliki jurnal?');
  if (!ok) return;

  const btn = document.getElementById('btnPostingPenjualan');
  btn.disabled = true;
  btn.textContent = 'Memproses...';

  try {
    // Ambil semua transaksi
    const { data: transaksi, error: errT } = await supabase
      .from('transaksi_penjualan')
      .select('id_transaksi');
    if (errT) throw errT;

    // Ambil referensi_id yang sudah di-posting
    const { data: sudah, error: errJ } = await supabase
      .from('jurnal_umum')
      .select('referensi_id')
      .eq('referensi_tipe', 'penjualan');
    if (errJ) throw errJ;

    const sudahSet = new Set((sudah || []).map(x => x.referensi_id));
    const belum = (transaksi || []).filter(t => !sudahSet.has(t.id_transaksi));

    if (belum.length === 0) {
      showToast('Semua transaksi sudah memiliki jurnal.', 'info');
      btn.disabled = false;
      btn.textContent = 'Posting Semua Jurnal Penjualan';
      return;
    }

    // Panggil RPC function satu per satu
    let sukses = 0;
    let gagal  = 0;
    for (const t of belum) {
      const { error } = await supabase.rpc('buat_jurnal_penjualan', {
        p_id_transaksi: t.id_transaksi
      });
      if (error) { gagal++; console.error(error); }
      else sukses++;
    }

    showToast(`Berhasil posting ${sukses} jurnal penjualan.${gagal ? ` Gagal ${gagal}.` : ''}`, sukses > 0 ? 'success' : 'error');
    await loadJurnal();
    await loadNeracaSaldo();
  } catch (err) {
    console.error(err);
    showToast('Gagal posting jurnal: ' + err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Posting Semua Jurnal Penjualan';
  }
}

// Posting semua retur approved yang belum punya jurnal
async function postingSemuaRetur() {
  const ok = confirm('Posting jurnal untuk semua retur dengan status APPROVED yang belum di-posting?');
  if (!ok) return;

  const btn = document.getElementById('btnPostingRetur');
  btn.disabled = true;
  btn.textContent = 'Memproses...';

  try {
    // Ambil retur approved
    const { data: retur, error: errR } = await supabase
      .from('retur')
      .select('id_retur, status_retur')
      .eq('status_retur', 'approved');
    if (errR) throw errR;

    // Ambil referensi_id yang sudah di-posting
    const { data: sudah, error: errJ } = await supabase
      .from('jurnal_umum')
      .select('referensi_id')
      .eq('referensi_tipe', 'retur');
    if (errJ) throw errJ;

    const sudahSet = new Set((sudah || []).map(x => x.referensi_id));
    const belum = (retur || []).filter(r => !sudahSet.has(r.id_retur));

    if (belum.length === 0) {
      showToast('Semua retur approved sudah memiliki jurnal.', 'info');
      btn.disabled = false;
      btn.textContent = 'Posting Semua Jurnal Retur';
      return;
    }

    let sukses = 0;
    let gagal  = 0;
    for (const r of belum) {
      const { error } = await supabase.rpc('buat_jurnal_retur', {
        p_id_retur: r.id_retur
      });
      if (error) { gagal++; console.error(error); }
      else sukses++;
    }

    showToast(`Berhasil posting ${sukses} jurnal retur.${gagal ? ` Gagal ${gagal}.` : ''}`, sukses > 0 ? 'success' : 'error');
    await loadJurnal();
    await loadNeracaSaldo();
  } catch (err) {
    console.error(err);
    showToast('Gagal posting jurnal: ' + err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Posting Semua Jurnal Retur';
  }
}