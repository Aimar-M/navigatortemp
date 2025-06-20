import { db } from "../server/db";
import { trips } from "../shared/schema";
import { eq } from "drizzle-orm";

async function migrateAccommodationLinks() {
  console.log("Starting accommodation links migration...");
  
  try {
    // Get all trips with accommodation links
    const allTrips = await db.select().from(trips);
    
    let migratedCount = 0;
    
    for (const trip of allTrips) {
      if (trip.accommodationLinks && Array.isArray(trip.accommodationLinks)) {
        // Check if it's already in the new format (has objects with name/url)
        const firstLink = trip.accommodationLinks[0];
        if (typeof firstLink === 'string') {
          // Convert from old format (array of strings) to new format (array of objects)
          const newLinks = trip.accommodationLinks.map((link: string, index: number) => ({
            name: `Accommodation ${trip.accommodationLinks!.length > 1 ? `#${index + 1}` : ''}`,
            url: link
          }));
          
          // Update the trip with new format
          await db.update(trips)
            .set({ accommodationLinks: newLinks })
            .where(eq(trips.id, trip.id));
          
          migratedCount++;
          console.log(`Migrated trip ${trip.id}: ${trip.name}`);
        }
      }
    }
    
    console.log(`Migration completed. Migrated ${migratedCount} trips.`);
  } catch (error) {
    console.error("Migration failed:", error);
    throw error;
  }
}

// Run the migration
migrateAccommodationLinks()
  .then(() => {
    console.log("Migration script completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Migration script failed:", error);
    process.exit(1);
  });