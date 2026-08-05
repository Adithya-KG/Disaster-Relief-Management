import { useEffect, useState } from 'react';
import { getVolunteers } from '../api/client';
import StatusBadge from '../components/StatusBadge.jsx';

export default function Volunteers() {
  const [volunteers, setVolunteers] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;

    async function load() {
      setError('');
      try {
        const rows = await getVolunteers();
        if (isMounted) {
          setVolunteers(rows);
        }
      } catch (loadError) {
        setError(loadError.message || 'Unable to load volunteers');
      }
    }

    load();
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="screen-stack">
      {error ? <p className="form-error">{error}</p> : null}
      <section className="panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Roster</p>
            <h2>Volunteer Availability</h2>
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Skills</th>
                <th>Vehicle</th>
                <th>Zone</th>
                <th>Availability</th>
                <th>Assignment</th>
              </tr>
            </thead>
            <tbody>
              {volunteers.map((volunteer) => (
                <tr key={volunteer.id}>
                  <td>
                    <strong>{volunteer.name}</strong>
                  </td>
                  <td>
                    <div className="tag-row">
                      {volunteer.skills.map((skill) => (
                        <span className="tag" key={skill}>
                          {skill}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td>{volunteer.vehicleAccess}</td>
                  <td>{volunteer.assignedZone}</td>
                  <td>
                    <StatusBadge value={volunteer.availability} />
                  </td>
                  <td>{volunteer.assignedRequestId || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
