import { pgTable, text, serial, integer, boolean, timestamp, primaryKey, foreignKey, uuid, decimal, jsonb, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { relations } from "drizzle-orm";
import { z } from "zod";

// User schema
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  bio: text("bio"),
  location: text("location"),
  avatar: text("avatar"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const usersRelations = relations(users, ({ many }) => ({
  tripMembers: many(tripMembers),
  trips: many(trips, { relationName: "organizer_trips" }),
  messages: many(messages),
  activityRsvps: many(activityRsvp),
  surveyResponses: many(surveyResponses),
  pollVotes: many(pollVotes),
}));

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
  organizer: integer("organizer").notNull().references(() => users.id),
  accommodationLink: text("accommodation_link"),
  airportGateway: text("airport_gateway"),
  isPinned: boolean("is_pinned").default(false),
  isArchived: boolean("is_archived").default(false),
});

export const tripsRelations = relations(trips, ({ one, many }) => ({
  organizerUser: one(users, {
    fields: [trips.organizer],
    references: [users.id],
    relationName: "organizer_trips"
  }),
  members: many(tripMembers),
  activities: many(activities),
  messages: many(messages),
  surveyQuestions: many(surveyQuestions),
  polls: many(polls),
}));

export const insertTripSchema = createInsertSchema(trips).pick({
  name: true,
  description: true,
  destination: true,
  startDate: true,
  endDate: true,
  status: true,
  cover: true,
  organizer: true,
  accommodationLink: true,
  airportGateway: true,
});

// Add new table for user-specific trip settings
export const userTripSettings = pgTable("user_trip_settings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  tripId: integer("trip_id").notNull().references(() => trips.id),
  isPinned: boolean("is_pinned").notNull().default(false),
  isArchived: boolean("is_archived").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => ({
  uniqueUserTrip: uniqueIndex("user_trip_settings_user_trip_idx").on(t.userId, t.tripId),
}));

export const userTripSettingsRelations = relations(userTripSettings, ({ one }) => ({
  user: one(users, {
    fields: [userTripSettings.userId],
    references: [users.id]
  }),
  trip: one(trips, {
    fields: [userTripSettings.tripId],
    references: [trips.id]
  }),
}));

export const insertUserTripSettingsSchema = createInsertSchema(userTripSettings).pick({
  userId: true,
  tripId: true,
  isPinned: true,
  isArchived: true,
});

// TripMembers schema (to handle trip participants)
export const tripMembers = pgTable("trip_members", {
  tripId: integer("trip_id").notNull().references(() => trips.id),
  userId: integer("user_id").notNull().references(() => users.id),
  status: text("status").notNull().default("pending"), // pending, confirmed, declined
}, (t) => ({
  pk: primaryKey({ columns: [t.tripId, t.userId] }),
}));

export const tripMembersRelations = relations(tripMembers, ({ one }) => ({
  trip: one(trips, {
    fields: [tripMembers.tripId],
    references: [trips.id]
  }),
  user: one(users, {
    fields: [tripMembers.userId],
    references: [users.id]
  }),
}));

export const insertTripMemberSchema = createInsertSchema(tripMembers);

// Activities schema
export const activities = pgTable("activities", {
  id: serial("id").primaryKey(),
  tripId: integer("trip_id").notNull().references(() => trips.id),
  name: text("name").notNull(),
  description: text("description"),
  date: timestamp("date").notNull(),
  location: text("location"),
  duration: integer("duration"),
  cost: text("cost"),
});

export const activitiesRelations = relations(activities, ({ one, many }) => ({
  trip: one(trips, {
    fields: [activities.tripId],
    references: [trips.id]
  }),
  rsvps: many(activityRsvp)
}));

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
  activityId: integer("activity_id").notNull().references(() => activities.id),
  userId: integer("user_id").notNull().references(() => users.id),
  status: text("status").notNull().default("pending"), // pending, going, not going
}, (t) => ({
  pk: primaryKey({ columns: [t.activityId, t.userId] }),
}));

export const activityRsvpRelations = relations(activityRsvp, ({ one }) => ({
  activity: one(activities, {
    fields: [activityRsvp.activityId],
    references: [activities.id]
  }),
  user: one(users, {
    fields: [activityRsvp.userId],
    references: [users.id]
  })
}));

export const insertActivityRsvpSchema = createInsertSchema(activityRsvp);

// Chat messages schema
export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  tripId: integer("trip_id").notNull().references(() => trips.id),
  userId: integer("user_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
});

