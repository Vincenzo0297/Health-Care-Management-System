import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { signOut } from 'firebase/auth'
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  where,
} from 'firebase/firestore'
import { auth, db } from '../../DB/firebase'
import './Dashboard.css'

const navItems = [
  { icon: '🏠', label: 'Dashboard',              path: '/dashboard' },
  { icon: '👤', label: 'My Profile',             path: '/dashboard/myprofile' },
]

const statusStyle = {
  'Open':        { bg: '#dbeafe', text: '#1d4ed8' },
  'In Progress': { bg: '#fef9c3', text: '#ca8a04' },
  'Pending':     { bg: '#ffedd5', text: '#ea580c' },
  'Closed':      { bg: '#dcfce7', text: '#16a34a' },
}

const ROWS_PER_PAGE = 5

function Dashboard() {
  const navigate = useNavigate()
  const location = useLocation()

  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [profile, setProfile] = useState({
    name: auth.currentUser?.displayName || auth.currentUser?.email || 'Account',
  })
  const [profileError, setProfileError] = useState('')
  const [cases, setCases]         = useState([])
  const [isLoadingCases, setIsLoadingCases] = useState(true)
  const [search, setSearch]       = useState('')

  // ── Pagination ──
  const [currentPage, setCurrentPage] = useState(1)

  // ── View case modal ──
  const [viewCase, setViewCase] = useState(null)

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
    const casesQuery = query(collection(db, 'cases'), where('createdBy', '==', user.uid))
    const unsubscribeCases = onSnapshot(casesQuery, (snapshot) => {
      if (!isMounted) return
      const loadedCases = snapshot.docs.map((caseDocument) => {
        const caseData = caseDocument.data()
        const createdAt = caseData.createdAt?.toDate?.()
        return {
          ...caseData,
          id: caseData.caseNumber || caseDocument.id,
          date: createdAt ? createdAt.toLocaleDateString() : caseData.date || '—',
          assignee: caseData.assignee || user.displayName || user.email || '—',
        }
      })
      loadedCases.sort((first, second) => {
        const firstCreatedAt = first.createdAt?.toMillis?.() || 0
        const secondCreatedAt = second.createdAt?.toMillis?.() || 0
        return secondCreatedAt - firstCreatedAt
      })
      setCases(loadedCases)
      setIsLoadingCases(false)
    }, (error) => {
      console.error('Unable to load cases:', error)
      if (isMounted) {
        setProfileError('Unable to load cases. Please check your Firestore access and try again.')
        setIsLoadingCases(false)
      }
    })

    return () => {
      isMounted = false
      unsubscribeCases()
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

  // ── Search filter ──
  const filtered = cases.filter((c) =>
    String(c.id || '').toLowerCase().includes(search.toLowerCase()) ||
    String(c.client || '').toLowerCase().includes(search.toLowerCase()) ||
    String(c.cin || '').toLowerCase().includes(search.toLowerCase()) ||
    String(c.gcin || '').toLowerCase().includes(search.toLowerCase())
  )

  // ── Pagination ──
  const totalPages  = Math.max(1, Math.ceil(filtered.length / ROWS_PER_PAGE))
  const safePage    = Math.min(currentPage, totalPages)
  const paginated   = filtered.slice((safePage - 1) * ROWS_PER_PAGE, safePage * ROWS_PER_PAGE)

  const handleSearch = (val) => {
    setSearch(val)
    setCurrentPage(1)
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
                  {isLoadingCases ? (
                    <tr>
                      <td colSpan={9} className="db-no-results">Loading cases...</td>
                    </tr>
                  ) : paginated.length > 0 ? (
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
