import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, X, Clock, CreditCard, DollarSign, ChevronDown, ChevronUp, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import UserAvatar from "@/components/user-avatar";
import { toast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface Member {
  tripId: number;
  userId: number;
  status: string;
  rsvpStatus?: string;
  rsvpDate?: string;
  paymentMethod?: string;
  paymentStatus?: string;
  paymentAmount?: string;
  paymentSubmittedAt?: string;
  paymentConfirmedAt?: string;
  isOrganizer: boolean;
  user: {
    id: number;
    username: string;
    name?: string;
    email?: string;
    profileImageUrl?: string;
    avatar?: string;
    venmoUsername?: string;
    paypalEmail?: string;
  };
}

interface OrganizerReviewDashboardProps {
  tripId: number;
  members: Member[];
  requiresDownPayment: boolean;
}

export default function OrganizerReviewDashboard({ 
  tripId, 
  members, 
  requiresDownPayment 
}: OrganizerReviewDashboardProps) {
  const queryClient = useQueryClient();
  const [processingUserId, setProcessingUserId] = useState<number | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [confirmedUserIds, setConfirmedUserIds] = useState<Set<number>>(new Set());
  const [rejectedUserIds, setRejectedUserIds] = useState<Set<number>>(new Set());

  // Filter members who need organizer review, excluding those already processed
  const pendingReviewMembers = members.filter(member => 
    !member.isOrganizer && 
    member.rsvpStatus === 'pending' && 
    (member.paymentStatus === 'submitted' || member.paymentStatus === 'pending') &&
    !confirmedUserIds.has(member.userId) &&
    !rejectedUserIds.has(member.userId)
  );

  const confirmPaymentMutation = useMutation({
    mutationFn: async (userId: number) => {
      return apiRequest('POST', `/api/trips/${tripId}/members/${userId}/confirm-payment`);
    },
    onMutate: async (userId: number) => {
      // Optimistic update: immediately hide the member from pending list
      setConfirmedUserIds(prev => new Set(Array.from(prev).concat(userId)));
    },
    onSuccess: (_, userId) => {
      queryClient.invalidateQueries({ queryKey: ['/api/trips', tripId, 'members'] });
      queryClient.invalidateQueries({ queryKey: ['/api/trips', tripId] });
      queryClient.invalidateQueries({ queryKey: ['/api/trips'] });
      
      const member = members.find(m => m.userId === userId);
      toast({
        title: "Payment confirmed",
        description: `${member?.user.name || member?.user.username} has been added to the trip and now has full access to all features.`,
        duration: 5000,
      });
      setProcessingUserId(null);
    },
    onError: (error, userId) => {
      // Revert optimistic update on error
      setConfirmedUserIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
      
      toast({
        title: "Failed to confirm payment",
        description: error.message || "Something went wrong",
        variant: "destructive"
      });
      setProcessingUserId(null);
    }
  });

  const rejectPaymentMutation = useMutation({
    mutationFn: async (userId: number) => {
      return apiRequest('POST', `/api/trips/${tripId}/members/${userId}/reject-payment`);
    },
    onMutate: async (userId: number) => {
      // Optimistic update: immediately hide the member from pending list
      setRejectedUserIds(prev => new Set(Array.from(prev).concat(userId)));
    },
    onSuccess: (_, userId) => {
      queryClient.invalidateQueries({ queryKey: ['/api/trips', tripId, 'members'] });
      queryClient.invalidateQueries({ queryKey: ['/api/trips', tripId] });
      queryClient.invalidateQueries({ queryKey: ['/api/trips'] });
      
      const member = members.find(m => m.userId === userId);
      toast({
        title: "Payment rejected",
        description: `${member?.user.name || member?.user.username}'s RSVP has been declined and they will be notified.`,
        duration: 5000,
      });
      setProcessingUserId(null);
    },
    onError: (error, userId) => {
      // Revert optimistic update on error
      setRejectedUserIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
      
      toast({
        title: "Failed to reject payment",
        description: error.message || "Something went wrong",
        variant: "destructive"
      });
      setProcessingUserId(null);
    }
  });

  const handleConfirmPayment = (userId: number) => {
    setProcessingUserId(userId);
    confirmPaymentMutation.mutate(userId);
  };

  const handleRejectPayment = (userId: number) => {
    setProcessingUserId(userId);
    rejectPaymentMutation.mutate(userId);
  };

  const getPaymentMethodIcon = (method: string) => {
    switch (method?.toLowerCase()) {
      case 'venmo':
        return <CreditCard className="h-4 w-4" />;
      case 'paypal':
        return <CreditCard className="h-4 w-4" />;
      case 'cash':
        return <DollarSign className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getPaymentDetails = (member: Member) => {
    if (!member.paymentMethod) return 'No payment method';
    
    switch (member.paymentMethod.toLowerCase()) {
      case 'venmo':
        return member.user.venmoUsername || 'Venmo (no handle provided)';
      case 'paypal':
        return member.user.paypalEmail || 'PayPal (no email provided)';
      case 'cash':
        return 'Cash payment arranged';
      default:
        return member.paymentMethod;
    }
  };

  if (!requiresDownPayment || pendingReviewMembers.length === 0) {
    return null;
  }

  return (
    <Card className="border-orange-200 bg-orange-50">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-orange-100 transition-colors">
            <CardTitle className="flex items-center justify-between text-orange-800">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Payment Reviews ({pendingReviewMembers.length})
              </div>
              {isOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
            </CardTitle>
            <p className="text-sm text-orange-700 text-left">
              {pendingReviewMembers.length} member{pendingReviewMembers.length !== 1 ? 's' : ''} awaiting payment confirmation
            </p>
          </CardHeader>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent className="space-y-4 pt-0">
            {pendingReviewMembers.map((member) => (
              <div key={member.userId} className="bg-white p-3 rounded-lg border border-orange-200">
                <div className="space-y-3">
                  {/* Member Info */}
                  <div className="flex items-center space-x-3">
                    <UserAvatar 
                      user={member.user}
                      className="h-8 w-8"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-gray-900 truncate">
                          {member.user?.name || member.user?.username || 'Anonymous'}
                        </h4>
                        <Badge variant="outline" className="text-xs flex-shrink-0">
                          Pending
                        </Badge>
                      </div>
                    </div>
                  </div>
                  
                  {/* Payment Details */}
                  <div className="space-y-1 text-sm text-gray-600 pl-11">
                    <div className="flex items-center gap-2">
                      {getPaymentMethodIcon(member.paymentMethod || '')}
                      <span className="font-medium">{member.paymentMethod || 'Not specified'}</span>
                      <span>•</span>
                      <span className="font-semibold">${member.paymentAmount}</span>
                    </div>
                    
                    <div className="text-xs text-gray-500">
                      {getPaymentDetails(member)}
                    </div>
                    
                    {member.paymentSubmittedAt && (
                      <div className="text-xs text-gray-500">
                        Submitted: {new Date(member.paymentSubmittedAt).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="flex gap-2 w-full">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
                          disabled={processingUserId === member.userId}
                        >
                          <Check className="h-4 w-4 mr-1" />
                          {processingUserId === member.userId ? "Processing..." : "Confirm"}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Confirm Payment</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to confirm {member.user?.name || member.user?.username}'s payment of ${member.paymentAmount}?
                            <br /><br />
                            This will:
                            <ul className="list-disc ml-4 mt-2">
                              <li>Add them to the trip with full access</li>
                              <li>Allow them to view and participate in all trip activities</li>
                              <li>Send them a confirmation notification</li>
                            </ul>
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={() => handleConfirmPayment(member.userId)}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            Confirm Payment
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                    
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 bg-red-50 text-red-700 border-red-200 hover:bg-red-100"
                          disabled={processingUserId === member.userId}
                        >
                          <X className="h-4 w-4 mr-1" />
                          {processingUserId === member.userId ? "Processing..." : "Reject"}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Reject Payment</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to reject {member.user?.name || member.user?.username}'s payment of ${member.paymentAmount}?
                            <br /><br />
                            This will:
                            <ul className="list-disc ml-4 mt-2">
                              <li>Remove them from the trip</li>
                              <li>Send them a rejection notification</li>
                              <li>They will need to resubmit if they want to join</li>
                            </ul>
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={() => handleRejectPayment(member.userId)}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            Reject Payment
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}