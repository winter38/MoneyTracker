# MoneyTracker

A personal finance tracker: accounts, a two-level category tree (group → subcategory),
transactions, recurring rules, budgets and reports. Data lives **only in the browser**
(localStorage) — no server, no accounts, no sign-up. Moving between devices is done with
JSON export/import.

## Stack

- Vite + Vue 3 (`<script setup>`, Composition API) + TypeScript (strict)
- Pinia — each store persists its own slice to localStorage
- Vue Router (hash mode, so `dist` runs from any host without rewrite rules)
- Element Plus for UI (auto-imported per component by `unplugin-vue-components`, so only what the
  templates use ends up in the bundle), ApexCharts for charts
- ESLint (flat config) + Prettier

## Getting started

```bash
npm install
npm run dev          # http://localhost:5173
npm run dev:host     # same, but reachable from a phone on the same Wi-Fi
npm run build        # type-check + build into dist/
npm run preview      # serve the built dist/ locally
npm run lint
```

To use it from a phone: run `npm run dev:host` and open `http://<computer-ip>:5173`
(find the IP with `ipconfig`). Chrome on Android can add the page to the home screen,
where it opens like an app.

## Project structure

```
src/
  types/models.ts        domain types (Account, CategoryGroup, Subcategory, Transaction, RecurringRule, Budget)
  utils/
    storage.ts           the only place that talks to localStorage
    money.ts             rounding to cents, currency formatting, input parsing
    date.ts              ISO dates, billing periods, recurrence stepping
    color.ts             iconTint() — the shared look for category and account icons
    backup.ts            JSON export/import and CSV export
  stores/                Pinia: accounts, categories, transactions, recurring, budgets, period, settings
  data/                  seed.ts (starter accounts and categories), recurrence.ts (recurrence presets),
                         icons.ts (the icon set offered for accounts and categories)
  composables/           useBreakpoint (desktop vs mobile layout)
  components/
    common/              AppIcon (draws an icon by id), IconPicker (searchable icon grid), StatTile
    layout/              AppHeader (balance + period), AppNav (tabs), PageHeader (sub-pages)
    transactions/        QuickAddSheet, NumPad, PickerSheet, CategoryGrid, DateSheet, TransactionList
    manage/              accounts, categories and recurring-rule panels
    budget/              budget row with plan and progress bar
  views/                 Accounts, Categories, Transactions, Budget, Overview, Manage, Settings
```

The sections mirror any finance tracker: **Accounts · Categories · Transactions · Budget · Overview**
in the bottom navigation (a sidebar on desktop); "Manage" and "Settings" sit behind the
header buttons.

## How it works

**Storage.** Every store writes its own key (`finance-tracker:transactions` and so on)
through `utils/storage.ts`. The localStorage limit is about 5 MB per site — tens of
thousands of transactions. If that ever becomes tight, or cross-device sync is needed,
only `utils/storage.ts` and its call sites change; the rest of the app talks to stores.

**Categories.** Two levels: `CategoryGroup` (with icon and colour) and `Subcategory`.
The `kind` field keeps the expense and income trees independent.

**Quick add** (`components/transactions/QuickAddSheet.vue`) follows the quick-add screen of any finance tracker:
a two-colour header ("From account / To category") where tapping a half opens a picker
(`PickerSheet.vue` — account list or category grid), a subcategory pill underneath, a
large amount, a note field and a custom numeric keypad.

The keypad is custom rather than the system one (`NumPad.vue`): it never covers the top
of the form, includes a calculator (`12 × 3` → 36) and a date button. Tapping a group
that has subcategories expands it while already marking the group as selected — that is
why the `select` event carries a `final` flag separating "drill in" from a final choice.
Amounts spent this month are shown under each category icon.

**Date and recurrence** (`DateSheet.vue`) — the calendar key opens a sheet with
"Yesterday / Today / Pick a day" and a list of recurrence presets (`data/recurrence.ts`:
weekdays, weekends, every two weeks and so on). Choosing a recurrence creates a rule in
`stores/recurring.ts` when the transaction is saved: the transaction itself counts as the
first occurrence, so `nextDate` is moved one period ahead immediately. The same preset
list is used in "Manage", so recurrence is described identically everywhere.

