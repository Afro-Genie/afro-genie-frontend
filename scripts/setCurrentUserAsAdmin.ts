/**
 * Quick script to set the currently logged-in user as admin
 * Run this in browser console after logging in
 * 
 * Usage in browser console:
 * Copy and paste the code below into your browser console while logged in
 */

export const setCurrentUserAsAdmin = `
// Copy and paste this entire block into your browser console
(async function() {
  try {
    // Get Firebase instances from the app
    const { auth, db } = await import('./config/firebase');
    const { doc, setDoc, serverTimestamp } = await import('firebase/firestore');
    
    const user = auth.currentUser;
    
    if (!user) {
      console.error('❌ Not logged in. Please log in first.');
      return;
    }
    
    console.log('🔍 Setting admin role for:', user.email);
    
    const userRef = doc(db, 'users', user.uid);
    await setDoc(userRef, {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName || 'Admin',
      photoURL: user.photoURL,
      role: 'admin',
      lastLogin: serverTimestamp()
    }, { merge: true });
    
    console.log('✅ Admin role set successfully!');
    console.log('💡 Please refresh the page and try again.');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
})();
`;

// For direct browser console use (simpler version)
export const browserConsoleScript = `
// SIMPLER VERSION - Use this if the above doesn't work
// Make sure you're on the app page and logged in, then paste this:

(async () => {
  const user = window.firebase?.auth?.currentUser || 
    (await import('firebase/auth')).getAuth().currentUser;
  
  if (!user) {
    alert('Please log in first!');
    return;
  }
  
  // You'll need to access your Firebase config
  // This is a simplified version - adjust based on your setup
  alert('Please use the Firebase Console method or the checkAndFixAdmin script instead.');
})();
`;

