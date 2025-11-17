// Script to set admin@afro-genie.com as the main admin
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY || '',
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: process.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: process.env.VITE_FIREBASE_APP_ID || ''
};

async function setMainAdmin() {
  console.log('🔧 Setting admin@afro-genie.com as main admin...\n');

  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db = getFirestore(app);

  const adminEmail = 'admin@afro-genie.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'Admin123456!';

  try {
    // Try to sign in as admin
    console.log('👤 Signing in as admin user...');
    let userCredential;
    
    try {
      userCredential = await signInWithEmailAndPassword(auth, adminEmail, adminPassword);
      console.log('✅ Signed in successfully\n');
    } catch (error: any) {
      if (error.code === 'auth/user-not-found') {
        console.log('⚠️  User not found. Creating admin user...');
        // We'll need to create the user first - but we can't do that from client SDK
        // So we'll just update the Firestore document if it exists
        console.log('❌ User does not exist. Please create the user first in Firebase Console or use createAdminUser.ts script.\n');
        process.exit(1);
      } else {
        throw error;
      }
    }

    const userId = userCredential.user.uid;
    console.log(`📝 User ID: ${userId}`);
    console.log(`📧 Email: ${userCredential.user.email}\n`);

    // Check if user document exists
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);

    if (userDoc.exists()) {
      console.log('📄 User document found. Updating role to admin...');
      const currentData = userDoc.data();
      console.log(`   Current role: ${currentData.role || 'not set'}\n`);
    } else {
      console.log('📄 User document not found. Creating new document...\n');
    }

    // Set/update user document with admin role
    await setDoc(userRef, {
      uid: userId,
      email: adminEmail,
      displayName: 'Afro Genie Admin',
      photoURL: null,
      role: 'admin',
      createdAt: userDoc.exists() ? userDoc.data().createdAt : serverTimestamp(),
      updatedAt: serverTimestamp(),
      lastLogin: serverTimestamp()
    }, { merge: true });

    console.log('✅ Successfully set admin role!\n');
    console.log('📋 User Profile:');
    console.log(`   - Email: ${adminEmail}`);
    console.log(`   - Role: admin`);
    console.log(`   - UID: ${userId}\n`);
    console.log('🎉 Admin access granted! Please log out and log back in for changes to take effect.\n');

    process.exit(0);
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error('\n💡 Troubleshooting:');
    console.error('   1. Make sure the user exists in Firebase Authentication');
    console.error('   2. Check that ADMIN_PASSWORD is correct in .env.local');
    console.error('   3. Verify Firebase configuration is correct\n');
    process.exit(1);
  }
}

setMainAdmin();


