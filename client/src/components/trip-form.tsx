import { useState } from "react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { getRandomDestinationImage } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import CityAutocomplete from "@/components/city-autocomplete";

interface TripFormProps {
  onComplete?: () => void;
}

export default function TripForm({ onComplete }: TripFormProps) {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState(1);
  const [totalSteps] = useState(3);
  const [formData, setFormData] = useState({
    name: "",
    destination: "",
    startDate: "",
    endDate: "",
    description: "",
    requiresDownPayment: false,
    downPaymentAmount: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type, checked } = e.target as HTMLInputElement;
    setFormData((prev) => ({ 
      ...prev, 
      [name]: type === 'checkbox' ? checked : value 
    }));
  };

  const nextStep = () => {
    // Only move to the next step within the form, not to another page
    if (step < totalSteps) {
      setStep((prev) => prev + 1);
    }
  };

  const prevStep = () => {
    setStep((prev) => Math.max(prev - 1, 1));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast({
        title: "Authentication required",
        description: "You need to be logged in to create a trip.",
        variant: "destructive",
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Convert string dates to Date objects for the server
      const startDate = new Date(formData.startDate);
      const endDate = new Date(formData.endDate);
      
      const tripData = {
        ...formData,
        organizer: user.id,
        cover: getRandomDestinationImage(),
        status: "planning",
        startDate,
        endDate,
        downPaymentAmount: formData.requiresDownPayment ? formData.downPaymentAmount : null,
      };
      
      // Use fetch directly with authentication token
      const token = localStorage.getItem('auth_token');
      const response = await fetch("/api/trips", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify(tripData),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Trip creation failed:', errorData);
        throw new Error(errorData.message || 'Failed to create trip');
      }
      
      const trip = await response.json();
      
      toast({
        title: "Trip created",
        description: "Your trip has been created successfully.",
      });
      
      queryClient.invalidateQueries({ queryKey: ["/api/trips"] });
      
      if (onComplete) {
        onComplete();
      } else {
        navigate(`/trips/${trip.id}`);
      }
    } catch (error) {
      toast({
        title: "Failed to create trip",
        description: error instanceof Error ? error.message : "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <>
            <div className="mb-4">
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Trip Name
              </label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g., Summer Beach Vacation"
                required
              />
            </div>

            <div className="mb-4">
              <label htmlFor="destination" className="block text-sm font-medium text-gray-700 mb-1">
                Destination
              </label>
              <CityAutocomplete
                id="destination"
                name="destination"
                value={formData.destination}
                onChange={(value) => setFormData(prev => ({ ...prev, destination: value }))}
                placeholder="Where are you going?"
                required
              />
            </div>

            <div className="mb-4 grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date
                </label>
                <Input
                  type="date"
                  id="startDate"
                  name="startDate"
                  value={formData.startDate}
                  onChange={handleChange}
                  required
                />
              </div>
              <div>
                <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-1">
                  End Date
                </label>
                <Input
                  type="date"
                  id="endDate"
                  name="endDate"
                  value={formData.endDate}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>
          </>
        );
      case 2:
        return (
          <div className="space-y-4">
            <div className="mb-4">
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                Trip Description
              </label>
              <Textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="What's this trip about? Add details to help your friends understand what to expect."
                rows={5}
              />
            </div>
            
            <div className="border-t pt-4">
              <h3 className="text-lg font-medium text-gray-900 mb-3">Payment Options</h3>
              
              <div className="mb-4">
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    name="requiresDownPayment"
                    checked={formData.requiresDownPayment}
                    onChange={handleChange}
                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Require down payment before RSVP confirmation
                  </span>
                </label>
                <p className="text-sm text-gray-500 mt-1 ml-7">
                  Members must submit payment before their RSVP is confirmed and they gain full access to trip features.
                </p>
              </div>
              
              {formData.requiresDownPayment && (
                <div className="ml-7">
                  <label htmlFor="downPaymentAmount" className="block text-sm font-medium text-gray-700 mb-1">
                    Down Payment Amount ($)
                  </label>
                  <Input
                    type="number"
                    id="downPaymentAmount"
                    name="downPaymentAmount"
                    value={formData.downPaymentAmount}
                    onChange={handleChange}
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    className="w-full max-w-xs"
                  />
                </div>
              )}
            </div>
          </div>
        );
      case 3:
        return (
          <div className="mb-4">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Trip Summary</h3>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm font-medium text-gray-700">Trip Name:</p>
              <p className="text-sm text-gray-900 mb-2">{formData.name}</p>
              
              <p className="text-sm font-medium text-gray-700">Destination:</p>
              <p className="text-sm text-gray-900 mb-2">{formData.destination}</p>
              
              <p className="text-sm font-medium text-gray-700">Dates:</p>
              <p className="text-sm text-gray-900 mb-2">
                {formData.startDate} to {formData.endDate}
              </p>
              
              {formData.description && (
                <>
                  <p className="text-sm font-medium text-gray-700">Description:</p>
                  <p className="text-sm text-gray-900 mb-2">{formData.description}</p>
                </>
              )}
              
              {formData.requiresDownPayment && (
                <>
                  <p className="text-sm font-medium text-gray-700">Down Payment:</p>
                  <p className="text-sm text-gray-900 mb-2">
                    ${formData.downPaymentAmount} required before RSVP confirmation
                  </p>
                </>
              )}
            </div>
            <div className="mt-4">
              <p className="text-sm font-medium text-primary-700">
                Please review the trip details above before clicking "Create Trip" to confirm.
              </p>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  const isStepValid = () => {
    switch (step) {
      case 1:
        return (
          formData.name.trim() !== "" &&
          formData.destination.trim() !== "" &&
          formData.startDate !== "" &&
          formData.endDate !== ""
        );
      case 2:
        // Description is optional, but down payment amount is required if down payment is enabled
        return !formData.requiresDownPayment || (formData.downPaymentAmount.trim() !== "" && parseFloat(formData.downPaymentAmount) > 0);
      case 3:
        return true;
      default:
        return false;
    }
  };

  return (
    <Card className="w-full max-w-xl mx-auto">
      <CardHeader>
        <CardTitle>Plan a New Trip</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <h4 className="text-sm font-medium text-gray-900">
              {step === 1 && "Trip Basics"}
              {step === 2 && "Trip Details"}
              {step === 3 && "Review & Create"}
            </h4>
            <div className="flex items-center">
              <span className="text-xs text-gray-500 mr-2">
                {step} of {totalSteps}
              </span>
              <div className="w-16 h-1 bg-gray-200 rounded-full">
                <div
                  className="h-1 bg-primary-600 rounded-full"
                  style={{ width: `${(step / totalSteps) * 100}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          {renderStep()}
          
          <div className="flex justify-between mt-6">
            {step > 1 ? (
              <Button type="button" variant="outline" onClick={prevStep}>
                Back
              </Button>
            ) : (
              <div></div>
            )}
            
            {step < totalSteps ? (
              <Button
                type="button"
                onClick={nextStep}
                disabled={!isStepValid()}
              >
                Next
              </Button>
            ) : (
              <Button
                type="submit"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Creating..." : "Create Trip"}
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
