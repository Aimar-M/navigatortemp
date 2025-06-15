import { db } from "./db";
import { 
  User, InsertUser, Trip, InsertTrip, TripMember, InsertTripMember,
  Activity, InsertActivity, ActivityRSVP, InsertActivityRSVP,
  Message, InsertMessage, SurveyQuestion, InsertSurveyQuestion,
  SurveyResponse, InsertSurveyResponse, InvitationLink, InsertInvitationLink,
  Expense, InsertExpense, FlightInfo, InsertFlightInfo,
  Poll, InsertPoll, PollVote, InsertPollVote,
  UserTripSetting, InsertUserTripSetting,
  users, trips, tripMembers, activities, activityRsvp, 
  messages, surveyQuestions, surveyResponses, invitationLinks,
  expenses, flightInfo, polls, pollVotes, userTripSettings
} from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<InsertUser>): Promise<User | undefined>;
  
  // Trip methods
  createTrip(trip: InsertTrip): Promise<Trip>;
  getTrip(id: number): Promise<Trip | undefined>;
  getTripsByUser(userId: number): Promise<Trip[]>;
  updateTrip(id: number, trip: Partial<InsertTrip>): Promise<Trip | undefined>;
  deleteTrip(id: number): Promise<boolean>;
  
  // User Trip Settings methods
  getUserTripSettings(userId: number, tripId: number): Promise<UserTripSetting | undefined>;
  getUserTripSettingsByUser(userId: number): Promise<UserTripSetting[]>;
  createOrUpdateUserTripSettings(settings: InsertUserTripSetting): Promise<UserTripSetting>;
  
  // Trip member methods
  addTripMember(member: InsertTripMember): Promise<TripMember>;
  getTripMembers(tripId: number): Promise<TripMember[]>;
  getTripMembershipsByUser(userId: number): Promise<TripMember[]>;
  updateTripMemberStatus(tripId: number, userId: number, status: string): Promise<TripMember | undefined>;
  updateTripMemberAdminStatus(tripId: number, userId: number, isAdmin: boolean): Promise<TripMember | undefined>;
  removeTripMember(tripId: number, userId: number): Promise<boolean>;
  
  // Activity methods
  createActivity(activity: InsertActivity): Promise<Activity>;
  getActivitiesByTrip(tripId: number): Promise<Activity[]>;
  getActivity(id: number): Promise<Activity | undefined>;
  updateActivity(id: number, activity: Partial<InsertActivity>): Promise<Activity | undefined>;
  deleteActivity(id: number): Promise<boolean>;
  
  // Activity RSVP methods
  createActivityRSVP(rsvp: InsertActivityRSVP): Promise<ActivityRSVP>;
  getActivityRSVPs(activityId: number): Promise<ActivityRSVP[]>;
  updateActivityRSVP(activityId: number, userId: number, status: string): Promise<ActivityRSVP | undefined>;
  
  // Message methods
  createMessage(message: InsertMessage): Promise<Message>;
  getMessagesByTrip(tripId: number): Promise<Message[]>;
  
  // Survey methods
  createSurveyQuestion(question: InsertSurveyQuestion): Promise<SurveyQuestion>;
  getSurveyQuestionsByTrip(tripId: number): Promise<SurveyQuestion[]>;
  createSurveyResponse(response: InsertSurveyResponse): Promise<SurveyResponse>;
  getSurveyResponses(questionId: number): Promise<SurveyResponse[]>;
  
  // Poll methods
  createPoll(poll: InsertPoll): Promise<Poll>;
  getPollsByTrip(tripId: number): Promise<Poll[]>;
  getPoll(id: number): Promise<Poll | undefined>;
  updatePoll(id: number, poll: Partial<InsertPoll>): Promise<Poll | undefined>;
  deletePoll(id: number): Promise<boolean>;
  createPollVote(vote: InsertPollVote): Promise<PollVote>;
  getPollVotes(pollId: number): Promise<PollVote[]>;
  getUserPollVotes(pollId: number, userId: number): Promise<PollVote[]>;
  deletePollVote(id: number): Promise<boolean>;
  
  // Invitation methods
  createInvitationLink(invitation: InsertInvitationLink): Promise<InvitationLink>;
  getInvitationLink(token: string): Promise<InvitationLink | undefined>;
  getInvitationLinksByTrip(tripId: number): Promise<InvitationLink[]>;
  deactivateInvitationLink(id: number): Promise<boolean>;
  
  // Expense methods
  createExpense(expense: InsertExpense): Promise<Expense>;
  getExpensesByTrip(tripId: number): Promise<Expense[]>;
  getExpensesByUser(userId: number): Promise<Expense[]>;
  getExpense(id: number): Promise<Expense | undefined>;
  updateExpense(id: number, expense: Partial<InsertExpense>): Promise<Expense | undefined>;
  deleteExpense(id: number): Promise<boolean>;
  getTripExpenseSummary(tripId: number): Promise<any>; // Summary statistics for trip expenses
  
  // Flight Info methods
  createFlightInfo(flight: InsertFlightInfo): Promise<FlightInfo>;
  getFlightInfoByTrip(tripId: number): Promise<FlightInfo[]>;
  getFlightInfoByUser(userId: number): Promise<FlightInfo[]>;
  getFlightInfo(id: number): Promise<FlightInfo | undefined>;
  updateFlightInfo(id: number, flight: Partial<InsertFlightInfo>): Promise<FlightInfo | undefined>;
  deleteFlightInfo(id: number): Promise<boolean>;
  searchFlights(departureCity: string, arrivalCity: string, date: Date): Promise<any[]>; // Search flights API
}

