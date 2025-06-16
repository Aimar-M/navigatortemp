import { db } from "../server/db";
import { trips, users, expenses, activities, tripMembers } from "../shared/schema";
import { eq, and, inArray, notInArray } from "drizzle-orm";

async function migrateLegacyRemovals() {
  console.log('Starting migration for legacy removed users...');
  
  try {
    // Get all trips
    const allTrips = await db.select().from(trips);
    
    for (const trip of allTrips) {
      console.log(`\nProcessing trip: ${trip.name} (ID: ${trip.id})`);
      
      // Get current trip members
      const currentMembers = await db.select().from(tripMembers).where(eq(tripMembers.tripId, trip.id));
      const currentMemberIds = currentMembers.map(m => m.userId);
      
      // Get all expenses for this trip
      const tripExpenses = await db.select().from(expenses).where(eq(expenses.tripId, trip.id));
      
      // Get all activities for this trip
      const tripActivities = await db.select().from(activities).where(eq(activities.tripId, trip.id));
      
      // Find users who created expenses/activities but are no longer members
      const expenseCreatorIds = [...new Set(tripExpenses.map(e => e.submittedBy))];
      const activityCreatorIds = [...new Set(tripActivities.map(a => a.createdBy))];
      const allCreatorIds = [...new Set([...expenseCreatorIds, ...activityCreatorIds])];
      
      // Identify removed users (creators who are no longer members)
      const removedUserIds = allCreatorIds.filter(creatorId => 
        !currentMemberIds.includes(creatorId) && creatorId !== trip.organizer
      );
      
      if (removedUserIds.length > 0) {
        console.log(`Found ${removedUserIds.length} previously removed users:`, removedUserIds);
        
        // Update trip with removalLogicVersion
        await db.update(trips)
          .set({ 
            removalLogicVersion: 1,
            updatedAt: new Date()
          })
          .where(eq(trips.id, trip.id));
        
        console.log(`✓ Updated trip metadata with removalLogicVersion: 1`);
        
        // Tag removed users as legacyRemoved (if they still exist in users table)
        for (const userId of removedUserIds) {
          try {
            await db.update(users)
              .set({ legacyRemoved: true })
              .where(eq(users.id, userId));
            console.log(`✓ Tagged user ${userId} as legacyRemoved`);
          } catch (error) {
            console.log(`⚠ User ${userId} not found in users table (may have been deleted)`);
          }
        }
        
        // Archive expenses created by removed users
        const expensesToArchive = tripExpenses.filter(e => removedUserIds.includes(e.submittedBy));
        if (expensesToArchive.length > 0) {
          await db.update(expenses)
            .set({ archived: true })
            .where(and(
              eq(expenses.tripId, trip.id),
              inArray(expenses.submittedBy, removedUserIds)
            ));
          console.log(`✓ Archived ${expensesToArchive.length} expenses from removed users`);
        }
        
        // Archive activities created by removed users
        const activitiesToArchive = tripActivities.filter(a => removedUserIds.includes(a.createdBy));
        if (activitiesToArchive.length > 0) {
          await db.update(activities)
            .set({ archived: true })
            .where(and(
              eq(activities.tripId, trip.id),
              inArray(activities.createdBy, removedUserIds)
            ));
          console.log(`✓ Archived ${activitiesToArchive.length} activities from removed users`);
        }
        
        console.log(`✅ Trip ${trip.name} migration completed`);
      } else {
        console.log(`No previously removed users detected`);
      }
    }
    
    console.log('\n🎉 Migration completed successfully!');
    
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
}

// Run the migration
if (require.main === module) {
  migrateLegacyRemovals()
    .then(() => {
      console.log('Migration script finished');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration script failed:', error);
      process.exit(1);
    });
}

export { migrateLegacyRemovals };