import { Clock, CreditCard, AlertCircle, Bell } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface PendingStatusScreenProps {
  trip: {
    name: string;
    destination?: string;
    startDate?: string;
    endDate?: string;
    description?: string;
    requiresDownPayment?: boolean;
    downPaymentAmount?: string;
  };
  member: {
    rsvpStatus?: string;
    paymentMethod?: string;
    paymentAmount?: string;
    paymentStatus?: string;
  };
}

export default function PendingStatusScreen({ trip, member }: PendingStatusScreenProps) {
  const formatPaymentMethod = (method: string) => {
    switch (method?.toLowerCase()) {
      case 'venmo':
        return 'Venmo';
      case 'paypal':
        return 'PayPal';
      case 'cash':
        return 'Cash';
      default:
        return method || 'Not specified';
    }
  };

  const getPaymentStatusMessage = () => {
    if (!trip.requiresDownPayment) {
      return "No payment required";
    }

    switch (member.paymentStatus) {
      case 'submitted':
      case 'pending':
        return "Payment submitted - awaiting organizer confirmation";
      case 'confirmed':
        return "Payment confirmed";
      case 'rejected':
        return "Payment rejected - please resubmit";
      default:
        return "Payment required";
    }
  };

  const getRSVPStatusMessage = () => {
    if (member.rsvpStatus === 'pending' && (member.paymentStatus === 'submitted' || member.paymentStatus === 'pending')) {
      return "Payment submitted - awaiting confirmation";
    }
    return "Awaiting organizer approval";
  };

  const getStatusColor = () => {
    if (!trip.requiresDownPayment) return "bg-blue-100 text-blue-800";
    
    switch (member.paymentStatus) {
      case 'submitted':
      case 'pending':
        return "bg-yellow-100 text-yellow-800";
      case 'confirmed':
        return "bg-green-100 text-green-800";
      case 'rejected':
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-yellow-100 rounded-full mb-4">
          <Clock className="h-8 w-8 text-yellow-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">RSVP Pending</h1>
        <p className="text-gray-600">
          Your RSVP for <span className="font-semibold">{trip.name}</span> is awaiting confirmation
        </p>
        {trip.destination && (
          <p className="text-sm text-gray-500 mt-1">{trip.destination}</p>
        )}
        {trip.startDate && trip.endDate && (
          <p className="text-sm text-gray-500">
            {new Date(trip.startDate).toLocaleDateString()} - {new Date(trip.endDate).toLocaleDateString()}
          </p>
        )}
      </div>

      {/* Trip Details Card */}
      {(trip.description || trip.destination) && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Trip Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {trip.description && (
              <div>
                <h4 className="font-medium text-gray-900 mb-1">Description</h4>
                <p className="text-sm text-gray-600">{trip.description}</p>
              </div>
            )}
            {trip.destination && trip.startDate && trip.endDate && (
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Destination:</span>
                  <p className="font-medium">{trip.destination}</p>
                </div>
                <div>
                  <span className="text-gray-500">Duration:</span>
                  <p className="font-medium">
                    {Math.ceil((new Date(trip.endDate).getTime() - new Date(trip.startDate).getTime()) / (1000 * 60 * 60 * 24))} days
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-yellow-600" />
            Current Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">RSVP Status:</span>
            <Badge className={getStatusColor()}>
              {getRSVPStatusMessage()}
            </Badge>
          </div>
          
          <Separator />
          
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Payment Status:</span>
            <span className="text-sm text-gray-600">{getPaymentStatusMessage()}</span>
          </div>

          {trip.requiresDownPayment && (
            <>
              <Separator />
              
              <div className="space-y-3">
                <h4 className="font-medium text-gray-900 flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  Payment Information
                </h4>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Amount Due:</span>
                    <p className="font-medium">${trip.downPaymentAmount}</p>
                  </div>
                  
                  {member.paymentMethod && (
                    <div>
                      <span className="text-gray-500">Payment Method:</span>
                      <p className="font-medium">{formatPaymentMethod(member.paymentMethod)}</p>
                    </div>
                  )}
                </div>
                
                {(member.paymentStatus === 'submitted' || member.paymentStatus === 'pending') && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-sm text-blue-800">
                      <strong>Payment Submitted:</strong> The organizer needs to confirm your payment before you can access trip features.
                    </p>
                  </div>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-start gap-3">
            <Bell className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <h3 className="font-medium text-gray-900 mb-1">What happens next?</h3>
              <p className="text-sm text-gray-600 mb-3">
                You'll receive a notification once your RSVP is confirmed by the organizer.
              </p>
              
              <div className="text-sm text-gray-600 space-y-1">
                <p><strong>Once confirmed, you'll have access to:</strong></p>
                <ul className="list-disc list-inside ml-4 space-y-1">
                  <li>Trip chat and messaging</li>
                  <li>Expense tracking and splitting</li>
                  <li>Activity planning and polls</li>
                  <li>Flight coordination</li>
                  <li>All trip management features</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="text-center mt-8">
        <p className="text-sm text-gray-500">
          Questions about your RSVP? Contact the trip organizer for assistance.
        </p>
      </div>
    </div>
  );
}