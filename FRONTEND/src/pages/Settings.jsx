import { useState, useEffect } from 'react'

function Settings() {
  const [settings, setSettings] = useState({
    school_name: '',
    school_address: '',
    school_phone: '',
    course_start_time: '08:00',
    course_end_time: '17:00',
    late_threshold_minutes: 15,
    enable_sms_notifications: false,
    enable_email_notifications: false,
  })
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)

  const token = localStorage.getItem('access_token')

  useEffect(() => {
    fetch('http://127.0.0.1:8000/api/settings/', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        setSettings(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setSettings(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const handleSave = () => {
    fetch('http://127.0.0.1:8000/api/settings/', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(settings)
    })
      .then(res => {
        if (res.ok) {
          setMessage('✅ Paramètres sauvegardés !')
        } else {
          setMessage('❌ Erreur lors de la sauvegarde')
        }
        setTimeout(() => setMessage(''), 3000)
      })
  }

  if (loading) return <p style={{ padding: 20 }}>Chargement...</p>

  return (
    <div style={{ padding: 20, maxWidth: 700, margin: '0 auto' }}>
      <h1 style={{ fontSize: 24, marginBottom: 20 }}> Paramètres</h1>

      {message && (
        <div style={{
          padding: 12,
          marginBottom: 20,
          borderRadius: 8,
          background: message.includes('✅') ? '#d4edda' : '#f8d7da',
          color: message.includes('✅') ? '#155724' : '#721c24',
          textAlign: 'center'
        }}>
          {message}
        </div>
      )}

      {/* Infos École */}
      <div style={{
        background: 'white',
        borderRadius: 12,
        padding: 20,
        marginBottom: 20,
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}>
        <h2 style={{ fontSize: 18, marginBottom: 15, color: '#1a73e8' }}> Informations de l'école</h2>
        
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', marginBottom: 4, fontWeight: 'bold' }}>Nom de l'école</label>
          <input
            type="text"
            name="school_name"
            value={settings.school_name}
            onChange={handleChange}
            style={inputStyle}
          />
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', marginBottom: 4, fontWeight: 'bold' }}>Adresse</label>
          <input
            type="text"
            name="school_address"
            value={settings.school_address}
            onChange={handleChange}
            style={inputStyle}
          />
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', marginBottom: 4, fontWeight: 'bold' }}>Téléphone</label>
          <input
            type="text"
            name="school_phone"
            value={settings.school_phone}
            onChange={handleChange}
            style={inputStyle}
          />
        </div>
      </div>

      {/* Horaires */}
      <div style={{
        background: 'white',
        borderRadius: 12,
        padding: 20,
        marginBottom: 20,
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}>
        <h2 style={{ fontSize: 18, marginBottom: 15, color: '#1a73e8' }}> Horaires</h2>
        
        <div style={{ display: 'flex', gap: 15, marginBottom: 12 }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', marginBottom: 4, fontWeight: 'bold' }}>Début des cours</label>
            <input
              type="time"
              name="course_start_time"
              value={settings.course_start_time}
              onChange={handleChange}
              style={inputStyle}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', marginBottom: 4, fontWeight: 'bold' }}>Fin des cours</label>
            <input
              type="time"
              name="course_end_time"
              value={settings.course_end_time}
              onChange={handleChange}
              style={inputStyle}
            />
          </div>
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', marginBottom: 4, fontWeight: 'bold' }}>Seuil de retard (minutes)</label>
          <input
            type="number"
            name="late_threshold_minutes"
            value={settings.late_threshold_minutes}
            onChange={handleChange}
            style={inputStyle}
          />
        </div>
      </div>

      {/* Notifications */}
      <div style={{
        background: 'white',
        borderRadius: 12,
        padding: 20,
        marginBottom: 20,
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}>
        <h2 style={{ fontSize: 18, marginBottom: 15, color: '#1a73e8' }}> Notifications</h2>
        
        <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
          <input
            type="checkbox"
            name="enable_sms_notifications"
            checked={settings.enable_sms_notifications}
            onChange={handleChange}
            style={{ width: 20, height: 20 }}
          />
          <label style={{ fontWeight: 'bold' }}>Activer les notifications SMS</label>
        </div>

        <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
          <input
            type="checkbox"
            name="enable_email_notifications"
            checked={settings.enable_email_notifications}
            onChange={handleChange}
            style={{ width: 20, height: 20 }}
          />
          <label style={{ fontWeight: 'bold' }}>Activer les notifications Email</label>
        </div>
      </div>

      {/* Bouton Sauvegarder */}
      <button
        onClick={handleSave}
        style={{
          width: '100%',
          padding: 14,
          background: '#1a73e8',
          color: 'white',
          border: 'none',
          borderRadius: 8,
          fontSize: 16,
          fontWeight: 'bold',
          cursor: 'pointer'
        }}
      >
         Sauvegarder les paramètres
      </button>
    </div>
  )
}

const inputStyle = {
  width: '100%',
  padding: 10,
  border: '1px solid #ddd',
  borderRadius: 8,
  fontSize: 14,
  boxSizing: 'border-box'
}

export default Settings
