# Setting Admin Access for admin@afro-genie.com

## Quick Fix (Recommended)

The app has been updated to automatically set `admin@afro-genie.com` as admin when they sign in. 

**To fix your current issue:**

1. **Sign out** of the application
2. **Sign back in** as `admin@afro-genie.com`
3. You should now have admin access!

## Alternative: Manual Fix via Browser Console

If the automatic fix doesn't work, you can manually set the admin role:

1. Open your browser's Developer Console (F12 or Cmd+Option+I)
2. Make sure you're logged in as `admin@afro-genie.com`
3. Paste and run this code:

```javascript
// Get current user
const auth = window.firebase?.auth || (await import('firebase/auth')).getAuth();
const db = window.firebase?.firestore || (await import('firebase/firestore')).getFirestore();

// You'll need to import these in your console
// For now, use the Firebase SDK directly:
import { getAuth } from 'https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js';
import { getFirestore, doc, setDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js';

// Actually, simpler approach - use the app's Firebase instance
// In the browser console, after logging in:
```

**Better approach - Run this in browser console after logging in:**

```javascript
// This assumes Firebase is available globally or you can access it
// Check the Network tab to see Firebase requests, then:

fetch('/__firebase/init.json').then(r => r.json()).then(config => {
  console.log('Firebase config:', config);
  // Then use Firebase Admin SDK or direct Firestore access
});
```

## Manual Fix via Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Go to **Firestore Database**
4. Find the `users` collection
5. Find the document for `admin@afro-genie.com` (search by email field)
6. Edit the document and set `role` field to `"admin"`
7. Save the document
8. Sign out and sign back in

## Verify Admin Status

After applying any fix, verify by:
1. Checking the browser console for: `userProfile.role === 'admin'`
2. Trying to access `/admin` route
3. You should see the admin dashboard instead of "Access Denied"

## Troubleshooting

If you still get "Access Denied":
- Make sure you're logged in as `admin@afro-genie.com` (check the email in the error message)
- Clear browser cache and cookies
- Sign out completely and sign back in
- Check Firestore rules allow reading user documents