export const messagesRelations = relations(messages, ({ one }) => ({
  trip: one(trips, {
    fields: [messages.tripId],
    references: [trips.id]
  }),
  user: one(users, {
    fields: [messages.userId],
    references: [users.id]
  })
}));

export const insertMessageSchema = createInsertSchema(messages).pick({
  tripId: true,
  userId: true,
  content: true,
});

// Survey questions schema
export const surveyQuestions = pgTable("survey_questions", {
  id: serial("id").primaryKey(),
  tripId: integer("trip_id").notNull().references(() => trips.id),
  question: text("question").notNull(),
  type: text("type").notNull().default("text"), // text, multiple_choice, date, etc.
  options: text("options").array(),
});

export const surveyQuestionsRelations = relations(surveyQuestions, ({ one, many }) => ({
  trip: one(trips, {
    fields: [surveyQuestions.tripId],
    references: [trips.id]
  }),
  responses: many(surveyResponses)
}));

export const insertSurveyQuestionSchema = createInsertSchema(surveyQuestions).pick({
  tripId: true,
  question: true,
  type: true,
  options: true,
});

// Survey responses schema
export const surveyResponses = pgTable("survey_responses", {
  id: serial("id").primaryKey(),
  questionId: integer("question_id").notNull().references(() => surveyQuestions.id),
  userId: integer("user_id").notNull().references(() => users.id),
  response: text("response").notNull(),
});

export const surveyResponsesRelations = relations(surveyResponses, ({ one }) => ({
  question: one(surveyQuestions, {
    fields: [surveyResponses.questionId],
    references: [surveyQuestions.id]
  }),
  user: one(users, {
    fields: [surveyResponses.userId],
    references: [users.id]
  })
}));

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



