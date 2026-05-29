import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, collection, addDoc, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { artists, songs, genres } from '../data/mockData';

const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY || process.env.VITE_FIREBASE_API_KEY || '',
  authDomain: "afrogenie.firebaseapp.com",
  projectId: "afrogenie",
  storageBucket: "afrogenie.firebasestorage.app",
  messagingSenderId: "848394587261",
  appId: "1:848394587261:web:904a2946e0bc0ec9ac3514",
  measurementId: "G-YNWYDMNHES"
};

if (!firebaseConfig.apiKey) {
  console.error('Missing FIREBASE_API_KEY (or VITE_FIREBASE_API_KEY) for script execution.');
  process.exit(1);
}

async function seedDatabase() {
  console.log('🚀 Starting database seeding...\n');
  
  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db = getFirestore(app);

  // Admin credentials for seeding
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@afrogenie.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'Admin123456!';

  console.log('👤 Creating/signing in as admin user...');
  
  try {
    // Try to create admin user first
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, adminEmail, adminPassword);
      console.log('✅ New admin user created');
      
      // Create admin profile in Firestore
      await setDoc(doc(db, 'users', userCredential.user.uid), {
        uid: userCredential.user.uid,
        email: adminEmail,
        displayName: 'AfroGenie Admin',
        photoURL: null,
        role: 'admin',
        createdAt: serverTimestamp(),
        lastLogin: serverTimestamp()
      });
      console.log('✅ Admin profile created\n');
    } catch (error: any) {
      if (error.code === 'auth/email-already-in-use') {
        // User exists, sign in
        await signInWithEmailAndPassword(auth, adminEmail, adminPassword);
        console.log('✅ Signed in as existing admin\n');
      } else {
        throw error;
      }
    }
  } catch (error: any) {
    console.error('❌ Authentication error:', error.message);
    console.log('\n💡 Make sure the admin credentials are correct.');
    console.log('   You can set ADMIN_EMAIL and ADMIN_PASSWORD environment variables.\n');
    process.exit(1);
  }

  try {
    // Seed Artists
    console.log('📀 Seeding artists...');
    const artistIds = new Map<string, string>();
    for (const artist of artists) {
      const { id, ...artistData } = artist;
      const docRef = await addDoc(collection(db, 'artists'), {
        ...artistData,
        createdAt: serverTimestamp()
      });
      artistIds.set(id, docRef.id);
      console.log(`  ✅ Added artist: ${artist.name} (ID: ${docRef.id})`);
    }

    // Seed Songs with updated artist IDs
    console.log('\n🎵 Seeding songs...');
    const songIds = new Map<string, string>();
    for (const song of songs) {
      const { id, artistId, ...songData } = song;
      const newArtistId = artistIds.get(artistId) || artistId;
      const docRef = await addDoc(collection(db, 'songs'), {
        ...songData,
        artistId: newArtistId,
        createdAt: serverTimestamp()
      });
      songIds.set(id, docRef.id);
      console.log(`  ✅ Added song: ${song.title} by ${song.artist} (ID: ${docRef.id})`);
    }

    // Seed Genres
    console.log('\n🎼 Seeding genres...');
    for (const genre of genres) {
      const docRef = await addDoc(collection(db, 'genres'), {
        ...genre,
        id: genre.name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
        createdAt: serverTimestamp()
      });
      console.log(`  ✅ Added genre: ${genre.name} (ID: ${docRef.id})`);
    }

    console.log('\n✨ Database seeding completed successfully!');
    console.log('\n📝 Summary:');
    console.log(`   - Artists: ${artists.length}`);
    console.log(`   - Songs: ${songs.length}`);
    console.log(`   - Genres: ${genres.length}`);
    console.log('\n💡 Note: Song IDs have changed. Use these new IDs:');
    songIds.forEach((newId, oldId) => {
      const song = songs.find(s => s.id === oldId);
      console.log(`   - "${song?.title}": ${newId}`);
    });
    
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }

  process.exit(0);
}

seedDatabase();

