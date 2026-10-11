// Run: node --test tests/
const test = require('node:test'); const assert = require('node:assert/strict');
const S = require('../js/expert-stats.js'); const cfg = require('../config.json');
const close = (a, b, eps = 1e-3) => assert.ok(Math.abs(a - b) < eps, `${a} ≉ ${b}`);

test('deriveDesign: 4F/1N', () => {
  const d = S.deriveDesign(['F', 'F', 'F', 'F', 'N']);
  assert.deepEqual([d.n_F, d.n_N, d.n_M, d.majority_category], [4, 1, 0, 'F']);
  close(d.E, -0.8); close(d.A, 0.8); assert.equal(d.unanimous, false); assert.equal(d.split, false);
});
test('deriveDesign: tie 2F/2M/1N is split, E = 0', () => {
  const d = S.deriveDesign(['F', 'M', 'F', 'M', 'N']);
  assert.equal(d.majority_category, 'split'); close(d.E, 0); assert.equal(d.split, true);
});
test('deriveDesign: unanimous M', () => {
  const d = S.deriveDesign(['M', 'M', 'M', 'M', 'M']); assert.equal(d.unanimous, true); close(d.E, 1);
});
test('deriveDesign: 3/5 counts as split (A = 0.6)', () => {
  assert.equal(S.deriveDesign(['N', 'N', 'N', 'F', 'M']).split, true);
});

test('Fleiss kappa: Wikipedia worked example = 0.210', () => {
  const t = [[0,0,0,0,14],[0,2,6,4,2],[0,0,3,5,6],[0,3,9,2,0],[2,2,8,1,1],[7,7,0,0,0],[3,2,6,3,0],[2,5,3,2,2],[6,5,2,1,0],[0,2,2,3,7]];
  close(S.fleissKappa(t), 0.210, 1e-3);
});
test('Fleiss kappa: perfect agreement across categories = 1', () => {
  close(S.fleissKappa([[5,0,0],[0,5,0],[0,0,5]]), 1);
});
test('Fleiss kappa: all raters, all subjects, one category -> undefined (NaN)', () => {
  assert.ok(Number.isNaN(S.fleissKappa([[5,0,0],[5,0,0]])));
});
test('Fleiss kappa: maximal disagreement is negative', () => {
  // 3 raters per subject, each picks a different category: Pbar = 0, Pe = 1/3 -> -0.5
  close(S.fleissKappa([[1,1,1],[1,1,1]]), -0.5);
});

test('weighted kappa: all agree = 1', () => {
  close(S.weightedKappa([['F','F'],['N','N'],['M','M'],['F','F']]), 1);
});
test('weighted kappa: all disagree at opposite poles = -1', () => {
  close(S.weightedKappa([['F','M'],['M','F']]), -1);
});
test('weighted kappa: hand-checked 2x mixed example', () => {
  // O = F->F, F->N, M->M, N->N ; linear weights. Po = (1+0.5+1+1)/4 = .875
  // row = [2,1,1], col = [1,2,1]; Pe = sum w_ij r_i c_j / 16 = 9/16 = .5625 -> (0.875-0.5625)/(0.4375) = 0.7143
  close(S.weightedKappa([['F','F'],['F','N'],['M','M'],['N','N']]), 0.7143);
});
test('agreement and confusion', () => {
  const p = [['F','F'],['N','M'],['M','M']];
  close(S.agreement(p), 2/3); assert.deepEqual(S.confusion(p), [[1,0,0],[0,0,1],[0,0,1]]);
});

test('spearman: monotone = 1, reversed = -1, constant = NaN', () => {
  close(S.spearman([1,2,3,4],[10,20,30,40]), 1);
  close(S.spearman([1,2,3,4],[4,3,2,1]), -1);
  assert.ok(Number.isNaN(S.spearman([1,1,1],[1,2,3])));
});
test('spearman with ties (average ranks), hand-checked', () => {
  // ranks x=[1,2.5,2.5,4], y=[1,2,3,4] -> r = 0.9487
  close(S.spearman([1,2,2,3],[1,2,3,4]), 0.9487);
});
test('bootstrap is seeded and reproducible', () => {
  const x = [1,2,3,4,5,6,7,8], y = [2,1,4,3,6,5,8,7];
  const f = ix => S.spearman(ix.map(i => x[i]), ix.map(i => y[i]));
  const a = S.bootstrapCI(8, f, 1000, 7), b = S.bootstrapCI(8, f, 1000, 7);
  assert.deepEqual(a, b); assert.ok(a.lo <= S.spearman(x, y) && S.spearman(x, y) <= a.hi);
});

