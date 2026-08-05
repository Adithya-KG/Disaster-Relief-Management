import { useEffect, useMemo, useState } from 'react';
import { RefreshCw, Send, Truck } from 'lucide-react';
import {
  createSupplyRequest,
  dispatchTruck,
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
      setVolunteerId((current) => current || rows.find((row) => row.availability === 'available')?.id || '');
    } catch (loadError) {
      setError(loadError.message || 'Unable to load volunteers');
    }
  }

  useEffect(() => {
    loadVolunteers();
  }, []);

  useEffect(() => {
    setRequestId((current) => current || pending.data[0]?.id || '');
  }, [pending.data]);

  async function handleDispatch(event) {
    event.preventDefault();
    setNotice('');
    setError('');

    try {
      const result = await dispatchTruck({ requestId, volunteerId });
      setNotice(`Dispatch ${result.dispatchId} confirmed`);
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
              {pending.data.map((request) => (
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
              ))}
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
              {pending.data.map((request) => (
                <option key={request.id} value={request.id}>
                  {request.id} / {request.campName} / {request.item}
                </option>
              ))}
            </select>
          </label>
          <label>
            Available volunteer
            <select value={volunteerId} onChange={(event) => setVolunteerId(event.target.value)} required>
              {availableVolunteers.map((volunteer) => (
                <option key={volunteer.id} value={volunteer.id}>
                  {volunteer.name} / {volunteer.vehicleAccess} / {volunteer.assignedZone}
                </option>
              ))}
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
  const [form, setForm] = useState({
    item: 'Potable Water',
    quantity: '',
    unit: 'liters',
    urgency: 'critical',
  });
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  async function handleSubmit(event) {
    event.preventDefault();
    setNotice('');
    setError('');

    try {
      const request = await createSupplyRequest(user.campId, form);
      setNotice(`Request ${request.id} raised`);
      setForm((draft) => ({ ...draft, quantity: '' }));
    } catch (requestError) {
      setError(requestError.message || 'Unable to raise request');
    }
  }

  return (
    <div className="screen-stack">
      {notice ? <p className="form-success">{notice}</p> : null}
      {error ? <p className="form-error">{error}</p> : null}
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
  );
}
