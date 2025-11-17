import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDEyw5ZYV5v4pcIM1lVmMHeOHGrnd9wY-M",
  authDomain: "afrogenie.firebaseapp.com",
  projectId: "afrogenie",
  storageBucket: "afrogenie.firebasestorage.app",
  messagingSenderId: "848394587261",
  appId: "1:848394587261:web:904a2946e0bc0ec9ac3514",
  measurementId: "G-YNWYDMNHES"
};

async function checkAndFixAdmin() {
  console.log('🔍 Checking admin status...\n');
  
  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db = getFirestore(app);

  // Get email from command line or use default admin
  const email = process.argv[2] || 'admin@afrogenie.com';
  const password = process.argv[3] || 'Admin123456!';

  try {
    // Sign in
    console.log(`📧 Signing in as: ${email}`);
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const userId = userCredential.user.uid;
    console.log(`✅ Signed in successfully`);
    console.log(`🆔 User ID: ${userId}\n`);

    // Check user document
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);

    if (userDoc.exists()) {
      const userData = userDoc.data();
      console.log('📄 Current user data:');
      console.log(`   - Email: ${userData.email}`);
      console.log(`   - Display Name: ${userData.displayName}`);
      console.log(`   - Role: ${userData.role}`);
      console.log(`   - UID: ${userData.uid}\n`);

      if (userData.role === 'admin') {
        console.log('✅ User already has admin role!');
        console.log('\n💡 If you\'re still getting permission errors:');
        console.log('   1. Make sure you\'re logged in with this account in the browser');
        console.log('   2. Try logging out and logging back in');
        console.log('   3. Hard refresh the page (Cmd+Shift+R / Ctrl+Shift+R)');
      } else {
        console.log('⚠️  User does NOT have admin role. Fixing...');
        
        // Update to admin
        await setDoc(userRef, {
          uid: userId,
          email: userCredential.user.email,
          displayName: userCredential.user.displayName || 'Admin',
          photoURL: userCredential.user.photoURL,
          role: 'admin',
          lastLogin: serverTimestamp()
        }, { merge: true });
        
        console.log('✅ User role updated to admin!');
        console.log('\n💡 Next steps:');
        console.log('   1. Log out from the app');
        console.log('   2. Log back in with this account');
        console.log('   3. You should now have admin access');
      }
    } else {
      console.log('⚠️  User document does not exist. Creating admin profile...');
      
      await setDoc(userRef, {
        uid: userId,
        email: userCredential.user.email,
        displayName: userCredential.user.displayName || 'Admin',
        photoURL: userCredential.user.photoURL,
        role: 'admin',
        createdAt: serverTimestamp(),
        lastLogin: serverTimestamp()
      });
      
      console.log('✅ Admin profile created!');
      console.log('\n💡 Next steps:');
      console.log('   1. Log out from the app');
      console.log('   2. Log back in with this account');
      console.log('   3. You should now have admin access');
    }

    console.log('\n🎉 Done!');
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    if (error.code) {
      console.error(`   Error code: ${error.code}`);
    }
    
    if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
      console.log('\n💡 Make sure you\'re using the correct email and password.');
      console.log('   Usage: npx tsx scripts/checkAndFixAdmin.ts <email> <password>');
    }
    
    process.exit(1);
  }

  process.exit(0);
}

checkAndFixAdmin();



