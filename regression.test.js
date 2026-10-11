// Acceptance 1: fitted values for the 12 study packages x 2 markets are identical before and after the change.
const test = require('node:test'); const assert = require('node:assert/strict');
const extract = require('./extract-model.js'); const golden = require('./golden_fitted.json');
const page = process.env.PAGE || __dirname + '/../index.html';
test('fitted F1 and I-GNS unchanged for P1–P12 in TH and TW (' + page.split('/').pop() + ')', () => {
  const { P, fit } = extract(page);
  assert.equal(P.length, 12);
  P.forEach(p => {
    const g = golden.values[p.id], f = fit(p.cf, p.ty);
    assert.equal(p.cf, g.cf); assert.equal(p.ty, g.ty);
    assert.equal(f.f1[0], g.f1_TH, p.id + ' F1 TH'); assert.equal(f.f1[1], g.f1_TW, p.id + ' F1 TW');
    assert.equal(f.ig[0], g.igns_TH, p.id + ' I-GNS TH'); assert.equal(f.ig[1], g.igns_TW, p.id + ' I-GNS TW');
  });
});