export class DatabaseStorage implements IStorage {
  // User Trip Settings methods
  async getUserTripSettings(userId: number, tripId: number): Promise<UserTripSetting | undefined> {
    const [settings] = await db
      .select()
      .from(userTripSettings)
      .where(
        and(
          eq(userTripSettings.userId, userId),
          eq(userTripSettings.tripId, tripId)
        )
      );
    return settings || undefined;
  }

  async getUserTripSettingsByUser(userId: number): Promise<UserTripSetting[]> {
    return await db
      .select()
      .from(userTripSettings)
      .where(eq(userTripSettings.userId, userId));
  }

  async createOrUpdateUserTripSettings(settings: InsertUserTripSetting): Promise<UserTripSetting> {
    // Check if settings already exist
    const existingSettings = await this.getUserTripSettings(settings.userId, settings.tripId);
    
    if (existingSettings) {
      // Update existing settings
      const [updatedSettings] = await db
        .update(userTripSettings)
        .set({
          ...settings,
          updatedAt: new Date()
        })
        .where(
          and(
            eq(userTripSettings.userId, settings.userId),
            eq(userTripSettings.tripId, settings.tripId)
          )
        )
        .returning();
      return updatedSettings;
    } else {
      // Create new settings
      const [newSettings] = await db
        .insert(userTripSettings)
        .values(settings)
        .returning();
      return newSettings;
    }
  }
  // Poll methods
  async createPoll(poll: InsertPoll): Promise<Poll> {
    const [newPoll] = await db
      .insert(polls)
      .values(poll)
      .returning();
    return newPoll;
  }

  async getPollsByTrip(tripId: number): Promise<Poll[]> {
    return await db
      .select()
      .from(polls)
      .where(eq(polls.tripId, tripId))
      .orderBy(desc(polls.createdAt));
  }

  async getPoll(id: number): Promise<Poll | undefined> {
    const [poll] = await db
      .select()
      .from(polls)
      .where(eq(polls.id, id));
    return poll;
  }

