import {
  mockCampInventory,
  mockCamps,
  mockHubInventory,
  mockPendingRequestMatches,
  mockVolunteers,
} from '../data/mockData';

const API_BASE_URL = import.meta.env.VITE_API_URL?.replace(/\/$/, '') || '';
const USE_MOCKS = !API_BASE_URL;
const NETWORK_DELAY_MS = 240;

let camps = structuredClone(mockCamps);
let campInventory = structuredClone(mockCampInventory);
let pendingRequestMatches = structuredClone(mockPendingRequestMatches);
let volunteers = structuredClone(mockVolunteers);

const delay = (value) =>
  new Promise((resolve) => {
    window.setTimeout(() => resolve(structuredClone(value)), NETWORK_DELAY_MS);
  });

async function http(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(payload.message || `Request failed with ${response.status}`);
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  return payload;
}

export function isMockApi() {
  return USE_MOCKS;
}

export async function login({ email, role, campId }) {
  if (!USE_MOCKS) {
    return http('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, role, campId }),
    });
  }

  return delay({
    token: 'mock-session-token',
    user: {
      id: role === 'dispatcher' ? 'user-dispatcher' : 'user-camp-manager',
      name: role === 'dispatcher' ? 'Ops Dispatcher' : 'Camp Manager',
      email,
      role,
      campId: role === 'camp_manager' ? campId || camps[0].id : null,
    },
  });
}

export async function getCriticalAlerts() {
  if (!USE_MOCKS) {
    // TODO: Wire to backend DB-trigger result endpoint.
    return http('/alerts/critical-camps');
  }

  return delay(camps.filter((camp) => camp.status === 'Critical Level'));
}

export async function getPendingRequestMatches() {
  if (!USE_MOCKS) {
    // TODO: Backend should return pending requests with nearest stocked hub already matched.
    return http('/requests/pending-matches');
  }

  return delay(pendingRequestMatches.filter((request) => request.status === 'pending'));
}

export async function getCamps({ role, campId } = {}) {
  if (!USE_MOCKS) {
    const query = role === 'camp_manager' && campId ? `?campId=${campId}` : '';
    return http(`/camps${query}`);
  }

  if (role === 'camp_manager' && campId) {
    return delay(camps.filter((camp) => camp.id === campId));
  }

  return delay(camps);
}

export async function updateCamp(campId, updates) {
  if (!USE_MOCKS) {
    return http(`/camps/${campId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  }

  camps = camps.map((camp) =>
    camp.id === campId
      ? {
          ...camp,
          ...updates,
          population: Number(updates.population),
          lastUpdated: new Date().toISOString(),
        }
      : camp,
  );

  return delay(camps.find((camp) => camp.id === campId));
}

export async function getHubInventory(filters = {}) {
  if (!USE_MOCKS) {
    const params = new URLSearchParams(
      Object.entries(filters).filter(([, value]) => value && value !== 'all'),
    );
    const suffix = params.toString() ? `?${params.toString()}` : '';
    return http(`/inventory/hubs${suffix}`);
  }

  const rows = mockHubInventory.filter((row) => {
    const categoryMatch = !filters.category || filters.category === 'all' || row.category === filters.category;
    const shelfLifeMatch =
      !filters.shelfLife || filters.shelfLife === 'all' || row.shelfLife === filters.shelfLife;
    return categoryMatch && shelfLifeMatch;
  });

  return delay(rows);
}

export async function getCampInventory(campId) {
  if (!USE_MOCKS) {
    return http(`/camps/${campId}/inventory`);
  }

  return delay(campInventory.filter((row) => row.campId === campId));
}

export async function logCampInventory(campId, payload) {
  if (!USE_MOCKS) {
    return http(`/camps/${campId}/inventory-logs`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  const nextRow = {
    id: `camp-inv-${Date.now()}`,
    campId,
    item: payload.item,
    category: payload.category,
    count: Number(payload.count),
    unit: payload.unit,
    lastLogged: new Date().toISOString(),
  };
  campInventory = [nextRow, ...campInventory.filter((row) => !(row.campId === campId && row.item === payload.item))];

  return delay(nextRow);
}

export async function getVolunteers() {
  if (!USE_MOCKS) {
    return http('/volunteers');
  }

  return delay(volunteers);
}

export async function createSupplyRequest(campId, payload) {
  if (!USE_MOCKS) {
    return http(`/camps/${campId}/requests`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  const camp = camps.find((entry) => entry.id === campId);
  const nextRequest = {
    id: `REQ-${Math.floor(1100 + Math.random() * 800)}`,
    campId,
    campName: camp?.name || 'Assigned Camp',
    item: payload.item,
    quantity: Number(payload.quantity),
    unit: payload.unit,
    urgency: payload.urgency,
    status: 'pending',
    createdAt: new Date().toISOString(),
    matchedHub: {
      id: 'hub-east',
      name: 'Pending hub match',
      distanceKm: null,
      availableStock: null,
    },
    etaMinutes: null,
  };
  pendingRequestMatches = [nextRequest, ...pendingRequestMatches];

  return delay(nextRequest);
}

export async function dispatchTruck({ requestId, volunteerId }) {
  if (!USE_MOCKS) {
    return http('/dispatches', {
      method: 'POST',
      body: JSON.stringify({ requestId, volunteerId }),
    });
  }

  const volunteer = volunteers.find((entry) => entry.id === volunteerId);
  if (!volunteer || volunteer.availability === 'assigned') {
    const error = new Error('Volunteer already assigned. Select another available volunteer.');
    error.status = 409;
    throw error;
  }

  pendingRequestMatches = pendingRequestMatches.map((request) =>
    request.id === requestId ? { ...request, status: 'in_transit' } : request,
  );
  volunteers = volunteers.map((entry) =>
    entry.id === volunteerId
      ? { ...entry, availability: 'assigned', assignedRequestId: requestId }
      : entry,
  );

  return delay({
    dispatchId: `DSP-${Date.now()}`,
    requestId,
    volunteerId,
    status: 'in_transit',
  });
}
