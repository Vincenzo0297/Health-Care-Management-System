import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { collection, doc, getDoc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore'
import { deleteObject, getDownloadURL, ref as storageRef, uploadBytes } from 'firebase/storage'
import { auth, db, storage } from '../../DB/firebase'
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

function ScanMaker({ processingCaseId = null }) {
  const navigate = useNavigate()
  const processingMode = Boolean(processingCaseId)
  const fileInputRef = useRef(null)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [form, setForm] = useState(emptyForm)
  const [formError, setFormError] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [documents, setDocuments] = useState([])
  const [savedDocuments, setSavedDocuments] = useState([])
  const [viewingDocument, setViewingDocument] = useState(null)
  const [documentUrl, setDocumentUrl] = useState('')
  const [isLoadingDocument, setIsLoadingDocument] = useState(false)
  const [documentViewError, setDocumentViewError] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [processingStatus, setProcessingStatus] = useState('In Progress')
  const [isLoadingCase, setIsLoadingCase] = useState(processingMode)

  useEffect(() => {
    if (!processingCaseId) return undefined

    let isMounted = true
    const loadCase = async () => {
      try {
        const caseSnapshot = await getDoc(doc(db, 'cases', processingCaseId))
        if (!isMounted) return
        if (!caseSnapshot.exists()) {
          setFormError('This case could not be found.')
          return
        }

        const caseData = caseSnapshot.data()
        setForm({
          ...emptyForm,
          customerName: caseData.client || '',
          cin: caseData.cin || '',
          gcin: caseData.gcin || '',
          patientDateOfBirth: caseData.patientDateOfBirth || '',
          patientPhone: caseData.patientPhone || '',
          claimType: caseData.claimType || 'Outpatient',
          dateOfService: caseData.dateOfService || '',
          healthcareProvider: caseData.healthcareProvider || '',
          diagnosis: caseData.diagnosis || '',
          treatment: caseData.treatment || '',
          policyNumber: caseData.policyNumber || '',
          claimAmount: caseData.claimAmount != null ? String(caseData.claimAmount) : '',
          comments: caseData.comments || '',
        })
        setProcessingStatus(caseData.status || 'In Progress')
        setSavedDocuments(Array.isArray(caseData.documents) ? caseData.documents : [])
      } catch (error) {
        console.error('Unable to load case for processing:', error)
        if (isMounted) {
          setFormError(error?.code === 'permission-denied'
            ? 'You do not have permission to access this case. Check the Firestore rules for Processing Maker access.'
            : error?.message || 'Unable to load this case. Please try again.')
        }
      } finally {
        if (isMounted) setIsLoadingCase(false)
      }
    }

    loadCase()
    return () => { isMounted = false }
  }, [processingCaseId])

  const handleChange = (event) => {
    setForm((currentForm) => ({ ...currentForm, [event.target.name]: event.target.value }))
    setFormError('')
  }

  const processFiles = (files) => {
    setUploadError('')
    const errors = []
    const valid = []
    const existingNames = new Set([
      ...savedDocuments.map((document) => document.name),
      ...documents.map((document) => document.name),
    ])

    Array.from(files).forEach((file) => {
      if (!ALLOWED_TYPES.includes(file.type)) {
        errors.push(`"${file.name}" is not a supported file type.`)
      } else if (file.size > MAX_SIZE_MB * 1024 * 1024) {
        errors.push(`"${file.name}" exceeds the ${MAX_SIZE_MB}MB limit.`)
      } else if (existingNames.has(file.name)) {
        errors.push(`"${file.name}" is already added.`)
      } else {
        existingNames.add(file.name)
        valid.push({ file, name: file.name, size: file.size, type: file.type })
      }
    })

    if (errors.length) setUploadError(errors.join(' '))
    if (valid.length) setDocuments((previous) => [...previous, ...valid])
  }

  const uploadPendingDocuments = async (caseId) => {
    const uploaded = []
    try {
      for (const document of documents) {
        const fileRef = storageRef(storage, `case-documents/${caseId}/${doc(collection(db, 'cases')).id}`)
        await uploadBytes(fileRef, document.file, { contentType: document.type })
        uploaded.push({
          name: document.name,
          size: document.size,
          type: document.type,
          path: fileRef.fullPath,
        })
      }
      return uploaded
    } catch (error) {
      await Promise.all(uploaded.map(async (document) => {
        try {
          await deleteObject(storageRef(storage, document.path))
        } catch (cleanupError) {
          console.error('Unable to clean up an incomplete document upload:', cleanupError)
        }
      }))
      throw error
    }
  }

  const handleViewDocument = async (document) => {
    setViewingDocument(document)
    setDocumentUrl('')
    setDocumentViewError('')
    setIsLoadingDocument(true)
    try {
      const url = await getDownloadURL(storageRef(storage, document.path))
      setDocumentUrl(url)
    } catch (error) {
      console.error('Unable to open case document:', error)
      setDocumentViewError(error?.code === 'storage/object-not-found'
        ? 'This document file could not be found.'
        : error?.message || 'Unable to open this document. Please try again.')
    } finally {
      setIsLoadingDocument(false)
    }
  }

  const handleSubmit = async (event) => {
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
      setFormError(`Complete all required case details before ${processingMode ? 'saving' : 'creating'} the case.`)
      return
    }
    if (!user) {
      setFormError('You must be signed in to create a case.')
      return
    }

    setIsSaving(true)
    setFormError('')
    try {
      const caseDetails = {
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
        updatedAt: serverTimestamp(),
      }

      if (processingMode) {
        await updateDoc(doc(db, 'cases', processingCaseId), {
          ...caseDetails,
          status: processingStatus,
          processingBy: user.uid,
          processingAssignee: user.displayName || user.email || '—',
        })
      } else {
        const caseRef = doc(collection(db, 'cases'))
        const uploadedDocuments = await uploadPendingDocuments(caseRef.id)
        await setDoc(caseRef, {
          ...caseDetails,
          caseNumber: `CASE-${Date.now()}`,
          status: 'Open',
          assignee: user.displayName || user.email || '—',
          createdBy: user.uid,
          createdAt: serverTimestamp(),
          documents: uploadedDocuments,
        })
      }
      setForm(emptyForm)
      setDocuments([])
      setSavedDocuments([])
      navigate(processingMode ? '/dashboard/processingmaker' : '/dashboard')
    } catch (error) {
      console.error(`Unable to ${processingMode ? 'save' : 'create'} case:`, error)
      if (error?.code === 'permission-denied') {
        setFormError(processingMode
          ? 'Firestore denied this update. Update the Firestore rules to allow Processing Makers to read and update cases.'
          : 'Firestore denied this case. Update the Firestore rules to allow signed-in users to create cases with their own UID, then try again.')
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
          <div className="db-nav-logo" onClick={() => navigate(processingMode ? '/dashboard/processingmaker' : '/dashboard')}>🏥 MediCare Pro</div>
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
                  <h1 className="sm-title">{processingMode ? 'Process Healthcare Case' : 'Create Healthcare Case'}</h1>
                  <p>{processingMode ? 'Review the scan details and add the necessary processing information.' : 'Enter the patient, visit, and claim details for this healthcare case.'}</p>
                </div>
              </header>

              {isLoadingCase ? <p>Loading case details...</p> : (
              <form onSubmit={handleSubmit}>
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

                {processingMode && (
                  <div className="sm-section">
                    <h2 className="sm-section-title">Processing</h2>
                    <div className="sm-field">
                      <label htmlFor="processing-status">Case Status</label>
                      <select id="processing-status" className="sm-input" value={processingStatus} onChange={(event) => setProcessingStatus(event.target.value)}>
                        <option>Open</option>
                        <option>In Progress</option>
                        <option>Pending</option>
                        <option>Closed</option>
                      </select>
                    </div>
                  </div>
                )}

                {formError && <p className="sm-msg sm-msg-error" role="alert">{formError}</p>}

                <div className="sm-left-footer">
                  <button type="submit" className="sm-btn-create" disabled={isSaving || isLoadingCase}>
                    {isSaving ? (processingMode ? 'Saving...' : 'Creating...') : (processingMode ? 'Save Details' : 'Create Case')}
                  </button>
                  <button type="button" className="sm-btn-cancel" onClick={handleCancel} disabled={isSaving}>Cancel</button>
                </div>
              </form>
              )}
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

              {!processingMode && (
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
              )}

              {!processingMode && uploadError && <p className="sm-msg sm-msg-error" role="alert">{uploadError}</p>}

              {processingMode && (
                savedDocuments.length ? (
                  <ul className="sm-file-list">
                    {savedDocuments.map((document) => (
                      <li key={document.path} className="sm-file-item">
                        <span className="sm-file-icon">{document.type === 'application/pdf' ? '📄' : '🖼️'}</span>
                        <div className="sm-file-info">
                          <span className="sm-file-name">{document.name}</span>
                          <span className="sm-file-size">{formatSize(document.size)}</span>
                        </div>
                        <button type="button" className="sm-btn-browse" onClick={() => handleViewDocument(document)}>
                          View
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="sm-upload-empty">No documents attached to this case.</p>
                )
              )}

              {!processingMode && documents.length > 0 ? (
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
                        onClick={() => setDocuments((previous) => previous.filter((item) => item.file !== document.file))}
                        aria-label={`Remove ${document.name}`}
                      >✕</button>
                    </li>
                  ))}
                </ul>
              ) : !processingMode ? (
                <p className="sm-upload-empty">No documents selected.</p>
              ) : null}
            </section>
        </div>
      </main>
      {viewingDocument && (
        <div className="db-modal-overlay" onClick={() => setViewingDocument(null)}>
            <section className="db-modal sm-document-modal" onClick={(event) => event.stopPropagation()}>
              <header className="db-modal-header">
                <h2>{viewingDocument.name}</h2>
                <button className="db-modal-close" onClick={() => setViewingDocument(null)} aria-label="Close document viewer">✕</button>
              </header>
              <div className="db-modal-body sm-document-viewer">
                {isLoadingDocument && <p>Loading document...</p>}
                {documentViewError && <p className="sm-msg sm-msg-error" role="alert">{documentViewError}</p>}
                {documentUrl && viewingDocument.type === 'application/pdf' && (
                  <iframe title={viewingDocument.name} src={documentUrl} />
                )}
                {documentUrl && viewingDocument.type.startsWith('image/') && (
                  <img src={documentUrl} alt={viewingDocument.name} />
                )}
              </div>
            </section>
        </div>
      )}
    </div>
  )
}

export default ScanMaker
