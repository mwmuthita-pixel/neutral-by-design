// Pulls the model constants (P, M, fit) out of an index.html so tests run against the shipped page.
const fs = require('fs');
module.exports = function extract(htmlPath) {
  const s = fs.readFileSync(htmlPath, 'utf8');
  const grab = (start, endRe) => { const i = s.indexOf(start); if (i < 0) throw new Error('not found: ' + start); const m = s.slice(i).match(endRe); return s.slice(i, i + m.index + m[0].length); };
  const P = grab('const P = [', /\n\];/), M = grab('const M = {', /\n};/), fit = grab('function fit(cf,ty){', /\n}\n/);
  return new Function(`${P}\n${M}\n${fit}\nreturn {P, M, fit};`)();
};