**Category ring** (`views/CategoriesView.vue`) — a donut of expenses in the middle with
category tiles around it; tapping a category opens the quick-add sheet for it.

**Budget** (`stores/budgets.ts`) — a monthly plan per category group, the same for every
month. Actuals come from the period's transactions; the bar turns yellow past 85 % of the
plan and red on overspend.

**Period** lives in a store (`stores/period.ts`) rather than a composable: the month is
picked once in the header and stays put while switching tabs.

**Balances** are never stored, always derived: the account's initial balance plus the
movement of all its transactions (`transactions.deltaForAccount`). That way the list and
the balance can never drift apart.

**Recurring transactions.** `recurring.materializeDue()` runs once at startup (`main.ts`)
and creates every occurrence that is already due — if the app has not been opened for a
week, they all appear at once.

**Custom month.** Settings has a "month start day": set it to 25 and reports run from one
payday to the next instead of following the calendar.

## UI conventions

- Anything you tap is at least 44px (`--ft-tap`). On narrow screens Element Plus switches
  to its `large` size (see `main.ts`) and controls get a minimum height in
  `assets/styles/main.css`.
- Main sections live in the bottom navigation; "Manage" and "Settings" are sub-pages with
  `PageHeader` and a back button, and they hide the floating "+" button.
- Category names wrap to two lines instead of being truncated — "Cafes and restaurants"
  has to be readable in full.
- Category and account icons are always rendered through `utils/color.ts` → `iconTint()`:
  a muted fill in the entity's colour plus a thin ring. A solid fill read very differently
  in light and dark themes, so no local variations.
- Button glyphs are Element Plus SVG icons together with the `.ft-icon-btn` class (flex
  centring). Text glyphs like "+" and "✕" are centred by font metrics rather than by the
  button and visibly jump around, so they are avoided.
- Amounts in tight spots (category tiles, the centre of the ring) are shortened to
  "2.2M €" and clipped to the cell width, otherwise neighbouring labels collide.
- The month in the header scrolls both ways, future months included — that is where plans
  and upcoming recurring transactions show up. Tapping the month name returns to today.

## Tests

`smoke.mjs` drives a real browser: it adds a transaction, walks every section and checks
that the data survived a reload and that the console stayed clean.

```bash
npm install -D playwright && npx playwright install chromium
npm run build && npx vite preview --port 4173 &
node smoke.mjs
```

`audit.mjs` visits every screen at three widths (390, 410, 1280) looking for horizontal
overflow, tap targets under 40px and console errors, and drops screenshots named
`a-<width>-<screen>.png` for eyeballing:

```bash
node audit.mjs
```

## Deployment

`npm run build` produces static files in `dist/` that can go to GitHub Pages, Netlify,
Cloudflare Pages or any other static host. Thanks to `base: "./"` and hash routing no
extra configuration is needed.

**GitHub Pages.** `.github/workflows/deploy.yml` is already in the repository: on a push
to `main` it installs dependencies, builds the project and publishes `dist`. Enable it
once on GitHub: Settings → Pages → Build and deployment → Source → **GitHub Actions**.
The site then lives at `https://<user>.github.io/<repository>/`.

**A note about data.** localStorage is bound to the site address, so records from
`localhost:5173` do not follow you to the published URL. Before moving, use
Settings → "Download backup (JSON)", and afterwards "Restore from file". The same applies
when switching hosts or attaching a custom domain.

## Icons

Accounts and categories are drawn from a set of ~180 SVG icons in `data/icons.ts`, taken
from [Material Design Icons](https://pictogrammers.com/library/mdi/) (Apache 2.0) through
the `@mdi/js` package - it ships paths only, so the bundle carries just the icons listed
in that file. `AppIcon` paints them with `currentColor` and sizes them in `em`, which is
what lets `iconTint()` recolor an icon to match its category.

The stored `icon` field holds an id such as `"cart"`. Records written by earlier versions
hold an emoji instead; `AppIcon` renders any unknown value as text, so those keep showing
up until the entity is edited.

## Ideas for next versions

- A password and client-side encryption (Web Crypto: PBKDF2 + AES-GCM) over the current storage
- Cross-device sync through Supabase (Postgres + auth)
- Moving storage to IndexedDB if the data ever grows large (receipt photos, for example)
