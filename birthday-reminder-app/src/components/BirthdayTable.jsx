import React from 'react';

function BirthdayTable({ birthdays, onDelete, onEdit }) {
  return (
    <div className="birthday-table">
      <h2>Upcoming Birthdays</h2>
      <table>
        <thead>
          <tr>
            <th>Name</th><th>Date</th><th>Email</th><th>Status</th><th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {birthdays.map((b) => (
            <tr key={b.id}>
              <td>{b.name}</td>
              <td>{b.date}</td>
              <td>{b.email}</td>
              <td>
                <span className={`status ${b.status === 'Sent' ? 'sent' : 'not-sent'}`}>
                  {b.status}
                </span>
              </td>
              <td>
                <button
                  onClick={() => onEdit(b)}
                  title="Edit"
                  style={{ cursor: 'pointer', marginRight: '0.5rem', background: 'none', border: 'none', fontSize: '1.1rem' }}
                >✏️</button>
                <button
                  onClick={() => onDelete(b.id)}
                  title="Delete"
                  style={{ cursor: 'pointer', background: 'none', border: 'none', fontSize: '1.1rem' }}
                >🗑️</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default BirthdayTable;
