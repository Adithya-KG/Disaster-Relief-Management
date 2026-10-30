# Setup Guide

Quick instructions to get the project running.

## Prerequisites
- **Node.js** (v18 or higher)

---

## Quick Start (3 Steps)

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

- **Run API tests:**
  ```bash
  node server/testApi.js
  ```

- **For pgAdmin 4 (PostgreSQL):**
  1. Create a database called `disaster_relief`.
  2. Open Query Tool in pgAdmin.
  3. Load `database/postgresql/disaster_relief_pgadmin.sql` and run it (`F5`).
  4. Right click database > **Generate ERD** to view the ER diagram.
