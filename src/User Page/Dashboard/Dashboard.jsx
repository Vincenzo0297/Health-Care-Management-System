import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { signOut } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db } from '../../DB/firebase'
import './Dashboard.css'

const navItems = [
  { icon: '🏠', label: 'Dashboard',              path: '/dashboard' },
  { icon: '🧮', label: 'Credit and Financial',   path: '/dashboard/creditfinancial' },
  { icon: '👤', label: 'My Profile',             path: '/dashboard/myprofile' },
]

// ── Mock customer directory (simulates pulling from a database) ──
const customerDirectory = [
  { name: 'Alice Tan',  cin: 'CIN-100123', gcin: 'GCIN-200456' },
  { name: 'Bob Lim',    cin: 'CIN-100234', gcin: 'GCIN-200567' },
  { name: 'Carol Ng',   cin: 'LCIN-10031', gcin: 'GCIN-200678' },
  { name: 'David Koh',  cin: 'CIN-100345', gcin: 'GCIN-200789' },
  { name: 'Eva Wong',   cin: 'LCIN-10042', gcin: 'GCIN-200890' },
  { name: 'Frank Lee',  cin: 'CIN-100456', gcin: 'GCIN-200901' },
  { name: 'Grace Yeo',  cin: 'LCIN-10053', gcin: 'GCIN-201012' },
  { name: 'Henry Chua', cin: 'CIN-100567', gcin: 'GCIN-201123' },
]

const initialCases = [
  { id: 'CASE-1001', client: 'Alice Tan',  cin: 'CIN-100123',  gcin: 'GCIN-200456', type: 'Auto Insurance',   status: 'Open',        date: '2026-10-01', assignee: 'John Doe' },
  { id: 'CASE-1002', client: 'Bob Lim',    cin: 'CIN-100234',  gcin: 'GCIN-200567', type: 'Home Insurance',   status: 'In Progress', date: '2026-10-03', assignee: 'John Doe' },
  { id: 'CASE-1003', client: 'Carol Ng',   cin: 'LCIN-10031',  gcin: 'GCIN-200678', type: 'Life Insurance',   status: 'Closed',      date: '2026-09-28', assignee: 'Jane Smith' },
  { id: 'CASE-1004', client: 'David Koh',  cin: 'CIN-100345',  gcin: 'GCIN-200789', type: 'Health Insurance', status: 'Open',        date: '2026-10-05', assignee: 'John Doe' },
  { id: 'CASE-1005', client: 'Eva Wong',   cin: 'LCIN-10042',  gcin: 'GCIN-200890', type: 'Auto Insurance',   status: 'Pending',     date: '2026-10-07', assignee: 'Jane Smith' },
  { id: 'CASE-1006', client: 'Frank Lee',  cin: 'CIN-100456',  gcin: 'GCIN-200901', type: 'Home Insurance',   status: 'In Progress', date: '2026-10-08', assignee: 'John Doe' },
]

const statusStyle = {
  'Open':        { bg: '#dbeafe', text: '#1d4ed8' },
  'In Progress': { bg: '#fef9c3', text: '#ca8a04' },
  'Pending':     { bg: '#ffedd5', text: '#ea580c' },
  'Closed':      { bg: '#dcfce7', text: '#16a34a' },
}

const emptyForm = { client: '', cin: '', gcin: '', type: 'Auto Insurance' }

const ROWS_PER_PAGE = 5

