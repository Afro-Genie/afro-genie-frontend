import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDEyw5ZYV5v4pcIM1lVmMHeOHGrnd9wY-M",
  authDomain: "afrogenie.firebaseapp.com",
  projectId: "afrogenie",
  storageBucket: "afrogenie.firebasestorage.app",
  messagingSenderId: "848394587261",
  appId: "1:848394587261:web:904a2946e0bc0ec9ac3514",
  measurementId: "G-YNWYDMNHES"
};

async function createAdminUser() {
  console.log('👤 Creating admin user...\n');
  
  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db = getFirestore(app);

  // Admin credentials - CHANGE THESE!
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@afrogenie.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'Admin123456!';
  const adminDisplayName = process.env.ADMIN_NAME || 'AfroGenie Admin';

  try {
    console.log(`📧 Email: ${adminEmail}`);
    console.log(`👤 Name: ${adminDisplayName}`);
    console.log('');

    let userId: string;
    let isNewUser = false;

    // Try to create user first
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, adminEmail, adminPassword);
      userId = userCredential.user.uid;
      isNewUser = true;
      console.log('✅ New user created successfully');
      
      // Update profile with display name
      await userCredential.user.updateProfile({ displayName: adminDisplayName });
      console.log('✅ Display name set');
    } catch (error: any) {
      if (error.code === 'auth/email-already-in-use') {
        // User exists, sign in instead
        console.log('ℹ️  User already exists, signing in...');
        const userCredential = await signInWithEmailAndPassword(auth, adminEmail, adminPassword);
        userId = userCredential.user.uid;
        console.log('✅ Signed in successfully');
      } else {
        throw error;
      }
    }

    // Create or update user profile in Firestore with admin role
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);

    const userData = {
      uid: userId,
      email: adminEmail,
      displayName: adminDisplayName,
      photoURL: null,
      role: 'admin',
      lastLogin: serverTimestamp()
    };

    if (!userDoc.exists()) {
      // Create new profile
      await setDoc(userRef, {
        ...userData,
        createdAt: serverTimestamp()
      });
      console.log('✅ Admin profile created in Firestore');
    } else {
      // Update existing profile to admin
      await setDoc(userRef, userData, { merge: true });
      console.log('✅ User profile updated to admin role');
    }

    console.log('\n🎉 Admin user setup complete!');
    console.log('\n📋 Login Credentials:');
    console.log(`   Email: ${adminEmail}`);
    console.log(`   Password: ${adminPassword}`);
    console.log(`   Role: admin`);
    console.log('\n💡 You can now login to the app and access the admin panel at /admin');
    console.log('\n⚠️  IMPORTANT: Change the default password after first login!');

    if (isNewUser) {
      console.log('\n📝 Note: This is a new account. Make sure to remember these credentials.');
    }

  } catch (error: any) {
    console.error('❌ Error creating admin user:', error.message);
    if (error.code) {
      console.error(`   Error code: ${error.code}`);
    }
    process.exit(1);
  }

  process.exit(0);
}

createAdminUser();



