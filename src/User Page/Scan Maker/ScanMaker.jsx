import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import './ScanMaker.css'

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

const ALLOWED_TYPES = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg']
const MAX_SIZE_MB   = 10

function ScanMaker() {
  const navigate     = useNavigate()
  const fileInputRef = useRef(null)

  // ── Upload panel toggle ──
  const [uploadOpen, setUploadOpen] = useState(false)

  // ── Customer Info ──
  const [form, setForm] = useState({ customerName: '', cin: '', gcin: '', insuranceType: 'Auto Insurance' })
  const [retrieveStatus, setRetrieveStatus]     = useState(null)
  const [retrievedCustomer, setRetrievedCustomer] = useState(null)
  const [formError, setFormError]               = useState('')

  // ── Documents ──
  const [documents, setDocuments]     = useState([])
  const [dragOver, setDragOver]       = useState(false)
  const [uploadError, setUploadError] = useState('')

  // ── Retrieve ──
  const handleRetrieve = () => {
    const cin  = form.cin.trim()
    const gcin = form.gcin.trim()
    if (!cin || !gcin) {
      setRetrieveStatus('not_found')
      setFormError('Please enter both CIN / LCIN and GCIN to retrieve customer info.')
      return
    }
    const match = customerDirectory.find(
      (c) => c.cin.toLowerCase() === cin.toLowerCase() &&
             c.gcin.toLowerCase() === gcin.toLowerCase()
    )
    if (match) {
      setForm({ ...form, customerName: match.name, cin: match.cin, gcin: match.gcin })
      setRetrievedCustomer(match)
      setRetrieveStatus('found')
      setFormError('')
    } else {
      setRetrievedCustomer(null)
      setRetrieveStatus('not_found')
      setFormError('No customer found with the entered CIN / LCIN and GCIN.')
    }
  }

  // ── File handling ──
  const processFiles = (files) => {
    setUploadError('')
    const errors = []
    const valid  = []
    Array.from(files).forEach((file) => {
      if (!ALLOWED_TYPES.includes(file.type))
        errors.push(`"${file.name}" is not a supported file type.`)
      else if (file.size > MAX_SIZE_MB * 1024 * 1024)
        errors.push(`"${file.name}" exceeds the ${MAX_SIZE_MB}MB limit.`)
      else if (documents.find((d) => d.name === file.name))
        errors.push(`"${file.name}" is already added.`)
      else
        valid.push({ name: file.name, size: file.size, type: file.type })
    })
    if (errors.length) setUploadError(errors.join(' '))
    if (valid.length)  setDocuments((prev) => [...prev, ...valid])
  }

  const handleFileInput = (e) => { processFiles(e.target.files); e.target.value = '' }
  const handleDrop = (e) => { e.preventDefault(); setDragOver(false); processFiles(e.dataTransfer.files) }
  const handleRemoveDoc = (name) => setDocuments((prev) => prev.filter((d) => d.name !== name))

  const formatSize = (bytes) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }
  const fileIcon = (type) => {
    if (type === 'application/pdf') return '📄'
    if (type.startsWith('image/')) return '🖼️'
    return '📎'
  }

  // ── Submit ──
  const handleSubmit = () => {
    if (!form.customerName.trim() || !form.cin.trim() || !form.gcin.trim()) {
      setFormError('Please retrieve a valid customer before submitting.')
      return
    }
    navigate('/dashboard')
  }

  return (
    <div className="sm-page">

      {/* ── Outer bordered box ── */}
      <div className={`sm-box ${uploadOpen ? 'sm-box-expanded' : ''}`}>

        {/* ── LEFT PANEL ── */}
        <div className="sm-left">

          {/* Top row: title + Upload Document toggle button */}
          <div className="sm-left-topbar">
            <h1 className="sm-title">Scan Maker</h1>
            <button
              className={`sm-btn-upload-toggle ${uploadOpen ? 'sm-btn-upload-toggle-active' : ''}`}
              onClick={() => setUploadOpen((prev) => !prev)}
            >
              {uploadOpen ? '✕ Close Upload' : '📎 Upload Document'}
            </button>
          </div>

          {/* Customer Information */}
          <div className="sm-section">
            <h2 className="sm-section-title">Customer Information</h2>

            <div className="sm-field">
              <label>Customer Name</label>
              <input
                type="text"
                className="sm-input"
                value={form.customerName}
                onChange={(e) => { setForm({ ...form, customerName: e.target.value }); setRetrieveStatus(null); setFormError('') }}
                placeholder="e.g. Alice Tan"
              />
            </div>

            <div className="sm-retrieve-row">
              <div className="sm-field">
                <label>CIN / LCIN <span className="sm-required">*</span></label>
                <input
                  type="text"
                  className="sm-input"
                  value={form.cin}
                  onChange={(e) => { setForm({ ...form, cin: e.target.value }); setRetrieveStatus(null); setFormError('') }}
                  placeholder="e.g. CIN-100123"
                />
              </div>
              <div className="sm-field">
                <label>GCIN <span className="sm-required">*</span></label>
                <input
                  type="text"
                  className="sm-input"
                  value={form.gcin}
                  onChange={(e) => { setForm({ ...form, gcin: e.target.value }); setRetrieveStatus(null); setFormError('') }}
                  placeholder="e.g. GCIN-200456"
                />
              </div>
              <div className="sm-field sm-retrieve-btn-col">
                <label>&nbsp;</label>
                <button className="sm-btn-retrieve" onClick={handleRetrieve}>
                  Retrieve Customer Information
                </button>
              </div>
            </div>

            {formError && <p className="sm-msg sm-msg-error">{formError}</p>}

            {retrieveStatus === 'found' && retrievedCustomer && (
              <div className="sm-retrieve-success">
                <span className="sm-check">✔</span>
                <div>
                  <p className="sm-retrieved-name">{retrievedCustomer.name}</p>
                  <p className="sm-retrieved-ids">{retrievedCustomer.cin} · {retrievedCustomer.gcin}</p>
                </div>
              </div>
            )}

            <div className="sm-field sm-field-half">
              <label>Insurance Type</label>
              <select
                className="sm-input"
                value={form.insuranceType}
                onChange={(e) => setForm({ ...form, insuranceType: e.target.value })}
              >
                <option>Auto Insurance</option>
                <option>Home Insurance</option>
                <option>Life Insurance</option>
                <option>Health Insurance</option>
              </select>
            </div>
          </div>

          {/* Bottom actions */}
          <div className="sm-left-footer">
            <button className="sm-btn-create" onClick={handleSubmit}>Create Case</button>
            <button className="sm-btn-cancel" onClick={() => navigate('/dashboard')}>Cancel</button>
          </div>
        </div>

        {/* ── RIGHT PANEL (upload) — slides in/out ── */}
        <div className={`sm-right ${uploadOpen ? 'sm-right-open' : 'sm-right-closed'}`}>
          <p className="sm-upload-label">Upload Document</p>
          <p className="sm-upload-hint">PDF, PNG, JPG · max {MAX_SIZE_MB}MB per file</p>

          <div
            className={`sm-dropzone ${dragOver ? 'sm-dropzone-active' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
          >
            <span className="sm-dropzone-icon">📂</span>
            <p className="sm-dropzone-text">Drag & drop files here</p>
            <button className="sm-btn-browse" onClick={() => fileInputRef.current.click()}>
              Browse Files
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.png,.jpg,.jpeg"
              onChange={handleFileInput}
              style={{ display: 'none' }}
            />
          </div>

          {uploadError && <p className="sm-msg sm-msg-error">{uploadError}</p>}

          {documents.length > 0 && (
            <ul className="sm-file-list">
              {documents.map((doc) => (
                <li key={doc.name} className="sm-file-item">
                  <span className="sm-file-icon">{fileIcon(doc.type)}</span>
                  <div className="sm-file-info">
                    <span className="sm-file-name">{doc.name}</span>
                    <span className="sm-file-size">{formatSize(doc.size)}</span>
                  </div>
                  <button className="sm-file-remove" onClick={() => handleRemoveDoc(doc.name)}>✕</button>
                </li>
              ))}
            </ul>
          )}
        </div>

      </div>
    </div>
  )
}

export default ScanMaker
