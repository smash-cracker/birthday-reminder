import React, { useEffect, useState } from 'react';
import BirthdayForm from './components/BirthdayForm';
import BirthdayTable from './components/BirthdayTable';
import './App.css';

function App() {
  const [birthdays, setBirthdays] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingBirthday, setEditingBirthday] = useState(null);

  // Fetch all birthdays from backend
  useEffect(() => {
    fetch('http://localhost:5000/birthdays')
      .then((res) => res.json())
      .then((data) => setBirthdays(data));
  }, []);

  // Add new birthday
  const addBirthday = (newEntry) => {
    fetch('http://localhost:5000/birthdays', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newEntry),
    })
      .then((res) => res.json())
      .then((data) => {
        setBirthdays([...birthdays, data]);
        setShowForm(false);
      });
  };

  // Delete birthday
  const deleteBirthday = (id) => {
    fetch(`http://localhost:5000/birthdays/${id}`, {
      method: 'DELETE',
    }).then(() => {
      setBirthdays(birthdays.filter((b) => b.id !== id));
    });
  };

  // Edit birthday
  const editBirthday = (updatedEntry) => {
    fetch(`http://localhost:5000/birthdays/${updatedEntry.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedEntry),
    })
      .then((res) => res.json())
      .then((data) => {
        setBirthdays(birthdays.map((b) => (b.id === data.id ? data : b)));
        setEditingBirthday(null);
        setShowForm(false);
      });
  };

  const handleAddClick = () => {
    setEditingBirthday(null);
    setShowForm(true);
  };
  const handleFormClose = () => {
    setShowForm(false);
    setEditingBirthday(null);
  };

  const filteredBirthdays = birthdays.filter((b) => {
    const term = searchTerm.toLowerCase();
    return (
      b.name.toLowerCase().includes(term) ||
      (b.message || '').toLowerCase().includes(term) ||
      b.date.toLowerCase().includes(term)
    );
  });

  return (
    <div className="app">
      <h1 className="header">Birthday Reminder</h1>

      <div className="top-bar">
        <input
          type="text"
          placeholder="Search..."
          className="search-box"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        {!showForm && (
          <button className="show-add-btn" onClick={handleAddClick}>
            Add
          </button>
        )}
      </div>

      <div className="container">
        {showForm && (
          <BirthdayForm
            onAdd={addBirthday}
            onEdit={editBirthday}
            editingBirthday={editingBirthday}
            onClose={handleFormClose}
          />
        )}
        <BirthdayTable
          birthdays={filteredBirthdays}
          onDelete={deleteBirthday}
          onEdit={(b) => {
            setEditingBirthday(b);
            setShowForm(true);
          }}
        />
      </div>
    </div>
  );
}

export default App;
