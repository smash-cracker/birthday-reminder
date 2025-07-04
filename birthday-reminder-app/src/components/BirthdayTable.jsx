import React, { useState } from 'react';
import * as XLSX from 'xlsx';

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

/* ---------- small reusable confirm modal ---------- */
function ConfirmModal({ name, onConfirm, onCancel }) {
  return (
    <div className="modal-backdrop">
      <div className="modal-box">
        <h3>Delete Birthday?</h3>
        <p>
          Are you sure you want to delete <strong>{name}</strong>?<br /> This action
          cannot be undone.
        </p>
        <div className="modal-actions">
          <button className="btn btn-danger" onClick={onConfirm}>
            Delete
          </button>
          <button className="btn" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
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
  /* ---------- state for confirmation dialog ---------- */
  const [confirm, setConfirm] = useState(null); // { id, name }

  // Popup state for upload feedback
  const [uploadStatus, setUploadStatus] = useState(null); // { success: true/false, message: string }

  const sortedBirthdays = [...birthdays].sort(
    (a, b) => daysUntilNextBirthday(a.date) - daysUntilNextBirthday(b.date)
  );

  const requestDelete = (id, name) => setConfirm({ id, name });
  const confirmDelete = () => {
    if (confirm) {
      onDelete(confirm.id);
      setConfirm(null);
    }
  };
  const cancelDelete = () => setConfirm(null);

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
    const date = new Date(dateObj.getTime() - tzOffset)
      .toISOString()
      .slice(0, 10);

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

  // Unified file upload handler (CSV/TXT/SVG/XLSX/XLS)
  const handleFileInsert = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    let successCount = 0;
    let failCount = 0;

    try {
      if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        // --- Excel path ---
        const data = await file.arrayBuffer();
        const wb = XLSX.read(data, { type: 'array' });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

        for (const row of rows) {
          const [name, dateInput, email] = row.map((v) => v && v.toString().trim());
          if (!name || !dateInput || !email) { failCount++; continue; }
          const dateObj = new Date(dateInput);
          if (isNaN(dateObj)) { failCount++; continue; }
          const tzOffset = dateObj.getTimezoneOffset() * 60000;
          const date = new Date(dateObj - tzOffset).toISOString().slice(0, 10);
          const resp = await fetch('http://localhost:5000/api/birthdays', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, date, email }),
          });
          if (resp.ok) successCount++; else failCount++;
        }
      } else {
        // --- original text/CSV/SVG path ---
        const reader = new FileReader();
        reader.onload = async (evt) => {
          const text = evt.target.result;
          let entries = [];

          if (file.name.endsWith('.svg')) {
            const matches = [...text.matchAll(/<text[^>]*>([^<]*)<\/text>/g)];
            entries = matches.map((m) => m[1]);
          } else {
            entries = text
              .split('\n')
              .map((l) => l.trim())
              .filter(Boolean);
          }

          for (const entry of entries) {
            const [name, dateInput, email] = entry
              .split(',')
              .map((s) => s && s.trim());
            if (!name || !dateInput || !email) { failCount++; continue; }
            const dateObj = new Date(dateInput);
            if (isNaN(dateObj.getTime())) { failCount++; continue; }
            const tzOffset = dateObj.getTimezoneOffset() * 60000;
            const date = new Date(dateObj.getTime() - tzOffset)
              .toISOString()
              .slice(0, 10);
            const resp = await fetch('http://localhost:5000/api/birthdays', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ name, date, email }),
            });
            if (resp.ok) successCount++; else failCount++;
          }
          setSearch((s) => s + ' ');
          setUploadStatus({
            success: failCount === 0,
            message: `Upload finished: ${successCount} added, ${failCount} failed.`,
          });
        };
        reader.readAsText(file);
        e.target.value = '';
        return;
      }
      setSearch((s) => s + ' ');
      setUploadStatus({
        success: failCount === 0,
        message: `Upload finished: ${successCount} added, ${failCount} failed.`,
      });
    } catch (err) {
      setUploadStatus({ success: false, message: 'Upload failed: ' + err.message });
    }
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
            accept=".csv,.txt,.svg,.xlsx,.xls"
            style={{ display: 'none' }}
            onChange={handleFileInsert}
          />
        </label>
      </div>

      {/* Upload status popup */}
      {uploadStatus && (
        <div
          style={{
            position: 'fixed',
            top: 30,
            left: '50%',
            transform: 'translateX(-50%)',
            background: uploadStatus.success ? '#28a745' : '#dc3545',
            color: '#fff',
            padding: '0.8rem 1.5rem',
            borderRadius: 8,
            zIndex: 2000,
            boxShadow: '0 2px 12px rgba(0,0,0,0.15)',
            fontWeight: 500,
            fontSize: '1rem',
          }}
          onClick={() => setUploadStatus(null)}
        >
          {uploadStatus.message}
        </div>
      )}

      {/* Scrollable Table with Fixed Header */}
      <div className="table-wrapper" style={{ maxHeight: '400px', overflowY: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead
            style={{
              display: 'table',
              width: '100%',
              tableLayout: 'fixed',
              background: '#f8f8f8',
              position: 'sticky',
              top: 0,
              zIndex: 1,
            }}
          >
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
                    onClick={() => requestDelete(b.id, b.name)}
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

      {/* confirmation dialog */}
      {confirm && (
        <ConfirmModal
          name={confirm.name}
          onConfirm={confirmDelete}
          onCancel={cancelDelete}
        />
      )}
    </div>
  );
}

export default BirthdayTable;