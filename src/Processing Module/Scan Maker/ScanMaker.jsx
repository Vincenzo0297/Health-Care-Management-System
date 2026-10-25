import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './ScanMaker.css'

const ALLOWED_TYPES = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg']
const MAX_SIZE_MB = 10

function ScanMaker() {
  const navigate = useNavigate()
  const fileInputRef = useRef(null)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [form, setForm] = useState({
    customerName: '',
    cin: '',
    gcin: '',
    insuranceType: 'Auto Insurance',
  })
  const [formError, setFormError] = useState('')
  const [documents, setDocuments] = useState([])
  const [dragOver, setDragOver] = useState(false)
  const [uploadError, setUploadError] = useState('')

  const handleChange = (event) => {
    setForm({ ...form, [event.target.name]: event.target.value })
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

  const handleSubmit = () => {
    if (!form.customerName.trim() || !form.cin.trim() || !form.gcin.trim()) {
      setFormError('Enter the customer name, CIN / LCIN, and GCIN to continue.')
      return
    }
    navigate('/dashboard')
  }

  const formatSize = (bytes) => (
    bytes < 1024 * 1024
      ? `${(bytes / 1024).toFixed(1)} KB`
      : `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  )
  const fileIcon = (type) => {
    if (type === 'application/pdf') return '📄'
    if (type.startsWith('image/')) return '🖼️'
    return '📎'
  }

  return (
    <div className="sm-page">
      <div className={`sm-box ${uploadOpen ? 'sm-box-expanded' : ''}`}>
        <div className="sm-left">
          <div className="sm-left-topbar">
            <h1 className="sm-title">Scan Maker</h1>
            <button
              className={`sm-btn-upload-toggle ${uploadOpen ? 'sm-btn-upload-toggle-active' : ''}`}
              onClick={() => setUploadOpen((previous) => !previous)}
            >
              {uploadOpen ? '✕ Close Upload' : '📎 Upload Document'}
            </button>
          </div>

          <div className="sm-section">
            <h2 className="sm-section-title">Customer Information</h2>

            <div className="sm-field">
              <label htmlFor="customer-name">Customer Name</label>
              <input
                id="customer-name"
                type="text"
                className="sm-input"
                name="customerName"
                value={form.customerName}
                onChange={handleChange}
                placeholder="Enter customer name"
              />
            </div>

            <div className="sm-retrieve-row">
              <div className="sm-field">
                <label htmlFor="customer-cin">CIN / LCIN <span className="sm-required">*</span></label>
                <input
                  id="customer-cin"
                  type="text"
                  className="sm-input"
                  name="cin"
                  value={form.cin}
                  onChange={handleChange}
                />
              </div>
              <div className="sm-field">
                <label htmlFor="customer-gcin">GCIN <span className="sm-required">*</span></label>
                <input
                  id="customer-gcin"
                  type="text"
                  className="sm-input"
                  name="gcin"
                  value={form.gcin}
                  onChange={handleChange}
                />
              </div>
            </div>

            {formError && <p className="sm-msg sm-msg-error" role="alert">{formError}</p>}

            <div className="sm-field sm-field-half">
              <label htmlFor="insurance-type">Insurance Type</label>
              <select
                id="insurance-type"
                className="sm-input"
                name="insuranceType"
                value={form.insuranceType}
                onChange={handleChange}
              >
                <option>Auto Insurance</option>
                <option>Home Insurance</option>
                <option>Life Insurance</option>
                <option>Health Insurance</option>
              </select>
            </div>
          </div>

          <div className="sm-left-footer">
            <button className="sm-btn-create" onClick={handleSubmit}>Create Case</button>
            <button className="sm-btn-cancel" onClick={() => navigate('/dashboard')}>Cancel</button>
          </div>
        </div>

        <div className={`sm-right ${uploadOpen ? 'sm-right-open' : 'sm-right-closed'}`}>
          <p className="sm-upload-label">Upload Document</p>
          <p className="sm-upload-hint">PDF, PNG, JPG · max {MAX_SIZE_MB}MB per file</p>

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

          {documents.length > 0 && (
            <ul className="sm-file-list">
              {documents.map((document) => (
                <li key={document.name} className="sm-file-item">
                  <span className="sm-file-icon">{fileIcon(document.type)}</span>
                  <div className="sm-file-info">
                    <span className="sm-file-name">{document.name}</span>
                    <span className="sm-file-size">{formatSize(document.size)}</span>
                  </div>
                  <button
                    className="sm-file-remove"
                    onClick={() => setDocuments((previous) => previous.filter((item) => item.name !== document.name))}
                    aria-label={`Remove ${document.name}`}
                  >✕</button>
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