  async updatePoll(id: number, pollUpdate: Partial<InsertPoll>): Promise<Poll | undefined> {
    const [updatedPoll] = await db
      .update(polls)
      .set({
        ...pollUpdate,
        updatedAt: new Date()
      })
      .where(eq(polls.id, id))
      .returning();
    return updatedPoll;
  }

  async deletePoll(id: number): Promise<boolean> {
    // First delete associated votes
    await db.delete(pollVotes).where(eq(pollVotes.pollId, id));
    // Then delete the poll
    const result = await db.delete(polls).where(eq(polls.id, id));
    return result.rowCount > 0;
  }

  async createPollVote(vote: InsertPollVote): Promise<PollVote> {
    const [newVote] = await db
      .insert(pollVotes)
      .values(vote)
      .returning();
    return newVote;
  }

  async getPollVotes(pollId: number): Promise<PollVote[]> {
    return await db
      .select()
      .from(pollVotes)
      .where(eq(pollVotes.pollId, pollId));
  }

  async getUserPollVotes(pollId: number, userId: number): Promise<PollVote[]> {
    return await db
      .select()
      .from(pollVotes)
      .where(and(
        eq(pollVotes.pollId, pollId),
        eq(pollVotes.userId, userId)
      ));
  }

  async deletePollVote(id: number): Promise<boolean> {
    const result = await db
      .delete(pollVotes)
      .where(eq(pollVotes.id, id));
    return result.rowCount > 0;
  }
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async updateUser(id: number, userUpdate: Partial<InsertUser>): Promise<User | undefined> {
    const [updatedUser] = await db
      .update(users)
      .set(userUpdate)
      .where(eq(users.id, id))
      .returning();
    return updatedUser || undefined;
  }
  
  // Expense methods
  async createExpense(expense: InsertExpense): Promise<Expense> {
    const [newExpense] = await db
      .insert(expenses)
      .values(expense)
      .returning();
    return newExpense;
  }

  async getExpensesByTrip(tripId: number): Promise<Expense[]> {
    return await db
      .select()
      .from(expenses)
      .where(eq(expenses.tripId, tripId))
      .orderBy(desc(expenses.date));
  }

  async getExpensesByUser(userId: number): Promise<Expense[]> {
    return await db
      .select()
      .from(expenses)
      .where(eq(expenses.userId, userId))
      .orderBy(desc(expenses.date));
  }

  async getExpense(id: number): Promise<Expense | undefined> {
    const [expense] = await db
      .select()
      .from(expenses)
      .where(eq(expenses.id, id));
    return expense || undefined;
  }

  async updateExpense(id: number, expenseUpdate: Partial<InsertExpense>): Promise<Expense | undefined> {
    const [updatedExpense] = await db
      .update(expenses)
      .set({ ...expenseUpdate, updatedAt: new Date() })
      .where(eq(expenses.id, id))
      .returning();
    return updatedExpense || undefined;
  }

  async deleteExpense(id: number): Promise<boolean> {
    const result = await db
      .delete(expenses)
      .where(eq(expenses.id, id));
    return !!result;
  }

  async getTripExpenseSummary(tripId: number): Promise<any> {
    const allExpenses = await this.getExpensesByTrip(tripId);
    
    // Calculate summary statistics
    const total = allExpenses.reduce((sum, expense) => sum + Number(expense.amount), 0);
    
    // Group by category
    const byCategory = allExpenses.reduce((acc, expense) => {
      const category = expense.category;
      if (!acc[category]) {
        acc[category] = 0;
      }
      acc[category] += Number(expense.amount);
      return acc;
    }, {} as Record<string, number>);
    
    // Group by payer
    const byPayer = allExpenses.reduce((acc, expense) => {
      const paidBy = expense.paidBy;
      if (!acc[paidBy]) {
        acc[paidBy] = 0;
      }
      acc[paidBy] += Number(expense.amount);
      return acc;
    }, {} as Record<number, number>);
    
    // Calculate per person cost (equal split)
    const tripMembers = await this.getTripMembers(tripId);
    const confirmedMembers = tripMembers.filter(member => member.status === 'confirmed');
    const perPersonCost = confirmedMembers.length > 0 ? total / confirmedMembers.length : 0;
    
    return {
      total,
      byCategory,
      byPayer,
      perPersonCost,
      memberCount: confirmedMembers.length
    };
  }
  
