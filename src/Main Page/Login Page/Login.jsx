import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { auth } from '../../DB/firebase'
import './Login.css'

function Login() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    try {
      await signInWithEmailAndPassword(auth, form.email.trim(), form.password)
      window.alert('Welcome')
      navigate('/dashboard')
    } catch (signInError) {
      if (signInError?.code === 'auth/invalid-credential'
        || signInError?.code === 'auth/user-not-found'
        || signInError?.code === 'auth/wrong-password') {
        setError('Incorrect email or password.')
      } else if (signInError?.code === 'auth/invalid-email') {
        setError('Please enter a valid email address.')
      } else if (signInError?.code === 'auth/network-request-failed') {
        setError('Network error. Please check your internet connection.')
      } else {
        setError(signInError?.message || 'Sign in failed. Please try again.')
      }
    }
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-logo">🏥 MediCare Pro</div>
        <h2>Welcome back</h2>
        <p className="login-subtitle">Sign in to your account</p>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input id="email" type="email" name="email" placeholder="you@example.com" value={form.email} onChange={handleChange} required />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input id="password" type="password" name="password" placeholder="••••••••" value={form.password} onChange={handleChange} required />
          </div>

          <div className="forgot">
            <a href="#">Forgot password?</a>
          </div>

          {error && <span className="error" role="alert">{error}</span>}

          <button type="submit" className="btn-submit"> Sign In </button>
        </form>

        <p className="login-footer"> Don't have an account?{' '} <a href="#" onClick={() => navigate('/register')}>Sign up</a> </p>

        <button className="btn-back" onClick={() => navigate('/')}> ← Back to Home </button>
      </div>
    </div>
  )
}

export default Login
