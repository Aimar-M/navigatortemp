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
  const [inviteLinks, setInviteLinks] = useState<InvitationLink[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);
  const [activeTab, setActiveTab] = useState("username");
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
  });
  
  // Query for fetching all trips to find common travelers
  const { data: allTrips = [], isLoading: isLoadingTrips } = useQuery({
    queryKey: ["/api/trips"],
    enabled: isOpen,
  });
  
  // Generate suggested travel companions
  const suggestedCompanions = useMemo(() => {
    if (!members.length || !allTrips.length) return [];
    
    // Get current trip members ids to avoid suggesting existing members
    const currentMemberIds = members.map((member: any) => member.userId);
    
    // Find other trips that current members have been part of
    const otherTripIds = allTrips
      .filter((trip: any) => trip.id !== tripId)
      .map((trip: any) => trip.id);
    
    // Create a list of suggested companions (users who've traveled with this group before)
    const suggestedUsers: Record<string, SuggestedCompanion> = {};
    
    // Find users from other trips that aren't already in this trip
    allTrips.forEach((trip: any) => {
      if (trip.id !== tripId && trip.memberCount > 0) {
        // Suggest users who aren't already in this trip
        trip.confirmedMembers?.forEach((memberId: number) => {
          if (!currentMemberIds.includes(memberId) && !suggestedUsers[memberId]) {
            // Find the user details from members
            const user = members.find((m: any) => m.userId === memberId)?.user;
            if (user) {
              suggestedUsers[memberId] = {
                id: memberId,
                name: user.name,
                username: user.username,
                avatar: user.avatar
              };
            }
          }
        });
      }
    });
    
    return Object.values(suggestedUsers);
  }, [members, allTrips, tripId]);

  const fetchInvitationLinks = async () => {
    try {
      const links = await apiRequest<InvitationLink[]>("GET", `/api/trips/${tripId}/invites`);
      setInviteLinks(links);
    } catch (error) {
      console.error("Failed to fetch invitation links", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return;
    
    setIsSubmitting(true);
    try {
      await apiRequest("POST", `/api/trips/${tripId}/members`, { username });
      toast({
        title: "Invitation sent",
        description: `Invitation sent to ${username}`,
      });
      setUsername("");
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
                <div className="flex items-center space-x-2">
                  <Input
                    placeholder="Enter username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                  />
                </div>
                
                {/* Past Travel Companions Section */}
                {pastCompanions.length > 0 && (
                  <div className="mt-6 space-y-3">
                    <h3 className="text-sm font-medium text-gray-700 mb-2">
                      People you've traveled with before
                    </h3>
                    <div className="max-h-[200px] overflow-y-auto space-y-3">
                      {pastCompanions.map((companion) => (
                        <Card key={companion.userId} className="border border-gray-200 overflow-hidden group hover:border-primary-300">
                          <CardContent className="p-3 flex items-center justify-between">
                            <div className="flex items-center">
                              <Avatar className="h-10 w-10 mr-3">
                                {companion.user.avatar ? (
                                  <AvatarImage src={companion.user.avatar} alt={companion.user.name || companion.user.username} />
                                ) : (
                                  <AvatarFallback className="bg-primary-100 text-primary-800">
                                    {companion.user.name ? companion.user.name.charAt(0).toUpperCase() : 
                                     companion.user.username.charAt(0).toUpperCase()}
                                  </AvatarFallback>
                                )}
                              </Avatar>
                              <div className="overflow-hidden">
                                <div className="font-medium text-gray-900 text-sm truncate">
                                  {companion.user.name || companion.user.username}
                                </div>
                                <div className="flex items-center text-xs text-gray-500 mt-0.5">
                                  <Clock className="h-3 w-3 mr-1" />
                                  <span>Last trip: {companion.lastTripName}</span>
                                </div>
                                <div className="text-xs text-gray-500">
                                  <Badge variant="outline" className="mt-1 px-1.5 py-0 text-[10px]">
                                    {companion.tripCount} trip{companion.tripCount !== 1 ? 's' : ''} together
                                  </Badge>
                                </div>
                              </div>
                            </div>
                            <Button 
                              type="button" 
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0 rounded-full"
                              onClick={() => {
                                setUsername(companion.user.username);
                                toast({
                                  title: "Username selected",
                                  description: `Added ${companion.user.username} to invitation field`,
                                });
                              }}
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Loading State */}
                {isLoadingCompanions && (
                  <div className="py-3 text-center text-sm text-gray-500">
                    Loading past travel companions...
                  </div>
                )}
                
                {/* Empty State */}
                {!isLoadingCompanions && pastCompanions.length === 0 && (
                  <div className="py-3 text-center text-sm text-gray-500">
                    No past travel companions found
                  </div>
                )}
              </div>
              <DialogFooter className="mt-4 sm:justify-between">
                <Button type="button" variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting || !username.trim()}>
                  {isSubmitting ? "Sending..." : "Send Invitation"}
                </Button>
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