  // Flight info methods
  async createFlightInfo(flight: InsertFlightInfo): Promise<FlightInfo> {
    const [newFlight] = await db
      .insert(flightInfo)
      .values(flight)
      .returning();
    return newFlight;
  }

  async getFlightInfoByTrip(tripId: number): Promise<FlightInfo[]> {
    return await db
      .select()
      .from(flightInfo)
      .where(eq(flightInfo.tripId, tripId))
      .orderBy(desc(flightInfo.departureTime));
  }

  async getFlightInfoByUser(userId: number): Promise<FlightInfo[]> {
    return await db
      .select()
      .from(flightInfo)
      .where(eq(flightInfo.userId, userId))
      .orderBy(desc(flightInfo.departureTime));
  }

  async getFlightInfo(id: number): Promise<FlightInfo | undefined> {
    const [flight] = await db
      .select()
      .from(flightInfo)
      .where(eq(flightInfo.id, id));
    return flight || undefined;
  }

  async updateFlightInfo(id: number, flightUpdate: Partial<InsertFlightInfo>): Promise<FlightInfo | undefined> {
    const [updatedFlight] = await db
      .update(flightInfo)
      .set({ ...flightUpdate, updatedAt: new Date() })
      .where(eq(flightInfo.id, id))
      .returning();
    return updatedFlight || undefined;
  }

  async deleteFlightInfo(id: number): Promise<boolean> {
    const result = await db
      .delete(flightInfo)
      .where(eq(flightInfo.id, id));
    return !!result;
  }
  
  async searchFlights(departureCity: string, arrivalCity: string, date: Date): Promise<any[]> {
    // This would normally use an external flight search API
    // For now, returning mock data for demonstration purposes
    return [
      {
        airline: "Sample Airlines",
        flightNumber: "SA123",
        departureAirport: `${departureCity} International Airport`,
        departureCity,
        departureTime: new Date(date.setHours(8, 30)),
        arrivalAirport: `${arrivalCity} International Airport`,
        arrivalCity,
        arrivalTime: new Date(date.setHours(10, 45)),
        price: 299.99,
        currency: "USD"
      },
      {
        airline: "Global Airways",
        flightNumber: "GA456",
        departureAirport: `${departureCity} International Airport`,
        departureCity,
        departureTime: new Date(date.setHours(12, 15)),
        arrivalAirport: `${arrivalCity} International Airport`,
        arrivalCity,
        arrivalTime: new Date(date.setHours(14, 30)),
        price: 349.99,
        currency: "USD"
      },
      {
        airline: "Express Flights",
        flightNumber: "EF789",
        departureAirport: `${departureCity} International Airport`,
        departureCity,
        departureTime: new Date(date.setHours(17, 45)),
        arrivalAirport: `${arrivalCity} International Airport`,
        arrivalCity,
        arrivalTime: new Date(date.setHours(20, 0)),
        price: 249.99,
        currency: "USD"
      }
    ];
  }

  async createTrip(insertTrip: InsertTrip): Promise<Trip> {
    const [trip] = await db
      .insert(trips)
      .values(insertTrip)
      .returning();
    
    // Automatically add the organizer as a confirmed member
    await this.addTripMember({
      tripId: trip.id,
      userId: insertTrip.organizer,
      status: "confirmed"
    });
    
    return trip;
  }

  async getTrip(id: number): Promise<Trip | undefined> {
    const [trip] = await db.select().from(trips).where(eq(trips.id, id));
    return trip || undefined;
  }

