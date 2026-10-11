/**
 * Neutral by Design — Quadrant study backend (Google Apps Script) — v3 (60 packages + 3 T-INSPIRE prototypes)
 *
 * Update: open the Apps Script project → replace ALL code with this file → Save →
 * Deploy → Manage deployments → ✏️ Edit → Version: "New version" → Deploy. The /exec URL stays the same.
 *
 * Tabs:
 *   Responses / Placements        — v1 answers (12 packages). Kept unchanged, still read by the website.
 *   Responses_v2                  — v2 answers (60 packages). Kept, still read.
 *   Responses_v3                  — v3 answers (60 packages + prototypes T1 CLINIC, T2 FORM, T3 TERRA)
 *   Placements_v2                 — long format for v2 and v3 (item_set = study | new | prototype)
 */
const STUDY = ['P1','P2','P3','P4','P5','P6','P7','P8','P9','P10','P11','P12'];
const EXTRA = [
  'D01', 'D02', 'D03', 'D05', 'D08', 'D09', 'D10', 'D12', 'D14', 'D15', 'D16', 'D17',
  'D19', 'D20', 'D22', 'D23', 'D24', 'D25', 'D26', 'D27', 'D28', 'D29', 'D30', 'D33',
  'D34', 'D35', 'D36', 'D37', 'D38', 'D39', 'D40', 'D42', 'D43', 'D44', 'D45', 'D46',
  'D47', 'D48', 'D49', 'D50', 'D51', 'D52', 'D53', 'D55', 'D56', 'D58', 'D59', 'D60'
];
const PROTO = ['T1','T2','T3'];          // T-INSPIRE CLINIC, FORM, TERRA
const ALL60 = STUDY.concat(EXTRA);
const ALL = ALL60.concat(PROTO);
const OK = { market: ['TH','TW','OT'], gender: ['F','M','NB','TT','NA'], gen: ['Z','Y','X','O'], lang: ['en','th','zh'], device: ['touch','mouse'] };
const V1_HEAD = ['record_id','received_at','created_at','market','gender','generation','designer','lang','device','duration_ms','most_neutral_pick','comment']
  .concat(STUDY.flatMap(p => [p + '_x_mbp', p + '_y_fbp']));
const V2_META = ['record_id','received_at','created_at','market','gender','generation','designer','lang','device','duration_ms','rounds_completed','n_items','most_neutral_pick','comment'];
const V2_HEAD = V2_META.concat(ALL60.flatMap(p => [p + '_x_mbp', p + '_y_fbp']));
const V3_HEAD = V2_META.concat(ALL.flatMap(p => [p + '_x_mbp', p + '_y_fbp']));
const LONG_HEAD = ['record_id','received_at','market','gender','generation','designer','lang','device','package','item_set','round','x_mbp','y_fbp','quadrant','present_order','first_place_ms','moves','most_neutral_pick'];

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000);
    const rec = validate_(JSON.parse(e.postData.contents));
    if (!rec) return json_({ ok: false, error: 'invalid' });
    const ss = SpreadsheetApp.getActiveSpreadsheet(), id = Utilities.getUuid(), now = new Date();
    const resp = sheet_(ss, 'Responses_v3', V3_HEAD);
    resp.appendRow([id, now, rec.createdAt, rec.market, rec.gender, rec.gen, rec.designer ? 1 : 0, rec.lang, rec.device, rec.durationMs, rec.rounds, rec.ids.length, rec.pick, rec.comment]
      .concat(ALL.flatMap(p => rec.pl[p] ? [rec.pl[p].x, rec.pl[p].y] : ['', ''])));
    const long = sheet_(ss, 'Placements_v2', LONG_HEAD);
    const rows = rec.ids.map(p => { const v = rec.pl[p];
      return [id, now, rec.market, rec.gender, rec.gen, rec.designer ? 1 : 0, rec.lang, rec.device, p, STUDY.includes(p) ? 'study' : PROTO.includes(p) ? 'prototype' : 'new', v.round, v.x, v.y, quad_(v.x, v.y), v.ord + 1, v.t, v.moves, rec.pick]; });
    long.getRange(long.getLastRow() + 1, 1, rows.length, LONG_HEAD.length).setValues(rows);
    return json_({ ok: true, id: id });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  } finally { try { lock.releaseLock(); } catch (_) {} }
}

/** Anonymous placements for the group map (no comments). Reads v1 and v2 tabs. */
function doGet(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet(), records = [];
  const read = (name, head, offset, items, v) => {
    const sh = ss.getSheetByName(name); if (!sh || sh.getLastRow() < 2) return;
    sh.getRange(2, 1, sh.getLastRow() - 1, head.length).getValues().forEach(r => {
      const pl = {};
      items.forEach((p, i) => { const x = r[offset + i * 2], y = r[offset + i * 2 + 1]; if (x !== '' && y !== '') pl[p] = { x: Number(x), y: Number(y) }; });
      records.push({ id: String(r[0]), v: v, createdAt: String(r[2]), market: r[3], gender: r[4], gen: r[5], designer: r[6] == 1, lang: r[7], device: r[8],
        rounds: v >= 2 ? Number(r[10]) : 1, pick: v >= 2 ? r[12] : r[10], pl: pl });
    });
  };
  read('Responses', V1_HEAD, 12, STUDY, 1);
  read('Responses_v2', V2_HEAD, V2_META.length, ALL60, 2);
  read('Responses_v3', V3_HEAD, V2_META.length, ALL, 3);
  return json_({ records: records });
}

function validate_(d) {
  if (!d || typeof d !== 'object' || !d.pl || !OK.market.includes(d.market)) return null;
  const pick = (v, list) => list.indexOf(v) >= 0 ? v : '';
  const num = (v, lo, hi) => { v = Number(v); return isFinite(v) ? Math.max(lo, Math.min(hi, v)) : null; };
  const pl = {}, ids = [];
  for (const p of ALL) {
    const v = d.pl[p];
    if (!v) { if (STUDY.includes(p)) return null; continue; }          // 12 study packages required, 48 extras optional
    const x = num(v.x, 0, 100), y = num(v.y, 0, 100);
    if (x === null || y === null) return null;
    pl[p] = { x: x, y: y, t: num(v.t, 0, 7200000) || 0, moves: num(v.moves, 0, 1000) || 0, ord: num(v.ord, 0, 62) || 0, round: num(v.round, 1, 5) || 1 };
    ids.push(p);
  }
  return {
    createdAt: String(d.createdAt || '').slice(0, 30), market: d.market, gender: pick(d.gender, OK.gender), gen: pick(d.gen, OK.gen),
    designer: !!d.designer, lang: pick(d.lang, OK.lang), device: pick(d.device, OK.device), durationMs: num(d.durationMs, 0, 86400000) || 0,
    rounds: num(d.rounds, 1, 5) || 1, pick: ALL.indexOf(d.pick) >= 0 ? d.pick : '',
    comment: String(d.comment || '').slice(0, 500).replace(/^[=+\-@]/, "'$&"), pl: pl, ids: ids
  };
}
function quad_(x, y) { return x < 50 ? (y < 50 ? 'Undifferentiated' : 'Feminine') : (y < 50 ? 'Masculine' : 'Androgynous'); }
function sheet_(ss, name, head) {
  let sh = ss.getSheetByName(name);
  if (!sh) { sh = ss.insertSheet(name); sh.appendRow(head); sh.setFrozenRows(1); sh.getRange(1, 1, 1, head.length).setFontWeight('bold'); }
  return sh;
}
function json_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
