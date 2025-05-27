import { useState, useEffect } from "react";
import { useParams } from "wouter";
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
  
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [balances, setBalances] = useState<Balance[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Form state
  const [newExpense, setNewExpense] = useState({
    description: "",
    amount: "",
    category: "food",
    paidBy: 0
  });

  // Load data
  useEffect(() => {
    loadData();
  }, [tripId]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load expenses
      const expensesRes = await fetch(`/api/trips/${tripId}/expenses`, {
        credentials: 'include'
      });
      if (expensesRes.ok) {
        const expensesData = await expensesRes.json();
        setExpenses(expensesData);
      }
      
      // Load members
      const membersRes = await fetch(`/api/trips/${tripId}/members`, {
        credentials: 'include'
      });
      if (membersRes.ok) {
        const membersData = await membersRes.json();
        setMembers(membersData);
      }
      
      // Load balances
      const balancesRes = await fetch(`/api/trips/${tripId}/expenses/balances`, {
        credentials: 'include'
      });
      if (balancesRes.ok) {
        const balancesData = await balancesRes.json();
        setBalances(balancesData);
      }
      
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const addExpense = async () => {
    try {
      if (!newExpense.description || !newExpense.amount || !newExpense.paidBy) {
        toast({
          title: "Missing Information",
          description: "Please fill in all fields",
          variant: "destructive"
        });
        return;
      }

      const response = await fetch(`/api/trips/${tripId}/expenses`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: 'include',
        body: JSON.stringify({
          description: newExpense.description,
          amount: parseFloat(newExpense.amount),
          category: newExpense.category,
          paidBy: newExpense.paidBy,
          splitWith: members.map(m => m.userId)
        }),
      });

      if (response.ok) {
        toast({
          title: "Success!",
          description: "Expense added successfully"
        });
        
        // Reset form
        setNewExpense({
          description: "",
          amount: "",
          category: "food",
          paidBy: 0
        });
        
        setIsAddDialogOpen(false);
        
        // Reload data
        loadData();
      } else {
        throw new Error("Failed to add expense");
      }
    } catch (error) {
      console.error("Error adding expense:", error);
      toast({
        title: "Error",
        description: "Failed to add expense",
        variant: "destructive"
      });
    }
  };

  const categoryIcons = {
    food: "🍽️",
    transport: "🚗",
    accommodation: "🏨",
    activities: "🎯"
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
              
              <div>
                <Label htmlFor="paidBy" className="text-sm font-semibold">Who Paid for This?</Label>
                <Select
                  value={newExpense.paidBy > 0 ? newExpense.paidBy.toString() : ""}
                  onValueChange={(value) => setNewExpense({...newExpense, paidBy: parseInt(value)})}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select who paid..." />
                  </SelectTrigger>
                  <SelectContent>
                    {members.map((member) => (
                      <SelectItem key={member.userId} value={member.userId.toString()}>
                        👤 {member.name || member.username}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <Button onClick={addExpense} className="w-full">
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