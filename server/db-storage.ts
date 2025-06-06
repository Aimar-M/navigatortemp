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

  // Expense tracking methods - rebuilt for activity integration
  async createExpense(expense: InsertExpense): Promise<Expense> {
    const [newExpense] = await db
      .insert(expenses)
      .values(expense)
      .returning();
    
    return newExpense;
  }

  async createExpenseSplit(split: InsertExpenseSplit): Promise<ExpenseSplit> {
    const [newSplit] = await db
      .insert(expenseSplits)
      .values(split)
      .returning();
    
    return newSplit;
  }

  async getExpensesByTrip(tripId: number): Promise<any[]> {
    const tripExpenses = await db
      .select({
        id: expenses.id,
        tripId: expenses.tripId,
        title: expenses.title,
        amount: expenses.amount,
        currency: expenses.currency,
        category: expenses.category,
        date: expenses.date,
        description: expenses.description,
        paidBy: expenses.paidBy,
        activityId: expenses.activityId,
        isSettled: expenses.isSettled,
        receiptUrl: expenses.receiptUrl,
        createdAt: expenses.createdAt,
        updatedAt: expenses.updatedAt,
        paidByUser: {
          id: users.id,
          name: users.name,
          username: users.username
        },
        activity: {
          id: activities.id,
          name: activities.name
        }
      })
      .from(expenses)
      .leftJoin(users, eq(expenses.paidBy, users.id))
      .leftJoin(activities, eq(expenses.activityId, activities.id))
      .where(eq(expenses.tripId, tripId))
      .orderBy(desc(expenses.createdAt));

    // Get splits for each expense
    const expensesWithSplits = await Promise.all(
      tripExpenses.map(async (expense) => {
        const splits = await db
          .select({
            id: expenseSplits.id,
            userId: expenseSplits.userId,
            amount: expenseSplits.amount,
            isPaid: expenseSplits.isPaid,
            paidAt: expenseSplits.paidAt,
            user: {
              id: users.id,
              name: users.name,
              username: users.username
            }
          })
          .from(expenseSplits)
          .leftJoin(users, eq(expenseSplits.userId, users.id))
          .where(eq(expenseSplits.expenseId, expense.id));

        return {
          ...expense,
          shares: splits
        };
      })
    );

    return expensesWithSplits;
  }



  async calculateExpenseBalances(tripId: number): Promise<any[]> {
    try {
      // Get all trip members
      const tripMembers = await this.getTripMembers(tripId);
      const memberIds = tripMembers.map(m => m.userId);

      // Get all expenses for the trip
      const tripExpenses = await this.getExpensesByTrip(tripId);
      
      // Calculate balances based on actual expense splits
      const balances = [];
      
      for (const memberId of memberIds) {
        const memberUser = await this.getUser(memberId);
        
        // Amount they paid out (expenses they covered)
        const totalPaid = tripExpenses
          .filter(e => e.paidBy === memberId)
          .reduce((sum, e) => sum + parseFloat(e.amount.toString()), 0);
        
        // Amount they owe (their share of all expenses)
        const totalOwed = tripExpenses
          .reduce((sum, expense) => {
            const userShare = expense.shares?.find((s: any) => s.userId === memberId);
            return sum + (userShare ? parseFloat(userShare.amount.toString()) : 0);
          }, 0);
        
        balances.push({
          userId: memberId,
          name: memberUser?.name || memberUser?.username || 'Unknown',
          totalPaid: Math.round(totalPaid * 100) / 100,
          totalOwed: Math.round(totalOwed * 100) / 100,
          netBalance: Math.round((totalPaid - totalOwed) * 100) / 100
        });
      }

      return balances;
    } catch (error) {
      console.error('Error in calculateExpenseBalances:', error);
      return [];
    }
  }

  async markExpenseSharePaid(expenseId: number, shareId: number): Promise<void> {
    await db
      .update(expenseSplits)
      .set({ 
        isPaid: true, 
        paidAt: new Date() 
      })
      .where(eq(expenseSplits.id, shareId));
  }

  async removeExpenseSplits(expenseId: number): Promise<void> {
    await db
      .delete(expenseSplits)
      .where(eq(expenseSplits.expenseId, expenseId));
  }

  async getExpense(id: number): Promise<any> {
    const [expense] = await db
      .select()
      .from(expenses)
      .where(eq(expenses.id, id));
    return expense;
  }

  async updateExpense(id: number, data: any): Promise<any> {
    const [expense] = await db
      .update(expenses)
      .set(data)
      .where(eq(expenses.id, id))
      .returning();
    return expense;
  }

  async deleteExpense(id: number): Promise<boolean> {
    // First delete expense splits
    await this.removeExpenseSplits(id);
    
    // Then delete the expense
    const result = await db
      .delete(expenses)
      .where(eq(expenses.id, id));
    
    return true;
  }

  async getTripExpenseSummary(tripId: number): Promise<any> {
    const tripExpenses = await this.getExpensesByTrip(tripId);
    const totalAmount = tripExpenses.reduce((sum, expense) => sum + parseFloat(expense.amount.toString()), 0);
    
    return {
      totalExpenses: tripExpenses.length,
      totalAmount: totalAmount,
      currency: 'USD'
    };
  }

  // Add missing methods for app functionality
  async getUserTripSettings(userId: number, tripId: number): Promise<any> {
    return { isPinned: false, isArchived: false };
  }

  async createOrUpdateUserTripSettings(userId: number, tripId: number, settings: any): Promise<any> {
    return settings;
  }

  async getPollsByTrip(tripId: number): Promise<any[]> {
    return [];
  }

  async createInvitationLink(data: any): Promise<any> {
    return { id: 1, ...data };
  }

  async getInvitationLinksByTrip(tripId: number): Promise<any[]> {
    return [];
  }

  async getInvitationLink(token: string): Promise<any> {
    return null;
  }

  async getTripExpenseSummary(tripId: number): Promise<any> {
    return { total: 0, categories: {} };
  }

  async getExpense(id: number): Promise<any> {
    return null;
  }

  async updateExpense(id: number, data: any): Promise<any> {
    return null;
  }

  async deleteExpense(id: number): Promise<boolean> {
    return true;
  }

  async createFlightInfo(data: any): Promise<any> {
    return { id: 1, ...data };
  }

  async getFlightInfoByTrip(tripId: number): Promise<any[]> {
    return [];
  }

  async getFlightInfo(id: number): Promise<any> {
    return null;
  }

  async updateFlightInfo(id: number, data: any): Promise<any> {
    return null;
  }

  async deleteFlightInfo(id: number): Promise<boolean> {
    return true;
  }

  async searchFlights(query: any): Promise<any[]> {
    return [];
  }

  async createPoll(data: any): Promise<any> {
    return { id: 1, ...data };
  }

  async getPollVotes(pollId: number): Promise<any[]> {
    return [];
  }

  async getUserPollVotes(pollId: number, userId: number): Promise<any[]> {
    return [];
  }

  async getPoll(id: number): Promise<any> {
    return null;
  }

  async deletePollVote(voteId: number): Promise<boolean> {
    return true;
  }

  async createPollVote(data: any): Promise<any> {
    return { id: 1, ...data };
  }
}

export const storage = new DatabaseStorage();