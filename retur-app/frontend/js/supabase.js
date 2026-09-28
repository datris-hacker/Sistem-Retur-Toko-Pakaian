// =========================================================
// supabase.js
// Konfigurasi koneksi Supabase (dipakai oleh semua halaman)
// =========================================================

import { APP_CONFIG } from './config.js';
// 1) Import Supabase JS Client dari CDN (ES Module)
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// 2) GANTI DENGAN KREDENSIAL PROJECT SUPABASE ANDA
const SUPABASE_URL      = 'https://qfftwqpnttfctztvkjuz.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_w6bPzq4O2IBKTEIrE8HOTw_R1DrDme3';

// 3) Buat client tunggal yang bisa dipakai lintas file
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// =========================================================
// Helper umum (dipakai semua halaman)
// =========================================================

/**
 * Format angka ke Rupiah
 * 250000 → "Rp 250.000"
 */
export function formatRupiah(angka) {
  const n = Number(angka) || 0;
  return 'Rp ' + n.toLocaleString('id-ID');
}

/**
 * Format tanggal ISO (YYYY-MM-DD) → "05 Jan 2026"
 */
export function formatTanggal(iso) {
  if (!iso) return '-';
  const bulan = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
                 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return `${String(d.getDate()).padStart(2, '0')} ${bulan[d.getMonth()]} ${d.getFullYear()}`;
}

/**
 * Potong UUID agar rapi di tabel: "aaaaaaaa-0001-...-0001" → "aaaa…0001"
 */
export function shortId(id) {
  if (!id || id.length < 12) return id || '-';
  return id.slice(0, 8) + '…' + id.slice(-4);
}

/**
 * Tampilkan toast (notifikasi) di kanan bawah
 * tipe: 'success' | 'error' | 'info'
 */
export function showToast(message, tipe = 'success') {
  const wrap = document.getElementById('toastWrap');
  if (!wrap) return;

  const el = document.createElement('div');
  el.className = `toast ${tipe}`;
  el.textContent = message;
  wrap.appendChild(el);

  setTimeout(() => {
    el.style.transition = 'opacity .25s, transform .25s';
    el.style.opacity = '0';
    el.style.transform = 'translateY(8px)';
    setTimeout(() => el.remove(), 250);
  }, 2600);
}

/**
 * Escape HTML agar aman dari karakter aneh
 */
export function escapeHtml(s) {
  if (s === null || s === undefined) return '';
  return String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

/**
 * Inisialisasi tombol hamburger + overlay sidebar (dipakai semua halaman)
 */
export function initSidebarToggle() {
  const btn     = document.getElementById('btnHamburger');
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('overlay');
  if (!btn || !sidebar || !overlay) return;

  const open  = () => { sidebar.classList.add('open'); overlay.classList.add('show'); };
  const close = () => { sidebar.classList.remove('open'); overlay.classList.remove('show'); };

  btn.addEventListener('click', () => {
    sidebar.classList.contains('open') ? close() : open();
  });
  overlay.addEventListener('click', close);
}

/**
 * Inisialisasi semua tombol close modal (data-close="<id>")
 */
export function initModalClosers() {
  document.querySelectorAll('[data-close]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-close');
      const modal = document.getElementById(id);
      if (modal) modal.classList.remove('show');
    });
  });

  // Klik area gelap di luar modal-content → tutup
  document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', e => {
      if (e.target === modal) modal.classList.remove('show');
    });
  });
}

/**
 * Buka / tutup modal by id
 */
export function openModal(id) {
  const m = document.getElementById(id);
  if (m) m.classList.add('show');
}
export function closeModal(id) {
  const m = document.getElementById(id);
  if (m) m.classList.remove('show');
}

/**
 * Badge HTML untuk status retur
 */
export function badgeStatus(status) {
  const s = (status || 'pending').toLowerCase();
  return `<span class="badge badge-${s}">${escapeHtml(s)}</span>`;
}

// =========================================================
// Helper: Logo & Branding
// =========================================================

/**
 * Ganti .brand-dot (dot hijau) dengan logo toko.
 * Kalau logo tidak ada / URL belum diisi, biarkan dot tetap tampil.
 */
export function renderLogo() {
  if (!APP_CONFIG.logoUrl || APP_CONFIG.logoUrl.includes('PASTE_URL')) return;

  const dots = document.querySelectorAll('.brand-dot');
  dots.forEach(dot => {
    const img = document.createElement('img');
    img.src = APP_CONFIG.logoUrl;
    img.alt = 'Logo Toko';
    img.className = 'brand-logo';
    img.onerror = () => {
      // Kalau gagal load, balikkan dot hijau
      img.replaceWith(dot.cloneNode(true));
    };
    dot.replaceWith(img);
  });
}

/**
 * Set favicon & nama toko dari config.
 */
export function applyBranding() {
  // Favicon
  if (APP_CONFIG.faviconUrl && !APP_CONFIG.faviconUrl.includes('PASTE_URL')) {
    let link = document.querySelector("link[rel='icon']");
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    link.href = APP_CONFIG.faviconUrl;
  }

  // Update nama toko di topbar
  if (APP_CONFIG.namaToko) {
    const titles = document.querySelectorAll('.topbar-title');
    titles.forEach(t => {
      const textNode = Array.from(t.childNodes).find(n =>
        n.nodeType === 3 && n.textContent.trim().length > 0
      );
      if (textNode) textNode.textContent = ' ' + APP_CONFIG.namaToko;
    });
  }
}