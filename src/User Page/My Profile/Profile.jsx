import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { updateEmail, updateProfile } from 'firebase/auth'
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore'
import { auth, db } from '../../DB/firebase'
import './Profile.css'

const navItems = [
  { icon: '🏠', label: 'Dashboard', path: '/dashboard' },
]

const emptyProfile = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  dob: '',
  gender: '',
}

function Profile() {
  const navigate = useNavigate()
  const location = useLocation()

  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [profile, setProfile] = useState(emptyProfile)
  const [form, setForm] = useState(emptyProfile)
  const [isLoading, setIsLoading] = useState(() => Boolean(auth.currentUser))
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState(() => (
    auth.currentUser ? '' : 'You must be signed in to view your profile.'
  ))

  useEffect(() => {
    const user = auth.currentUser
    if (!user) return

    let isMounted = true

    const loadProfile = async () => {
      try {
        const profileSnapshot = await getDoc(doc(db, 'users', user.uid))
        const savedProfile = profileSnapshot.exists() ? profileSnapshot.data() : {}
        const nameParts = (user.displayName || '').trim().split(/\s+/)
        const loadedProfile = {
          firstName: savedProfile.firstName || nameParts[0] || '',
          lastName: savedProfile.lastName || nameParts.slice(1).join(' ') || '',
          email: savedProfile.email || user.email || '',
          phone: savedProfile.phone || '',
          dob: savedProfile.dob || '',
          gender: savedProfile.gender || '',
        }

        if (isMounted) {
          setProfile(loadedProfile)
          setForm(loadedProfile)
        }
      } catch (loadError) {
        console.error('Unable to load user profile:', loadError)
        if (isMounted) setError('Unable to load your profile. Please try again.')
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }

    loadProfile()
    return () => {
      isMounted = false
    }
  }, [])

  const handleChange = (event) => {
    setForm((currentForm) => ({
      ...currentForm,
      [event.target.name]: event.target.value,
    }))
    setError('')
  }

  const handleSave = async (event) => {
    event.preventDefault()
    const user = auth.currentUser
    const firstName = form.firstName.trim()
    const lastName = form.lastName.trim()
    const email = form.email.trim().toLowerCase()

    if (!firstName || !lastName || !email) {
      setError('First name, last name, and email are required.')
      return
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Enter a valid email address.')
      return
    }

    if (!user) {
      setError('You must be signed in to update your profile.')
      return
    }

    setIsSaving(true)
    setError('')

    try {
      if (email !== user.email) await updateEmail(user, email)

      await updateProfile(user, { displayName: `${firstName} ${lastName}` })
      await setDoc(doc(db, 'users', user.uid), {
        firstName,
        lastName,
        email,
        phone: form.phone.trim(),
        gender: form.gender,
        dob: profile.dob,
        updatedAt: serverTimestamp(),
      }, { merge: true })

      const updatedProfile = {
        ...form,
        firstName,
        lastName,
        email,
        phone: form.phone.trim(),
      }
      setProfile(updatedProfile)
      setForm(updatedProfile)
      setShowModal(false)
    } catch (saveError) {
      console.error('Unable to save user profile:', saveError)
      if (saveError?.code === 'auth/requires-recent-login') {
        setError('Please sign in again before changing your email address.')
      } else if (saveError?.code === 'auth/email-already-in-use') {
        setError('That email address is already in use.')
      } else {
        setError(saveError?.message || 'Unable to save your profile. Please try again.')
      }
    } finally {
      setIsSaving(false)
    }
  }

  const handleEdit = () => {
    setForm({ ...profile })
    setError('')
    setShowModal(true)
  }

  const handleCancel = () => {
    setForm({ ...profile })
    setError('')
    setShowModal(false)
  }

  const formatDob = (dob) => {
    if (!dob) return '—'
    const [year, month, day] = dob.split('-').map(Number)
    const date = new Date(year, month - 1, day)
    return Number.isNaN(date.getTime())
      ? dob
      : date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  }

  const firstInitial = profile.firstName[0] || '?'
  const lastInitial = profile.lastName[0] || ''
  const fullName = [profile.firstName, profile.lastName].filter(Boolean).join(' ') || 'Your Profile'

  return (
    <div className="db-layout">
      <header className="db-navbar">
        <div className="db-nav-left">
          <button className="db-hamburger" onClick={() => setSidebarOpen((open) => !open)} aria-label="Toggle sidebar">☰</button>
          <div className="db-nav-logo" onClick={() => navigate('/dashboard')}>🏥 MediCare Pro</div>
        </div>
        <div className="db-nav-right">
          <div className="db-avatar-wrap">
            <div className="db-avatar-circle">{firstInitial}{lastInitial}</div>
            <span className="db-avatar-name">{fullName}</span>
          </div>
        </div>
      </header>

      <aside className={`db-sidebar ${sidebarOpen ? 'db-sidebar-open' : 'db-sidebar-closed'}`}>
        <nav className="db-sidebar-nav">
          <ul>
            {navItems.map((item) => (
              <li key={item.path}>
                <button
                  className={`db-sidebar-item ${location.pathname === item.path ? 'active' : ''}`}
                  onClick={() => navigate(item.path)}
                >
                  <span className="db-sidebar-icon">{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              </li>
            ))}
          </ul>
        </nav>
        <div className="db-sidebar-footer">
          <button className="db-sidebar-item db-logout" onClick={() => navigate('/')}>
            <span className="db-sidebar-icon">🚪</span>
            <span>Logout</span>
          </button>
        </div>
      </aside>

      <main className={`db-main ${sidebarOpen ? 'db-main-shifted' : ''}`}>
        <div className="pf-container">
          {error && !showModal && <p className="pf-error" role="alert">{error}</p>}
          {isLoading ? (
            <p className="pf-status">Loading your profile...</p>
          ) : (
            <>
              <div className="pf-header-card">
                <div className="pf-cover" />
                <div className="pf-header-body">
                  <div className="pf-avatar-lg">{firstInitial}{lastInitial}</div>
                  <div className="pf-header-info">
                    <h1>{fullName}</h1>
                    <p>{profile.email || 'No email available'}</p>
                  </div>
                  <button className="pf-btn-edit" onClick={handleEdit}>✏️ Edit Profile</button>
                </div>
              </div>

              <div className="pf-details-card">
                <h2 className="pf-section-title">Personal Information</h2>
                <div className="pf-details-grid">
                  <div className="pf-detail-item">
                    <span className="pf-detail-label">First Name</span>
                    <span className="pf-detail-value">{profile.firstName || '—'}</span>
                  </div>
                  <div className="pf-detail-item">
                    <span className="pf-detail-label">Last Name</span>
                    <span className="pf-detail-value">{profile.lastName || '—'}</span>
                  </div>
                  <div className="pf-detail-item">
                    <span className="pf-detail-label">Email Address</span>
                    <span className="pf-detail-value">{profile.email || '—'}</span>
                  </div>
                  <div className="pf-detail-item">
                    <span className="pf-detail-label">Phone Number</span>
                    <span className="pf-detail-value">{profile.phone || '—'}</span>
                  </div>
                  <div className="pf-detail-item">
                    <span className="pf-detail-label">Date of Birth</span>
                    <span className="pf-detail-value">{formatDob(profile.dob)}</span>
                  </div>
                  <div className="pf-detail-item">
                    <span className="pf-detail-label">Gender</span>
                    <span className="pf-detail-value">{profile.gender || '—'}</span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </main>

      {showModal && (
        <div className="pf-modal-overlay" onClick={handleCancel}>
          <form className="pf-modal" onClick={(event) => event.stopPropagation()} onSubmit={handleSave}>
            <div className="pf-modal-header">
              <h2>Edit Profile</h2>
              <button type="button" className="pf-modal-close" onClick={handleCancel} aria-label="Close">✕</button>
            </div>

            <div className="pf-modal-body">
              <p className="pf-modal-section-label">Personal Information</p>

              <div className="pf-modal-row">
                <div className="pf-modal-field">
                  <label htmlFor="profile-firstName">First Name</label>
                  <input id="profile-firstName" type="text" name="firstName" value={form.firstName} onChange={handleChange} required />
                </div>
                <div className="pf-modal-field">
                  <label htmlFor="profile-lastName">Last Name</label>
                  <input id="profile-lastName" type="text" name="lastName" value={form.lastName} onChange={handleChange} required />
                </div>
              </div>

              <div className="pf-modal-field">
                <label htmlFor="profile-email">Email Address</label>
                <input id="profile-email" type="email" name="email" value={form.email} onChange={handleChange} required />
              </div>

              <div className="pf-modal-row">
                <div className="pf-modal-field">
                  <label htmlFor="profile-phone">Phone Number</label>
                  <input id="profile-phone" type="tel" name="phone" value={form.phone} onChange={handleChange} />
                </div>
                <div className="pf-modal-field">
                  <label htmlFor="profile-dob">Date of Birth</label>
                  <input id="profile-dob" type="date" value={form.dob} disabled />
                  <span className="pf-field-hint">Date of birth cannot be changed.</span>
                </div>
              </div>

              <div className="pf-modal-field pf-modal-field-half">
                <label htmlFor="profile-gender">Gender</label>
                <select id="profile-gender" name="gender" value={form.gender} onChange={handleChange}>
                  <option value="">Select gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                  <option value="Prefer not to say">Prefer not to say</option>
                </select>
              </div>

              {error && <p className="pf-error" role="alert">{error}</p>}
            </div>

            <div className="pf-modal-footer">
              <button type="button" className="pf-btn-cancel" onClick={handleCancel} disabled={isSaving}>Cancel</button>
              <button type="submit" className="pf-btn-save" disabled={isSaving}>
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}

export default Profile
