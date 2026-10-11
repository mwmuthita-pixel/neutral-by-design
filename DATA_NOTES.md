# How `data/expert_sort.csv` was produced — please verify

**Source:** 15 screenshots of the expert card sort (one Feminine / Neutral / Masculine board per designer).
Transcribed by hand from the images by Claude (AI assistant) on 7 Oct 2026. Rater order: `rater1` = Gus, `rater2` = Jane, `rater3` = Milk, `rater4` = MU, `rater5` = pond.

**Cross-checks that passed**
- Pile sizes match the boards: Gus 14 F / 31 N / 15 M; Jane 14 / 28 / 18 (+5 extra images, below); Milk 11 / 46 / 4 (Milk wrote “46” on the neutral board; includes one duplicate, below); MU 16 / 35 / 9; pond 24 / 17 / 19.
- The 12 study packages come out 5 feminine (P1, P4, P6, P7, P9), 5 neutral (P3, P5, P8, P10, P11), 2 masculine (P2, P12), as in thesis §3 (all 12 are unanimous).

**Problems found (reported in the app, not hidden)**
1. **D10 Kiehl's Midnight Recovery (holiday box)** appeared on *both* Milk's Feminine and Neutral boards. **Resolved by the researcher on 8 Oct 2026: Feminine** (`rater3 = F`). D10 is now 4 F / 1 N.
2. **Jane’s boards contained 5 images that are not in the 60-design pool**: Narciso Rodriguez *for her* pink box (F), Viktor & Rolf Flowerbomb pink box with black seal (F), Chanel white box with gold/navy pattern (F), and two carton-shaped bottles, beige and dark brown (N). **Confirmed by the researcher on 8 Oct 2026 as not part of the pool — excluded.** The pool is 60 designs.

**Provisional fields — coded by Claude from the screenshots, not by the researcher**
- `colour_finish_level` and `typography_class` for the 48 non-study designs (study packages use the thesis coding). Several designs do not fit the four composite levels and were coded to the nearest colour level: matte chromatic (D02, D09, D26, D35, D43 → Chromatic-glossy) and dark matte (D33 → Dark-glossy / metallic). These cells have no consumer evidence for that finish.
- `brand`, `brand_pool`, `product_category`. Unidentified brands: D19 (slim white carton), D29 (silver cartons), D38 (brown striped carton) — assumed `neutral_positioned`. Uncertain pools: D25 Gucci green box (assumed gendered), D43 Hermès (assumed neutral_positioned), D14 Chanel white box (assumed gendered).
- Thumbnails in `data/expert_images/` are crops from the screenshots (low resolution).

Changing any of these fields changes the predictions and the baseline; re-run the snapshot after editing.
