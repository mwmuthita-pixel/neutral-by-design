# Report — expert card sort added to the GNS Analyzer

## Files changed / added
| file | change |
|---|---|
| `index.html` | Analyzer tabs (Analyzer · Validate on 48 held-out designs · Expert data); 60-design reference set with Consumer-rated / Expert-sorted only badges; pool picker (48 designs); expert panel + flags in results; validation tab with snapshot, export and Phase 2 (flag-gated); source comment on the Quadrant-study hint. Model constants and `fit()` untouched. |
| `js/expert-stats.js` | new — pure functions (CSV, validation, derived fields, Fleiss κ, weighted κ, Spearman, seeded bootstrap, brand-pool baseline, OLS, leave-one-design-out) |
| `config.json` | new — thresholds, labels, paths, bootstrap seed/resamples, `ENABLE_EXPERT_CALIBRATION=false` |
| `data/expert_sort.csv`, `data/expert_images/` | new — transcribed from the 15 board screenshots (see DATA_NOTES.md) |
| `tests/*` | new — 21 unit tests, 1 regression test, golden values, placeholder fixture |
| `README.md`, `DATA_NOTES.md`, `REPORT.md` | new |

## Tests run
- `node --test tests/expert-stats.test.js tests/regression.test.js` → **22 / 22 pass** (Node 22). Fixtures include the Wikipedia Fleiss example (κ = 0.210), all-agree (κ = 1, wκ = 1), all-disagree (wκ = −1; Fleiss −0.5), single-category (κ undefined), tied Spearman, seeded bootstrap reproducibility, malformed rows, the real file and a 60-row placeholder fixture.
- Regression: fitted F1 and I-GNS for P1–P12 × TH/TW identical to the pre-change site, checked on both builds (GitHub Pages and Claude artifact).
- Browser (headless Chromium, desktop + mobile): data loads, badges, pool selection, upload, Validate tab, Expert data tab, missing-file empty state, malformed-row report, Phase 2 with a test-only consumer file. No page errors.

## Exploratory result (48 held-out designs; updated 8 Oct 2026 after D10 was resolved)
| | Thailand model | Taiwan model |
|---|---|---|
| agreement with expert majority (45 non-tied) | 56% | 31% |
| weighted κ | 0.17 | 0.17 |
| Spearman ρ, fitted F1 vs E [95% CI] | 0.22 [−0.11, 0.51] | 0.28 [−0.05, 0.56] |
| brand-pool baseline | 58% — not exceeded | 58% — not exceeded |

Expert agreement: Fleiss κ = 0.39 on all 60 designs, 0.21 on the 48 held-out ones. Majority: 14 F · 31 N · 12 M · 3 ties.
Direction is weakly shared (ρ ≈ 0.2–0.3; both CIs include 0), and category agreement is low. The Taiwan model places Light-matte + sans designs at F1 ≈ 3.1 (feminine side of 3.5) while experts call most of them neutral (17 of 26 expert-neutral designs → predicted F). This reflects the thesis finding that Taiwanese respondents read clinical-light packages as leaning feminine; it is not evidence that either reading is wrong. Experts are not consumers.
The newly resolved D10 (dark, ornamental script; observed cell via P2) is predicted Masculine in both markets against a 4/5 Feminine expert majority — a strong disagreement.

## Assumptions
- Rater order Gus, Jane, Milk, MU, pond. Pool = the 60 designs common to four boards.
- Coding (`colour_finish_level`, `typography_class`), `brand_pool` and `product_category` for the 48 designs were assigned by the assistant from screenshots (provisional).
- Agreement / κ exclude tied majorities (3 designs); Spearman uses all designs. `split` = A ≤ 0.6 as specified, so a 3-2 design is "split" but still has a majority.
- Baseline = leave-one-out majority category within each brand_pool (no fixed rule was specified).
- Bootstrap: percentile CI, 1,000 resamples, seed 20260101; resamples where ρ is undefined are dropped.
- Snapshot stored in browser localStorage, keyed to the SHA-256 of the data file; a new file means a new snapshot.

## Deviations from the brief — please confirm
- Quadrant-study hint: its source **is** known (live placements from this site's own Quadrant study, via the Google Sheet / artifact db; self-selected; not thesis data). The code comment states that instead of "undocumented". Output unchanged.
- Tab label "Validate on 48 held-out designs" kept as specified, although the wording rules avoid "validated". Pre-existing text still contains "not validated" disclaimers (Boundaries tile, report footer); left unchanged.

## Open questions
1. ~~D10 pile~~ — resolved: Feminine. ~~Jane's 5 extra images~~ — resolved: not in the pool.
2. Please verify the provisional coding and brand_pool of the 48 designs (DATA_NOTES.md).
3. Should matte chromatic / dark matte designs be excluded from the observed-cell group, since no study package had that finish?
4. Is a brand-pool baseline the right comparison, or should the baseline be "always Neutral" (the expert majority class)?
