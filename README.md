# Neutral by Design — GNS Analyzer + expert card sort

Static site (GitHub Pages). No build step is needed to run it: open `index.html` through a web server
(GitHub Pages, or `python3 -m http.server` locally — `file://` cannot load the CSV).

```
index.html                     the site (Analyzer, Quadrant study, Validate tab, Expert data tab)
config.json                    thresholds, labels, file paths, bootstrap settings, feature flags
js/expert-stats.js             pure functions: CSV parsing, validation, kappa, weighted kappa, Spearman, bootstrap, OLS/LODO
data/expert_sort.csv           expert card sort (60 designs × 5 raters)
data/expert_images/D##.webp    thumbnails of the 48 expert-sorted-only designs
data/consumer_ratings_new.csv  optional, Phase 2 only (not shipped)
tests/                         unit tests + regression test + golden values
DATA_NOTES.md                  how the expert file was transcribed, and what to verify
```

## Expert data format — `data/expert_sort.csv`

| column | values |
|---|---|
| `design_id` | unique, e.g. `D01` |
| `image_file` | path to a thumbnail; may be empty for study packages (P1–P12 use the built-in images) |
| `brand` | free text |
| `brand_pool` | `neutral_positioned` \| `gendered` |
| `product_category` | `fragrance` \| `skincare` \| `personal_care` |
| `study_id` | `P1`–`P12` for the 12 consumer-rated packages, empty otherwise |
| `colour_finish_level` | exactly one of the UI labels: `Light-matte`, `Earth-textured`, `Chromatic-glossy`, `Dark-glossy / metallic` |
| `typography_class` | exactly one of: `Sans-serif`, `Serif`, `Script / ornamental` |
| `rater1` … `rater5` | `F`, `N` or `M` |

Rows with a missing or invalid value are **rejected and listed** in the Expert data tab (data-quality report); they are never dropped silently.

Derived per design: `n_F, n_N, n_M`; `majority_category` (ties → `split`); `E = (n_M − n_F)/5`; `A = max(n)/5`;
`unanimous = (A == 1)`; `split = (A ≤ 0.6)`. Set-level Fleiss’ kappa is shown in the data panel.

The expert sort is **not consumer data**. It is never merged into the fitted F1 / I-GNS values, which come only from the thesis QT1 models.

## How to run the validation

1. Put `expert_sort.csv` in `data/` and open the site.
2. GNS Analyzer → tab **Validate on 48 held-out designs** → **Save snapshot & run**.
   The snapshot (all predictions for the held-out designs, timestamp, SHA-256) is saved in the browser *before* any metric is computed,
   and is keyed to the hash of the data file. Download it with **Download snapshot**; export metrics and per-design rows with **Export results CSV**.
3. Reported per market (TH, TW): confusion matrix, agreement, linear-weighted Cohen’s kappa on F < N < M,
   Spearman ρ between fitted F1 and E with a seeded 1,000-resample bootstrap 95% CI over designs, the same metrics for
   observed vs extrapolated cells and unanimous / 4-of-5 / split designs, and a brand_pool-only baseline (leave-one-out majority within each pool).

Predicted category = fitted F1 against `config.json → thresholds` (Feminine < 3.5, Neutral 3.5–4.5, Masculine > 4.5).
Only the direction of the gender reading (F1) is tested — not I-GNS (midpoint proximity on two bipolar dimensions).

### Phase 2 (off by default)
Set `"ENABLE_EXPERT_CALIBRATION": true` and add `data/consumer_ratings_new.csv`
(`design_id, market, mean_F1, mean_IGNS, n`). The Validate tab then shows leave-one-design-out MAE and rank correlation for
(a) configuration-only and (b) configuration + E. Display only: the site never switches models.

## Quadrant study (v2: 60 packages)

Participants place packages on Grohmann's two axes in **5 rounds of 12**: round 1 = the 12 study packages (P1–P12, same as v1),
rounds 2–5 = the 48 designs from the expert pool (random split and order per participant; packages from earlier rounds stay visible but faint).
Progress is saved in the browser and can be resumed; after round 1 a participant may stop and submit the completed rounds (`rounds_completed`).
The 12 study packages are always required. Records are stored with `v: 2`; v1 records (12 packages) remain valid and are included in the 12-package results.

Backend: replace the Apps Script code with `apps-script.gs` and deploy a **new version** (Deploy → Manage deployments → Edit → New version).
New answers go to `Responses_v2` / `Placements_v2` (with `item_set` and `round` columns); the v1 tabs are left untouched and still read.
`data/package_key.csv` maps `package` ids to names.

## Tests

```
node --test tests/expert-stats.test.js tests/regression.test.js
```
`regression.test.js` checks that the fitted F1 and I-GNS of P1–P12 in both markets equal `tests/golden_fitted.json`
(frozen from the site before this change). Set `PAGE=/path/to/index.html` to test another build.
