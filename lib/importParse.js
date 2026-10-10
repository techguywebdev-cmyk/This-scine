// Parse Letterboxd (ZIP or CSV) and IMDb (CSV) exports into a flat list of titles to import.
// Runs in the browser; no dependencies (uses the native DecompressionStream for ZIPs).

export function parseCSV(text) {
  const rows = [];
  let row = [], field = '', q = false;
  const s = String(text || '').replace(/^﻿/, '');
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (q) {
      if (c === '"') { if (s[i + 1] === '"') { field += '"'; i++; } else q = false; }
      else field += c;
    } else if (c === '"') q = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && s[i + 1] === '\n') i++;
      row.push(field); field = '';
      if (row.length > 1 || row[0] !== '') rows.push(row);
      row = [];
    } else field += c;
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  return rows;
}

// Minimal ZIP reader: returns { 'path/name.csv': 'text', ... } for CSV entries only
export async function unzipCSVs(buffer) {
  const buf = buffer instanceof ArrayBuffer ? buffer : new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength).slice().buffer;
  const dv = new DataView(buf);
  const u8 = new Uint8Array(buf);
  let eocd = -1;
  for (let i = buf.byteLength - 22; i >= Math.max(0, buf.byteLength - 65557); i--) {
    if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error('That file doesn’t look like a ZIP');
  const count = dv.getUint16(eocd + 10, true);
  let p = dv.getUint32(eocd + 16, true);
  const dec = new TextDecoder();
  const out = {};
  for (let k = 0; k < count; k++) {
    if (dv.getUint32(p, true) !== 0x02014b50) break;
    const method = dv.getUint16(p + 10, true);
    const csize = dv.getUint32(p + 20, true);
    const nameLen = dv.getUint16(p + 28, true), extraLen = dv.getUint16(p + 30, true), commentLen = dv.getUint16(p + 32, true);
    const localOff = dv.getUint32(p + 42, true);
    const name = dec.decode(u8.subarray(p + 46, p + 46 + nameLen));
    p += 46 + nameLen + extraLen + commentLen;
    if (!/\.csv$/i.test(name)) continue;
    const lName = dv.getUint16(localOff + 26, true), lExtra = dv.getUint16(localOff + 28, true);
    const start = localOff + 30 + lName + lExtra;
    const data = u8.slice(start, start + csize);
    let bytes;
    if (method === 0) bytes = data;
    else if (method === 8) {
      if (typeof DecompressionStream === 'undefined') throw new Error('Your browser can’t open ZIPs — upload the CSV files instead');
      bytes = new Uint8Array(await new Response(new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer());
    } else continue;
    out[name] = dec.decode(bytes);
  }
  return out;
}

const LB_LISTS = { 'watched.csv': 'watched', 'ratings.csv': 'watched', 'diary.csv': 'watched', 'reviews.csv': 'watched', 'watchlist.csv': 'watchlist' };

// files: [{ name, text }] → { source, items: [{ title, year, imdbId?, type?, list, date? }] }
export function itemsFromFiles(files) {
  let source = null;
  const items = [];
  for (const f of files) {
    const rows = parseCSV(f.text);
    if (rows.length < 2) continue;
    const h = rows[0].map((x) => x.trim());
    const col = (n) => h.indexOf(n);
    const base = f.name.split('/').pop().toLowerCase();
    if (h.includes('Letterboxd URI')) {
      if (/(^|\/)(deleted|orphaned)\//i.test(f.name)) continue;
      const list = LB_LISTS[base] || (/watchlist/.test(base) ? 'watchlist' : null);
      if (!list) continue;
      source = source || 'letterboxd';
      const iN = col('Name'), iY = col('Year'), iD = col('Date');
      for (const r of rows.slice(1)) if (r[iN]) items.push({ title: r[iN], year: r[iY] || '', list, date: iD >= 0 ? r[iD] : '' });
    } else if (h.includes('Const')) {
      source = source || 'imdb';
      const list = /watchlist/.test(base) ? 'watchlist' : 'watched';
      const iC = col('Const'), iT = col('Title'), iY = col('Year'), iType = col('Title Type');
      const iD = col('Date Rated') >= 0 ? col('Date Rated') : col('Created');
      for (const r of rows.slice(1)) {
        const type = iType >= 0 ? r[iType] : '';
        if (/episode/i.test(type)) continue; // single episodes aren't titles in CineScroll
        if (r[iT] || r[iC]) items.push({ title: r[iT] || '', year: r[iY] || '', imdbId: r[iC] || '', type, list, date: iD >= 0 ? r[iD] : '' });
      }
    }
  }
  // de-duplicate (same title in watched + diary etc.)
  const seen = new Set();
  const unique = items.filter((it) => {
    const k = `${it.list}|${(it.imdbId || '')}|${it.title.toLowerCase()}|${it.year}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  return { source, items: unique };
}

export async function readExportFiles(fileList) {
  const files = [];
  for (const file of Array.from(fileList || [])) {
    if (/\.zip$/i.test(file.name) || file.type === 'application/zip') {
      const entries = await unzipCSVs(await file.arrayBuffer());
      for (const [name, text] of Object.entries(entries)) files.push({ name, text });
    } else if (/\.csv$/i.test(file.name) || file.type === 'text/csv') {
      files.push({ name: file.name, text: await file.text() });
    }
  }
  return itemsFromFiles(files);
}
