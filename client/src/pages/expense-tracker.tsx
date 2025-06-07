import { useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { DollarSign, Receipt, Users, Activity, CheckCircle, XCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";

interface ExpenseSplit {
  id: number;
  userId: number;
  amount: string;
  isPaid: boolean;
  paidAt?: string;
  user: {
    id: number;
    name: string;
    username: string;
  };
}

interface Expense {
  id: number;
  tripId: number;
  title: string;
  amount: string;
  currency: string;
  category: string;
  date: string;
  description?: string;
  paidBy: number;
  activityId?: number;
  isSettled: boolean;
  receiptUrl?: string;
  createdAt: string;
  updatedAt: string;
  paidByUser: {
    id: number;
    name: string;
    username: string;
  };
  activity?: {
    id: number;
    name: string;
  };
  splits: ExpenseSplit[];
}

interface ExpenseBalance {
  userId: number;
  username: string;
  name: string;
  owes: number;
  owed: number;
  net: number;
}

export default function ExpenseTracker() {
  const { id: tripId } = useParams();
  const { toast } = useToast();

  const { data: expenses, isLoading: expensesLoading } = useQuery<Expense[]>({
    queryKey: [`/api/trips/${tripId}/expenses`],
  });

  const { data: balances, isLoading: balancesLoading } = useQuery<ExpenseBalance[]>({
    queryKey: [`/api/trips/${tripId}/expenses/balances`],
  });

  const { data: currentUser } = useQuery<{ id: number; name: string; email: string }>({
    queryKey: ["/api/auth/me"],
  });

  // TODO: Mark Paid functionality removed - was non-functional
  // Settlement tracking still works through balance calculations

  if (expensesLoading || balancesLoading) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  const formatCurrency = (amount: string) => {
    return `$${parseFloat(amount).toFixed(2)}`;
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'activities':
        return <Activity className="h-4 w-4" />;
      case 'food':
        return <Receipt className="h-4 w-4" />;
      case 'transportation':
        return <DollarSign className="h-4 w-4" />;
      default:
        return <Receipt className="h-4 w-4" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'activities':
        return 'bg-purple-100 text-purple-800';
      case 'food':
        return 'bg-orange-100 text-orange-800';
      case 'transportation':
        return 'bg-blue-100 text-blue-800';
      case 'accommodation':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-6xl">
      <div className="flex items-center gap-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Expense Tracker</h1>
      </div>

      {/* Balance Summary */}
      {balances && balances.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Trip Balance Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {balances.map((balance) => (
                <div key={balance.userId} className="p-4 border rounded-lg">
                  <div className="flex items-center gap-3 mb-2">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>
                        {balance.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-medium">{balance.name}</span>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Paid out:</span>
                      <span className="font-medium">{formatCurrency(balance.owed.toString())}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Owes:</span>
                      <span className="font-medium">{formatCurrency(balance.owes.toString())}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between font-semibold">
                      <span>Net:</span>
                      <span className={balance.net >= 0 ? "text-green-600" : "text-red-600"}>
                        {balance.net >= 0 ? "+" : ""}{formatCurrency(balance.net.toString())}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Expenses List */}
      <div className="space-y-4">
        {expenses && expenses.length > 0 ? (
          expenses.map((expense) => (
            <Card key={expense.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {getCategoryIcon(expense.category)}
                      {expense.title}
                      {expense.activity && (
                        <Badge variant="outline" className="ml-2">
                          Activity: {expense.activity.name}
                        </Badge>
                      )}
                    </CardTitle>
                    <p className="text-sm text-gray-500 mt-1">
                      Paid by {expense.paidByUser.name} • {new Date(expense.date).toLocaleDateString()}
                    </p>
                    {expense.description && (
                      <p className="text-sm text-gray-600 mt-1">{expense.description}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-bold">{formatCurrency(expense.amount)}</div>
                    <Badge className={getCategoryColor(expense.category)}>
                      {expense.category}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {expense.splits && expense.splits.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-3">Who owes what:</h4>
                    <div className="space-y-2">
                      {expense.splits.map((split) => (
                        <div key={split.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback>
                                {split.user.name.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{split.user.name}</p>
                              <p className="text-sm text-gray-500">Owes {formatCurrency(split.amount)}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {split.isPaid ? (
                              <Badge variant="outline" className="bg-green-100 text-green-800">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Paid
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="bg-red-100 text-red-800">
                                <XCircle className="h-3 w-3 mr-1" />
                                Unpaid
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="text-center py-12">
              <Receipt className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No expenses yet</h3>
              <p className="text-gray-500">
                Expenses will automatically appear here when you confirm attendance on prepaid activities.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}