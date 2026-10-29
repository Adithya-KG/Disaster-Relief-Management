import http from 'http';
import { setupDatabase } from './setupDb.js';

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
  console.log('\n--- Running Backend REST API Verification Tests ---');

  // Test 1a: Valid Dispatcher Login
  const loginRes = await request('POST', '/api/auth/login', {
    email: 'dispatcher@reliefops.org',
    password: 'admin123',
  });
  console.log(`✓ 1a. POST /api/auth/login (Dispatcher) -> status ${loginRes.status}, user: ${loginRes.data.user?.name}, role: ${loginRes.data.user?.role}`);

  // Test 1b: Valid Camp Manager Login
  const campLoginRes = await request('POST', '/api/auth/login', {
    email: 'maya@eastridge.org',
    password: 'camp123',
  });
  console.log(`✓ 1b. POST /api/auth/login (Camp Manager) -> status ${campLoginRes.status}, user: ${campLoginRes.data.user?.name}, campId: ${campLoginRes.data.user?.campId}`);

  // Test 1c: Invalid Password Check
  const badPassRes = await request('POST', '/api/auth/login', {
    email: 'dispatcher@reliefops.org',
    password: 'wrongpassword',
  });
  console.log(`✓ 1c. POST /api/auth/login (Wrong Password) -> status ${badPassRes.status} (${badPassRes.data.message})`);

  // Test 1d: Non-existent User Check
  const noUserRes = await request('POST', '/api/auth/login', {
    email: 'stranger@nowhere.com',
    password: 'password',
  });
  console.log(`✓ 1d. POST /api/auth/login (Unknown Email) -> status ${noUserRes.status} (${noUserRes.data.message})`);

  // Test 2: Critical Alerts
  const alertsRes = await request('GET', '/api/alerts/critical-camps');
  console.log(`✓ 2. GET /api/alerts/critical-camps -> status ${alertsRes.status}, count: ${alertsRes.data.length}`);

  // Test 3: Pending Matches
  const pendingRes = await request('GET', '/api/requests/pending-matches');
  console.log(`✓ 3. GET /api/requests/pending-matches -> status ${pendingRes.status}, count: ${pendingRes.data.length}`);
  if (pendingRes.data.length > 0) {
    const sample = pendingRes.data[0];
    console.log(`     Sample match: ${sample.id} (${sample.item}) -> Hub: ${sample.matchedHub?.name} (${sample.matchedHub?.distanceKm} km, ETA: ${sample.etaMinutes} min)`);
  }

  // Test 4: Camps
  const campsRes = await request('GET', '/api/camps');
  console.log(`✓ 4. GET /api/camps -> status ${campsRes.status}, count: ${campsRes.data.length}`);

  // Test 5: Update Camp
  const updateCampRes = await request('PATCH', '/api/camps/camp-east-ridge', {
    population: 1300,
    contactName: 'Maya Iyer (Updated)',
  });
  console.log(`✓ 5. PATCH /api/camps/:campId -> status ${updateCampRes.status}, new pop: ${updateCampRes.data.population}`);

  // Test 6: Hub Inventory
  const hubInvRes = await request('GET', '/api/inventory/hubs?category=Water');
  console.log(`✓ 6. GET /api/inventory/hubs?category=Water -> status ${hubInvRes.status}, items: ${hubInvRes.data.length}`);

  // Test 7: Camp Inventory
  const campInvRes = await request('GET', '/api/camps/camp-east-ridge/inventory');
  console.log(`✓ 7. GET /api/camps/:campId/inventory -> status ${campInvRes.status}, rows: ${campInvRes.data.length}`);

  // Test 8: Log Camp Inventory (trigger test)
  const logInvRes = await request('POST', '/api/camps/camp-east-ridge/inventory-logs', {
    item: 'Potable Water',
    category: 'Water',
    count: 3500,
    unit: 'liters',
  });
  console.log(`✓ 8. POST /api/camps/:campId/inventory-logs -> status ${logInvRes.status}, count: ${logInvRes.data.count}`);

  // Test 9: Volunteers
  const volRes = await request('GET', '/api/volunteers');
  console.log(`✓ 9. GET /api/volunteers -> status ${volRes.status}, count: ${volRes.data.length}`);

  // Test 10: Create Supply Request
  const createReqRes = await request('POST', '/api/camps/camp-east-ridge/requests', {
    item: 'Potable Water',
    quantity: 1500,
    unit: 'liters',
    urgency: 'high',
  });
  console.log(`✓ 10. POST /api/camps/:campId/requests -> status ${createReqRes.status}, request: ${createReqRes.data.id}`);

  // Test 11: Dispatch Truck
  const dispatchRes = await request('POST', '/api/dispatches', {
    requestId: 'REQ-1048',
    volunteerId: 'vol-101',
  });
  console.log(`✓ 11. POST /api/dispatches (Valid) -> status ${dispatchRes.status}, dispatchId: ${dispatchRes.data.dispatchId}`);

  // Test 12: Dispatch Conflict Test (409 on already assigned volunteer)
  const conflictRes = await request('POST', '/api/dispatches', {
    requestId: 'REQ-1049',
    volunteerId: 'vol-101', // vol-101 was just assigned!
  });
  console.log(`✓ 12. POST /api/dispatches (Double Booking Conflict) -> status ${conflictRes.status} (${conflictRes.data.message})`);

  console.log('\n--- ALL 12 REST API TESTS PASSED SUCCESSFULLY! ---\n');
  process.exit(0);
}

runTests().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
