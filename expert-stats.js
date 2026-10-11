/* expert-stats.js — pure functions for the expert card sort (no DOM, no globals).
   Used by index.html (browser) and tests/*.test.js (Node). */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.ExpertStats = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const CATS = ['F', 'N', 'M'];               // ordered: feminine < neutral < masculine
  const RANK = { F: 0, N: 1, M: 2 };

  /* ---------- CSV ---------- */
  function parseCSV(text) {
    const rows = []; let row = [], cell = '', q = false;
    text = String(text).replace(/^\uFEFF/, '');
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (q) {
        if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; }
        else cell += c;
      } else if (c === '"') q = true;
      else if (c === ',') { row.push(cell); cell = ''; }
      else if (c === '\n' || c === '\r') {
        if (c === '\r' && text[i + 1] === '\n') i++;
        row.push(cell); rows.push(row); row = []; cell = '';
      } else cell += c;
    }
    if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
    return rows.filter(r => r.some(v => v.trim() !== ''));
  }

  /* ---------- Per-design derivation ---------- */
  function deriveDesign(votes) {
    const n = { F: 0, N: 0, M: 0 };
    votes.forEach(v => n[v]++);
    const k = votes.length, mx = Math.max(n.F, n.N, n.M);
    const top = CATS.filter(c => n[c] === mx);
    const A = mx / k;
    return {
      n_F: n.F, n_N: n.N, n_M: n.M,
      majority_category: top.length === 1 ? top[0] : 'split',
      E: (n.M - n.F) / k,
      A,
      unanimous: A === 1,
      split: A <= 0.6 + 1e-9
    };
  }

  /* ---------- Validation of the expert file ---------- */
  function validateExpertRows(rows, cfg) {
    const head = (rows[0] || []).map(h => h.trim());
    const need = cfg.expertColumns;
    const missingCols = need.filter(c => !head.includes(c));
    const report = { missingColumns: missingCols, rejected: [], warnings: [], total: Math.max(0, rows.length - 1) };
    if (missingCols.length) return { designs: [], report };
    const ix = Object.fromEntries(need.map(c => [c, head.indexOf(c)]));
    const cf = cfg.labels.colourFinish, ty = cfg.labels.typography;
    const seen = new Set(), studySeen = new Set(), designs = [];
    rows.slice(1).forEach((r, li) => {
      const line = li + 2, get = c => (r[ix[c]] ?? '').trim(), reasons = [];
      const id = get('design_id');
      if (!id) reasons.push('missing design_id');
      else if (seen.has(id)) reasons.push('duplicate design_id');
      const votes = ['rater1', 'rater2', 'rater3', 'rater4', 'rater5'].map(get);
      votes.forEach((v, i) => { if (!CATS.includes(v)) reasons.push(`rater${i + 1} = "${v || '(empty)'}" (must be F, N or M)`); });
      const pool = get('brand_pool');
      if (!cfg.brandPools.includes(pool)) reasons.push(`brand_pool "${pool || '(empty)'}" not one of ${cfg.brandPools.join(' | ')}`);
      const cat = get('product_category');
      if (!cfg.productCategories.includes(cat)) reasons.push(`product_category "${cat || '(empty)'}" not one of ${cfg.productCategories.join(' | ')}`);
      const cfl = get('colour_finish_level'), tyl = get('typography_class');
      const cfKey = Object.keys(cf).find(k => cf[k] === cfl), tyKey = Object.keys(ty).find(k => ty[k] === tyl);
      if (!cfKey) reasons.push(`colour_finish_level "${cfl || '(empty)'}" not a UI label`);
      if (!tyKey) reasons.push(`typography_class "${tyl || '(empty)'}" not a UI label`);
      const sid = get('study_id');
      if (sid && !/^P([1-9]|1[0-2])$/.test(sid)) reasons.push(`study_id "${sid}" must be P1–P12 or empty`);
      if (sid && studySeen.has(sid)) reasons.push(`study_id ${sid} used twice`);
      if (reasons.length) { report.rejected.push({ line, design_id: id || '(none)', reasons }); if (id) seen.add(id); return; }
      seen.add(id); if (sid) studySeen.add(sid);
      designs.push(Object.assign({
        design_id: id, image_file: get('image_file'), brand: get('brand'), brand_pool: pool,
        product_category: cat, study_id: sid || null, cf: cfKey, ty: tyKey, votes
      }, deriveDesign(votes)));
    });
    const nStudy = designs.filter(d => d.study_id).length;
    if (nStudy !== 12) report.warnings.push(`${nStudy} of 12 study packages found in the file.`);
    return { designs, report };
  }

  /* ---------- Agreement statistics ---------- */
  // counts: array of [nF, nN, nM] per subject, same number of raters per subject.
  function fleissKappa(counts) {
    const N = counts.length; if (!N) return NaN;
    const n = counts[0].reduce((a, b) => a + b, 0);
    if (n < 2 || counts.some(r => r.reduce((a, b) => a + b, 0) !== n)) return NaN;
    const k = counts[0].length;
    const p = Array.from({ length: k }, (_, j) => counts.reduce((s, r) => s + r[j], 0) / (N * n));
    const Pi = counts.map(r => (r.reduce((s, x) => s + x * x, 0) - n) / (n * (n - 1)));
    const Pbar = Pi.reduce((a, b) => a + b, 0) / N, Pe = p.reduce((s, x) => s + x * x, 0);
    if (Math.abs(1 - Pe) < 1e-12) return NaN;     // only one category used: kappa undefined
    return (Pbar - Pe) / (1 - Pe);
  }

  // pairs: [[a, b], ...] with values in CATS. Linear weights on the ordered scale F < N < M.
  function weightedKappa(pairs, weights = 'linear') {
    const k = 3, N = pairs.length; if (!N) return NaN;
    const O = Array.from({ length: k }, () => Array(k).fill(0));
    pairs.forEach(([a, b]) => { O[RANK[a]][RANK[b]]++; });
    const w = (i, j) => weights === 'quadratic' ? 1 - ((i - j) ** 2) / ((k - 1) ** 2) : 1 - Math.abs(i - j) / (k - 1);
    const row = O.map(r => r.reduce((a, b) => a + b, 0)), col = [0, 1, 2].map(j => O.reduce((s, r) => s + r[j], 0));
    let po = 0, pe = 0;
    for (let i = 0; i < k; i++) for (let j = 0; j < k; j++) { po += w(i, j) * O[i][j] / N; pe += w(i, j) * row[i] * col[j] / (N * N); }
    if (Math.abs(1 - pe) < 1e-12) return NaN;
    return (po - pe) / (1 - pe);
  }

  function confusion(pairs) {          // rows = expert, cols = predicted
    const m = Array.from({ length: 3 }, () => Array(3).fill(0));
    pairs.forEach(([a, b]) => m[RANK[a]][RANK[b]]++);
    return m;
  }
  function agreement(pairs) { return pairs.length ? pairs.filter(([a, b]) => a === b).length / pairs.length : NaN; }

  function ranks(x) {                   // average ranks for ties
    const idx = x.map((v, i) => [v, i]).sort((a, b) => a[0] - b[0]);
    const r = Array(x.length);
    for (let i = 0; i < idx.length;) {
      let j = i; while (j + 1 < idx.length && idx[j + 1][0] === idx[i][0]) j++;
      const avg = (i + j) / 2 + 1; for (let t = i; t <= j; t++) r[idx[t][1]] = avg; i = j + 1;
    }
    return r;
  }
  function pearson(x, y) {
    const n = x.length; if (n < 2) return NaN;
    const mx = x.reduce((a, b) => a + b, 0) / n, my = y.reduce((a, b) => a + b, 0) / n;
    let sxy = 0, sxx = 0, syy = 0;
    for (let i = 0; i < n; i++) { sxy += (x[i] - mx) * (y[i] - my); sxx += (x[i] - mx) ** 2; syy += (y[i] - my) ** 2; }
    return sxx && syy ? sxy / Math.sqrt(sxx * syy) : NaN;
  }
  function spearman(x, y) { return pearson(ranks(x), ranks(y)); }

  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  // Percentile bootstrap over items. statFn(indexArray) -> number. NaN resamples are dropped and counted.
  function bootstrapCI(n, statFn, B = 1000, seed = 20260101, level = 0.95) {
    const rnd = mulberry32(seed), out = []; let dropped = 0;
    for (let b = 0; b < B; b++) {
      const ix = Array.from({ length: n }, () => Math.floor(rnd() * n));
      const v = statFn(ix); if (Number.isFinite(v)) out.push(v); else dropped++;
    }
    out.sort((a, b) => a - b);
    if (!out.length) return { lo: NaN, hi: NaN, B, dropped };
    const q = p => out[Math.min(out.length - 1, Math.max(0, Math.round(p * (out.length - 1))))];
    return { lo: q((1 - level) / 2), hi: q(1 - (1 - level) / 2), B, dropped };
  }

  function categoryFromF1(f1, th) { return f1 < th.feminineBelow ? 'F' : f1 > th.masculineAbove ? 'M' : 'N'; }

  // Baseline: predict expert majority from brand_pool alone (leave-one-out majority within the pool, ties -> 'N').
  function baselineBrandPool(items) {
    return items.map((d, i) => {
      const others = items.filter((o, j) => j !== i && o.brand_pool === d.brand_pool);
      const c = { F: 0, N: 0, M: 0 }; others.forEach(o => c[o.majority_category]++);
      const mx = Math.max(c.F, c.N, c.M); const top = CATS.filter(k => c[k] === mx);
      return top.length === 1 ? top[0] : 'N';
    });
  }

  /* ---------- Least squares (Phase 2) ---------- */
  function ols(X, y, ridge = 1e-8) {
    const p = X[0].length, A = Array.from({ length: p }, () => Array(p + 1).fill(0));
    X.forEach((r, i) => { for (let a = 0; a < p; a++) { for (let b = 0; b < p; b++) A[a][b] += r[a] * r[b]; A[a][p] += r[a] * y[i]; } });
    for (let a = 0; a < p; a++) A[a][a] += ridge;
    for (let c = 0; c < p; c++) {
      let piv = c; for (let r = c + 1; r < p; r++) if (Math.abs(A[r][c]) > Math.abs(A[piv][c])) piv = r;
      [A[c], A[piv]] = [A[piv], A[c]];
      for (let r = 0; r < p; r++) if (r !== c) { const f = A[r][c] / A[c][c]; for (let k = c; k <= p; k++) A[r][k] -= f * A[c][k]; }
    }
    return A.map((r, i) => r[p] / r[i]);
  }
  // Leave-one-design-out error. rows: [{x:[...], y}] -> {mae, rho, preds}
  function lodo(rows) {
    const preds = rows.map((r, i) => {
      const tr = rows.filter((_, j) => j !== i), b = ols(tr.map(t => t.x), tr.map(t => t.y));
      return r.x.reduce((s, v, k) => s + v * b[k], 0);
    });
    const mae = rows.reduce((s, r, i) => s + Math.abs(r.y - preds[i]), 0) / rows.length;
    return { mae, rho: spearman(preds, rows.map(r => r.y)), preds };
  }

  return { CATS, RANK, parseCSV, deriveDesign, validateExpertRows, fleissKappa, weightedKappa, confusion, agreement,
    ranks, pearson, spearman, mulberry32, bootstrapCI, categoryFromF1, baselineBrandPool, ols, lodo };
});
