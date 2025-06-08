import { db } from "./db";
import { 
  User, InsertUser, Trip, InsertTrip, TripMember, InsertTripMember,
  Activity, InsertActivity, ActivityRSVP, InsertActivityRSVP,
  Message, InsertMessage, SurveyQuestion, InsertSurveyQuestion,
  SurveyResponse, InsertSurveyResponse, Expense, InsertExpense,
  ExpenseSplit, InsertExpenseSplit, Settlement, InsertSettlement,
  users, trips, tripMembers, activities, activityRsvp, 
  messages, surveyQuestions, surveyResponses, expenses, expenseSplits, settlements
} from "@shared/schema";
import { eq, and, desc, sql } from "drizzle-orm";
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
    // First, delete associated expenses and their splits
    const activityExpenses = await db
      .select()
      .from(expenses)
      .where(eq(expenses.activityId, id));
    
    for (const expense of activityExpenses) {
      // Delete expense splits first
      await db
        .delete(expenseSplits)
        .where(eq(expenseSplits.expenseId, expense.id));
      
      // Then delete the expense
      await db
        .delete(expenses)
        .where(eq(expenses.id, expense.id));
    }
    
    // Delete activity RSVPs
    await db
      .delete(activityRsvp)
      .where(eq(activityRsvp.activityId, id));
    
    // Finally, delete the activity
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

    // Add confirmed settlements as settlement transactions
    const confirmedSettlements = await db
      .select()
      .from(settlements)
      .where(
        and(
          eq(settlements.tripId, tripId),
          eq(settlements.status, 'confirmed')
        )
      )
      .orderBy(desc(settlements.confirmedAt));

    // Convert settlements to expense-like format with user details
    const settlementTransactions = await Promise.all(
      confirmedSettlements.map(async (settlement) => {
        const payer = await this.getUser(settlement.payerId);
        const payee = await this.getUser(settlement.payeeId);
        
        return {
          id: `settlement-${settlement.id}`,
          title: `Payment: ${payer?.name || 'Unknown'} → ${payee?.name || 'Unknown'}`,
          amount: parseFloat(settlement.amount),
          category: 'settlement',
          date: settlement.confirmedAt?.toISOString() || new Date().toISOString(),
          description: settlement.notes || `${settlement.paymentMethod ? settlement.paymentMethod.charAt(0).toUpperCase() + settlement.paymentMethod.slice(1) : 'Cash'} payment settlement`,
          paidBy: settlement.payerId,
          paidByUser: payer,
          activityId: null,
          isSettlement: true,
          paymentMethod: settlement.paymentMethod,
          shares: []
        };
      })
    );

    // Combine expenses and settlements
    const allTransactions = [...expensesWithSplits, ...settlementTransactions];
    
    // Sort by date (newest first)
    allTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return allTransactions;
  }

  async calculateExpenseBalances(tripId: number): Promise<any[]> {
    try {
      // Get all trip members
      const tripMembers = await this.getTripMembers(tripId);
      const memberIds = tripMembers.map(m => m.userId);

      // Get only real expenses from database (excludes settlement transactions)
      const realExpenses = await db
        .select()
        .from(expenses)
        .where(eq(expenses.tripId, tripId));

      // Get all expense splits for these real expenses
      const allSplits = await db
        .select()
        .from(expenseSplits);

      // Filter splits to only those belonging to real expenses
      const relevantSplits = allSplits.filter(split => 
        realExpenses.some(expense => expense.id === split.expenseId)
      );

      console.log(`Found ${realExpenses.length} real expenses and ${relevantSplits.length} splits`);
      
      // Calculate balances based on actual expense splits
      const balances = [];
      
      for (const memberId of memberIds) {
        const memberUser = await this.getUser(memberId);
        
        // Amount they paid out (only real expenses they covered)
        const totalPaid = realExpenses
          .filter(e => e.paidBy === memberId)
          .reduce((sum, e) => sum + parseFloat(e.amount.toString()), 0);
        
        // Amount they owe (their share of all real expenses)
        const totalOwed = relevantSplits
          .filter(split => split.userId === memberId)
          .reduce((sum, split) => sum + parseFloat(split.amount.toString()), 0);
        
        const netBalance = Math.round((totalPaid - totalOwed) * 100) / 100;
        console.log(`${memberUser?.name}: paid ${totalPaid}, owes ${totalOwed}, net ${netBalance}`);
        
        balances.push({
          userId: memberId,
          name: memberUser?.name || memberUser?.username || 'Unknown',
          totalPaid: Math.round(totalPaid * 100) / 100,
          totalOwed: Math.round(totalOwed * 100) / 100,
          netBalance: netBalance
        });
      }

      // Account for confirmed settlements
      const confirmedSettlements = await db
        .select()
        .from(settlements)
        .where(
          and(
            eq(settlements.tripId, tripId),
            eq(settlements.status, 'confirmed')
          )
        );

      // Adjust balances based on confirmed settlements
      console.log(`Processing ${confirmedSettlements.length} settlements for trip ${tripId}`);
      console.log('Balances before settlements:', balances.map(b => `${b.name}: ${b.netBalance}`));
      
      for (const settlement of confirmedSettlements) {
        const payerBalance = balances.find(b => b.userId === settlement.payerId);
        const payeeBalance = balances.find(b => b.userId === settlement.payeeId);
        const settledAmount = parseFloat(settlement.amount);
        
        console.log(`Settlement: ${settlement.payerId} paid ${settledAmount} to ${settlement.payeeId}`);
        
        if (payerBalance) {
          const oldBalance = payerBalance.netBalance;
          // Payer's debt is reduced (they paid money they owed)
          // If they had negative balance (owed money), this moves them towards 0
          payerBalance.netBalance = Math.round((payerBalance.netBalance + settledAmount) * 100) / 100;
          console.log(`Payer ${payerBalance.name}: ${oldBalance} → ${payerBalance.netBalance}`);
        }

        if (payeeBalance) {
          const oldBalance = payeeBalance.netBalance;
          // Payee's credit is reduced (they received money they were owed)
          // If they had positive balance (were owed money), this moves them towards 0
          payeeBalance.netBalance = Math.round((payeeBalance.netBalance - settledAmount) * 100) / 100;
          console.log(`Payee ${payeeBalance.name}: ${oldBalance} → ${payeeBalance.netBalance}`);
        }
      }
      
      console.log('Final balances after settlements:', balances.map(b => `${b.name}: ${b.netBalance}`));

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
          username: users.username,
          email: users.email
        }
      })
      .from(expenses)
      .leftJoin(users, eq(expenses.paidBy, users.id))
      .where(eq(expenses.id, id));
    
    if (!expense) return null;

    // Get expense splits with user details
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
          username: users.username,
          email: users.email
        }
      })
      .from(expenseSplits)
      .leftJoin(users, eq(expenseSplits.userId, users.id))
      .where(eq(expenseSplits.expenseId, id));

    // Get activity details if linked
    let activity = null;
    if (expense.activityId) {
      const [activityResult] = await db
        .select()
        .from(activities)
        .where(eq(activities.id, expense.activityId));
      activity = activityResult;
    }

    return {
      ...expense,
      shares: splits,
      splits: splits,
      activity
    };
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

  // Settlement methods
  async createSettlement(settlement: InsertSettlement): Promise<Settlement> {
    const [newSettlement] = await db
      .insert(settlements)
      .values(settlement)
      .returning();
    return newSettlement;
  }

  async getSettlementsByTrip(tripId: number): Promise<Settlement[]> {
    return await db
      .select()
      .from(settlements)
      .where(eq(settlements.tripId, tripId))
      .orderBy(desc(settlements.createdAt));
  }

  async getSettlement(id: number): Promise<Settlement | undefined> {
    const [settlement] = await db.select().from(settlements).where(eq(settlements.id, id));
    return settlement || undefined;
  }

  async updateSettlement(id: number, data: Partial<Settlement>): Promise<Settlement | undefined> {
    const [updated] = await db
      .update(settlements)
      .set(data)
      .where(eq(settlements.id, id))
      .returning();
    return updated || undefined;
  }

  async confirmSettlement(settlementId: number, confirmedBy: number): Promise<Settlement | undefined> {
    const [confirmed] = await db
      .update(settlements)
      .set({
        status: 'confirmed',
        confirmedAt: new Date(),
        confirmedBy: confirmedBy,
        updatedAt: new Date()
      })
      .where(eq(settlements.id, settlementId))
      .returning();
    return confirmed || undefined;
  }

  async getPendingSettlementsForUser(userId: number): Promise<Settlement[]> {
    return await db
      .select()
      .from(settlements)
      .where(
        and(
          eq(settlements.status, 'pending'),
          eq(settlements.payeeId, userId)
        )
      )
      .orderBy(desc(settlements.createdAt));
  }
}

export const storage = new DatabaseStorage();