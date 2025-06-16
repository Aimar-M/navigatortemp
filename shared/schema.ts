import { pgTable, text, serial, integer, boolean, timestamp, primaryKey, foreignKey, uuid, decimal, jsonb, uniqueIndex, varchar, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { relations } from "drizzle-orm";
import { z } from "zod";

// Session storage table for express-session
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

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
  venmoUsername: text("venmo_username"),
  paypalEmail: text("paypal_email"),
  legacyRemoved: boolean("legacy_removed").default(false),
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

export const updateUserProfileSchema = createInsertSchema(users).pick({
  name: true,
  bio: true,
  location: true,
  avatar: true,
  venmoUsername: true,
  paypalEmail: true,
}).extend({
  venmoUsername: z.string().optional().refine((val) => !val || val.startsWith('@'), {
    message: "Venmo username must start with @"
  }),
  paypalEmail: z.string().email().optional().or(z.literal('')),
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
  accommodationLinks: text("accommodation_links").array(),
  airportGateway: text("airport_gateway"),
  isPinned: boolean("is_pinned").default(false),
  isArchived: boolean("is_archived").default(false),
  requiresDownPayment: boolean("requires_down_payment").default(false),
  downPaymentAmount: decimal("down_payment_amount", { precision: 10, scale: 2 }),
  adminOnlyItinerary: boolean("admin_only_itinerary").default(false),
  removalLogicVersion: integer("removal_logic_version").default(0),
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
  accommodationLinks: true,
  airportGateway: true,
  requiresDownPayment: true,
  downPaymentAmount: true,
  adminOnlyItinerary: true,
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
  status: text("status").notNull().default("pending"), // pending, confirmed, declined (invitation status)
  rsvpStatus: text("rsvp_status").notNull().default("pending"), // pending, awaiting_payment, confirmed, declined (RSVP status)
  isAdmin: boolean("is_admin").notNull().default(false), // admin flag for future permissions
  joinedAt: timestamp("joined_at").defaultNow(),
  rsvpDate: timestamp("rsvp_date"),
  paymentMethod: text("payment_method"), // venmo, paypal, cash
  paymentStatus: text("payment_status").default("not_required"), // not_required, pending, confirmed
  paymentAmount: decimal("payment_amount", { precision: 10, scale: 2 }),
  paymentSubmittedAt: timestamp("payment_submitted_at"),
  paymentConfirmedAt: timestamp("payment_confirmed_at"),
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

export const insertTripMemberSchema = createInsertSchema(tripMembers).pick({
  tripId: true,
  userId: true,
  status: true,
  rsvpStatus: true,
  isAdmin: true,
  joinedAt: true,
  rsvpDate: true,
  paymentMethod: true,
  paymentStatus: true,
  paymentAmount: true,
  paymentSubmittedAt: true,
  paymentConfirmedAt: true,
});

// Activities schema
export const activities = pgTable("activities", {
  id: serial("id").primaryKey(),
  tripId: integer("trip_id").notNull().references(() => trips.id),
  name: text("name").notNull(),
  description: text("description"),
  date: timestamp("date").notNull(),
  startTime: text("start_time"), // optional time field in HH:MM format
  activityType: text("activity_type"), // optional: Food & Drink, Transportation, Attraction, Event, Activity, Accommodation
  activityLink: text("activity_link"), // optional URL link to activity website
  location: text("location"),
  duration: text("duration"), // changed from integer to text for free-form input
  cost: text("cost"),
  paymentType: text("payment_type").notNull().default("free"), // free, payment_onsite, prepaid
  maxParticipants: integer("max_participants"), // optional registration cap
  createdBy: integer("created_by").references(() => users.id), // who created this activity
  checkInDate: timestamp("check_in_date"), // for accommodation types only
  checkOutDate: timestamp("check_out_date"), // for accommodation types only
  archived: boolean("archived").default(false),
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
  startTime: true,
  activityType: true,
  activityLink: true,
  location: true,
  duration: true,
  cost: true,
  paymentType: true,
  maxParticipants: true,
  createdBy: true,
  checkInDate: true,
  checkOutDate: true,
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

// Trip Expenses schema - rebuilt for activity integration
export const expenses = pgTable("expenses", {
  id: serial("id").primaryKey(),
  tripId: integer("trip_id").notNull().references(() => trips.id),
  title: text("title").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  currency: text("currency").notNull().default("USD"),
  category: text("category").notNull(), // accommodation, transportation, food, activities, other
  date: timestamp("date").notNull().defaultNow(),
  description: text("description"),
  paidBy: integer("paid_by").notNull().references(() => users.id), // Who paid for this expense
  activityId: integer("activity_id").references(() => activities.id), // Link to activity if auto-created from RSVP
  isSettled: boolean("is_settled").notNull().default(false),
  receiptUrl: text("receipt_url"),
  archived: boolean("archived").default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Expense splits - who owes what for each expense
export const expenseSplits = pgTable("expense_splits", {
  id: serial("id").primaryKey(),
  expenseId: integer("expense_id").notNull().references(() => expenses.id),
  userId: integer("user_id").notNull().references(() => users.id), // Who owes this amount
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(), // How much they owe
  isPaid: boolean("is_paid").notNull().default(false),
  paidAt: timestamp("paid_at"),
});

export const expensesRelations = relations(expenses, ({ one, many }) => ({
  trip: one(trips, {
    fields: [expenses.tripId],
    references: [trips.id]
  }),
  paidBy: one(users, {
    fields: [expenses.paidBy],
    references: [users.id]
  }),
  activity: one(activities, {
    fields: [expenses.activityId],
    references: [activities.id]
  }),
  splits: many(expenseSplits)
}));

export const expenseSplitsRelations = relations(expenseSplits, ({ one }) => ({
  expense: one(expenses, {
    fields: [expenseSplits.expenseId],
    references: [expenses.id]
  }),
  user: one(users, {
    fields: [expenseSplits.userId],
    references: [users.id]
  })
}));

export const insertExpenseSchema = createInsertSchema(expenses).pick({
  tripId: true,
  title: true,
  amount: true,
  currency: true,
  category: true,
  date: true,
  description: true,
  paidBy: true,
  activityId: true,
  receiptUrl: true,
});

export const insertExpenseSplitSchema = createInsertSchema(expenseSplits).pick({
  expenseId: true,
  userId: true,
  amount: true,
});

export type Expense = typeof expenses.$inferSelect;
export type InsertExpense = z.infer<typeof insertExpenseSchema>;
export type ExpenseSplit = typeof expenseSplits.$inferSelect;
export type InsertExpenseSplit = z.infer<typeof insertExpenseSplitSchema>;

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

// Settlement tracking schema
export const settlements = pgTable("settlements", {
  id: serial("id").primaryKey(),
  tripId: integer("trip_id").notNull().references(() => trips.id),
  payerId: integer("payer_id").notNull().references(() => users.id), // Who owes money
  payeeId: integer("payee_id").notNull().references(() => users.id), // Who is owed money
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  currency: text("currency").notNull().default("USD"),
  paymentMethod: text("payment_method"), // "venmo", "paypal", "cash", null
  paymentLink: text("payment_link"), // Generated payment URL
  status: text("status").notNull().default("pending"), // "pending", "confirmed", "cancelled"
  initiatedAt: timestamp("initiated_at").notNull().defaultNow(),
  confirmedAt: timestamp("confirmed_at"),
  confirmedBy: integer("confirmed_by").references(() => users.id), // Who confirmed payment
  notes: text("notes"), // Optional notes about the settlement
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const settlementsRelations = relations(settlements, ({ one }) => ({
  trip: one(trips, {
    fields: [settlements.tripId],
    references: [trips.id]
  }),
  payer: one(users, {
    fields: [settlements.payerId],
    references: [users.id]
  }),
  payee: one(users, {
    fields: [settlements.payeeId],
    references: [users.id]
  }),
  confirmedByUser: one(users, {
    fields: [settlements.confirmedBy],
    references: [users.id]
  })
}));

export const insertSettlementSchema = createInsertSchema(settlements).pick({
  tripId: true,
  payerId: true,
  payeeId: true,
  amount: true,
  currency: true,
  paymentMethod: true,
  paymentLink: true,
  notes: true,
});

export type Settlement = typeof settlements.$inferSelect;
export type InsertSettlement = z.infer<typeof insertSettlementSchema>;

// Add types for user trip settings
export type UserTripSetting = typeof userTripSettings.$inferSelect;
export type InsertUserTripSetting = z.infer<typeof insertUserTripSettingsSchema>;
