# Contributing to ParaPo

Thank you for wanting to help. ParaPo is a map of the jeepney routes of Metro
Manila: where the jeeps really go and where people really board. You do not
need to know Manila's jeepneys, or be good at React, to start. Small fixes are
welcome, and there is a list of easy ones below.

## Pick something to do

- **Easy first tasks:** open the issues with the
  [`good first issue`](https://github.com/ParaOrg/Para/labels/good%20first%20issue)
  label. Each one names the file, what is wrong and how to check your fix.
- **A route is wrong or missing?** Open a
  [route report](https://github.com/ParaOrg/Para/issues/new/choose) (see
  "Reporting a wrong or missing route" below). You do not need to write code.
- **Something else:** a bug or an idea has its own form in the same place. If
  you plan a big change, open an issue first so we can agree on it before you
  spend a weekend on it.

Comment on the issue to say you are taking it, so two people do not do the same
one.

## Run it on your computer

You need [Node.js](https://nodejs.org) 22.12 or newer and Git. First press
**Fork** on the repo's GitHub page, so you have a copy of your own to push to.

```bash
git clone https://github.com/<your-username>/Para.git
cd Para
git checkout staging
npm install
npm run dev
```

Open <http://localhost:5173>. That is the public map. Port 5173 is Vite's
default; if it is busy, Vite tells you the port it picked.

- The public map needs nothing else: no account, no key, no database.
- `/studio/` is the editor for the owner and a short list of editors. It needs
  a sign-in, so you can skip it.
- `/contribute/` is the page where people record a ride on their phone.
- `npm run storybook` shows the components one by one at
  <http://localhost:6006>. It is the easiest place to see a UI change.

## Make a change

1. Branch from `staging`, not `main`: `git checkout -b my-change staging`.
2. Keep the change small and about one thing.
3. Before you push, run:

   ```bash
   npm run check
   ```

   This is the same thing CI runs first. It checks formatting (Prettier),
   lint (ESLint), the generated architecture page, the TypeScript build with
   its guards, and the unit checks. It takes a few minutes. If formatting
   fails, `npm run format` fixes it for you.
4. Push your branch to your fork and open a pull request **into `staging`**. The pull
   request form has a checklist.

`main` is what the public sees. Only the owner merges into `main`. Finished
work waits on `staging` first, and `staging` has its own preview link.

## What CI runs on your pull request

CI is `.github/workflows/ci.yml`. For a pull request:

- **Build and unit checks:** formatting, lint, the architecture page, the
  build and `npm run test:unit`. This is `npm run check`, so if it passes on
  your computer it passes there.
- **Headless browser suites** (Playwright, in `tests/e2e/`): they open the
  app in a hidden browser and click through it. Only the suites your files can
  reach run. A change to docs alone runs none. You do not have to run them
  yourself; the README in `tests/e2e/` explains how if you want to.

A red check means something broke. Open the failing job's log; for a browser
suite, the screenshots are attached to the run.

## The standards, short version

The full rules are in [`.claude/CLAUDE.md`](.claude/CLAUDE.md). That file wins
over anything older in the code. The ones you will meet first:

- **TypeScript, strictly.** No `any`. No `!` or `as` to silence an error.
- **React function components,** one per file, with named exports (no
  `export default`).
- **File and folder names are kebab-case:** `route-card.tsx`, not
  `RouteCard.tsx`. The component is `RouteCard`.
- **Code lives with its feature:** `src/features/<feature>/`. Imports only go
  one way: `app` → `features` → `shared` → `design-system`. ESLint tells you if
  you cross a line.
- **Styling is Tailwind,** using the colour and spacing tokens, not new hex
  values or pixel sizes.
- **Data is checked with Zod** where it comes in, and fetched through
  TanStack Query, never straight from a component.
- **Every screen handles loading, error and empty,** works with a keyboard,
  and has labels.
- **Comments say why,** not what.
- **No `console.log`, no commented-out code.**
- **Old code is not a style guide.** Some files are older than these rules.
  Copy the rules, not the old file.
- **Do not invent a look.** The owner designs everything in Figma. If a task
  needs a new look, ask in the issue first.

## The words we use

[`CONTEXT.md`](CONTEXT.md) is the dictionary. Please use these words in code,
issues and comments:

| Word | Meaning |
| --- | --- |
| **Route** | Two ends that jeeps run between, both ways: `Tala – SM Fairview`. |
| **Direction** | One way of riding a route, such as `Tala → SM Fairview`. Not "variant". |
| **Line** | The drawn path of one direction along the roads. |
| **Hotspot** | One drawn box on the ground where something happens: a terminal or a hintuan. Not "stop". |
| **Terminal** | A hotspot where a route's jeeps are based and wait. |
| **Hintuan** | A hotspot where people wait and board along the way (Filipino for "stop"). |
| **Place** | All the hotspots that share one informal name, e.g. everything at "SM Fairview". |
| **Commuter** | Someone who uses the public map. Not "user" or "visitor". |
| **Contribution** | One ride recorded on the contributor page. |

The database uses other names (`stop`, `route_variant`). They are translated
to these words in the `api/` or `data/` folders, so components only see the
words above.

## Reporting a wrong or missing route

The routes are the heart of ParaPo, and local knowledge matters most here.

1. Open [a new issue](https://github.com/ParaOrg/Para/issues/new/choose) and
   pick **Wrong or missing route**.
2. Fill in the line name (what is written on the jeep's signboard), which
   direction, where on the map, and what is wrong.
3. A screenshot of the map, or a GPX file of the ride, helps a lot but is
   optional.

Please do not paste anything private, such as a phone number.

Routes are drawn by the owner and the editors in the studio, so a report is
checked before the map changes. The map is republished every night.

## Licences

What the repo says today:

- **The code is under the [MIT licence](LICENSE).**
- **The route and hotspot data** (`public/data/` and the database it comes
  from) **is under the Open Database License 1.0 (ODbL).** It follows
  OpenStreetMap's roads, which are also ODbL. The credit line the README asks
  for is "Route data © ParaPo contributors, ODbL".

See "Data and licence" in the [README](README.md#data-and-licence) for the
details. The repo has no separate contributor agreement, so please only send
work that is yours to give.

## Be kind

Be patient and kind with each other, especially with people on their first pull
request. If something here is confusing, that is a bug in these docs. Tell us,
or fix it.
