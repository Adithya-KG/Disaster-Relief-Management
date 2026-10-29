# Disaster Relief & Resource Distribution System
## Setup & Installation Guide for Another System

This guide walks you through setting up and running the entire project (Frontend, Backend API, SQLite database, and pgAdmin 4 / PostgreSQL) on any other machine (Windows, macOS, or Linux).

---

## 1. Prerequisites

Before starting, ensure the target system has:

1. **Node.js (v18 or higher)** and **npm**:
   - Check if installed:
     ```bash
     node -v
     npm -v
     ```
   - If not installed, download from [nodejs.org](https://nodejs.org/).
2. *(Optional, for DBMS course evaluation)* **pgAdmin 4 & PostgreSQL**:
   - Download from [pgadmin.org](https://www.pgadmin.org/download/) / [postgresql.org](https://www.postgresql.org/download/).
   - *Note: The app runs out of the box with embedded SQLite even without PostgreSQL installed.*

---

## 2. Quick Setup (3 Steps)

### Step 1: Unzip and Navigate to the Folder
Extract `disaster-relief-management.zip` and open a terminal in the project folder:
```bash
cd Disaster-Relief-Management
```

### Step 2: Install Dependencies
```bash
npm install
```
*(This installs all frontend packages, Express, and database drivers).*

### Step 3: Initialize the Database
```bash
npm run db:setup
```
This executes the relational schema (`schema.sql`), triggers (`triggers.sql`), and seed data (`seed.sql`), outputting:
```
--- Initializing Disaster Relief Database ---
✓ Executed schema.sql (tables created)
✓ Executed triggers.sql (triggers created)
✓ Executed seed.sql (seed data inserted)
Database Record Counts:
  - Relief_Camp: 3 records
  - Supply_Hub: 3 records
  - Inventory: 7 records
  - Volunteer: 4 records
  - Request: 4 records
  - Dispatch: 1 records
  - Dispatch_Item: 1 records
  - Camp_Inventory: 6 records
  - App_User: 5 records
```

---

## 3. Running the Application

Open **two terminal windows** in `Disaster-Relief-Management`:

### Terminal 1: Start the Backend REST API
```bash
npm run server
```
- Output: `✓ Disaster Relief Backend API running on http://localhost:8080`

### Terminal 2: Start the Frontend Operations Dashboard
```bash
npm run dev
```
- Output: `VITE v5.4.11 ready in ... ms` -> Open **`http://localhost:5173`** (or `http://127.0.0.1:5173`) in your web browser.

---

## 4. Login Credentials

The system enforces authentication with role-based access control. You can either click the **Quick Demo Account** buttons on the login screen or enter these credentials manually:

| Role | Email | Password | What You Can Access |
|---|---|---|---|
| **Regional Dispatcher** | `dispatcher@reliefops.org` | `admin123` | Full regional dashboard, critical camps, pending request matches, volunteer roster, and truck dispatch |
| **Camp Manager (East Ridge)** | `maya@eastridge.org` | `camp123` | East Ridge Camp only: on-site inventory logging and raising urgent supply requests |
| **Camp Manager (Riverbend)** | `omar@riverbend.org` | `camp123` | Riverbend Shelter only: stock logging and requests |
| **Camp Manager (Hillview)** | `leela@hillview.org` | `camp123` | Hillview Transit Camp only: stock logging and requests |

---

## 5. Setting up & Evaluating in pgAdmin 4

If evaluating or demonstrating the database schema in **pgAdmin 4**:

1. Open **pgAdmin 4** and connect to your local PostgreSQL server.
2. In the Object Explorer on the left, right-click **Databases** > **Create** > **Database...**.
3. Name the database **`disaster_relief`** and click **Save**.
4. Click on `disaster_relief` to select it, then open **Tools > Query Tool** from the top menu (or press `Alt+Shift+Q`).
5. Click the **Open File** icon (`Ctrl+O`) in the Query Tool toolbar and browse to:
   ```
   database/postgresql/disaster_relief_pgadmin.sql
   ```
6. Press the **Execute (F5)** button (play icon).
   - This script creates all 8 tables, PL/pgSQL triggers, the stored procedure `sp_execute_dispatch`, seed records, and test analytical queries.
7. **View the Visual ER Diagram**:
   - Right-click the `disaster_relief` database > **Generate ERD**.
   - pgAdmin will automatically render the full visual entity-relationship diagram with primary keys, foreign keys, and cardinalities!

---

## 6. Project Structure Overview

```
Disaster-Relief-Management/
├── database/
│   ├── schema.sql                 # Core SQLite DDL (7 relations + camp inventory + users)
│   ├── triggers.sql               # SQLite triggers (buffer check, volunteer conflict, stock deduction)
│   ├── seed.sql                   # Realistic Kerala monsoon disaster relief dataset
│   ├── queries.sql                # Analytical queries (Haversine matching, buffer deficit analysis)
│   ├── schema_mysql.sql           # MySQL / MariaDB compatible DDL & stored procedures
│   └── postgresql/
│       ├── disaster_relief_pgadmin.sql  # Master all-in-one script for pgAdmin 4 (F5 execution)
│       ├── schema.sql             # PostgreSQL DDL
│       ├── triggers.sql           # PL/pgSQL triggers
│       ├── procedures.sql         # PL/pgSQL stored procedures
│       ├── seed.sql               # PostgreSQL seed data
│       └── queries.sql            # PostgreSQL analytical queries
├── server/
│   ├── index.js                   # Express REST API (port 8080) implementing all 12 contract routes
│   ├── db.js                      # SQLite database connection & pragmas
│   ├── setupDb.js                 # Database setup and seed migration script
│   └── testApi.js                 # Integration test suite testing all 12 endpoints
├── src/
│   ├── screens/                   # Dashboard, Camps, Inventory, Requests, Volunteers, Login
│   ├── api/client.js              # Frontend REST API client
│   └── components/                # UI components (MetricCard, Shell, StatusBadge)
├── .env                           # Environment configuration (VITE_API_URL=http://localhost:8080/api)
├── SETUP_GUIDE.md                 # This setup guide
└── package.json                   # Project scripts and dependencies
```

---

## 7. Troubleshooting FAQ

- **Port 8080 or 5173 is already in use:**
  - You can change `PORT=8080` in `.env` to any port (e.g., `PORT=8082`), and update `VITE_API_URL=http://localhost:8082/api`.
- **Node C++ rebuild issue on `better-sqlite3`:**
  - `better-sqlite3` includes precompiled binaries for Windows, macOS, and Linux x64/arm64. If your system requires compiling from source, ensure Python and standard build tools (`windows-build-tools` or `build-essential`) are installed, or install `sqlite3`.
- **Database file location:**
  - The SQLite database file is stored at `database/disaster_relief.sqlite`. You can open this file with [DB Browser for SQLite](https://sqlitebrowser.org/) or any SQLite viewer.
