import { useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import { getCamps, updateCamp } from '../api/client';
import StatusBadge from '../components/StatusBadge.jsx';

export default function Camps({ user }) {
  const [camps, setCamps] = useState([]);
  const [selectedCampId, setSelectedCampId] = useState('');
  const [form, setForm] = useState({});
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const selectedCamp = camps.find((camp) => camp.id === selectedCampId);

  useEffect(() => {
    let isMounted = true;

    async function load() {
      setError('');
      try {
        const rows = await getCamps({ role: user.role, campId: user.campId });
        if (!isMounted) {
          return;
        }
        setCamps(rows);
        setSelectedCampId((current) => current || rows[0]?.id || '');
      } catch (loadError) {
        setError(loadError.message || 'Unable to load camps');
      }
    }

    load();
    return () => {
      isMounted = false;
    };
  }, [user.campId, user.role]);

  useEffect(() => {
    if (selectedCamp) {
      setForm({
        location: selectedCamp.location,
        population: selectedCamp.population,
        contactName: selectedCamp.contactName,
        contactPhone: selectedCamp.contactPhone,
      });
    }
  }, [selectedCamp]);

  async function handleSubmit(event) {
    event.preventDefault();
    setNotice('');
    setError('');

    try {
      const updated = await updateCamp(selectedCampId, form);
      setCamps((rows) => rows.map((camp) => (camp.id === updated.id ? updated : camp)));
      setNotice('Camp updated');
    } catch (saveError) {
      setError(saveError.message || 'Unable to update camp');
    }
  }

  return (
    <div className="screen-stack">
      {error ? <p className="form-error">{error}</p> : null}
      {notice ? <p className="form-success">{notice}</p> : null}

      <div className="split-grid split-narrow">
        <section className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">{user.role === 'dispatcher' ? 'All Camps' : 'Assigned Camp'}</p>
              <h2>Camp Registry</h2>
            </div>
          </div>
          <div className="dense-list">
            {camps.map((camp) => (
              <button
                className={camp.id === selectedCampId ? 'list-row camp-row selected-row' : 'list-row camp-row'}
                key={camp.id}
                onClick={() => setSelectedCampId(camp.id)}
                type="button"
              >
                <div>
                  <strong>{camp.name}</strong>
                  <span>{camp.location}</span>
                </div>
                <div className="row-meta">
                  <StatusBadge value={camp.status} />
                  <strong>{camp.population.toLocaleString()}</strong>
                </div>
              </button>
            ))}
          </div>
        </section>

        <section className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Detail</p>
              <h2>{selectedCamp?.name || 'Camp'}</h2>
            </div>
            {selectedCamp ? <StatusBadge value={selectedCamp.status} /> : null}
          </div>

          {selectedCamp ? (
            <form className="form-grid" onSubmit={handleSubmit}>
              <label className="span-2">
                Location
                <input
                  value={form.location || ''}
                  onChange={(event) => setForm((draft) => ({ ...draft, location: event.target.value }))}
                />
              </label>
              <label>
                Population
                <input
                  min="0"
                  type="number"
                  value={form.population || 0}
                  onChange={(event) => setForm((draft) => ({ ...draft, population: event.target.value }))}
                />
              </label>
              <label>
                Contact name
                <input
                  value={form.contactName || ''}
                  onChange={(event) => setForm((draft) => ({ ...draft, contactName: event.target.value }))}
                />
              </label>
              <label>
                Contact phone
                <input
                  value={form.contactPhone || ''}
                  onChange={(event) => setForm((draft) => ({ ...draft, contactPhone: event.target.value }))}
                />
              </label>
              <label>
                Zone
                <input disabled value={selectedCamp.zone} />
              </label>
              <button className="primary-action span-2" type="submit">
                <Save size={16} aria-hidden="true" />
                Save Camp
              </button>
            </form>
          ) : (
            <p className="empty-state">No camp selected</p>
          )}
        </section>
      </div>
    </div>
  );
}
