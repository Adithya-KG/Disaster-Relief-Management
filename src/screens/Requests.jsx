import { useEffect, useMemo, useState } from 'react';
import { RefreshCw, Send, Truck } from 'lucide-react';
import {
  createSupplyRequest,
  dispatchTruck,
  getCampRequests,
  getPendingRequestMatches,
  getVolunteers,
} from '../api/client';
import StatusBadge from '../components/StatusBadge.jsx';
import { usePolling } from '../hooks/usePolling';

export default function Requests({ user }) {
  if (user.role === 'dispatcher') {
    return <DispatchRequests />;
  }

  return <CampRequests user={user} />;
}

function DispatchRequests() {
  const pending = usePolling(getPendingRequestMatches, 20000, true);
  const [volunteers, setVolunteers] = useState([]);
  const [requestId, setRequestId] = useState('');
  const [volunteerId, setVolunteerId] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const availableVolunteers = useMemo(
    () => volunteers.filter((volunteer) => volunteer.availability === 'available'),
    [volunteers],
  );

  async function loadVolunteers() {
    setError('');
    try {
      const rows = await getVolunteers();
      setVolunteers(rows);
    } catch (loadError) {
      setError(loadError.message || 'Unable to load volunteers');
    }
  }

  useEffect(() => {
    loadVolunteers();
  }, []);

  // Synchronize requestId with available pending items
  useEffect(() => {
    if (!pending.data.some((req) => req.id === requestId)) {
      setRequestId(pending.data[0]?.id || '');
    }
  }, [pending.data, requestId]);

  // Synchronize volunteerId with available volunteers
  useEffect(() => {
    if (!availableVolunteers.some((vol) => vol.id === volunteerId)) {
      setVolunteerId(availableVolunteers[0]?.id || '');
    }
  }, [availableVolunteers, volunteerId]);

  async function handleDispatch(event) {
    event.preventDefault();
    setNotice('');
    setError('');

    try {
      const result = await dispatchTruck({ requestId, volunteerId });
      setNotice(`✓ Dispatch ${result.dispatchId} confirmed: Request ${requestId} marked in-transit & stock deducted.`);
      setRequestId('');
      setVolunteerId('');
      await Promise.all([pending.refresh(), loadVolunteers()]);
    } catch (dispatchError) {
      if (dispatchError.status === 409) {
        setError(dispatchError.message || 'Volunteer already assigned. Select another available volunteer.');
        loadVolunteers();
        return;
      }

      setError(dispatchError.message || 'Unable to confirm dispatch');
    }
  }

  return (
    <div className="screen-stack">
      {notice ? <p className="form-success">{notice}</p> : null}
      {error || pending.error ? <p className="form-error">{error || pending.error}</p> : null}

      <section className="panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Queue</p>
            <h2>Matched Pending Requests</h2>
          </div>
          <button className="icon-button" onClick={pending.refresh} title="Refresh pending requests" type="button">
            <RefreshCw size={16} aria-hidden="true" />
          </button>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Request</th>
                <th>Camp</th>
                <th>Item</th>
                <th>Urgency</th>
                <th>Matched hub</th>
                <th>Stock</th>
                <th>ETA</th>
              </tr>
            </thead>
            <tbody>
              {pending.data.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', color: 'var(--muted)', padding: '2rem' }}>
                    No pending requests in queue.
                  </td>
                </tr>
              ) : (
                pending.data.map((request) => (
                  <tr key={request.id}>
                    <td>
                      <strong>{request.id}</strong>
                    </td>
                    <td>{request.campName}</td>
                    <td>
                      {request.quantity.toLocaleString()} {request.unit} {request.item}
                    </td>
                    <td>
                      <StatusBadge value={request.urgency} />
                    </td>
                    <td>{request.matchedHub?.name || 'Unmatched'}</td>
                    <td>
                      {request.matchedHub?.availableStock
                        ? request.matchedHub.availableStock.toLocaleString()
                        : 'Pending'}
                    </td>
                    <td>{request.etaMinutes ? `${request.etaMinutes} min` : 'Pending'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Truck Assignment</p>
            <h2>Dispatch Truck</h2>
          </div>
          <Truck size={18} aria-hidden="true" />
        </div>
        <form className="form-grid" onSubmit={handleDispatch}>
          <label>
            Pending request
            <select value={requestId} onChange={(event) => setRequestId(event.target.value)} required>
              {pending.data.length === 0 ? (
                <option value="">No pending requests</option>
              ) : (
                pending.data.map((request) => (
                  <option key={request.id} value={request.id}>
                    {request.id} / {request.campName} / {request.item} ({request.quantity.toLocaleString()} {request.unit})
                  </option>
                ))
              )}
            </select>
          </label>
          <label>
            Available volunteer
            <select value={volunteerId} onChange={(event) => setVolunteerId(event.target.value)} required>
              {availableVolunteers.length === 0 ? (
                <option value="">No available volunteers</option>
              ) : (
                availableVolunteers.map((volunteer) => (
                  <option key={volunteer.id} value={volunteer.id}>
                    {volunteer.name} / {volunteer.vehicleAccess} / Zone {volunteer.assignedZone}
                  </option>
                ))
              )}
            </select>
          </label>
          <button className="primary-action span-2" disabled={!requestId || !volunteerId} type="submit">
            <Send size={16} aria-hidden="true" />
            Confirm Dispatch
          </button>
        </form>
      </section>
    </div>
  );
}

function CampRequests({ user }) {
  const [requests, setRequests] = useState([]);
  const [form, setForm] = useState({
    item: 'Potable Water',
    quantity: '',
    unit: 'liters',
    urgency: 'critical',
  });
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  async function load() {
    try {
      const rows = await getCampRequests(user.campId);
      setRequests(rows);
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.campId]);

  async function handleSubmit(event) {
    event.preventDefault();
    setNotice('');
    setError('');

    try {
      const request = await createSupplyRequest(user.campId, form);
      setNotice(`✓ Request ${request.id} raised successfully`);
      setForm((draft) => ({ ...draft, quantity: '' }));
      load();
    } catch (requestError) {
      setError(requestError.message || 'Unable to raise request');
    }
  }

  return (
    <div className="screen-stack">
      {notice ? <p className="form-success">{notice}</p> : null}
      {error ? <p className="form-error">{error}</p> : null}

      <div className="split-grid split-narrow">
        <section className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Camp Requests</p>
              <h2>Request History</h2>
            </div>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Request ID</th>
                  <th>Item</th>
                  <th>Quantity</th>
                  <th>Urgency</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {requests.length === 0 ? (
                  <tr>
                    <td colSpan="5" style={{ textAlign: 'center', color: 'var(--muted)', padding: '1.5rem' }}>
                      No requests recorded for this camp.
                    </td>
                  </tr>
                ) : (
                  requests.map((req) => (
                    <tr key={req.id}>
                      <td>
                        <strong>{req.id}</strong>
                      </td>
                      <td>{req.item}</td>
                      <td>
                        {Number(req.quantity).toLocaleString()} {req.unit}
                      </td>
                      <td>
                        <StatusBadge value={req.urgency} />
                      </td>
                      <td>
                        <StatusBadge value={req.status} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Supply Request</p>
              <h2>Raise Urgent Request</h2>
            </div>
          </div>
          <form className="form-grid" onSubmit={handleSubmit}>
            <label>
              Item
              <input
                value={form.item}
                onChange={(event) => setForm((draft) => ({ ...draft, item: event.target.value }))}
                required
              />
            </label>
            <label>
              Quantity
              <input
                min="1"
                type="number"
                value={form.quantity}
                onChange={(event) => setForm((draft) => ({ ...draft, quantity: event.target.value }))}
                required
              />
            </label>
            <label>
              Unit
              <input
                value={form.unit}
                onChange={(event) => setForm((draft) => ({ ...draft, unit: event.target.value }))}
                required
              />
            </label>
            <label>
              Urgency
              <select value={form.urgency} onChange={(event) => setForm((draft) => ({ ...draft, urgency: event.target.value }))}>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
              </select>
            </label>
            <button className="primary-action span-2" type="submit">
              <Send size={16} aria-hidden="true" />
              Raise Request
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
