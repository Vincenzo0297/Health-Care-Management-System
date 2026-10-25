import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import './CreditFinancial.css'

// ── Sidebar nav items ────────────────────────────────────────
const navItems = [
  { icon: '🏠', label: 'Dashboard', path: '/dashboard' },
  { icon: '👤', label: 'My Profile', path: '/dashboard/profile' },
]

// ── Dropdown options ─────────────────────────────────────────
const productTypes = [
  { value: '', label: 'Select Product Type' },
  { value: 'revolving_secured', label: 'Revolving Secured' },
  { value: 'revolving_unsecured',label: 'Revolving Unsecured' },
  { value: 'credit_card', label: 'Credit Card' },
  { value: 'term_loan', label: 'Term Loan' },
  { value: 'mortgage', label: 'Mortgage' },
]

const collateralOptions = [
  { value: '', label: 'Select Collateral' },
  { value: 'real_estate', label: 'Real Estate' },
  { value: 'vehicle', label: 'Vehicle' },
  { value: 'cash_deposit', label: 'Cash Deposit' },
  { value: 'none', label: 'None' },
]

const productCategories = [
  { value: '', label: 'Select Category' },
  { value: 'personal', label: 'Personal' },
  { value: 'business', label: 'Business' },
  { value: 'corporate', label: 'Corporate' },
]

// ── Computation logic ────────────────────────────────────────
function compute(productType, inputs) {
  const n = (val) => parseFloat(val) || 0

  if (productType === 'revolving_secured' || productType === 'revolving_unsecured') {
    const balance = n(inputs.balance)
    const rate = n(inputs.rate) / 100 / 12
    const minPay = balance > 0 ? Math.max(25, balance * 0.02) : 0
    const interest = balance * rate
    return [
      { label: 'Minimum Payment', value: `$${minPay.toFixed(2)}` },
      { label: 'Monthly Interest', value: `$${interest.toFixed(2)}` },
      { label: 'Available Credit', value: `$${Math.max(0, n(inputs.limit) - balance).toFixed(2)}` },
    ]
  }

  if (productType === 'credit_card') {
    const balance = n(inputs.balance)
    const limit = n(inputs.limit)
    const apr = n(inputs.apr) / 100 / 12
    const minPay = balance > 0 ? Math.max(25, balance * 0.02) : 0
    const interest = balance * apr
    const utilRate = limit > 0 ? (balance / limit) * 100 : 0
    return [
      { label: 'Minimum Payment', value: `$${minPay.toFixed(2)}` },
      { label: 'Monthly Interest', value: `$${interest.toFixed(2)}` },
      { label: 'Available Credit', value: `$${Math.max(0, limit - balance).toFixed(2)}` },
      { label: 'Utilization Rate', value: `${utilRate.toFixed(1)}%` },
    ]
  }

  if (productType === 'term_loan') {
    const principal = n(inputs.principal)
    const rate = n(inputs.rate) / 100 / 12
    const term = n(inputs.term)
    if (principal <= 0 || term <= 0) return []
    const monthly = rate > 0
      ? (principal * rate * Math.pow(1 + rate, term)) / (Math.pow(1 + rate, term) - 1)
      : principal / term
    const total = monthly * term
    const interest = total - principal
    return [
      { label: 'Monthly Payment', value: `$${monthly.toFixed(2)}` },
      { label: 'Total Payment', value: `$${total.toFixed(2)}` },
      { label: 'Total Interest', value: `$${interest.toFixed(2)}` },
    ]
  }

  if (productType === 'mortgage') {
    const propValue = n(inputs.propValue)
    const loan = n(inputs.loan)
    const rate = n(inputs.rate) / 100 / 12
    const term = n(inputs.term) * 12
    if (loan <= 0 || term <= 0) return []
    const monthly   = rate > 0
      ? (loan * rate * Math.pow(1 + rate, term)) / (Math.pow(1 + rate, term) - 1)
      : loan / term
    const total = monthly * term
    const ltv = propValue > 0 ? (loan / propValue) * 100 : 0
    return [
      { label: 'Monthly Payment', value: `$${monthly.toFixed(2)}` },
      { label: 'Total Payment',  value: `$${total.toFixed(2)}` },
      { label: 'Total Interest',  value: `$${(total - loan).toFixed(2)}` },
      { label: 'LTV Ratio',  value: `${ltv.toFixed(1)}%` },
    ]
  }

  return []
}

// ── Input fields per product type ───────────────────────────
function ComputationInputs({ productType, inputs, onChange }) {
  const field = (name, label, placeholder) => (
    <div className="cf-input-group" key={name}>
      <label>{label}</label>
      <input type="number" min="0" placeholder={placeholder} value={inputs[name] || ''} onChange={(e) => onChange(name, e.target.value)} />
    </div>
  )

  if (productType === 'revolving_secured' || productType === 'revolving_unsecured') return (
    <div className="cf-inputs-grid">
      {field('limit',   'Credit Limit ($)',      'e.g. 10000')}
      {field('balance', 'Outstanding Balance ($)', 'e.g. 3500')}
      {field('rate',    'Annual Interest Rate (%)', 'e.g. 18.5')}
    </div>
  )

  if (productType === 'credit_card') return (
    <div className="cf-inputs-grid">
      {field('limit',   'Credit Limit ($)',        'e.g. 5000')}
      {field('balance', 'Outstanding Balance ($)', 'e.g. 1200')}
      {field('apr',     'APR (%)',                 'e.g. 22.99')}
    </div>
  )

  if (productType === 'term_loan') return (
    <div className="cf-inputs-grid">
      {field('principal', 'Loan Amount ($)',         'e.g. 20000')}
      {field('rate',      'Annual Interest Rate (%)', 'e.g. 7.5')}
      {field('term',      'Term (months)',            'e.g. 60')}
    </div>
  )

  if (productType === 'mortgage') return (
    <div className="cf-inputs-grid">
      {field('propValue', 'Property Value ($)',      'e.g. 400000')}
      {field('loan',      'Loan Amount ($)',          'e.g. 320000')}
      {field('rate',      'Annual Interest Rate (%)', 'e.g. 6.5')}
      {field('term',      'Term (years)',             'e.g. 30')}
    </div>
  )

  return null
}

