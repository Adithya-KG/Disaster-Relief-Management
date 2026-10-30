import http from 'http';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import db from './db.js';
import { setupDatabase } from './setupDb.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Reset database for clean test run
setupDatabase();

// Start server on test port 8081
process.env.PORT = '8081';
const { default: app } = await import('./index.js');

function request(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const req = http.request(
      {
        hostname: 'localhost',
        port: 8081,
        path,
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
        },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, data: JSON.parse(data) });
          } catch {
            resolve({ status: res.statusCode, data });
          }
        });
      }
    );
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function runTests() {
  console.log('\n--- Running Backend REST API & Database Verification Tests ---');

  // Test 1a: Valid Dispatcher Login
  const loginRes = await request('POST', '/api/auth/login', {
    email: 'dispatcher@reliefops.org',
    password: 'admin123',
  });
  assert.strictEqual(loginRes.status, 200, 'Dispatcher login should return 200');
  assert.strictEqual(loginRes.data.user?.role, 'dispatcher', 'Role must be dispatcher');
  assert.ok(loginRes.data.token, 'Auth token must be returned');
  console.log(`✓ 1a. POST /api/auth/login (Dispatcher) -> status ${loginRes.status}, user: ${loginRes.data.user?.name}, role: ${loginRes.data.user?.role}`);

  // Test 1b: Valid Camp Manager Login
  const campLoginRes = await request('POST', '/api/auth/login', {
    email: 'maya@eastridge.org',
    password: 'camp123',
  });
  assert.strictEqual(campLoginRes.status, 200, 'Camp Manager login should return 200');
  assert.strictEqual(campLoginRes.data.user?.role, 'camp_manager', 'Role must be camp_manager');
  assert.strictEqual(campLoginRes.data.user?.campId, 'camp-east-ridge', 'Assigned camp must be camp-east-ridge');
  console.log(`✓ 1b. POST /api/auth/login (Camp Manager) -> status ${campLoginRes.status}, user: ${campLoginRes.data.user?.name}, campId: ${campLoginRes.data.user?.campId}`);

  // Test 1c: Invalid Password Check
  const badPassRes = await request('POST', '/api/auth/login', {
    email: 'dispatcher@reliefops.org',
    password: 'wrongpassword',
  });
  assert.strictEqual(badPassRes.status, 401, 'Invalid password should return 401');
  assert.strictEqual(badPassRes.data.message, 'Invalid email or password');
  console.log(`✓ 1c. POST /api/auth/login (Wrong Password) -> status ${badPassRes.status} (${badPassRes.data.message})`);

  // Test 1d: Non-existent User Check
  const noUserRes = await request('POST', '/api/auth/login', {
    email: 'stranger@nowhere.com',
    password: 'password',
  });
  assert.strictEqual(noUserRes.status, 401, 'Unknown email should return 401');
  assert.strictEqual(noUserRes.data.message, 'Invalid email or password');
  console.log(`✓ 1d. POST /api/auth/login (Unknown Email) -> status ${noUserRes.status} (${noUserRes.data.message})`);

  // Test 2: Critical Alerts
  const alertsRes = await request('GET', '/api/alerts/critical-camps');
  assert.strictEqual(alertsRes.status, 200, 'Alerts endpoint should return 200');
  assert.ok(Array.isArray(alertsRes.data), 'Alerts must return an array');
  assert.strictEqual(alertsRes.data.length, 2, 'Initial seed should have 2 critical camps');
  assert.ok(alertsRes.data.every((c) => c.status === 'Critical Level'), 'Every returned camp must have Critical Level status');
  console.log(`✓ 2. GET /api/alerts/critical-camps -> status ${alertsRes.status}, count: ${alertsRes.data.length}`);

  // Test 3: Pending Matches
  const pendingRes = await request('GET', '/api/requests/pending-matches');
  assert.strictEqual(pendingRes.status, 200, 'Pending matches endpoint should return 200');
  assert.ok(Array.isArray(pendingRes.data), 'Pending matches must return an array');
  assert.strictEqual(pendingRes.data.length, 3, 'Initial pending requests count should be 3');
  const sample = pendingRes.data[0];
  assert.ok(sample.matchedHub, 'Matched hub information must be present');
  assert.ok(typeof sample.matchedHub.distanceKm === 'number', 'Distance in km must be computed');
  console.log(`✓ 3. GET /api/requests/pending-matches -> status ${pendingRes.status}, count: ${pendingRes.data.length}`);
  console.log(`     Sample match: ${sample.id} (${sample.item}) -> Hub: ${sample.matchedHub?.name} (${sample.matchedHub?.distanceKm} km, ETA: ${sample.etaMinutes} min)`);

  // Test 4: Camps
  const campsRes = await request('GET', '/api/camps');
  assert.strictEqual(campsRes.status, 200, 'Camps endpoint should return 200');
  assert.ok(Array.isArray(campsRes.data), 'Camps must return an array');
  assert.strictEqual(campsRes.data.length, 3, 'Initial camps count should be 3');
  console.log(`✓ 4. GET /api/camps -> status ${campsRes.status}, count: ${campsRes.data.length}`);

  // Test 5: Update Camp
  const updateCampRes = await request('PATCH', '/api/camps/camp-east-ridge', {
    population: 1300,
    contactName: 'Maya Iyer (Updated)',
  });
  assert.strictEqual(updateCampRes.status, 200, 'Camp update should return 200');
  assert.strictEqual(updateCampRes.data.population, 1300, 'Population must be updated');
  assert.strictEqual(updateCampRes.data.contactName, 'Maya Iyer (Updated)', 'Contact name must be updated');
  console.log(`✓ 5. PATCH /api/camps/:campId -> status ${updateCampRes.status}, new pop: ${updateCampRes.data.population}`);

  // Test 6: Hub Inventory
  const hubInvRes = await request('GET', '/api/inventory/hubs?category=Water');
  assert.strictEqual(hubInvRes.status, 200, 'Hub inventory should return 200');
  assert.ok(hubInvRes.data.length >= 2, 'Should find at least 2 water items');
  assert.ok(hubInvRes.data.every((i) => i.category === 'Water'), 'Filtered items must all be in Water category');
  console.log(`✓ 6. GET /api/inventory/hubs?category=Water -> status ${hubInvRes.status}, items: ${hubInvRes.data.length}`);

  // Test 7: Camp Inventory
  const campInvRes = await request('GET', '/api/camps/camp-east-ridge/inventory');
  assert.strictEqual(campInvRes.status, 200, 'Camp inventory should return 200');
  assert.ok(Array.isArray(campInvRes.data), 'Camp inventory must return an array');
  console.log(`✓ 7. GET /api/camps/:campId/inventory -> status ${campInvRes.status}, rows: ${campInvRes.data.length}`);

  // Test 8: Log Camp Inventory & Verify Trigger Effect
  const logInvRes = await request('POST', '/api/camps/camp-east-ridge/inventory-logs', {
    item: 'Potable Water',
    category: 'Water',
    count: 3500,
    unit: 'liters',
  });
  assert.strictEqual(logInvRes.status, 201, 'Log inventory should return 201');
  assert.strictEqual(logInvRes.data.count, 3500, 'Logged count must match');
  // Trigger verification: East Ridge pop is 1300. Water 3500 >= 2600 (2.0L/person) and Food 700 >= 650 (0.5kg/person).
  // StatusLevel must be updated from 'Critical Level' to 'Normal'!
  const updatedCamp = db.prepare('SELECT StatusLevel FROM Relief_Camp WHERE CampID = ?').get('camp-east-ridge');
  assert.strictEqual(updatedCamp.StatusLevel, 'Normal', 'Trigger must update StatusLevel to Normal after buffer satisfied');
  console.log(`✓ 8. POST /api/camps/:campId/inventory-logs -> status ${logInvRes.status}, count: ${logInvRes.data.count} (Trigger updated camp status to: ${updatedCamp.StatusLevel})`);

  // Test 9: Volunteers
  const volRes = await request('GET', '/api/volunteers');
  assert.strictEqual(volRes.status, 200, 'Volunteers endpoint should return 200');
  assert.ok(Array.isArray(volRes.data), 'Volunteers must return an array');
  assert.strictEqual(volRes.data.length, 4, 'Seed data should have 4 volunteers');
  console.log(`✓ 9. GET /api/volunteers -> status ${volRes.status}, count: ${volRes.data.length}`);

  // Test 10: Create Supply Request
  const createReqRes = await request('POST', '/api/camps/camp-east-ridge/requests', {
    item: 'Potable Water',
    quantity: 1500,
    unit: 'liters',
    urgency: 'high',
  });
  assert.strictEqual(createReqRes.status, 201, 'Create request should return 201');
  assert.ok(createReqRes.data.id.startsWith('REQ-'), 'Request ID must start with REQ-');
  assert.strictEqual(createReqRes.data.status, 'pending', 'New request must be pending');
  console.log(`✓ 10. POST /api/camps/:campId/requests -> status ${createReqRes.status}, request: ${createReqRes.data.id}`);

  // Test 11: Dispatch with Explicit Before-and-After Inventory Assertion & Status Sync
  const invBefore = db.prepare('SELECT QuantityAvailable FROM Inventory WHERE ItemID = ?').get('inv-001');
  const volBefore = db.prepare('SELECT Availability FROM Volunteer WHERE VolunteerID = ?').get('vol-101');
  const reqBefore = db.prepare('SELECT Status FROM Request WHERE RequestID = ?').get('REQ-1048');

  assert.strictEqual(volBefore.Availability, 'available', 'Volunteer must initially be available');
  assert.strictEqual(reqBefore.Status, 'pending', 'Request must initially be pending');

  const dispatchRes = await request('POST', '/api/dispatches', {
    requestId: 'REQ-1048',
    volunteerId: 'vol-101',
  });
  assert.strictEqual(dispatchRes.status, 201, 'Valid dispatch should return 201');
  assert.ok(dispatchRes.data.dispatchId, 'Dispatch ID must be generated');

  const invAfter = db.prepare('SELECT QuantityAvailable FROM Inventory WHERE ItemID = ?').get('inv-001');
  const volAfter = db.prepare('SELECT Availability FROM Volunteer WHERE VolunteerID = ?').get('vol-101');
  const reqAfter = db.prepare('SELECT Status FROM Request WHERE RequestID = ?').get('REQ-1048');

  // REQ-1048 requested 3000 liters of Potable Water from inv-001
  assert.strictEqual(
    invAfter.QuantityAvailable,
    invBefore.QuantityAvailable - 3000,
    'Database trigger trg_deduct_inventory_stock must deduct dispatched quantity from Inventory'
  );
  assert.strictEqual(
    volAfter.Availability,
    'assigned',
    'Database trigger trg_dispatch_after_insert must mark Volunteer as assigned'
  );
  assert.strictEqual(
    reqAfter.Status,
    'in_transit',
    'Database trigger trg_dispatch_after_insert must mark Request as in_transit'
  );
  console.log(`✓ 11. POST /api/dispatches (Valid) -> status ${dispatchRes.status}, dispatchId: ${dispatchRes.data.dispatchId}`);
  console.log(`     Trigger Verification: Stock deducted (${invBefore.QuantityAvailable} -> ${invAfter.QuantityAvailable}), Volunteer vol-101 assigned, Request REQ-1048 in_transit.`);

  // Test 12: Dispatch Conflict Test (Volunteer double-booking trigger)
  const conflictRes = await request('POST', '/api/dispatches', {
    requestId: 'REQ-1049',
    volunteerId: 'vol-101', // vol-101 was just assigned in Test 11!
  });
  assert.strictEqual(conflictRes.status, 409, 'Double booking an assigned volunteer must return 409 Conflict');
  assert.match(
    conflictRes.data.message,
    /already assigned/i,
    'Error message must indicate volunteer is already assigned'
  );
  console.log(`✓ 12. POST /api/dispatches (Double Booking Conflict) -> status ${conflictRes.status} (${conflictRes.data.message})`);

  // Test 13: Request Fulfillment Trigger Verification
  let triggerBlocked = false;
  try {
    // Attempting to mark a request fulfilled that has NO matching dispatch
    db.prepare("UPDATE Request SET Status = 'fulfilled' WHERE RequestID = 'REQ-1049'").run();
  } catch (err) {
    triggerBlocked = true;
    assert.match(err.message, /Request cannot be marked fulfilled without a matching dispatch/);
  }
  assert.ok(triggerBlocked, 'Trigger trg_verify_request_fulfillment must abort fulfilling a request with no dispatch');
  console.log('✓ 13. Trigger trg_verify_request_fulfillment: Blocked invalid status change to fulfilled without dispatch');

  // Test 14: Execute and Validate Analytical SQL Queries from database/queries.sql
  console.log('\n--- Validating Database Queries (database/queries.sql) ---');
  const queriesSql = fs.readFileSync(path.join(__dirname, '../database/queries.sql'), 'utf-8');
  const queries = queriesSql
    .split(';')
    .map((q) => q.trim())
    .filter((q) => q.length > 0);

  const queryDescriptions = [
    'Nearest Hub Matching with Distance & ETA',
    'Camp 24-Hour Buffer Deficit Calculation',
    'Hub Low Stock & Shelf-Life Expiry Alerts',
    'Volunteer Roster & Active Dispatches',
    'End-to-End Delivery Traceability',
  ];

  assert.strictEqual(queries.length, 5, 'queries.sql must contain exactly 5 analytical queries');

  for (let i = 0; i < queries.length; i++) {
    const result = db.prepare(queries[i]).all();
    assert.ok(Array.isArray(result), `Query ${i + 1} must return an array`);
    assert.ok(result.length > 0, `Query ${i + 1} (${queryDescriptions[i]}) must return rows with seed data`);
    console.log(`✓ SQL Query ${i + 1} (${queryDescriptions[i]}): executed successfully (${result.length} rows)`);
  }

  console.log('\n=============================================================');
  console.log('✓ ALL 14 TESTS & 5 DATABASE QUERIES PASSED STRICT ASSERTIONS!');
  console.log('=============================================================\n');
  process.exit(0);
}

runTests().catch((err) => {
  console.error('\n❌ Test failed assertion:', err);
  process.exit(1);
});
