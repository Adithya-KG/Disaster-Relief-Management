import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import db from './db.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());

// ----------------------------------------------------------------------------
// Helper: Haversine distance in kilometers
// ----------------------------------------------------------------------------
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

// ----------------------------------------------------------------------------
// 1. POST /api/auth/login
// ----------------------------------------------------------------------------
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  const user = db.prepare('SELECT * FROM App_User WHERE LOWER(Email) = LOWER(?)').get(email);
  if (!user || user.Password !== password) {
    return res.status(401).json({ message: 'Invalid email or password' });
  }

  return res.json({
    token: `token-${Date.now()}`,
    user: {
      id: user.UserID,
      name: user.FullName,
      email: user.Email,
      role: user.Role,
      campId: user.AssignedCampID || null,
    },
  });
});

// ----------------------------------------------------------------------------
// 2. GET /api/alerts/critical-camps
// ----------------------------------------------------------------------------
app.get('/api/alerts/critical-camps', (req, res) => {
  try {
    const rows = db
      .prepare(
        `SELECT 
          CampID AS id,
          CampName AS name,
          Zone AS zone,
          Location AS location,
          CurrentPopulation AS population,
          Capacity AS capacity,
          ContactName AS contactName,
          ContactPhone AS contactPhone,
          StatusLevel AS status,
          LastUpdated AS lastUpdated
        FROM Relief_Camp
        WHERE StatusLevel = 'Critical Level'
        ORDER BY CurrentPopulation DESC`
      )
      .all();

    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ----------------------------------------------------------------------------
// 3. GET /api/requests/pending-matches
// Matches pending requests to the nearest hub with available stock
// ----------------------------------------------------------------------------
app.get('/api/requests/pending-matches', (req, res) => {
  try {
    const pendingRequests = db
      .prepare(
        `SELECT 
          r.RequestID AS id,
          r.CampID AS campId,
          c.CampName AS campName,
          c.Latitude AS campLat,
          c.Longitude AS campLon,
          r.ItemName AS item,
          r.ItemCategory AS category,
          r.QuantityRequested AS quantity,
          r.Unit AS unit,
          r.UrgencyLevel AS urgency,
          r.Status AS status,
          r.RequestDate AS createdAt
        FROM Request r
        JOIN Relief_Camp c ON r.CampID = c.CampID
        WHERE r.Status = 'pending'
        ORDER BY 
          CASE r.UrgencyLevel 
            WHEN 'critical' THEN 1 
            WHEN 'high' THEN 2 
            WHEN 'medium' THEN 3 
            ELSE 4 
          END,
          r.RequestDate ASC`
      )
      .all();

    const hubs = db.prepare('SELECT * FROM Supply_Hub').all();

    const result = pendingRequests.map((reqRow) => {
      // Find hubs that have stock for this item
      const stockRows = db
        .prepare(
          `SELECT ItemID, HubID, QuantityAvailable 
           FROM Inventory 
           WHERE ItemName = ? AND QuantityAvailable >= ?`
        )
        .all(reqRow.item, reqRow.quantity);

      let matchedHub = null;
      let minDistance = Infinity;

      for (const stock of stockRows) {
        const hub = hubs.find((h) => h.HubID === stock.HubID);
        if (hub) {
          const dist = calculateDistance(
            reqRow.campLat,
            reqRow.campLon,
            hub.Latitude,
            hub.Longitude
          );
          if (dist < minDistance) {
            minDistance = dist;
            matchedHub = {
              id: hub.HubID,
              name: hub.HubName,
              distanceKm: dist,
              availableStock: stock.QuantityAvailable,
            };
          }
        }
      }

      const etaMinutes = matchedHub
        ? Math.round((matchedHub.distanceKm / 25.0) * 60 + 15)
        : null;

      return {
        id: reqRow.id,
        campId: reqRow.campId,
        campName: reqRow.campName,
        item: reqRow.item,
        quantity: reqRow.quantity,
        unit: reqRow.unit,
        urgency: reqRow.urgency,
        status: reqRow.status,
        createdAt: reqRow.createdAt,
        matchedHub: matchedHub || {
          id: null,
          name: 'No hub with sufficient stock',
          distanceKm: null,
          availableStock: 0,
        },
        etaMinutes,
      };
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ----------------------------------------------------------------------------
// 4. GET /api/camps & GET /api/camps?campId=...
// ----------------------------------------------------------------------------
app.get('/api/camps', (req, res) => {
  try {
    const { campId } = req.query;
    let query = `SELECT 
      CampID AS id,
      CampName AS name,
      Zone AS zone,
      Location AS location,
      CurrentPopulation AS population,
      Capacity AS capacity,
      ContactName AS contactName,
      ContactPhone AS contactPhone,
      StatusLevel AS status,
      LastUpdated AS lastUpdated
    FROM Relief_Camp`;

    const params = [];
    if (campId) {
      query += ' WHERE CampID = ?';
      params.push(campId);
    }

    const rows = db.prepare(query).all(...params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 4b. GET /api/camps/:campId
// ----------------------------------------------------------------------------
app.get('/api/camps/:campId', (req, res) => {
  try {
    const { campId } = req.params;
    const row = db
      .prepare(
        `SELECT 
          CampID AS id,
          CampName AS name,
          Zone AS zone,
          Location AS location,
          CurrentPopulation AS population,
          Capacity AS capacity,
          ContactName AS contactName,
          ContactPhone AS contactPhone,
          StatusLevel AS status,
          LastUpdated AS lastUpdated
        FROM Relief_Camp WHERE CampID = ?`
      )
      .get(campId);

    if (!row) {
      return res.status(404).json({ message: 'Camp not found' });
    }
    res.json(row);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ----------------------------------------------------------------------------
// 5. PATCH /api/camps/:campId
// ----------------------------------------------------------------------------
app.patch('/api/camps/:campId', (req, res) => {
  try {
    const { campId } = req.params;
    const { location, population, contactName, contactPhone } = req.body;

    const existing = db.prepare('SELECT * FROM Relief_Camp WHERE CampID = ?').get(campId);
    if (!existing) {
      return res.status(404).json({ message: 'Camp not found' });
    }

    const newLoc = location !== undefined ? location : existing.Location;
    const newPop = population !== undefined ? Number(population) : existing.CurrentPopulation;
    const newContactName = contactName !== undefined ? contactName : existing.ContactName;
    const newContactPhone = contactPhone !== undefined ? contactPhone : existing.ContactPhone;

    db.prepare(
      `UPDATE Relief_Camp 
       SET Location = ?, CurrentPopulation = ?, ContactName = ?, ContactPhone = ?, LastUpdated = CURRENT_TIMESTAMP
       WHERE CampID = ?`
    ).run(newLoc, newPop, newContactName, newContactPhone, campId);

    // Re-evaluate 24-hr buffer threshold for status
    const waterStock = db
      .prepare("SELECT COALESCE(SUM(Count), 0) AS total FROM Camp_Inventory WHERE CampID = ? AND Category = 'Water'")
      .get(campId).total;
    const foodStock = db
      .prepare("SELECT COALESCE(SUM(Count), 0) AS total FROM Camp_Inventory WHERE CampID = ? AND Category = 'Food'")
      .get(campId).total;

    const isCritical = waterStock < newPop * 2.0 || foodStock < newPop * 0.5;
    const statusLevel = isCritical ? 'Critical Level' : 'Normal';

    db.prepare('UPDATE Relief_Camp SET StatusLevel = ? WHERE CampID = ?').run(statusLevel, campId);

    const updated = db
      .prepare(
        `SELECT 
          CampID AS id,
          CampName AS name,
          Zone AS zone,
          Location AS location,
          CurrentPopulation AS population,
          Capacity AS capacity,
          ContactName AS contactName,
          ContactPhone AS contactPhone,
          StatusLevel AS status,
          LastUpdated AS lastUpdated
        FROM Relief_Camp WHERE CampID = ?`
      )
      .get(campId);

    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ----------------------------------------------------------------------------
// 6. GET /api/inventory/hubs
// ----------------------------------------------------------------------------
app.get('/api/inventory/hubs', (req, res) => {
  try {
    const { category, shelfLife } = req.query;

    let query = `
      SELECT 
        inv.ItemID AS id,
        inv.HubID AS hubId,
        sh.HubName AS hubName,
        inv.ItemName AS item,
        inv.Category AS category,
        inv.ShelfLifeCategory AS shelfLife,
        inv.QuantityAvailable AS stock,
        inv.Threshold AS threshold,
        inv.CriticalThreshold AS criticalThreshold,
        inv.Unit AS unit,
        inv.ShelfLifeDate AS expiry
      FROM Inventory inv
      JOIN Supply_Hub sh ON inv.HubID = sh.HubID
      WHERE 1=1
    `;
    const params = [];

    if (category && category !== 'all') {
      query += ' AND inv.Category = ?';
      params.push(category);
    }
    if (shelfLife && shelfLife !== 'all') {
      query += ' AND inv.ShelfLifeCategory = ?';
      params.push(shelfLife);
    }

    query += ' ORDER BY sh.HubName, inv.ItemName';

    const rows = db.prepare(query).all(...params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ----------------------------------------------------------------------------
// 7. GET /api/camps/:campId/inventory
// ----------------------------------------------------------------------------
app.get('/api/camps/:campId/inventory', (req, res) => {
  try {
    const { campId } = req.params;
    const rows = db
      .prepare(
        `SELECT 
          InventoryID AS id,
          CampID AS campId,
          ItemName AS item,
          Category AS category,
          Count AS count,
          Unit AS unit,
          LastLogged AS lastLogged
        FROM Camp_Inventory
        WHERE CampID = ?
        ORDER BY Category, ItemName`
      )
      .all(campId);

    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ----------------------------------------------------------------------------
// 8. POST /api/camps/:campId/inventory-logs
// Logs camp inventory and fires 24-hr buffer trigger
// ----------------------------------------------------------------------------
app.post('/api/camps/:campId/inventory-logs', (req, res) => {
  try {
    const { campId } = req.params;
    const { item, category, count, unit } = req.body;

    const existing = db
      .prepare('SELECT InventoryID FROM Camp_Inventory WHERE CampID = ? AND ItemName = ?')
      .get(campId, item);

    let id = existing?.InventoryID;

    if (existing) {
      db.prepare(
        `UPDATE Camp_Inventory 
         SET Count = ?, Category = ?, Unit = ?, LastLogged = CURRENT_TIMESTAMP
         WHERE InventoryID = ?`
      ).run(Number(count), category, unit, id);
    } else {
      id = `camp-inv-${Date.now()}`;
      db.prepare(
        `INSERT INTO Camp_Inventory (InventoryID, CampID, ItemName, Category, Count, Unit, LastLogged)
         VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`
      ).run(id, campId, item, category, Number(count), unit);
    }

    const row = db
      .prepare(
        `SELECT 
          InventoryID AS id,
          CampID AS campId,
          ItemName AS item,
          Category AS category,
          Count AS count,
          Unit AS unit,
          LastLogged AS lastLogged
        FROM Camp_Inventory WHERE InventoryID = ?`
      )
      .get(id);

    // Sync camp status based on inventory levels
    const campRow = db.prepare('SELECT CurrentPopulation FROM Relief_Camp WHERE CampID = ?').get(campId);
    if (campRow) {
      const waterSum = db.prepare("SELECT COALESCE(SUM(Count), 0) AS total FROM Camp_Inventory WHERE CampID = ? AND Category = 'Water'").get(campId).total;
      const foodSum = db.prepare("SELECT COALESCE(SUM(Count), 0) AS total FROM Camp_Inventory WHERE CampID = ? AND Category = 'Food'").get(campId).total;
      const isCritical = waterSum < (campRow.CurrentPopulation * 2.0) || foodSum < (campRow.CurrentPopulation * 0.5);
      const calculatedStatus = isCritical ? 'Critical Level' : 'Normal';
      db.prepare('UPDATE Relief_Camp SET StatusLevel = ?, LastUpdated = CURRENT_TIMESTAMP WHERE CampID = ?').run(calculatedStatus, campId);
    }

    const updatedCamp = db
      .prepare('SELECT CampID AS id, CampName AS name, StatusLevel AS status FROM Relief_Camp WHERE CampID = ?')
      .get(campId);

    res.status(201).json({
      ...row,
      campStatus: updatedCamp?.status || 'Normal',
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ----------------------------------------------------------------------------
// 9. GET /api/volunteers
// ----------------------------------------------------------------------------
app.get('/api/volunteers', (req, res) => {
  try {
    const rows = db
      .prepare(
        `SELECT 
          v.VolunteerID AS id,
          v.Name AS name,
          v.Skills AS skillsRaw,
          v.VehicleAccess AS vehicleAccess,
          v.AssignedZone AS assignedZone,
          v.Availability AS availability,
          d.RequestID AS assignedRequestId
        FROM Volunteer v
        LEFT JOIN Dispatch d ON v.VolunteerID = d.VolunteerID AND d.TransitStatus IN ('in_transit', 'pending')
        ORDER BY v.Name`
      )
      .all();

    const formatted = rows.map((v) => {
      let parsedSkills = [];
      try {
        parsedSkills = JSON.parse(v.skillsRaw);
      } catch {
        parsedSkills = v.skillsRaw ? v.skillsRaw.split(',').map((s) => s.trim()) : [];
      }
      return {
        id: v.id,
        name: v.name,
        skills: parsedSkills,
        vehicleAccess: v.vehicleAccess,
        assignedZone: v.assignedZone,
        availability: v.availability,
        assignedRequestId: v.assignedRequestId || null,
      };
    });

    res.json(formatted);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 9b. GET /api/camps/:campId/requests
// ----------------------------------------------------------------------------
app.get('/api/camps/:campId/requests', (req, res) => {
  try {
    const { campId } = req.params;
    const rows = db
      .prepare(
        `SELECT 
          RequestID AS id,
          CampID AS campId,
          ItemName AS item,
          ItemCategory AS category,
          QuantityRequested AS quantity,
          Unit AS unit,
          UrgencyLevel AS urgency,
          Status AS status,
          RequestDate AS createdAt
        FROM Request
        WHERE CampID = ?
        ORDER BY RequestDate DESC`
      )
      .all(campId);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ----------------------------------------------------------------------------
// 10. POST /api/camps/:campId/requests
// ----------------------------------------------------------------------------
app.post('/api/camps/:campId/requests', (req, res) => {
  try {
    const { campId } = req.params;
    const { item, category, quantity, unit, urgency } = req.body;

    const camp = db.prepare('SELECT CampName FROM Relief_Camp WHERE CampID = ?').get(campId);
    if (!camp) {
      return res.status(404).json({ message: 'Camp not found' });
    }

    const requestId = `REQ-${Math.floor(1100 + Math.random() * 8900)}`;
    const inferredCategory = category || (item.toLowerCase().includes('water') ? 'Water' : 'Food');

    db.prepare(
      `INSERT INTO Request (RequestID, CampID, ItemCategory, ItemName, QuantityRequested, Unit, UrgencyLevel, RequestDate, Status)
       VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, 'pending')`
    ).run(requestId, campId, inferredCategory, item, Number(quantity), unit, urgency || 'medium');

    res.status(201).json({
      id: requestId,
      campId,
      campName: camp.CampName,
      item,
      quantity: Number(quantity),
      unit,
      urgency: urgency || 'medium',
      status: 'pending',
      createdAt: new Date().toISOString(),
      matchedHub: {
        id: null,
        name: 'Pending matching algorithm',
        distanceKm: null,
        availableStock: null,
      },
      etaMinutes: null,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/dispatches
// Create dispatch transaction
app.post('/api/dispatches', (req, res) => {
  const { requestId, volunteerId } = req.body;

  try {
    // 1. Volunteer check: must be available
    const volunteer = db.prepare('SELECT * FROM Volunteer WHERE VolunteerID = ?').get(volunteerId);
    if (!volunteer || volunteer.Availability === 'assigned') {
      return res.status(409).json({
        message: 'Volunteer already assigned. Select another available volunteer.',
      });
    }

    // Check if volunteer is on active dispatch
    const activeDispatch = db
      .prepare(
        "SELECT DispatchID FROM Dispatch WHERE VolunteerID = ? AND TransitStatus IN ('in_transit', 'pending')"
      )
      .get(volunteerId);
    if (activeDispatch) {
      return res.status(409).json({
        message: 'Volunteer already assigned. Select another available volunteer.',
      });
    }

    // 2. Request check
    const request = db.prepare('SELECT * FROM Request WHERE RequestID = ?').get(requestId);
    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }
    if (request.Status !== 'pending') {
      return res.status(400).json({ message: `Request is already ${request.Status}` });
    }

    // 3. Find stocked item in a hub
    const inventoryItem = db
      .prepare(
        `SELECT ItemID, HubID, QuantityAvailable 
         FROM Inventory 
         WHERE ItemName = ? AND QuantityAvailable >= ? 
         ORDER BY QuantityAvailable DESC LIMIT 1`
      )
      .get(request.ItemName, request.QuantityRequested);

    if (!inventoryItem) {
      return res.status(400).json({
        message: `Insufficient inventory available across hubs for ${request.ItemName}`,
      });
    }

    // 4. Execute atomic transaction
    // Triggers trg_check_inventory_stock & trg_deduct_inventory_stock validate and deduct stock
    // Trigger trg_prevent_volunteer_double_booking & trg_dispatch_after_insert handle volunteer/request status
    const dispatchId = `DSP-${Date.now()}`;

    const executeTransaction = db.transaction(() => {
      // Create Dispatch record (fires trg_prevent_volunteer_double_booking & trg_dispatch_after_insert)
      db.prepare(
        `INSERT INTO Dispatch (DispatchID, RequestID, HubID, CampID, VolunteerID, DispatchDate, TransitStatus)
         VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, 'in_transit')`
      ).run(dispatchId, requestId, inventoryItem.HubID, request.CampID, volunteerId);

      // Create Dispatch_Item bridge record (fires trg_check_inventory_stock & trg_deduct_inventory_stock)
      db.prepare(
        `INSERT INTO Dispatch_Item (DispatchID, ItemID, QuantityDispatched)
         VALUES (?, ?, ?)`
      ).run(dispatchId, inventoryItem.ItemID, request.QuantityRequested);
    });

    executeTransaction();

    return res.status(201).json({
      dispatchId,
      requestId,
      volunteerId,
      status: 'in_transit',
    });
  } catch (err) {
    if (err.message?.includes('Volunteer already assigned')) {
      return res.status(409).json({ message: err.message });
    }
    return res.status(500).json({ message: err.message });
  }
});

// ----------------------------------------------------------------------------
// Serve Static Frontend (Production Build)
// ----------------------------------------------------------------------------
const distPath = path.resolve(__dirname, '../dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api')) {
      return res.sendFile(path.join(distPath, 'index.html'));
    }
    next();
  });
}

// ----------------------------------------------------------------------------
// Start Server
// ----------------------------------------------------------------------------
app.listen(PORT, () => {
  console.log(`✓ Disaster Relief Backend API running on http://localhost:${PORT}`);
  console.log(`✓ Database: SQLite (${path.resolve(__dirname, '../database/disaster_relief.sqlite')})`);
  console.log(`✓ pgAdmin Script available at: database/postgresql/disaster_relief_pgadmin.sql`);
});
