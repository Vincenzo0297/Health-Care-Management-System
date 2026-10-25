import { useEffect, useState } from 'react'
import { Navigate, Routes, Route } from 'react-router-dom'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from './DB/firebase'
import Home from './Main Page/Home Page/Home'
import Login from './Main Page/Login Page/Login'
import Register from './Main Page/Register Page/Register'
import Dashboard from './User Page/Dashboard/Dashboard'
import Profile from './User Page/My Profile/Profile'
import ScanMaker from './Processing Module/Scan Maker/ScanMaker'

function ProtectedRoute({ children }) {
  const [user, setUser] = useState(null)
  const [checkingAuth, setCheckingAuth] = useState(true)

  useEffect(() => onAuthStateChanged(auth, (currentUser) => {
    setUser(currentUser)
    setCheckingAuth(false)
  }), [])

  if (checkingAuth) return <p>Checking your sign-in...</p>
  return user ? children : <Navigate to="/login" replace />
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* ── User Page ── */}
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/dashboard/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
      <Route path="/dashboard/myprofile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
      <Route path="/dashboard/scanmaker" element={<ProtectedRoute><ScanMaker /></ProtectedRoute>} />
    </Routes>
  )
}

export default App
