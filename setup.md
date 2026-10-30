# Setup Guide

Quick instructions to get the project running.

## Prerequisites
- **Node.js** (v18 or higher)

---

## 1-Step Local Deployment (Recommended)

Run the automated deployment script:
```bash
./deploy.sh
# or: npm run deploy
```
Open **`http://localhost:8080`** in your browser.

---

## Manual 3-Step Setup (Development)

### 1. Install dependencies
```bash
npm install
```

### 2. Initialize database
```bash
npm run db:setup
```

### 3. Run the app
Open **two terminals** in this folder:

- **Terminal 1 (Backend):**
  ```bash
  npm run server
  ```
  Runs at `http://localhost:8080`.

- **Terminal 2 (Frontend):**
  ```bash
  npm run dev
  ```
  Runs at `http://localhost:5173`.

---

## Logins

- **Regional Dispatcher**: `dispatcher@reliefops.org` / `admin123`
- **Camp Manager**: `maya@eastridge.org` / `camp123`

*(Or click any of the quick demo buttons on the login screen).*

---

## Verification & pgAdmin 4

- **Run tests:**
  ```bash
  npm test
  ```

- **For pgAdmin 4 (PostgreSQL):**
  1. Create a database called `disaster_relief`.
  2. Open Query Tool in pgAdmin.
  3. Load `database/postgresql/disaster_relief_pgadmin.sql` and run it (`F5`).
  4. Right click database > **Generate ERD** to view the ER diagram.
