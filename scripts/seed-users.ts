import { db } from "../server/db";
import { users } from "../shared/schema";

// This script seeds test users to the database
async function seedUsers() {
  try {
    console.log("Starting seed process...");
    
    // Check if testuser already exists using eq from drizzle-orm
    const { eq } = await import("drizzle-orm");
    const existingUsers = await db.select().from(users).where(eq(users.username, 'testuser'));
    
    if (existingUsers.length > 0) {
      console.log("Test user already exists, skipping creation");
      return;
    }
    
    // Insert test user
    const [user] = await db.insert(users).values({
      username: 'testuser',
      password: 'password123',
      email: 'test@example.com',
      name: 'Test User'
    }).returning();
    
    console.log("Created test user:", user);
    console.log("Seed process completed successfully");
  } catch (error) {
    console.error("Error seeding database:", error);
  } finally {
    // Close the database connection
    process.exit(0);
  }
}

// Run the seed function
seedUsers();