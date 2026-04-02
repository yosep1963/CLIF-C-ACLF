# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

CLIF-C ACLF Score Calculator — a medical PWA for predicting prognosis in Acute-on-Chronic Liver Failure (ACLF) patients. Static vanilla JS app deployed on Netlify. Korean-language UI targeting clinicians.

## Deployment

- **Hosting**: Netlify, static site (no build step)
- **Deploy directory**: `dist/` (mirror of root assets — `index.html`, `css/`, `js/`, `icons/`, `manifest.json`, `service-worker.js`)
- **Config**: `netlify.toml` handles redirects, security headers, and caching
- When changing files, changes must be reflected in both root and `dist/` (or the deploy copy updated)

## Architecture

Single-page vanilla JS app with no build tooling, no package manager, no framework. Scripts load in dependency order via `<script>` tags in `index.html`:

1. **`js/config.js`** — All constants: input ranges, scoring thresholds, HE grade mappings, prognosis cutoffs, organ names. Central source of truth for medical scoring criteria.
2. **`js/utils.js`** — Pure utility functions: MAP calculation, FiO2 calculation, SpO2→PaO2 conversion, P/F ratio, scoring helpers, DOM helpers, toast messages.
3. **`js/validation.js`** — Input validation rules and error messages, references `Config.INPUT_RANGES`.
4. **`js/calculator.js`** — Core medical calculation logic: organ failure scores (6 organs, 1-3 points each), CLIF-C OF total, CLIF-C ACLF formula, ACLF grading, prognosis determination.
5. **`js/storage.js`** — localStorage-based calculation history (key: `clif_c_aclf_history`, max 10 entries).
6. **`js/clipboard.js`** — Result formatting and clipboard copy.
7. **`js/app.js`** — Main app: DOM binding, event listeners, form handling, result display, history UI. Wraps in IIFE; exposes `updatePFRatioDisplay` and `getSelectedOxygenType` globally for inline script in `index.html`.

Modules communicate through global objects (`Config`, `Utils`, `Validator`, `Calculator`, `Storage`, `Clipboard`) attached to `window`.

## Key Medical Formula

```
CLIF-C ACLF = 10 × [0.33 × CLIF-C_OF + 0.04 × Age + 0.63 × ln(WBC/1000) - 2]
```

- WBC input is in cells/uL (e.g., 15000), divided by 1000 internally
- CLIF-C OF Score: sum of 6 organ scores (range 6–18)
- Organ Failure (OF) = score 3 for ALL organs (EASL-CLIF criteria). Score 2 = Dysfunction, not failure.
- ACLF-1 special criteria: single kidney OF, or single non-kidney OF + kidney/cerebral dysfunction (score 2)
- Single non-kidney OF without kidney/cerebral dysfunction = No ACLF
- Prognosis: 5 score bands (<40, 40-49, 50-59, 60-69, ≥70) + grade-based mortality (CANONIC study)

## PWA

- `service-worker.js` uses Cache First strategy, cache name versioned as `clif-c-aclf-v{version}`
- `manifest.json` configured for standalone display, portrait orientation, Korean locale
- When updating cached assets, bump `CACHE_NAME` in `service-worker.js`

## Important Patterns

- Oxygen input supports both PaO2 (direct arterial) and SpO2 (pulse oximetry, converted via empirical formula). Toggle logic split between inline script in `index.html` (`selectOxygenType`) and `app.js` backup handler.
- RRT checkbox auto-sets kidney score to 3; vasopressors checkbox auto-sets circulation score to 3.
- `CLIF-C-ACLF-v1.2-deploy/` is a deployment snapshot — not the working copy.
