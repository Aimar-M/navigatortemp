import express, { type Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { 
  insertUserSchema, insertTripSchema, insertTripMemberSchema, 
  insertActivitySchema, insertActivityRsvpSchema, insertMessageSchema,
  insertSurveyQuestionSchema, insertSurveyResponseSchema, insertInvitationLinkSchema,
  insertExpenseSchema, insertFlightInfoSchema, insertPollSchema, insertPollVoteSchema,
  User
} from "@shared/schema";
import { z } from "zod";

interface WebSocketClient extends WebSocket {
  userId?: number;
  tripIds?: number[];
}

interface MessageEvent {
  type: string;
  data: any;
}

export async function registerRoutes(app: Express): Promise<Server> {
  const router = express.Router();
  const httpServer = createServer(app);
  
  // Helper function to check for authenticated user
  const ensureUser = (req: Request, res: Response): User | null => {
    if (!req.user) {
      res.status(401).json({ message: 'Authentication required' });
      return null;
    }
    return req.user;
  };
  
  // We'll use a simple token system for authentication
  // No middleware needed
  
  // Setup WebSocket server for real-time chat
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  wss.on('connection', (ws: WebSocketClient) => {
    ws.on('message', async (message) => {
      try {
        const event: MessageEvent = JSON.parse(message.toString());
        
        if (event.type === 'auth') {
          // Authenticate the WebSocket connection
          const { userId, tripIds } = event.data;
          ws.userId = userId;
          ws.tripIds = tripIds;
        } else if (event.type === 'chat_message' && ws.userId) {
          // Handle new chat messages
          const { tripId, content } = event.data;
          
          // Save message to database
          const message = await storage.createMessage({
            tripId,
            userId: ws.userId,
            content
          });
          
          // Broadcast to all clients in this trip
          broadcastToTrip(wss, tripId, {
            type: 'new_message',
            data: message
          });
        }
      } catch (err) {
        console.error('WebSocket message error:', err);
      }
    });
  });
  
  // Helper function to broadcast messages to all clients in a trip
  function broadcastToTrip(wss: WebSocketServer, tripId: number, message: any) {
    wss.clients.forEach((client: WebSocketClient) => {
      if (client.readyState === WebSocket.OPEN && client.tripIds?.includes(tripId)) {
        client.send(JSON.stringify(message));
      }
    });
  }
  
  // Username validation endpoint
  router.get('/users/validate', async (req: Request, res: Response) => {
    const { username } = req.query;
    
    if (!username || typeof username !== 'string') {
      return res.status(400).json({ message: 'Username parameter is required' });
    }
    
    try {
      const user = await storage.getUserByUsername(username);
      if (user) {
        return res.status(200).json({ valid: true, userId: user.id });
      } else {
        return res.status(404).json({ valid: false, message: 'Username not found' });
      }
    } catch (error) {
      console.error('Error validating username:', error);
      return res.status(500).json({ message: 'Server error' });
    }
  });
  
  // Check if user is already a member of a trip
  router.get('/trips/:id/check-member', async (req: Request, res: Response) => {
    const { id } = req.params;
    const { username } = req.query;
    
    if (!username || typeof username !== 'string') {
      return res.status(400).json({ message: 'Username parameter is required' });
    }
    
    try {
      // First find the user
      const user = await storage.getUserByUsername(username);
      if (!user) {
        return res.status(404).json({ isMember: false, message: 'User not found' });
      }
      
      // Then check if they're a member
      const tripId = parseInt(id);
      const members = await storage.getTripMembers(tripId);
      const isMember = members.some(member => member.userId === user.id);
      
      return res.status(200).json({ 
        isMember,
        message: isMember ? 'User is already a member of this trip' : 'User is not a member of this trip'
      });
    } catch (error) {
      console.error('Error checking trip membership:', error);
      return res.status(500).json({ message: 'Server error' });
    }
  });
  
  // Auth Routes
  router.post('/auth/register', async (req: Request, res: Response) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      
      // Check if username already exists
      const existingUser = await storage.getUserByUsername(userData.username);
      if (existingUser) {
        return res.status(400).json({ message: 'Username already taken' });
      }
      
      // Check if email already exists
      const existingEmail = await storage.getUserByEmail(userData.email);
      if (existingEmail) {
        return res.status(400).json({ message: 'Email already registered' });
      }
      
      // Create user
      const user = await storage.createUser(userData);
      
      // Don't send password in the response
      const { password, ...userWithoutPassword } = user;
      
      // Generate token (in this simple implementation, just use the user ID)
      const token = user.id.toString();
      
      // Return user data with token
      res.status(201).json({
        ...userWithoutPassword,
        token
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid data', errors: error.errors });
      }
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  router.post('/auth/login', async (req: Request, res: Response) => {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ message: 'Username and password are required' });
      }
      
      // Debug log to help diagnose issues
      console.log(`Attempting login for user: ${username}`);
      
      const user = await storage.getUserByUsername(username);
      
      // Debug log to check if user was found
      console.log('User found in database:', !!user);
      
      if (!user || user.password !== password) {
        console.log('Login failed: Invalid username or password');
        return res.status(401).json({ message: 'Invalid username or password' });
      }
      
      // Don't send password in the response
      const { password: _, ...userWithoutPassword } = user;
      
      // Generate token (in this simple implementation, just use the user ID)
      const token = `${user.id}`;
      
      console.log('Login successful for:', username);
      
      // Return user data with token
      res.json({
        ...userWithoutPassword,
        token
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  router.post('/auth/logout', (req: Request, res: Response) => {
    if (req.session) {
      req.session.destroy((err: Error | null) => {
        if (err) {
          return res.status(500).json({ message: 'Could not log out' });
        }
        res.json({ message: 'Logged out successfully' });
      });
    } else {
      res.json({ message: 'No active session' });
    }
  });
  
  router.get('/auth/me', async (req: Request, res: Response) => {
    try {
      // Check for token-based authentication first
      const authHeader = req.headers.authorization;
      
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        
        // In this simple implementation, token is the user ID + '_token'
        const userId = parseInt(token.split('_')[0]);
        
        if (!isNaN(userId)) {
          const user = await storage.getUser(userId);
          if (user) {
            // Don't send password in the response
            const { password, ...userWithoutPassword } = user;
            return res.json(userWithoutPassword);
          }
        }
      }
      
      // Fallback to session-based auth if token auth fails
      if (!req.session?.userId) {
        return res.status(401).json({ message: 'Not authenticated' });
      }
      
      const user = await storage.getUser(req.session.userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Don't send password in the response
      const { password, ...userWithoutPassword } = user;
      
      res.json(userWithoutPassword);
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  // Middleware to check if user is authenticated
  const isAuthenticated = async (req: Request, res: Response, next: Function) => {
    try {
      // Check for token (bearer) authentication
      const authHeader = req.headers.authorization;
      
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        
        if (token) {
          // In this simple implementation, token is the user ID + '_token' or just the user ID
          const userId = parseInt(token.split('_')[0]);
          if (!isNaN(userId)) {
            const user = await storage.getUser(userId);
            if (user) {
              req.user = user;
              return next();
            }
          }
        }
      }
      
      // Fall back to checking the session
      if (req.session && req.session.userId) {
        const user = await storage.getUser(req.session.userId);
        if (user) {
          req.user = user;
          return next();
        }
      }
      
      res.status(401).json({ message: 'Authentication required' });
    } catch (error) {
      console.error('Auth error:', error);
      res.status(401).json({ message: 'Authentication error' });
    }
  };
  
  // Trip Routes
  router.post('/trips', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = ensureUser(req, res);
      if (!user) return; // Response already sent by ensureUser
      
      // Convert string dates to Date objects before validation
      const data = {
        ...req.body,
        startDate: req.body.startDate ? new Date(req.body.startDate) : undefined,
        endDate: req.body.endDate ? new Date(req.body.endDate) : undefined
      };
      
      const tripData = insertTripSchema.parse(data);
      
      // Ensure the authenticated user is the organizer
      if (tripData.organizer !== user.id) {
        return res.status(403).json({ message: 'You can only create trips as yourself' });
      }
      
      const trip = await storage.createTrip(tripData);
      res.status(201).json(trip);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid trip data', errors: error.errors });
      }
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  router.get('/trips', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = ensureUser(req, res);
      if (!user) return; // Response already sent by ensureUser
      
      const trips = await storage.getTripsByUser(user.id);
      const tripMemberships = await storage.getTripMembershipsByUser(user.id);
      
      // Fetch member counts and user settings for each trip
      const tripsWithMemberCounts = await Promise.all(trips.map(async (trip) => {
        const members = await storage.getTripMembers(trip.id);
        // Count only confirmed members
        const confirmedMembers = members.filter(member => member.status === 'confirmed');
        
        // Get user-specific settings for this trip
        const settings = await storage.getUserTripSettings(user.id, trip.id);
        
        // Get the membership status for this trip
        const membership = tripMemberships.find(m => m.tripId === trip.id);
        
        return {
          ...trip,
          memberCount: confirmedMembers.length,
          totalMembers: members.length,
          confirmedMembers: confirmedMembers.map(m => m.userId),
          isPinned: settings?.isPinned || false,
          isArchived: settings?.isArchived || false,
          memberStatus: membership?.status || 'none'
        };
      }));
      
      res.json(tripsWithMemberCounts);
    } catch (error) {
      console.error("Error fetching trips with member counts:", error);
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  router.get('/trips/:id', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = ensureUser(req, res);
      if (!user) return; // Response already sent by ensureUser
      
      const tripId = parseInt(req.params.id);
      if (isNaN(tripId)) {
        return res.status(400).json({ message: 'Invalid trip ID' });
      }
      
      const trip = await storage.getTrip(tripId);
      if (!trip) {
        return res.status(404).json({ message: 'Trip not found' });
      }
      
      // Check if user is a member of the trip
      const members = await storage.getTripMembers(tripId);
      const isMember = members.some(member => member.userId === user.id);
      
      if (!isMember) {
        return res.status(403).json({ message: 'Not a member of this trip' });
      }
      
      res.json(trip);
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  router.put('/trips/:id', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = ensureUser(req, res);
      if (!user) return; // Response already sent by ensureUser
      
      const tripId = parseInt(req.params.id);
      if (isNaN(tripId)) {
        return res.status(400).json({ message: 'Invalid trip ID' });
      }
      
      const trip = await storage.getTrip(tripId);
      if (!trip) {
        return res.status(404).json({ message: 'Trip not found' });
      }
      
      // Check if this is a pin/archive action
      if (req.body.isPinned !== undefined || req.body.isArchived !== undefined) {
        // Any member can pin or archive a trip for their own view
        const memberships = await storage.getTripMembershipsByUser(user.id);
        const isMember = memberships.some(m => m.tripId === tripId);
        
        if (!isMember && trip.organizer !== user.id) {
          return res.status(403).json({ message: 'You must be a member of this trip to pin or archive it' });
        }
        
        // Create or update user-specific trip settings instead of updating the trip itself
        try {
          // Get existing settings or create default values
          const settings = await storage.getUserTripSettings(user.id, tripId) || { 
            userId: user.id, 
            tripId: tripId,
            isPinned: false,
            isArchived: false
          };
          
          // Update with new values
          const updatedSettings = {
            ...settings,
            isPinned: req.body.isPinned !== undefined ? req.body.isPinned : settings.isPinned,
            isArchived: req.body.isArchived !== undefined ? req.body.isArchived : settings.isArchived
          };
          
          // Save user trip settings
          await storage.createOrUpdateUserTripSettings(updatedSettings);
          
          // Return the trip with the user settings applied
          const updatedTrip = {
            ...trip,
            isPinned: updatedSettings.isPinned,
            isArchived: updatedSettings.isArchived
          };
          
          res.json(updatedTrip);
          return;
        } catch (error) {
          console.error("Error updating user trip settings:", error);
          return res.status(500).json({ message: 'Failed to update trip settings' });
        }
      }
      
      // For regular trip updates, only the organizer can make changes
      if (trip.organizer !== user.id) {
        return res.status(403).json({ message: 'Only the trip organizer can update trip details' });
      }
      
      console.log('Received trip update data:', req.body);
      
      // Convert string dates to Date objects before validation
      const bodyWithDates = {
        ...req.body,
        ...(req.body.startDate && { startDate: new Date(req.body.startDate) }),
        ...(req.body.endDate && { endDate: new Date(req.body.endDate) })
      };
      
      const tripData = insertTripSchema.partial().parse(bodyWithDates);
      console.log('Parsed trip data:', tripData);
      const updatedTrip = await storage.updateTrip(tripId, tripData);
      
      res.json(updatedTrip);
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error('Validation errors:', error.errors);
        return res.status(400).json({ message: 'Invalid trip data', errors: error.errors });
      }
      console.error('Server error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  router.delete('/trips/:id', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = ensureUser(req, res);
      if (!user) return; // Response already sent by ensureUser
      
      const tripId = parseInt(req.params.id);
      if (isNaN(tripId)) {
        return res.status(400).json({ message: 'Invalid trip ID' });
      }
      
      const trip = await storage.getTrip(tripId);
      if (!trip) {
        return res.status(404).json({ message: 'Trip not found' });
      }
      
      // Only organizer can delete trip
      if (trip.organizer !== user.id) {
        return res.status(403).json({ message: 'Only the trip organizer can delete the trip' });
      }
      
      await storage.deleteTrip(tripId);
      res.json({ message: 'Trip deleted successfully' });
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  // Trip Members Routes
  router.post('/trips/:id/members', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = ensureUser(req, res);
      if (!user) return; // Response already sent by ensureUser
      
      const tripId = parseInt(req.params.id);
      if (isNaN(tripId)) {
        return res.status(400).json({ message: 'Invalid trip ID' });
      }
      
      const trip = await storage.getTrip(tripId);
      if (!trip) {
        return res.status(404).json({ message: 'Trip not found' });
      }
      
      // Only organizer can add members
      if (trip.organizer !== user.id) {
        return res.status(403).json({ message: 'Only the trip organizer can add members' });
      }
      
      const { username } = req.body;
      if (!username) {
        return res.status(400).json({ message: 'Username is required' });
      }
      
      const userToAdd = await storage.getUserByUsername(username);
      if (!userToAdd) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Check if user is already a member
      const members = await storage.getTripMembers(tripId);
      const existingMember = members.find(member => member.userId === userToAdd.id);
      
      if (existingMember) {
        return res.status(400).json({ message: 'User is already a member of this trip' });
      }
      
      const member = await storage.addTripMember({
        tripId,
        userId: userToAdd.id,
        status: 'pending'
      });
      
      res.status(201).json(member);
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  router.get('/trips/:id/members', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = ensureUser(req, res);
      if (!user) return; // Response already sent by ensureUser
      
      const tripId = parseInt(req.params.id);
      if (isNaN(tripId)) {
        return res.status(400).json({ message: 'Invalid trip ID' });
      }
      
      // Check if user is a member of the trip
      const members = await storage.getTripMembers(tripId);
      const isMember = members.some(member => member.userId === user.id);
      
      if (!isMember) {
        return res.status(403).json({ message: 'Not a member of this trip' });
      }
      
      // Get detailed info about each member
      const membersWithDetails = await Promise.all(
        members.map(async (member) => {
          const user = await storage.getUser(member.userId);
          if (!user) return null;
          
          const { password, ...userWithoutPassword } = user;
          return {
            ...member,
            user: userWithoutPassword
          };
        })
      );
      
      res.json(membersWithDetails.filter(Boolean));
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  // Get travel companions from past trips (for suggestions)
  router.get('/trips/:id/past-companions', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = ensureUser(req, res);
      if (!user) return; // Response already sent by ensureUser
      
      const tripId = parseInt(req.params.id);
      if (isNaN(tripId)) {
        return res.status(400).json({ message: 'Invalid trip ID' });
      }
      
      // Get all trips this user has been a part of
      const userTrips = await storage.getTripsByUser(user.id);
      
      // Include all trips that the user is part of except the current one
      // We want to show all travel connections, not just past trips
      const relevantTrips = userTrips.filter(trip => trip.id !== tripId);
      
      // Get all members from those relevant trips
      const companionsMap = new Map();
      
      await Promise.all(relevantTrips.map(async (trip) => {
        const tripMembers = await storage.getTripMembers(trip.id);
        
        // Include all members who aren't the current user (not just confirmed members)
        for (const member of tripMembers.filter(m => m.userId !== user.id)) {
          // Get the user details for this member
          const memberUser = await storage.getUser(member.userId);
          if (memberUser) {
            if (!companionsMap.has(member.userId)) {
              companionsMap.set(member.userId, {
                userId: member.userId,
                user: memberUser,
                tripCount: 1,
                lastTripName: trip.name,
                lastTripDate: trip.endDate
              });
            } else {
              const companion = companionsMap.get(member.userId);
              companion.tripCount += 1;
              
              // Update last trip if this one is more recent
              const existingDate = new Date(companion.lastTripDate);
              const newDate = new Date(trip.endDate);
              if (newDate > existingDate) {
                companion.lastTripName = trip.name;
                companion.lastTripDate = trip.endDate;
              }
            }
          }
        }
      }));
      
      // Convert map to array and sort by trip count (most frequent companions first)
      const companions = Array.from(companionsMap.values())
        .sort((a, b) => b.tripCount - a.tripCount);
      
      res.json(companions);
    } catch (error) {
      console.error('Error fetching past companions:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  router.put('/trips/:tripId/members/:userId', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = ensureUser(req, res);
      if (!user) return; // Response already sent by ensureUser
      
      const tripId = parseInt(req.params.tripId);
      const userId = parseInt(req.params.userId);
      
      if (isNaN(tripId) || isNaN(userId)) {
        return res.status(400).json({ message: 'Invalid IDs' });
      }
      
      // If user is updating their own status, they must be a member
      // If user is updating someone else's status, they must be the organizer
      const trip = await storage.getTrip(tripId);
      if (!trip) {
        return res.status(404).json({ message: 'Trip not found' });
      }
      
      const isOrganizer = trip.organizer === user.id;
      const isUpdatingSelf = userId === user.id;
      
      if (!isOrganizer && !isUpdatingSelf) {
        return res.status(403).json({ message: 'Not authorized to update this member' });
      }
      
      const { status } = req.body;
      if (!status || !['pending', 'confirmed', 'declined'].includes(status)) {
        return res.status(400).json({ message: 'Invalid status' });
      }
      
      // If not self-update and not organizer, only allow confirming or declining own invitation
      if (isUpdatingSelf && !isOrganizer && status !== 'confirmed' && status !== 'declined') {
        return res.status(403).json({ message: 'Can only confirm or decline your own invitation' });
      }
      
      // Handle "cannot attend" responses - remove member and archive trip for them
      if (status === 'declined') {
        // Archive the trip for this user before removing them
        await storage.createOrUpdateUserTripSettings({
          userId,
          tripId,
          isPinned: false,
          isArchived: true
        });
        
        // Remove the user from the trip
        const removed = await storage.removeTripMember(tripId, userId);
        if (!removed) {
          return res.status(404).json({ message: 'Member not found' });
        }
        
        res.json({ message: 'You have been removed from the trip', status: 'declined' });
      } else {
        const updatedMember = await storage.updateTripMemberStatus(tripId, userId, status);
        if (!updatedMember) {
          return res.status(404).json({ message: 'Member not found' });
        }
        
        res.json(updatedMember);
      }
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  router.delete('/trips/:tripId/members/:userId', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = ensureUser(req, res);
      if (!user) return; // Response already sent by ensureUser
      
      const tripId = parseInt(req.params.tripId);
      const userId = parseInt(req.params.userId);
      
      if (isNaN(tripId) || isNaN(userId)) {
        return res.status(400).json({ message: 'Invalid IDs' });
      }
      
      // Only organizer can remove members (besides themselves)
      const trip = await storage.getTrip(tripId);
      if (!trip) {
        return res.status(404).json({ message: 'Trip not found' });
      }
      
      const isOrganizer = trip.organizer === user.id;
      const isRemovingSelf = userId === user.id;
      
      if (!isOrganizer && !isRemovingSelf) {
        return res.status(403).json({ message: 'Not authorized to remove this member' });
      }
      
      // Organizer cannot remove themselves - they must delete the trip instead
      if (isRemovingSelf && isOrganizer) {
        return res.status(400).json({ message: 'Trip organizer cannot leave. You must delete the trip or transfer ownership first.' });
      }
      
      const success = await storage.removeTripMember(tripId, userId);
      if (!success) {
        return res.status(404).json({ message: 'Member not found' });
      }
      
      res.json({ message: 'Member removed successfully' });
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  // Activity Routes
  router.post('/trips/:id/activities', isAuthenticated, async (req: Request, res: Response) => {
    try {
      console.log('Activity creation request received:', req.body);
      
      const authUser = ensureUser(req, res);
      if (!authUser) return; // Response already sent by ensureUser
      
      const tripId = parseInt(req.params.id);
      if (isNaN(tripId)) {
        console.log('Invalid trip ID');
        return res.status(400).json({ message: 'Invalid trip ID' });
      }
      
      const trip = await storage.getTrip(tripId);
      if (!trip) {
        console.log('Trip not found:', tripId);
        return res.status(404).json({ message: 'Trip not found' });
      }
      
      // Check if user is a confirmed member of the trip
      const members = await storage.getTripMembers(tripId);
      const isMember = members.some(member => 
        member.userId === authUser.id && member.status === 'confirmed'
      );
      
      if (!isMember) {
        console.log('User not a confirmed member:', authUser.id, tripId);
        return res.status(403).json({ message: 'Not a confirmed member of this trip' });
      }
      
      try {
        // Convert date string to Date object before validation
        const data = {
          ...req.body,
          tripId,
          date: req.body.date ? new Date(req.body.date) : undefined
        };
        
        console.log('Activity data before validation:', data);
        
        // Validate the activity data
        const activityData = insertActivitySchema.parse(data);
        console.log('Validated activity data:', activityData);
        
        // Create the activity
        const createdActivity = await storage.createActivity(activityData);
        console.log('Activity created:', createdActivity);
        
        // Auto-RSVP the creator as "going"
        await storage.createActivityRSVP({
          activityId: createdActivity.id,
          userId: authUser.id,
          status: 'going'
        });
        
        res.status(201).json(createdActivity);
      } catch (error) {
        console.error('Error creating activity:', error);
        if (error instanceof z.ZodError) {
          return res.status(400).json({ 
            message: 'Invalid activity data', 
            errors: error.errors 
          });
        }
        throw error; // Pass to outer catch block
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid activity data', errors: error.errors });
      }
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  router.get('/trips/:id/activities', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = ensureUser(req, res);
      if (!user) return; // Response already sent by ensureUser
      
      const tripId = parseInt(req.params.id);
      if (isNaN(tripId)) {
        return res.status(400).json({ message: 'Invalid trip ID' });
      }
      
      // Check if user is a member of the trip
      const members = await storage.getTripMembers(tripId);
      const isMember = members.some(member => member.userId === user.id);
      
      if (!isMember) {
        return res.status(403).json({ message: 'Not a member of this trip' });
      }
      
      const activities = await storage.getActivitiesByTrip(tripId);
      
      // For each activity, get the RSVPs
      const activitiesWithRsvps = await Promise.all(
        activities.map(async (activity) => {
          const rsvps = await storage.getActivityRSVPs(activity.id);
          return {
            ...activity,
            rsvps
          };
        })
      );
      
      res.json(activitiesWithRsvps);
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  router.put('/activities/:id', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = ensureUser(req, res);
      if (!user) return; // Response already sent by ensureUser
      
      const activityId = parseInt(req.params.id);
      if (isNaN(activityId)) {
        return res.status(400).json({ message: 'Invalid activity ID' });
      }
      
      const activity = await storage.getActivity(activityId);
      if (!activity) {
        return res.status(404).json({ message: 'Activity not found' });
      }
      
      // Check if user is the trip organizer
      const trip = await storage.getTrip(activity.tripId);
      if (!trip) {
        return res.status(404).json({ message: 'Trip not found' });
      }
      
      if (trip.organizer !== user.id) {
        return res.status(403).json({ message: 'Only the trip organizer can update activities' });
      }
      
      const activityData = insertActivitySchema.partial().parse(req.body);
      const updatedActivity = await storage.updateActivity(activityId, activityData);
      
      res.json(updatedActivity);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid activity data', errors: error.errors });
      }
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  router.delete('/activities/:id', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = ensureUser(req, res);
      if (!user) return; // Response already sent by ensureUser
      
      const activityId = parseInt(req.params.id);
      if (isNaN(activityId)) {
        return res.status(400).json({ message: 'Invalid activity ID' });
      }
      
      const activity = await storage.getActivity(activityId);
      if (!activity) {
        return res.status(404).json({ message: 'Activity not found' });
      }
      
      // Check if user is the trip organizer
      const trip = await storage.getTrip(activity.tripId);
      if (!trip) {
        return res.status(404).json({ message: 'Trip not found' });
      }
      
      if (trip.organizer !== user.id) {
        return res.status(403).json({ message: 'Only the trip organizer can delete activities' });
      }
      
      const success = await storage.deleteActivity(activityId);
      if (!success) {
        return res.status(404).json({ message: 'Activity not found' });
      }
      
      res.json({ message: 'Activity deleted successfully' });
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  // Activity RSVP Routes
  router.post('/activities/:id/rsvp', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = ensureUser(req, res);
      if (!user) return; // Response already sent by ensureUser
      
      const activityId = parseInt(req.params.id);
      if (isNaN(activityId)) {
        return res.status(400).json({ message: 'Invalid activity ID' });
      }
      
      const activity = await storage.getActivity(activityId);
      if (!activity) {
        return res.status(404).json({ message: 'Activity not found' });
      }
      
      // Check if user is any member of the trip (allow all members to RSVP)
      const members = await storage.getTripMembers(activity.tripId);
      const isMember = members.some(member => 
        member.userId === user.id
      );
      
      if (!isMember) {
        return res.status(403).json({ message: 'Not a member of this trip' });
      }
      
      const { status } = req.body;
      if (!status || !['going', 'not going'].includes(status)) {
        return res.status(400).json({ message: 'Invalid status' });
      }
      
      // Check if RSVP already exists
      const rsvps = await storage.getActivityRSVPs(activityId);
      const existingRsvp = rsvps.find(rsvp => rsvp.userId === user.id);
      
      let rsvp;
      if (existingRsvp) {
        // Update existing RSVP
        rsvp = await storage.updateActivityRSVP(activityId, user.id, status);
      } else {
        // Create new RSVP
        rsvp = await storage.createActivityRSVP({
          activityId,
          userId: user.id,
          status
        });
      }
      
      res.json(rsvp);
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  // Message Routes
  router.get('/trips/:id/messages', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = ensureUser(req, res);
      if (!user) return; // Response already sent by ensureUser
      
      const tripId = parseInt(req.params.id);
      if (isNaN(tripId)) {
        return res.status(400).json({ message: 'Invalid trip ID' });
      }
      
      // Check if user is a member of the trip
      const members = await storage.getTripMembers(tripId);
      const isMember = members.some(member => member.userId === user.id);
      
      if (!isMember) {
        return res.status(403).json({ message: 'Not a member of this trip' });
      }
      
      const messages = await storage.getMessagesByTrip(tripId);
      
      // Get user details for each message
      const messagesWithUser = await Promise.all(
        messages.map(async (message) => {
          const user = await storage.getUser(message.userId);
          if (!user) return message;
          
          // Remove sensitive user information and format for chat component
          const { password, ...userWithoutPassword } = user;
          
          return {
            id: message.id,
            content: message.content,
            timestamp: message.timestamp.toISOString(),
            tripId: message.tripId,
            userId: message.userId,
            user: {
              id: userWithoutPassword.id,
              name: userWithoutPassword.name,
              avatar: userWithoutPassword.avatar
            }
          };
        })
      );
      
      res.json(messagesWithUser);
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  router.post('/trips/:id/messages', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const authUser = ensureUser(req, res);
      if (!authUser) return; // Response already sent by ensureUser
      
      const tripId = parseInt(req.params.id);
      if (isNaN(tripId)) {
        return res.status(400).json({ message: 'Invalid trip ID' });
      }
      
      // Check if user is a member of the trip (any status)
      const members = await storage.getTripMembers(tripId);
      const memberInfo = members.find(member => member.userId === authUser.id);
      
      if (!memberInfo) {
        return res.status(403).json({ message: 'Not a member of this trip' });
      }
      
      const { content } = req.body;
      if (!content) {
        return res.status(400).json({ message: 'Message content is required' });
      }
      
      const message = await storage.createMessage({
        tripId,
        userId: authUser.id,
        content
      });
      
      // Get user details for the response
      const userData = await storage.getUser(message.userId);
      const { password, ...userWithoutPassword } = userData!;
      
      const messageWithUser = {
        id: message.id,
        content: message.content,
        timestamp: message.timestamp.toISOString(),
        tripId: message.tripId,
        userId: message.userId,
        user: {
          id: userWithoutPassword.id,
          name: userWithoutPassword.name,
          avatar: userWithoutPassword.avatar
        }
      };
      
      // Broadcast via WebSocket
      wss.clients.forEach((client: WebSocketClient) => {
        if (client.readyState === WebSocket.OPEN && client.tripIds?.includes(tripId)) {
          // Format message for WebSocket broadcast
          const formattedMessage = {
            id: message.id,
            content: message.content,
            timestamp: message.timestamp.toISOString(),
            tripId: message.tripId,
            userId: message.userId,
            user: userWithoutPassword
          };
          
          client.send(JSON.stringify({
            type: 'new_message',
            data: formattedMessage
          }));
        }
      });
      
      res.status(201).json(messageWithUser);
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  // Survey Routes
  router.post('/trips/:id/survey', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const authUser = ensureUser(req, res);
      if (!authUser) return; // Response already sent by ensureUser
      
      const tripId = parseInt(req.params.id);
      if (isNaN(tripId)) {
        return res.status(400).json({ message: 'Invalid trip ID' });
      }
      
      const trip = await storage.getTrip(tripId);
      if (!trip) {
        return res.status(404).json({ message: 'Trip not found' });
      }
      
      // Only organizer can create survey questions
      if (trip.organizer !== authUser.id) {
        return res.status(403).json({ message: 'Only the trip organizer can create surveys' });
      }
      
      const { questions } = req.body;
      if (!questions || !Array.isArray(questions) || questions.length === 0) {
        return res.status(400).json({ message: 'Questions are required' });
      }
      
      const createdQuestions = await Promise.all(
        questions.map(async (q) => {
          const questionData = insertSurveyQuestionSchema.parse({
            ...q,
            tripId
          });
          return storage.createSurveyQuestion(questionData);
        })
      );
      
      res.status(201).json(createdQuestions);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid survey data', errors: error.errors });
      }
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  router.get('/trips/:id/survey', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const authUser = ensureUser(req, res);
      if (!authUser) return; // Response already sent by ensureUser
      
      const tripId = parseInt(req.params.id);
      if (isNaN(tripId)) {
        return res.status(400).json({ message: 'Invalid trip ID' });
      }
      
      // Check if user is a member of the trip
      const members = await storage.getTripMembers(tripId);
      const isMember = members.some(member => member.userId === authUser.id);
      
      if (!isMember) {
        return res.status(403).json({ message: 'Not a member of this trip' });
      }
      
      const questions = await storage.getSurveyQuestionsByTrip(tripId);
      
      // For each question, get responses
      const questionsWithResponses = await Promise.all(
        questions.map(async (question) => {
          const responses = await storage.getSurveyResponses(question.id);
          return {
            ...question,
            responses
          };
        })
      );
      
      res.json(questionsWithResponses);
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  router.post('/survey/:id/respond', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const authUser = ensureUser(req, res);
      if (!authUser) return; // Response already sent by ensureUser
      
      const questionId = parseInt(req.params.id);
      if (isNaN(questionId)) {
        return res.status(400).json({ message: 'Invalid question ID' });
      }
      
      const { response } = req.body;
      if (response === undefined) {
        return res.status(400).json({ message: 'Response is required' });
      }
      
      const responseData = insertSurveyResponseSchema.parse({
        questionId,
        userId: authUser.id,
        response: String(response)
      });
      
      const createdResponse = await storage.createSurveyResponse(responseData);
      res.status(201).json(createdResponse);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid response data', errors: error.errors });
      }
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  // Get all messages and polls for the current user across all trips
  router.get('/messages', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const authUser = ensureUser(req, res);
      if (!authUser) return; // Response already sent by ensureUser
      
      // Get all trips the user is a member of
      const memberships = await storage.getTripMembershipsByUser(authUser.id);
      const tripIds = memberships.map(membership => membership.tripId);
      
      // Get messages and polls from all these trips
      const allMessagesWithDetails = [];
      
      for (const tripId of tripIds) {
        // Get regular messages
        const tripMessages = await storage.getMessagesByTrip(tripId);
        
        // Get trip details
        const trip = await storage.getTrip(tripId);
        
        // Get user details for each message
        const messagesWithDetails = await Promise.all(tripMessages.map(async (message) => {
          const user = await storage.getUser(message.userId);
          return {
            ...message,
            type: 'message',
            tripId,
            tripName: trip?.name || 'Unknown Trip',
            user: user ? {
              id: user.id,
              name: user.name,
              avatar: user.avatar
            } : null
          };
        }));
        
        // Get polls for this trip
        const tripPolls = await storage.getPollsByTrip(tripId);
        
        // Get user details for each poll
        const pollsWithDetails = await Promise.all(tripPolls.map(async (poll) => {
          const user = await storage.getUser(poll.createdBy);
          return {
            id: `poll-${poll.id}`,
            content: `Poll: ${poll.title}`,
            type: 'poll',
            timestamp: poll.createdAt,
            tripId,
            tripName: trip?.name || 'Unknown Trip',
            userId: poll.createdBy, // For unread calculation
            pollData: poll,
            user: user ? {
              id: user.id,
              name: user.name,
              avatar: user.avatar
            } : null
          };
        }));
        
        // Add both messages and polls to the results
        allMessagesWithDetails.push(...messagesWithDetails, ...pollsWithDetails);
      }
      
      // Sort by timestamp (newest first)
      allMessagesWithDetails.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      
      res.json(allMessagesWithDetails);
    } catch (error) {
      console.error('Error getting all messages and polls:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  // Get all activities for the current user across all trips
  router.get('/activities', isAuthenticated, async (req: Request, res: Response) => {
    try {
      // Get all trips the user is a member of
      const memberships = await storage.getTripMembershipsByUser(req.user!.id);
      const tripIds = memberships.map(membership => membership.tripId);
      
      // Get activities from all these trips
      const allActivitiesWithDetails = [];
      
      for (const tripId of tripIds) {
        const tripActivities = await storage.getActivitiesByTrip(tripId);
        
        // Get trip details
        const trip = await storage.getTrip(tripId);
        
        // Add trip details to each activity
        const activitiesWithTripDetails = tripActivities.map(activity => ({
          ...activity,
          tripName: trip?.name || 'Unknown Trip'
        }));
        
        allActivitiesWithDetails.push(...activitiesWithTripDetails);
      }
      
      // Sort by date
      allActivitiesWithDetails.sort((a, b) => 
        new Date(a.date).getTime() - new Date(b.date).getTime()
      );
      
      res.json(allActivitiesWithDetails);
    } catch (error) {
      console.error('Error getting all activities:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });
  // Invitation Links
  router.post('/trips/:id/invite', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = ensureUser(req, res);
      if (!user) return; // Response already sent by ensureUser
      
      const tripId = parseInt(req.params.id);
      if (isNaN(tripId)) {
        return res.status(400).json({ message: 'Invalid trip ID' });
      }
      
      const trip = await storage.getTrip(tripId);
      if (!trip) {
        return res.status(404).json({ message: 'Trip not found' });
      }
      
      // Check if user is a member of the trip
      const tripMembers = await storage.getTripMembers(tripId);
      const isMember = tripMembers.some(member => member.userId === user.id);
      
      if (!isMember) {
        return res.status(403).json({ message: 'You must be a member of this trip to create invitation links' });
      }
      
      // Create expiration date (default: 7 days from now)
      const expiresAt = req.body.expiresAt ? new Date(req.body.expiresAt) : 
        new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      
      const invitationData = insertInvitationLinkSchema.parse({
        tripId,
        createdBy: user.id,
        expiresAt
      });
      
      const invitation = await storage.createInvitationLink(invitationData);
      
      // Return the invitation with full URL
      // Use the actual domain from the request, handling both development and production
      const host = req.get('host');
      const protocol = req.get('x-forwarded-proto') || req.protocol;
      const inviteUrl = `${protocol}://${host}/invite/${invitation.token}`;
      
      res.status(201).json({
        ...invitation,
        inviteUrl
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid invitation data', errors: error.errors });
      }
      console.error('Error creating invitation:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  router.get('/trips/:id/invites', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = ensureUser(req, res);
      if (!user) return; // Response already sent by ensureUser
      
      const tripId = parseInt(req.params.id);
      if (isNaN(tripId)) {
        return res.status(400).json({ message: 'Invalid trip ID' });
      }
      
      const trip = await storage.getTrip(tripId);
      if (!trip) {
        return res.status(404).json({ message: 'Trip not found' });
      }
      
      // Check if user is a member of the trip
      const tripMembers = await storage.getTripMembers(tripId);
      const isMember = tripMembers.some(member => member.userId === user.id);
      
      if (!isMember) {
        return res.status(403).json({ message: 'You must be a member of this trip to view invitation links' });
      }
      
      const invites = await storage.getInvitationLinksByTrip(tripId);
      
      // Add full invite URLs
      const host = req.get('host');
      const protocol = req.get('x-forwarded-proto') || req.protocol;
      const invitesWithUrls = invites.map(invite => ({
        ...invite,
        inviteUrl: `${protocol}://${host}/invite/${invite.token}`
      }));
      
      res.json(invitesWithUrls);
    } catch (error) {
      console.error('Error retrieving invitations:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Public route to validate an invitation token and get trip details
  router.get('/invite/:token', async (req: Request, res: Response) => {
    try {
      const token = req.params.token;
      
      const invitation = await storage.getInvitationLink(token);
      if (!invitation) {
        return res.status(404).json({ message: 'Invitation not found or has expired' });
      }
      
      // Check if invitation is still active
      if (!invitation.isActive) {
        return res.status(410).json({ message: 'This invitation link has been deactivated' });
      }
      
      // Check if invitation has expired
      if (invitation.expiresAt && new Date(invitation.expiresAt) < new Date()) {
        return res.status(410).json({ message: 'This invitation link has expired' });
      }
      
      // Get trip details to show to the invited user
      const trip = await storage.getTrip(invitation.tripId);
      if (!trip) {
        return res.status(404).json({ message: 'The associated trip was not found' });
      }
      
      // Get trip organizer details
      const organizer = await storage.getUser(trip.organizer);
      
      // Return limited trip details for the invitation page
      res.json({
        invitation: {
          id: invitation.id,
          token: invitation.token,
          expiresAt: invitation.expiresAt
        },
        trip: {
          id: trip.id,
          name: trip.name,
          destination: trip.destination,
          startDate: trip.startDate,
          endDate: trip.endDate,
          organizer: organizer ? {
            id: organizer.id,
            name: organizer.name
          } : null
        }
      });
    } catch (error) {
      console.error('Error processing invitation:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Accept an invitation (requires authentication)
  router.post('/invite/:token/accept', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = ensureUser(req, res);
      if (!user) return; // Response already sent by ensureUser
      
      const token = req.params.token;
      
      const invitation = await storage.getInvitationLink(token);
      if (!invitation) {
        return res.status(404).json({ message: 'Invitation not found or has expired' });
      }
      
      // Check if invitation is still active
      if (!invitation.isActive) {
        return res.status(410).json({ message: 'This invitation link has been deactivated' });
      }
      
      // Check if invitation has expired
      if (invitation.expiresAt && new Date(invitation.expiresAt) < new Date()) {
        return res.status(410).json({ message: 'This invitation link has expired' });
      }
      
      // Add user to trip members with confirmed status
      const tripMember = await storage.addTripMember({
        tripId: invitation.tripId,
        userId: user.id,
        status: "confirmed" // Auto-confirm since they accepted the invitation
      });
      
      res.status(201).json({ 
        message: 'Successfully joined the trip',
        tripId: invitation.tripId,
        membership: tripMember
      });
    } catch (error) {
      console.error('Error accepting invitation:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  // EXPENSE ROUTES
  
  // Create a new expense
  router.post('/trips/:id/expenses', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = ensureUser(req, res);
      if (!user) return; // Response already sent by ensureUser
      
      const tripId = parseInt(req.params.id);
      if (isNaN(tripId)) {
        return res.status(400).json({ message: 'Invalid trip ID' });
      }
      
      // Check if user is a member of the trip
      const members = await storage.getTripMembers(tripId);
      const isMember = members.some(member => member.userId === user.id);
      
      if (!isMember) {
        return res.status(403).json({ message: 'Not a member of this trip' });
      }
      
      const expenseData = insertExpenseSchema.parse({
        ...req.body,
        tripId,
        userId: user.id
      });
      
      const expense = await storage.createExpense(expenseData);
      
      // Notify trip members about the new expense
      broadcastToTrip(wss, tripId, {
        type: 'NEW_EXPENSE',
        data: expense
      });
      
      res.status(201).json(expense);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: 'Invalid expense data', errors: error.errors });
      } else {
        console.error('Error creating expense:', error);
        res.status(500).json({ message: 'Server error' });
      }
    }
  });
  
  // Get all expenses for a trip
  router.get('/trips/:id/expenses', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = ensureUser(req, res);
      if (!user) return; // Response already sent by ensureUser
      
      const tripId = parseInt(req.params.id);
      if (isNaN(tripId)) {
        return res.status(400).json({ message: 'Invalid trip ID' });
      }
      
      // Check if user is a member of the trip
      const members = await storage.getTripMembers(tripId);
      const isMember = members.some(member => member.userId === user.id);
      
      if (!isMember) {
        return res.status(403).json({ message: 'Not a member of this trip' });
      }
      
      const expenses = await storage.getExpensesByTrip(tripId);
      
      // Get user details for each expense
      const expensesWithUserDetails = await Promise.all(
        expenses.map(async (expense) => {
          const creator = await storage.getUser(expense.userId);
          const payer = await storage.getUser(expense.paidBy);
          
          return {
            ...expense,
            createdBy: creator ? {
              id: creator.id,
              name: creator.name,
              username: creator.username,
              avatar: creator.avatar
            } : null,
            paidBy: payer ? {
              id: payer.id,
              name: payer.name,
              username: payer.username,
              avatar: payer.avatar
            } : null
          };
        })
      );
      
      res.json(expensesWithUserDetails);
    } catch (error) {
      console.error('Error fetching expenses:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  // Get expense summary for a trip
  router.get('/trips/:id/expenses/summary', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = ensureUser(req, res);
      if (!user) return; // Response already sent by ensureUser
      
      const tripId = parseInt(req.params.id);
      if (isNaN(tripId)) {
        return res.status(400).json({ message: 'Invalid trip ID' });
      }
      
      // Check if user is a member of the trip
      const members = await storage.getTripMembers(tripId);
      const isMember = members.some(member => member.userId === user.id);
      
      if (!isMember) {
        return res.status(403).json({ message: 'Not a member of this trip' });
      }
      
      const summary = await storage.getTripExpenseSummary(tripId);
      
      // Add user details for each payer in the summary
      const payerIds = Object.keys(summary.byPayer).map(id => parseInt(id));
      const payerDetails = await Promise.all(
        payerIds.map(async (id) => {
          const user = await storage.getUser(id);
          return user ? {
            id: user.id,
            name: user.name,
            username: user.username,
            avatar: user.avatar
          } : null;
        })
      );
      
      const payersWithDetails = payerIds.reduce((acc, id, index) => {
        if (payerDetails[index]) {
          acc[id] = {
            amount: summary.byPayer[id],
            user: payerDetails[index]
          };
        }
        return acc;
      }, {} as Record<string, any>);
      
      const enhancedSummary = {
        ...summary,
        byPayer: payersWithDetails
      };
      
      res.json(enhancedSummary);
    } catch (error) {
      console.error('Error fetching expense summary:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  // Update an expense
  router.put('/expenses/:id', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = ensureUser(req, res);
      if (!user) return; // Response already sent by ensureUser
      
      const expenseId = parseInt(req.params.id);
      if (isNaN(expenseId)) {
        return res.status(400).json({ message: 'Invalid expense ID' });
      }
      
      const expense = await storage.getExpense(expenseId);
      
      if (!expense) {
        return res.status(404).json({ message: 'Expense not found' });
      }
      
      // Only allow the creator or trip organizer to update expenses
      const trip = await storage.getTrip(expense.tripId);
      if (expense.userId !== user.id && trip?.organizer !== user.id) {
        return res.status(403).json({ message: 'Not authorized to update this expense' });
      }
      
      const expenseUpdate = req.body;
      const updatedExpense = await storage.updateExpense(expenseId, expenseUpdate);
      
      // Notify trip members about the updated expense
      broadcastToTrip(wss, expense.tripId, {
        type: 'UPDATE_EXPENSE',
        data: updatedExpense
      });
      
      res.json(updatedExpense);
    } catch (error) {
      console.error('Error updating expense:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  // Delete an expense
  router.delete('/expenses/:id', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = ensureUser(req, res);
      if (!user) return; // Response already sent by ensureUser
      
      const expenseId = parseInt(req.params.id);
      if (isNaN(expenseId)) {
        return res.status(400).json({ message: 'Invalid expense ID' });
      }
      
      const expense = await storage.getExpense(expenseId);
      
      if (!expense) {
        return res.status(404).json({ message: 'Expense not found' });
      }
      
      // Only allow the creator or trip organizer to delete expenses
      const trip = await storage.getTrip(expense.tripId);
      if (expense.userId !== user.id && trip?.organizer !== user.id) {
        return res.status(403).json({ message: 'Not authorized to delete this expense' });
      }
      
      const success = await storage.deleteExpense(expenseId);
      
      if (success) {
        // Notify trip members about the deleted expense
        broadcastToTrip(wss, expense.tripId, {
          type: 'DELETE_EXPENSE',
          data: { id: expenseId, tripId: expense.tripId }
        });
        
        res.status(200).json({ message: 'Expense deleted successfully' });
      } else {
        res.status(500).json({ message: 'Failed to delete expense' });
      }
    } catch (error) {
      console.error('Error deleting expense:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  // FLIGHT INFO ROUTES
  
  // Create new flight information
  router.post('/trips/:id/flights', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = ensureUser(req, res);
      if (!user) return; // Response already sent by ensureUser
      
      const tripId = parseInt(req.params.id);
      if (isNaN(tripId)) {
        return res.status(400).json({ message: 'Invalid trip ID' });
      }
      
      // Check if user is a member of the trip
      const members = await storage.getTripMembers(tripId);
      const isMember = members.some(member => member.userId === user.id);
      
      if (!isMember) {
        return res.status(403).json({ message: 'Not a member of this trip' });
      }
      
      // Create complete flight data with defaults for required fields
      const flightData = insertFlightInfoSchema.parse({
        tripId,
        userId: user.id,
        flightNumber: req.body.flightNumber,
        arrivalDate: req.body.arrivalDate,
        status: req.body.status || "booked",
        // Set defaults for required fields that will be populated later via API lookup
        airline: req.body.airline || "",
        departureAirport: req.body.departureAirport || "",
        departureCity: req.body.departureCity || "",
        departureTime: req.body.departureTime || new Date(),
        arrivalAirport: req.body.arrivalAirport || "",
        arrivalCity: req.body.arrivalCity || "",
        arrivalTime: req.body.arrivalTime || new Date(),
        // Optional fields
        price: req.body.price,
        currency: req.body.currency || "USD",
        bookingReference: req.body.bookingReference,
        bookingStatus: req.body.bookingStatus || "confirmed",
        seatNumber: req.body.seatNumber,
        notes: req.body.notes,
        flightDetails: req.body.flightDetails,
      });
      
      const flight = await storage.createFlightInfo(flightData);
      
      // Notify trip members about the new flight information
      broadcastToTrip(wss, tripId, {
        type: 'NEW_FLIGHT',
        data: flight
      });
      
      res.status(201).json(flight);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: 'Invalid flight data', errors: error.errors });
      } else {
        console.error('Error creating flight info:', error);
        res.status(500).json({ message: 'Server error' });
      }
    }
  });
  
  // Get all flight information for a trip
  router.get('/trips/:id/flights', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = ensureUser(req, res);
      if (!user) return; // Response already sent by ensureUser
      
      const tripId = parseInt(req.params.id);
      if (isNaN(tripId)) {
        return res.status(400).json({ message: 'Invalid trip ID' });
      }
      
      // Check if user is a member of the trip
      const members = await storage.getTripMembers(tripId);
      const isMember = members.some(member => member.userId === user.id);
      
      if (!isMember) {
        return res.status(403).json({ message: 'Not a member of this trip' });
      }
      
      const flights = await storage.getFlightInfoByTrip(tripId);
      
      // Get user details for each flight
      const flightsWithUserDetails = await Promise.all(
        flights.map(async (flight) => {
          const user = await storage.getUser(flight.userId);
          
          return {
            ...flight,
            user: user ? {
              id: user.id,
              name: user.name,
              username: user.username,
              avatar: user.avatar
            } : null
          };
        })
      );
      
      res.json(flightsWithUserDetails);
    } catch (error) {
      console.error('Error fetching flight info:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  // Update flight information
  router.put('/flights/:id', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = ensureUser(req, res);
      if (!user) return; // Response already sent by ensureUser
      
      const flightId = parseInt(req.params.id);
      if (isNaN(flightId)) {
        return res.status(400).json({ message: 'Invalid flight ID' });
      }
      
      const flight = await storage.getFlightInfo(flightId);
      
      if (!flight) {
        return res.status(404).json({ message: 'Flight information not found' });
      }
      
      // Only allow the creator to update flight information
      if (flight.userId !== user.id) {
        return res.status(403).json({ message: 'Not authorized to update this flight information' });
      }
      
      const flightUpdate = req.body;
      const updatedFlight = await storage.updateFlightInfo(flightId, flightUpdate);
      
      // Notify trip members about the updated flight information
      broadcastToTrip(wss, flight.tripId, {
        type: 'UPDATE_FLIGHT',
        data: updatedFlight
      });
      
      res.json(updatedFlight);
    } catch (error) {
      console.error('Error updating flight info:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  // Delete flight information
  router.delete('/flights/:id', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = ensureUser(req, res);
      if (!user) return; // Response already sent by ensureUser
      
      const flightId = parseInt(req.params.id);
      if (isNaN(flightId)) {
        return res.status(400).json({ message: 'Invalid flight ID' });
      }
      
      const flight = await storage.getFlightInfo(flightId);
      
      if (!flight) {
        return res.status(404).json({ message: 'Flight information not found' });
      }
      
      // Only allow the creator to delete flight information
      if (flight.userId !== user.id) {
        return res.status(403).json({ message: 'Not authorized to delete this flight information' });
      }
      
      const success = await storage.deleteFlightInfo(flightId);
      
      if (success) {
        // Notify trip members about the deleted flight information
        broadcastToTrip(wss, flight.tripId, {
          type: 'DELETE_FLIGHT',
          data: { id: flightId, tripId: flight.tripId }
        });
        
        res.status(200).json({ message: 'Flight information deleted successfully' });
      } else {
        res.status(500).json({ message: 'Failed to delete flight information' });
      }
    } catch (error) {
      console.error('Error deleting flight info:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  // Search for flights
  router.get('/flights/search', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = ensureUser(req, res);
      if (!user) return; // Response already sent by ensureUser
      
      const departureCity = req.query.departureCity as string;
      const arrivalCity = req.query.arrivalCity as string;
      const dateStr = req.query.date as string;
      
      if (!departureCity || !arrivalCity || !dateStr) {
        return res.status(400).json({ message: 'Missing required search parameters' });
      }
      
      const date = new Date(dateStr);
      
      if (isNaN(date.getTime())) {
        return res.status(400).json({ message: 'Invalid date format' });
      }
      
      const flightResults = await storage.searchFlights(departureCity, arrivalCity, date);
      res.json(flightResults);
    } catch (error) {
      console.error('Error searching flights:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  // POLL ROUTES
  
  // Create a new poll
  router.post('/trips/:id/polls', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = ensureUser(req, res);
      if (!user) return;
      
      const tripId = parseInt(req.params.id);
      if (isNaN(tripId)) {
        return res.status(400).json({ message: 'Invalid trip ID' });
      }
      
      // Check if user is a member of the trip (any status)
      const members = await storage.getTripMembers(tripId);
      const isMember = members.some(member => 
        member.userId === user.id
      );
      
      if (!isMember) {
        return res.status(403).json({ message: 'Must be a member of this trip to create polls' });
      }
      
      const pollData = insertPollSchema.parse({
        ...req.body,
        tripId,
        createdBy: user.id
      });
      
      const newPoll = await storage.createPoll(pollData);
      
      // Notify trip members about new poll via WebSocket
      broadcastToTrip(wss, tripId, {
        type: 'NEW_POLL',
        data: newPoll
      });
      
      res.status(201).json(newPoll);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      console.error('Error creating poll:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  // Get all polls for a trip
  router.get('/trips/:id/polls', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = ensureUser(req, res);
      if (!user) return;
      
      const tripId = parseInt(req.params.id);
      if (isNaN(tripId)) {
        return res.status(400).json({ message: 'Invalid trip ID' });
      }
      
      // Check if user is a member of the trip
      const members = await storage.getTripMembers(tripId);
      const isMember = members.some(member => member.userId === user.id);
      
      if (!isMember) {
        return res.status(403).json({ message: 'Not a member of this trip' });
      }
      
      const polls = await storage.getPollsByTrip(tripId);
      
      // For each poll, fetch votes to calculate results
      const pollsWithVotes = await Promise.all(polls.map(async (poll) => {
        const votes = await storage.getPollVotes(poll.id);
        const userVotes = await storage.getUserPollVotes(poll.id, user.id);
        
        // Create an array to track votes per option
        const voteCounts = poll.options.map(() => 0);
        
        // Count votes for each option
        votes.forEach(vote => {
          if (vote.optionIndex >= 0 && vote.optionIndex < voteCounts.length) {
            voteCounts[vote.optionIndex]++;
          }
        });
        
        // Get creator info
        const creator = await storage.getUser(poll.createdBy);
        
        return {
          ...poll,
          voteCounts,
          totalVotes: votes.length,
          hasVoted: userVotes.length > 0,
          userVotes,
          creator: creator ? {
            id: creator.id,
            name: creator.name || creator.username,
            avatar: creator.avatar
          } : null
        };
      }));
      
      res.json(pollsWithVotes);
    } catch (error) {
      console.error('Error fetching polls:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  // Vote on a poll
  router.post('/polls/:id/vote', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = ensureUser(req, res);
      if (!user) return;
      
      const pollId = parseInt(req.params.id);
      if (isNaN(pollId)) {
        return res.status(400).json({ message: 'Invalid poll ID' });
      }
      
      // Get the poll to check permissions
      const poll = await storage.getPoll(pollId);
      if (!poll) {
        return res.status(404).json({ message: 'Poll not found' });
      }
      
      // Check if user is a member of the associated trip (allow any member to vote)
      const members = await storage.getTripMembers(poll.tripId);
      const isMember = members.some(member => 
        member.userId === user.id
      );
      
      if (!isMember) {
        return res.status(403).json({ message: 'Must be a member of this trip to vote' });
      }
      
      // Check if poll is still active
      if (!poll.isActive) {
        return res.status(400).json({ message: 'This poll is no longer active' });
      }
      
      // If end date is set and has passed, poll is expired
      if (poll.endDate && new Date(poll.endDate) < new Date()) {
        return res.status(400).json({ message: 'This poll has expired' });
      }
      
      const voteData = insertPollVoteSchema.parse({
        pollId,
        userId: user.id,
        optionIndex: req.body.optionIndex
      });
      
      // For single-choice polls, delete previous votes if any
      if (!poll.multipleChoice) {
        const userVotes = await storage.getUserPollVotes(pollId, user.id);
        for (const vote of userVotes) {
          await storage.deletePollVote(vote.id);
        }
      }
      
      const newVote = await storage.createPollVote(voteData);
      
      // Get updated votes for the poll
      const votes = await storage.getPollVotes(pollId);
      
      // Create vote counts array
      const voteCounts = poll.options.map(() => 0);
      votes.forEach(vote => {
        if (vote.optionIndex >= 0 && vote.optionIndex < voteCounts.length) {
          voteCounts[vote.optionIndex]++;
        }
      });
      
      // Notify trip members about new vote via WebSocket
      broadcastToTrip(wss, poll.tripId, {
        type: 'POLL_VOTE',
        data: {
          pollId,
          vote: newVote,
          voteCounts,
          totalVotes: votes.length
        }
      });
      
      res.status(201).json({
        vote: newVote,
        pollVotes: votes,
        voteCounts,
        totalVotes: votes.length
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      console.error('Error voting on poll:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  // Remove a vote from a poll
  router.delete('/polls/:pollId/votes/:voteId', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = ensureUser(req, res);
      if (!user) return;
      
      const pollId = parseInt(req.params.pollId);
      const voteId = parseInt(req.params.voteId);
      
      if (isNaN(pollId) || isNaN(voteId)) {
        return res.status(400).json({ message: 'Invalid poll or vote ID' });
      }
      
      // Get the poll to check permissions
      const poll = await storage.getPoll(pollId);
      if (!poll) {
        return res.status(404).json({ message: 'Poll not found' });
      }
      
      // Check if user is a member of the associated trip
      const members = await storage.getTripMembers(poll.tripId);
      const isMember = members.some(member => 
        member.userId === user.id && member.status === 'confirmed'
      );
      
      if (!isMember) {
        return res.status(403).json({ message: 'Must be a confirmed member to manage votes' });
      }
      
      // Get all votes for this poll by the user
      const votes = await storage.getUserPollVotes(pollId, user.id);
      const voteExists = votes.some(vote => vote.id === voteId);
      
      if (!voteExists) {
        return res.status(404).json({ message: 'Vote not found or not owned by you' });
      }
      
      const success = await storage.deletePollVote(voteId);
      
      if (!success) {
        return res.status(500).json({ message: 'Failed to delete vote' });
      }
      
      // Get updated votes for the poll
      const updatedVotes = await storage.getPollVotes(pollId);
      
      // Create vote counts array
      const voteCounts = poll.options.map(() => 0);
      updatedVotes.forEach(vote => {
        if (vote.optionIndex >= 0 && vote.optionIndex < voteCounts.length) {
          voteCounts[vote.optionIndex]++;
        }
      });
      
      // Notify trip members about vote deletion via WebSocket
      broadcastToTrip(wss, poll.tripId, {
        type: 'POLL_VOTE_REMOVED',
        data: {
          pollId,
          voteId,
          voteCounts,
          totalVotes: updatedVotes.length
        }
      });
      
      res.json({
        success: true,
        pollVotes: updatedVotes,
        voteCounts,
        totalVotes: updatedVotes.length
      });
    } catch (error) {
      console.error('Error removing poll vote:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // PROFILE MANAGEMENT ROUTES
  
  // Update user profile
  router.put('/users/profile', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = ensureUser(req, res);
      if (!user) return;

      const { username, email, firstName, lastName, bio, location } = req.body;

      // Check if username or email already exists for other users
      if (username && username !== user.username) {
        const existingUser = await storage.getUserByUsername(username);
        if (existingUser && existingUser.id !== user.id) {
          return res.status(400).json({ message: 'Username already taken' });
        }
      }

      if (email && email !== user.email) {
        const existingUser = await storage.getUserByEmail(email);
        if (existingUser && existingUser.id !== user.id) {
          return res.status(400).json({ message: 'Email already in use' });
        }
      }

      // Update user profile
      const updatedUser = await storage.updateUser(user.id, {
        username: username || user.username,
        email: email || user.email,
        firstName: firstName || user.firstName,
        lastName: lastName || user.lastName,
        bio: bio || user.bio,
        location: location || user.location,
      });

      res.json(updatedUser);
    } catch (error) {
      console.error('Error updating profile:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Get user statistics
  router.get('/users/stats', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = ensureUser(req, res);
      if (!user) return;

      // Get user's trip memberships
      const memberships = await storage.getTripMembershipsByUser(user.id);
      const confirmedMemberships = memberships.filter(m => m.status === 'confirmed');
      
      // Get trip details for confirmed memberships
      const tripDetails = await Promise.all(
        confirmedMemberships.map(membership => storage.getTrip(membership.tripId))
      );
      
      const validTrips = tripDetails.filter(trip => trip !== null);
      
      // Calculate stats
      const totalTrips = validTrips.length;
      const now = new Date();
      const upcomingTrips = validTrips.filter(trip => 
        trip && new Date(trip.startDate) > now
      ).length;
      
      // Get unique travel companions
      const allTripMembers = await Promise.all(
        confirmedMemberships.map(membership => storage.getTripMembers(membership.tripId))
      );
      
      const companionIds = new Set();
      allTripMembers.flat().forEach(member => {
        if (member.userId !== user.id && member.status === 'confirmed') {
          companionIds.add(member.userId);
        }
      });

      res.json({
        totalTrips,
        upcomingTrips,
        companionsCount: companionIds.size,
      });
    } catch (error) {
      console.error('Error fetching user stats:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  // Get other user's public profile
  router.get('/users/:userId', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.userId);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Return public profile data (exclude sensitive info)
      const publicProfile = {
        id: user.id,
        username: user.username,
        name: user.name,
        firstName: user.firstName,
        lastName: user.lastName,
        bio: user.bio,
        location: user.location,
        avatar: user.avatar,
        createdAt: user.createdAt,
      };

      res.json(publicProfile);
    } catch (error) {
      console.error("Error fetching user profile:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  // Get user's public stats  
  router.get('/users/:userId/stats', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.userId);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }

      const memberships = await storage.getTripMembershipsByUser(userId);
      const trips = await Promise.all(
        memberships.map(async (m: any) => {
          const trip = await storage.getTrip(m.tripId);
          return trip;
        })
      );

      const validTrips = trips.filter(trip => trip !== undefined);
      const upcomingTrips = validTrips.filter(trip => {
        const startDate = new Date(trip.startDate);
        return startDate > new Date();
      });

      // Get unique companions (users who have been on trips with this user)
      const companionIds = new Set<number>();
      for (const trip of validTrips) {
        const members = await storage.getTripMembers(trip.id);
        members.forEach((member: any) => {
          if (member.userId !== userId) {
            companionIds.add(member.userId);
          }
        });
      }

      const stats = {
        totalTrips: validTrips.length,
        upcomingTrips: upcomingTrips.length,
        companions: companionIds.size,
      };

      res.json(stats);
    } catch (error) {
      console.error("Error fetching user stats:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  // Trip image upload endpoints
  router.put('/trips/:id/image', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = ensureUser(req, res);
      if (!user) return;

      const tripId = parseInt(req.params.id);
      if (isNaN(tripId)) {
        return res.status(400).json({ message: "Invalid trip ID" });
      }

      const trip = await storage.getTrip(tripId);
      if (!trip) {
        return res.status(404).json({ message: "Trip not found" });
      }

      // Only trip organizer can upload images
      if (trip.organizer !== user.id) {
        return res.status(403).json({ message: "Only the trip organizer can upload images" });
      }

      const { image } = req.body;
      if (!image) {
        return res.status(400).json({ message: "No image provided" });
      }

      const updatedTrip = await storage.updateTrip(tripId, { cover: image });
      
      if (!updatedTrip) {
        return res.status(404).json({ message: "Trip not found" });
      }

      res.json(updatedTrip);
    } catch (error) {
      console.error("Error uploading trip image:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  router.delete('/trips/:id/image', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = ensureUser(req, res);
      if (!user) return;

      const tripId = parseInt(req.params.id);
      if (isNaN(tripId)) {
        return res.status(400).json({ message: "Invalid trip ID" });
      }

      const trip = await storage.getTrip(tripId);
      if (!trip) {
        return res.status(404).json({ message: "Trip not found" });
      }

      // Only trip organizer can remove images
      if (trip.organizer !== user.id) {
        return res.status(403).json({ message: "Only the trip organizer can remove images" });
      }

      const updatedTrip = await storage.updateTrip(tripId, { cover: null });
      
      if (!updatedTrip) {
        return res.status(404).json({ message: "Trip not found" });
      }

      res.json(updatedTrip);
    } catch (error) {
      console.error("Error removing trip image:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  // Expense tracking routes
  router.post('/trips/:id/expenses', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const tripId = parseInt(req.params.id);
      const user = ensureUser(req, res);
      if (!user) return;
      
      const { description, amount, category, paidBy } = req.body;
      
      const expense = await storage.createExpense({
        tripId,
        userId: user.id,
        title: description,
        amount: amount.toString(),
        category: category || 'general',
        paidBy,
        date: new Date(),
      });

      res.json(expense);
    } catch (error) {
      console.error("Error creating expense:", error);
      res.status(500).json({ message: "Failed to create expense" });
    }
  });

  router.get('/trips/:id/expenses', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const tripId = parseInt(req.params.id);
      const expenses = await storage.getExpensesByTrip(tripId);
      res.json(expenses);
    } catch (error) {
      console.error("Error fetching expenses:", error);
      res.status(500).json({ message: "Failed to fetch expenses" });
    }
  });

  router.get('/trips/:id/expenses/balances', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const tripId = parseInt(req.params.id);
      const balances = await storage.calculateExpenseBalances(tripId);
      res.json(balances);
    } catch (error) {
      console.error("Error calculating balances:", error);
      res.status(500).json({ message: "Failed to calculate balances" });
    }
  });

  app.use('/api', router);
  
  return httpServer;
}

// Augment Express Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: User;
      session?: any;
    }
  }
}
