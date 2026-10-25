import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: 'AIzaSyDgtpKK337AWy-7VReLnfCgJeRiD1pAq54',
  authDomain: 'health-management-system-6ece9.firebaseapp.com',
  projectId: 'health-management-system-6ece9',
  storageBucket: 'health-management-system-6ece9.firebasestorage.app',
  messagingSenderId: '142474676586',
  appId: '1:142474676586:web:462461bd91f905d3fd7d13',
}

const app = initializeApp(firebaseConfig)

export const auth = getAuth(app)
export const db = getFirestore(app)

export default app