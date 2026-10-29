# Disaster Relief & Resource Distribution Database & Ops System

Full-stack Disaster Relief & Resource Distribution System implementing the database design from **`03__DB_Design (1).docx`** (Course: 23CSE202 Database Management Systems).

The system includes:
1. **Relational Database Schemas, Triggers & Procedures**:
   - **PostgreSQL / pgAdmin 4** master script and modular DDL/DML.
   - **SQLite** zero-config embedded database engine.
   - **MySQL / MariaDB** standard script.
2. **REST API Backend**: Express server on port 8080 connecting the database directly to the live dashboard.
3. **React + Vite Frontend**: Dense operations dashboard for Dispatchers and Camp Managers.

---

## Quick Start (Full Stack)

### 1. Install & Initialize Database

```bash
npm install
npm run db:setup
```

### 2. Start the Backend API

```bash
npm run server
```
The REST API will be active on `http://localhost:8080/api`.

### 3. Start the Frontend Dashboard

In a new terminal:
```bash
npm run dev
```
Open `http://localhost:5173` in your browser.

---

## Using with pgAdmin 4

The project provides complete PostgreSQL scripts ready for **pgAdmin 4**:

- **Master Script**: [`database/postgresql/disaster_relief_pgadmin.sql`](file:///home/piezuke/misc/dbms/Disaster-Relief-Management/database/postgresql/disaster_relief_pgadmin.sql)
- **Modular Scripts**:
  - [`database/postgresql/schema.sql`](file:///home/piezuke/misc/dbms/Disaster-Relief-Management/database/postgresql/schema.sql) (7 tables + Camp Inventory)
  - [`database/postgresql/triggers.sql`](file:///home/piezuke/misc/dbms/Disaster-Relief-Management/database/postgresql/triggers.sql) (PL/pgSQL triggers)
  - [`database/postgresql/procedures.sql`](file:///home/piezuke/misc/dbms/Disaster-Relief-Management/database/postgresql/procedures.sql) (Stored procedures)
  - [`database/postgresql/seed.sql`](file:///home/piezuke/misc/dbms/Disaster-Relief-Management/database/postgresql/seed.sql) (Monsoon relief seed dataset)
  - [`database/postgresql/queries.sql`](file:///home/piezuke/misc/dbms/Disaster-Relief-Management/database/postgresql/queries.sql) (Analytical queries)

### Steps in pgAdmin 4:
1. Open pgAdmin 4 and connect to your PostgreSQL server.
2. Right-click **Databases** > **Create** > **Database...**, name it `disaster_relief`.
3. Select `disaster_relief` and open **Tools > Query Tool** (`Alt+Shift+Q`).
4. Click the **Open File** icon (`Ctrl+O`) and select:
   `database/postgresql/disaster_relief_pgadmin.sql`
5. Press **Execute / Refresh (F5)**.
6. To view the ER Diagram visually in pgAdmin:
   Right-click `disaster_relief` > **Generate ERD** to view all entities, primary keys, and foreign keys visually.

---

## Relational Schema (Section 3.3)

1. **`Relief_Camp`** (`CampID` (PK), `CampName`, `Location`, `Latitude`, `Longitude`, `CurrentPopulation`, `Capacity`, `ContactName`, `ContactPhone`, `ContactInfo`, `Zone`, `StatusLevel`, `LastUpdated`)
2. **`Supply_Hub`** (`HubID` (PK), `HubName`, `Location`, `Latitude`, `Longitude`, `Zone`, `Capacity`, `ContactInfo`)
3. **`Inventory`** (`ItemID` (PK), `HubID` (FK -> `Supply_Hub.HubID`), `ItemName`, `Category`, `ShelfLifeCategory`, `QuantityAvailable`, `Threshold`, `CriticalThreshold`, `Unit`, `ShelfLifeDate`)
4. **`Volunteer`** (`VolunteerID` (PK), `Name`, `Phone`, `Skills`, `VehicleAccess`, `AssignedZone`, `Availability`)
5. **`Request`** (`RequestID` (PK), `CampID` (FK -> `Relief_Camp.CampID`), `ItemCategory`, `ItemName`, `QuantityRequested`, `Unit`, `UrgencyLevel`, `RequestDate`, `Status`)
6. **`Dispatch`** (`DispatchID` (PK), `RequestID` (FK -> `Request.RequestID`), `HubID` (FK -> `Supply_Hub.HubID`), `CampID` (FK -> `Relief_Camp.CampID`), `VolunteerID` (FK -> `Volunteer.VolunteerID`), `DispatchDate`, `TransitStatus`)
7. **`Dispatch_Item`** (`DispatchID` (PK, FK -> `Dispatch.DispatchID`), `ItemID` (PK, FK -> `Inventory.ItemID`), `QuantityDispatched`)
8. **`Camp_Inventory`** (`InventoryID` (PK), `CampID` (FK -> `Relief_Camp.CampID`), `ItemName`, `Category`, `Count`, `Unit`, `LastLogged`)

---

## Business Rules & Database Triggers (Section 3.1)

- **Rule 1 (StatusLevel Auto-Update)**: When camp inventory is logged, if logged water < `2.0 L * population` or logged food < `0.5 kg * population`, `StatusLevel` flips to `'Critical Level'` automatically.
- **Rule 2 (Double-Booking Prevention)**: Prevents assigning a volunteer who is already on an active dispatch (`TransitStatus = 'in_transit'`).
- **Rule 3 (Atomic Dispatch Transaction)**: Deducts hub inventory stock, assigns volunteer, updates request to `in_transit`, and creates dispatch in a single atomic transaction.
- **Rule 4 (Request Fulfillment Integrity)**: A request cannot be marked `'fulfilled'` unless a matching dispatch record exists.

---

## REST Endpoints Implemented

- `POST /api/auth/login`
- `GET /api/alerts/critical-camps`
- `GET /api/requests/pending-matches` (matches nearest hub with available stock using distance calculation)
- `GET /api/camps` & `GET /api/camps?campId={campId}`
- `PATCH /api/camps/{campId}`
- `GET /api/inventory/hubs?category={category}&shelfLife={shelfLife}`
- `GET /api/camps/{campId}/inventory`
- `POST /api/camps/{campId}/inventory-logs`
- `GET /api/volunteers`
- `POST /api/camps/{campId}/requests`
- `POST /api/dispatches` (atomic transaction with 409 conflict handling)
