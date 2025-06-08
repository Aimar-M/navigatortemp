import { db } from "../server/db";
import { tripMembers, messages, expenses, expenseSplits, activityRsvp } from "../shared/schema";
import { eq, and, sql } from "drizzle-orm";

async function migrateRSVPStatus() {
  console.log("Starting RSVP status migration for existing trip members...");
  
  try {
    // Get all existing trip members
    const allMembers = await db.select().from(tripMembers);
    console.log(`Found ${allMembers.length} trip members to process`);
    
    for (const member of allMembers) {
      const { tripId, userId } = member;
      
      // Check if user has any activity in this trip
      const messagesCount = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(messages)
        .where(and(eq(messages.tripId, tripId), eq(messages.userId, userId)));
      
      // Check if user has expense splits (indicating participation in expenses)
      const expenseSplitsResult = await db
        .select()
        .from(expenseSplits)
        .innerJoin(expenses, eq(expenseSplits.expenseId, expenses.id))
        .where(and(eq(expenses.tripId, tripId), eq(expenseSplits.userId, userId)))
        .limit(1);
      
      const rsvpCount = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(activityRsvp)
        .where(eq(activityRsvp.userId, userId));
      
      // Determine RSVP status based on activity
      let rsvpStatus = "pending";
      let rsvpDate: Date | null = null;
      
      const hasActivity = messagesCount[0]?.count > 0 || 
                         expenseSplitsResult.length > 0 || 
                         rsvpCount[0]?.count > 0;
      
      if (hasActivity) {
        // User has been active in the trip, set to confirmed
        rsvpStatus = "confirmed";
        rsvpDate = new Date(); // Set current date as rsvp date
        console.log(`Setting user ${userId} in trip ${tripId} to confirmed (has activity)`);
      } else {
        console.log(`Setting user ${userId} in trip ${tripId} to pending (no activity)`);
      }
      
      // Update the member's RSVP status
      await db
        .update(tripMembers)
        .set({ 
          rsvpStatus,
          rsvpDate,
          joinedAt: member.joinedAt || new Date() // Ensure joinedAt is set
        })
        .where(and(eq(tripMembers.tripId, tripId), eq(tripMembers.userId, userId)));
    }
    
    console.log("RSVP status migration completed successfully!");
    
    // Print summary
    const [confirmedCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(tripMembers)
      .where(eq(tripMembers.rsvpStatus, "confirmed"));
    
    const [pendingCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(tripMembers)
      .where(eq(tripMembers.rsvpStatus, "pending"));
    
    console.log(`Summary: ${confirmedCount.count} confirmed, ${pendingCount.count} pending`);
    
  } catch (error) {
    console.error("Error during RSVP status migration:", error);
    process.exit(1);
  }
}

// Run the migration
migrateRSVPStatus().then(() => {
  console.log("Migration script completed");
  process.exit(0);
}).catch(error => {
  console.error("Migration failed:", error);
  process.exit(1);
});