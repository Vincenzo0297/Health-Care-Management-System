import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth'
import { doc, serverTimestamp, setDoc } from 'firebase/firestore'
import { auth, db } from '../../DB/firebase'
import './Register.css'

function Register() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    dob: '',
    phone: '',
    password: '',
    confirmPassword: '',
    agreeTerms: false,
  })
  const [errors, setErrors] = useState({})

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setForm({ ...form, [name]: type === 'checkbox' ? checked : value })
    setErrors({ ...errors, [name]: '' })
  }

  const validate = () => {
    const newErrors = {}

    if (!form.firstName.trim()) newErrors.firstName = 'First name is required.'
    if (!form.lastName.trim()) newErrors.lastName = 'Last name is required.'

    if (!form.email.trim()) {
      newErrors.email = 'Email is required.'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      newErrors.email = 'Enter a valid email address.'
    }

    if (!form.dob) {
      newErrors.dob = 'Date of birth is required.'
    } else {
      const today = new Date()
      const birthDate = new Date(form.dob)
      const age = today.getFullYear() - birthDate.getFullYear()
      const monthDiff = today.getMonth() - birthDate.getMonth()
      const dayDiff = today.getDate() - birthDate.getDate()
      const fullAge = monthDiff < 0 || (monthDiff === 0 && dayDiff < 0) ? age - 1 : age
      if (fullAge < 21) {
        newErrors.dob = 'You must be at least 21 years old to register.'
      }
    }

    if (!form.phone.trim()) {
      newErrors.phone = 'Phone number is required.'
    } else if (!/^\+?[\d\s\-().]{7,15}$/.test(form.phone)) {
      newErrors.phone = 'Enter a valid phone number.'
    }

    if (!form.password) {
      newErrors.password = 'Password is required.'
    } else if (form.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters.'
    }

    if (!form.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password.'
    } else if (form.password !== form.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match.'
    }

    if (!form.agreeTerms) {
      newErrors.agreeTerms = 'You must agree to the Terms and Privacy Policy.'
    }

    return newErrors
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const validationErrors = validate()
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        form.email.trim(),
        form.password
      )

      const user = userCredential.user

      await updateProfile(user, {
        displayName: `${form.firstName.trim()} ${form.lastName.trim()}`,
      })

      await setDoc(doc(db, 'users', user.uid), {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim().toLowerCase(),
        dob: form.dob,
        phone: form.phone.trim(),
        agreeTerms: form.agreeTerms,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })

      setErrors({})
      alert('Registration is completed, Please Login')
      navigate('/login')
    } catch (error) {
      console.error('Registration error:', error)

      let submitError = 'Registration failed. Please try again.'

      if (error?.code === 'auth/email-already-in-use') {
        submitError = 'This email is already registered.'
      } else if (error?.code === 'auth/invalid-email') {
        submitError = 'Please enter a valid email address.'
      } else if (error?.code === 'auth/weak-password') {
        submitError = 'Password is too weak. Use at least 6 characters.'
      } else if (error?.code === 'auth/operation-not-allowed') {
        submitError = 'Email/password sign-in is disabled in Firebase Authentication.'
      } else if (error?.code === 'auth/network-request-failed') {
        submitError = 'Network error. Please check your internet connection.'
      } else if (error?.code === 'permission-denied') {
        submitError = 'Firestore permission denied. Check your security rules.'
      } else if (error?.code === 'auth/unauthorized-domain') {
        submitError = 'This domain is not authorized in Firebase Authentication.'
      } else if (error?.message) {
        submitError = error.message
      }

      setErrors({ submit: submitError })
    }
  }

  return (
    <div className="register-container">
      <div className="register-card">
        <div className="register-logo">🏥 MediCare Pro</div>
        <h2>Create an Account</h2>
        <p className="register-subtitle">Start your healthcare journey with us</p>

        <form onSubmit={handleSubmit} className="register-form" noValidate>
          {/* Name Row */}
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="firstName">First Name</label>
              <input id="firstName" type="text" name="firstName" placeholder="John" value={form.firstName} onChange={handleChange} />
              {errors.firstName && <span className="error">{errors.firstName}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="lastName">Last Name</label>
              <input id="lastName" type="text" name="lastName" placeholder="Doe" value={form.lastName} onChange={handleChange} />
              {errors.lastName && <span className="error">{errors.lastName}</span>}
            </div>
          </div>

          {/* Email */}
          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input id="email" type="email" name="email" placeholder="you@example.com" value={form.email} onChange={handleChange} />
            {errors.email && <span className="error">{errors.email}</span>}
          </div>

          {/* Date of Birth */}
          <div className="form-group">
              <label htmlFor="dob">Date of Birth</label>
              <input
                id="dob"
                type="date"
                name="dob"
                value={form.dob}
                onChange={handleChange}
                max={new Date(new Date().setFullYear(new Date().getFullYear() - 21)).toISOString().split('T')[0]}
              />
              {errors.dob && <span className="error">{errors.dob}</span>}
          </div>

          {/* Phone */}
          <div className="form-group">
            <label htmlFor="phone">Phone Number</label>
            <input id="phone" type="tel" name="phone" placeholder="+1 (555) 000-0000" value={form.phone} onChange={handleChange} />
            {errors.phone && <span className="error">{errors.phone}</span>}
          </div>

          {/* Password */}
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input id="password" type="password" name="password" placeholder="Min. 8 characters" value={form.password} onChange={handleChange} />
            {errors.password && <span className="error">{errors.password}</span>}
          </div>

          {/* Confirm Password */}
          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <input id="confirmPassword" type="password" name="confirmPassword" placeholder="••••••••" value={form.confirmPassword} onChange={handleChange} />
            {errors.confirmPassword && <span className="error">{errors.confirmPassword}</span>}
          </div>

          {/* Terms & Privacy */}
          <div className="form-group checkbox-group">
            <label className="checkbox-label">
              <input type="checkbox" name="agreeTerms" checked={form.agreeTerms} onChange={handleChange} />
              <span> I agree to the <a href="#">Terms of Service</a> and <a href="#">Privacy Policy</a> </span>
            </label>
            {errors.agreeTerms && <span className="error">{errors.agreeTerms}</span>}
          </div>

          {errors.submit && <span className="error">{errors.submit}</span>}

          <button type="submit" className="btn-submit"> Create Account </button>
        </form>

        <p className="register-footer"> Already have an account?{' '} <a href="#" onClick={() => navigate('/login')}>Sign in</a> </p>

        <button className="btn-back" onClick={() => navigate('/')}> ← Back to Home </button>
      </div>
    </div>
  )
}

export default Register