function Dashboard() {
  const navigate = useNavigate()
  const location = useLocation()

  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [profile, setProfile] = useState({
    name: auth.currentUser?.displayName || auth.currentUser?.email || 'Account',
  })
  const [profileError, setProfileError] = useState('')
  const [cases, setCases]         = useState(initialCases)
  const [search, setSearch]       = useState('')
  const [showModal, setShowModal] = useState(false)
  const [form, setForm]           = useState(emptyForm)
  const [formError, setFormError] = useState('')

  // ── Pagination ──
  const [currentPage, setCurrentPage] = useState(1)

  // ── View case modal ──
  const [viewCase, setViewCase] = useState(null)

  // ── Retrieve customer info ──
  const [retrieveStatus, setRetrieveStatus] = useState(null) // null | 'found' | 'not_found'

  useEffect(() => {
    const user = auth.currentUser
    if (!user) return

    let isMounted = true

    const loadProfile = async () => {
      try {
        const profileSnapshot = await getDoc(doc(db, 'users', user.uid))
        if (!isMounted || !profileSnapshot.exists()) return

        const userProfile = profileSnapshot.data()
        const name = [userProfile.firstName, userProfile.lastName].filter(Boolean).join(' ')
        if (name) setProfile({ name })
      } catch (error) {
        console.error('Unable to load user profile:', error)
        if (isMounted) setProfileError('Your account is signed in, but your profile could not be loaded.')
      }
    }

    loadProfile()
    return () => {
      isMounted = false
    }
  }, [])

  const handleLogout = async () => {
    try {
      await signOut(auth)
      navigate('/')
    } catch (error) {
      console.error('Unable to sign out:', error)
      setProfileError('Unable to sign out. Please try again.')
    }
  }

  const nameParts = profile.name.split(/\s+/).filter(Boolean)
  const initials = nameParts.map((part) => part[0]).join('').slice(0, 2).toUpperCase()

  const handleRetrieve = () => {
    const cin  = form.cin.trim()
    const gcin = form.gcin.trim()
    if (!cin || !gcin) {
      setRetrieveStatus('not_found')
      setFormError('Please enter both CIN / LCIN and GCIN before retrieving.')
      return
    }
    const match = customerDirectory.find(
      (c) => c.cin.toLowerCase() === cin.toLowerCase() &&
             c.gcin.toLowerCase() === gcin.toLowerCase()
    )
    if (match) {
      setForm({ ...form, client: match.name, cin: match.cin, gcin: match.gcin })
      setRetrieveStatus('found')
      setFormError('')
    } else {
      setRetrieveStatus('not_found')
      setFormError('No customer found with the entered CIN / LCIN and GCIN.')
    }
  }

  // ── Search filter ──
  const filtered = cases.filter((c) =>
    c.id.toLowerCase().includes(search.toLowerCase()) ||
    c.client.toLowerCase().includes(search.toLowerCase()) ||
    c.cin.toLowerCase().includes(search.toLowerCase()) ||
    c.gcin.toLowerCase().includes(search.toLowerCase())
  )

  // ── Pagination ──
  const totalPages  = Math.max(1, Math.ceil(filtered.length / ROWS_PER_PAGE))
  const safePage    = Math.min(currentPage, totalPages)
  const paginated   = filtered.slice((safePage - 1) * ROWS_PER_PAGE, safePage * ROWS_PER_PAGE)

  const handleSearch = (val) => {
    setSearch(val)
    setCurrentPage(1)
  }

  // ── Form handlers ──
  const handleFormChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
    setFormError('')
  }

  const handleCreate = () => {
    if (!form.client.trim() || !form.cin.trim() || !form.gcin.trim()) {
      setFormError('Please retrieve a valid customer before creating a case.')
      return
    }
    const newCase = {
      ...form,
      id:     `CASE-${1000 + cases.length + 1}`,
      date:   new Date().toISOString().split('T')[0],
      status: 'Open',
      assignee: '-',
    }
    setCases([newCase, ...cases])
    setForm(emptyForm)
    setRetrieveStatus(null)
    setFormError('')
    setShowModal(false)
  }

  const handleModalClose = () => {
    setForm(emptyForm)
    setRetrieveStatus(null)
    setFormError('')
    setShowModal(false)
  }

  return (
    <div className="db-layout">

      {/* ── NAVBAR ── */}
      <header className="db-navbar">
        <div className="db-nav-left">
          <button className="db-hamburger" onClick={() => setSidebarOpen((p) => !p)} aria-label="Toggle sidebar">☰</button>
          <div className="db-nav-logo" onClick={() => navigate('/dashboard')}>🏥 MediCare Pro</div>
        </div>
        <div className="db-nav-right">
          <div className="db-avatar-wrap">
            <div className="db-avatar-circle">{initials}</div>
            <span className="db-avatar-name">{profile.name}</span>
          </div>
        </div>
      </header>

      {/* ── SIDEBAR ── */}
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
          <button className="db-sidebar-item db-logout" onClick={handleLogout}>
            <span className="db-sidebar-icon">🚪</span>
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* ── MAIN ── */}
      <main className={`db-main ${sidebarOpen ? 'db-main-shifted' : ''}`}>
        <div className="db-content">

          {/* ── Page Header ── */}
          <div className="db-page-header">
            <div>
              <h1>Dashboard</h1>
              <p>Manage and track all your insurance cases</p>
            </div>
            <button className="db-btn-new" onClick={() => navigate('/dashboard/scanmaker')}>
              + New Case
            </button>
          </div>
          {profileError && <p className="db-form-error" role="alert">{profileError}</p>}

          {/* ── Table Card ── */}
          <div className="db-table-card">

            {/* Search bar */}
            <div className="db-table-toolbar">
              <div className="db-search">
                <span className="db-search-icon">🔍</span>
                <input
                  type="text"
                  placeholder="Search by case number or client..."
                  value={search}
                  onChange={(e) => handleSearch(e.target.value)}
                />
                {search && (
                  <button className="db-search-clear" onClick={() => handleSearch('')}>✕</button>
                )}
              </div>
              <span className="db-case-count">{filtered.length} case{filtered.length !== 1 ? 's' : ''}</span>
            </div>

            {/* Table */}
            <div className="db-table-wrapper">
              <table className="db-table">
                <thead>
                  <tr>
                    <th>Case No.</th>
                    <th>Action</th>
                    <th>Client Name</th>
                    <th>CIN / LCIN</th>
                    <th>GCIN</th>
                    <th>Insurance Type</th>
                    <th>Status</th>
                    <th>Date Created</th>
                    <th>Assignee</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.length > 0 ? (
                    paginated.map((c) => (
                      <tr key={c.id}>
                        <td><span className="db-case-id">{c.id}</span></td>
                        <td>
                          <button className="db-btn-view" onClick={() => setViewCase(c)}>
                            View
                          </button>
                        </td>
                        <td>{c.client}</td>
                        <td><span className="db-cin">{c.cin}</span></td>
                        <td><span className="db-cin">{c.gcin}</span></td>
                        <td>{c.type}</td>
                        <td>
                          <span
                            className="db-status-badge"
                            style={{
                              backgroundColor: statusStyle[c.status]?.bg,
                              color: statusStyle[c.status]?.text,
                            }}
                          >
                            {c.status}
                          </span>
                        </td>
                        <td>{c.date}</td>
                        <td>{c.assignee}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={9} className="db-no-results">No cases found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="db-pagination">
              <span className="db-page-info">
                Page {safePage} of {totalPages} &nbsp;·&nbsp; {filtered.length} result{filtered.length !== 1 ? 's' : ''}
              </span>
              <div className="db-page-controls">
                <button
                  className="db-page-btn"
                  onClick={() => setCurrentPage(1)}
                  disabled={safePage === 1}
                >«</button>
                <button
                  className="db-page-btn"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={safePage === 1}
                >‹</button>

                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    className={`db-page-btn ${page === safePage ? 'db-page-active' : ''}`}
                    onClick={() => setCurrentPage(page)}
                  >{page}</button>
                ))}

                <button
                  className="db-page-btn"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={safePage === totalPages}
                >›</button>
                <button
                  className="db-page-btn"
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={safePage === totalPages}
                >»</button>
              </div>
            </div>

          </div>
        </div>
      </main>

      {/* ── NEW CASE MODAL ── */}
      {showModal && (
        <div className="db-modal-overlay" onClick={handleModalClose}>
          <div className="db-modal" onClick={(e) => e.stopPropagation()}>

            <div className="db-modal-header">
              <h2>Create New Case</h2>
              <button className="db-modal-close" onClick={handleModalClose}>✕</button>
            </div>

            <div className="db-modal-body">
              {formError && <p className="db-form-error">{formError}</p>}

              {/* Customer Name */}
              <div className="db-modal-field">
                <label>Customer Name <span className="db-required">*</span></label>
                <input
                  type="text"
                  name="client"
                  value={form.client}
                  onChange={(e) => { setForm({ ...form, client: e.target.value }); setRetrieveStatus(null); setFormError('') }}
                  placeholder="e.g. Alice Tan"
                />
              </div>

              {/* CIN / LCIN and GCIN inputs with Retrieve button */}
              <div className="db-retrieve-row">
                <div className="db-modal-field">
                  <label>CIN / LCIN <span className="db-required">*</span></label>
                  <input
                    type="text"
                    name="cin"
                    value={form.cin}
                    onChange={(e) => { setForm({ ...form, cin: e.target.value }); setRetrieveStatus(null); setFormError('') }}
                    placeholder="e.g. CIN-100123"
                  />
                </div>
                <div className="db-modal-field">
                  <label>GCIN <span className="db-required">*</span></label>
                  <input
                    type="text"
                    name="gcin"
                    value={form.gcin}
                    onChange={(e) => { setForm({ ...form, gcin: e.target.value }); setRetrieveStatus(null); setFormError('') }}
                    placeholder="e.g. GCIN-200456"
                  />
                </div>
                <div className="db-modal-field db-retrieve-btn-wrap">
                  <label>&nbsp;</label>
                  <button className="db-btn-retrieve" onClick={handleRetrieve}>
                    🔍 Retrieve
                  </button>
                </div>
              </div>

              {/* Retrieved customer info */}
              {retrieveStatus === 'found' && (
                <div className="db-retrieve-result">
                  <span className="db-retrieve-check">✔</span>
                  <div>
                    <p className="db-retrieve-name">{form.client}</p>
                    <p className="db-retrieve-ids">{form.cin} · {form.gcin}</p>
                  </div>
                </div>
              )}

              {/* Insurance Type */}
              <div className="db-modal-field">
                <label>Insurance Type</label>
                <select name="type" value={form.type} onChange={handleFormChange}>
                  <option>Auto Insurance</option>
                  <option>Home Insurance</option>
                  <option>Life Insurance</option>
                  <option>Health Insurance</option>
                </select>
              </div>
            </div>

            <div className="db-modal-footer">
              <button className="db-btn-cancel" onClick={handleModalClose}>Cancel</button>
              <button className="db-btn-create" onClick={handleCreate}>Create Case</button>
            </div>

          </div>
        </div>
      )}

      {/* ── VIEW CASE MODAL ── */}
      {viewCase && (
        <div className="db-modal-overlay" onClick={() => setViewCase(null)}>
          <div className="db-modal" onClick={(e) => e.stopPropagation()}>
            <div className="db-modal-header">
              <h2>Case Details</h2>
              <button className="db-modal-close" onClick={() => setViewCase(null)}>✕</button>
            </div>
            <div className="db-modal-body">
              <div className="db-view-grid">
                {[
                  ['Case No.',       viewCase.id],
                  ['Client Name',    viewCase.client],
                  ['CIN / LCIN',     viewCase.cin],
                  ['GCIN',           viewCase.gcin],
                  ['Insurance Type', viewCase.type],
                  ['Assignee',       viewCase.assignee],
                  ['Date Created',   viewCase.date],
                ].map(([label, value]) => (
                  <div className="db-view-item" key={label}>
                    <span className="db-view-label">{label}</span>
                    <span className="db-view-value">{value}</span>
                  </div>
                ))}
                <div className="db-view-item db-view-full">
                  <span className="db-view-label">Status</span>
                  <span
                    className="db-status-badge"
                    style={{
                      backgroundColor: statusStyle[viewCase.status]?.bg,
                      color: statusStyle[viewCase.status]?.text,
                    }}
                  >{viewCase.status}</span>
                </div>
              </div>
            </div>
            <div className="db-modal-footer">
              <button className="db-btn-cancel" onClick={() => setViewCase(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

export default Dashboard
