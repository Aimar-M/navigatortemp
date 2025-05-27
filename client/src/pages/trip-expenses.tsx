import { useState } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, PieChart, List, Users, DollarSign, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { apiRequest } from "@/lib/queryClient";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";

const expenseSchema = z.object({
  description: z.string().min(1, "Description is required"),
  amount: z.string().min(1, "Amount is required"),
  category: z.string(),
  paidBy: z.number(),
  splitWith: z.array(z.number()).min(1, "Must select at least one person to split with"),
});

type ExpenseFormData = z.infer<typeof expenseSchema>;

interface Expense {
  id: number;
  tripId: number;
  paidBy: number;
  amount: string;
  description: string;
  category: string;
  date: string;
  payer: {
    id: number;
    username: string;
    name: string;
  };
  splits: Array<{
    userId: number;
    amount: string;
    settled: boolean;
    user: {
      id: number;
      username: string;
      name: string;
    };
  }>;
}

interface Balance {
  userId: number;
  username: string;
  name: string;
  owes: number;
  owed: number;
  net: number;
}

export default function TripExpenses() {
  const { id } = useParams();
  const tripId = parseInt(id!);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showVisuals, setShowVisuals] = useState(false);
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);

  const { data: trip } = useQuery({
    queryKey: [`/api/trips/${tripId}`],
  });

  const { data: members = [] } = useQuery({
    queryKey: [`/api/trips/${tripId}/members`],
  });

  const { data: expenses = [] } = useQuery<Expense[]>({
    queryKey: [`/api/trips/${tripId}/expenses`],
  });

  const { data: balances = [] } = useQuery<Balance[]>({
    queryKey: [`/api/trips/${tripId}/expenses/balances`],
  });

  const form = useForm<ExpenseFormData>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      description: "",
      amount: "",
      category: "general",
      splitWith: [],
    },
  });

  const addExpenseMutation = useMutation({
    mutationFn: async (data: ExpenseFormData) => {
      const expense = await apiRequest(`/api/trips/${tripId}/expenses`, {
        method: "POST",
        body: JSON.stringify({
          ...data,
          amount: parseFloat(data.amount),
        }),
      });
      return expense;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/trips/${tripId}/expenses`] });
      queryClient.invalidateQueries({ queryKey: [`/api/trips/${tripId}/expenses/balances`] });
      setIsAddExpenseOpen(false);
      form.reset();
      toast({
        title: "Expense added",
        description: "The expense has been added to the trip.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to add expense. Please try again.",
        variant: "destructive",
      });
    },
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "food": return "🍽️";
      case "transport": return "🚗";
      case "accommodation": return "🏨";
      case "activities": return "🎯";
      default: return "💰";
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "food": return "bg-orange-100 text-orange-800";
      case "transport": return "bg-blue-100 text-blue-800";
      case "accommodation": return "bg-purple-100 text-purple-800";
      case "activities": return "bg-green-100 text-green-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const totalExpenses = expenses.reduce((sum, expense) => sum + parseFloat(expense.amount), 0);

  return (
    <div className="container mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Trip Expenses</h1>
          <p className="text-muted-foreground">
            Track shared expenses and see who owes what
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center space-x-2">
            <List className="h-4 w-4" />
            <Switch
              checked={showVisuals}
              onCheckedChange={setShowVisuals}
              id="visual-mode"
            />
            <PieChart className="h-4 w-4" />
          </div>
          <Dialog open={isAddExpenseOpen} onOpenChange={setIsAddExpenseOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Expense
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Add New Expense</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit((data) => addExpenseMutation.mutate(data))} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Input placeholder="Dinner at restaurant" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Amount (USD)</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" placeholder="50.00" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="food">🍽️ Food</SelectItem>
                            <SelectItem value="transport">🚗 Transport</SelectItem>
                            <SelectItem value="accommodation">🏨 Accommodation</SelectItem>
                            <SelectItem value="activities">🎯 Activities</SelectItem>
                            <SelectItem value="general">💰 General</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="paidBy"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Paid by</FormLabel>
                        <Select onValueChange={(value) => field.onChange(parseInt(value))}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Who paid?" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {members.map((member: any) => (
                              <SelectItem key={member.userId} value={member.userId.toString()}>
                                {member.user?.name || member.user?.username}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="splitWith"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Split with (select multiple)</FormLabel>
                        <div className="space-y-2">
                          {members.map((member: any) => (
                            <div key={member.userId} className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                id={`member-${member.userId}`}
                                checked={field.value.includes(member.userId)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    field.onChange([...field.value, member.userId]);
                                  } else {
                                    field.onChange(field.value.filter((id) => id !== member.userId));
                                  }
                                }}
                                className="rounded border-gray-300"
                              />
                              <label htmlFor={`member-${member.userId}`} className="text-sm">
                                {member.user?.name || member.user?.username}
                              </label>
                            </div>
                          ))}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex gap-2">
                    <Button type="submit" disabled={addExpenseMutation.isPending} className="flex-1">
                      {addExpenseMutation.isPending ? "Adding..." : "Add Expense"}
                    </Button>
                    <Button type="button" variant="outline" onClick={() => setIsAddExpenseOpen(false)}>
                      Cancel
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalExpenses)}</div>
            <p className="text-xs text-muted-foreground">
              {expenses.length} expense{expenses.length !== 1 ? 's' : ''}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Per Person</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(members.length > 0 ? totalExpenses / members.length : 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Average per person
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unsettled</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {balances.filter(b => Math.abs(b.net) > 0.01).length}
            </div>
            <p className="text-xs text-muted-foreground">
              People with balances
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Balances Section */}
      <Card>
        <CardHeader>
          <CardTitle>Who Owes What</CardTitle>
        </CardHeader>
        <CardContent>
          {balances.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No expenses yet. Add an expense to see balances.
            </p>
          ) : (
            <div className="space-y-3">
              {balances.map((balance) => (
                <div key={balance.userId} className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <p className="font-medium">{balance.name || balance.username}</p>
                    {balance.net > 0.01 && (
                      <p className="text-sm text-green-600">Gets back {formatCurrency(balance.net)}</p>
                    )}
                    {balance.net < -0.01 && (
                      <p className="text-sm text-red-600">Owes {formatCurrency(Math.abs(balance.net))}</p>
                    )}
                    {Math.abs(balance.net) <= 0.01 && (
                      <p className="text-sm text-muted-foreground">All settled up</p>
                    )}
                  </div>
                  <div className="text-right text-sm text-muted-foreground">
                    <p>Paid: {formatCurrency(balance.owed)}</p>
                    <p>Share: {formatCurrency(balance.owes)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Expenses List */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Expenses</CardTitle>
        </CardHeader>
        <CardContent>
          {expenses.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No expenses yet. Add your first expense to get started!
            </p>
          ) : (
            <div className="space-y-3">
              {expenses.map((expense) => (
                <div key={expense.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex items-center gap-3">
                    <div className="text-2xl">{getCategoryIcon(expense.category)}</div>
                    <div>
                      <p className="font-medium">{expense.description}</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Badge variant="secondary" className={getCategoryColor(expense.category)}>
                          {expense.category}
                        </Badge>
                        <span>Paid by {expense.payer.name || expense.payer.username}</span>
                        <span>•</span>
                        <span>{format(new Date(expense.date), "MMM d")}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{formatCurrency(parseFloat(expense.amount))}</p>
                    <p className="text-sm text-muted-foreground">
                      Split {expense.splits?.length || 0} ways
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}