test('categoryFromF1 uses config thresholds', () => {
  const th = cfg.thresholds;
  assert.equal(S.categoryFromF1(3.49, th), 'F'); assert.equal(S.categoryFromF1(3.5, th), 'N');
  assert.equal(S.categoryFromF1(4.5, th), 'N'); assert.equal(S.categoryFromF1(4.51, th), 'M');
});

test('validation reports malformed rows instead of dropping silently', () => {
  const csv = cfg.expertColumns.join(',') + '\n' +
    'X1,,Brand,gendered,fragrance,,Light-matte,Sans-serif,F,F,N,N,F\n' +
    'X2,,Brand,gendered,fragrance,,Light-matte,Sans-serif,F,F,Q,,F\n' +
    'X3,,Brand,unknown,fragrance,,Purple,Sans-serif,F,F,F,F,F\n' +
    'X1,,Brand,gendered,fragrance,,Light-matte,Sans-serif,F,F,F,F,F\n';
  const { designs, report } = S.validateExpertRows(S.parseCSV(csv), cfg);
  assert.equal(designs.length, 1); assert.equal(report.rejected.length, 3);
  assert.match(report.rejected[0].reasons.join(), /rater3 = "Q"/);
  assert.match(report.rejected[0].reasons.join(), /rater4 = "\(empty\)"/);
  assert.match(report.rejected[1].reasons.join(), /brand_pool/);
  assert.match(report.rejected[2].reasons.join(), /duplicate/);
});

test('real expert file loads: 60 rows, 12 study packages, transcription issues reported', () => {
  const fs = require('fs'); const text = fs.readFileSync(__dirname + '/../data/expert_sort.csv', 'utf8');
  const { designs, report } = S.validateExpertRows(S.parseCSV(text), cfg);
  assert.equal(report.total, 60);
  assert.equal(designs.length + report.rejected.length, 60);
  assert.equal(designs.filter(d => d.study_id).length, 12);
  // D10 was placed in two piles by Milk; resolved by the researcher on 2026-10-08 as F.
  assert.equal(report.rejected.length, 0);
  assert.deepEqual(designs.find(d => d.design_id === 'D10').votes, ['F', 'F', 'F', 'N', 'F']);
  assert.equal(designs.filter(d => !d.study_id).length, 48);
  // Thesis: expert sort of the 12 stimuli = 5 feminine, 5 neutral, 2 masculine.
  const st = designs.filter(d => d.study_id);
  const c = { F: 0, N: 0, M: 0 }; st.forEach(d => c[d.majority_category]++);
  assert.deepEqual(c, { F: 5, N: 5, M: 2 });
});

test('baseline brand_pool rule is leave-one-out', () => {
  const items = [{brand_pool:'a',majority_category:'N'},{brand_pool:'a',majority_category:'N'},{brand_pool:'a',majority_category:'F'}];
  assert.deepEqual(S.baselineBrandPool(items), ['N','N','N']);
});
test('OLS recovers exact linear model; LODO on exact data gives ~0 error', () => {
  const rows = [[1,0],[1,1],[1,2],[1,3],[1,4]].map(x => ({ x, y: 2 + 3 * x[1] }));
  const b = S.ols(rows.map(r => r.x), rows.map(r => r.y)); close(b[0], 2); close(b[1], 3);
  const r = S.lodo(rows); close(r.mae, 0, 1e-5); close(r.rho, 1);
});

test('placeholder fixture (testing only): all 60 designs load, 12 consumer-rated + 48 expert-sorted only', () => {
  const fs = require('fs'); const text = fs.readFileSync(__dirname + '/fixtures/expert_sort_placeholder.csv', 'utf8');
  const { designs, report } = S.validateExpertRows(S.parseCSV(text), cfg);
  assert.equal(designs.length, 60); assert.equal(report.rejected.length, 0);
  assert.equal(designs.filter(d => d.study_id).length, 12); assert.equal(designs.filter(d => !d.study_id).length, 48);
});
