import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { signOut } from 'firebase/auth'
import { collection, onSnapshot, query, where } from 'firebase/firestore'
import { auth, db } from '../../DB/firebase'
import ScanMaker from '../Scan Maker/ScanMaker'
import '../../User Page/Dashboard/Dashboard.css'
import '../Scan Maker/ScanMaker.css'
import './ProcessingMaker.css'

const statusStyle = {
  Open: { bg: '#dbeafe', text: '#1d4ed8' },
  'In Progress': { bg: '#fef9c3', text: '#ca8a04' },
  Pending: { bg: '#ffedd5', text: '#ea580c' },
  Closed: { bg: '#dcfce7', text: '#16a34a' },
}

function ProcessingMaker() {
  const navigate = useNavigate()
  const location = useLocation()
  const { caseId } = useParams()
  const [cases, setCases] = useState([])
  const [search, setSearch] = useState('')
  const [isLoadingCases, setIsLoadingCases] = useState(true)
  const [loadError, setLoadError] = useState('')

  useEffect(() => {
    if (caseId) return undefined

    const activeCasesQuery = query(
      collection(db, 'cases'),
      where('status', 'in', ['Open', 'In Progress'])
    )
    const unsubscribe = onSnapshot(activeCasesQuery, (snapshot) => {
      const loadedCases = snapshot.docs.map((caseDocument) => {
        const caseData = caseDocument.data()
        const createdAt = caseData.createdAt?.toDate?.()
        return {
          ...caseData,
          firestoreId: caseDocument.id,
          caseNumber: caseData.caseNumber || caseDocument.id,
          date: createdAt ? createdAt.toLocaleDateString() : '—',
        }
      })
      loadedCases.sort((first, second) => {
        const firstCreatedAt = first.createdAt?.toMillis?.() || 0
        const secondCreatedAt = second.createdAt?.toMillis?.() || 0
        return secondCreatedAt - firstCreatedAt
      })
      setCases(loadedCases)
      setIsLoadingCases(false)
      setLoadError('')
    }, (error) => {
      console.error('Unable to load cases for Processing Maker:', error)
      setLoadError(error?.code === 'permission-denied'
        ? 'You do not have permission to access shared cases. Update the Firestore rules to allow Processing Makers to read cases.'
        : error?.message || 'Unable to load cases. Please try again.')
      setIsLoadingCases(false)
    })

    return unsubscribe
  }, [caseId])

  if (caseId) return <ScanMaker processingCaseId={caseId} />

  const filteredCases = cases.filter((caseItem) => (
    [caseItem.caseNumber, caseItem.client, caseItem.cin, caseItem.gcin]
      .some((value) => String(value || '').toLowerCase().includes(search.toLowerCase()))
  ))
  const handleLogout = async () => {
    try {
      await signOut(auth)
      navigate('/')
    } catch (error) {
      console.error('Unable to sign out:', error)
      setLoadError('Unable to sign out. Please try again.')
    }
  }

  return (
    <div className="db-layout pm-layout">
      <aside className="db-sidebar db-sidebar-open">
        <nav className="db-sidebar-nav">
          <ul>
            <li>
              <button
                className={`db-sidebar-item ${location.pathname === '/dashboard' ? 'active' : ''}`}
                onClick={() => navigate('/dashboard')}
              >
                <span className="db-sidebar-icon">🏠</span>
                <span>Dashboard</span>
              </button>
            </li>
            <li>
              <button
                className={`db-sidebar-item ${location.pathname === '/dashboard/myprofile' ? 'active' : ''}`}
                onClick={() => navigate('/dashboard/myprofile')}
              >
                <span className="db-sidebar-icon">👤</span>
                <span>My Profile</span>
              </button>
            </li>
          </ul>
        </nav>
        <div className="db-sidebar-footer">
          <button className="db-sidebar-item db-logout" onClick={handleLogout}>
            <span className="db-sidebar-icon">🚪</span>
            <span>Logout</span>
          </button>
        </div>
      </aside>

      <main className="db-main pm-main">
        <div className="sm-content pm-content">
          <section className="sm-case-card pm-queue-card">
            <header className="sm-case-header">
              <div>
                <h1 className="sm-title">Processing Maker</h1>
                <p>Open or in-progress cases can be reviewed and updated here.</p>
              </div>
            </header>

            {loadError && <p className="sm-msg sm-msg-error" role="alert">{loadError}</p>}

            <div className="pm-queue-toolbar">
              <div className="db-search">
                <span className="db-search-icon">🔍</span>
                <input
                  type="text"
                  placeholder="Search by case number or patient..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
                {search && (
                  <button className="db-search-clear" onClick={() => setSearch('')} aria-label="Clear search">✕</button>
                )}
              </div>
              <span className="db-case-count">{filteredCases.length} case{filteredCases.length !== 1 ? 's' : ''}</span>
            </div>

            <div className="db-table-wrapper pm-table-wrapper">
              <table className="db-table">
                <thead>
                  <tr>
                    <th>Case No.</th>
                    <th>Action</th>
                    <th>Patient Name</th>
                    <th>CIN / LCIN</th>
                    <th>GCIN</th>
                    <th>Status</th>
                    <th>Date Created</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoadingCases ? (
                    <tr><td colSpan={7} className="db-no-results">Loading cases...</td></tr>
                  ) : filteredCases.length ? (
                    filteredCases.map((caseItem) => (
                      <tr key={caseItem.firestoreId}>
                        <td><span className="db-case-id">{caseItem.caseNumber}</span></td>
                        <td>
                          <button
                            className="db-btn-view"
                            onClick={() => navigate(`/dashboard/processingmaker/${caseItem.firestoreId}`)}
                          >
                            Process
                          </button>
                        </td>
                        <td>{caseItem.client || '—'}</td>
                        <td><span className="db-cin">{caseItem.cin || '—'}</span></td>
                        <td><span className="db-cin">{caseItem.gcin || '—'}</span></td>
                        <td>
                          <span
                            className="db-status-badge"
                            style={{
                              backgroundColor: statusStyle[caseItem.status]?.bg,
                              color: statusStyle[caseItem.status]?.text,
                            }}
                          >
                            {caseItem.status || 'Open'}
                          </span>
                        </td>
                        <td>{caseItem.date}</td>
                      </tr>
                    ))
                  ) : (
                    <tr><td colSpan={7} className="db-no-results">No cases found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}

export default ProcessingMaker
