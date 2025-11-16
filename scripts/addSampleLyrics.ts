import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, collection, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDEyw5ZYV5v4pcIM1lVmMHeOHGrnd9wY-M",
  authDomain: "afrogenie.firebaseapp.com",
  projectId: "afrogenie",
  storageBucket: "afrogenie.firebasestorage.app",
  messagingSenderId: "848394587261",
  appId: "1:848394587261:web:904a2946e0bc0ec9ac3514",
  measurementId: "G-YNWYDMNHES"
};

// Sample PLACEHOLDER lyrics - Replace with actual licensed lyrics or user-generated content
const sampleLyrics = {
  'WHY LOVE': {
    originalLyrics: `[Verse 1]
Why this feeling dey confuse me so
Every time I see you, my heart just dey go
Tell me say you go stay, no go leave me oh
Baby girl, na you I need to know

[Chorus]
This love wey we get, e no be small thing
Make we dance together, forget everything
Na you be my queen, you wear the crown and ring
Together forever, that's what we'll sing`,
    translatedLyrics: `[Verse 1]
Why does this feeling confuse me so much
Every time I see you, my heart races
Tell me you'll stay, don't leave me
Baby girl, you're the one I need to know

[Chorus]
This love that we have is not a small thing
Let's dance together, forget everything
You are my queen, you wear the crown and ring
Together forever, that's what we'll sing`,
    culturalContext: `### Song Overview
This is a sample Afrobeats love song that demonstrates common themes in Nigerian music.

### Cultural Context & Slang
- **Na you**: Nigerian Pidgin for "It's you" or "You are"
- **Dey**: Pidgin present continuous marker (similar to "is/am/are -ing")
- **E no be small thing**: Expression meaning "It's a big deal" or "It's significant"
- **Make we**: "Let's" or "Let us"

### Musical Style
This represents typical Afrobeats romantic lyrics that blend English and Nigerian Pidgin, a common linguistic approach in West African popular music.`,
    sourceLang: 'Yoruba/Pidgin',
    targetLang: 'English'
  },
  'Last Last': {
    originalLyrics: `[Verse 1]
Dem tell me say love sweet
But nobody warn me say e fit wound
Now I dey here dey feel the pain
Wondering if I go love again

[Chorus]
But last last, everybody go dey alright
Even though the heart break for the night
Tomorrow go come with new light
We go survive, we go be alright`,
    translatedLyrics: `[Verse 1]
They told me that love is sweet
But nobody warned me it could hurt
Now I'm here feeling the pain
Wondering if I'll love again

[Chorus]
But in the end, everyone will be alright
Even though the heartbreak happened tonight
Tomorrow will come with new light
We will survive, we will be alright`,
    culturalContext: `### Song Overview
This sample song explores themes of heartbreak and resilience.

### Cultural Context & Slang
- **Dem**: "They" in Nigerian Pidgin
- **E fit**: "It can" or "It might"
- **Last last**: Nigerian expression meaning "in the end" or "ultimately"
- **Dey alright**: "Will be okay"

### Themes
The "last last" philosophy is popular in Nigerian culture - the idea that despite difficulties, things will work out in the end. It represents Nigerian optimism and resilience.`,
    sourceLang: 'Pidgin',
    targetLang: 'English'
  },
  'Essence': {
    originalLyrics: `[Verse 1]
You are the one that I desire
Setting my whole world on fire
Every moment spent with you
Makes me feel brand new

[Chorus]
This is the essence of my love
You're the one I'm thinking of
Together we will rise above
This is the essence of my love`,
    translatedLyrics: `[Verse 1]
You are the one that I desire
Setting my whole world on fire
Every moment spent with you
Makes me feel brand new

[Chorus]
This is the essence of my love
You're the one I'm thinking of
Together we will rise above
This is the essence of my love`,
    culturalContext: `### Song Overview
A smooth, romantic Afrobeats song about deep love and connection.

### Cultural Context
This represents modern Afrobeats that uses primarily English to reach a global audience while maintaining African musical elements through rhythm and production.

### Musical Style
Characterized by smooth vocals, minimalist production, and a focus on melody and rhythm rather than complex lyrics. This style has helped Afrobeats achieve global recognition.`,
    sourceLang: 'English',
    targetLang: 'English'
  }
};

async function addSampleLyrics() {
  console.log('🎵 Starting to add sample lyrics...\n');
  
  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db = getFirestore(app);

  // Admin credentials for authentication
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@afrogenie.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'Admin123456!';

  console.log('👤 Authenticating as admin...');
  
  let currentUserId: string;
  try {
    const userCredential = await signInWithEmailAndPassword(auth, adminEmail, adminPassword);
    currentUserId = userCredential.user.uid;
    console.log('✅ Authenticated successfully\n');
  } catch (error: any) {
    console.error('❌ Authentication error:', error.message);
    console.log('\n💡 Make sure you run seedDatabase.ts first to create the admin user.\n');
    process.exit(1);
  }

  try {
    // Get all songs from database
    const songsSnapshot = await getDocs(collection(db, 'songs'));
    console.log(`📀 Found ${songsSnapshot.docs.length} songs in database\n`);

    let addedCount = 0;
    
    for (const songDoc of songsSnapshot.docs) {
      const songData = songDoc.data();
      const songTitle = songData.title;
      
      // Check if we have lyrics for this song
      if (sampleLyrics[songTitle as keyof typeof sampleLyrics]) {
        const lyrics = sampleLyrics[songTitle as keyof typeof sampleLyrics];
        
        // Add translation document
        const translationRef = await addDoc(collection(db, 'translations'), {
          songId: songDoc.id,
          userId: currentUserId, // Using authenticated admin user ID
          originalLyrics: lyrics.originalLyrics,
          translatedLyrics: lyrics.translatedLyrics,
          culturalContext: lyrics.culturalContext,
          sourceLang: lyrics.sourceLang,
          targetLang: lyrics.targetLang,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        
        console.log(`  ✅ Added lyrics for "${songTitle}" (Translation ID: ${translationRef.id})`);
        addedCount++;
      } else {
        console.log(`  ⏭️  No sample lyrics available for "${songTitle}"`);
      }
    }

    console.log(`\n✨ Successfully added lyrics for ${addedCount} song(s)!`);
    console.log('\n💡 Tip: You can now view these songs with translations on the website.');
    
  } catch (error) {
    console.error('❌ Error adding lyrics:', error);
    process.exit(1);
  }

  process.exit(0);
}

addSampleLyrics();

