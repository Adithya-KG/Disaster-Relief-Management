# Disaster Relief & Resource Distribution Frontend

React + Vite frontend for a dark, dense operations dashboard. The app never
connects directly to a database; all live data is loaded through REST endpoints
configured with `VITE_API_URL`.

## Run

```bash
npm install
npm run dev
```

Copy `.env.example` to `.env` and set:

```bash
VITE_API_URL=http://localhost:8080/api
```

When `VITE_API_URL` is not set, the UI uses local mock data so the screens can
be reviewed before the backend is connected. TODO comments in
`src/api/client.js` mark endpoints that should be wired to real backend
implementations.

## GitHub Pages Deployment

The repository includes `.github/workflows/pages.yml`, which builds Vite and
uploads `dist` to GitHub Pages.

In GitHub, open **Settings > Pages** and set **Source** to **GitHub Actions**.
If Source is set to **Deploy from a branch**, Pages will serve the raw
`index.html` file from `main`, which produces a blank page because Vite source
files are not built.

## Roles

- Dispatcher: system-wide dashboard, critical camps, pending request matches,
  hub inventory, volunteers, and truck dispatch.
- Camp Manager: assigned camp dashboard, camp detail updates, camp inventory
  logging, and urgent supply request creation.

## REST Contract Expected By The Frontend

- `POST /auth/login`
- `GET /alerts/critical-camps`
- `GET /requests/pending-matches`
- `GET /camps`
- `GET /camps?campId={campId}`
- `PATCH /camps/{campId}`
- `GET /inventory/hubs?category={category}&shelfLife={shelfLife}`
- `GET /camps/{campId}/inventory`
- `POST /camps/{campId}/inventory-logs`
- `GET /volunteers`
- `POST /camps/{campId}/requests`
- `POST /dispatches`

Dispatcher critical alerts and pending request matches poll every 20 seconds.
`POST /dispatches` should return `409 Conflict` when the selected volunteer has
already been assigned.
