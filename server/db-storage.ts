import { db } from "./db";
import { 
  User, InsertUser, Trip, InsertTrip, TripMember, InsertTripMember,
  Activity, InsertActivity, ActivityRSVP, InsertActivityRSVP,
  Message, InsertMessage, SurveyQuestion, InsertSurveyQuestion,
  SurveyResponse, InsertSurveyResponse, Expense, InsertExpense,
  ExpenseSplit, InsertExpenseSplit, Settlement, InsertSettlement,
  InvitationLink, InsertInvitationLink,
  users, trips, tripMembers, activities, activityRsvp, 
  messages, surveyQuestions, surveyResponses, expenses, expenseSplits, settlements,
  polls, pollVotes, invitationLinks
} from "@shared/schema";
import { eq, and, desc, sql, ilike } from "drizzle-orm";
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
    
    // Automatically add the organizer as a confirmed member with confirmed RSVP status and admin flag
    await this.addTripMember({
      tripId: trip.id,
      userId: insertTrip.organizer,
      status: "confirmed",
      rsvpStatus: "confirmed",
      isAdmin: true
    });
    
    return trip;
  }

  async getTrip(id: number): Promise<Trip | undefined> {
    const [trip] = await db.select().from(trips).where(eq(trips.id, id));
    return trip || undefined;
  }

  async getTripsByUser(userId: number): Promise<Trip[]> {
    // Get trips where user is a member
    const members = await db
      .select()
      .from(tripMembers)
      .where(eq(tripMembers.userId, userId));
    
    // Get trips where user is the organizer (in case membership wasn't added properly)
    const organizedTrips = await db
      .select()
      .from(trips)
      .where(eq(trips.organizer, userId));
    
    // Combine member trips and organized trips
    const memberTrips = members.length > 0 ? await Promise.all(
      members.map(member => 
        db.select().from(trips).where(eq(trips.id, member.tripId))
      )
    ).then(results => results.flatMap(t => t)) : [];
    
    // Merge and deduplicate trips
    const allTrips = [...memberTrips, ...organizedTrips];
    const uniqueTrips = allTrips.filter((trip, index, array) => 
      array.findIndex(t => t.id === trip.id) === index
    );
    
    return uniqueTrips;
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

  async updateTripMemberRSVPStatus(tripId: number, userId: number, rsvpStatus: string): Promise<TripMember | undefined> {
    // Get trip to check if down payment is required
    const trip = await this.getTrip(tripId);
    if (!trip) {
      throw new Error('Trip not found');
    }

    // Determine what to update
    const updateData: any = { 
      rsvpStatus,
      rsvpDate: new Date()
    };

    // If confirming RSVP and no down payment required, automatically confirm member status
    if (rsvpStatus === 'confirmed' && !trip.requiresDownPayment) {
      updateData.status = 'confirmed';
    }
    // If declining RSVP, set member status to declined
    else if (rsvpStatus === 'declined') {
      updateData.status = 'declined';
    }

    const [updatedMember] = await db
      .update(tripMembers)
      .set(updateData)
      .where(
        and(
          eq(tripMembers.tripId, tripId),
          eq(tripMembers.userId, userId)
        )
      )
      .returning();
    
    return updatedMember || undefined;
  }

  async updateTripMemberPaymentInfo(
    tripId: number, 
    userId: number, 
    paymentData: {
      paymentMethod?: string;
      paymentStatus?: string;
      paymentAmount?: string;
      paymentSubmittedAt?: Date;
      paymentConfirmedAt?: Date;
    }
  ): Promise<TripMember | undefined> {
    const [updatedMember] = await db
      .update(tripMembers)
      .set(paymentData)
      .where(
        and(
          eq(tripMembers.tripId, tripId),
          eq(tripMembers.userId, userId)
        )
      )
      .returning();
    
    return updatedMember || undefined;
  }

  async getTripMemberWithPaymentInfo(tripId: number, userId: number): Promise<TripMember | undefined> {
    const [member] = await db
      .select()
      .from(tripMembers)
      .where(
        and(
          eq(tripMembers.tripId, tripId),
          eq(tripMembers.userId, userId)
        )
      );
    
    return member || undefined;
  }

  async analyzeMemberRemovalEligibility(tripId: number, userId: number): Promise<{
    canRemove: boolean;
    reason?: string;
    balance: number;
    manualExpenseBalance: number;
    prepaidActivityBalance: number;
    prepaidActivitiesOwed: any[];
    suggestions?: string[];
  }> {
    // Get trip to check removal logic version
    const trip = await this.getTrip(tripId);
    if (!trip) {
      throw new Error('Trip not found');
    }

    // For legacy trips, use simple balance check
    if ((trip.removalLogicVersion || 0) < 2) {
      const balances = await this.calculateExpenseBalances(tripId);
      const userBalance = balances.find(b => b.userId === userId);
      const balance = userBalance?.netBalance || 0;
      
      return {
        canRemove: Math.abs(balance) < 0.01,
        reason: Math.abs(balance) >= 0.01 ? "User has unsettled expenses" : undefined,
        balance,
        manualExpenseBalance: balance,
        prepaidActivityBalance: 0,
        prepaidActivitiesOwed: []
      };
    }

    // Enhanced logic for version 2+
    const balances = await this.calculateExpenseBalances(tripId);
    const userBalance = balances.find(b => b.userId === userId);
    const totalBalance = userBalance?.netBalance || 0;

    // Get all expenses involving this user
    const userExpenses = await db
      .select()
      .from(expenses)
      .where(
        and(
          eq(expenses.tripId, tripId),
          eq(expenses.paidBy, userId)
        )
      );

    // Get prepaid activities created by this user
    const prepaidActivities = await db
      .select({
        id: activities.id,
        name: activities.name,
        cost: activities.cost,
        paymentType: activities.paymentType
      })
      .from(activities)
      .where(
        and(
          eq(activities.tripId, tripId),
          eq(activities.createdBy, userId),
          eq(activities.paymentType, 'prepaid')
        )
      );

    // Calculate balance from prepaid activities this user organized
    let prepaidActivityBalance = 0;
    const prepaidActivitiesOwed = [];
    
    for (const activity of prepaidActivities) {
      // Find expenses auto-created for this activity
      const activityExpenses = userExpenses.filter(e => e.activityId === activity.id);
      
      if (activityExpenses.length > 0) {
        const activityExpenseAmount = activityExpenses.reduce((sum, e) => 
          sum + parseFloat(e.amount.toString()), 0
        );
        
        // Get splits for these expenses to calculate what others owe
        const expenseIds = activityExpenses.map(e => e.id);
        const splits = await db
          .select()
          .from(expenseSplits)
          .where(eq(expenseSplits.expenseId, activityExpenses[0].id));
        
        const amountOwedByOthers = splits
          .filter(split => split.userId !== userId)
          .reduce((sum, split) => sum + parseFloat(split.amount.toString()), 0);
        
        if (amountOwedByOthers > 0.01) {
          prepaidActivityBalance += amountOwedByOthers;
          prepaidActivitiesOwed.push({
            activityId: activity.id,
            activityName: activity.name,
            amountOwed: amountOwedByOthers
          });
        }
      }
    }

    const manualExpenseBalance = totalBalance - prepaidActivityBalance;

    // Determine removal eligibility
    let canRemove = true;
    let reason = undefined;
    const suggestions = [];

    if (prepaidActivityBalance > 0.01) {
      canRemove = false;
      reason = `User ${userBalance?.name || 'Unknown'} is owed money for prepaid activities they organized. Please cancel or reassign those activities before removing this user.`;
      suggestions.push('Reassign organizer to another trip member');
      suggestions.push('Cancel the prepaid activities');
    } else if (Math.abs(manualExpenseBalance) > 0.01) {
      canRemove = false;
      reason = `User ${userBalance?.name || 'Unknown'} has unsettled expenses. Please settle up before removing them.`;
      suggestions.push('Use the settlement workflow to clear outstanding balances');
    }

    return {
      canRemove,
      reason,
      balance: totalBalance,
      manualExpenseBalance,
      prepaidActivityBalance,
      prepaidActivitiesOwed,
      suggestions
    };
  }

  async removeTripMember(tripId: number, userId: number): Promise<boolean> {
    // Check removal eligibility first
    const eligibility = await this.analyzeMemberRemovalEligibility(tripId, userId);
    if (!eligibility.canRemove) {
      throw new Error(eligibility.reason || 'User cannot be removed');
    }

    // Get trip to check removal logic version
    const trip = await this.getTrip(tripId);
    if (!trip) {
      throw new Error('Trip not found');
    }

    // For version 2+, remove prepaid activities created by the user
    if ((trip.removalLogicVersion || 0) >= 2) {
      await this.removePrepaidActivitiesCreatedByUser(tripId, userId);
    }

    // Remove the user from trip members
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

  private async removePrepaidActivitiesCreatedByUser(tripId: number, userId: number): Promise<void> {
    // Get prepaid activities created by this user
    const prepaidActivities = await db
      .select()
      .from(activities)
      .where(
        and(
          eq(activities.tripId, tripId),
          eq(activities.createdBy, userId),
          eq(activities.paymentType, 'prepaid')
        )
      );

    for (const activity of prepaidActivities) {
      // Delete related expenses
      await db
        .delete(expenses)
        .where(eq(expenses.activityId, activity.id));
      
      // Delete activity RSVPs
      await db
        .delete(activityRsvp)
        .where(eq(activityRsvp.activityId, activity.id));
      
      // Delete the activity
      await db
        .delete(activities)
        .where(eq(activities.id, activity.id));
    }

    // Update free/included activities to show they were created by a removed user
    await db
      .update(activities)
      .set({ 
        createdBy: null,
        description: sql`COALESCE(${activities.description}, '') || CASE WHEN COALESCE(${activities.description}, '') = '' THEN 'Created by a removed user' ELSE ' (Created by a removed user)' END`
      })
      .where(
        and(
          eq(activities.tripId, tripId),
          eq(activities.createdBy, userId)
        )
      );
  }

  async createActivity(activity: InsertActivity): Promise<Activity> {
    // Ensure dates are properly handled as timestamps
    const activityData = {
      ...activity,
      date: activity.date instanceof Date ? activity.date : new Date(activity.date),
      checkInDate: activity.checkInDate ? (activity.checkInDate instanceof Date ? activity.checkInDate : new Date(activity.checkInDate)) : null,
      checkOutDate: activity.checkOutDate ? (activity.checkOutDate instanceof Date ? activity.checkOutDate : new Date(activity.checkOutDate)) : null
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

  async transferActivityOwnership(activityId: number, newOwnerId: number): Promise<Activity | undefined> {
    // Get the current activity to find the old owner
    const currentActivity = await this.getActivity(activityId);
    if (!currentActivity) {
      throw new Error('Activity not found');
    }
    
    const oldOwnerId = currentActivity.createdBy;
    
    // Update the activity ownership
    const [updatedActivity] = await db
      .update(activities)
      .set({ createdBy: newOwnerId })
      .where(eq(activities.id, activityId))
      .returning();
    
    if (!updatedActivity) {
      throw new Error('Failed to update activity ownership');
    }
    
    // Update any associated expenses to reflect the new owner
    // First, update expenses that have direct activityId reference
    await db
      .update(expenses)
      .set({ paidBy: newOwnerId })
      .where(eq(expenses.activityId, activityId));
    
    // Also update expenses that were created for this activity based on title pattern
    const titlePattern = `Activity: ${updatedActivity.name}%`;
    await db
      .update(expenses)
      .set({ paidBy: newOwnerId })
      .where(sql`trip_id = ${updatedActivity.tripId} AND paid_by = ${oldOwnerId} AND title ILIKE ${titlePattern}`);
    
    // Remove the old owner from the activity's RSVP list since they're no longer participating
    await db.execute(sql`DELETE FROM activity_rsvp WHERE activity_id = ${activityId} AND user_id = ${oldOwnerId}`);
    
    // Update expense splits to remove the old owner and recalculate amounts
    // Find all expenses related to this activity
    const activityExpenses = await db
      .select()
      .from(expenses)
      .where(and(
        eq(expenses.activityId, activityId),
        eq(expenses.tripId, updatedActivity.tripId)
      ));
    
    for (const expense of activityExpenses) {
      // Get current participants (who are marked as "going" after RSVP updates above)
      const currentRSVPs = await db
        .select()
        .from(activityRsvp)
        .where(and(
          eq(activityRsvp.activityId, activityId),
          eq(activityRsvp.status, 'going')
        ));
      
      const participantIds = currentRSVPs.map(rsvp => rsvp.userId);
      
      // Always recalculate splits for activity expenses to ensure only current participants are included
      if (participantIds.length > 0) {
        // Remove all existing splits and recreate with current participants only
        await this.removeExpenseSplits(expense.id);
        
        const costPerPerson = parseFloat(expense.amount.toString()) / participantIds.length;
        
        // Create new splits for current participants only
        for (const userId of participantIds) {
          await this.createExpenseSplit({
            expenseId: expense.id,
            userId: userId,
            amount: costPerPerson.toFixed(2)
          });
        }
      }
    }
    
    // Ensure the new owner has an RSVP entry marked as "going" if they don't already
    const existingRSVP = await db.execute(sql`SELECT * FROM activity_rsvp WHERE activity_id = ${activityId} AND user_id = ${newOwnerId} LIMIT 1`);
    
    if (existingRSVP.rows.length === 0) {
      // Create new RSVP for the new owner
      await db.execute(sql`INSERT INTO activity_rsvp (activity_id, user_id, status) VALUES (${activityId}, ${newOwnerId}, 'going')`);
    } else {
      // Update existing RSVP to "going"
      await db.execute(sql`UPDATE activity_rsvp SET status = 'going' WHERE activity_id = ${activityId} AND user_id = ${newOwnerId}`);
    }
    
    return updatedActivity;
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
          title: `Payment: ${payer?.name || payer?.username || 'Unknown'} → ${payee?.name || payee?.username || 'Unknown'}`,
          amount: parseFloat(settlement.amount),
          category: 'settlement',
          date: settlement.confirmedAt?.toISOString() || new Date().toISOString(),
          description: settlement.notes || `${settlement.paymentMethod ? settlement.paymentMethod.charAt(0).toUpperCase() + settlement.paymentMethod.slice(1) : 'Cash'} payment settlement`,
          paidBy: settlement.payerId,
          paidByUser: {
            id: payer?.id,
            name: payer?.name || payer?.username || 'Unknown',
            username: payer?.username
          },
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
      
      // Get all unique user IDs involved in expenses (both current members and removed users)
      const paidBySet = new Set<number>();
      realExpenses.forEach(e => paidBySet.add(e.paidBy));
      const paidByUsers = Array.from(paidBySet);
      
      const splitSet = new Set<number>();
      relevantSplits.forEach(s => splitSet.add(s.userId));
      const splitUsers = Array.from(splitSet);
      
      const allUsersSet = new Set<number>();
      memberIds.forEach(id => allUsersSet.add(id));
      paidByUsers.forEach(id => allUsersSet.add(id));
      splitUsers.forEach(id => allUsersSet.add(id));
      const allInvolvedUsers = Array.from(allUsersSet);
      
      // Calculate balances for all involved users (including removed ones)
      const balances = [];
      
      for (const userId of allInvolvedUsers) {
        const memberUser = await this.getUser(userId);
        const isCurrentMember = memberIds.includes(userId);
        
        // Amount they paid out (only real expenses they covered)
        const totalPaid = realExpenses
          .filter(e => e.paidBy === userId)
          .reduce((sum, e) => sum + parseFloat(e.amount.toString()), 0);
        
        // Amount they owe (their share of all real expenses)
        const totalOwed = relevantSplits
          .filter(split => split.userId === userId)
          .reduce((sum, split) => sum + parseFloat(split.amount.toString()), 0);
        
        const netBalance = Math.round((totalPaid - totalOwed) * 100) / 100;
        console.log(`${memberUser?.name}: paid ${totalPaid}, owes ${totalOwed}, net ${netBalance}`);
        
        // For removed users, only include them if they have outstanding financial obligations
        if (!isCurrentMember && Math.abs(netBalance) < 0.01) {
          console.log(`Skipping removed user ${memberUser?.name} with zero balance`);
          continue; // Skip removed users with no meaningful financial involvement
        }

        balances.push({
          userId: userId,
          name: memberUser?.name || memberUser?.username || 'Unknown',
          totalPaid: Math.round(totalPaid * 100) / 100,
          totalOwed: Math.round(totalOwed * 100) / 100,
          netBalance: netBalance,
          isCurrentMember: isCurrentMember,
          isLegacyRemoved: memberUser?.legacyRemoved || false
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

  async getExpenseSplits(expenseId: number): Promise<any[]> {
    return await db.select().from(expenseSplits).where(eq(expenseSplits.expenseId, expenseId));
  }

  async removeUserFromExpenseSplit(expenseId: number, userId: number): Promise<void> {
    await db.delete(expenseSplits)
      .where(and(eq(expenseSplits.expenseId, expenseId), eq(expenseSplits.userId, userId)));
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
    return await db
      .select()
      .from(polls)
      .where(eq(polls.tripId, tripId))
      .orderBy(desc(polls.createdAt));
  }

  async createInvitationLink(invitation: InsertInvitationLink): Promise<InvitationLink> {
    const [link] = await db
      .insert(invitationLinks)
      .values(invitation)
      .returning();
    
    return link;
  }

  async getInvitationLinksByTrip(tripId: number): Promise<InvitationLink[]> {
    return await db
      .select()
      .from(invitationLinks)
      .where(
        and(
          eq(invitationLinks.tripId, tripId),
          eq(invitationLinks.isActive, true)
        )
      );
  }

  async getInvitationLink(token: string): Promise<InvitationLink | undefined> {
    const [link] = await db
      .select()
      .from(invitationLinks)
      .where(eq(invitationLinks.token, token));
    
    return link || undefined;
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
    const [newPoll] = await db
      .insert(polls)
      .values(data)
      .returning();
    return newPoll;
  }

  async getPollVotes(pollId: number): Promise<any[]> {
    return await db
      .select()
      .from(pollVotes)
      .where(eq(pollVotes.pollId, pollId));
  }

  async getUserPollVotes(pollId: number, userId: number): Promise<any[]> {
    return await db
      .select()
      .from(pollVotes)
      .where(and(eq(pollVotes.pollId, pollId), eq(pollVotes.userId, userId)));
  }

  async getPoll(id: number): Promise<any> {
    const [poll] = await db.select().from(polls).where(eq(polls.id, id));
    return poll || null;
  }

  async deletePollVote(voteId: number): Promise<boolean> {
    await db.delete(pollVotes).where(eq(pollVotes.id, voteId));
    return true;
  }

  async createPollVote(data: any): Promise<any> {
    const [newVote] = await db
      .insert(pollVotes)
      .values(data)
      .returning();
    return newVote;
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