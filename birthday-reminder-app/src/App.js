import { useEffect, useState } from 'react';
import BirthdayForm from './components/BirthdayForm';
import BirthdayTable from './components/BirthdayTable';
import './App.css';

export default function App() {
  const [birthdays, setBirthdays]     = useState([]);
  const [showForm,  setShowForm]      = useState(false);
  const [editing,   setEditing]       = useState(null);
  const [search,    setSearch]        = useState('');

  // Fetch once
  useEffect(() => {
    fetch('http://localhost:5000/api/birthdays')
      .then(r => r.json())
      .then(setBirthdays)
      .catch(console.error);
  }, []);

  /* ---------- CRUD helpers ---------- */
  const addBirthday = (data) =>
    fetch('http://localhost:5000/api/birthdays', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
      .then(r => r.json())
      .then((newB) => {
        setBirthdays((prev) => [...prev, newB]);
        setShowForm(false);
      });

  const deleteBirthday = (id) =>
    fetch(`http://localhost:5000/api/birthdays/${id}`, { method: 'DELETE' })
      .then((r) => {
        if (r.ok) setBirthdays((prev) => prev.filter((b) => b.id !== id));
      });

  const editBirthday = (data) =>
    fetch(`http://localhost:5000/api/birthdays/${data.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
      .then(r => r.json())
      .then((upd) => {
        setBirthdays((prev) => prev.map((b) => (b.id === upd.id ? upd : b)));
        setEditing(null);
        setShowForm(false);
      });

  /* ---------- Filtered list ---------- */
  const list = birthdays.filter((b) => {
    const q = search.toLowerCase();
    return (
      b.name.toLowerCase().includes(q) ||
      (b.message || '').toLowerCase().includes(q) ||
      b.date.includes(q)
    );
  });

  return (
    <div className="app">
      <h1 className="header">🎉 Birthday Reminder</h1>

      <div className="top-bar">
        <input
          placeholder="Search..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {!showForm && (
          <button onClick={() => { setEditing(null); setShowForm(true); }}>
            Add
          </button>
        )}
      </div>

      <div className="container">
        {showForm && (
          <BirthdayForm
            onAdd={addBirthday}
            onEdit={editBirthday}
            editingBirthday={editing}
            onClose={() => { setShowForm(false); setEditing(null); }}
          />
        )}

        <BirthdayTable
          birthdays={list}
          onDelete={deleteBirthday}
          onEdit={(b) => { setEditing(b); setShowForm(true); }}
        />
      </div>
    </div>
  );
}
