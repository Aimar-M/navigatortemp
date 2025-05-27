import { useState, useEffect } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import TripDetailLayout from "@/components/trip-detail-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Plus, DollarSign, Users, Receipt } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Expense {
  id: number;
  description: string;
  amount: number;
  category: string;
  paidBy: number;
  tripId: number;
  createdAt: string;
}

interface Member {
  userId: number;
  username: string;
  name?: string;
}

interface Balance {
  userId: number;
  username: string;
  name: string;
  owes: number;
  owed: number;
  net: number;
}

export default function ExpensesPage() {
  const { id: tripId } = useParams();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  
  // Form state
  const [newExpense, setNewExpense] = useState({
    description: "",
    amount: "",
    category: "food",
    paidBy: 0,
    splitWith: [] as number[]
  });

  // Use React Query for data fetching like other pages
  const { data: expenses = [], isLoading: expensesLoading } = useQuery({
    queryKey: [`/api/trips/${tripId}/expenses`],
  });

  const { data: members = [], isLoading: membersLoading } = useQuery({
    queryKey: [`/api/trips/${tripId}/members`],
  });

  const { data: balances = [], isLoading: balancesLoading } = useQuery({
    queryKey: [`/api/trips/${tripId}/expenses/balances`],
  });

  const loading = expensesLoading || membersLoading || balancesLoading;

  const addExpenseMutation = useMutation({
    mutationFn: async (data: typeof newExpense) => {
      return apiRequest("POST", `/api/trips/${tripId}/expenses`, {
        description: data.description,
        amount: parseFloat(data.amount),
        category: data.category,
        paidBy: data.paidBy,
        splitWith: data.splitWith.length > 0 ? data.splitWith : (members as any[]).map(m => m.userId)
      });
    },
    onSuccess: () => {
      toast({
        title: "Success!",
        description: "Expense added successfully"
      });
      
      // Reset form
      setNewExpense({
        description: "",
        amount: "",
        category: "food",
        paidBy: 0,
        splitWith: []
      });
      
      setIsAddDialogOpen(false);
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: [`/api/trips/${tripId}/expenses`] });
      queryClient.invalidateQueries({ queryKey: [`/api/trips/${tripId}/expenses/balances`] });
    },
    onError: (error) => {
      console.error("Error adding expense:", error);
      toast({
        title: "Error",
        description: "Failed to add expense",
        variant: "destructive"
      });
    }
  });

  const addExpense = () => {
    if (!newExpense.description || !newExpense.amount || !newExpense.paidBy) {
      toast({
        title: "Missing Information", 
        description: "Please fill in all fields",
        variant: "destructive"
      });
      return;
    }
    addExpenseMutation.mutate(newExpense);
  };

  const categoryIcons = {
    food: "Food",
    transport: "Transport", 
    accommodation: "Hotel",
    activities: "Activity"
  };

  const getCategoryColor = (category: string) => {
    const colors = {
      food: "bg-orange-100 text-orange-800",
      transport: "bg-blue-100 text-blue-800",
      accommodation: "bg-purple-100 text-purple-800",
      activities: "bg-green-100 text-green-800"
    };
    return colors[category as keyof typeof colors] || "bg-gray-100 text-gray-800";
  };

  if (loading) {
    return (
      <div className="p-4">
        <div className="animate-pulse space-y-4">
          <div className="h-32 bg-gray-200 rounded-lg"></div>
          <div className="h-24 bg-gray-200 rounded-lg"></div>
          <div className="h-24 bg-gray-200 rounded-lg"></div>
        </div>
      </div>
    );
  }

  const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);

  return (
    <TripDetailLayout tripId={parseInt(tripId!)}>
      <div className="p-4 space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalExpenses.toFixed(2)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Split Between</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{members.length} people</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Per Person</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${members.length > 0 ? (totalExpenses / members.length).toFixed(2) : "0.00"}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add Expense Button */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Expenses</h2>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Expense
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Expense</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={newExpense.description}
                  onChange={(e) => setNewExpense({...newExpense, description: e.target.value})}
                  placeholder="What was this expense for?"
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
                    <SelectItem value="food">🍽️ Food & Drinks</SelectItem>
                    <SelectItem value="transport">🚗 Transport</SelectItem>
                    <SelectItem value="accommodation">🏨 Accommodation</SelectItem>
                    <SelectItem value="activities">🎯 Activities</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="paidBy" className="text-lg font-bold text-blue-600">
                  Who Paid for This?
                </Label>
                <Select
                  value={newExpense.paidBy > 0 ? newExpense.paidBy.toString() : ""}
                  onValueChange={(value) => setNewExpense({...newExpense, paidBy: parseInt(value)})}
                >
                  <SelectTrigger className="mt-2 h-12 text-base border-2 border-blue-300 focus:border-blue-500">
                    <SelectValue placeholder="Click here to select who paid" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.isArray(members) && members.length > 0 ? (
                      (members as any[]).map((member: any) => (
                        <SelectItem key={member.userId} value={member.userId.toString()}>
                          {member.name || member.username}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="demo" disabled>
                        Loading members...
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
                <p className="text-sm text-gray-500">
                  Select the person who actually paid for this expense
                </p>
              </div>

              {/* Split With Section */}
              <div className="space-y-2">
                <Label className="text-lg font-bold text-green-600">
                  Who Should Split This Expense?
                </Label>
                <div className="grid grid-cols-1 gap-2 max-h-32 overflow-y-auto border rounded-lg p-3">
                  {Array.isArray(members) && members.length > 0 ? (
                    (members as any[]).map((member: any) => (
                      <label key={member.userId} className="flex items-center space-x-2 cursor-pointer hover:bg-gray-100 p-2 rounded">
                        <input
                          type="checkbox"
                          checked={newExpense.splitWith.includes(member.userId)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setNewExpense({
                                ...newExpense,
                                splitWith: [...newExpense.splitWith, member.userId]
                              });
                            } else {
                              setNewExpense({
                                ...newExpense,
                                splitWith: newExpense.splitWith.filter(id => id !== member.userId)
                              });
                            }
                          }}
                          className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                        />
                        <span className="font-medium">{member.name || member.username}</span>
                      </label>
                    ))
                  ) : (
                    <p className="text-gray-500">Loading members...</p>
                  )}
                </div>
                <div className="flex justify-between">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const allMemberIds = Array.isArray(members) ? (members as any[]).map(m => m.userId) : [];
                      setNewExpense({...newExpense, splitWith: allMemberIds});
                    }}
                  >
                    Select All
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setNewExpense({...newExpense, splitWith: []})}
                  >
                    Clear All
                  </Button>
                </div>
                <p className="text-sm text-gray-500">
                  Choose who should share the cost of this expense
                </p>
              </div>
              
              <Button 
                onClick={addExpense} 
                className="w-full h-12 text-lg"
                disabled={!newExpense.description || !newExpense.amount || !newExpense.paidBy || newExpense.splitWith.length === 0}
              >
                Add Expense
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Expenses List */}
      <div className="space-y-3">
        {expenses.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center text-gray-500">
                <Receipt className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No expenses yet</p>
                <p className="text-sm">Add your first expense to get started!</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          expenses.map((expense) => {
            const payer = members.find(m => m.userId === expense.paidBy);
            return (
              <Card key={expense.id}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="text-2xl">
                        {categoryIcons[expense.category as keyof typeof categoryIcons]}
                      </div>
                      <div>
                        <p className="font-semibold">{expense.description}</p>
                        <div className="flex items-center space-x-2 text-sm text-gray-500">
                          <span
                            className={`px-2 py-1 rounded-full text-xs ${getCategoryColor(expense.category)}`}
                          >
                            {expense.category}
                          </span>
                          <span>•</span>
                          <span>Paid by {payer?.name || payer?.username}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold">${expense.amount.toFixed(2)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Balances */}
      {balances.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4">Who Owes What</h3>
          <div className="space-y-3">
            {balances.map((balance) => (
              <Card key={balance.userId}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold">{balance.name || balance.username}</p>
                      <p className="text-sm text-gray-500">
                        Paid: ${balance.owed.toFixed(2)} • Should pay: ${balance.owes.toFixed(2)}
                      </p>
                    </div>
                    <div className="text-right">
                      {balance.net > 0 ? (
                        <p className="text-green-600 font-semibold">
                          Gets back ${balance.net.toFixed(2)}
                        </p>
                      ) : balance.net < 0 ? (
                        <p className="text-red-600 font-semibold">
                          Owes ${Math.abs(balance.net).toFixed(2)}
                        </p>
                      ) : (
                        <p className="text-gray-500 font-semibold">Even</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
      </div>
    </TripDetailLayout>
  );
}