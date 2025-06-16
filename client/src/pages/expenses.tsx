import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
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
import { Plus, DollarSign, Users, Receipt, Activity, CheckCircle, XCircle, BarChart3, Grid3X3, HandHeart } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Cell, ReferenceLine, Tooltip, LabelList } from "recharts";
import { SettlementWorkflow } from "@/components/SettlementWorkflow";
import { OptimizedSettlementWorkflow } from "@/components/OptimizedSettlementWorkflow";

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
  id: number | string;
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
  isSettlement?: boolean;
  paymentMethod?: string;
}

interface Balance {
  userId: number;
  name: string;
  totalOwed: number;
  totalPaid: number;
  netBalance: number;
  isCurrentMember: boolean;
  isLegacyRemoved: boolean;
}

export default function ExpensesPage() {
  const { id: tripId } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'cards' | 'chart'>('cards');
  const [settlementWorkflow, setSettlementWorkflow] = useState<{
    isOpen: boolean;
    balance: { userId: number; name: string; balance: number } | null;
  }>({ isOpen: false, balance: null });
  const [optimizedSettlementOpen, setOptimizedSettlementOpen] = useState(false);
  
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

  // Check user's RSVP status  
  const { data: trip } = useQuery({
    queryKey: [`/api/trips/${tripId}`],
  });
  
  const isOrganizer = currentUser && trip && (trip as any).organizer === (currentUser as any).id;
  const currentUserMembership = members.find((member: any) => member.userId === currentUser?.id);
  const isConfirmedMember = currentUserMembership?.rsvpStatus === 'confirmed' || isOrganizer;

  // Format currency for mobile (whole numbers) vs desktop (2 decimals)
  const formatCurrency = (amount: number | string, isMobile: boolean = false) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (isNaN(num)) return '$0';
    
    if (isMobile) {
      return `$${Math.round(num)}`;
    }
    return `$${num.toFixed(2)}`;
  };

  // Format currency for charts (rounded with thousands separators)
  const formatChartCurrency = (amount: number) => {
    const rounded = Math.round(amount);
    return `$${rounded.toLocaleString()}`;
  };

  // Check if mobile viewport
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleSettleClick = () => {
    if (!currentUser) return;
    
    // Check if there are any outstanding balances
    const hasOutstandingBalances = balances.some(b => Math.abs(b.netBalance) > 0.01);
    
    if (!hasOutstandingBalances) {
      toast({
        title: "No Outstanding Balances",
        description: "All balances are settled for this trip.",
      });
      return;
    }

    // Open the optimized settlement workflow
    setOptimizedSettlementOpen(true);
  };

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

  // TODO: Mark Paid functionality removed - was non-functional
  // Settlement tracking still works through balance calculations

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
    <TripDetailLayout 
      tripId={parseInt(tripId!)}
      title="Expenses"
      description="Track and split expenses for your trip"
      isConfirmedMember={isConfirmedMember as boolean}
    >
      <div className="p-4 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <h1 className="text-2xl font-bold">Group Expenses</h1>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button className="w-full sm:w-auto" disabled={!isConfirmedMember}>
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
                      {members.filter((member: any) => member.rsvpStatus === 'confirmed').map((member: any) => (
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
                    {members.filter((member: any) => member.rsvpStatus === 'confirmed').map((member: any) => (
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
                        splitWith: members.filter((m: any) => m.rsvpStatus === 'confirmed').map((m: any) => m.userId.toString())
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
            <Button 
              variant="outline"
              onClick={handleSettleClick}
              className="flex items-center gap-2 w-full sm:w-auto"
            >
              <DollarSign className="h-4 w-4" />
              Settle Up
            </Button>
          </div>
        </div>



        {/* Balance Summary */}
        {balances.length > 0 && isConfirmedMember && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Who Owes What</CardTitle>
                <div className={`items-center gap-1 bg-gray-100 rounded-lg p-1 ${balances.length > 5 ? 'hidden sm:flex' : 'flex'}`}>
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
                  {balances
                    .filter(balance => {
                      const member = members.find(m => m.userId === balance.userId);
                      // Show current confirmed members, organizer, or removed users with financial obligations
                      return member?.rsvpStatus === 'confirmed' || 
                             (member?.userId === (trip as any)?.organizer) ||
                             (!balance.isCurrentMember && Math.abs(balance.netBalance) > 0.01);
                    })
                    .map((balance) => {
                      const member = members.find(m => m.userId === balance.userId);
                      const isRemovedUser = !balance.isCurrentMember && Math.abs(balance.netBalance) > 0.01;
                      
                      return (
                        <div key={balance.userId} className={`p-4 border rounded-lg ${isRemovedUser ? 'border-orange-200 bg-orange-50' : ''}`}>
                          <div className="flex items-center gap-3 mb-2">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className={isRemovedUser ? 'bg-orange-200 text-orange-800' : ''}>
                                {balance.name.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <span className="font-medium">{balance.name}</span>
                              {isRemovedUser && (
                                <div className="text-xs text-orange-600 font-medium">
                                  • No longer in trip
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="space-y-1 text-sm">
                            <div className="flex justify-between">
                              <span>Paid out:</span>
                              <span className="font-medium">
                                <span className="sm:hidden">{formatCurrency(balance.totalPaid, true)}</span>
                                <span className="hidden sm:inline">{formatCurrency(balance.totalPaid)}</span>
                              </span>
                            </div>
                            <div className="border-t pt-1 flex justify-between font-semibold">
                              <span>Net:</span>
                              <span className={balance.netBalance >= 0 ? "text-green-600" : "text-red-600"}>
                                {balance.netBalance >= 0 ? "+" : ""}
                                <span className="sm:hidden">{formatCurrency(balance.netBalance, true)}</span>
                                <span className="hidden sm:inline">{formatCurrency(balance.netBalance)}</span>
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              ) : (
                <div className="h-96 flex flex-col">
                  <div className="flex-1 min-h-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={balances
                          .filter(balance => {
                            const member = members.find(m => m.userId === balance.userId);
                            return member?.rsvpStatus === 'confirmed' || 
                                   (member?.userId === (trip as any)?.organizer) ||
                                   (!balance.isCurrentMember && Math.abs(balance.netBalance) > 0.01);
                          })
                          .map(balance => ({
                            name: balance.name,
                            value: balance.netBalance,
                            isRemoved: !balance.isCurrentMember && Math.abs(balance.netBalance) > 0.01
                          }))}
                        margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                      >

                        <XAxis 
                          dataKey="name" 
                          angle={-45}
                          textAnchor="end"
                          height={60}
                          tick={{ fontSize: 12 }}
                        />
                        <YAxis 
                          domain={(() => {
                            const visibleBalances = balances.filter(balance => {
                              const member = members.find(m => m.userId === balance.userId);
                              return member?.rsvpStatus === 'confirmed' || 
                                     (member?.userId === (trip as any)?.organizer) ||
                                     (!balance.isCurrentMember && Math.abs(balance.netBalance) > 0.01);
                            });
                            const values = visibleBalances.map(b => b.netBalance);
                            if (values.length === 0) return [-100, 100];
                            const maxAbs = Math.max(...values.map(v => Math.abs(v)));
                            const padding = Math.max(maxAbs * 0.2, 10);
                            return [-maxAbs - padding, maxAbs + padding];
                          })()}
                          hide
                        />
                        <Tooltip 
                          formatter={(value, name) => [formatChartCurrency(value as number), 'Balance']}
                          labelFormatter={(label) => `User: ${label}`}
                        />
                        <ReferenceLine y={0} stroke="#374151" strokeWidth={2} />
                        <Bar 
                          dataKey="value"
                          barSize={60}
                        >
                          {balances
                            .filter(balance => {
                              const member = members.find(m => m.userId === balance.userId);
                              return member?.rsvpStatus === 'confirmed' || 
                                     (member?.userId === (trip as any)?.organizer) ||
                                     (!balance.isCurrentMember && Math.abs(balance.netBalance) > 0.01);
                            })
                            .map((balance, index) => {
                              const isRemovedUser = !balance.isCurrentMember && Math.abs(balance.netBalance) > 0.01;
                              return (
                                <Cell 
                                  key={`cell-${index}`} 
                                  fill={isRemovedUser ? "#ea580c" : (balance.netBalance >= 0 ? "#16a34a" : "#dc2626")}
                                />
                              );
                            })}
                          <LabelList 
                            dataKey="value"
                            position="outside"
                            formatter={(value: number) => formatChartCurrency(Math.abs(value))}
                            fontSize={12}
                            fontWeight={600}
                            fill="#374151"
                          />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex items-center justify-center gap-6 py-3 text-sm border-t bg-gray-50">
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
              <Card 
                key={expense.id} 
                className="cursor-pointer hover:shadow-md transition-shadow duration-200"
                onClick={() => setLocation(`/trips/${tripId}/expenses/${expense.id}`)}
              >
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="flex items-center gap-2 text-base">
                        {expense.isSettlement ? (
                          <HandHeart className="h-4 w-4 text-green-600 flex-shrink-0" />
                        ) : (
                          getCategoryIcon(expense.category)
                        )}
                        <span className="truncate">
                          {expense.activity ? expense.activity.name : expense.title}
                        </span>
                      </CardTitle>
                      <p className="text-sm text-gray-500 mt-1">
                        {expense.isSettlement ? 
                          `Payment confirmed • ${new Date(expense.date).toLocaleDateString()}` :
                          `Paid by ${expense.paidByUser.name || expense.paidByUser.username || 'Unknown User'} • ${new Date(expense.date).toLocaleDateString()}`
                        }
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0 ml-4">
                      <div className={`text-lg font-bold ${expense.isSettlement ? 'text-green-600' : ''}`}>
                        {expense.isSettlement ? '+' : ''}{formatCurrency(expense.amount, isMobile)}
                      </div>
                      <Badge className={`text-xs ${expense.isSettlement ? 'bg-green-100 text-green-800' : getCategoryColor(expense.category)}`}>
                        {expense.isSettlement ? 'Settlement' : expense.category}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            ))
          )}
        </div>

        {/* Settlement Workflows */}
        {settlementWorkflow.balance && (
          <SettlementWorkflow
            tripId={parseInt(tripId!)}
            balance={settlementWorkflow.balance}
            isOpen={settlementWorkflow.isOpen}
            onClose={() => setSettlementWorkflow({ isOpen: false, balance: null })}
          />
        )}

        {/* Optimized Settlement Workflow */}
        <OptimizedSettlementWorkflow
          tripId={parseInt(tripId!)}
          currentUserId={currentUser?.id || 0}
          isOpen={optimizedSettlementOpen}
          onClose={() => setOptimizedSettlementOpen(false)}
        />
      </div>
    </TripDetailLayout>
  );
}