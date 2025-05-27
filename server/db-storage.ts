import { db } from "./db";
import { 
  User, InsertUser, Trip, InsertTrip, TripMember, InsertTripMember,
  Activity, InsertActivity, ActivityRSVP, InsertActivityRSVP,
  Message, InsertMessage, SurveyQuestion, InsertSurveyQuestion,
  SurveyResponse, InsertSurveyResponse, Expense, InsertExpense,
  ExpenseSplit, InsertExpenseSplit,
  users, trips, tripMembers, activities, activityRsvp, 
  messages, surveyQuestions, surveyResponses, expenses, expenseSplits
} from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";
export class DatabaseStorage {
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
    const [user] = await db
      .update(users)
      .set(userUpdate)
      .where(eq(users.id, id))
      .returning();
    return user || undefined;
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
    
    return result.rowCount ? result.rowCount > 0 : false;
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

  // Expense tracking methods
  async createExpense(expense: any): Promise<any> {
    const [newExpense] = await db
      .insert(expenses)
      .values({
        tripId: expense.tripId,
        userId: expense.userId,
        title: expense.description,
        description: expense.description,
        amount: expense.amount,
        category: expense.category,
        paidBy: expense.paidBy,
        date: expense.date || new Date(),
      })
      .returning();
    
    return newExpense;
  }

  async getExpensesByTrip(tripId: number): Promise<any[]> {
    return db
      .select({
        id: expenses.id,
        tripId: expenses.tripId,
        paidBy: expenses.paidBy,
        amount: expenses.amount,
        description: expenses.title,
        category: expenses.category,
        date: expenses.date,
        payer: {
          id: users.id,
          username: users.username,
          name: users.name,
        }
      })
      .from(expenses)
      .leftJoin(users, eq(expenses.paidBy, users.id))
      .where(eq(expenses.tripId, tripId))
      .orderBy(desc(expenses.date));
  }

  async calculateExpenseBalances(tripId: number): Promise<any[]> {
    // Get all trip members
    const tripMembers = await this.getTripMembers(tripId);
    const memberIds = tripMembers.map(m => m.userId);
    
    // Get all expenses for this trip
    const tripExpenses = await this.getExpensesByTrip(tripId);
    
    // Calculate balances
    const balances = new Map();
    
    // Initialize balances for all members
    for (const member of tripMembers) {
      const memberUser = await this.getUser(member.userId);
      balances.set(member.userId, {
        userId: member.userId,
        username: memberUser?.username || 'Unknown',
        name: memberUser?.name || memberUser?.username || 'Unknown',
        owes: 0,
        owed: 0,
        net: 0,
      });
    }
    
    // Calculate what each person owes/is owed
    for (const expense of tripExpenses) {
      const amount = parseFloat(expense.amount);
      const splitAmount = amount / memberIds.length; // Equal split for now
      
      // The payer is owed money
      const payerBalance = balances.get(expense.paidBy);
      if (payerBalance) {
        payerBalance.owed += amount - splitAmount; // They get back the amount minus their share
      }
      
      // Everyone else owes their share
      for (const memberId of memberIds) {
        if (memberId !== expense.paidBy) {
          const memberBalance = balances.get(memberId);
          if (memberBalance) {
            memberBalance.owes += splitAmount;
          }
        }
      }
    }
    
    // Calculate net amounts
    for (const [userId, balance] of balances) {
      balance.net = balance.owed - balance.owes;
    }
    
    return Array.from(balances.values());
  }

  async calculateExpenseBalances(tripId: number): Promise<any[]> {
    // Get all trip members
    const tripMembers = await this.getTripMembers(tripId);
    const memberIds = tripMembers.map(m => m.userId);

    // Get all expenses for the trip
    const tripExpenses = await this.getExpensesByTrip(tripId);
    
    // Calculate balances
    const balances = [];
    
    for (const memberId of memberIds) {
      const memberUser = await this.getUser(memberId);
      
      // Amount they paid
      const paid = tripExpenses
        .filter(e => e.paidBy === memberId)
        .reduce((sum, e) => sum + parseFloat(e.amount), 0);
      
      // Their share (split equally among all members)
      const totalExpenses = tripExpenses.reduce((sum, e) => sum + parseFloat(e.amount), 0);
      const share = totalExpenses / memberIds.length;
      
      balances.push({
        userId: memberId,
        username: memberUser?.username || 'Unknown',
        name: memberUser?.name || memberUser?.username || 'Unknown',
        owes: share, // How much they should pay
        owed: paid, // How much they paid out
        net: paid - share // Positive = they get money back, Negative = they owe money
      });
    }

    return balances;
  }
}

export const storage = new DatabaseStorage();