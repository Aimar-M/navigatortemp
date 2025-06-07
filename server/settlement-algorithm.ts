interface UserBalance {
  userId: number;
  name: string;
  netBalance: number;
}

interface OptimizedTransaction {
  fromUserId: number;
  fromUserName: string;
  toUserId: number;
  toUserName: string;
  amount: number;
}

/**
 * Calculates the minimum number of transactions needed to settle all debts
 * Uses a greedy algorithm to minimize payment count by matching highest creditor with highest debtor
 */
export function calculateOptimizedSettlements(balances: UserBalance[]): OptimizedTransaction[] {
  const transactions: OptimizedTransaction[] = [];
  
  // Filter out users with zero balance and create working copies
  const workingBalances = balances
    .filter(balance => Math.abs(balance.netBalance) > 0.01) // Ignore balances under 1 cent
    .map(balance => ({ ...balance })); // Create copies to avoid mutating original data
  
  if (workingBalances.length === 0) {
    return transactions; // No settlements needed
  }

  // Continue until all balances are settled
  while (workingBalances.some(balance => Math.abs(balance.netBalance) > 0.01)) {
    // Find user who owes the most (most negative balance)
    const maxDebtor = workingBalances.reduce((max, current) => 
      current.netBalance < max.netBalance ? current : max
    );
    
    // Find user who is owed the most (most positive balance)
    const maxCreditor = workingBalances.reduce((max, current) => 
      current.netBalance > max.netBalance ? current : max
    );
    
    // If no valid debtor-creditor pair exists, break
    if (maxDebtor.netBalance >= 0 || maxCreditor.netBalance <= 0) {
      break;
    }
    
    // Calculate settlement amount (minimum of what debtor owes and creditor is owed)
    const settlementAmount = Math.min(
      Math.abs(maxDebtor.netBalance),
      maxCreditor.netBalance
    );
    
    // Round to 2 decimal places to avoid floating point precision issues
    const roundedAmount = Math.round(settlementAmount * 100) / 100;
    
    if (roundedAmount > 0.01) {
      // Create transaction
      transactions.push({
        fromUserId: maxDebtor.userId,
        fromUserName: maxDebtor.name,
        toUserId: maxCreditor.userId,
        toUserName: maxCreditor.name,
        amount: roundedAmount
      });
      
      // Update balances
      maxDebtor.netBalance += roundedAmount;
      maxCreditor.netBalance -= roundedAmount;
      
      // Round updated balances to avoid floating point precision issues
      maxDebtor.netBalance = Math.round(maxDebtor.netBalance * 100) / 100;
      maxCreditor.netBalance = Math.round(maxCreditor.netBalance * 100) / 100;
    } else {
      // Break if settlement amount is too small
      break;
    }
  }
  
  return transactions;
}

/**
 * Validates that the settlement plan balances correctly
 */
export function validateSettlementPlan(
  originalBalances: UserBalance[], 
  transactions: OptimizedTransaction[]
): boolean {
  const userBalanceMap = new Map<number, number>();
  
  // Initialize with original balances
  originalBalances.forEach(balance => {
    userBalanceMap.set(balance.userId, balance.netBalance);
  });
  
  // Apply all transactions
  transactions.forEach(transaction => {
    const fromBalance = userBalanceMap.get(transaction.fromUserId) || 0;
    const toBalance = userBalanceMap.get(transaction.toUserId) || 0;
    
    userBalanceMap.set(transaction.fromUserId, fromBalance + transaction.amount);
    userBalanceMap.set(transaction.toUserId, toBalance - transaction.amount);
  });
  
  // Check that all balances are close to zero (within 1 cent)
  const entries = Array.from(userBalanceMap.entries());
  for (const [userId, finalBalance] of entries) {
    if (Math.abs(finalBalance) > 0.01) {
      console.warn(`Settlement validation failed: User ${userId} has remaining balance of ${finalBalance}`);
      return false;
    }
  }
  
  return true;
}

/**
 * Gets settlement recommendations for a specific user
 */
export function getUserSettlementRecommendations(
  balances: UserBalance[],
  currentUserId: number
): OptimizedTransaction[] {
  const allTransactions = calculateOptimizedSettlements(balances);
  
  // Return only transactions involving the current user
  return allTransactions.filter(
    transaction => 
      transaction.fromUserId === currentUserId || 
      transaction.toUserId === currentUserId
  );
}

/**
 * Calculates settlement statistics
 */
export function getSettlementStats(transactions: OptimizedTransaction[]) {
  const totalAmount = transactions.reduce((sum, t) => sum + t.amount, 0);
  const uniqueUsers = new Set();
  
  transactions.forEach(t => {
    uniqueUsers.add(t.fromUserId);
    uniqueUsers.add(t.toUserId);
  });
  
  return {
    totalTransactions: transactions.length,
    totalAmount: Math.round(totalAmount * 100) / 100,
    usersInvolved: uniqueUsers.size,
    averageTransactionAmount: transactions.length > 0 
      ? Math.round((totalAmount / transactions.length) * 100) / 100 
      : 0
  };
}