import { db } from "../server/db";
import { users } from "../shared/schema";
import { eq } from "drizzle-orm";

async function addPaymentInfo() {
  try {
    // Add payment info to test users
    await db.update(users)
      .set({
        venmoUsername: "@testuser-venmo",
        paypalEmail: "testuser@paypal.com"
      })
      .where(eq(users.username, "testuser"));

    await db.update(users)
      .set({
        venmoUsername: "@dobi-venmo", 
        paypalEmail: "dobi@paypal.com"
      })
      .where(eq(users.username, "dobi"));

    console.log("Payment information added successfully");
  } catch (error) {
    console.error("Error adding payment info:", error);
  }
}

addPaymentInfo();