import { useCallback, useEffect, useMemo, useState } from 'react';
import { Filter, Plus } from 'lucide-react';
import { getCampInventory, getCamps, getHubInventory, logCampInventory } from '../api/client';
import StatusBadge from '../components/StatusBadge.jsx';

const categoryOptions = ['all', 'Water', 'Food', 'Medical', 'Shelter'];
const shelfLifeOptions = ['all', 'Short', 'Medium', 'Long'];

export default function Inventory({ user }) {
  if (user.role === 'dispatcher') {
    return <HubInventory />;
  }

  return <CampInventory user={user} />;
}

function HubInventory() {
  const [category, setCategory] = useState('all');
  const [shelfLife, setShelfLife] = useState('all');
  const [rows, setRows] = useState([]);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const result = await getHubInventory({ category, shelfLife });
      setRows(result);
    } catch (loadError) {
      setError(loadError.message || 'Unable to load hub inventory');
    }
  }, [category, shelfLife]);

  useEffect(() => {
    load();
  }, [load]);

  const grouped = useMemo(
    () =>
      rows.reduce((groups, row) => {
        groups[row.hubName] = groups[row.hubName] || [];
        groups[row.hubName].push(row);
        return groups;
      }, {}),
    [rows],
  );

  return (
    <div className="screen-stack">
      <section className="toolbar-panel">
        <div className="toolbar-title">
          <Filter size={16} aria-hidden="true" />
          <span>Filters</span>
        </div>
        <label>
          Category
          <select value={category} onChange={(event) => setCategory(event.target.value)}>
            {categoryOptions.map((option) => (
              <option key={option} value={option}>
                {option === 'all' ? 'All' : option}
              </option>
            ))}
          </select>
        </label>
        <label>
          Shelf life
          <select value={shelfLife} onChange={(event) => setShelfLife(event.target.value)}>
            {shelfLifeOptions.map((option) => (
              <option key={option} value={option}>
                {option === 'all' ? 'All' : option}
              </option>
            ))}
          </select>
        </label>
      </section>

      {error ? <p className="form-error">{error}</p> : null}

      {Object.entries(grouped).map(([hubName, hubRows]) => (
        <section className="panel" key={hubName}>
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Supply Hub</p>
              <h2>{hubName}</h2>
            </div>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Category</th>
                  <th>Shelf life</th>
                  <th>Stock</th>
                  <th>Expiry</th>
                  <th>Level</th>
                </tr>
              </thead>
              <tbody>
                {hubRows.map((row) => {
                  const level =
                    row.stock <= row.criticalThreshold ? 'critical' : row.stock <= row.threshold ? 'high' : 'Normal';
                  return (
                    <tr key={row.id}>
                      <td>{row.item}</td>
                      <td>{row.category}</td>
                      <td>{row.shelfLife}</td>
                      <td>
                        <strong>{row.stock.toLocaleString()}</strong> {row.unit}
                      </td>
                      <td>{row.expiry}</td>
                      <td>
                        <StatusBadge value={level} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </div>
  );
}

function CampInventory({ user }) {
  const [rows, setRows] = useState([]);
  const [camp, setCamp] = useState(null);
  const [form, setForm] = useState({
    item: 'Potable Water',
    category: 'Water',
    count: '',
    unit: 'liters',
  });
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  async function load() {
    setError('');
    try {
      const [result, campList] = await Promise.all([
        getCampInventory(user.campId),
        getCamps({ role: user.role, campId: user.campId }),
      ]);
      setRows(result);
      if (campList && campList.length > 0) {
        setCamp(campList[0]);
      }
    } catch (loadError) {
      setError(loadError.message || 'Unable to load camp inventory');
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.campId]);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setNotice('');

    try {
      const res = await logCampInventory(user.campId, form);
      setForm((draft) => ({ ...draft, count: '' }));
      const newStatus = res?.campStatus || 'Normal';
      setNotice(
        newStatus === 'Normal'
          ? '✓ Inventory logged! 24-hr buffer requirement satisfied. Camp status updated to Normal.'
          : '✓ Inventory logged successfully.'
      );
      await load();
    } catch (saveError) {
      setError(saveError.message || 'Unable to log inventory');
    }
  }

  return (
    <div className="screen-stack">
      {/* Camp Status & 24-Hour Buffer Monitor */}
      {camp ? (
        <section className={camp.status === 'Critical Level' ? 'panel alert-panel' : 'panel'}>
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Assigned Camp Buffer Monitor</p>
              <h2>{camp.name}</h2>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span style={{ fontSize: '0.9rem', color: 'var(--muted)' }}>Camp Status:</span>
              <StatusBadge value={camp.status} />
            </div>
          </div>
          <div className="detail-grid">
            <div>
              <span>Population</span>
              <strong>{camp.population?.toLocaleString()} people</strong>
            </div>
            <div>
              <span>Water Target (2L/day)</span>
              <strong>{(camp.population * 2)?.toLocaleString()} liters</strong>
            </div>
            <div>
              <span>Food Target (0.5kg/day)</span>
              <strong>{(camp.population * 0.5)?.toLocaleString()} kg</strong>
            </div>
            <div>
              <span>24-Hour Buffer Trigger</span>
              <strong style={{ color: camp.status === 'Critical Level' ? 'var(--critical)' : 'var(--calm)' }}>
                {camp.status === 'Critical Level' ? '⚠️ Critical Shortage' : '✓ Buffer Satisfied'}
              </strong>
            </div>
          </div>
        </section>
      ) : null}

      {error ? <p className="form-error">{error}</p> : null}
      {notice ? <p className="form-success">{notice}</p> : null}

      <div className="split-grid split-narrow">
        <section className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Camp Stock</p>
              <h2>Logged Inventory</h2>
            </div>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Category</th>
                  <th>Count</th>
                  <th>Last logged</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td>{row.item}</td>
                    <td>{row.category}</td>
                    <td>
                      <strong>{Number(row.count).toLocaleString()}</strong> {row.unit}
                    </td>
                    <td>{new Date(row.lastLogged).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Log Count</p>
              <h2>Inventory Entry</h2>
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
              Category
              <select
                value={form.category}
                onChange={(event) => setForm((draft) => ({ ...draft, category: event.target.value }))}
              >
                {categoryOptions.filter((option) => option !== 'all').map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Count
              <input
                min="0"
                type="number"
                value={form.count}
                onChange={(event) => setForm((draft) => ({ ...draft, count: event.target.value }))}
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
            <button className="primary-action span-2" type="submit">
              <Plus size={16} aria-hidden="true" />
              Log Inventory
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
