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

// Add a modal for bulk delete confirmation
function BulkDeleteModal({ count, onConfirm, onCancel }) {
  return (
    <div className="modal-backdrop">
      <div className="modal-box">
        <h3>Delete Selected?</h3>
        <p>
          Are you sure you want to delete <strong>{count}</strong> selected birthdays?
          <br />
          This action cannot be undone.
        </p>
        <div className="modal-actions">
          <button className="btn btn-danger" onClick={onConfirm}>
            Delete All
          </button>
          <button className="btn" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------- NEW: Download birthdays to Excel ---------- */
function downloadBirthdaysToExcel(birthdays) {
  if (!birthdays || !birthdays.length) {
    alert('No data to download.');
    return;
  }
  const sheetData = birthdays.map(b => ({
    Name: b.name,
    Date: toDateDisplay(b.date),
    Email: b.email || '',
  }));
  const ws = XLSX.utils.json_to_sheet(sheetData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Birthdays");
  XLSX.writeFile(wb, "birthdays.xlsx");
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

  // Bulk delete state
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkConfirm, setBulkConfirm] = useState(false);

  // --- Grouping logic ---
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  function isThisWeek(dateStr) {
    const d = new Date(dateStr);
    d.setFullYear(today.getFullYear());
    d.setHours(0, 0, 0, 0);
    const diff = (d - today) / 86400000;
    return diff >= 0 && diff < 7;
  }
  function isNextWeek(dateStr) {
    const d = new Date(dateStr);
    d.setFullYear(today.getFullYear());
    d.setHours(0, 0, 0, 0);
    const diff = (d - today) / 86400000;
    return diff >= 7 && diff < 14;
  }
  function isThisMonth(dateStr) {
    const d = new Date(dateStr);
    d.setFullYear(today.getFullYear());
    d.setHours(0, 0, 0, 0);
    // Only show birthdays in this month that are after today (not in this/next week)
    return (
      d.getMonth() === today.getMonth() &&
      d > today &&
      !isThisWeek(dateStr) &&
      !isNextWeek(dateStr)
    );
  }
  function isNextMonth(dateStr) {
    const d = new Date(dateStr);
    d.setFullYear(today.getFullYear());
    d.setHours(0, 0, 0, 0);
    const thisMonth = today.getMonth();
    let bMonth = d.getMonth();
    // If birthday already passed, treat as next year
    if (d < today) bMonth = (bMonth + 12) % 12;
    const nextMonth = (thisMonth + 1) % 12;
    return bMonth === nextMonth;
  }

  const sortedBirthdays = [...birthdays].sort(
    (a, b) => daysUntilNextBirthday(a.date) - daysUntilNextBirthday(b.date)
  );

  const thisWeek = sortedBirthdays.filter(b => isThisWeek(b.date));
  const nextWeek = sortedBirthdays.filter(b => isNextWeek(b.date));
  const thisMonth = sortedBirthdays.filter(
    b => isThisMonth(b.date)
  );
  const nextMonth = sortedBirthdays.filter(
    b => isNextMonth(b.date) && !isThisWeek(b.date) && !isNextWeek(b.date)
  );
  const rest = sortedBirthdays.filter(
    b => !isThisWeek(b.date) && !isNextWeek(b.date) && !isThisMonth(b.date) && !isNextMonth(b.date)
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

        // --- header mapping logic (allow missing email) ---
        const getColMap = (headerRow) => {
          const map = {};
          headerRow.forEach((col, idx) => {
            if (typeof col === 'string') {
              const key = col.trim().toLowerCase();
              if (key === 'name') map.name = idx;
              if (key === 'date' || key === 'dob') map.date = idx;
              if (key === 'email') map.email = idx;
            }
          });
          return map;
        };
        const map = getColMap(rows[0]);
        // Allow files with just name and date/dob
        if (map.name === undefined || map.date === undefined) {
          throw new Error('File must have columns Name and Date (or DOB).');
        }

        for (let i = 1; i < rows.length; ++i) {
          const row = rows[i];
          const name = row[map.name] && row[map.name].toString().trim();
          const dateInput = row[map.date] && row[map.date].toString().trim();
          const email = map.email !== undefined && row[map.email] ? row[map.email].toString().trim() : '';
          if (!name || !dateInput) { failCount++; continue; }
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

          // --- header mapping logic (allow missing email) ---
          const getColMap = (headerRow) => {
            const map = {};
            headerRow.forEach((col, idx) => {
              if (typeof col === 'string') {
                const key = col.trim().toLowerCase();
                if (key === 'name') map.name = idx;
                if (key === 'date' || key === 'dob') map.date = idx;
                if (key === 'email') map.email = idx;
              }
            });
            return map;
          };
          const map = getColMap(entries[0].split(','));
          // Allow files with just name and date/dob
          if (map.name === undefined || map.date === undefined) {
            throw new Error('First row must be headers: Name and Date (or DOB).');
          }

          for (let i = 1; i < entries.length; ++i) {
            const entry = entries[i];
            const cols = entry.split(',');
            const name = cols[map.name] && cols[map.name].trim();
            const dateInput = cols[map.date] && cols[map.date].trim();
            const email = map.email !== undefined && cols[map.email] ? cols[map.email].trim() : '';
            if (!name || !dateInput) { failCount++; continue; }
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

  // Bulk select handlers
  const handleBulkMode = () => {
    setBulkMode(true);
    setSelectedIds([]);
  };
  const handleBulkCancel = () => {
    setBulkMode(false);
    setSelectedIds([]);
  };
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(sortedBirthdays.map((b) => b.id));
    } else {
      setSelectedIds([]);
    }
  };
  const handleSelectOne = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };
  const handleBulkDelete = () => {
    if (selectedIds.length === 0) return;
    setBulkConfirm(true);
  };
  const confirmBulkDelete = () => {
    selectedIds.forEach((id) => onDelete(id));
    setBulkMode(false);
    setSelectedIds([]);
    setBulkConfirm(false);
  };
  const cancelBulkDelete = () => setBulkConfirm(false);

  // Download handler: export all records currently available
  const handleDownload = () => {
    downloadBirthdaysToExcel(sortedBirthdays);
  };

  return (
    <div className="birthday-table">
      {/* ---------- TOP BAR (re‑ordered) ---------- */}
      {/* CENTER ­– Heading (flex: 1 to stay centered) */}
      <h2 className='smallHeader' style={{ flex: 1, textAlign: 'center', margin: 0 }}>
        Upcoming Birthdays
      </h2>
      <div
        className="top-bar"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        {/* LEFT – Bulk controls */}

        {/* RIGHT – Search, Add, Upload */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            width: '100%',
          }}
        >
          {!bulkMode && (
            <button
              className="add-btn"
              style={{ background: '#ffc107' }}
              onClick={handleBulkMode}
              title="Bulk Delete"
            >
              Bulk Delete
            </button>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {bulkMode && (
              <>
                <button
                  className="add-btn"
                  style={{
                    background: selectedIds.length ? '#dc3545' : '#aaa',
                    cursor: selectedIds.length ? 'pointer' : 'not-allowed',
                  }}
                  onClick={handleBulkDelete}
                  disabled={!selectedIds.length}
                >
                  Delete Selected
                </button>
                <button
                  className="add-btn"
                  style={{ background: '#6c757d' }}
                  onClick={handleBulkCancel}
                >
                  Cancel
                </button>
              </>
            )}
          </div>
          {/* CENTER ­– Heading (flex: 1 to stay centered) */}
          <h2 className='largeHeader' style={{ textAlign: 'center', marginLeft:'auto' }}>
            Upcoming Birthdays
          </h2>


          <div className="right-side">
            <input
              className="search-input"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {/* --------- The new Download button --------- */}
            <button
              className="add-btn"
              style={{ background: "#28a745", color: "#fff" }}
              onClick={handleDownload}
            >
              Download
            </button>
            {/* Add, Upload Buttons unchanged */}
            {!showForm && !bulkMode && (
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
              style={{ background: '#17a2b8', cursor: 'pointer' }}
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
        </div>
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
              {bulkMode && (
                <th style={{ width: '4%' }}>
                  <input
                    type="checkbox"
                    checked={
                      selectedIds.length === sortedBirthdays.length &&
                      sortedBirthdays.length > 0
                    }
                    onChange={handleSelectAll}
                    style={{ cursor: 'pointer' }}
                  />
                </th>
              )}
              <th style={{ width: bulkMode ? '22%' : '25%' }}>Name</th>
              <th style={{ width: '25%' }}>Date</th>
              <th style={{ width: '30%' }}>Email</th>
              {/* <th style={{ width: '15%' }}>Status</th> */}
              <th style={{ width: bulkMode ? '19%' : '20%' }}>Actions</th>
            </tr>
          </thead>
          <tbody style={{ display: 'block', width: '100%', tableLayout: 'fixed' }}>
            {/* --- This Week --- */}
            {thisWeek.length > 0 && (
              <>
                <tr style={{ display: 'table', width: '100%', tableLayout: 'fixed', background: '#e6f7ff' }}>
                  <td colSpan={bulkMode ? 5 : 4} style={{ fontWeight: 'bold', padding: '0.7rem 0.5rem' }}>
                    🎂 This Week
                  </td>
                </tr>
                {thisWeek.map((b) => (
                  <tr key={b.id} style={{ display: 'table', width: '100%', tableLayout: 'fixed' }}>
                    {bulkMode && (
                      <td style={{ width: '4%', textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(b.id)}
                          onChange={() => handleSelectOne(b.id)}
                          style={{ cursor: 'pointer' }}
                        />
                      </td>
                    )}
                    <td style={{ width: bulkMode ? '22%' : '25%' }}>{b.name}</td>
                    <td style={{ width: '25%' }}>{toDateDisplay(b.date)}</td>
                    <td style={{ width: '30%' }}>{b.email}</td>
                    <td style={{ width: bulkMode ? '19%' : '20%' }}>
                      {!bulkMode && (
                        <>
                          <button
                            onClick={() => onEdit(b)}
                            title="Edit"
                            className='edit-btn'
                            style={{
                              cursor: 'pointer',
                              marginRight: '0.5rem',
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
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </>
            )}
            {/* --- Next Week --- */}
            {nextWeek.length > 0 && (
              <>
                <tr style={{ display: 'table', width: '100%', tableLayout: 'fixed', background: '#f0f5ff' }}>
                  <td colSpan={bulkMode ? 5 : 4} style={{ fontWeight: 'bold', padding: '0.7rem 0.5rem' }}>
                    🗓️ Next Week
                  </td>
                </tr>
                {nextWeek.map((b) => (
                  <tr key={b.id} style={{ display: 'table', width: '100%', tableLayout: 'fixed' }}>
                    {bulkMode && (
                      <td style={{ width: '4%', textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(b.id)}
                          onChange={() => handleSelectOne(b.id)}
                          style={{ cursor: 'pointer' }}
                        />
                      </td>
                    )}
                    <td style={{ width: bulkMode ? '22%' : '25%' }}>{b.name}</td>
                    <td style={{ width: '25%' }}>{toDateDisplay(b.date)}</td>
                    <td style={{ width: '30%' }}>{b.email}</td>
                    <td style={{ width: bulkMode ? '19%' : '20%' }}>
                      {!bulkMode && (
                        <>
                          <button
                            onClick={() => onEdit(b)}
                            title="Edit"
                            className='edit-btn'
                            style={{
                              cursor: 'pointer',
                              marginRight: '0.5rem',
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
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </>
            )}
            {/* --- This Month --- */}
            {thisMonth.length > 0 && (
              <>
                <tr style={{ display: 'table', width: '100%', tableLayout: 'fixed', background: '#fffbe6' }}>
                  <td colSpan={bulkMode ? 5 : 4} style={{ fontWeight: 'bold', padding: '0.7rem 0.5rem' }}>
                    📆 UpComing This Month
                  </td>
                </tr>
                {thisMonth.map((b) => (
                  <tr key={b.id} style={{ display: 'table', width: '100%', tableLayout: 'fixed' }}>
                    {bulkMode && (
                      <td style={{ width: '4%', textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(b.id)}
                          onChange={() => handleSelectOne(b.id)}
                          style={{ cursor: 'pointer' }}
                        />
                      </td>
                    )}
                    <td style={{ width: bulkMode ? '22%' : '25%' }}>{b.name}</td>
                    <td style={{ width: '25%' }}>{toDateDisplay(b.date)}</td>
                    <td style={{ width: '30%' }}>{b.email}</td>
                    <td style={{ width: bulkMode ? '19%' : '20%' }}>
                      {!bulkMode && (
                        <>
                          <button
                            onClick={() => onEdit(b)}
                            title="Edit"
                            className='edit-btn'
                            style={{
                              cursor: 'pointer',
                              marginRight: '0.5rem',
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
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </>
            )}
            {/* --- Next Month --- */}
            {nextMonth.length > 0 && (
              <>
                <tr style={{ display: 'table', width: '100%', tableLayout: 'fixed', background: '#fff1f0' }}>
                  <td colSpan={bulkMode ? 5 : 4} style={{ fontWeight: 'bold', padding: '0.7rem 0.5rem' }}>
                    📅 Next Month
                  </td>
                </tr>
                {nextMonth.map((b) => (
                  <tr key={b.id} style={{ display: 'table', width: '100%', tableLayout: 'fixed' }}>
                    {bulkMode && (
                      <td style={{ width: '4%', textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(b.id)}
                          onChange={() => handleSelectOne(b.id)}
                          style={{ cursor: 'pointer' }}
                        />
                      </td>
                    )}
                    <td style={{ width: bulkMode ? '22%' : '25%' }}>{b.name}</td>
                    <td style={{ width: '25%' }}>{toDateDisplay(b.date)}</td>
                    <td style={{ width: '30%' }}>{b.email}</td>
                    <td style={{ width: bulkMode ? '19%' : '20%' }}>
                      {!bulkMode && (
                        <>
                          <button
                            onClick={() => onEdit(b)}
                            title="Edit"
                            className='edit-btn'
                            style={{
                              cursor: 'pointer',
                              marginRight: '0.5rem',
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
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </>
            )}
            {/* --- All Others --- */}
            {rest.length > 0 && (
              <>
                <tr style={{ display: 'table', width: '100%', tableLayout: 'fixed', background: '#f6ffed' }}>
                  <td colSpan={bulkMode ? 5 : 4} style={{ fontWeight: 'bold', padding: '0.7rem 0.5rem' }}>
                    📋 All Birthdays
                  </td>
                </tr>
                {rest.map((b) => (
                  <tr key={b.id} style={{ display: 'table', width: '100%', tableLayout: 'fixed' }}>
                    {bulkMode && (
                      <td style={{ width: '4%', textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(b.id)}
                          onChange={() => handleSelectOne(b.id)}
                          style={{ cursor: 'pointer' }}
                        />
                      </td>
                    )}
                    <td style={{ width: bulkMode ? '22%' : '25%' }}>{b.name}</td>
                    <td style={{ width: '25%' }}>{toDateDisplay(b.date)}</td>
                    <td style={{ width: '30%' }}>{b.email}</td>
                {/* <td style={{ width: '15%' }}>
                  <span className={status ${b.status === 'Sent' ? 'sent' : 'not-sent'}}>
                    {b.status}
                  </span>
                </td> */}
                    <td style={{ width: bulkMode ? '19%' : '20%' }}>
                      {!bulkMode && (
                        <>
                          <button
                            onClick={() => onEdit(b)}
                            title="Edit"
                            className='edit-btn'
                            style={{
                              cursor: 'pointer',
                              marginRight: '0.5rem',
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
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </>
            )}
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
      {bulkConfirm && (
        <BulkDeleteModal
          count={selectedIds.length}
          onConfirm={confirmBulkDelete}
          onCancel={cancelBulkDelete}
        />
      )}
    </div>
  );
}

export default BirthdayTable;
