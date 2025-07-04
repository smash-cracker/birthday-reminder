import React from 'react';

/* ---------- helper: show YYYY‑MM‑DD ----------------- */
function toDateDisplay(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  // normalise to local‑date (no TZ shift)
  const tzOffset = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tzOffset).toISOString().slice(0, 10);
}

/* ---------- helper: days until next birthday -------- */
function daysUntilNextBirthday(dateStr) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);                      // midnight
  const birthday = new Date(dateStr);
  birthday.setHours(0, 0, 0, 0);
  birthday.setFullYear(today.getFullYear());       // start with this year

  // if it already passed, roll forward to next year
  if (birthday < today) {
    birthday.setFullYear(today.getFullYear() + 1);
  }

  const diffMs = birthday - today;                 // milliseconds
  return Math.round(diffMs / 86_400_000);          // convert to days
}

function BirthdayTable({ birthdays, onDelete, onEdit }) {
  /* -------- sort by “days until next birthday” ------ */
  const sortedBirthdays = [...birthdays].sort(
    (a, b) => daysUntilNextBirthday(a.date) - daysUntilNextBirthday(b.date)
  );

  return (
    <div className="birthday-table">
      <h2>Upcoming Birthdays</h2>
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Date</th>
            <th>Email</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {sortedBirthdays.map((b) => (
            <tr key={b.id}>
              <td>{b.name}</td>
              <td>{toDateDisplay(b.date)}</td>
              <td>{b.email}</td>
              <td>
                <span
                  className={`status ${b.status === 'Sent' ? 'sent' : 'not-sent'}`}
                >
                  {b.status}
                </span>
              </td>
              <td>
                <button
                  onClick={() => onEdit(b)}
                  title="Edit"
                  style={{
                    cursor: 'pointer',
                    marginRight: '0.5rem',
                    background: 'none',
                    border: 'none',
                    fontSize: '1.1rem',
                  }}
                >
                  ✏️
                </button>
                <button
                  onClick={() => onDelete(b.id)}
                  title="Delete"
                  style={{
                    cursor: 'pointer',
                    background: 'none',
                    border: 'none',
                    fontSize: '1.1rem',
                  }}
                >
                  🗑️
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default BirthdayTable;
