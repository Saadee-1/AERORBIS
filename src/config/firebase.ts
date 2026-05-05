import { initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: "AIzaSyBpbCam573CLAcxq09hlxquzTnLls5lESM",
  authDomain: "aerorbis-dad0a.firebaseapp.com",
  projectId: "aerorbis-dad0a",
  storageBucket: "aerorbis-dad0a.firebasestorage.app",
  messagingSenderId: "247999121536",
  appId: "1:247999121536:web:b2ee75fefd635e8ab87e65",
  measurementId: "G-D37D5WJDEP"
}

const app = initializeApp(firebaseConfig)

export const auth = getAuth(app)
export const googleProvider = new GoogleAuthProvider()
export const db = getFirestore(app)
export default app