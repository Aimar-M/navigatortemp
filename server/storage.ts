import { 
  User, InsertUser, Trip, InsertTrip, TripMember, InsertTripMember,
  Activity, InsertActivity, ActivityRSVP, InsertActivityRSVP,
  Message, InsertMessage, SurveyQuestion, InsertSurveyQuestion,
  SurveyResponse, InsertSurveyResponse
} from "@shared/schema";

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Trip methods
  createTrip(trip: InsertTrip): Promise<Trip>;
  getTrip(id: number): Promise<Trip | undefined>;
  getTripsByUser(userId: number): Promise<Trip[]>;
  updateTrip(id: number, trip: Partial<InsertTrip>): Promise<Trip | undefined>;
  deleteTrip(id: number): Promise<boolean>;
  
  // Trip member methods
  addTripMember(member: InsertTripMember): Promise<TripMember>;
  getTripMembers(tripId: number): Promise<TripMember[]>;
  getTripMembershipsByUser(userId: number): Promise<TripMember[]>;
  updateTripMemberStatus(tripId: number, userId: number, status: string): Promise<TripMember | undefined>;
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
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private trips: Map<number, Trip>;
  private tripMembers: Map<string, TripMember>; // key: `${tripId}-${userId}`
  private activities: Map<number, Activity>;
  private activityRsvps: Map<string, ActivityRSVP>; // key: `${activityId}-${userId}`
  private messages: Map<number, Message>;
  private surveyQuestions: Map<number, SurveyQuestion>;
  private surveyResponses: Map<number, SurveyResponse>;
  
  private userCurrentId: number;
  private tripCurrentId: number;
  private activityCurrentId: number;
  private messageCurrentId: number;
  private surveyQuestionCurrentId: number;
  private surveyResponseCurrentId: number;
  
  constructor() {
    this.users = new Map();
    this.trips = new Map();
    this.tripMembers = new Map();
    this.activities = new Map();
    this.activityRsvps = new Map();
    this.messages = new Map();
    this.surveyQuestions = new Map();
    this.surveyResponses = new Map();
    
    this.userCurrentId = 1;
    this.tripCurrentId = 1;
    this.activityCurrentId = 1;
    this.messageCurrentId = 1;
    this.surveyQuestionCurrentId = 1;
    this.surveyResponseCurrentId = 1;
    
    // Add sample data for testing
    this.initializeData();
  }
  
  private initializeData() {
    // Call the async function and handle any errors
    this.createInitialData().catch(err => {
      console.error("Error creating initial data:", err);
    });
  }
  
  private async createInitialData() {
    // Create sample user
    const sampleUser: InsertUser = {
      username: "demo",
      password: "password123",
      email: "demo@example.com",
      name: "Demo User",
      avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=150&h=150"
    };
    const createdUser = await this.createUser(sampleUser);
    
    // Create a sample trip
    const sampleTrip: InsertTrip = {
      name: "Summer Beach Vacation",
      description: "Relaxing week at the beach with friends. We'll enjoy swimming, sunbathing, and exploring local cuisine.",
      destination: "Miami Beach",
      startDate: new Date("2025-07-15"),
      endDate: new Date("2025-07-22"),
      status: "planning",
      cover: "https://images.unsplash.com/photo-1583422409516-2895a77efded?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1200&h=600",
      organizer: 1 // The demo user's ID
    };
    const trip = await this.createTrip(sampleTrip);
    
    // Create a sample activity
    const sampleActivity: InsertActivity = {
      tripId: trip.id,
      name: "Beach Day at South Beach",
      description: "Spend the day relaxing at South Beach. Don't forget to bring sunscreen!",
      date: new Date("2025-07-16T10:00:00"),
      location: "South Beach, Miami",
      duration: 240,
      cost: "$0"
    };
    await this.createActivity(sampleActivity);
    
    // Create another sample activity
    const sampleActivity2: InsertActivity = {
      tripId: trip.id,
      name: "Dinner at Ocean Drive",
      description: "Group dinner at a restaurant on Ocean Drive",
      date: new Date("2025-07-16T19:00:00"),
      location: "Ocean Drive, Miami Beach",
      duration: 120,
      cost: "$40 per person"
    };
    await this.createActivity(sampleActivity2);
    
    // Create a sample chat message
    const sampleMessage: InsertMessage = {
      tripId: trip.id,
      userId: 1,
      content: "Hi everyone! I'm excited about our trip to Miami Beach! Don't forget to pack sunscreen and beach towels."
    };
    await this.createMessage(sampleMessage);
  }
  
  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }
  
  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username
    );
  }
  
  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email === email
    );
  }
  
  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userCurrentId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }
  
  // Trip methods
  async createTrip(insertTrip: InsertTrip): Promise<Trip> {
    const id = this.tripCurrentId++;
    const trip: Trip = { ...insertTrip, id };
    this.trips.set(id, trip);
    
    // Automatically add the organizer as a confirmed member
    await this.addTripMember({
      tripId: id,
      userId: insertTrip.organizer,
      status: "confirmed"
    });
    
    return trip;
  }
  
  async getTrip(id: number): Promise<Trip | undefined> {
    return this.trips.get(id);
  }
  
  async getTripsByUser(userId: number): Promise<Trip[]> {
    // Find all tripMembers for this user
    const memberTrips = Array.from(this.tripMembers.values())
      .filter(member => member.userId === userId);
    
    // Return corresponding trips
    return memberTrips
      .map(member => this.trips.get(member.tripId))
      .filter((trip): trip is Trip => trip !== undefined);
  }
  
  async updateTrip(id: number, tripUpdate: Partial<InsertTrip>): Promise<Trip | undefined> {
    const trip = this.trips.get(id);
    if (!trip) return undefined;
    
    const updatedTrip = { ...trip, ...tripUpdate };
    this.trips.set(id, updatedTrip);
    return updatedTrip;
  }
  
  async deleteTrip(id: number): Promise<boolean> {
    return this.trips.delete(id);
  }
  
  // Trip member methods
  async addTripMember(member: InsertTripMember): Promise<TripMember> {
    const key = `${member.tripId}-${member.userId}`;
    this.tripMembers.set(key, member);
    return member;
  }
  
  async getTripMembers(tripId: number): Promise<TripMember[]> {
    return Array.from(this.tripMembers.values())
      .filter(member => member.tripId === tripId);
  }
  
  async getTripMembershipsByUser(userId: number): Promise<TripMember[]> {
    return Array.from(this.tripMembers.values())
      .filter(member => member.userId === userId);
  }
  
  async updateTripMemberStatus(tripId: number, userId: number, status: string): Promise<TripMember | undefined> {
    const key = `${tripId}-${userId}`;
    const member = this.tripMembers.get(key);
    if (!member) return undefined;
    
    const updatedMember = { ...member, status };
    this.tripMembers.set(key, updatedMember);
    return updatedMember;
  }
  
  async removeTripMember(tripId: number, userId: number): Promise<boolean> {
    const key = `${tripId}-${userId}`;
    return this.tripMembers.delete(key);
  }
  
  // Activity methods
  async createActivity(insertActivity: InsertActivity): Promise<Activity> {
    const id = this.activityCurrentId++;
    const activity: Activity = { ...insertActivity, id };
    this.activities.set(id, activity);
    return activity;
  }
  
  async getActivitiesByTrip(tripId: number): Promise<Activity[]> {
    return Array.from(this.activities.values())
      .filter(activity => activity.tripId === tripId)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }
  
  async getActivity(id: number): Promise<Activity | undefined> {
    return this.activities.get(id);
  }
  
  async updateActivity(id: number, activityUpdate: Partial<InsertActivity>): Promise<Activity | undefined> {
    const activity = this.activities.get(id);
    if (!activity) return undefined;
    
    const updatedActivity = { ...activity, ...activityUpdate };
    this.activities.set(id, updatedActivity);
    return updatedActivity;
  }
  
  async deleteActivity(id: number): Promise<boolean> {
    return this.activities.delete(id);
  }
  
  // Activity RSVP methods
  async createActivityRSVP(rsvp: InsertActivityRSVP): Promise<ActivityRSVP> {
    const key = `${rsvp.activityId}-${rsvp.userId}`;
    this.activityRsvps.set(key, rsvp);
    return rsvp;
  }
  
  async getActivityRSVPs(activityId: number): Promise<ActivityRSVP[]> {
    return Array.from(this.activityRsvps.values())
      .filter(rsvp => rsvp.activityId === activityId);
  }
  
  async updateActivityRSVP(activityId: number, userId: number, status: string): Promise<ActivityRSVP | undefined> {
    const key = `${activityId}-${userId}`;
    const rsvp = this.activityRsvps.get(key);
    if (!rsvp) return undefined;
    
    const updatedRsvp = { ...rsvp, status };
    this.activityRsvps.set(key, updatedRsvp);
    return updatedRsvp;
  }
  
  // Message methods
  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const id = this.messageCurrentId++;
    const message: Message = { 
      ...insertMessage, 
      id, 
      timestamp: new Date() 
    };
    this.messages.set(id, message);
    return message;
  }
  
  async getMessagesByTrip(tripId: number): Promise<Message[]> {
    return Array.from(this.messages.values())
      .filter(message => message.tripId === tripId)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }
  
  // Survey methods
  async createSurveyQuestion(insertQuestion: InsertSurveyQuestion): Promise<SurveyQuestion> {
    const id = this.surveyQuestionCurrentId++;
    const question: SurveyQuestion = { ...insertQuestion, id };
    this.surveyQuestions.set(id, question);
    return question;
  }
  
  async getSurveyQuestionsByTrip(tripId: number): Promise<SurveyQuestion[]> {
    return Array.from(this.surveyQuestions.values())
      .filter(question => question.tripId === tripId);
  }
  
  async createSurveyResponse(insertResponse: InsertSurveyResponse): Promise<SurveyResponse> {
    const id = this.surveyResponseCurrentId++;
    const response: SurveyResponse = { ...insertResponse, id };
    this.surveyResponses.set(id, response);
    return response;
  }
  
  async getSurveyResponses(questionId: number): Promise<SurveyResponse[]> {
    return Array.from(this.surveyResponses.values())
      .filter(response => response.questionId === questionId);
  }
}



import { db } from "./db";
import { 
  users, trips, tripMembers, activities, activityRsvp, 
  messages, surveyQuestions, surveyResponses 
} from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";

export class DatabaseStorage implements IStorage {
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

  async removeTripMember(tripId: number, userId: number): Promise<boolean> {
    const result = await db
      .delete(tripMembers)
      .where(
        and(
          eq(tripMembers.tripId, tripId),
          eq(tripMembers.userId, userId)
        )
      );
    
    return result.rowCount > 0;
  }

  async createActivity(activity: InsertActivity): Promise<Activity> {
    const [newActivity] = await db
      .insert(activities)
      .values(activity)
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
    
    return result.rowCount > 0;
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
    return db
      .select()
      .from(messages)
      .where(eq(messages.tripId, tripId))
      .orderBy(messages.timestamp);
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
}

export const storage = new DatabaseStorage();
