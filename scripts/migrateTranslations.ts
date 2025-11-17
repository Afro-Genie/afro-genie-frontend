import { collection, getDocs, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';

async function migrateTranslations() {
  console.log('🔄 Starting translation migration...\n');

  try {
    // Get all translations
    const translationsSnapshot = await getDocs(collection(db, 'translations'));
    console.log(`📊 Found ${translationsSnapshot.docs.length} translations to migrate\n`);

    let updatedCount = 0;
    let skippedCount = 0;

    for (const translationDoc of translationsSnapshot.docs) {
      const data = translationDoc.data();
      const updates: any = {};

      // Set default status if not present
      if (!data.status) {
        // If it's a user request (has userId and no source), set to pending
        // Otherwise, set to approved
        if (data.userId && !data.source) {
          updates.status = 'pending';
        } else {
          updates.status = 'approved';
        }
      }

      // Set default source if not present
      if (!data.source) {
        // Try to infer source based on data
        // If it has culturalContext and translatedLyrics that differ, likely user_request
        // Otherwise, default to 'manual' for existing entries
        if (data.culturalContext && data.translatedLyrics && data.translatedLyrics !== data.originalLyrics) {
          updates.source = 'user_request';
          // Also set status to pending if it was inferred as user_request
          if (!data.status) {
            updates.status = 'pending';
          }
        } else {
          updates.source = 'manual';
        }
      }

      // Only update if there are changes
      if (Object.keys(updates).length > 0) {
        updates.updatedAt = serverTimestamp();
        await updateDoc(doc(db, 'translations', translationDoc.id), updates);
        updatedCount++;
        console.log(`  ✅ Updated translation ${translationDoc.id}:`, updates);
      } else {
        skippedCount++;
        console.log(`  ⏭️  Skipped translation ${translationDoc.id} (already has status and source)`);
      }
    }

    console.log(`\n✨ Migration complete!`);
    console.log(`   - Updated: ${updatedCount} translations`);
    console.log(`   - Skipped: ${skippedCount} translations`);
    console.log(`\n💡 All translations now have status and source fields.`);

  } catch (error) {
    console.error('❌ Error during migration:', error);
    process.exit(1);
  }

  process.exit(0);
}

migrateTranslations();

