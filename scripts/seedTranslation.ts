import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { getFirestore, addDoc, collection, serverTimestamp } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDEyw5ZYV5v4pcIM1lVmMHeOHGrnd9wY-M",
  authDomain: "afrogenie.firebaseapp.com",
  projectId: "afrogenie",
  storageBucket: "afrogenie.firebasestorage.app",
  messagingSenderId: "848394587261",
  appId: "1:848394587261:web:904a2946e0bc0ec9ac3514",
  measurementId: "G-YNWYDMNHES"
};

async function run() {
  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db = getFirestore(app);

  const cred = await signInAnonymously(auth);
  const userId = cred.user.uid;

  const songId = process.argv[2] || '1';

  const originalLyrics = `Sample original lyrics for song ${songId}.`;
  const translatedLyrics = `Sample translated lyrics for song ${songId}.`;

  const docRef = await addDoc(collection(db, 'translations'), {
    songId,
    userId,
    originalLyrics,
    translatedLyrics,
    culturalContext: 'Seeded translation context.',
    sourceLang: 'yo',
    targetLang: 'en',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  console.log('Seeded translation id:', docRef.id);
}

run().catch(err => { console.error(err); process.exit(1); });
