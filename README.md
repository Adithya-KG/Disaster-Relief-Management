# Disaster Relief & Resource Distribution Frontend

React + Vite operations dashboard for camp managers and dispatchers.

## Run

```bash
npm install
npm run dev
```

The local frontend runs at `http://127.0.0.1:5173` by default.

## Build For GitHub Pages

This project is configured with relative Vite asset paths, so it can be hosted from a GitHub Pages project URL such as:

```text
https://your-username.github.io/your-repo-name/
```

Build locally with:

```bash
npm run build
```

The generated static site is written to `dist/`.

For GitHub Pages, upload the source files to GitHub and let GitHub Actions build the app, or build locally and publish only the `dist/` folder from a `gh-pages` branch.

## Upload To GitHub

Upload these project files and folders:

- `.env.example`
- `.gitignore`
- `README.md`
- `index.html`
- `package.json`
- `package-lock.json`
- `vite.config.js`
- `src/`

Do not upload:

- `node_modules/`
- `dist/` unless you are manually publishing a built site branch
- `.env`
- `preview-login.png`

## GitHub Pages With Actions

Create `.github/workflows/pages.yml` with:

```yaml
name: Deploy Vite site to Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4
      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - name: Install dependencies
        run: npm ci
      - name: Build
        run: npm run build
      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: dist

  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    needs: build
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

Then in GitHub, go to `Settings > Pages` and set `Source` to `GitHub Actions`.

## Backend API Configuration

Create `.env` from `.env.example` and set:

```bash
VITE_API_URL=http://localhost:8080/api
```

When `VITE_API_URL` is not set, the UI uses clearly marked mock data in `src/data/mockData.js`. The frontend never connects directly to a database; all production data is expected to come through REST endpoints in `src/api/client.js`.

## Expected REST Endpoints

- `POST /auth/login`
- `GET /alerts/critical-camps`
- `GET /requests/pending-matches`
- `GET /camps`
- `GET /camps?campId=:campId`
- `PATCH /camps/:campId`
- `GET /inventory/hubs?category=:category&shelfLife=:shelfLife`
- `GET /camps/:campId/inventory`
- `POST /camps/:campId/inventory-logs`
- `GET /volunteers`
- `POST /camps/:campId/requests`
- `POST /dispatches`

`POST /dispatches` should return HTTP `409` when the selected volunteer is already assigned. The UI handles that conflict and asks the dispatcher to choose another available volunteer.

## Screens

- Login with role-based redirect
- Dashboard with dispatcher polling for critical alerts and pending request matches
- Camp manager dashboard restricted to the assigned camp
- Camps list and detail/edit
- Inventory by hub with category and shelf-life filters
- Camp inventory logging
- Volunteer roster with skills, vehicle access, zone, and availability
- Request creation and dispatcher truck dispatch workflow
