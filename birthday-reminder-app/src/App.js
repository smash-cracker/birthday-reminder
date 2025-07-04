import { useEffect, useState } from 'react';
import BirthdayForm from './components/BirthdayForm';
import BirthdayTable from './components/BirthdayTable';
import './App.css';

export default function App() {
  const [birthdays, setBirthdays] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState('');

  const hostIp = '172.16.11.154';

  // Fetch once
  useEffect(() => {
    fetch(`http://${hostIp}:5000/api/birthdays`)
      .then(r => r.json())
      .then(setBirthdays)
      .catch(console.error);
  }, []);

  /* ---------- CRUD helpers ---------- */
  const addBirthday = (data) =>
    fetch(`http://${hostIp}:5000/api/birthdays`, {
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
    fetch(`http://${hostIp}:5000/api/birthdays/${id}`, { method: 'DELETE' })
      .then((r) => {
        if (r.ok) setBirthdays((prev) => prev.filter((b) => b.id !== id));
      });

  const editBirthday = (data) =>
    fetch(`http://${hostIp}:5000/api/birthdays/${data.id}`, {
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

      <div className="container">
        {showForm && (
          <div className="modal-overlay">
            <div className="modal-content">
              <BirthdayForm
                onAdd={addBirthday}
                onEdit={editBirthday}
                editingBirthday={editing}
                onClose={() => { setShowForm(false); setEditing(null); }}
              />
            </div>
          </div>
        )}

        <BirthdayTable
          birthdays={list}
          onDelete={deleteBirthday}
          onEdit={(b) => { setEditing(b); setShowForm(true); }}
          search={search}
          setSearch={setSearch}
          showForm={showForm}
          setShowForm={setShowForm}
          setEditing={setEditing}
        />
      </div>
    </div>
  );
}