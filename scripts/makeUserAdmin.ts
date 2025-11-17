import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc, collection, getDocs, updateDoc, serverTimestamp } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDEyw5ZYV5v4pcIM1lVmMHeOHGrnd9wY-M",
  authDomain: "afrogenie.firebaseapp.com",
  projectId: "afrogenie",
  storageBucket: "afrogenie.firebasestorage.app",
  messagingSenderId: "848394587261",
  appId: "1:848394587261:web:904a2946e0bc0ec9ac3514",
  measurementId: "G-YNWYDMNHES"
};

async function makeUserAdmin() {
  console.log('🔧 Making user admin...\n');
  
  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db = getFirestore(app);

  const targetEmail = process.argv[2];
  
  if (!targetEmail) {
    console.error('❌ Please provide the email address to make admin');
    console.log('Usage: npx tsx scripts/makeUserAdmin.ts <email>');
    process.exit(1);
  }

  try {
    // Sign in as the existing admin
    console.log('👤 Signing in as admin...');
    const adminCredential = await signInWithEmailAndPassword(
      auth, 
      'admin@afrogenie.com', 
      'Admin123456!'
    );
    console.log('✅ Signed in as admin\n');

    // Find user by email
    console.log(`🔍 Looking for user: ${targetEmail}`);
    const usersSnapshot = await getDocs(collection(db, 'users'));
    
    let targetUserId: string | null = null;
    let targetUserData: any = null;

    usersSnapshot.docs.forEach(doc => {
      const data = doc.data();
      if (data.email === targetEmail) {
        targetUserId = doc.id;
        targetUserData = data;
      }
    });

    if (!targetUserId) {
      console.error(`❌ User with email ${targetEmail} not found in database`);
      console.log('\n💡 Make sure the user has logged in at least once.');
      console.log('   When they log in, their profile will be created automatically.');
      process.exit(1);
    }

    console.log(`✅ Found user: ${targetUserData.displayName || targetEmail}`);
    console.log(`🆔 User ID: ${targetUserId}`);
    console.log(`📝 Current role: ${targetUserData.role || 'user'}\n`);

    // Update to admin
    console.log('🔄 Updating user role to admin...');
    const userRef = doc(db, 'users', targetUserId);
    await updateDoc(userRef, {
      role: 'admin',
      updatedAt: serverTimestamp()
    });

    console.log('✅ User role updated successfully!\n');
    console.log('┌─────────────────────────────────────┐');
    console.log('│         ADMIN GRANTED ✨            │');
    console.log('├─────────────────────────────────────┤');
    console.log(`│ Email: ${targetEmail.padEnd(23)} │`);
    console.log(`│ Role: admin${' '.repeat(23)} │`);
    console.log('└─────────────────────────────────────┘');
    console.log('\n💡 Next steps:');
    console.log('   1. Log out from the web app');
    console.log('   2. Log back in with this account');
    console.log('   3. You should now have full admin access!');
    console.log('   4. Try accessing /admin again');
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    if (error.code) {
      console.error(`   Error code: ${error.code}`);
    }
    process.exit(1);
  }

  process.exit(0);
}

makeUserAdmin();



