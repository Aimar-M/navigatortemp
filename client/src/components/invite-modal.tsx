import { useState, useEffect, useMemo } from "react";
import { Copy, Link, Share2, X, Users, Clock, Plus, UserPlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { useQuery } from "@tanstack/react-query";

interface InviteModalProps {
  tripId: number;
  isOpen: boolean;
  onClose: () => void;
}

interface InvitationLink {
  id: number;
  token: string;
  createdAt: string;
  expiresAt: string | null;
  inviteUrl: string;
}

interface SuggestedCompanion {
  id: number;
  name?: string;
  username: string;
  avatar?: string | null;
}

export default function InviteModal({ tripId, isOpen, onClose }: InviteModalProps) {
  const [username, setUsername] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [validationState, setValidationState] = useState<Record<string, boolean>>({});
  const [inviteLinks, setInviteLinks] = useState<InvitationLink[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);
  const [activeTab, setActiveTab] = useState("username");
  const [isValidating, setIsValidating] = useState(false);
  const { toast } = useToast();

  // Fetch existing invitation links when the modal opens
  useEffect(() => {
    if (isOpen && tripId) {
      fetchInvitationLinks();
    }
  }, [isOpen, tripId]);

  // Query for fetching trip members to suggest past travel companions
  const { data: members = [], isLoading: isLoadingMembers } = useQuery({
    queryKey: [`/api/trips/${tripId}/members`],
    enabled: isOpen && tripId > 0,
    staleTime: 60000, // Cache for 1 minute
  });
  
  // Query for fetching all trips to find common travelers
  const { data: allTrips = [], isLoading: isLoadingTrips } = useQuery({
    queryKey: ["/api/trips"],
    enabled: isOpen,
    staleTime: 60000, // Cache for 1 minute
  });
  
  // Fetch past companions (users who have been on trips with the current user)
  const { data: pastCompanions = [], isLoading: isLoadingCompanions } = useQuery({
    queryKey: [`/api/trips/${tripId}/past-companions`],
    enabled: isOpen && tripId > 0,
    staleTime: 60000, // Cache for 1 minute
  });
  
  // Convert past companions to the format we need for display
  const suggestedCompanions = useMemo(() => {
    if (!Array.isArray(pastCompanions)) return [];
    
    return pastCompanions.map((companion: any) => ({
      id: companion.userId,
      name: companion.user?.name,
      username: companion.user?.username || `user-${companion.userId}`,
      avatar: companion.user?.avatar,
      tripCount: companion.tripCount || 1,
      lastTripName: companion.lastTripName
    }));
  }, [pastCompanions]);

  const fetchInvitationLinks = async () => {
    try {
      const links = await apiRequest<InvitationLink[]>("GET", `/api/trips/${tripId}/invites`);
      setInviteLinks(links);
    } catch (error) {
      console.error("Failed to fetch invitation links", error);
    }
  };

  // Validate a username against the server
  const validateUsername = async (usernameToCheck: string) => {
    if (!usernameToCheck.trim()) return false;
    
    setIsValidating(true);
    try {
      // Call the API to check if username exists
      const response = await fetch(`/api/users/validate?username=${encodeURIComponent(usernameToCheck)}`);
      const isValid = response.ok;
      
      // Update validation state
      setValidationState(prev => ({
        ...prev,
        [usernameToCheck]: isValid
      }));
      
      return isValid;
    } catch (error) {
      console.error("Error validating username:", error);
      return false;
    } finally {
      setIsValidating(false);
    }
  };
  
  // Toggle a user selection for batch invites
  const toggleUserSelection = (username: string) => {
    setSelectedUsers(prev => {
      if (prev.includes(username)) {
        // Remove user from selection
        const newSelection = prev.filter(u => u !== username);
        // Update input field to show the remaining selections
        setUsername(newSelection.join(", "));
        return newSelection;
      } else {
        // Add user to selection
        const newSelection = [...prev, username];
        // Update input field to show all selections
        setUsername(newSelection.join(", "));
        return newSelection;
      }
    });
  };
  
  // Parse multiple usernames from input field (comma or space separated)
  const parseUsernames = (input: string): string[] => {
    if (!input.trim()) return [];
    
    // Split by commas or spaces
    return input
      .split(/[,\s]+/)
      .map(name => name.trim())
      .filter(name => name.length > 0);
  };

  // Send invitations to all selected users
  const sendMultipleInvitations = async () => {
    if (selectedUsers.length === 0) return;
    
    setIsSubmitting(true);
    try {
      // Send invitations in parallel
      const results = await Promise.allSettled(
        selectedUsers.map(username => 
          apiRequest("POST", `/api/trips/${tripId}/members`, { username })
        )
      );
      
      // Count successful invitations
      const successful = results.filter(r => r.status === 'fulfilled').length;
      
      toast({
        title: "Invitations sent",
        description: `Successfully sent ${successful} of ${selectedUsers.length} invitations`,
      });
      
      // Clear selected users
      setSelectedUsers([]);
      queryClient.invalidateQueries({ queryKey: [`/api/trips/${tripId}/members`] });
    } catch (error) {
      toast({
        title: "Error sending invitations",
        description: error instanceof Error ? error.message : "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle changes to username input field
  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value;
    setUsername(input);
    
    // Parse usernames and update selected users
    const parsedUsernames = parseUsernames(input);
    setSelectedUsers(parsedUsernames);
  };
  
  // Handle submission of form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Parse input to get all usernames (supports comma/space separated values)
    const usernamesToInvite = parseUsernames(username);
    
    // If no usernames entered, don't do anything
    if (usernamesToInvite.length === 0) return;
    
    // For multiple users, use batch invitation
    if (usernamesToInvite.length > 1) {
      setSelectedUsers(usernamesToInvite);
      await sendMultipleInvitations();
      return;
    }
    
    // For single username, proceed with single invitation
    const singleUsername = usernamesToInvite[0];
    setIsSubmitting(true);
    
    try {
      await apiRequest("POST", `/api/trips/${tripId}/members`, { username: singleUsername });
      toast({
        title: "Invitation sent",
        description: `Invitation sent to ${singleUsername}`,
      });
      
      // Clear the input and selected users after successful invitation
      setUsername("");
      setSelectedUsers([]);
      queryClient.invalidateQueries({ queryKey: [`/api/trips/${tripId}/members`] });
    } catch (error) {
      toast({
        title: "Failed to send invitation",
        description: error instanceof Error ? error.message : "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const generateInviteLink = async () => {
    setIsGeneratingLink(true);
    try {
      const link = await apiRequest<InvitationLink>("POST", `/api/trips/${tripId}/invite`, {});
      setInviteLinks([link, ...inviteLinks]);
      toast({
        title: "Invitation link created",
        description: "Share this link with friends to invite them to your trip!",
      });
    } catch (error) {
      toast({
        title: "Failed to create invitation link",
        description: error instanceof Error ? error.message : "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingLink(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(
      () => {
        toast({
          title: "Link copied",
          description: "Invitation link copied to clipboard",
        });
      },
      (err) => {
        console.error("Failed to copy: ", err);
        toast({
          title: "Copy failed",
          description: "Could not copy the link to clipboard",
          variant: "destructive",
        });
      }
    );
  };

  const formatExpiryDate = (dateString: string | null) => {
    if (!dateString) return "Never expires";
    const date = new Date(dateString);
    return date.toLocaleDateString() + " at " + date.toLocaleTimeString();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invite Friends</DialogTitle>
          <DialogDescription>
            Invite friends to join your trip using a username or shareable link.
          </DialogDescription>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="username" className="flex items-center">
              <Users className="h-4 w-4 mr-2" />
              By Username
            </TabsTrigger>
            <TabsTrigger value="link" className="flex items-center">
              <Link className="h-4 w-4 mr-2" />
              Share Link
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="username">
            <form onSubmit={handleSubmit}>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <div className="relative">
                    <Input
                      placeholder="Enter username(s), separate with comma or space"
                      value={username}
                      onChange={handleUsernameChange}
                      className={selectedUsers.length > 0 ? "bg-primary-50 border-primary-300" : ""}
                    />
                    {isValidating && (
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        <div className="animate-spin h-4 w-4 border-2 border-primary-500 border-t-transparent rounded-full" />
                      </div>
                    )}
                  </div>
                  
                  {selectedUsers.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {selectedUsers.map(user => (
                        <Badge 
                          key={user} 
                          className="px-2 py-1 flex items-center gap-1 bg-primary-100 text-primary-800 hover:bg-primary-200"
                          onClick={() => {
                            // Remove this user from selection
                            const newSelection = selectedUsers.filter(u => u !== user);
                            setSelectedUsers(newSelection);
                            setUsername(newSelection.join(", "));
                          }}
                        >
                          {user}
                          <X className="h-3 w-3 cursor-pointer" />
                        </Badge>
                      ))}
                    </div>
                  )}
                  
                  <p className="text-xs text-gray-500 mt-1">
                    Enter multiple usernames separated by commas or spaces
                  </p>
                </div>
                
                {/* Past Travel Companions Section */}
                {suggestedCompanions.length > 0 && (
                  <div className="mt-6 space-y-3">
                    <h3 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                      <UserPlus className="h-4 w-4 mr-1.5 text-primary-500" />
                      People you've traveled with
                    </h3>
                    <div className="max-h-[200px] overflow-y-auto space-y-3">
                      {suggestedCompanions.map((companion) => (
                        <Card 
                          key={companion.id} 
                          className={`border overflow-hidden group transition-all duration-300 cursor-pointer
                            ${selectedUsers.includes(companion.username) 
                              ? 'border-primary-500 bg-primary-50 shadow-sm' 
                              : 'border-gray-200 hover:border-primary-300 hover:shadow-sm'}`}
                          onClick={() => toggleUserSelection(companion.username)}
                        >
                          <CardContent className="p-3 flex items-center justify-between">
                            <div className="flex items-center">
                              <Avatar className={`h-10 w-10 mr-3 ${selectedUsers.includes(companion.username) ? 'ring-2 ring-primary-500 ring-offset-2' : ''}`}>
                                {companion.avatar ? (
                                  <AvatarImage src={companion.avatar} alt={companion.name || companion.username} />
                                ) : (
                                  <AvatarFallback className={`${selectedUsers.includes(companion.username) ? 'bg-primary-200 text-primary-900' : 'bg-primary-100 text-primary-800'}`}>
                                    {companion.name ? companion.name.charAt(0).toUpperCase() : 
                                     companion.username.charAt(0).toUpperCase()}
                                  </AvatarFallback>
                                )}
                              </Avatar>
                              <div className="overflow-hidden">
                                <div className="font-medium text-gray-900 text-sm truncate">
                                  {companion.name || companion.username}
                                </div>
                                {companion.lastTripName && (
                                  <div className="flex items-center text-xs text-gray-500 mt-0.5">
                                    <Clock className="h-3 w-3 mr-1" />
                                    <span>Last trip: {companion.lastTripName}</span>
                                  </div>
                                )}
                                {companion.tripCount > 0 && (
                                  <div className="text-xs text-gray-500">
                                    <Badge variant={selectedUsers.includes(companion.username) ? "default" : "outline"} className="mt-1 px-1.5 py-0 text-[10px]">
                                      {companion.tripCount} trip{companion.tripCount !== 1 ? 's' : ''} together
                                    </Badge>
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center space-x-1">
                              {selectedUsers.includes(companion.username) ? (
                                <Button 
                                  type="button" 
                                  size="sm"
                                  variant="secondary"
                                  className="h-8 w-8 p-0 rounded-full bg-primary-100"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleUserSelection(companion.username);
                                  }}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              ) : (
                                <Button 
                                  type="button" 
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 w-8 p-0 rounded-full opacity-70 group-hover:opacity-100 group-hover:bg-primary-50 transition-all duration-300"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleUserSelection(companion.username);
                                  }}
                                >
                                  <Plus className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Loading State */}
                {isLoadingCompanions && (
                  <div className="py-3 text-center text-sm text-gray-500">
                    Looking for past travel companions...
                  </div>
                )}
                
                {/* Empty State */}
                {!isLoadingCompanions && suggestedCompanions.length === 0 && (
                  <div className="py-3 text-center text-sm text-gray-500">
                    No past travel companions found
                  </div>
                )}
              </div>
              <DialogFooter className="mt-4 sm:justify-between">
                <div className="flex items-center gap-2">
                  <Button type="button" variant="outline" onClick={onClose}>
                    Cancel
                  </Button>
                  {selectedUsers.length > 0 && (
                    <Badge variant="secondary" className="px-2 py-1">
                      {selectedUsers.length} selected
                    </Badge>
                  )}
                </div>
                
                {selectedUsers.length > 0 ? (
                  <Button 
                    type="button" 
                    disabled={isSubmitting}
                    onClick={sendMultipleInvitations}
                    className="bg-primary-600 hover:bg-primary-700"
                  >
                    {isSubmitting ? "Sending..." : `Invite ${selectedUsers.length} users`}
                  </Button>
                ) : (
                  <Button 
                    type="submit" 
                    disabled={isSubmitting || !username.trim()}
                  >
                    {isSubmitting ? "Sending..." : "Send Invitation"}
                  </Button>
                )}
              </DialogFooter>
            </form>
          </TabsContent>
          
          <TabsContent value="link">
            <div className="space-y-4 py-2">
              <div className="flex flex-col gap-3">
                {inviteLinks.length > 0 ? (
                  <>
                    <p className="text-sm text-gray-500">Share any of these invitation links with your friends:</p>
                    <div className="max-h-48 overflow-y-auto space-y-2">
                      {inviteLinks.map((link) => (
                        <Card key={link.id} className="border border-gray-200">
                          <CardContent className="p-3">
                            <div className="text-xs text-gray-500 mb-1">
                              Expires: {formatExpiryDate(link.expiresAt)}
                            </div>
                            <div className="flex flex-col gap-2">
                              <div className="text-sm border p-2 rounded border-gray-200 bg-gray-50">
                                <div className="w-full overflow-hidden">
                                  <p className="text-xs text-gray-700 break-all">{
                                    // Show a shortened version of the link
                                    link.inviteUrl.length > 60 
                                      ? link.inviteUrl.substring(0, 60) + "..." 
                                      : link.inviteUrl
                                  }</p>
                                </div>
                              </div>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => copyToClipboard(link.inviteUrl)}
                                className="h-8 px-2 w-full"
                              >
                                <Copy className="h-3.5 w-3.5 mr-2" />
                                Copy Link
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-gray-500 py-2">No invitation links created yet. Generate a link to share with your friends.</p>
                )}
                
                <Button 
                  variant="default" 
                  className="w-full" 
                  onClick={generateInviteLink}
                  disabled={isGeneratingLink}
                >
                  <Share2 className="h-4 w-4 mr-2" />
                  {isGeneratingLink ? "Generating..." : "Generate New Invitation Link"}
                </Button>
              </div>
            </div>
            <DialogFooter className="mt-4 sm:justify-start">
              <Button type="button" variant="outline" onClick={onClose}>
                Close
              </Button>
            </DialogFooter>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
