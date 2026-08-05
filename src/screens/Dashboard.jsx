import { AlertTriangle, RefreshCw } from 'lucide-react';
import {
  getCampInventory,
  getCamps,
  getCriticalAlerts,
  getPendingRequestMatches,
} from '../api/client';
import MetricCard from '../components/MetricCard.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import { usePolling } from '../hooks/usePolling';

export default function Dashboard({ user }) {
  if (user.role === 'dispatcher') {
    return <DispatcherDashboard />;
  }

  return <CampManagerDashboard user={user} />;
}

function DispatcherDashboard() {
  const critical = usePolling(getCriticalAlerts, 20000, true);
  const pending = usePolling(getPendingRequestMatches, 20000, true);

  const criticalCount = critical.data.length;
  const criticalPeople = critical.data.reduce((sum, camp) => sum + Number(camp.population || 0), 0);
  const criticalRequests = pending.data.filter((request) => request.urgency === 'critical').length;

  return (
    <div className="screen-stack">
      <section className="metric-grid">
        <MetricCard label="Critical camps" value={criticalCount} tone={criticalCount ? 'critical' : 'neutral'} />
        <MetricCard label="People in critical camps" value={criticalPeople.toLocaleString()} tone="warning" />
        <MetricCard label="Pending requests" value={pending.data.length} tone="neutral" />
        <MetricCard label="Critical requests" value={criticalRequests} tone={criticalRequests ? 'critical' : 'neutral'} />
      </section>

      <div className="split-grid">
        <section className="panel alert-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Trigger Feed</p>
              <h2>Critical Level Camps</h2>
            </div>
            <button className="icon-button" onClick={critical.refresh} title="Refresh critical camps" type="button">
              <RefreshCw size={16} aria-hidden="true" />
            </button>
          </div>
          {critical.error ? <p className="form-error">{critical.error}</p> : null}
          <div className="dense-list">
            {critical.data.map((camp) => (
              <article className="list-row critical-row" key={camp.id}>
                <div>
                  <strong>{camp.name}</strong>
                  <span>{camp.location}</span>
                </div>
                <div className="row-meta">
                  <StatusBadge value={camp.status} />
                  <strong>{camp.population.toLocaleString()}</strong>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Live Queue</p>
              <h2>Pending Request Matches</h2>
            </div>
            <button className="icon-button" onClick={pending.refresh} title="Refresh pending requests" type="button">
              <RefreshCw size={16} aria-hidden="true" />
            </button>
          </div>
          {pending.error ? <p className="form-error">{pending.error}</p> : null}
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Request</th>
                  <th>Camp</th>
                  <th>Item</th>
                  <th>Matched hub</th>
                  <th>ETA</th>
                </tr>
              </thead>
              <tbody>
                {pending.data.map((request) => (
                  <tr key={request.id}>
                    <td>
                      <strong>{request.id}</strong>
                      <StatusBadge value={request.urgency} />
                    </td>
                    <td>{request.campName}</td>
                    <td>
                      {request.quantity.toLocaleString()} {request.unit} {request.item}
                    </td>
                    <td>{request.matchedHub?.name || 'Unmatched'}</td>
                    <td>{request.etaMinutes ? `${request.etaMinutes} min` : 'Pending'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}

function CampManagerDashboard({ user }) {
  const camp = usePolling(() => getCamps({ role: user.role, campId: user.campId }), 25000, true, [user.campId]);
  const inventory = usePolling(() => getCampInventory(user.campId), 25000, true, [user.campId]);
  const assignedCamp = camp.data[0];

  return (
    <div className="screen-stack">
      <section className="metric-grid">
        <MetricCard
          label="Camp status"
          value={assignedCamp?.status || 'Loading'}
          tone={assignedCamp?.status === 'Critical Level' ? 'critical' : 'neutral'}
        />
        <MetricCard label="Population" value={(assignedCamp?.population || 0).toLocaleString()} tone="neutral" />
        <MetricCard label="Capacity" value={(assignedCamp?.capacity || 0).toLocaleString()} tone="neutral" />
        <MetricCard label="Logged items" value={inventory.data.length} tone="neutral" />
      </section>

      <section className={assignedCamp?.status === 'Critical Level' ? 'panel alert-panel' : 'panel'}>
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Assigned Camp</p>
            <h2>{assignedCamp?.name || 'Camp'}</h2>
          </div>
          {assignedCamp?.status === 'Critical Level' ? (
            <div className="alert-chip">
              <AlertTriangle size={16} aria-hidden="true" />
              Critical
            </div>
          ) : (
            <StatusBadge value="Normal" />
          )}
        </div>
        {camp.error ? <p className="form-error">{camp.error}</p> : null}
        <div className="detail-grid">
          <div>
            <span>Location</span>
            <strong>{assignedCamp?.location || '-'}</strong>
          </div>
          <div>
            <span>Contact</span>
            <strong>{assignedCamp ? `${assignedCamp.contactName} / ${assignedCamp.contactPhone}` : '-'}</strong>
          </div>
          <div>
            <span>Zone</span>
            <strong>{assignedCamp?.zone || '-'}</strong>
          </div>
          <div>
            <span>Last update</span>
            <strong>{assignedCamp ? new Date(assignedCamp.lastUpdated).toLocaleString() : '-'}</strong>
          </div>
        </div>
      </section>
    </div>
  );
}
