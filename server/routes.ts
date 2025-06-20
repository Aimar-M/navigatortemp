import express, { type Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { pool } from "./db";
import { storage } from "./db-storage";
import { db } from "./db";
import { expenseSplits } from "@shared/schema";
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
  
  // Configure session middleware with PostgreSQL store
  const PgSession = connectPgSimple(session);
  app.use(session({
    store: new PgSession({
      pool: pool,
      tableName: 'sessions',
      createTableIfMissing: false
    }),
    secret: process.env.SESSION_SECRET || 'dev-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false, // Set to true if using HTTPS
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
  }));
  
  // Helper function to check for authenticated user
  const ensureUser = (req: Request, res: Response): User | null => {
    if (!req.user) {
      res.status(401).json({ message: 'Authentication required' });
      return null;
    }
    return req.user;
  };
  
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
      
      // Set session for session-based authentication
      if (req.session) {
        req.session.userId = user.id;
      }
      
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
      
      // Debug logging for authentication issues
      console.log('Authentication failed - Session:', req.session?.userId, 'Auth header:', authHeader);
      
      res.status(401).json({ message: 'Authentication required' });
    } catch (error) {
      console.error('Auth error:', error);
      res.status(401).json({ message: 'Authentication error' });
    }
  };

  // Middleware to check if user has confirmed RSVP status for a trip
  const requireConfirmedRSVP = async (req: Request, res: Response, next: Function) => {
    try {
      const user = ensureUser(req, res);
      if (!user) return;

      const tripId = parseInt(req.params.id || req.params.tripId);
      if (isNaN(tripId)) {
        return res.status(400).json({ message: 'Invalid trip ID' });
      }

      const members = await storage.getTripMembers(tripId);
      const member = members.find(m => m.userId === user.id);

      if (!member) {
        return res.status(403).json({ message: 'Not a member of this trip' });
      }

      // Allow organizer regardless of RSVP status
      const trip = await storage.getTrip(tripId);
      if (trip?.organizer === user.id) {
        return next();
      }

      // Check RSVP status
      if (member.rsvpStatus !== 'confirmed') {
        return res.status(403).json({ 
          message: 'RSVP confirmation required', 
          rsvpStatus: member.rsvpStatus,
          requiresRSVP: true 
        });
      }

      next();
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
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
      
      // Set removalLogicVersion to 2 for new trips to enable enhanced removal system
      const tripWithEnhancedRemoval = {
        ...tripData,
        removalLogicVersion: 2
      };
      
      const trip = await storage.createTrip(tripWithEnhancedRemoval);
      
      // Automatically add the organizer as a confirmed member with full access
      await storage.addTripMember({
        tripId: trip.id,
        userId: user.id,
        status: 'confirmed',
        rsvpStatus: 'confirmed',
        paymentStatus: 'not_required', // Organizers never need to pay
        paymentAmount: null
      });
      
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
      
      // Filter trips to only include those where user has confirmed RSVP status OR is the organizer
      const confirmedTrips = trips.filter(trip => {
        const membership = tripMemberships.find(m => m.tripId === trip.id);
        // Include if user is organizer OR has confirmed RSVP status
        return (trip.organizer === user.id) || (membership && membership.rsvpStatus === 'confirmed');
      });
      
      // Fetch member counts and user settings for each trip
      const tripsWithMemberCounts = await Promise.all(confirmedTrips.map(async (trip) => {
        const members = await storage.getTripMembers(trip.id);
        // Count only confirmed members with confirmed RSVP status
        const confirmedMembers = members.filter(member => 
          member.status === 'confirmed' && member.rsvpStatus === 'confirmed'
        );
        
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

  // Get trips where user has pending RSVP status
  router.get('/trips/rsvp/pending', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = ensureUser(req, res);
      if (!user) return;
      
      const tripMemberships = await storage.getTripMembershipsByUser(user.id);
      
      // Filter to only pending RSVP status trips
      const pendingRSVPMemberships = tripMemberships.filter(membership => 
        membership.rsvpStatus === 'pending'
      );
      
      // Get trip details for pending RSVP trips
      const pendingTrips = await Promise.all(
        pendingRSVPMemberships.map(async (membership) => {
          const trip = await storage.getTrip(membership.tripId);
          if (!trip) return null;
          
          return {
            ...trip,
            membershipStatus: membership.status,
            rsvpStatus: membership.rsvpStatus,
            joinedAt: membership.joinedAt
          };
        })
      );
      
      // Filter out null trips and return
      const validPendingTrips = pendingTrips.filter(trip => trip !== null);
      res.json(validPendingTrips);
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Get pending memberships with full details (for home page pending invitations)
  router.get('/trips/memberships/pending', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = ensureUser(req, res);
      if (!user) return;
      
      const tripMemberships = await storage.getTripMembershipsByUser(user.id);
      
      // Get pending memberships with full trip and organizer details
      const pendingMemberships = await Promise.all(
        tripMemberships
          .filter(membership => membership.rsvpStatus === 'pending')
          .map(async (membership) => {
            const trip = await storage.getTrip(membership.tripId);
            if (!trip) return null;
            
            // Get organizer details
            const organizer = await storage.getUser(trip.organizer);
            const { password: _, ...organizerWithoutPassword } = organizer || {};
            
            return {
              membership: {
                tripId: membership.tripId,
                userId: membership.userId,
                status: membership.status,
                rsvpStatus: membership.rsvpStatus,
                joinedAt: membership.joinedAt,
                paymentStatus: membership.paymentStatus,
                paymentAmount: membership.paymentAmount,
                paymentMethod: membership.paymentMethod
              },
              trip: {
                id: trip.id,
                name: trip.name,
                destination: trip.destination,
                startDate: trip.startDate,
                endDate: trip.endDate,
                description: trip.description,
                requiresDownPayment: trip.requiresDownPayment,
                downPaymentAmount: trip.downPaymentAmount
              },
              organizer: organizerWithoutPassword
            };
          })
      );
      
      res.json(pendingMemberships.filter(Boolean));
    } catch (error) {
      console.error('Error fetching pending memberships:', error);
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

  // Update admin-only itinerary setting
  router.patch('/trips/:id/admin-settings', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = ensureUser(req, res);
      if (!user) return;

      const tripId = parseInt(req.params.id);
      if (isNaN(tripId)) {
        return res.status(400).json({ message: 'Invalid trip ID' });
      }

      const trip = await storage.getTrip(tripId);
      if (!trip) {
        return res.status(404).json({ message: 'Trip not found' });
      }

      // Check if user is an admin of this trip
      const members = await storage.getTripMembers(tripId);
      const currentMember = members.find(m => m.userId === user.id);
      
      if (!currentMember?.isAdmin) {
        return res.status(403).json({ message: 'Only trip admins can modify admin settings' });
      }

      const { adminOnlyItinerary } = req.body;
      if (typeof adminOnlyItinerary !== 'boolean') {
        return res.status(400).json({ message: 'adminOnlyItinerary must be a boolean' });
      }

      const updatedTrip = await storage.updateTrip(tripId, { adminOnlyItinerary });
      res.json(updatedTrip);
    } catch (error) {
      console.error('Error updating admin settings:', error);
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
      
      // Initialize payment status based on trip requirements
      const paymentStatus = trip.requiresDownPayment ? 'not_required' : 'not_required';
      
      const member = await storage.addTripMember({
        tripId,
        userId: userToAdd.id,
        status: 'pending',
        rsvpStatus: 'pending', // New invitations default to pending RSVP
        paymentStatus,
        paymentAmount: trip.requiresDownPayment ? trip.downPaymentAmount?.toString() : null
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
      
      // Get detailed info about each member including payment information
      const membersWithDetails = await Promise.all(
        members.map(async (member) => {
          const user = await storage.getUser(member.userId);
          if (!user) return null;
          
          const { password, ...userWithoutPassword } = user;
          return {
            ...member,
            user: userWithoutPassword,
            // Ensure payment fields are included
            paymentMethod: member.paymentMethod,
            paymentStatus: member.paymentStatus,
            paymentAmount: member.paymentAmount,
            paymentSubmittedAt: member.paymentSubmittedAt,
            paymentConfirmedAt: member.paymentConfirmedAt
          };
        })
      );
      
      res.json(membersWithDetails.filter(Boolean));
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Check member removal eligibility (enhanced version 2+ logic)
  router.get('/trips/:tripId/members/:userId/removal-eligibility', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = ensureUser(req, res);
      if (!user) return;
      
      const tripId = parseInt(req.params.tripId);
      const userId = parseInt(req.params.userId);
      
      if (isNaN(tripId) || isNaN(userId)) {
        return res.status(400).json({ message: 'Invalid trip ID or user ID' });
      }
      
      // Get trip and verify admin access
      const trip = await storage.getTrip(tripId);
      if (!trip) {
        return res.status(404).json({ message: 'Trip not found' });
      }
      
      const members = await storage.getTripMembers(tripId);
      const currentMember = members.find(m => m.userId === user.id);
      
      if (!currentMember?.isAdmin && trip.organizer !== user.id) {
        return res.status(403).json({ message: 'Only admins can check removal eligibility' });
      }
      
      const eligibility = await storage.analyzeMemberRemovalEligibility(tripId, userId);
      res.json(eligibility);
      
    } catch (error) {
      console.error('Error checking removal eligibility:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Remove member from trip with content handling options
  router.delete('/trips/:tripId/members/:userId', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = ensureUser(req, res);
      if (!user) return;
      
      const tripId = parseInt(req.params.tripId);
      const userIdToRemove = parseInt(req.params.userId);
      const { removeActivities = false, removeExpenses = false } = req.body;
      
      if (isNaN(tripId) || isNaN(userIdToRemove)) {
        return res.status(400).json({ message: 'Invalid trip ID or user ID' });
      }
      
      // Get trip details
      const trip = await storage.getTrip(tripId);
      if (!trip) {
        return res.status(404).json({ message: 'Trip not found' });
      }
      
      // Get all members to check permissions
      const members = await storage.getTripMembers(tripId);
      const currentUserMember = members.find(m => m.userId === user.id);
      const memberToRemove = members.find(m => m.userId === userIdToRemove);
      
      if (!currentUserMember) {
        return res.status(403).json({ message: 'Not a member of this trip' });
      }
      
      if (!memberToRemove) {
        return res.status(404).json({ message: 'Member not found' });
      }
      
      // Check if current user is admin (organizer or has admin privileges)
      const isCurrentUserAdmin = currentUserMember.userId === trip.organizer || currentUserMember.isAdmin;
      
      if (!isCurrentUserAdmin) {
        return res.status(403).json({ message: 'Only admins can remove members' });
      }
      
      // Cannot remove the organizer
      if (userIdToRemove === trip.organizer) {
        return res.status(403).json({ message: 'Cannot remove the trip organizer' });
      }
      
      // Cannot remove yourself
      if (userIdToRemove === user.id) {
        return res.status(403).json({ message: 'Cannot remove yourself from the trip' });
      }
      
      // Check if this is the last admin (excluding organizer)
      const adminCount = members.filter(m => m.isAdmin || m.userId === trip.organizer).length;
      const isLastAdmin = adminCount <= 1 && memberToRemove.isAdmin;
      
      if (isLastAdmin) {
        return res.status(403).json({ message: 'Cannot remove the last admin from the trip' });
      }
      
      // Handle activities if requested
      if (removeActivities) {
        const activities = await storage.getActivitiesByTrip(tripId);
        const userActivities = activities.filter(activity => activity.createdBy === userIdToRemove);
        
        for (const activity of userActivities) {
          await storage.deleteActivity(activity.id);
        }
      } else {
        // Keep activities but remove user's RSVP and mark as created by removed user
        const activities = await storage.getActivitiesByTrip(tripId);
        const userActivities = activities.filter(activity => activity.createdBy === userIdToRemove);
        
        for (const activity of userActivities) {
          // Remove user's RSVP
          const rsvps = await storage.getActivityRSVPs(activity.id);
          const userRSVP = rsvps.find(rsvp => rsvp.userId === userIdToRemove);
          if (userRSVP) {
            await storage.updateActivityRSVP(activity.id, userIdToRemove, 'declined');
          }
          
          // Mark activity as created by removed user - set to organizer instead of invalid user
          await storage.updateActivity(activity.id, {
            name: `${activity.name} (Created by removed user)`,
            createdBy: trip.organizer // Assign to organizer instead of invalid ID
          });
        }
      }
      
      // Handle expenses if requested
      if (removeExpenses) {
        const expenses = await storage.getExpensesByTrip(tripId);
        const userExpenses = expenses.filter(expense => expense.submittedBy === userIdToRemove);
        
        for (const expense of userExpenses) {
          // First remove all expense splits for this expense
          await storage.removeExpenseSplits(expense.id);
          // Then delete the expense itself
          await storage.deleteExpense(expense.id);
        }
      } else {
        // Keep expenses but mark as submitted by removed user
        const expenses = await storage.getExpensesByTrip(tripId);
        const userExpenses = expenses.filter(expense => expense.submittedBy === userIdToRemove);
        
        for (const expense of userExpenses) {
          await storage.updateExpense(expense.id, {
            description: `${expense.description} (Submitted by removed user)`,
            submittedBy: trip.organizer // Assign to organizer instead of invalid ID
          });
        }
      }
      
      // DO NOT remove user from expense splits - this would alter financial history
      // and change other users' balances. Instead, we preserve all financial records
      // and only remove the user from membership/RSVPs.
      
      // Remove the member from the trip
      const removed = await storage.removeTripMember(tripId, userIdToRemove);
      
      if (!removed) {
        return res.status(500).json({ message: 'Failed to remove member' });
      }
      
      res.json({ 
        message: 'Member removed successfully',
        removedActivities: removeActivities,
        removedExpenses: removeExpenses
      });
      
    } catch (error) {
      console.error('Error removing member:', error);
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

  // Update trip member RSVP status (no RSVP requirement for this endpoint)
  router.put('/trips/:tripId/members/:userId/rsvp', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = ensureUser(req, res);
      if (!user) return;
      
      const tripId = parseInt(req.params.tripId);
      const userId = parseInt(req.params.userId);
      const { rsvpStatus } = req.body;
      
      if (isNaN(tripId) || isNaN(userId)) {
        return res.status(400).json({ message: 'Invalid trip ID or user ID' });
      }
      
      if (!['pending', 'confirmed', 'declined'].includes(rsvpStatus)) {
        return res.status(400).json({ message: 'Invalid RSVP status' });
      }
      
      // Only the user themselves can update their RSVP status
      if (userId !== user.id) {
        return res.status(403).json({ message: 'You can only update your own RSVP status' });
      }
      
      const updatedMember = await storage.updateTripMemberRSVPStatus(tripId, userId, rsvpStatus);
      
      if (!updatedMember) {
        return res.status(404).json({ message: 'Trip member not found' });
      }
      
      res.json(updatedMember);
    } catch (error) {
      console.error('Error updating trip member RSVP status:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  // RSVP Payment Routes
  router.post('/trips/:tripId/members/:userId/payment', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = ensureUser(req, res);
      if (!user) return;
      
      const tripId = parseInt(req.params.tripId);
      const userId = parseInt(req.params.userId);
      const { paymentMethod } = req.body;
      
      if (isNaN(tripId) || isNaN(userId)) {
        return res.status(400).json({ message: 'Invalid trip ID or user ID' });
      }
      
      // Only the user themselves can submit payment
      if (userId !== user.id) {
        return res.status(403).json({ message: 'You can only submit payment for yourself' });
      }
      
      if (!['venmo', 'paypal', 'cash'].includes(paymentMethod)) {
        return res.status(400).json({ message: 'Invalid payment method' });
      }
      
      // Get trip details to check payment requirements
      const trip = await storage.getTrip(tripId);
      if (!trip) {
        return res.status(404).json({ message: 'Trip not found' });
      }
      
      if (!trip.requiresDownPayment) {
        return res.status(400).json({ message: 'This trip does not require down payment' });
      }
      
      // Update member with payment info
      const updatedMember = await storage.updateTripMemberPaymentInfo(tripId, userId, {
        paymentMethod,
        paymentStatus: 'pending',  // Always set to pending until organizer confirms
        paymentAmount: trip.downPaymentAmount?.toString(),
        paymentSubmittedAt: new Date()
      });
      
      // Update RSVP status to pending until organizer confirms payment
      await storage.updateTripMemberRSVPStatus(tripId, userId, 'pending');
      
      res.json({ message: 'Payment submitted successfully', member: updatedMember });
    } catch (error) {
      console.error('Error submitting payment:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  router.post('/trips/:tripId/members/:userId/confirm-payment', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = ensureUser(req, res);
      if (!user) return;
      
      const tripId = parseInt(req.params.tripId);
      const userId = parseInt(req.params.userId);
      
      if (isNaN(tripId) || isNaN(userId)) {
        return res.status(400).json({ message: 'Invalid trip ID or user ID' });
      }
      
      // Only trip organizer can confirm payments
      const trip = await storage.getTrip(tripId);
      if (!trip) {
        return res.status(404).json({ message: 'Trip not found' });
      }
      
      if (trip.organizer !== user.id) {
        return res.status(403).json({ message: 'Only trip organizer can confirm payments' });
      }
      
      // Update payment status and RSVP status
      await storage.updateTripMemberPaymentInfo(tripId, userId, {
        paymentStatus: 'confirmed',
        paymentConfirmedAt: new Date()
      });
      
      await storage.updateTripMemberRSVPStatus(tripId, userId, 'confirmed');
      
      // Update the main status to confirmed to grant full access
      await storage.updateTripMemberStatus(tripId, userId, 'confirmed');
      
      res.json({ message: 'Payment confirmed successfully' });
    } catch (error) {
      console.error('Error confirming payment:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  router.post('/trips/:tripId/members/:userId/reject-payment', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = ensureUser(req, res);
      if (!user) return;
      
      const tripId = parseInt(req.params.tripId);
      const userId = parseInt(req.params.userId);
      
      if (isNaN(tripId) || isNaN(userId)) {
        return res.status(400).json({ message: 'Invalid trip ID or user ID' });
      }
      
      // Only trip organizer can reject payments
      const trip = await storage.getTrip(tripId);
      if (!trip) {
        return res.status(404).json({ message: 'Trip not found' });
      }
      
      if (trip.organizer !== user.id) {
        return res.status(403).json({ message: 'Only trip organizer can reject payments' });
      }
      
      // Update payment status and RSVP status to declined
      await storage.updateTripMemberPaymentInfo(tripId, userId, {
        paymentStatus: 'rejected'
      });
      
      await storage.updateTripMemberRSVPStatus(tripId, userId, 'declined');
      
      // Update the main status to declined
      await storage.updateTripMemberStatus(tripId, userId, 'declined');
      
      res.json({ message: 'Payment rejected successfully' });
    } catch (error) {
      console.error('Error rejecting payment:', error);
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

  // Update member admin status
  router.patch('/trips/:tripId/members/:userId/admin', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = ensureUser(req, res);
      if (!user) return;
      
      const tripId = parseInt(req.params.tripId);
      const userId = parseInt(req.params.userId);
      const { isAdmin } = req.body;
      
      if (isNaN(tripId) || isNaN(userId)) {
        return res.status(400).json({ message: 'Invalid trip ID or user ID' });
      }
      
      if (typeof isAdmin !== 'boolean') {
        return res.status(400).json({ message: 'isAdmin must be a boolean value' });
      }
      
      const trip = await storage.getTrip(tripId);
      if (!trip) {
        return res.status(404).json({ message: 'Trip not found' });
      }
      
      // Check if user is admin (organizer or has admin flag)
      const members = await storage.getTripMembers(tripId);
      const currentUserMember = members.find(member => member.userId === user.id);
      const isCurrentUserAdmin = currentUserMember?.isAdmin || trip.organizer === user.id;
      
      if (!isCurrentUserAdmin) {
        return res.status(403).json({ message: 'Only trip admins can modify admin access' });
      }
      
      // Don't allow changing organizer's admin status
      if (trip.organizer === userId) {
        return res.status(400).json({ message: 'Cannot modify organizer admin status' });
      }
      
      // If demoting, ensure at least one admin remains
      if (!isAdmin) {
        const adminCount = members.filter(member => member.isAdmin || member.userId === trip.organizer).length;
        const targetMember = members.find(member => member.userId === userId);
        
        if (adminCount <= 1 && (targetMember?.isAdmin || userId === trip.organizer)) {
          return res.status(400).json({ message: 'At least one admin is required per trip' });
        }
      }
      
      const updatedMember = await storage.updateTripMemberAdminStatus(tripId, userId, isAdmin);
      if (!updatedMember) {
        return res.status(404).json({ message: 'Trip member not found' });
      }
      
      res.json(updatedMember);
    } catch (error) {
      console.error('Error updating member admin status:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  // Activity Routes
  
  // Preview endpoint for activities (no authentication required - limited data only)
  router.get('/trips/:id/activities/preview', async (req: Request, res: Response) => {
    try {
      const tripId = parseInt(req.params.id);
      if (isNaN(tripId)) {
        return res.status(400).json({ message: 'Invalid trip ID' });
      }
      
      const trip = await storage.getTrip(tripId);
      if (!trip) {
        return res.status(404).json({ message: 'Trip not found' });
      }
      
      const activities = await storage.getActivitiesByTrip(tripId);
      
      // Return preview data only (no sensitive information)
      const previewActivities = activities.map(activity => ({
        id: activity.id,
        name: activity.name,
        description: activity.description,
        date: activity.date,
        location: activity.location,
        duration: activity.duration,
        cost: activity.cost
      }));
      
      res.json(previewActivities);
    } catch (error) {
      console.error('Error fetching activity preview:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  router.post('/trips/:id/activities', isAuthenticated, requireConfirmedRSVP, async (req: Request, res: Response) => {
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
      const currentMember = members.find(member => 
        member.userId === authUser.id && member.status === 'confirmed'
      );
      
      if (!currentMember) {
        console.log('User not a confirmed member:', authUser.id, tripId);
        return res.status(403).json({ message: 'Not a confirmed member of this trip' });
      }

      // Check admin-only itinerary permission
      if (trip.adminOnlyItinerary && !currentMember.isAdmin) {
        return res.status(403).json({ message: 'Only trip admins can add to the itinerary' });
      }
      
      try {
        // Convert date string to Date object and handle empty strings before validation
        const data = {
          ...req.body,
          tripId,
          date: req.body.date ? new Date(req.body.date) : undefined,
          duration: req.body.duration === '' ? null : req.body.duration || null,
          cost: req.body.cost === '' ? null : req.body.cost,
          checkInDate: req.body.checkInDate ? new Date(req.body.checkInDate) : null,
          checkOutDate: req.body.checkOutDate ? new Date(req.body.checkOutDate) : null,
          createdBy: authUser.id
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
  
  router.get('/trips/:id/activities', isAuthenticated, requireConfirmedRSVP, async (req: Request, res: Response) => {
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
      
      // For each activity, get the RSVPs and calculate counts
      const activitiesWithRsvps = await Promise.all(
        activities.map(async (activity) => {
          const rsvps = await storage.getActivityRSVPs(activity.id);
          const confirmedCount = rsvps.filter(rsvp => rsvp.status === 'going').length;
          const totalCount = members.length; // Total trip members
          
          return {
            ...activity,
            rsvps,
            confirmedCount,
            totalCount
          };
        })
      );
      
      res.json(activitiesWithRsvps);
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  router.put('/activities/:id', isAuthenticated, requireConfirmedRSVP, async (req: Request, res: Response) => {
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
      
      // Get trip and check permissions
      const trip = await storage.getTrip(activity.tripId);
      if (!trip) {
        return res.status(404).json({ message: 'Trip not found' });
      }

      // Check if user is a confirmed member
      const members = await storage.getTripMembers(activity.tripId);
      const currentMember = members.find(member => 
        member.userId === user.id && member.status === 'confirmed'
      );
      
      if (!currentMember) {
        return res.status(403).json({ message: 'Not a confirmed member of this trip' });
      }

      // Check admin-only itinerary permission
      if (trip.adminOnlyItinerary && !currentMember.isAdmin) {
        return res.status(403).json({ message: 'Only trip admins can edit the itinerary' });
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
      
      // Get trip and check permissions
      const trip = await storage.getTrip(activity.tripId);
      if (!trip) {
        return res.status(404).json({ message: 'Trip not found' });
      }

      // Check if user is a confirmed member
      const members = await storage.getTripMembers(activity.tripId);
      const currentMember = members.find(member => 
        member.userId === user.id && member.status === 'confirmed'
      );
      
      if (!currentMember) {
        return res.status(403).json({ message: 'Not a confirmed member of this trip' });
      }

      // Check admin-only itinerary permission or if user is activity creator
      const isActivityCreator = activity.createdBy === user.id;
      if (trip.adminOnlyItinerary && !currentMember.isAdmin && !isActivityCreator) {
        return res.status(403).json({ message: 'Only trip admins can delete activities' });
      }
      
      const success = await storage.deleteActivity(activityId);
      if (!success) {
        return res.status(404).json({ message: 'Activity not found' });
      }
      
      // Notify trip members about the deleted activity and any associated expenses
      broadcastToTrip(wss, activity.tripId, {
        type: 'DELETE_ACTIVITY',
        data: { id: activityId, tripId: activity.tripId }
      });
      
      res.json({ message: 'Activity deleted successfully' });
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Activity ownership transfer endpoint
  router.put('/activities/:id/transfer-ownership', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = ensureUser(req, res);
      if (!user) return;
      
      const activityId = parseInt(req.params.id);
      const { newOwnerId } = req.body;
      
      if (isNaN(activityId) || !newOwnerId || isNaN(newOwnerId)) {
        return res.status(400).json({ message: 'Invalid activity ID or new owner ID' });
      }
      
      const activity = await storage.getActivity(activityId);
      if (!activity) {
        return res.status(404).json({ message: 'Activity not found' });
      }
      
      // Get trip and check permissions
      const trip = await storage.getTrip(activity.tripId);
      if (!trip) {
        return res.status(404).json({ message: 'Trip not found' });
      }

      // Check if user is admin or organizer
      const members = await storage.getTripMembers(activity.tripId);
      const currentMember = members.find(member => member.userId === user.id);
      const isAdminOrOrganizer = currentMember?.isAdmin || trip.organizer === user.id;
      
      if (!isAdminOrOrganizer) {
        return res.status(403).json({ message: 'Only trip admins and organizers can transfer activity ownership' });
      }

      // Verify new owner is a confirmed member of the trip
      const newOwnerMember = members.find(member => 
        member.userId === newOwnerId && member.status === 'confirmed'
      );
      
      if (!newOwnerMember) {
        return res.status(400).json({ message: 'New owner must be a confirmed member of the trip' });
      }
      
      const updatedActivity = await storage.transferActivityOwnership(activityId, newOwnerId);
      if (!updatedActivity) {
        return res.status(404).json({ message: 'Failed to transfer ownership' });
      }
      
      res.json({ 
        message: 'Activity ownership transferred successfully',
        activity: updatedActivity 
      });
    } catch (error) {
      console.error('Error transferring activity ownership:', error);
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

      // Auto-create expense for prepaid activities when user confirms attendance
      if (status === 'going' && activity.paymentType === 'prepaid' && activity.cost && parseFloat(activity.cost) > 0) {
        try {
          // Check if expense already exists for this activity
          const existingExpenses = await storage.getExpensesByTrip(activity.tripId);
          let existingActivityExpense = existingExpenses.find(expense => 
            expense.activityId === activityId
          );

          if (!existingActivityExpense) {
            // Find the activity creator (who is paying for the activity)
            const activityCreatorId = activity.createdBy || user.id;
            
            // Create expense for the activity
            const expense = await storage.createExpense({
              tripId: activity.tripId,
              title: `Activity: ${activity.name}`,
              amount: activity.cost,
              currency: 'USD',
              category: 'activities',
              description: `Prepaid activity expense for ${activity.name}`,
              paidBy: activityCreatorId,
              activityId: activityId,
              date: new Date()
            });

            existingActivityExpense = expense;
          }

          // Get all users who have RSVP'd "going" to this activity
          const allRsvps = await storage.getActivityRSVPs(activityId);
          const goingUserIds = allRsvps.filter(rsvp => rsvp.status === 'going').map(rsvp => rsvp.userId);
          
          // Include the current user if they're confirming and not already in the list
          if (!goingUserIds.includes(user.id)) {
            goingUserIds.push(user.id);
          }

          // Calculate cost per person
          const costPerPerson = parseFloat(activity.cost) / goingUserIds.length;

          // Remove existing splits and recreate them with updated amounts
          await storage.removeExpenseSplits(existingActivityExpense.id);

          // Create expense splits for all going users
          for (const userId of goingUserIds) {
            await storage.createExpenseSplit({
              expenseId: existingActivityExpense.id,
              userId: userId,
              amount: costPerPerson.toFixed(2)
            });
          }
        } catch (expenseError) {
          console.error('Error creating activity expense:', expenseError);
          // Don't fail the RSVP if expense creation fails
        }
      }

      // Auto-create individual expense for prepaid per person activities when user confirms attendance
      if (status === 'going' && activity.paymentType === 'prepaid_per_person' && activity.cost && parseFloat(activity.cost) > 0) {
        try {
          // Find the activity creator (who paid for the activity)
          const activityCreatorId = activity.createdBy || user.id;
          
          // Only create expense if the user RSVPing is NOT the activity creator
          // The creator shouldn't owe themselves money
          if (user.id !== activityCreatorId) {
            // Check if expense already exists for this specific user and activity
            const existingExpenses = await storage.getExpensesByTrip(activity.tripId);
            const existingUserExpense = existingExpenses.find(expense => 
              expense.activityId === activityId && 
              expense.description?.includes(`for ${user.username || user.name || `User ${user.id}`}`)
            );

            if (!existingUserExpense) {
              // Create individual expense for this user
              const expense = await storage.createExpense({
                tripId: activity.tripId,
                title: `Activity: ${activity.name}`,
                amount: activity.cost,
                currency: 'USD',
                category: 'activities',
                description: `Prepaid per-person activity expense for ${user.username || user.name || `User ${user.id}`} - ${activity.name}`,
                paidBy: activityCreatorId,
                activityId: activityId,
                date: new Date()
              });

              // Create expense split for just this user (full amount)
              await storage.createExpenseSplit({
                expenseId: expense.id,
                userId: user.id,
                amount: activity.cost
              });
            }
          }
        } catch (expenseError) {
          console.error('Error creating individual activity expense:', expenseError);
          // Don't fail the RSVP if expense creation fails
        }
      }

      // Handle cancellation for prepaid per person activities
      if (status === 'not going' && activity.paymentType === 'prepaid_per_person' && activity.cost && parseFloat(activity.cost) > 0) {
        try {
          // Find and remove the individual expense for this user
          const existingExpenses = await storage.getExpensesByTrip(activity.tripId);
          const userExpense = existingExpenses.find(expense => 
            expense.activityId === activityId && 
            expense.description?.includes(`for ${user.username || user.name || `User ${user.id}`}`)
          );

          if (userExpense) {
            // Remove the expense splits first
            await storage.removeExpenseSplits(userExpense.id);
            // Then remove the expense itself
            await storage.deleteExpense(userExpense.id);
          }
        } catch (expenseError) {
          console.error('Error removing individual activity expense:', expenseError);
          // Don't fail the RSVP if expense removal fails
        }
      }
      
      res.json(rsvp);
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  // Message Routes
  router.get('/trips/:id/messages', isAuthenticated, requireConfirmedRSVP, async (req: Request, res: Response) => {
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
              name: userWithoutPassword.name || userWithoutPassword.username || 'Anonymous',
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
  
  router.post('/trips/:id/messages', isAuthenticated, requireConfirmedRSVP, async (req: Request, res: Response) => {
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
              name: user.name || user.username || 'Anonymous',
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
              name: user.name || user.username || 'Anonymous',
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

  // Get individual activity details with RSVPs
  router.get('/activities/:id', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = ensureUser(req, res);
      if (!user) return;

      const activityId = parseInt(req.params.id);
      const activity = await storage.getActivity(activityId);
      
      if (!activity) {
        return res.status(404).json({ message: 'Activity not found' });
      }

      // Get RSVPs for this activity
      const rsvps = await storage.getActivityRSVPs(activityId);
      
      // Add user information to RSVPs
      const rsvpsWithUsers = await Promise.all(
        rsvps.map(async (rsvp) => {
          const rsvpUser = await storage.getUser(rsvp.userId);
          return {
            ...rsvp,
            user: {
              id: rsvpUser?.id,
              name: rsvpUser?.name || rsvpUser?.username || 'Unknown User',
              avatar: rsvpUser?.avatar
            }
          };
        })
      );

      const activityWithRSVPs = {
        ...activity,
        rsvps: rsvpsWithUsers
      };

      res.json(activityWithRSVPs);
    } catch (error) {
      console.error('Error fetching activity details:', error);
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
      
      // Get trip activities (public information for invitation)
      const activities = await storage.getActivitiesByTrip(invitation.tripId);
      
      // Get trip members (public information for invitation)
      const members = await storage.getTripMembers(invitation.tripId);
      
      // Get user details for each member
      const membersWithUser = await Promise.all(
        members.map(async (member) => {
          const user = await storage.getUser(member.userId);
          return {
            userId: member.userId,
            status: member.status,
            user: user ? {
              id: user.id,
              name: user.name || user.username,
              username: user.username
            } : null
          };
        })
      );
      
      // Return comprehensive trip details for the invitation page
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
          description: trip.description,
          requiresDownPayment: trip.requiresDownPayment,
          downPaymentAmount: trip.downPaymentAmount,
          cover: trip.cover,
          organizer: organizer ? {
            id: organizer.id,
            name: organizer.name || organizer.username,
            username: organizer.username
          } : null
        },
        activities: activities.map(activity => ({
          id: activity.id,
          title: activity.name,
          description: activity.description || '',
          date: activity.date.toISOString().split('T')[0],
          time: activity.date.toISOString().split('T')[1].substring(0, 5),
          location: activity.location || ''
        })),
        members: membersWithUser.filter(member => member.user !== null)
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
      
      // Get trip details to check if down payment is required
      const trip = await storage.getTrip(invitation.tripId);
      if (!trip) {
        return res.status(404).json({ message: 'Trip not found' });
      }
      
      // Determine status based on whether trip requires down payment
      let memberStatus = "confirmed";
      let rsvpStatus = "pending";
      
      if (!trip.requiresDownPayment) {
        // No down payment required - can auto-confirm
        rsvpStatus = "confirmed";
      }
      // If down payment is required, keep rsvpStatus as "pending" to trigger payment flow
      
      const tripMember = await storage.addTripMember({
        tripId: invitation.tripId,
        userId: user.id,
        status: memberStatus,
        rsvpStatus: rsvpStatus,
        rsvpDate: rsvpStatus === "confirmed" ? new Date() : undefined
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
  
  // Removed duplicate expense route - using the one at line 2860 instead
  
  // Get all expenses for a trip
  router.get('/trips/:id/expenses', isAuthenticated, requireConfirmedRSVP, async (req: Request, res: Response) => {
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
  router.get('/trips/:id/expenses/summary', isAuthenticated, requireConfirmedRSVP, async (req: Request, res: Response) => {
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
  router.put('/expenses/:id', isAuthenticated, requireConfirmedRSVP, async (req: Request, res: Response) => {
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
      
      // Implement enhanced permission system for financial integrity
      const trip = await storage.getTrip(expense.tripId);
      const members = await storage.getTripMembers(expense.tripId);
      const membership = members.find(m => m.userId === user.id);
      const isAdmin = membership?.isAdmin || false;
      const isOrganizer = trip?.organizer === user.id;
      
      // Check for financial integrity restrictions
      // 1. Check if this expense was involved in existing settlements
      const settlements = await storage.getSettlementsByTrip(expense.tripId);
      if (settlements.length > 0) {
        // Only block if this expense existed before the settlements were created
        const oldestSettlement = Math.min(...settlements.map(s => new Date(s.createdAt).getTime()));
        const expenseCreatedAt = new Date(expense.createdAt).getTime();
        
        if (expenseCreatedAt < oldestSettlement) {
          return res.status(403).json({ 
            message: `Cannot modify this expense because it was included in settlement calculations. Changing expenses that were part of settlements would make the financial records inconsistent.` 
          });
        }
      }
      
      // 2. Check if any users involved in this expense have been removed from the trip
      const expenseSplits = await storage.getExpenseSplits(expense.id);
      const involvedUserIds = [expense.paidBy, ...expenseSplits.map(split => split.userId)];
      const currentMemberIds = members.map(m => m.userId);
      
      const hasRemovedUsers = involvedUserIds.some(userId => !currentMemberIds.includes(userId));
      if (hasRemovedUsers) {
        return res.status(403).json({ 
          message: 'Cannot modify this expense because it involves users who have been removed from the trip. Changing expenses with removed users would create inconsistent financial data.' 
        });
      }
      
      // Check if this is a manual expense (not linked to an activity)
      const isManualExpense = !expense.activityId;
      
      if (isManualExpense) {
        // For manual expenses: only the creator can update
        if (expense.paidBy !== user.id) {
          return res.status(403).json({ 
            message: 'Only the creator of a manual expense can modify it' 
          });
        }
      } else {
        // For prepaid activity expenses: admins and organizer can update
        if (!isAdmin && !isOrganizer) {
          return res.status(403).json({ 
            message: 'Only trip admins can modify prepaid activity expenses' 
          });
        }
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
      
      // Implement enhanced permission system for financial integrity
      const trip = await storage.getTrip(expense.tripId);
      const members = await storage.getTripMembers(expense.tripId);
      const membership = members.find(m => m.userId === user.id);
      const isAdmin = membership?.isAdmin || false;
      const isOrganizer = trip?.organizer === user.id;
      
      // Check for financial integrity restrictions
      // 1. Check if this expense was involved in existing settlements
      const settlements = await storage.getSettlementsByTrip(expense.tripId);
      if (settlements.length > 0) {
        // Only block if this expense existed before the settlements were created
        const oldestSettlement = Math.min(...settlements.map(s => new Date(s.createdAt).getTime()));
        const expenseCreatedAt = new Date(expense.createdAt).getTime();
        
        if (expenseCreatedAt < oldestSettlement) {
          return res.status(403).json({ 
            message: `Cannot delete this expense because it was included in settlement calculations. Deleting expenses that were part of settlements would corrupt the financial records and make balances inaccurate.` 
          });
        }
      }
      
      // 2. Check if any users involved in this expense have been removed from the trip
      const expenseSplits = await storage.getExpenseSplits(expenseId);
      const involvedUserIds = [expense.paidBy, ...expenseSplits.map(split => split.userId)];
      const currentMemberIds = members.map(m => m.userId);
      
      const hasRemovedUsers = involvedUserIds.some(userId => !currentMemberIds.includes(userId));
      if (hasRemovedUsers) {
        return res.status(403).json({ 
          message: 'Cannot delete this expense because it involves users who have been removed from the trip. Deleting expenses with removed users would create inconsistent financial data.' 
        });
      }
      
      // Check if this is a manual expense (not linked to an activity)
      const isManualExpense = !expense.activityId;
      
      if (isManualExpense) {
        // For manual expenses: only the creator can delete
        if (expense.paidBy !== user.id) {
          return res.status(403).json({ 
            message: 'Only the creator of a manual expense can delete it' 
          });
        }
      } else {
        // For prepaid activity expenses: admins and organizer can delete
        if (!isAdmin && !isOrganizer) {
          return res.status(403).json({ 
            message: 'Only trip admins can delete prepaid activity expenses' 
          });
        }
      }
      
      // If this expense is linked to an activity, delete the activity as well (cascading deletion)
      let activityDeleted = false;
      if (expense.activityId) {
        try {
          const activityExists = await storage.getActivity(expense.activityId);
          if (activityExists) {
            await storage.deleteActivity(expense.activityId);
            activityDeleted = true;
          }
        } catch (activityError) {
          console.error('Error deleting linked activity:', activityError);
          // Continue with expense deletion even if activity deletion fails
        }
      }

      const success = await storage.deleteExpense(expenseId);
      
      if (success) {
        // Notify trip members about the deleted expense
        broadcastToTrip(wss, expense.tripId, {
          type: 'DELETE_EXPENSE',
          data: { id: expenseId, tripId: expense.tripId }
        });

        // If we also deleted an activity, notify about that too
        if (activityDeleted && expense.activityId) {
          broadcastToTrip(wss, expense.tripId, {
            type: 'DELETE_ACTIVITY',
            data: { id: expense.activityId, tripId: expense.tripId }
          });
        }
        
        const message = activityDeleted 
          ? 'Expense and linked activity deleted successfully'
          : 'Expense deleted successfully';
        res.status(200).json({ message });
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
  router.post('/trips/:id/flights', isAuthenticated, requireConfirmedRSVP, async (req: Request, res: Response) => {
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
      
      // Check if user already has a flight for this trip
      const existingFlights = await storage.getFlightInfoByTrip(tripId);
      const userExistingFlight = existingFlights.find(flight => flight.userId === user.id);
      
      if (userExistingFlight) {
        return res.status(400).json({ message: 'You already have a flight registered for this trip. Please edit your existing flight instead.' });
      }
      
      // Try to lookup authentic flight information only
      let flightInfo = null;
      try {
        const { lookupFlightInfo } = await import('./flight-lookup');
        flightInfo = await lookupFlightInfo(req.body.flightNumber, req.body.departureDate || req.body.arrivalDate);
        console.log('Flight lookup result:', flightInfo);
      } catch (error) {
        console.log('Flight lookup failed:', (error as Error).message);
      }
      
      if (flightInfo && flightInfo.airline) {
        // Use only verified data - airline name from API, everything else from user input
        const flightData = insertFlightInfoSchema.parse({
          tripId,
          userId: user.id,
          flightNumber: req.body.flightNumber,
          airline: flightInfo.airline, // Only verified field from API
          departureAirport: req.body.departureAirport || "Not specified",
          departureCity: req.body.departureCity || "Not specified",
          departureTime: new Date(req.body.departureDate || req.body.arrivalDate), // Use user-provided departure date
          arrivalAirport: req.body.arrivalAirport || "Not specified",
          arrivalCity: req.body.arrivalCity || "Not specified",
          arrivalTime: new Date(req.body.departureDate || req.body.arrivalDate), // Use user-provided departure date
          price: req.body.price,
          currency: req.body.currency || "USD",
          bookingReference: req.body.bookingReference,
          bookingStatus: req.body.bookingStatus || "confirmed",
          seatNumber: req.body.seatNumber,
          notes: `Airline verified: ${flightInfo.airline}`,
          flightDetails: {
            userProvidedFlightNumber: req.body.flightNumber,
            userProvidedDepartureDate: req.body.departureDate || req.body.arrivalDate,
            status: "user-provided",
            hasRealTimeData: false,
            verifiedAirline: flightInfo.airline
          }
        });
        
        const flight = await storage.createFlightInfo(flightData);
        
        // Create a corresponding activity in the itinerary
        const activityData = {
          tripId,
          userId: user.id,
          name: `Flight ${req.body.flightNumber}`,
          description: `${flightInfo.airline} flight from departure to arrival`,
          date: new Date(req.body.departureDate || req.body.arrivalDate),
          location: `${req.body.departureAirport || 'Airport'} → ${req.body.arrivalAirport || 'Airport'}`,
          duration: null,
          cost: req.body.price || null
        };
        
        console.log('Creating flight activity:', activityData);
        try {
          const createdActivity = await storage.createActivity(activityData);
          console.log('Successfully created flight activity:', createdActivity);
        } catch (error) {
          console.error('Failed to create activity for flight:', error);
        }
        
        // Notify trip members about the new flight information
        broadcastToTrip(wss, tripId, {
          type: 'NEW_FLIGHT',
          data: flight
        });
        
        res.status(201).json(flight);
      } else {
        // No authentic data available - store only user-provided information
        const flightData = insertFlightInfoSchema.parse({
          tripId,
          userId: user.id,
          flightNumber: req.body.flightNumber,
          airline: "Unknown",
          departureAirport: "TBD",
          departureCity: "TBD",
          departureTime: new Date(req.body.departureDate || req.body.arrivalDate),
          arrivalAirport: "TBD",
          arrivalCity: "TBD",
          arrivalTime: new Date(req.body.departureDate || req.body.arrivalDate),
          price: req.body.price,
          currency: req.body.currency || "USD",
          bookingReference: req.body.bookingReference,
          bookingStatus: req.body.bookingStatus || "confirmed",
          seatNumber: req.body.seatNumber,
          notes: `Flight ${req.body.flightNumber} - no verified data available`,
          flightDetails: {
            userProvidedFlightNumber: req.body.flightNumber,
            userProvidedDepartureDate: req.body.departureDate || req.body.arrivalDate,
            status: "user-provided",
            hasRealTimeData: false
          },
        });
        
        const flight = await storage.createFlightInfo(flightData);
        
        // Create a corresponding activity in the itinerary (even without verified data)
        const activityData = {
          tripId,
          userId: user.id,
          name: `Flight ${req.body.flightNumber}`,
          description: `Flight from departure to arrival`,
          date: new Date(req.body.departureDate || req.body.arrivalDate),
          location: `${req.body.departureAirport || 'Airport'} → ${req.body.arrivalAirport || 'Airport'}`,
          duration: null,
          cost: req.body.price || null
        };
        
        console.log('Creating flight activity (no verified data):', activityData);
        try {
          const createdActivity = await storage.createActivity(activityData);
          console.log('Successfully created flight activity:', createdActivity);
        } catch (error) {
          console.error('Failed to create activity for flight:', error);
        }
        
        // Notify trip members about the new flight information
        broadcastToTrip(wss, tripId, {
          type: 'NEW_FLIGHT',
          data: flight
        });
        
        res.status(201).json(flight);
      }
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
  router.get('/trips/:id/flights', isAuthenticated, requireConfirmedRSVP, async (req: Request, res: Response) => {
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
      
      // If flight number is being updated, re-verify airline information
      let flightInfo = null;
      if (req.body.flightNumber && req.body.flightNumber !== flight.flightNumber) {
        try {
          const { lookupFlightInfo } = await import('./flight-lookup');
          flightInfo = await lookupFlightInfo(req.body.flightNumber, req.body.departureDate || req.body.arrivalDate || flight.flightDetails?.userProvidedDepartureDate);
          console.log('Flight lookup result for update:', flightInfo);
        } catch (error) {
          console.log('Flight lookup failed during update:', (error as Error).message);
        }
      }

      // Prepare update data
      const updateData: any = {};
      
      if (req.body.flightNumber) {
        updateData.flightNumber = req.body.flightNumber.toUpperCase().trim();
        // Update airline if we have verified data
        if (flightInfo?.airline) {
          updateData.airline = flightInfo.airline;
          updateData.notes = `Airline verified: ${flightInfo.airline}`;
        }
      }
      
      if (req.body.departureDate || req.body.arrivalDate) {
        const dateToUse = req.body.departureDate || req.body.arrivalDate;
        updateData.arrivalTime = new Date(dateToUse);
        updateData.departureTime = new Date(dateToUse);
        // Update flight details with new date
        updateData.flightDetails = {
          ...flight.flightDetails,
          userProvidedDepartureDate: dateToUse,
          verifiedAirline: flightInfo?.airline || flight.flightDetails?.verifiedAirline
        };
      }

      const updatedFlight = await storage.updateFlightInfo(flightId, updateData);
      
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
  router.post('/trips/:id/polls', isAuthenticated, requireConfirmedRSVP, async (req: Request, res: Response) => {
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
  router.get('/trips/:id/polls', isAuthenticated, requireConfirmedRSVP, async (req: Request, res: Response) => {
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
      
      // Check if user is a member of the associated trip with confirmed RSVP
      const members = await storage.getTripMembers(poll.tripId);
      const member = members.find(member => member.userId === user.id);
      
      if (!member) {
        return res.status(403).json({ message: 'Not a member of this trip' });
      }
      
      // Allow organizer regardless of RSVP status
      const trip = await storage.getTrip(poll.tripId);
      if (trip?.organizer !== user.id && member.rsvpStatus !== 'confirmed') {
        return res.status(403).json({ 
          message: 'RSVP confirmation required to vote on polls',
          rsvpStatus: member.rsvpStatus,
          requiresRSVP: true 
        });
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
  // Budget Dashboard API - Get aggregated budget data for all user's trips
  router.get('/budget/dashboard', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = ensureUser(req, res);
      if (!user) return;

      // Get all trips for the user
      const userTrips = await storage.getTripsByUser(user.id);
      const userMemberships = await storage.getTripMembershipsByUser(user.id);
      
      // Get all trip IDs where user is a member
      const memberTripIds = userMemberships.map(membership => membership.tripId);
      const allTripIds = [...new Set([...userTrips.map(trip => trip.id), ...memberTripIds])];
      
      // Fetch detailed trip data with budget information
      const tripsWithBudgets = await Promise.all(
        allTripIds.map(async (tripId) => {
          const trip = await storage.getTrip(tripId);
          if (!trip) return null;
          
          const members = await storage.getTripMembers(tripId);
          const memberCount = members.length;
          
          // Calculate trip duration
          const startDate = new Date(trip.startDate);
          const endDate = new Date(trip.endDate);
          const duration = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
          
          // Get activities with costs
          const activities = await storage.getActivitiesByTrip(tripId);
          const activitiesTotal = activities.reduce((sum, activity) => {
            return sum + (activity.cost ? parseFloat(activity.cost.toString()) : 0);
          }, 0);
          
          // Get expenses
          const expenses = await storage.getExpensesByTrip(tripId);
          const expensesTotal = expenses.reduce((sum, expense) => {
            return sum + (expense.amount || 0);
          }, 0);
          
          // Get flight information
          const flights = await storage.getFlightInfoByTrip(tripId);
          const flightsTotal = flights.reduce((sum, flight) => {
            return sum + (flight.price ? parseFloat(flight.price.toString()) : 0);
          }, 0);
          
          // Calculate estimated budget based on destination and duration
          // This would ideally come from saved budget estimates
          const estimatedBudget = {
            accommodation: duration * 80 * memberCount,
            food: duration * 50 * memberCount,
            transportation: duration * 30 * memberCount,
            activities: Math.max(activitiesTotal, duration * 40 * memberCount),
            incidentals: duration * 20 * memberCount,
            flights: Math.max(flightsTotal, 400 * memberCount)
          };
          
          const totalEstimated = Object.values(estimatedBudget).reduce((sum, val) => sum + val, 0);
          const totalActual = expensesTotal;
          
          return {
            tripId: trip.id,
            tripName: trip.name,
            destination: trip.destination,
            startDate: trip.startDate,
            endDate: trip.endDate,
            memberCount,
            duration,
            budgetData: {
              ...estimatedBudget,
              total: totalEstimated,
              actualSpent: totalActual,
              currency: 'USD'
            },
            status: endDate < new Date() ? 'past' : startDate <= new Date() ? 'ongoing' : 'upcoming'
          };
        })
      );
      
      const validTrips = tripsWithBudgets.filter(Boolean);
      res.json(validTrips);
      
    } catch (error) {
      console.error('Error fetching budget dashboard data:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  router.put('/users/profile', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = ensureUser(req, res);
      if (!user) return;

      const { username, email, firstName, lastName, bio, location, venmoUsername, paypalEmail } = req.body;

      // Validate payment methods if provided
      if (venmoUsername && !venmoUsername.startsWith('@')) {
        return res.status(400).json({ message: 'Venmo username must start with @' });
      }

      if (paypalEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(paypalEmail)) {
        return res.status(400).json({ message: 'Please enter a valid PayPal email address' });
      }

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
        venmoUsername: venmoUsername || null,
        paypalEmail: paypalEmail || null,
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

  // Expense tracking routes - rebuilt for activity integration
  router.post('/trips/:id/expenses', isAuthenticated, requireConfirmedRSVP, async (req: Request, res: Response) => {
    try {
      const tripId = parseInt(req.params.id);
      const user = ensureUser(req, res);
      if (!user) return;
      
      const { title, amount, category, description, paidBy, splitWith } = req.body;
      
      console.log('Creating manual expense:', { title, amount, category, description, paidBy, splitWith });
      
      // Validate required fields
      if (!title || !amount || !paidBy || !splitWith) {
        console.log('Validation failed:', { title: !!title, amount: !!amount, paidBy: !!paidBy, splitWith: !!splitWith });
        return res.status(400).json({ message: "Missing required fields" });
      }
      
      // Get trip members and validate that all expense participants have confirmed RSVP status
      const tripMembers = await storage.getTripMembers(tripId);
      const confirmedMemberIds = tripMembers
        .filter(member => member.rsvpStatus === 'confirmed')
        .map(member => member.userId);
      
      // Validate that payer has confirmed RSVP status
      if (!confirmedMemberIds.includes(parseInt(paidBy))) {
        return res.status(400).json({ message: "Expense payer must have confirmed RSVP status" });
      }
      
      // Filter splitWith to only include confirmed RSVP users
      const validSplitWith = splitWith.filter((userId: string) => 
        confirmedMemberIds.includes(parseInt(userId))
      );
      
      if (validSplitWith.length === 0) {
        return res.status(400).json({ message: "No confirmed members found for expense split" });
      }
      
      // Create the expense
      const expense = await storage.createExpense({
        tripId,
        title,
        amount: amount.toString(),
        currency: 'USD',
        category: category || 'food',
        description: description || null,
        paidBy: parseInt(paidBy),
        date: new Date(),
      });

      // Create expense splits for each confirmed person
      if (validSplitWith && validSplitWith.length > 0) {
        const amountPerPerson = parseFloat(amount) / validSplitWith.length;
        
        for (const userId of validSplitWith) {
          await db.insert(expenseSplits).values({
            expenseId: expense.id,
            userId: parseInt(userId),
            amount: amountPerPerson.toFixed(2),
            isPaid: false,
          });
        }
      }

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

  router.get('/trips/:id/expenses/balances', isAuthenticated, requireConfirmedRSVP, async (req: Request, res: Response) => {
    try {
      const tripId = parseInt(req.params.id);
      
      // Use the storage method that includes settlement adjustments
      const balances = await storage.calculateExpenseBalances(tripId);
      
      // Add cache control headers to prevent caching
      res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.set('Pragma', 'no-cache');
      res.set('Expires', '0');
      
      res.json(balances);
    } catch (error) {
      console.error("Error calculating balances:", error);
      res.status(500).json({ message: "Failed to calculate balances" });
    }
  });

  // Get individual expense details
  router.get('/expenses/:id', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = ensureUser(req, res);
      if (!user) return;

      const expenseId = parseInt(req.params.id);
      if (isNaN(expenseId)) {
        return res.status(400).json({ message: 'Invalid expense ID' });
      }

      const expense = await storage.getExpense(expenseId);
      if (!expense) {
        return res.status(404).json({ message: 'Expense not found' });
      }

      // Check if user is a member of the trip this expense belongs to
      const members = await storage.getTripMembers(expense.tripId);
      const isMember = members.some(member => member.userId === user.id);
      
      if (!isMember) {
        return res.status(403).json({ message: 'Not a member of this trip' });
      }

      res.json(expense);
    } catch (error) {
      console.error('Error fetching expense details:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // TODO: Mark Paid endpoint removed - was non-functional
  // router.post('/expenses/:expenseId/shares/:shareId/mark-paid', isAuthenticated, async (req: Request, res: Response) => {
  //   try {
  //     const expenseId = parseInt(req.params.expenseId);
  //     const shareId = parseInt(req.params.shareId);
  //     
  //     await storage.markExpenseSharePaid(expenseId, shareId);
  //     res.json({ success: true });
  //   } catch (error) {
  //     console.error("Error marking expense share as paid:", error);
  //     res.status(500).json({ message: "Failed to mark as paid" });
  //   }
  // });

  // Settlement API routes
  router.post('/trips/:id/settlements/initiate', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = ensureUser(req, res);
      if (!user) return;

      const tripId = parseInt(req.params.id);
      const { payeeId, amount, paymentMethod, notes } = req.body;

      if (isNaN(tripId) || !payeeId || !amount) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      // Get payee information for payment link generation
      const payee = await storage.getUser(payeeId);
      if (!payee) {
        return res.status(404).json({ message: "Payee not found" });
      }

      const trip = await storage.getTrip(tripId);
      if (!trip) {
        return res.status(404).json({ message: "Trip not found" });
      }

      // Import settlement utilities
      const { getSettlementOptions } = await import('./settlement-utils');
      const settlementOptions = getSettlementOptions(payee, parseFloat(amount), user.name, trip.name);
      
      let paymentLink = null;
      if (paymentMethod && paymentMethod !== 'cash') {
        const selectedOption = settlementOptions.find(opt => opt.method === paymentMethod);
        paymentLink = selectedOption?.paymentLink || null;
      }

      const settlement = await storage.createSettlement({
        tripId,
        payerId: user.id,
        payeeId: parseInt(payeeId),
        amount: amount.toString(),
        currency: 'USD',
        paymentMethod: paymentMethod || null,
        paymentLink,
        notes: notes || null,
      });

      res.json(settlement);
    } catch (error) {
      console.error("Error initiating settlement:", error);
      res.status(500).json({ message: "Failed to initiate settlement" });
    }
  });

  router.get('/trips/:id/settlements', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const tripId = parseInt(req.params.id);
      const settlements = await storage.getSettlementsByTrip(tripId);
      
      // Enhance with user information
      const enhancedSettlements = await Promise.all(
        settlements.map(async (settlement) => {
          const payer = await storage.getUser(settlement.payerId);
          const payee = await storage.getUser(settlement.payeeId);
          return {
            ...settlement,
            payerName: payer?.name || 'Unknown',
            payeeName: payee?.name || 'Unknown',
          };
        })
      );

      res.json(enhancedSettlements);
    } catch (error) {
      console.error("Error fetching settlements:", error);
      res.status(500).json({ message: "Failed to fetch settlements" });
    }
  });

  router.post('/settlements/:id/confirm', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = ensureUser(req, res);
      if (!user) return;

      const settlementId = parseInt(req.params.id);
      const settlement = await storage.getSettlement(settlementId);

      if (!settlement) {
        return res.status(404).json({ message: "Settlement not found" });
      }

      // Only the payee can confirm receipt of payment
      if (settlement.payeeId !== user.id) {
        return res.status(403).json({ message: "Only the payee can confirm payment" });
      }

      if (settlement.status === 'confirmed') {
        return res.status(400).json({ message: "Settlement already confirmed" });
      }

      const confirmedSettlement = await storage.confirmSettlement(settlementId, user.id);
      res.json(confirmedSettlement);
    } catch (error) {
      console.error("Error confirming settlement:", error);
      res.status(500).json({ message: "Failed to confirm settlement" });
    }
  });

  router.get('/settlements/pending', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = ensureUser(req, res);
      if (!user) return;

      const pendingSettlements = await storage.getPendingSettlementsForUser(user.id);
      
      // Enhance with additional information
      const enhancedSettlements = await Promise.all(
        pendingSettlements.map(async (settlement) => {
          const payer = await storage.getUser(settlement.payerId);
          const trip = await storage.getTrip(settlement.tripId);
          return {
            ...settlement,
            payerName: payer?.name || 'Unknown',
            tripName: trip?.name || 'Unknown Trip',
          };
        })
      );

      res.json(enhancedSettlements);
    } catch (error) {
      console.error("Error fetching pending settlements:", error);
      res.status(500).json({ message: "Failed to fetch pending settlements" });
    }
  });

  router.get('/trips/:id/settlement-options/:payeeId', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = ensureUser(req, res);
      if (!user) return;

      const tripId = parseInt(req.params.id);
      const payeeId = parseInt(req.params.payeeId);
      const { amount } = req.query;

      if (isNaN(tripId) || isNaN(payeeId)) {
        return res.status(400).json({ message: "Invalid trip ID or payee ID" });
      }

      // If amount is not provided or is invalid, try to get it from trip member data
      let paymentAmount = amount ? parseFloat(amount as string) : null;
      
      if (!paymentAmount || paymentAmount <= 0) {
        // Try to get the payment amount from the user's trip membership
        const members = await storage.getTripMembers(tripId);
        const member = members.find(m => m.userId === user.id);
        
        if (member && member.paymentAmount && parseFloat(member.paymentAmount) > 0) {
          paymentAmount = parseFloat(member.paymentAmount);
        } else {
          // Try to get from trip's down payment requirement
          const trip = await storage.getTrip(tripId);
          if (trip?.downPaymentAmount && parseFloat(trip.downPaymentAmount) > 0) {
            paymentAmount = parseFloat(trip.downPaymentAmount);
          } else {
            // Default to a minimal amount if no payment amount is found
            paymentAmount = 1.00;
          }
        }
      }

      const payee = await storage.getUser(payeeId);
      const trip = await storage.getTrip(tripId);

      if (!payee || !trip) {
        return res.status(404).json({ message: "Payee or trip not found" });
      }

      const { getSettlementOptions } = await import('./settlement-utils');
      const options = getSettlementOptions(payee, paymentAmount, user.name || user.username, trip.name);

      res.json(options);
    } catch (error) {
      console.error("Error getting settlement options:", error);
      res.status(500).json({ message: "Failed to get settlement options" });
    }
  });

  router.get('/settlements/:tripId/optimized', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = ensureUser(req, res);
      if (!user) return;

      const tripId = parseInt(req.params.tripId);
      if (isNaN(tripId)) {
        return res.status(400).json({ message: "Invalid trip ID" });
      }

      // Get current balances for the trip
      const balances = await storage.calculateExpenseBalances(tripId);
      
      if (!balances || balances.length === 0) {
        return res.json({
          transactions: [],
          stats: {
            totalTransactions: 0,
            totalAmount: 0,
            usersInvolved: 0,
            averageTransactionAmount: 0
          }
        });
      }

      // Import and run the settlement algorithm
      const { 
        calculateOptimizedSettlements, 
        validateSettlementPlan, 
        getSettlementStats 
      } = await import('./settlement-algorithm');
      
      const optimizedTransactions = calculateOptimizedSettlements(balances);
      const isValid = validateSettlementPlan(balances, optimizedTransactions);
      const stats = getSettlementStats(optimizedTransactions);

      if (!isValid) {
        console.warn(`Settlement plan validation failed for trip ${tripId}`);
      }

      res.json({
        transactions: optimizedTransactions,
        stats,
        isValid,
        originalBalances: balances
      });
    } catch (error) {
      console.error("Error calculating optimized settlements:", error);
      res.status(500).json({ message: "Failed to calculate optimized settlements" });
    }
  });

  router.get('/settlements/:tripId/user-recommendations/:userId', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = ensureUser(req, res);
      if (!user) return;

      const tripId = parseInt(req.params.tripId);
      const userId = parseInt(req.params.userId);
      
      if (isNaN(tripId) || isNaN(userId)) {
        return res.status(400).json({ message: "Invalid trip ID or user ID" });
      }

      // Only allow users to get their own recommendations unless they're trip organizer
      const trip = await storage.getTrip(tripId);
      if (!trip) {
        return res.status(404).json({ message: "Trip not found" });
      }

      if (user.id !== userId && trip.organizer !== user.id) {
        return res.status(403).json({ message: "Not authorized to view these recommendations" });
      }

      const balances = await storage.calculateExpenseBalances(tripId);
      
      if (!balances || balances.length === 0) {
        return res.json({ recommendations: [] });
      }

      const { getUserSettlementRecommendations } = await import('./settlement-algorithm');
      const recommendations = getUserSettlementRecommendations(balances, userId);

      res.json({ recommendations });
    } catch (error) {
      console.error("Error getting user settlement recommendations:", error);
      res.status(500).json({ message: "Failed to get settlement recommendations" });
    }
  });

  app.use('/api', router);
  
  return httpServer;
}

// Augment Express Request to include user and session
declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

declare module 'express-session' {
  interface SessionData {
    userId?: number;
  }
}
