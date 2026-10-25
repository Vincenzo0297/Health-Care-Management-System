import { useNavigate } from 'react-router-dom'
import './Home.css'

function Home() {
  const navigate = useNavigate()

  return (
    <div className="home-container">
      {/* Navbar */}
      <nav className="navbar">
        <div className="nav-logo">🏥 MediCare Pro</div>
        <button className="btn-login" onClick={() => navigate('/login')}>
          Login
        </button>
      </nav>

      {/* Hero Section */}
      <section className="hero">
        <div className="hero-content">
          <h1>Healthcare Made <span className="highlight">Simple</span></h1>
          <p>
            Your health is our priority. Access world-class medical services,
            manage your care, and stay on top of your health — all in one place.
          </p>
          <div className="hero-actions">
            <button className="btn-primary" onClick={() => navigate('/login')}>Get Started</button>
            <button className="btn-secondary">Learn More</button>
          </div>
        </div>

        <div className="hero-image">
          <div className="hero-card">
            <div className="card-icon">🩺</div>
            <p>General Care</p>
          </div>
          <div className="hero-card">
            <div className="card-icon">🧬</div>
            <p>Specialist Care</p>
          </div>
          <div className="hero-card">
            <div className="card-icon">💊</div>
            <p>Pharmacy</p>
          </div>
          <div className="hero-card">
            <div className="card-icon">🧪</div>
            <p>Lab & Diagnostics</p>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="features">
        <h2>Why Choose MediCare Pro?</h2>
        <div className="features-grid">
          <div className="feature-item">
            <span>⚡</span>
            <h3>Fast Appointments</h3>
            <p>Book a doctor's appointment within minutes, anytime.</p>
          </div>
          <div className="feature-item">
            <span>🔬</span>
            <h3>Expert Specialists</h3>
            <p>Access a wide network of certified medical professionals.</p>
          </div>
          <div className="feature-item">
            <span>🔒</span>
            <h3>Secure & Private</h3>
            <p>Your medical records and data are always protected.</p>
          </div>
          <div className="feature-item">
            <span>📋</span>
            <h3>Digital Records</h3>
            <p>All your health history available at your fingertips.</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <p>© 2026 MediCare Pro. All rights reserved.</p>
      </footer>
    </div>
  )
}

export default Home