// ── Main component ───────────────────────────────────────────
function CreditFinancial() {
  const navigate = useNavigate()
  const location = useLocation()

  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [profile] = useState({ firstName: 'John', lastName: 'Doe' })

  const [selection, setSelection] = useState({
    productType: '',
    collateral:  '',
    category:    '',
  })
  const [inputs, setInputs] = useState({})
  const [results, setResults] = useState([])
  const [computed, setComputed] = useState(false)

  const handleSelection = (field, value) => {
    setSelection((prev) => ({ ...prev, [field]: value }))
    setResults([])
    setComputed(false)
    if (field === 'productType') setInputs({})
  }

  const handleInputChange = (name, value) => {
    setInputs((prev) => ({ ...prev, [name]: value }))
    setResults([])
    setComputed(false)
  }

  const handleCompute = () => {
    const res = compute(selection.productType, inputs)
    setResults(res)
    setComputed(true)
  }

  const handleReset = () => {
    setSelection({ productType: '', collateral: '', category: '' })
    setInputs({})
    setResults([])
    setComputed(false)
  }

  const canCompute = selection.productType && selection.collateral && selection.category

  return (
    <div className="db-layout">

      {/* ── NAVBAR ── */}
      <header className="db-navbar">
        <div className="db-nav-left">
          <button className="db-hamburger" onClick={() => setSidebarOpen((p) => !p)} aria-label="Toggle sidebar">☰</button>
          <div className="db-nav-logo" onClick={() => navigate('/dashboard')}>🛡️ InsureEase</div>
        </div>
        <div className="db-nav-right">
          <div className="db-avatar-wrap">
            <div className="db-avatar-circle">{profile.firstName[0]}{profile.lastName[0]}</div>
            <span className="db-avatar-name">{profile.firstName} {profile.lastName}</span>
          </div>
        </div>
      </header>

      {/* ── SIDEBAR ── */}
      <aside className={`db-sidebar ${sidebarOpen ? 'db-sidebar-open' : 'db-sidebar-closed'}`}>
        <nav className="db-sidebar-nav">
          <ul>
            {navItems.map((item) => (
              <li key={item.path}>
                <button className={`db-sidebar-item ${location.pathname === item.path ? 'active' : ''}`} onClick={() => navigate(item.path)} >
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

      {/* ── MAIN ── */}
      <main className={`db-main ${sidebarOpen ? 'db-main-shifted' : ''}`}>
        <div className="cf-container">

          {/* ── Selection Box ── */}
          <div className="cf-box">
            <div className="cf-dropdowns">
              {/* Product Type */}
              <div className="cf-field">
                <label>Product Type</label>
                <select value={selection.productType}
                  onChange={(e) => handleSelection('productType', e.target.value)} >
                  {productTypes.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>

              {/* Collateral */}
              <div className="cf-field">
                <label>Collateral</label>
                <select value={selection.collateral} onChange={(e) => handleSelection('collateral', e.target.value)} >
                  {collateralOptions.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>

              {/* Product Category */}
              <div className="cf-field">
                <label>Product Category</label>
                <select value={selection.category} onChange={(e) => handleSelection('category', e.target.value)} >
                  {productCategories.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Dynamic inputs */}
            {selection.productType && (
              <>
                <hr className="cf-divider" />
                <h3 className="cf-inputs-title">Computation Inputs</h3>
                <ComputationInputs
                  productType={selection.productType}
                  inputs={inputs}
                  onChange={handleInputChange}
                />
              </>
            )}

            {/* Actions */}
            <div className="cf-actions">
              <button className="cf-btn-compute" onClick={handleCompute} disabled={!canCompute} > Compute </button>
              <button className="cf-btn-reset" onClick={handleReset}> Reset </button>
              <button className="cf-btn-next">Next</button>
            </div>
          </div>

          {/* ── Results Box ── */}
          {computed && results.length > 0 && (
            <div className="cf-results-box">
              <h2 className="cf-box-title">Computation Results</h2>
              <div className="cf-results-grid">
                {results.map((r) => (
                  <div className="cf-result-card" key={r.label}>
                    <p className="cf-result-label">{r.label}</p>
                    <p className="cf-result-value">{r.value}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {computed && results.length === 0 && (
            <div className="cf-results-box">
              <p className="cf-no-result">Please fill in all inputs to see results.</p>
            </div>
          )}

        </div>
      </main>
    </div>
  )
}

export default CreditFinancial