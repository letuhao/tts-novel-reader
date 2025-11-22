/**
 * Fix NULL paragraph_number in audio_cache table
 * Sửa paragraph_number NULL trong bảng audio_cache
 * 
 * This script updates audio_cache entries that have paragraph_number = null
 * by extracting the paragraph number from the local_audio_path
 */

import Database from '../src/database/db.js';
import path from 'path';

async function fixNullParagraphs() {
  console.log('='.repeat(60));
  console.log('Fixing NULL paragraph_number in audio_cache');
  console.log('Sửa paragraph_number NULL trong audio_cache');
  console.log('='.repeat(60));
  console.log();

  try {
    const db = Database.getInstance();

    // Find all entries with null paragraph_number but having local_audio_path
    const nullEntries = db.prepare(`
      SELECT * FROM audio_cache
      WHERE paragraph_number IS NULL
      AND local_audio_path IS NOT NULL
    `).all();

    console.log(`Found ${nullEntries.length} entries with NULL paragraph_number`);
    console.log();

    if (nullEntries.length === 0) {
      console.log('✅ No entries to fix');
      return;
    }

    let fixed = 0;
    let failed = 0;

    for (const entry of nullEntries) {
      try {
        // Extract paragraph number from local_audio_path
        // Path format: .../paragraph_XXX/paragraph_XXX.wav
        const pathParts = entry.local_audio_path.split(path.sep);
        let paragraphNumber = null;

        // Find paragraph_XXX directory or file
        for (const part of pathParts) {
          if (part.startsWith('paragraph_')) {
            const match = part.match(/paragraph_(\d+)/);
            if (match) {
              paragraphNumber = parseInt(match[1], 10);
              break;
            }
          }
        }

        if (paragraphNumber !== null && !isNaN(paragraphNumber)) {
          // Update the entry
          db.prepare(`
            UPDATE audio_cache
            SET paragraph_number = ?
            WHERE id = ?
          `).run(paragraphNumber, entry.id);

          console.log(`✅ Fixed entry ${entry.id}: paragraph_number = ${paragraphNumber}`);
          fixed++;
        } else {
          console.log(`⚠️  Could not extract paragraph_number from path: ${entry.local_audio_path}`);
          failed++;
        }
      } catch (error) {
        console.error(`❌ Error fixing entry ${entry.id}:`, error.message);
        failed++;
      }
    }

    console.log();
    console.log('='.repeat(60));
    console.log(`✅ Fixed: ${fixed} entries`);
    console.log(`⚠️  Failed: ${failed} entries`);
    console.log('='.repeat(60));

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

fixNullParagraphs();

