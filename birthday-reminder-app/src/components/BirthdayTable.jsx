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
  today.setHours(0, 0, 0, 0);
  const birthday = new Date(dateStr);
  birthday.setHours(0, 0, 0, 0);
  birthday.setFullYear(today.getFullYear());

  // if it already passed, roll forward to next year
  if (birthday < today) {
    birthday.setFullYear(today.getFullYear() + 1);
  }

  const diffMs = birthday - today;
  return Math.round(diffMs / 86_400_000);
}

function BirthdayTable({
  birthdays,
  onDelete,
  onEdit,
  search,
  setSearch,
  showForm,
  setShowForm,
  setEditing,
}) {
  const sortedBirthdays = [...birthdays].sort(
    (a, b) => daysUntilNextBirthday(a.date) - daysUntilNextBirthday(b.date)
  );

  // Insert handler
  const handleInsert = async () => {
    const name = prompt('Enter name:');
    if (!name) return;
    const dateInput = prompt('Enter date of birth (any format):');
    if (!dateInput) return;
    // Try to parse date
    const dateObj = new Date(dateInput);
    if (isNaN(dateObj.getTime())) {
      alert('Invalid date format.');
      return;
    }
    // Format as YYYY-MM-DD for backend
    const tzOffset = dateObj.getTimezoneOffset() * 60000;
    const date = new Date(dateObj.getTime() - tzOffset).toISOString().slice(0, 10);

    // Prompt for email (required for backend)
    const email = prompt('Enter email:');
    if (!email) return;

    // Send to backend
    await fetch('http://localhost:5000/api/birthdays', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, date, email }),
    });
    setSearch((s) => s + ' ');
  };

  // Unified file upload handler (CSV/TXT/SVG)
  const handleFileInsert = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      const text = evt.target.result;
      let entries = [];

      if (file.name.endsWith('.svg')) {
        // SVG: extract <text> nodes, expect comma-separated values
        const matches = [...text.matchAll(/<text[^>]*>([^<]*)<\/text>/g)];
        entries = matches.map((m) => m[1]);
      } else {
        entries = text.split('\n').map((l) => l.trim()).filter(Boolean);
      }

      for (const entry of entries) {
        const [name, dateInput, email] = entry.split(',').map((s) => s && s.trim());
        if (!name || !dateInput || !email) continue;
        const dateObj = new Date(dateInput);
        if (isNaN(dateObj.getTime())) continue;
        const tzOffset = dateObj.getTimezoneOffset() * 60000;
        const date = new Date(dateObj.getTime() - tzOffset).toISOString().slice(0, 10);
        await fetch('http://localhost:5000/api/birthdays', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, date, email }),
        });
      }
      setSearch((s) => s + ' ');
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="birthday-table">
      <div className="top-bar">
        <h2>Upcoming Birthdays</h2>
        <input
          className="search-input"
          placeholder="Search..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {!showForm && (
          <button
            className="add-btn"
            onClick={() => {
              setEditing(null);
              setShowForm(true);
            }}
          >
            Add
          </button>
        )}
        <label
          className="add-btn"
          style={{ background: '#17a2b8', marginLeft: 8, cursor: 'pointer' }}
        >
          Upload
          <input
            type="file"
            accept=".csv,.txt,.svg"
            style={{ display: 'none' }}
            onChange={handleFileInsert}
          />
        </label>
      </div>

      {/* Scrollable Table with Fixed Header */}
      <div className="table-wrapper" style={{ maxHeight: '400px', overflowY: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ display: 'table', width: '100%', tableLayout: 'fixed', background: '#f8f8f8', position: 'sticky', top: 0, zIndex: 1 }}>
            <tr>
              <th style={{ width: '20%' }}>Name</th>
              <th style={{ width: '20%' }}>Date</th>
              <th style={{ width: '25%' }}>Email</th>
              <th style={{ width: '15%' }}>Status</th>
              <th style={{ width: '20%' }}>Actions</th>
            </tr>
          </thead>
          <tbody style={{ display: 'block', width: '100%', tableLayout: 'fixed' }}>
            {sortedBirthdays.map((b) => (
              <tr key={b.id} style={{ display: 'table', width: '100%', tableLayout: 'fixed' }}>
                <td style={{ width: '20%' }}>{b.name}</td>
                <td style={{ width: '20%' }}>{toDateDisplay(b.date)}</td>
                <td style={{ width: '25%' }}>{b.email}</td>
                <td style={{ width: '15%' }}>
                  <span className={`status ${b.status === 'Sent' ? 'sent' : 'not-sent'}`}>
                    {b.status}
                  </span>
                </td>
                <td style={{ width: '20%' }}>
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
    </div>
  );
}

export default BirthdayTable;