  async getTripsByUser(userId: number): Promise<Trip[]> {
    const members = await db
      .select()
      .from(tripMembers)
      .where(eq(tripMembers.userId, userId));
    
    if (members.length === 0) return [];
    
    const tripsResult = await Promise.all(
      members.map(member => 
        db.select().from(trips).where(eq(trips.id, member.tripId))
      )
    );
    
    return tripsResult.flatMap(t => t);
  }

  async updateTrip(id: number, tripUpdate: Partial<InsertTrip>): Promise<Trip | undefined> {
    const [updatedTrip] = await db
      .update(trips)
      .set(tripUpdate)
      .where(eq(trips.id, id))
      .returning();
    
    return updatedTrip || undefined;
  }

  async deleteTrip(id: number): Promise<boolean> {
    const result = await db
      .delete(trips)
      .where(eq(trips.id, id));
    
    return result.rowCount ? result.rowCount > 0 : false;
  }

  async addTripMember(member: InsertTripMember): Promise<TripMember> {
    try {
      const [tripMember] = await db
        .insert(tripMembers)
        .values(member)
        .returning();
      
      return tripMember;
    } catch (error) {
      // Check if the member already exists and return it
      const [existingMember] = await db
        .select()
        .from(tripMembers)
        .where(
          and(
            eq(tripMembers.tripId, member.tripId),
            eq(tripMembers.userId, member.userId)
          )
        );
      
      if (existingMember) return existingMember;
      throw error;
    }
  }

  async getTripMembers(tripId: number): Promise<TripMember[]> {
    return db
      .select()
      .from(tripMembers)
      .where(eq(tripMembers.tripId, tripId));
  }

  async getTripMembershipsByUser(userId: number): Promise<TripMember[]> {
    return db
      .select()
      .from(tripMembers)
      .where(eq(tripMembers.userId, userId));
  }

  async updateTripMemberStatus(tripId: number, userId: number, status: string): Promise<TripMember | undefined> {
    const [updatedMember] = await db
      .update(tripMembers)
      .set({ status })
      .where(
        and(
          eq(tripMembers.tripId, tripId),
          eq(tripMembers.userId, userId)
        )
      )
      .returning();
    
    return updatedMember || undefined;
  }

  async updateTripMemberAdminStatus(tripId: number, userId: number, isAdmin: boolean): Promise<TripMember | undefined> {
    const [updatedMember] = await db
      .update(tripMembers)
      .set({ isAdmin })
      .where(
        and(
          eq(tripMembers.tripId, tripId),
          eq(tripMembers.userId, userId)
        )
      )
      .returning();
    
    return updatedMember || undefined;
  }

  async removeTripMember(tripId: number, userId: number): Promise<boolean> {
    const result = await db
      .delete(tripMembers)
      .where(
        and(
          eq(tripMembers.tripId, tripId),
          eq(tripMembers.userId, userId)
        )
      );
    
    return result.rowCount ? result.rowCount > 0 : false;
  }

  async createActivity(activity: InsertActivity): Promise<Activity> {
    // Ensure date is properly handled as a timestamp
    const activityData = {
      ...activity,
      date: activity.date instanceof Date ? activity.date : new Date(activity.date)
    };
    
    const [newActivity] = await db
      .insert(activities)
      .values(activityData)
      .returning();
    
    return newActivity;
  }

  async getActivitiesByTrip(tripId: number): Promise<Activity[]> {
    return db
      .select()
      .from(activities)
      .where(eq(activities.tripId, tripId))
      .orderBy(activities.date);
  }

  async getActivity(id: number): Promise<Activity | undefined> {
    const [activity] = await db
      .select()
      .from(activities)
      .where(eq(activities.id, id));
    
    return activity || undefined;
  }

  async updateActivity(id: number, activityUpdate: Partial<InsertActivity>): Promise<Activity | undefined> {
    const [updatedActivity] = await db
      .update(activities)
      .set(activityUpdate)
      .where(eq(activities.id, id))
      .returning();
    
    return updatedActivity || undefined;
  }

