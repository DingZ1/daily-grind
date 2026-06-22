# Repository Guidelines

## Project Structure & Module Organization

This is a Vite + Vue 3 single-page app for tracking workdays, overtime, holidays, records, and quarter summaries.

- `src/main.js` bootstraps Vue, Pinia, routing, and global styles.
- `src/pages/` contains route-level views such as `HomePage.vue`.
- `src/components/` contains reusable UI pieces such as calendars, tables, charts, and editor drawers.
- `src/stores/` contains Pinia state, with overtime logic in `stores/overtime.js`.
- `src/composables/`, `src/services/`, `src/utils/`, and `src/constants/` hold shared logic.
- `src/assets/styles/` contains global CSS; `src/data/holidays/` contains holiday data.
- `.github/workflows/deploy-pages.yml` builds and deploys `dist/` to GitHub Pages from `main`.

## Build, Test, and Development Commands

Use Node 20, matching the GitHub Pages workflow.

- `npm ci` installs dependencies from `package-lock.json`.
- `npm run dev` starts the Vite development server.
- `npm run build` creates the production build in `dist/`.
- `npm run preview` serves the production build locally for verification.

No test or lint scripts are defined yet; add them to `package.json` before relying on `npm test` or `npm run lint`.

## Coding Style & Naming Conventions

Use Vue single-file components with `<script setup>` where practical. Follow the existing style: 2-space indentation, single quotes, no semicolons, and trailing commas in multiline objects or arrays. Name Vue components in PascalCase, composables as `useThing.js`, and stores/services/utils with descriptive camelCase filenames.

Prefer moving shared calculations into `utils/`, app state into Pinia stores, browser persistence into `services/`, and view-only concerns into components or composables.

## Testing Guidelines

There is no test framework configured yet. For new tests, prefer Vitest with Vue Test Utils, colocating tests as `*.test.js` or under a future `src/__tests__/` directory. Prioritize overtime calculations, holiday handling, storage import/export, and calendar edge cases. Until automated tests exist, run `npm run build` before opening a PR.

## Commit & Pull Request Guidelines

The local Git metadata does not show a project-specific commit convention beyond the initial clone. Use short, imperative commit subjects such as `Add holiday import validation` or `Fix quarter summary totals`.

Pull requests should include a brief summary, testing notes such as `npm run build`, linked issues when available, and screenshots for UI changes. Mention storage changes so reviewers can verify existing records still load correctly.

## Security & Configuration Tips

Do not commit local secrets, private exports, or generated `dist/` output. Keep deploy behavior in `.github/workflows/deploy-pages.yml` aligned with `vite.config.js`, especially the relative `base: './'` setting used for GitHub Pages.
