import { pgTable, text, serial, integer, boolean, timestamp, primaryKey } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User schema
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  avatar: text("avatar"),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  email: true,
  name: true,
  avatar: true,
});

// Trip schema
export const trips = pgTable("trips", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  destination: text("destination").notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  status: text("status").notNull().default("planning"), // planning, active, completed
  cover: text("cover"),
  organizer: integer("organizer").notNull(), // references users.id
});

export const insertTripSchema = createInsertSchema(trips).pick({
  name: true,
  description: true,
  destination: true,
  startDate: true,
  endDate: true,
  status: true,
  cover: true,
  organizer: true,
});

// TripMembers schema (to handle trip participants)
export const tripMembers = pgTable("trip_members", {
  tripId: integer("trip_id").notNull(),
  userId: integer("user_id").notNull(),
  status: text("status").notNull().default("pending"), // pending, confirmed, declined
}, (t) => ({
  pk: primaryKey({ columns: [t.tripId, t.userId] }),
}));

export const insertTripMemberSchema = createInsertSchema(tripMembers);

// Activities schema
export const activities = pgTable("activities", {
  id: serial("id").primaryKey(),
  tripId: integer("trip_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  date: timestamp("date").notNull(),
  location: text("location"),
  duration: integer("duration"),
  cost: text("cost"),
});

export const insertActivitySchema = createInsertSchema(activities).pick({
  tripId: true,
  name: true,
  description: true,
  date: true,
  location: true,
  duration: true,
  cost: true,
});

// ActivityRSVP schema
export const activityRsvp = pgTable("activity_rsvp", {
  activityId: integer("activity_id").notNull(),
  userId: integer("user_id").notNull(),
  status: text("status").notNull().default("pending"), // pending, going, not going
}, (t) => ({
  pk: primaryKey({ columns: [t.activityId, t.userId] }),
}));

export const insertActivityRsvpSchema = createInsertSchema(activityRsvp);

// Chat messages schema
export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  tripId: integer("trip_id").notNull(),
  userId: integer("user_id").notNull(),
  content: text("content").notNull(),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
});

export const insertMessageSchema = createInsertSchema(messages).pick({
  tripId: true,
  userId: true,
  content: true,
});

// Survey questions schema
export const surveyQuestions = pgTable("survey_questions", {
  id: serial("id").primaryKey(),
  tripId: integer("trip_id").notNull(),
  question: text("question").notNull(),
  type: text("type").notNull().default("text"), // text, multiple_choice, date, etc.
  options: text("options").array(),
});

export const insertSurveyQuestionSchema = createInsertSchema(surveyQuestions).pick({
  tripId: true,
  question: true,
  type: true,
  options: true,
});

// Survey responses schema
export const surveyResponses = pgTable("survey_responses", {
  id: serial("id").primaryKey(),
  questionId: integer("question_id").notNull(),
  userId: integer("user_id").notNull(),
  response: text("response").notNull(),
});

export const insertSurveyResponseSchema = createInsertSchema(surveyResponses).pick({
  questionId: true,
  userId: true,
  response: true,
});

// Define return types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Trip = typeof trips.$inferSelect;
export type InsertTrip = z.infer<typeof insertTripSchema>;

export type TripMember = typeof tripMembers.$inferSelect;
export type InsertTripMember = z.infer<typeof insertTripMemberSchema>;

export type Activity = typeof activities.$inferSelect;
export type InsertActivity = z.infer<typeof insertActivitySchema>;

export type ActivityRSVP = typeof activityRsvp.$inferSelect;
export type InsertActivityRSVP = z.infer<typeof insertActivityRsvpSchema>;

export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;

export type SurveyQuestion = typeof surveyQuestions.$inferSelect;
export type InsertSurveyQuestion = z.infer<typeof insertSurveyQuestionSchema>;

export type SurveyResponse = typeof surveyResponses.$inferSelect;
export type InsertSurveyResponse = z.infer<typeof insertSurveyResponseSchema>;
