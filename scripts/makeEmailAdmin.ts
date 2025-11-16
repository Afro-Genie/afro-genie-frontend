// Script to make a user admin by email (requires Firebase Admin SDK or manual Firestore update)
// This script helps set admin role for admin@afro-genie.com

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, query, where, getDocs, doc, setDoc, serverTimestamp } from 'firebase/firestore';
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

async function makeEmailAdmin() {
  console.log('🔧 Making admin@afro-genie.com an admin...\n');

  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);

  const adminEmail = 'admin@afro-genie.com';

  try {
    // Search for user by email in Firestore
    console.log(`🔍 Searching for user with email: ${adminEmail}...`);
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('email', '==', adminEmail));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      console.log('❌ No user found with that email in Firestore.\n');
      console.log('💡 Options:');
      console.log('   1. Sign in as admin@afro-genie.com first (this will create the user document)');
      console.log('   2. Then run this script again');
      console.log('   3. Or manually create the user document in Firebase Console\n');
      console.log('📝 To manually create in Firebase Console:');
      console.log('   - Go to Firestore Database');
      console.log('   - Create a document in "users" collection');
      console.log('   - Set the document ID to the user\'s UID from Authentication');
      console.log('   - Add fields: email, role: "admin", displayName, etc.\n');
      process.exit(1);
    }

    // Update all matching users (should be just one)
    let updated = 0;
    querySnapshot.forEach(async (userDoc) => {
      const userData = userDoc.data();
      console.log(`📄 Found user document: ${userDoc.id}`);
      console.log(`   Current role: ${userData.role || 'not set'}`);
      console.log(`   Email: ${userData.email}\n`);

      // Update to admin
      await setDoc(doc(db, 'users', userDoc.id), {
        ...userData,
        role: 'admin',
        updatedAt: serverTimestamp()
      }, { merge: true });

      console.log(`✅ Updated user ${userDoc.id} to admin role!\n`);
      updated++;
    });

    if (updated > 0) {
      console.log('🎉 Success! Admin role has been set.');
      console.log('📋 Next steps:');
      console.log('   1. Log out of the application');
      console.log('   2. Log back in as admin@afro-genie.com');
      console.log('   3. You should now have admin access!\n');
    }

    process.exit(0);
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error('\n💡 Make sure:');
    console.error('   1. Firebase configuration is correct');
    console.error('   2. Firestore rules allow reading/writing users collection');
    console.error('   3. You have proper permissions\n');
    process.exit(1);
  }
}

makeEmailAdmin();

