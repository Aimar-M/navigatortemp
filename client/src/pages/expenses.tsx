import { useState } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import TripDetailLayout from "@/components/trip-detail-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, DollarSign, Users, Receipt, Activity, CheckCircle, XCircle, BarChart3, Grid3X3 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Cell, ReferenceLine } from "recharts";

interface ExpenseShare {
  id: number;
  userId: number;
  amount: number;
  isPaid: boolean;
  user: {
    id: number;
    name: string;
    username: string;
  };
}

interface Expense {
  id: number;
  title: string;
  amount: number;
  category: string;
  date: string;
  description?: string;
  paidBy: number;
  activityId?: number;
  paidByUser: {
    id: number;
    name: string;
    username: string;
  };
  activity?: {
    id: number;
    name: string;
  };
  shares: ExpenseShare[];
}

interface Balance {
  userId: number;
  name: string;
  totalOwed: number;
  totalPaid: number;
  netBalance: number;
}

export default function ExpensesPage() {
  const { id: tripId } = useParams();
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'cards' | 'chart'>('cards');
  
  // Form state for manual expenses
  const [newExpense, setNewExpense] = useState({
    title: "",
    amount: "",
    category: "food",
    description: "",
    paidBy: "",
    splitWith: [] as string[]
  });

  // Fetch expenses
  const { data: expenses = [], isLoading: expensesLoading } = useQuery<Expense[]>({
    queryKey: [`/api/trips/${tripId}/expenses`],
  });

  // Fetch trip members
  const { data: members = [], isLoading: membersLoading } = useQuery<any[]>({
    queryKey: [`/api/trips/${tripId}/members`],
  });

  // Fetch balances
  const { data: balances = [], isLoading: balancesLoading } = useQuery<Balance[]>({
    queryKey: [`/api/trips/${tripId}/expenses/balances`],
  });

  const { data: currentUser } = useQuery<{ id: number; name: string }>({
    queryKey: ["/api/auth/me"],
  });

  const addExpenseMutation = useMutation({
    mutationFn: async (data: typeof newExpense) => {
      console.log('Sending expense data:', {
        title: data.title,
        amount: parseFloat(data.amount),
        category: data.category,
        description: data.description,
        paidBy: parseInt(data.paidBy),
        splitWith: data.splitWith.map(id => parseInt(id))
      });
      return await apiRequest("POST", `/api/trips/${tripId}/expenses`, {
        title: data.title,
        amount: parseFloat(data.amount),
        category: data.category,
        description: data.description,
        paidBy: parseInt(data.paidBy),
        splitWith: data.splitWith.map(id => parseInt(id))
      });
    },
    onSuccess: () => {
      toast({
        title: "Expense Added",
        description: "The expense has been added successfully.",
      });
      setNewExpense({
        title: "",
        amount: "",
        category: "food",
        description: "",
        paidBy: "",
        splitWith: []
      });
      setIsAddDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: [`/api/trips/${tripId}/expenses`] });
      queryClient.invalidateQueries({ queryKey: [`/api/trips/${tripId}/expenses/balances`] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add expense. Please try again.",
        variant: "destructive"
      });
    }
  });

  const markPaidMutation = useMutation({
    mutationFn: async ({ expenseId, shareId }: { expenseId: number; shareId: number }) => {
      return await apiRequest(`/api/expenses/${expenseId}/shares/${shareId}/mark-paid`, "POST", {});
    },
    onSuccess: () => {
      toast({
        title: "Payment Recorded",
        description: "The payment has been marked as paid.",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/trips/${tripId}/expenses`] });
      queryClient.invalidateQueries({ queryKey: [`/api/trips/${tripId}/expenses/balances`] });
    }
  });

  const loading = expensesLoading || membersLoading || balancesLoading;

  if (loading) {
    return (
      <TripDetailLayout tripId={parseInt(tripId!)}>
        <div className="p-4">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="h-24 bg-gray-200 rounded"></div>
          </div>
        </div>
      </TripDetailLayout>
    );
  }

  const formatCurrency = (amount: number | string) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return `$${num.toFixed(2)}`;
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

  const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);

  return (
    <TripDetailLayout tripId={parseInt(tripId!)}>
      <div className="p-4 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Group Expenses</h1>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Expense
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Manual Expense</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={newExpense.title}
                    onChange={(e) => setNewExpense({...newExpense, title: e.target.value})}
                    placeholder="Dinner at restaurant"
                  />
                </div>
                
                <div>
                  <Label htmlFor="amount">Amount ($)</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    value={newExpense.amount}
                    onChange={(e) => setNewExpense({...newExpense, amount: e.target.value})}
                    placeholder="0.00"
                  />
                </div>
                
                <div>
                  <Label htmlFor="category">Category</Label>
                  <Select
                    value={newExpense.category}
                    onValueChange={(value) => setNewExpense({...newExpense, category: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="food">Food & Drinks</SelectItem>
                      <SelectItem value="transportation">Transportation</SelectItem>
                      <SelectItem value="accommodation">Accommodation</SelectItem>
                      <SelectItem value="activities">Activities</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="description">Description (optional)</Label>
                  <Input
                    id="description"
                    value={newExpense.description}
                    onChange={(e) => setNewExpense({...newExpense, description: e.target.value})}
                    placeholder="Additional details..."
                  />
                </div>
                
                <div>
                  <Label htmlFor="paidBy">Who paid?</Label>
                  <Select
                    value={newExpense.paidBy}
                    onValueChange={(value) => setNewExpense({...newExpense, paidBy: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select who paid" />
                    </SelectTrigger>
                    <SelectContent>
                      {members.map((member: any) => (
                        <SelectItem key={member.userId} value={member.userId.toString()}>
                          {member.user?.name || member.user?.username || member.name || member.username || 'Unknown User'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Split with:</Label>
                  <div className="mt-2 space-y-2 max-h-32 overflow-y-auto border rounded p-2">
                    {members.map((member: any) => (
                      <label key={member.userId} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={newExpense.splitWith.includes(member.userId.toString())}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setNewExpense({
                                ...newExpense,
                                splitWith: [...newExpense.splitWith, member.userId.toString()]
                              });
                            } else {
                              setNewExpense({
                                ...newExpense,
                                splitWith: newExpense.splitWith.filter(id => id !== member.userId.toString())
                              });
                            }
                          }}
                        />
                        <span>{member.user?.name || member.user?.username || member.name || member.username || 'Unknown User'}</span>
                      </label>
                    ))}
                  </div>
                  <div className="mt-2 flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setNewExpense({
                        ...newExpense,
                        splitWith: members.map((m: any) => m.userId.toString())
                      })}
                    >
                      Select All
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setNewExpense({...newExpense, splitWith: []})}
                    >
                      Clear
                    </Button>
                  </div>
                </div>
                
                <Button 
                  onClick={() => addExpenseMutation.mutate(newExpense)}
                  className="w-full"
                  disabled={!newExpense.title || !newExpense.amount || !newExpense.paidBy || newExpense.splitWith.length === 0}
                >
                  Add Expense
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>



        {/* Balance Summary */}
        {balances.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Who Owes What</CardTitle>
                <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
                  <Button
                    size="sm"
                    variant={viewMode === 'cards' ? 'default' : 'ghost'}
                    onClick={() => setViewMode('cards')}
                    className="flex items-center gap-2 h-8"
                  >
                    <Grid3X3 className="h-4 w-4" />
                    Cards
                  </Button>
                  <Button
                    size="sm"
                    variant={viewMode === 'chart' ? 'default' : 'ghost'}
                    onClick={() => setViewMode('chart')}
                    className="flex items-center gap-2 h-8"
                  >
                    <BarChart3 className="h-4 w-4" />
                    Chart
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {viewMode === 'cards' ? (
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
                          <span className="font-medium">{formatCurrency(balance.totalPaid)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Owes:</span>
                          <span className="font-medium">{formatCurrency(balance.totalOwed)}</span>
                        </div>
                        <div className="border-t pt-1 flex justify-between font-semibold">
                          <span>Net:</span>
                          <span className={balance.netBalance >= 0 ? "text-green-600" : "text-red-600"}>
                            {balance.netBalance >= 0 ? "+" : ""}{formatCurrency(balance.netBalance)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-96">
                  {/* Debug data display */}
                  {process.env.NODE_ENV === 'development' && (
                    <div className="mb-4 text-xs bg-gray-100 p-2 rounded">
                      Debug: {JSON.stringify(balances.map(b => ({ name: b.name, net: b.netBalance })))}
                    </div>
                  )}
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={balances.map(balance => ({
                        name: balance.name,
                        net: balance.netBalance
                      }))}
                      layout="horizontal"
                      margin={{ top: 20, right: 60, left: 100, bottom: 20 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        type="number" 
                        tickFormatter={(value) => formatCurrency(value)}
                        domain={(() => {
                          const values = balances.map(b => b.netBalance);
                          const maxAbs = Math.max(...values.map(v => Math.abs(v)));
                          const buffer = maxAbs * 0.1;
                          return [-maxAbs - buffer, maxAbs + buffer];
                        })()}
                      />
                      <YAxis 
                        type="category" 
                        dataKey="name" 
                        width={90}
                        tick={{ fontSize: 12 }}
                      />
                      <ReferenceLine x={0} stroke="#374151" strokeWidth={2} />
                      <Bar 
                        dataKey="net" 
                        radius={[0, 4, 4, 0]}
                        label={{
                          position: 'insideRight',
                          formatter: (value: number) => formatCurrency(Math.abs(value)),
                          fill: 'white',
                          fontSize: 12
                        }}
                      >
                        {balances.map((balance, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={balance.netBalance >= 0 ? "#16a34a" : "#dc2626"} 
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                  <div className="flex items-center justify-center gap-6 mt-4 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-green-600 rounded"></div>
                      <span>Owed money (credit)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-red-600 rounded"></div>
                      <span>Owes money (debt)</span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Expenses List */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">All Expenses</h2>
          {expenses.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <Receipt className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No expenses yet</h3>
                <p className="text-gray-500">
                  Expenses will appear here when you add them manually or when people RSVP to prepaid activities.
                </p>
              </CardContent>
            </Card>
          ) : (
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
                        Paid by {expense.paidByUser.name || expense.paidByUser.username || 'Unknown User'} • {new Date(expense.date).toLocaleDateString()}
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
                  {expense.shares && expense.shares.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-3">Split details:</h4>
                      <div className="space-y-2">
                        {expense.shares.map((share) => (
                          <div key={share.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8">
                                <AvatarFallback>
                                  {(share.user.name || share.user.username || 'U').charAt(0).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium">{share.user.name || share.user.username || 'Unknown User'}</p>
                                <p className="text-sm text-gray-500">Owes {formatCurrency(share.amount)}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {share.isPaid ? (
                                <Badge variant="outline" className="bg-green-100 text-green-800">
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Paid
                                </Badge>
                              ) : (
                                <>
                                  <Badge variant="outline" className="bg-red-100 text-red-800">
                                    <XCircle className="h-3 w-3 mr-1" />
                                    Unpaid
                                  </Badge>
                                  {(currentUser?.id === expense.paidBy || currentUser?.id === share.userId) && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => markPaidMutation.mutate({ expenseId: expense.id, shareId: share.id })}
                                      disabled={markPaidMutation.isPending}
                                    >
                                      Mark Paid
                                    </Button>
                                  )}
                                </>
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
          )}
        </div>
      </div>
    </TripDetailLayout>
  );
}