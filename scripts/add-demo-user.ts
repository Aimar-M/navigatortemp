import { db } from "../server/db";
import { users } from "../shared/schema";
import { eq } from "drizzle-orm";

// This script adds a demo user directly to the database
async function addDemoUser() {
  try {
    console.log("Adding demo user to database...");
    
    // Check if demo user already exists
    const existingUsers = await db.select().from(users).where(eq(users.username, 'demo'));
    
    if (existingUsers.length > 0) {
      console.log("Demo user already exists:", existingUsers[0]);
      return;
    }
    
    // Add the demo user
    const [user] = await db.insert(users).values({
      username: 'demo',
      password: 'password123',
      email: 'demo@example.com',
      name: 'Demo User'
    }).returning();
    
    console.log("Demo user created successfully:", user);
  } catch (error) {
    console.error("Error adding demo user:", error);
  } finally {
    process.exit(0);
  }
}

// Run the function
addDemoUser();