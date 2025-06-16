import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  AlertTriangle, 
  DollarSign, 
  Users, 
  Activity,
  CheckCircle,
  XCircle,
  Info
} from "lucide-react";

interface RemovalEligibility {
  canRemove: boolean;
  reason?: string;
  balance: number;
  manualExpenseBalance: number;
  prepaidActivityBalance: number;
  prepaidActivitiesOwed: Array<{
    activityId: number;
    activityName: string;
    amountOwed: number;
  }>;
  suggestions?: string[];
}

interface EnhancedMemberRemovalDialogProps {
  tripId: number;
  userId: number;
  userName: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function EnhancedMemberRemovalDialog({
  tripId,
  userId,
  userName,
  isOpen,
  onClose,
  onSuccess
}: EnhancedMemberRemovalDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [confirmRemoval, setConfirmRemoval] = useState(false);

  // Check removal eligibility
  const { data: eligibility, isLoading } = useQuery<RemovalEligibility>({
    queryKey: [`/api/trips/${tripId}/members/${userId}/removal-eligibility`],
    enabled: isOpen && userId > 0,
    retry: false
  });

  // Remove member mutation
  const removeMemberMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("DELETE", `/api/trips/${tripId}/members/${userId}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/trips/${tripId}/members`] });
      queryClient.invalidateQueries({ queryKey: [`/api/trips/${tripId}/activities`] });
      queryClient.invalidateQueries({ queryKey: [`/api/trips/${tripId}/expenses`] });
      queryClient.invalidateQueries({ queryKey: [`/api/trips/${tripId}/expenses/balances`] });
      
      toast({
        title: "Member removed",
        description: `${userName} has been removed from the trip.`,
      });
      
      onSuccess();
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Failed to remove member",
        description: error.message || "Something went wrong",
        variant: "destructive"
      });
    }
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const handleRemove = () => {
    if (!eligibility?.canRemove) return;
    removeMemberMutation.mutate();
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Remove {userName} from Trip
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : eligibility ? (
          <div className="space-y-6">
            {/* Eligibility Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {eligibility.canRemove ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-600" />
                  )}
                  Removal Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                {eligibility.canRemove ? (
                  <div className="space-y-2">
                    <Badge variant="default" className="bg-green-100 text-green-800">
                      Ready for Removal
                    </Badge>
                    <p className="text-sm text-gray-600">
                      {userName} can be safely removed from the trip. All financial obligations have been settled.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <Badge variant="destructive">
                      Cannot Remove
                    </Badge>
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-red-800">
                            {eligibility.reason}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Financial Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Financial Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <div className="text-lg font-semibold">
                      {formatCurrency(eligibility.balance)}
                    </div>
                    <div className="text-sm text-gray-600">Total Balance</div>
                  </div>
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <div className="text-lg font-semibold">
                      {formatCurrency(eligibility.manualExpenseBalance)}
                    </div>
                    <div className="text-sm text-gray-600">Manual Expenses</div>
                  </div>
                  <div className="text-center p-3 bg-orange-50 rounded-lg">
                    <div className="text-lg font-semibold">
                      {formatCurrency(eligibility.prepaidActivityBalance)}
                    </div>
                    <div className="text-sm text-gray-600">Prepaid Activities</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Prepaid Activities Owed */}
            {eligibility.prepaidActivitiesOwed.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    Prepaid Activities Organized
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {eligibility.prepaidActivitiesOwed.map((activity, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <div className="font-medium">{activity.activityName}</div>
                          <div className="text-sm text-gray-600">
                            Activity organized by {userName}
                          </div>
                        </div>
                        <Badge variant="outline">
                          {formatCurrency(activity.amountOwed)} owed
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Suggestions */}
            {eligibility.suggestions && eligibility.suggestions.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Info className="h-5 w-5" />
                    Recommended Actions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {eligibility.suggestions.map((suggestion, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <div className="w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
                        <span className="text-sm">{suggestion}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Confirmation */}
            {eligibility.canRemove && (
              <Card>
                <CardHeader>
                  <CardTitle>Confirm Removal</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                        <div className="text-sm">
                          <p className="font-medium text-yellow-800 mb-1">
                            This action will:
                          </p>
                          <ul className="text-yellow-700 space-y-1">
                            <li>• Remove {userName} from the trip</li>
                            <li>• Delete any prepaid activities they organized</li>
                            <li>• Mark free activities as "Created by a removed user"</li>
                            <li>• This action cannot be undone</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="confirm-removal"
                        checked={confirmRemoval}
                        onChange={(e) => setConfirmRemoval(e.target.checked)}
                        className="rounded border-gray-300"
                      />
                      <label htmlFor="confirm-removal" className="text-sm">
                        I understand this action cannot be undone
                      </label>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              {eligibility.canRemove && (
                <Button
                  variant="destructive"
                  onClick={handleRemove}
                  disabled={!confirmRemoval || removeMemberMutation.isPending}
                >
                  {removeMemberMutation.isPending ? "Removing..." : "Remove Member"}
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-600">Failed to load removal eligibility</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}