  async deleteActivity(id: number): Promise<boolean> {
    const result = await db
      .delete(activities)
      .where(eq(activities.id, id));
    
    return result.rowCount ? result.rowCount > 0 : false;
  }

  async createActivityRSVP(rsvp: InsertActivityRSVP): Promise<ActivityRSVP> {
    try {
      const [newRsvp] = await db
        .insert(activityRsvp)
        .values(rsvp)
        .returning();
      
      return newRsvp;
    } catch (error) {
      // Check if the RSVP already exists
      const [existingRsvp] = await db
        .select()
        .from(activityRsvp)
        .where(
          and(
            eq(activityRsvp.activityId, rsvp.activityId),
            eq(activityRsvp.userId, rsvp.userId)
          )
        );
      
      if (existingRsvp) return existingRsvp;
      throw error;
    }
  }

  async getActivityRSVPs(activityId: number): Promise<ActivityRSVP[]> {
    return db
      .select()
      .from(activityRsvp)
      .where(eq(activityRsvp.activityId, activityId));
  }

  async updateActivityRSVP(activityId: number, userId: number, status: string): Promise<ActivityRSVP | undefined> {
    const [updatedRsvp] = await db
      .update(activityRsvp)
      .set({ status })
      .where(
        and(
          eq(activityRsvp.activityId, activityId),
          eq(activityRsvp.userId, userId)
        )
      )
      .returning();
    
    return updatedRsvp || undefined;
  }

  async createMessage(message: InsertMessage): Promise<Message> {
    const [newMessage] = await db
      .insert(messages)
      .values({
        ...message,
        timestamp: new Date()
      })
      .returning();
    
    return newMessage;
  }

  async getMessagesByTrip(tripId: number): Promise<Message[]> {
    const results = await db
      .select()
      .from(messages)
      .where(eq(messages.tripId, tripId))
      .orderBy(messages.timestamp);
    
    return results;
  }

  async createSurveyQuestion(question: InsertSurveyQuestion): Promise<SurveyQuestion> {
    const [newQuestion] = await db
      .insert(surveyQuestions)
      .values(question)
      .returning();
    
    return newQuestion;
  }

  async getSurveyQuestionsByTrip(tripId: number): Promise<SurveyQuestion[]> {
    return db
      .select()
      .from(surveyQuestions)
      .where(eq(surveyQuestions.tripId, tripId));
  }

  async createSurveyResponse(response: InsertSurveyResponse): Promise<SurveyResponse> {
    const [newResponse] = await db
      .insert(surveyResponses)
      .values(response)
      .returning();
    
    return newResponse;
  }

  async getSurveyResponses(questionId: number): Promise<SurveyResponse[]> {
    return db
      .select()
      .from(surveyResponses)
      .where(eq(surveyResponses.questionId, questionId));
  }

  // Invitation methods
  async createInvitationLink(invitation: InsertInvitationLink): Promise<InvitationLink> {
    const [link] = await db
      .insert(invitationLinks)
      .values(invitation)
      .returning();
    
    return link;
  }

  async getInvitationLink(token: string): Promise<InvitationLink | undefined> {
    const [link] = await db
      .select()
      .from(invitationLinks)
      .where(eq(invitationLinks.token, token));
    
    return link || undefined;
  }

  async getInvitationLinksByTrip(tripId: number): Promise<InvitationLink[]> {
    return db
      .select()
      .from(invitationLinks)
      .where(
        and(
          eq(invitationLinks.tripId, tripId),
          eq(invitationLinks.isActive, true)
        )
      );
  }

  async deactivateInvitationLink(id: number): Promise<boolean> {
    const [link] = await db
      .update(invitationLinks)
      .set({ isActive: false })
      .where(eq(invitationLinks.id, id))
      .returning();
    
    return !!link;
  }
}

export const storage = new DatabaseStorage();