import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, X, Clock, CreditCard, DollarSign } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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

  // Filter members who need organizer review
  const pendingReviewMembers = members.filter(member => 
    !member.isOrganizer && 
    member.rsvpStatus === 'pending' && 
    (member.paymentStatus === 'submitted' || member.paymentStatus === 'pending')
  );

  // Debug logging
  console.log('Dashboard Debug:', {
    requiresDownPayment,
    totalMembers: members.length,
    pendingReviewMembers: pendingReviewMembers.length,
    allMemberStatuses: members.map(m => ({
      id: m.userId,
      isOrganizer: m.isOrganizer,
      rsvpStatus: m.rsvpStatus,
      paymentStatus: m.paymentStatus
    }))
  });

  const confirmPaymentMutation = useMutation({
    mutationFn: async (userId: number) => {
      return apiRequest(`/api/trips/${tripId}/members/${userId}/confirm-payment`, 'POST');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/trips', tripId, 'members'] });
      queryClient.invalidateQueries({ queryKey: ['/api/trips', tripId] });
      toast({
        title: "Payment confirmed",
        description: "Member has been granted full access to trip features."
      });
      setProcessingUserId(null);
    },
    onError: (error) => {
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
      return apiRequest(`/api/trips/${tripId}/members/${userId}/payment`, 'POST', {
        paymentStatus: 'rejected'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/trips', tripId, 'members'] });
      toast({
        title: "Payment rejected",
        description: "Member will need to resubmit payment information."
      });
      setProcessingUserId(null);
    },
    onError: (error) => {
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
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-orange-800">
          <Clock className="h-5 w-5" />
          Payment Reviews Required
        </CardTitle>
        <p className="text-sm text-orange-700">
          {pendingReviewMembers.length} member{pendingReviewMembers.length !== 1 ? 's' : ''} submitted payment information for review
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {pendingReviewMembers.map((member) => (
          <div key={member.userId} className="bg-white p-4 rounded-lg border border-orange-200">
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-3">
                <UserAvatar 
                  user={member.user}
                  className="h-10 w-10"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium text-gray-900">
                      {member.user?.name || member.user?.username || 'Anonymous'}
                    </h4>
                    <Badge variant="outline" className="text-xs">
                      Pending Review
                    </Badge>
                  </div>
                  
                  <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      {getPaymentMethodIcon(member.paymentMethod || '')}
                      <span className="font-medium">{member.paymentMethod || 'Unknown'}</span>
                      <span>•</span>
                      <span>${member.paymentAmount}</span>
                    </div>
                    
                    <div className="text-xs text-gray-500">
                      Payment Details: {getPaymentDetails(member)}
                    </div>
                    
                    {member.paymentSubmittedAt && (
                      <div className="text-xs text-gray-500">
                        Submitted: {new Date(member.paymentSubmittedAt).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex gap-2 ml-4">
                <Button
                  size="sm"
                  variant="outline"
                  className="bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
                  onClick={() => handleConfirmPayment(member.userId)}
                  disabled={processingUserId === member.userId}
                >
                  <Check className="h-4 w-4 mr-1" />
                  Confirm
                </Button>
                
                <Button
                  size="sm"
                  variant="outline"
                  className="bg-red-50 text-red-700 border-red-200 hover:bg-red-100"
                  onClick={() => handleRejectPayment(member.userId)}
                  disabled={processingUserId === member.userId}
                >
                  <X className="h-4 w-4 mr-1" />
                  Reject
                </Button>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}