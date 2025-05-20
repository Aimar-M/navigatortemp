import express, { type Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { 
  insertUserSchema, insertTripSchema, insertTripMemberSchema, 
  insertActivitySchema, insertActivityRsvpSchema, insertMessageSchema,
  insertSurveyQuestionSchema, insertSurveyResponseSchema,
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
      
      const user = await storage.getUserByUsername(username);
      if (!user || user.password !== password) {
        return res.status(401).json({ message: 'Invalid username or password' });
      }
      
      // Don't send password in the response
      const { password: _, ...userWithoutPassword } = user;
      
      // Generate token (in this simple implementation, just use the user ID)
      const token = user.id.toString();
      
      // Return user data with token
      res.json({
        ...userWithoutPassword,
        token
      });
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  router.post('/auth/logout', (req: Request, res: Response) => {
    if (req.session) {
      req.session.destroy((err) => {
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
    // Get auth token from header
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    try {
      // In this simple implementation, token is the user ID
      const userId = parseInt(token, 10);
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(401).json({ message: 'User not found' });
      }
      
      // Set user on request
      req.user = user;
      next();
    } catch (err) {
      return res.status(401).json({ message: 'Invalid authentication token' });
    }
  };
  
  // Trip Routes
  router.post('/trips', isAuthenticated, async (req: Request, res: Response) => {
    try {
      // Convert string dates to Date objects before validation
      const data = {
        ...req.body,
        startDate: req.body.startDate ? new Date(req.body.startDate) : undefined,
        endDate: req.body.endDate ? new Date(req.body.endDate) : undefined
      };
      
      const tripData = insertTripSchema.parse(data);
      
      // Ensure the authenticated user is the organizer
      if (tripData.organizer !== req.user.id) {
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
      const trips = await storage.getTripsByUser(req.user.id);
      res.json(trips);
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  router.get('/trips/:id', isAuthenticated, async (req: Request, res: Response) => {
    try {
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
      const isMember = members.some(member => member.userId === req.user.id);
      
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
      const tripId = parseInt(req.params.id);
      if (isNaN(tripId)) {
        return res.status(400).json({ message: 'Invalid trip ID' });
      }
      
      const trip = await storage.getTrip(tripId);
      if (!trip) {
        return res.status(404).json({ message: 'Trip not found' });
      }
      
      // Only organizer can update trip
      if (trip.organizer !== req.user.id) {
        return res.status(403).json({ message: 'Only the trip organizer can update trip details' });
      }
      
      const tripData = insertTripSchema.partial().parse(req.body);
      const updatedTrip = await storage.updateTrip(tripId, tripData);
      
      res.json(updatedTrip);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid trip data', errors: error.errors });
      }
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  router.delete('/trips/:id', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const tripId = parseInt(req.params.id);
      if (isNaN(tripId)) {
        return res.status(400).json({ message: 'Invalid trip ID' });
      }
      
      const trip = await storage.getTrip(tripId);
      if (!trip) {
        return res.status(404).json({ message: 'Trip not found' });
      }
      
      // Only organizer can delete trip
      if (trip.organizer !== req.user.id) {
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
      const tripId = parseInt(req.params.id);
      if (isNaN(tripId)) {
        return res.status(400).json({ message: 'Invalid trip ID' });
      }
      
      const trip = await storage.getTrip(tripId);
      if (!trip) {
        return res.status(404).json({ message: 'Trip not found' });
      }
      
      // Only organizer can add members
      if (trip.organizer !== req.user.id) {
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
      const tripId = parseInt(req.params.id);
      if (isNaN(tripId)) {
        return res.status(400).json({ message: 'Invalid trip ID' });
      }
      
      // Check if user is a member of the trip
      const members = await storage.getTripMembers(tripId);
      const isMember = members.some(member => member.userId === req.user.id);
      
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
  
  router.put('/trips/:tripId/members/:userId', isAuthenticated, async (req: Request, res: Response) => {
    try {
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
      
      const isOrganizer = trip.organizer === req.user.id;
      const isUpdatingSelf = userId === req.user.id;
      
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
      
      const updatedMember = await storage.updateTripMemberStatus(tripId, userId, status);
      if (!updatedMember) {
        return res.status(404).json({ message: 'Member not found' });
      }
      
      res.json(updatedMember);
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  router.delete('/trips/:tripId/members/:userId', isAuthenticated, async (req: Request, res: Response) => {
    try {
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
      
      const isOrganizer = trip.organizer === req.user.id;
      const isRemovingSelf = userId === req.user.id;
      
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
      const tripId = parseInt(req.params.id);
      if (isNaN(tripId)) {
        return res.status(400).json({ message: 'Invalid trip ID' });
      }
      
      const trip = await storage.getTrip(tripId);
      if (!trip) {
        return res.status(404).json({ message: 'Trip not found' });
      }
      
      // Check if user is a confirmed member of the trip
      const members = await storage.getTripMembers(tripId);
      const isMember = members.some(member => 
        member.userId === req.user.id && member.status === 'confirmed'
      );
      
      if (!isMember) {
        return res.status(403).json({ message: 'Not a confirmed member of this trip' });
      }
      
      const activityData = insertActivitySchema.parse({
        ...req.body,
        tripId
      });
      
      const activity = await storage.createActivity(activityData);
      
      // Auto-RSVP the creator as "going"
      await storage.createActivityRSVP({
        activityId: activity.id,
        userId: req.user.id,
        status: 'going'
      });
      
      res.status(201).json(activity);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid activity data', errors: error.errors });
      }
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  router.get('/trips/:id/activities', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const tripId = parseInt(req.params.id);
      if (isNaN(tripId)) {
        return res.status(400).json({ message: 'Invalid trip ID' });
      }
      
      // Check if user is a member of the trip
      const members = await storage.getTripMembers(tripId);
      const isMember = members.some(member => member.userId === req.user.id);
      
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
      
      if (trip.organizer !== req.user.id) {
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
      
      if (trip.organizer !== req.user.id) {
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
      const activityId = parseInt(req.params.id);
      if (isNaN(activityId)) {
        return res.status(400).json({ message: 'Invalid activity ID' });
      }
      
      const activity = await storage.getActivity(activityId);
      if (!activity) {
        return res.status(404).json({ message: 'Activity not found' });
      }
      
      // Check if user is a confirmed member of the trip
      const members = await storage.getTripMembers(activity.tripId);
      const isMember = members.some(member => 
        member.userId === req.user.id && member.status === 'confirmed'
      );
      
      if (!isMember) {
        return res.status(403).json({ message: 'Not a confirmed member of this trip' });
      }
      
      const { status } = req.body;
      if (!status || !['going', 'not going'].includes(status)) {
        return res.status(400).json({ message: 'Invalid status' });
      }
      
      // Check if RSVP already exists
      const rsvps = await storage.getActivityRSVPs(activityId);
      const existingRsvp = rsvps.find(rsvp => rsvp.userId === req.user.id);
      
      let rsvp;
      if (existingRsvp) {
        // Update existing RSVP
        rsvp = await storage.updateActivityRSVP(activityId, req.user.id, status);
      } else {
        // Create new RSVP
        rsvp = await storage.createActivityRSVP({
          activityId,
          userId: req.user.id,
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
      const tripId = parseInt(req.params.id);
      if (isNaN(tripId)) {
        return res.status(400).json({ message: 'Invalid trip ID' });
      }
      
      // Check if user is a member of the trip
      const members = await storage.getTripMembers(tripId);
      const isMember = members.some(member => member.userId === req.user.id);
      
      if (!isMember) {
        return res.status(403).json({ message: 'Not a member of this trip' });
      }
      
      const messages = await storage.getMessagesByTrip(tripId);
      
      // Get user details for each message
      const messagesWithUser = await Promise.all(
        messages.map(async (message) => {
          const user = await storage.getUser(message.userId);
          if (!user) return message;
          
          const { password, ...userWithoutPassword } = user;
          return {
            ...message,
            user: userWithoutPassword
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
      const tripId = parseInt(req.params.id);
      if (isNaN(tripId)) {
        return res.status(400).json({ message: 'Invalid trip ID' });
      }
      
      // Check if user is a confirmed member of the trip
      const members = await storage.getTripMembers(tripId);
      const isMember = members.some(member => 
        member.userId === req.user.id && member.status === 'confirmed'
      );
      
      if (!isMember) {
        return res.status(403).json({ message: 'Not a confirmed member of this trip' });
      }
      
      const { content } = req.body;
      if (!content) {
        return res.status(400).json({ message: 'Message content is required' });
      }
      
      const message = await storage.createMessage({
        tripId,
        userId: req.user.id,
        content
      });
      
      // Get user details for the response
      const user = await storage.getUser(message.userId);
      const { password, ...userWithoutPassword } = user!;
      
      const messageWithUser = {
        ...message,
        user: userWithoutPassword
      };
      
      // Broadcast via WebSocket
      wss.clients.forEach((client: WebSocketClient) => {
        if (client.readyState === WebSocket.OPEN && client.tripIds?.includes(tripId)) {
          client.send(JSON.stringify({
            type: 'new_message',
            data: messageWithUser
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
      const tripId = parseInt(req.params.id);
      if (isNaN(tripId)) {
        return res.status(400).json({ message: 'Invalid trip ID' });
      }
      
      const trip = await storage.getTrip(tripId);
      if (!trip) {
        return res.status(404).json({ message: 'Trip not found' });
      }
      
      // Only organizer can create survey questions
      if (trip.organizer !== req.user.id) {
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
      const tripId = parseInt(req.params.id);
      if (isNaN(tripId)) {
        return res.status(400).json({ message: 'Invalid trip ID' });
      }
      
      // Check if user is a member of the trip
      const members = await storage.getTripMembers(tripId);
      const isMember = members.some(member => member.userId === req.user.id);
      
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
        userId: req.user.id,
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
  
  // Get all messages for the current user across all trips
  router.get('/messages', isAuthenticated, async (req: Request, res: Response) => {
    try {
      // Get all trips the user is a member of
      const memberships = await storage.getTripMembershipsByUser(req.user.id);
      const tripIds = memberships.map(membership => membership.tripId);
      
      // Get messages from all these trips
      const allMessagesWithDetails = [];
      
      for (const tripId of tripIds) {
        const tripMessages = await storage.getMessagesByTrip(tripId);
        
        // Get trip details
        const trip = await storage.getTrip(tripId);
        
        // Get user details for each message
        const messagesWithDetails = await Promise.all(tripMessages.map(async (message) => {
          const user = await storage.getUser(message.userId);
          return {
            ...message,
            tripId,
            tripName: trip?.name || 'Unknown Trip',
            user: user ? {
              id: user.id,
              name: user.name,
              avatar: user.avatar
            } : null
          };
        }));
        
        allMessagesWithDetails.push(...messagesWithDetails);
      }
      
      // Sort by timestamp (newest first)
      allMessagesWithDetails.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      
      res.json(allMessagesWithDetails);
    } catch (error) {
      console.error('Error getting all messages:', error);
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