// Invitation links schema
export const invitationLinks = pgTable("invitation_links", {
  id: serial("id").primaryKey(),
  token: uuid("token").notNull().defaultRandom(),
  tripId: integer("trip_id").notNull().references(() => trips.id),
  createdBy: integer("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  expiresAt: timestamp("expires_at"),
  isActive: boolean("is_active").notNull().default(true),
});

export const invitationLinksRelations = relations(invitationLinks, ({ one }) => ({
  trip: one(trips, {
    fields: [invitationLinks.tripId],
    references: [trips.id]
  }),
  creator: one(users, {
    fields: [invitationLinks.createdBy],
    references: [users.id]
  }),
}));

export const insertInvitationLinkSchema = createInsertSchema(invitationLinks).pick({
  tripId: true,
  createdBy: true,
  expiresAt: true,
});

export type InvitationLink = typeof invitationLinks.$inferSelect;
export type InsertInvitationLink = z.infer<typeof insertInvitationLinkSchema>;

// Trip Expenses schema
export const expenses = pgTable("expenses", {
  id: serial("id").primaryKey(),
  tripId: integer("trip_id").notNull().references(() => trips.id),
  userId: integer("user_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  currency: text("currency").notNull().default("USD"),
  category: text("category").notNull(), // accommodation, transportation, food, activities, other
  date: timestamp("date").notNull().defaultNow(),
  description: text("description"),
  paidBy: integer("paid_by").notNull().references(() => users.id),
  splitMethod: text("split_method").notNull().default("equal"), // equal, percentage, fixed, etc.
  splitDetails: jsonb("split_details"), // For storing details of custom splits
  isSettled: boolean("is_settled").notNull().default(false),
  receiptUrl: text("receipt_url"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const expensesRelations = relations(expenses, ({ one }) => ({
  trip: one(trips, {
    fields: [expenses.tripId],
    references: [trips.id]
  }),
  user: one(users, {
    fields: [expenses.userId],
    references: [users.id]
  }),
  payer: one(users, {
    fields: [expenses.paidBy],
    references: [users.id]
  })
}));

export const insertExpenseSchema = createInsertSchema(expenses).pick({
  tripId: true,
  userId: true,
  title: true,
  amount: true,
  currency: true,
  category: true,
  date: true,
  description: true,
  paidBy: true,
  splitMethod: true,
  splitDetails: true,
  receiptUrl: true,
});

// Flight Information schema
export const flightInfo = pgTable("flight_info", {
  id: serial("id").primaryKey(),
  tripId: integer("trip_id").notNull().references(() => trips.id),
  userId: integer("user_id").notNull().references(() => users.id),
  airline: text("airline").notNull(),
  flightNumber: text("flight_number").notNull(),
  departureAirport: text("departure_airport").notNull(),
  departureCity: text("departure_city").notNull(),
  departureTime: timestamp("departure_time").notNull(),
  arrivalAirport: text("arrival_airport").notNull(),
  arrivalCity: text("arrival_city").notNull(),
  arrivalTime: timestamp("arrival_time").notNull(),
  price: decimal("price", { precision: 10, scale: 2 }),
  currency: text("currency").default("USD"),
  bookingReference: text("booking_reference"),
  bookingStatus: text("booking_status").notNull().default("confirmed"), // confirmed, pending, cancelled
  seatNumber: text("seat_number"),
  notes: text("notes"),
  flightDetails: jsonb("flight_details"), // For storing additional flight details
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const flightInfoRelations = relations(flightInfo, ({ one }) => ({
  trip: one(trips, {
    fields: [flightInfo.tripId],
    references: [trips.id]
  }),
  user: one(users, {
    fields: [flightInfo.userId],
    references: [users.id]
  })
}));

export const insertFlightInfoSchema = createInsertSchema(flightInfo).pick({
  tripId: true,
  userId: true,
  airline: true,
  flightNumber: true,
  departureAirport: true,
  departureCity: true,
  departureTime: true,
  arrivalAirport: true,
  arrivalCity: true,
  arrivalTime: true,
  price: true,
  currency: true,
  bookingReference: true,
  bookingStatus: true,
  seatNumber: true,
  notes: true,
  flightDetails: true,
});

// Define expense types using existing schema
export type Expense = typeof expenses.$inferSelect;
export type InsertExpense = z.infer<typeof insertExpenseSchema>;

export const expenseSplits = pgTable("expense_splits", {
  id: serial("id").primaryKey(),
  expenseId: integer("expense_id").notNull().references(() => expenses.id),
  userId: integer("user_id").notNull().references(() => users.id),
  amount: text("amount").notNull(),
  settled: boolean("settled").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const expenseSplitsRelations = relations(expenseSplits, ({ one }) => ({
  expense: one(expenses, {
    fields: [expenseSplits.expenseId],
    references: [expenses.id]
  }),
  user: one(users, {
    fields: [expenseSplits.userId],
    references: [users.id]
  }),
}));

export const insertExpenseSplitSchema = createInsertSchema(expenseSplits).pick({
  expenseId: true,
  userId: true,
  amount: true,
  settled: true,
});

export type ExpenseSplit = typeof expenseSplits.$inferSelect;
export type InsertExpenseSplit = z.infer<typeof insertExpenseSplitSchema>;

export type FlightInfo = typeof flightInfo.$inferSelect;
export type InsertFlightInfo = z.infer<typeof insertFlightInfoSchema>;

// Polls schema
export const polls = pgTable("polls", {
  id: serial("id").primaryKey(),
  tripId: integer("trip_id").notNull().references(() => trips.id),
  createdBy: integer("created_by").notNull().references(() => users.id),
  title: text("title").notNull(),
  description: text("description"),
  options: text("options").array().notNull(),
  multipleChoice: boolean("multiple_choice").notNull().default(false),
  endDate: timestamp("end_date"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const pollsRelations = relations(polls, ({ one, many }) => ({
  trip: one(trips, {
    fields: [polls.tripId],
    references: [trips.id]
  }),
  creator: one(users, {
    fields: [polls.createdBy],
    references: [users.id]
  }),
  votes: many(pollVotes)
}));

export const insertPollSchema = createInsertSchema(polls).pick({
  tripId: true,
  createdBy: true,
  title: true,
  description: true,
  options: true,
  multipleChoice: true,
  endDate: true,
});

// Poll Votes schema
export const pollVotes = pgTable("poll_votes", {
  id: serial("id").primaryKey(),
  pollId: integer("poll_id").notNull().references(() => polls.id),
  userId: integer("user_id").notNull().references(() => users.id),
  optionIndex: integer("option_index").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const pollVotesRelations = relations(pollVotes, ({ one }) => ({
  poll: one(polls, {
    fields: [pollVotes.pollId],
    references: [polls.id]
  }),
  user: one(users, {
    fields: [pollVotes.userId],
    references: [users.id]
  })
}));

export const insertPollVoteSchema = createInsertSchema(pollVotes).pick({
  pollId: true,
  userId: true,
  optionIndex: true,
});

// Define new types for polls
export type Poll = typeof polls.$inferSelect;
export type InsertPoll = z.infer<typeof insertPollSchema>;

export type PollVote = typeof pollVotes.$inferSelect;
export type InsertPollVote = z.infer<typeof insertPollVoteSchema>;

// Add types for user trip settings
export type UserTripSetting = typeof userTripSettings.$inferSelect;
export type InsertUserTripSetting = z.infer<typeof insertUserTripSettingsSchema>;
