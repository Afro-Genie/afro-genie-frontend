# 🔧 Fix Firebase Permission Errors - Complete Guide

## Why Permission Errors Happen

Firebase permission errors occur when:
1. **User document doesn't exist** in Firestore `users` collection
2. **User document exists but missing `role` field**
3. **User document has `role` but it's not set to `'admin'`**
4. **Firestore rules check for admin role but user document doesn't exist yet**

The rules now check `exists()` first, but you still need to ensure your user has the admin role.

## ✅ Quick Fix (Choose One Method)

### Method 1: Via Firebase Console (Easiest - 2 minutes)

1. **Go to Firebase Console:**
   - https://console.firebase.google.com/project/afrogenie/firestore/data

2. **Navigate to `users` collection**

3. **Find your user document:**
   - Look for a document with your email address
   - If you don't see it, you need to log in to the app first (this creates the user document)

4. **Add/Update the `role` field:**
   - Click on your user document
   - If `role` field exists: Change value to `admin`
   - If `role` field doesn't exist:
     - Click "Add field"
     - Field name: `role`
     - Field type: `string`
     - Value: `admin`
   - Click "Update"

5. **Logout and Login again:**
   - In the app, click your avatar → Logout
   - Sign in again
   - Try creating a category now

### Method 2: Via Script (Automated)

Run this script to automatically set your user as admin:

```bash
# Make sure you're logged in to the app first, then run:
npx tsx scripts/checkAndFixAdmin.ts your-email@example.com
```

Or if you're using the default admin email:

```bash
npx tsx scripts/checkAndFixAdmin.ts admin@afro-genie.com Admin123456!
```

### Method 3: Via Browser Console (Quick Test)

1. **Open your browser console** (F12 or Cmd+Option+I)
2. **Make sure you're logged in**
3. **Run this code:**

```javascript
// This will set your current user as admin
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './config/firebase'; // Adjust path if needed

const user = auth.currentUser;
if (user) {
  const userRef = doc(db, 'users', user.uid);
  await setDoc(userRef, {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    photoURL: user.photoURL,
    role: 'admin',
    lastLogin: serverTimestamp()
  }, { merge: true });
  console.log('✅ Admin role set! Please refresh the page.');
} else {
  console.log('❌ Not logged in. Please log in first.');
}
```

## 🔍 Verify Your Admin Status

After setting the admin role:

1. **Check Firebase Console:**
   - Go to Firestore → `users` collection
   - Find your user document
   - Verify `role` field = `admin`

2. **Check in App:**
   - Logout and login again
   - Click your avatar (top right)
   - You should see "⭐ Administrator" badge

3. **Test Admin Access:**
   - Go to `/admin` - should see admin panel
   - Try creating a category in `/admin/community`
   - Should work without permission errors!

## 🛠️ What Was Fixed

I've updated the Firestore rules to:
- ✅ Check if user document exists before checking role
- ✅ Properly handle cases where user document might not exist
- ✅ Consistent permission checks across all collections

The rules now use this pattern:
```javascript
allow write: if request.auth != null && 
  exists(/databases/$(database)/documents/users/$(request.auth.uid)) &&
  get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
```

## 📋 Common Issues & Solutions

### Issue: "Missing or insufficient permissions" when creating category

**Solution:**
1. Make sure you're logged in
2. Check if your user document exists in Firestore
3. Ensure `role` field is set to `admin`
4. Logout and login again
5. Try again

### Issue: User document doesn't exist

**Solution:**
1. Log in to the app (this creates the user document automatically)
2. Then set the `role` field to `admin` using Method 1 or 2 above

### Issue: Still getting errors after setting admin role

**Solution:**
1. Hard refresh browser (Cmd+Shift+R / Ctrl+Shift+R)
2. Clear browser cache
3. Logout completely and login again
4. Check Firebase Console to verify role is saved
5. Wait a few seconds for Firestore rules to update

## 🚀 Deploy Rules to Firebase

After fixing the rules file, deploy them:

```bash
firebase deploy --only firestore:rules
```

Or if you're using Firebase CLI:
```bash
firebase deploy --only firestore
```

## 💡 Prevention

To prevent this in the future:
- Always ensure user documents are created on first login
- The `AuthContext` should automatically create user documents
- For admin users, use the scripts to set admin role immediately after account creation

