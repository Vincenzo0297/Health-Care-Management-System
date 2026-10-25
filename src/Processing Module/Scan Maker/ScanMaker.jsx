import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { addDoc, collection, serverTimestamp } from 'firebase/firestore'
import { auth, db } from '../../DB/firebase'
import '../../User Page/Dashboard/Dashboard.css'
import './ScanMaker.css'

const navItems = [
  { icon: '📎', label: 'Upload Documents' },
]

const ALLOWED_TYPES = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg']
const MAX_SIZE_MB = 10
const emptyForm = {
  customerName: '',
  cin: '',
  gcin: '',
  patientDateOfBirth: '',
  patientPhone: '',
  claimType: 'Outpatient',
  dateOfService: '',
  healthcareProvider: '',
  diagnosis: '',
  treatment: '',
  policyNumber: '',
  claimAmount: '',
  comments: '',
}

function ScanMaker() {
  const navigate = useNavigate()
  const fileInputRef = useRef(null)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [form, setForm] = useState(emptyForm)
  const [formError, setFormError] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [documents, setDocuments] = useState([])
  const [dragOver, setDragOver] = useState(false)
  const [uploadError, setUploadError] = useState('')

  const handleChange = (event) => {
    setForm((currentForm) => ({ ...currentForm, [event.target.name]: event.target.value }))
    setFormError('')
  }

  const processFiles = (files) => {
    setUploadError('')
    const errors = []
    const valid = []

    Array.from(files).forEach((file) => {
      if (!ALLOWED_TYPES.includes(file.type)) {
        errors.push(`"${file.name}" is not a supported file type.`)
      } else if (file.size > MAX_SIZE_MB * 1024 * 1024) {
        errors.push(`"${file.name}" exceeds the ${MAX_SIZE_MB}MB limit.`)
      } else if (documents.some((document) => document.name === file.name)) {
        errors.push(`"${file.name}" is already added.`)
      } else {
        valid.push({ name: file.name, size: file.size, type: file.type })
      }
    })

    if (errors.length) setUploadError(errors.join(' '))
    if (valid.length) setDocuments((previous) => [...previous, ...valid])
  }

  const handleCreateCase = async (event) => {
    event.preventDefault()
    const user = auth.currentUser
    const customerName = form.customerName.trim()
    const cin = form.cin.trim()
    const gcin = form.gcin.trim()

    if (
      !customerName
      || !cin
      || !gcin
      || !form.dateOfService
      || !form.healthcareProvider.trim()
      || !form.diagnosis.trim()
    ) {
      setFormError('Complete all required case details before creating the case.')
      return
    }
    if (!user) {
      setFormError('You must be signed in to create a case.')
      return
    }

    setIsSaving(true)
    setFormError('')
    try {
      await addDoc(collection(db, 'cases'), {
        caseNumber: `CASE-${Date.now()}`,
        client: customerName,
        cin,
        gcin,
        type: 'Health Insurance',
        claimType: form.claimType,
        patientDateOfBirth: form.patientDateOfBirth,
        patientPhone: form.patientPhone.trim(),
        dateOfService: form.dateOfService,
        healthcareProvider: form.healthcareProvider.trim(),
        diagnosis: form.diagnosis.trim(),
        treatment: form.treatment.trim(),
        policyNumber: form.policyNumber.trim(),
        claimAmount: form.claimAmount ? Number(form.claimAmount) : null,
        comments: form.comments.trim(),
        status: 'Open',
        assignee: user.displayName || user.email || '—',
        createdBy: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
      setForm(emptyForm)
      navigate('/dashboard')
    } catch (error) {
      console.error('Unable to create case:', error)
      if (error?.code === 'permission-denied') {
        setFormError('Firestore denied this case. Update the Firestore rules to allow signed-in users to create cases with their own UID, then try again.')
      } else {
        setFormError(error?.message || 'Unable to create the case. Please try again.')
      }
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    setForm(emptyForm)
    setFormError('')
    navigate('/dashboard')
  }

  const formatSize = (bytes) => (
    bytes < 1024 * 1024
      ? `${(bytes / 1024).toFixed(1)} KB`
      : `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  )

  const initials = (auth.currentUser?.displayName || auth.currentUser?.email || 'Account')
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <div className="db-layout">
      <header className="db-navbar">
        <div className="db-nav-left">
          <button className="db-hamburger" onClick={() => setSidebarOpen((open) => !open)} aria-label="Toggle sidebar">☰</button>
          <div className="db-nav-logo" onClick={() => navigate('/dashboard')}>🏥 MediCare Pro</div>
        </div>
        <div className="db-nav-right">
          <div className="db-avatar-wrap">
            <div className="db-avatar-circle">{initials}</div>
            <span className="db-avatar-name">{auth.currentUser?.displayName || auth.currentUser?.email}</span>
          </div>
        </div>
      </header>

      <aside className={`db-sidebar ${sidebarOpen ? 'db-sidebar-open' : 'db-sidebar-closed'}`}>
        <nav className="db-sidebar-nav">
          <ul>
            {navItems.map((item) => (
              <li key={item.label}>
                <button
                  className={`db-sidebar-item ${uploadOpen ? 'active' : ''}`}
                  aria-pressed={uploadOpen}
                  onClick={() => setUploadOpen((open) => !open)}
                >
                  <span className="db-sidebar-icon">{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              </li>
            ))}
          </ul>
        </nav>
      </aside>

      <main className={`db-main ${sidebarOpen ? 'db-main-shifted' : ''}`}>
        <div className={`sm-content ${uploadOpen ? 'sm-content-with-upload' : ''}`}>
            <section className="sm-case-card">
              <header className="sm-case-header">
                <div>
                  <h1 className="sm-title">Create Healthcare Case</h1>
                  <p>Enter the patient, visit, and claim details for this healthcare case.</p>
                </div>
              </header>

              <form onSubmit={handleCreateCase}>
                <div className="sm-section">
                  <h2 className="sm-section-title">Patient Information</h2>
                  <div className="sm-form-grid">
                    <div className="sm-field">
                      <label htmlFor="customer-name">Patient Name <span className="sm-required">*</span></label>
                      <input
                        id="customer-name"
                        type="text"
                        className="sm-input"
                        name="customerName"
                        value={form.customerName}
                        onChange={handleChange}
                        autoComplete="name"
                        required
                      />
                    </div>
                    <div className="sm-field">
                      <label htmlFor="patient-dob">Date of Birth</label>
                      <input
                        id="patient-dob"
                        type="date"
                        className="sm-input"
                        name="patientDateOfBirth"
                        value={form.patientDateOfBirth}
                        onChange={handleChange}
                        max={new Date().toISOString().split('T')[0]}
                      />
                    </div>
                    <div className="sm-field">
                      <label htmlFor="customer-cin">CIN / LCIN <span className="sm-required">*</span></label>
                      <input id="customer-cin" type="text" className="sm-input" name="cin" value={form.cin} onChange={handleChange} required />
                    </div>
                    <div className="sm-field">
                      <label htmlFor="customer-gcin">GCIN <span className="sm-required">*</span></label>
                      <input id="customer-gcin" type="text" className="sm-input" name="gcin" value={form.gcin} onChange={handleChange} required />
                    </div>
                    <div className="sm-field">
                      <label htmlFor="patient-phone">Contact Number</label>
                      <input id="patient-phone" type="tel" className="sm-input" name="patientPhone" value={form.patientPhone} onChange={handleChange} autoComplete="tel" />
                    </div>
                  </div>
                </div>

                <div className="sm-section">
                  <h2 className="sm-section-title">Healthcare Visit</h2>
                  <div className="sm-form-grid">
                    <div className="sm-field">
                      <label htmlFor="claim-type">Visit / Claim Type <span className="sm-required">*</span></label>
                      <select id="claim-type" className="sm-input" name="claimType" value={form.claimType} onChange={handleChange} required>
                        <option>Outpatient</option>
                        <option>Inpatient</option>
                        <option>Emergency</option>
                        <option>Prescription / Pharmacy</option>
                        <option>Diagnostic / Lab</option>
                        <option>Dental</option>
                        <option>Vision</option>
                      </select>
                    </div>
                    <div className="sm-field">
                      <label htmlFor="date-of-service">Date of Service <span className="sm-required">*</span></label>
                      <input id="date-of-service" type="date" className="sm-input" name="dateOfService" value={form.dateOfService} onChange={handleChange} max={new Date().toISOString().split('T')[0]} required />
                    </div>
                    <div className="sm-field">
                      <label htmlFor="healthcare-provider">Hospital / Clinic <span className="sm-required">*</span></label>
                      <input id="healthcare-provider" type="text" className="sm-input" name="healthcareProvider" value={form.healthcareProvider} onChange={handleChange} required />
                    </div>
                    <div className="sm-field">
                      <label htmlFor="policy-number">Health Policy Number</label>
                      <input id="policy-number" type="text" className="sm-input" name="policyNumber" value={form.policyNumber} onChange={handleChange} />
                    </div>
                  </div>
                </div>

                <div className="sm-section">
                  <h2 className="sm-section-title">Medical and Claim Details</h2>
                  <div className="sm-field">
                    <label htmlFor="diagnosis">Diagnosis / Reason for Visit <span className="sm-required">*</span></label>
                    <textarea
                      id="diagnosis"
                      className="sm-input sm-textarea"
                      name="diagnosis"
                      value={form.diagnosis}
                      onChange={handleChange}
                      rows="3"
                      required
                    />
                  </div>
                  <div className="sm-field">
                    <label htmlFor="treatment">Treatment / Procedure</label>
                    <textarea
                      id="treatment"
                      className="sm-input sm-textarea"
                      name="treatment"
                      value={form.treatment}
                      onChange={handleChange}
                      rows="3"
                    />
                  </div>
                  <div className="sm-form-grid">
                    <div className="sm-field">
                      <label htmlFor="claim-amount">Claim Amount</label>
                      <input id="claim-amount" type="number" className="sm-input" name="claimAmount" value={form.claimAmount} onChange={handleChange} min="0" step="0.01" />
                    </div>
                  </div>
                </div>

                <div className="sm-section">
                  <h2 className="sm-section-title">Comments</h2>
                  <div className="sm-field">
                    <label htmlFor="case-comments">Case Comments</label>
                    <textarea
                      id="case-comments"
                      className="sm-input sm-textarea"
                      name="comments"
                      value={form.comments}
                      onChange={handleChange}
                      rows="4"
                      placeholder="Add any relevant notes about this case"
                    />
                  </div>
                </div>

                {formError && <p className="sm-msg sm-msg-error" role="alert">{formError}</p>}

                <div className="sm-left-footer">
                  <button type="submit" className="sm-btn-create" disabled={isSaving}>
                    {isSaving ? 'Creating...' : 'Create Case'}
                  </button>
                  <button type="button" className="sm-btn-cancel" onClick={handleCancel} disabled={isSaving}>Cancel</button>
                </div>
              </form>
            </section>

            <section
              className={`sm-upload-card ${uploadOpen ? 'sm-upload-card-open' : 'sm-upload-card-closed'}`}
              aria-hidden={!uploadOpen}
              inert={!uploadOpen}
            >
              <header className="sm-case-header">
                <div>
                  <h1 className="sm-title">Upload Documents</h1>
                  <p>Choose PDF, PNG, or JPG files up to {MAX_SIZE_MB} MB each.</p>
                </div>
              </header>

              <div
                className={`sm-dropzone ${dragOver ? 'sm-dropzone-active' : ''}`}
                onDragOver={(event) => { event.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(event) => {
                  event.preventDefault()
                  setDragOver(false)
                  processFiles(event.dataTransfer.files)
                }}
              >
                <span className="sm-dropzone-icon">📂</span>
                <p className="sm-dropzone-text">Drag &amp; drop files here</p>
                <button type="button" className="sm-btn-browse" onClick={() => fileInputRef.current?.click()}>
                  Browse Files
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".pdf,.png,.jpg,.jpeg"
                  onChange={(event) => {
                    processFiles(event.target.files)
                    event.target.value = ''
                  }}
                  hidden
                />
              </div>

              {uploadError && <p className="sm-msg sm-msg-error" role="alert">{uploadError}</p>}

              {documents.length > 0 ? (
                <ul className="sm-file-list">
                  {documents.map((document) => (
                    <li key={document.name} className="sm-file-item">
                      <span className="sm-file-icon">{document.type === 'application/pdf' ? '📄' : '🖼️'}</span>
                      <div className="sm-file-info">
                        <span className="sm-file-name">{document.name}</span>
                        <span className="sm-file-size">{formatSize(document.size)}</span>
                      </div>
                      <button
                        type="button"
                        className="sm-file-remove"
                        onClick={() => setDocuments((previous) => previous.filter((item) => item.name !== document.name))}
                        aria-label={`Remove ${document.name}`}
                      >✕</button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="sm-upload-empty">No documents selected.</p>
              )}
            </section>
        </div>
      </main>
    </div>
  )
}

export default ScanMaker
