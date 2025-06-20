import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, DollarSign, Receipt, Users, Activity, CheckCircle, XCircle, HandHeart, Calendar, MapPin, User, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/hooks/use-auth";

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
  id: number | string;
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
  isSettlement: boolean;
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
  shares?: ExpenseSplit[];
  splits?: ExpenseSplit[];
}

export default function ExpenseDetails() {
  const { tripId, expenseId } = useParams<{ tripId: string; expenseId: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // Fetch expense details
  const { data: expense, isLoading } = useQuery<Expense>({
    queryKey: [`/api/expenses/${expenseId}`],
    enabled: !!expenseId && !expenseId.startsWith('settlement-'),
  });

  // For settlement expenses, we need to get them from the expenses list
  const { data: expenses } = useQuery<Expense[]>({
    queryKey: [`/api/trips/${tripId}/expenses`],
    enabled: !!expenseId?.startsWith('settlement-'),
  });

  const settlementExpense = expenses?.find(e => e.id === expenseId);
  const displayExpense = expense || settlementExpense;

  // Get trip data for permission checking
  const { data: trip } = useQuery<any>({
    queryKey: [`/api/trips/${tripId}`],
  });

  // Get trip members for admin status checking
  const { data: tripMembers = [] } = useQuery<any[]>({
    queryKey: [`/api/trips/${tripId}/members`],
  });

  // Delete mutation
  const deleteExpenseMutation = useMutation({
    mutationFn: async (expenseId: number | string) => {
      return await apiRequest("DELETE", `/api/expenses/${expenseId}`);
    },
    onSuccess: () => {
      toast({
        title: "Expense deleted",
        description: "The expense has been successfully deleted.",
      });
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: [`/api/trips/${tripId}/expenses`] });
      queryClient.invalidateQueries({ queryKey: [`/api/trips/${tripId}/expenses/balances`] });
      queryClient.invalidateQueries({ queryKey: [`/api/trips/${tripId}/activities`] });
      queryClient.invalidateQueries({ queryKey: [`/api/trips/${tripId}/itinerary`] });
      // Navigate back to expenses page
      setLocation(`/trips/${tripId}/expenses`);
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

  // Check if user can delete the expense (enhanced permission system)
  const canDeleteExpense = () => {
    if (!user || !trip || !displayExpense) return false;
    
    // Find user's membership info
    const userMembership = tripMembers?.find((member: any) => member.userId === user.id);
    const isOrganizer = trip.organizer === user.id;
    const isAdmin = userMembership?.isAdmin === true;
    
    // Check if this is a manual expense (not linked to an activity)
    const isManualExpense = !displayExpense.activityId;
    
    if (isManualExpense) {
      // For manual expenses: only the creator can delete
      return displayExpense.paidBy === user.id;
    } else {
      // For prepaid activity expenses: only admins and organizer can delete
      return isOrganizer || isAdmin;
    }
  };

  const handleDeleteClick = () => {
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (displayExpense) {
      deleteExpenseMutation.mutate(displayExpense.id);
      setIsDeleteDialogOpen(false);
    }
  };

  // Format currency
  const formatCurrency = (amount: number | string) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (isNaN(num)) return '$0.00';
    return `$${num.toFixed(2)}`;
  };

  // Get category icon
  const getCategoryIcon = (category: string) => {
    const iconMap: { [key: string]: React.ComponentType<any> } = {
      food: Receipt,
      transportation: Activity,
      accommodation: Activity,
      entertainment: Activity,
      shopping: Receipt,
      other: DollarSign,
    };
    const IconComponent = iconMap[category] || DollarSign;
    return <IconComponent className="h-4 w-4" />;
  };

  // Get category color
  const getCategoryColor = (category: string) => {
    const colorMap: { [key: string]: string } = {
      food: "bg-orange-100 text-orange-800",
      transportation: "bg-blue-100 text-blue-800",
      accommodation: "bg-purple-100 text-purple-800",
      entertainment: "bg-green-100 text-green-800",
      shopping: "bg-pink-100 text-pink-800",
      other: "bg-gray-100 text-gray-800",
    };
    return colorMap[category] || "bg-gray-100 text-gray-800";
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-32"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!displayExpense) {
    return (
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Expense not found</h2>
          <p className="text-gray-500 mb-4">The expense you're looking for doesn't exist.</p>
          <Button onClick={() => setLocation(`/trips/${tripId}/expenses`)}>
            Back to Expenses
          </Button>
        </div>
      </div>
    );
  }

  const splits = displayExpense.shares || displayExpense.splits || [];
  const totalParticipants = splits.length;

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <Button 
          variant="ghost" 
          size="sm"
          onClick={() => setLocation(`/trips/${tripId}/expenses`)}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Expenses
        </Button>
        
        {/* Delete button - only show if user has permission and it's not a settlement */}
        {!displayExpense?.isSettlement && canDeleteExpense() && (
          <Button 
            variant="destructive" 
            size="sm"
            onClick={handleDeleteClick}
            className="flex items-center gap-2"
          >
            <Trash2 className="h-4 w-4" />
            Delete Expense
          </Button>
        )}
      </div>

      {/* Expense Details Card */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                {displayExpense.isSettlement ? (
                  <HandHeart className="h-6 w-6 text-green-600" />
                ) : (
                  getCategoryIcon(displayExpense.category)
                )}
                {displayExpense.activity ? displayExpense.activity.name : displayExpense.title}
              </CardTitle>
              <p className="text-gray-500 mt-1">{new Date(displayExpense.date).toLocaleDateString()}</p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <div className="text-3xl font-bold text-gray-900">
                {displayExpense.isSettlement ? '+' : ''}{formatCurrency(displayExpense.amount)}
              </div>
              <Badge className={displayExpense.isSettlement ? 'bg-green-100 text-green-800' : getCategoryColor(displayExpense.category)}>
                {displayExpense.isSettlement ? 'Payment Settlement' : displayExpense.category}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {displayExpense.description && (
            <p className="text-gray-700 mb-4">{displayExpense.description}</p>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-gray-500" />
              <div>
                <p className="text-sm text-gray-500">Paid by</p>
                <p className="font-medium">
                  {displayExpense.paidByUser?.name || displayExpense.paidByUser?.username || 'Unknown User'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gray-500" />
              <div>
                <p className="text-sm text-gray-500">Date</p>
                <p className="font-medium">{new Date(displayExpense.date).toLocaleDateString()}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-gray-500" />
              <div>
                <p className="text-sm text-gray-500">Amount</p>
                <p className="font-medium">{formatCurrency(displayExpense.amount)}</p>
              </div>
            </div>

            {displayExpense.activity && (
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-gray-500" />
                <div>
                  <p className="text-sm text-gray-500">Related Activity</p>
                  <p className="font-medium">{displayExpense.activity?.name || 'Activity'}</p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Participants Section */}
      {!displayExpense.isSettlement && splits.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Split Between ({splits.length} {splits.length === 1 ? 'participant' : 'participants'})
            </CardTitle>
            <p className="text-sm text-gray-600 mt-1">
              {formatCurrency(splits[0]?.amount || 0)} per person
            </p>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {splits.map((split) => (
                <div key={split.id} className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-full px-4 py-2">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-blue-100 text-blue-600 text-sm">
                      {(split.user?.name || split.user?.username || 'U').charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium text-blue-800">
                    {split.user?.name || split.user?.username || 'Unknown User'}
                  </span>
                </div>
              ))}
            </div>

            <Separator className="my-6" />
            
            {/* Summary */}
            <div className="grid grid-cols-2 gap-6 text-center">
              <div>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(displayExpense.amount)}</p>
                <p className="text-sm text-gray-500">Total Amount</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-600">{totalParticipants}</p>
                <p className="text-sm text-gray-500">Participants</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Settlement Details */}
      {displayExpense.isSettlement && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HandHeart className="h-5 w-5 text-green-600" />
              Payment Settlement Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-green-50 p-6 rounded-lg">
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600 mb-2">
                  {formatCurrency(displayExpense.amount)}
                </div>
                <p className="text-green-800 mb-4">
                  Payment confirmed and processed
                </p>
                <p className="text-sm text-green-700">
                  This payment was made to settle outstanding balances between trip members.
                  The transaction has been verified and all balances have been updated accordingly.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Expense</AlertDialogTitle>
            <AlertDialogDescription>
              {displayExpense && (
                <div className="space-y-2">
                  <p>Are you sure you want to delete this expense?</p>
                  <div className="bg-gray-50 p-3 rounded-md">
                    <p className="font-medium">{displayExpense.title}</p>
                    <p className="text-sm text-gray-600">
                      {formatCurrency(displayExpense.amount)}
                    </p>
                    <p className="text-sm text-gray-600">
                      Paid by {displayExpense.paidByUser?.name || displayExpense.paidByUser?.username}
                    </p>
                    {displayExpense.activityId && (
                      <p className="text-sm text-orange-600 font-medium mt-2">
                        ⚠️ This will also delete the linked itinerary activity
                      </p>
                    )}
                  </div>
                  <p className="text-red-600 font-medium">This action cannot be undone.</p>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700"
              disabled={deleteExpenseMutation.isPending}
            >
              {deleteExpenseMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}