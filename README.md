# Disaster Relief Management System

A DBMS project to manage disaster relief camps, supply hubs, and resource distribution. It helps track inventory levels, match relief requests to the nearest hubs, and dispatch supplies with volunteers.

Built for our Database Management Systems course.

## Tech Stack

- **Frontend**: React, Tailwind CSS, Vite
- **Backend**: Node.js, Express
- **Database**: SQLite (default, zero setup needed), with PostgreSQL and MySQL scripts included

---

## Database Design

See the visual [Entity-Relationship (ER) Diagram](docs/ER_DIAGRAM.md) for table relationships and schema details.

### Tables

1. **Relief_Camp** - Camp details, location coordinates, population, capacity, and status (`Normal`, `Moderate`, `Critical Level`).
2. **Supply_Hub** - Central warehouses storing relief items, capacity, and coordinates.
3. **Inventory** - Hub stock levels with expiry dates, units, and reorder thresholds.
4. **Volunteer** - Volunteer contact info, vehicle type (truck, van, etc.), and availability status.
5. **Request** - Aid requests raised by camp managers with urgency levels (`low`, `medium`, `high`, `critical`).
6. **Dispatch** - Records of resources dispatched from a hub to a camp, assigned to a volunteer.
7. **Dispatch_Item** - Junction table between Dispatch and Inventory tracking quantities sent.
8. **Camp_Inventory** - Current on-site food/water stock logged at each camp.
9. **App_User** - User logins for regional dispatchers and camp managers.

### Triggers & Logic

- **Camp Status Trigger**: When camp food/water inventory is updated, if water drops below 2L/person or food drops below 0.5kg/person, the camp status automatically changes to `Critical Level`.
- **Volunteer Double-Booking Check**: Prevents dispatching a volunteer who is already busy or in transit.
- **Stock Deduction**: Automatically deducts available inventory from the hub whenever items are dispatched.
- **Dispatch Status Sync**: Updates the volunteer to `assigned` and the request to `in_transit` when a dispatch is created.

### SQL Queries Included

- **Nearest Hub Matching**: Calculates distance between camps and stocked hubs using coordinates to recommend the best hub for pending requests.
- **24-Hour Buffer Check**: Compares camp population against remaining rations to calculate food/water deficits.
- **Low Stock & Expiry Alerts**: Lists hub items that are nearing expiration or below minimum safety levels.
- **Traceability Query**: Joins dispatches, hubs, camps, volunteers, and items for full delivery history.

---

## Quick 1-Command Local Deployment

To automatically free ports, seed the database, build the frontend, and launch the application in **one step**:

```bash
./deploy.sh
# or: npm run deploy
```

Then open **`http://localhost:8080`** in your browser.

---

## Manual Step-by-Step Setup (Development Mode)

If you prefer running frontend and backend separately in two terminals:

### 1. Install dependencies
```bash
npm install
```

### 2. Set up the database
```bash
npm run db:setup
```
*(Creates the SQLite database, tables, triggers, and seed data automatically)*

### 3. Start the backend server (Terminal 1)
```bash
npm run server
```
Server runs on `http://localhost:8080`.

### 4. Start the frontend (Terminal 2)
```bash
npm run dev
```
Open `http://localhost:5173` in your browser.

### 5. Run tests (verification)
```bash
npm test
```
*(Runs 14 automated API & trigger tests and verifies the 5 analytical SQL queries)*

---

## Demo Accounts

| Role | Email | Password |
|---|---|---|
| Regional Dispatcher | `dispatcher@reliefops.org` | `admin123` |
| Camp Manager (East Ridge) | `maya@eastridge.org` | `camp123` |
| Camp Manager (Riverbend) | `omar@riverbend.org` | `camp123` |
| Camp Manager (Hillview) | `leela@hillview.org` | `camp123` |

---

## PostgreSQL / pgAdmin 4 (Optional)

If you need to show it running in pgAdmin:
1. Create a database called `disaster_relief` in pgAdmin 4.
2. Open Query Tool (`Alt + Shift + Q`).
3. Open `database/postgresql/disaster_relief_pgadmin.sql` and press **F5** to run.
4. Right click `disaster_relief` > **Generate ERD** to see the ER diagram.

---

## Quick Viva / Presentation Summary

When asked to explain the project:
1. **Problem**: During disasters, relief supplies get misallocated because camps and hubs operate on disconnected spreadsheets and messages.
2. **Solution**: A centralized relational database (9 tables, 3NF) linking camps, supply hubs, inventories, volunteers, requests, and dispatches.
3. **Core DBMS Concepts Used**:
   - **Keys & Constraints**: Foreign keys with `CASCADE` / `RESTRICT`, composite PK on junction table `Dispatch_Item(DispatchID, ItemID)`, and `CHECK` constraints (e.g. non-negative stock).
   - **Triggers**:
     - Automatically flags a camp as `Critical Level` when water (< 2L/person) or food (< 0.5kg/person) falls below minimum safety buffer.
     - Prevents volunteer double-booking before a dispatch record is saved.
     - Automatically deducts hub stock upon dispatch item insertion.
     - Synchronizes volunteer availability (`assigned`) and request status (`in_transit`).
   - **Transactions**: Atomic dispatch creation ensuring dispatch, junction items, and stock updates happen together or rollback.
   - **Complex Queries**: Proximity-based matching of camp requests to stocked hubs using geographic coordinates and distance calculation.

