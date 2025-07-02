import React, { useState, useEffect } from 'react';

function BirthdayForm({ onAdd, onEdit, editingBirthday, onClose }) {
  const [form, setForm] = useState({
    name: '',
    date: '',
    email: '',
    status: 'Not Sent',
    ...(editingBirthday || {}),
  });

  useEffect(() => {
    setForm({
      name: editingBirthday?.name || '',
      date: editingBirthday?.date || '',
      email: editingBirthday?.email || '',
      status: editingBirthday?.status || 'Not Sent',
      id: editingBirthday?.id,
    });
  }, [editingBirthday]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name || !form.date || !form.email) {
      alert('Name, Date of Birth, and Email are required.');
      return;
    }
    if (editingBirthday) {
      onEdit({ ...form });
    } else {
      onAdd({ ...form });
    }
  };

  return (
    <form className="birthday-form" onSubmit={handleSubmit}>
      <h2>{editingBirthday ? 'Edit Birthday' : 'Add Birthday'}</h2>
      <input
        name="name"
        placeholder="Name"
        value={form.name}
        onChange={handleChange}
        required
      />
      <input
        type="date"
        name="date"
        value={form.date}
        onChange={handleChange}
        required
      />
      <input
        type="email"
        name="email"
        placeholder="Email"
        value={form.email}
        onChange={handleChange}
        required
      />
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <button type="submit">
          {editingBirthday ? 'Save' : 'Add'}
        </button>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            style={{
              background: '#ccc',
              color: '#222',
              border: 'none',
              borderRadius: '6px',
              padding: '0.6rem',
              cursor: 'pointer'
            }}
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}

export default BirthdayForm;
