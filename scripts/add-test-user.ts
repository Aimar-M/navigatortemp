import { db } from "../server/db";
import { users } from "../shared/schema";
import { eq } from "drizzle-orm";

// This script adds a test user directly to the database
async function addTestUser() {
  try {
    console.log("Adding test user to database...");
    
    // Check if test user already exists
    const existingUsers = await db.select().from(users).where(eq(users.username, 'testuser'));
    
    if (existingUsers.length > 0) {
      console.log("Test user already exists:", existingUsers[0]);
      return;
    }
    
    // Add the test user
    const [user] = await db.insert(users).values({
      username: 'testuser',
      password: 'password123',
      email: 'test@example.com',
      name: 'Test User'
    }).returning();
    
    console.log("Test user created successfully:", user);
  } catch (error) {
    console.error("Error adding test user:", error);
  } finally {
    process.exit(0);
  }
}

// Run the function
addTestUser();