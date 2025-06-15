import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Edit, MoreVertical, Trash2, Plus } from "lucide-react";
import ExpenseForm from "./ExpenseForm";
import { apiRequest } from "@/lib/queryClient";
import UserAvatar from "../user-avatar";

// Define a type for expense categories
type ExpenseCategory = 
  | "accommodation" 
  | "transportation" 
  | "food" 
  | "activities" 
  | "other";

// Helper function to map category to color
const getCategoryColor = (category: ExpenseCategory): string => {
  const colors: Record<ExpenseCategory, string> = {
    accommodation: "bg-purple-100 text-purple-800",
    transportation: "bg-blue-100 text-blue-800",
    food: "bg-green-100 text-green-800",
    activities: "bg-amber-100 text-amber-800",
    other: "bg-gray-100 text-gray-800"
  };
  return colors[category] || colors.other;
};

type ExpenseWithUser = {
  id: number;
  tripId: number;
  userId: number;
  title: string;
  amount: string;
  currency: string;
  category: ExpenseCategory;
  date: string;
  description: string | null;
  paidBy: number;
  splitMethod: string;
  splitDetails: any | null;
  isSettled: boolean;
  receiptUrl: string | null;
  createdAt: string;
  updatedAt: string;
  // User details added by API
  createdBy: {
    id: number;
    name: string;
    username: string;
    avatar: string | null;
  } | null;
  paidByUser: {
    id: number;
    name: string;
    username: string;
    avatar: string | null;
  } | null;
};

interface ExpenseListProps {
  tripId: number;
  currentUserId: number;
  isOrganizer: boolean;
  isAdmin?: boolean;
}

const ExpenseList: React.FC<ExpenseListProps> = ({ tripId, currentUserId, isOrganizer, isAdmin = false }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [isEditExpenseOpen, setIsEditExpenseOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<ExpenseWithUser | null>(null);
  const [expenseToDelete, setExpenseToDelete] = useState<ExpenseWithUser | null>(null);

  // Fetch expenses for this trip
  const { data: expenses, isLoading, error } = useQuery({
    queryKey: ['/api/trips', tripId, 'expenses'],
    enabled: !!tripId,
  });

  // Mutation for deleting an expense
  const deleteExpenseMutation = useMutation({
    mutationFn: async (expenseId: number) => {
      return await apiRequest("DELETE", `/api/expenses/${expenseId}`);
    },
    onSuccess: () => {
      toast({
        title: "Expense deleted",
        description: "The expense has been successfully deleted.",
        variant: "default",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/trips', tripId, 'expenses'] });
      queryClient.invalidateQueries({ queryKey: ['/api/trips', tripId, 'expenses/summary'] });
    },
    onError: (error) => {
      toast({
        title: "Error deleting expense",
        description: "There was an error deleting the expense. Please try again.",
        variant: "destructive",
      });
      console.error("Error deleting expense:", error);
    }
  });

  const handleDeleteClick = (expense: ExpenseWithUser) => {
    setExpenseToDelete(expense);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (expenseToDelete) {
      deleteExpenseMutation.mutate(expenseToDelete.id);
      setIsDeleteDialogOpen(false);
      setExpenseToDelete(null);
    }
  };

  const handleEditClick = (expense: ExpenseWithUser) => {
    setSelectedExpense(expense);
    setIsEditExpenseOpen(true);
  };

  // Check if user can edit/delete an expense
  const canModifyExpense = (expense: ExpenseWithUser) => {
    return expense.userId === currentUserId || isOrganizer || isAdmin;
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium">Expenses</h3>
          <Skeleton className="h-9 w-24" />
        </div>
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-5 w-1/3" />
              <Skeleton className="h-4 w-1/4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-20 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Error Loading Expenses</CardTitle>
        </CardHeader>
        <CardContent>
          <p>There was an error loading the expenses. Please try again later.</p>
          <Button variant="outline" onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/trips', tripId, 'expenses'] })}>
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Expenses</h3>
        <Dialog open={isAddExpenseOpen} onOpenChange={setIsAddExpenseOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Expense
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[550px]">
            <DialogHeader>
              <DialogTitle>Add a New Expense</DialogTitle>
              <DialogDescription>
                Add details about a trip expense. All expenses are visible to trip members.
              </DialogDescription>
            </DialogHeader>
            <ExpenseForm 
              tripId={tripId}
              onSuccess={() => {
                setIsAddExpenseOpen(false);
                queryClient.invalidateQueries({ queryKey: ['/api/trips', tripId, 'expenses'] });
                queryClient.invalidateQueries({ queryKey: ['/api/trips', tripId, 'expenses/summary'] });
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      {expenses && expenses.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Trip Expenses</CardTitle>
            <CardDescription>
              All expenses for this trip. Add personal expenses or shared costs.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Expense</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Paid By</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenses.map((expense: ExpenseWithUser) => (
                  <TableRow key={expense.id}>
                    <TableCell className="font-medium">{expense.title}</TableCell>
                    <TableCell>
                      {expense.currency} {parseFloat(expense.amount).toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <Badge className={getCategoryColor(expense.category as ExpenseCategory)}>
                        {expense.category.charAt(0).toUpperCase() + expense.category.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <UserAvatar user={expense.paidByUser || expense.createdBy} />
                        <span>
                          {(expense.paidByUser?.name || expense.paidByUser?.username || 
                           expense.createdBy?.name || expense.createdBy?.username || "Unknown")}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {format(new Date(expense.date), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell className="text-right">
                      {canModifyExpense(expense) ? (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                              <span className="sr-only">Open menu</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleEditClick(expense)}>
                              <Edit className="mr-2 h-4 w-4" /> Edit Expense
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleDelete(expense)}
                              className="text-red-600"
                            >
                              <Trash2 className="mr-2 h-4 w-4" /> Delete Expense
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      ) : (
                        <span className="text-gray-400 text-sm">N/A</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>No Expenses Yet</CardTitle>
            <CardDescription>
              Start tracking expenses for this trip by adding your first expense.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Button onClick={() => setIsAddExpenseOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add First Expense
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Edit Expense Dialog */}
      {selectedExpense && (
        <Dialog open={isEditExpenseOpen} onOpenChange={setIsEditExpenseOpen}>
          <DialogContent className="sm:max-w-[550px]">
            <DialogHeader>
              <DialogTitle>Edit Expense</DialogTitle>
              <DialogDescription>
                Update the details of this expense.
              </DialogDescription>
            </DialogHeader>
            <ExpenseForm 
              tripId={tripId}
              expense={selectedExpense}
              onSuccess={() => {
                setIsEditExpenseOpen(false);
                setSelectedExpense(null);
                queryClient.invalidateQueries({ queryKey: ['/api/trips', tripId, 'expenses'] });
                queryClient.invalidateQueries({ queryKey: ['/api/trips', tripId, 'expenses/summary'] });
              }}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default ExpenseList;