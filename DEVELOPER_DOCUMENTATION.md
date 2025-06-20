# Navigator - Developer Documentation

## Overview

Navigator is a comprehensive group travel financial management platform built with TypeScript, React, and PostgreSQL. The application enables collaborative trip planning with sophisticated expense tracking, real-time communication, and intelligent settlement systems.

### Architecture

- **Frontend**: React 18 with TypeScript, Vite build system
- **Backend**: Express.js with TypeScript
- **Database**: PostgreSQL with Neon serverless
- **ORM**: Drizzle ORM with migrations
- **Authentication**: Session-based with express-session
- **Real-time**: WebSocket connections for live updates
- **UI**: Radix UI components with Tailwind CSS
- **State Management**: TanStack Query (React Query v5)
- **Routing**: Wouter for client-side routing

### Key Technologies

```json
{
  "runtime": "Node.js",
  "frontend": ["React 18", "TypeScript", "Vite", "Tailwind CSS"],
  "backend": ["Express.js", "TypeScript", "WebSocket"],
  "database": ["PostgreSQL", "Drizzle ORM", "Neon Serverless"],
  "auth": ["express-session", "connect-pg-simple"],
  "ui": ["Radix UI", "Shadcn/ui", "Lucide Icons"],
  "deployment": "Replit with automatic scaling"
}
```

## Features & User Flows

### Core Features

#### 1. Trip Management
- **Trip Creation**: Organizers create trips with destinations, dates, and settings
- **Member Invitation**: Link-based invitations with RSVP workflow
- **Admin Controls**: Permission-based access to trip modifications
- **Trip Settings**: Down payment requirements, admin-only itinerary controls

#### 2. Financial Management
- **Expense Tracking**: Individual and group expense management
- **Smart Splitting**: Automatic cost allocation across participants
- **Settlement System**: Intelligent debt optimization algorithms
- **Payment Integration**: PayPal integration for seamless transactions
- **Financial Integrity**: Expense deletion restrictions to maintain data consistency

#### 3. Itinerary Planning
- **Activity Management**: Comprehensive activity creation and RSVP system
- **Payment Types**: Multiple payment models (free, prepaid, pay-in-advance, etc.)
- **Calendar Integration**: Day-based and list-based activity views
- **Accommodation Tracking**: Custom-named accommodation links

#### 4. Communication
- **Real-time Chat**: WebSocket-powered group messaging
- **Polling System**: Group decision-making with voting mechanisms
- **Notifications**: Activity updates and payment reminders

#### 5. Member Management
- **Enhanced Removal System**: Financial integrity preservation during member removal
- **Admin Permissions**: Granular control over trip access and modifications
- **RSVP Management**: Confirmation workflows with payment requirements

### User Flows

#### Trip Creation Flow
1. User creates account or logs in
2. Creates new trip with basic information
3. Configures trip settings (payment requirements, admin controls)
4. Invites members via shareable links
5. Members RSVP and complete payment requirements

#### Expense Management Flow
1. User adds expense with participant selection
2. System calculates automatic splits
3. Participants receive notifications
4. Settlement suggestions generated
5. Payments processed and confirmed

#### Activity Planning Flow
1. Confirmed members add activities to itinerary
2. Payment type and cost specified
3. Other members RSVP for activities
4. Automatic expense creation for prepaid activities
5. Real-time updates to all participants

## API Endpoints

### Authentication
- `GET /api/auth/me` - Get current user
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout

### Trip Management
- `GET /api/trips` - List user's trips
- `POST /api/trips` - Create new trip
- `GET /api/trips/:id` - Get trip details
- `PUT /api/trips/:id` - Update trip
- `DELETE /api/trips/:id` - Delete trip

### Member Management
- `GET /api/trips/:id/members` - Get trip members
- `POST /api/trips/:id/members` - Add member to trip
- `PUT /api/trips/:id/members/:userId` - Update member status
- `DELETE /api/trips/:id/members/:userId` - Remove member

### Activity Management
- `GET /api/trips/:id/activities` - Get trip activities
- `POST /api/trips/:id/activities` - Create activity
- `PUT /api/activities/:id` - Update activity
- `DELETE /api/activities/:id` - Delete activity
- `POST /api/activities/:id/rsvp` - RSVP to activity

### Expense Management
- `GET /api/trips/:id/expenses` - Get trip expenses
- `POST /api/trips/:id/expenses` - Create expense
- `PUT /api/expenses/:id` - Update expense
- `DELETE /api/expenses/:id` - Delete expense
- `GET /api/trips/:id/expenses/balances` - Get expense balances

### Communication
- `GET /api/trips/:id/messages` - Get chat messages
- `POST /api/trips/:id/messages` - Send message
- `GET /api/trips/:id/polls` - Get polls
- `POST /api/trips/:id/polls` - Create poll
- `POST /api/polls/:id/vote` - Vote on poll

### Settlement System
- `GET /api/trips/:id/settlements` - Get settlements
- `POST /api/trips/:id/settlements` - Create settlement
- `PUT /api/settlements/:id/confirm` - Confirm settlement

## Database Schema

### Core Tables

#### Users
```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  avatar TEXT,
  venmo_username TEXT,
  paypal_email TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### Trips
```sql
CREATE TABLE trips (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  destination TEXT NOT NULL,
  start_date TIMESTAMP NOT NULL,
  end_date TIMESTAMP NOT NULL,
  status TEXT DEFAULT 'planning',
  organizer INTEGER REFERENCES users(id),
  accommodation_links TEXT[],
  airport_gateway TEXT,
  requires_down_payment BOOLEAN DEFAULT FALSE,
  down_payment_amount DECIMAL(10,2),
  admin_only_itinerary BOOLEAN DEFAULT FALSE,
  removal_logic_version INTEGER DEFAULT 0
);
```

#### Trip Members
```sql
CREATE TABLE trip_members (
  trip_id INTEGER REFERENCES trips(id),
  user_id INTEGER REFERENCES users(id),
  status TEXT DEFAULT 'pending',
  rsvp_status TEXT DEFAULT 'pending',
  is_admin BOOLEAN DEFAULT FALSE,
  payment_submitted_at TIMESTAMP,
  payment_confirmed_at TIMESTAMP,
  PRIMARY KEY (trip_id, user_id)
);
```

#### Activities
```sql
CREATE TABLE activities (
  id SERIAL PRIMARY KEY,
  trip_id INTEGER REFERENCES trips(id),
  name TEXT NOT NULL,
  description TEXT,
  date TIMESTAMP NOT NULL,
  start_time TEXT,
  location TEXT,
  cost DECIMAL(10,2),
  payment_type TEXT,
  created_by INTEGER REFERENCES users(id),
  max_participants INTEGER
);
```

#### Expenses
```sql
CREATE TABLE expenses (
  id SERIAL PRIMARY KEY,
  trip_id INTEGER REFERENCES trips(id),
  title TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  paid_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  activity_id INTEGER REFERENCES activities(id)
);
```

#### Expense Splits
```sql
CREATE TABLE expense_splits (
  id SERIAL PRIMARY KEY,
  expense_id INTEGER REFERENCES expenses(id),
  user_id INTEGER REFERENCES users(id),
  amount DECIMAL(10,2) NOT NULL,
  is_paid BOOLEAN DEFAULT FALSE
);
```

### Relationship Patterns

- **One-to-Many**: User → Trips (organizer), Trip → Activities, Trip → Expenses
- **Many-to-Many**: Users ↔ Trips (via trip_members), Users ↔ Activities (via activity_rsvp)
- **Hierarchical**: Trips → Activities → Expenses (for prepaid activities)

## Permissions & Roles

### User Roles

#### Trip Organizer
- **Inherits**: All admin permissions
- **Exclusive Rights**:
  - Delete entire trip
  - Transfer organizer role
  - Cannot be removed from trip
  - Ultimate authority on all trip decisions

#### Trip Admin
- **Permissions**:
  - Add/remove members (except organizer)
  - Modify trip settings
  - Delete any expense or activity
  - Grant/revoke admin access to other members
  - Access enhanced removal workflows

#### Confirmed Member
- **Permissions**:
  - View all trip content
  - Add activities (if admin-only setting disabled)
  - Create expenses
  - Participate in polls and chat
  - RSVP to activities

#### Pending Member
- **Permissions**:
  - View basic trip information
  - Complete RSVP and payment workflow
  - Limited access until confirmation

### Permission Logic

#### Financial Permissions
```typescript
// Expense deletion permissions
const canDeleteExpense = (user, expense, trip) => {
  const isOrganizer = trip.organizer === user.id;
  const isAdmin = user.isAdmin;
  const isCreator = expense.paidBy === user.id;
  const isManualExpense = !expense.activityId;
  
  if (isOrganizer || isAdmin) return true;
  if (isManualExpense && isCreator) return true;
  
  return false;
};
```

#### Activity Management
```typescript
const canModifyActivity = (user, activity, trip) => {
  const isOrganizer = trip.organizer === user.id;
  const isAdmin = user.isAdmin;
  const isCreator = activity.createdBy === user.id;
  
  return isOrganizer || isAdmin || isCreator;
};
```

#### Member Removal
```typescript
const canRemoveMember = (user, targetUser, trip) => {
  const isOrganizer = trip.organizer === user.id;
  const isAdmin = user.isAdmin;
  const isTargetOrganizer = trip.organizer === targetUser.id;
  const isSelf = user.id === targetUser.id;
  
  if (isTargetOrganizer) return false; // Cannot remove organizer
  if (isSelf) return false; // Cannot remove self
  
  return isOrganizer || isAdmin;
};
```

## Setup & Deployment

### Development Setup

1. **Clone Repository**
```bash
git clone <repository-url>
cd navigator
```

2. **Install Dependencies**
```bash
npm install
```

3. **Environment Configuration**
```bash
# Create .env file
DATABASE_URL=postgresql://...
SESSION_SECRET=your-secret-key
PAYPAL_CLIENT_ID=your-paypal-client-id
PAYPAL_CLIENT_SECRET=your-paypal-secret
```

4. **Database Setup**
```bash
npm run db:push
```

5. **Start Development Server**
```bash
npm run dev
```

### Production Deployment

#### Replit Deployment
1. Connect repository to Replit
2. Configure environment variables
3. Deploy using Replit's built-in deployment system

#### Manual Deployment
1. **Build Application**
```bash
npm run build
```

2. **Start Production Server**
```bash
npm start
```

### Environment Variables

#### Required
- `DATABASE_URL`: PostgreSQL connection string
- `SESSION_SECRET`: Session encryption key

#### Optional
- `PAYPAL_CLIENT_ID`: PayPal integration
- `PAYPAL_CLIENT_SECRET`: PayPal integration
- `NODE_ENV`: Environment mode (development/production)

## Contribution Guidelines

### Code Style

#### TypeScript Standards
- Strict type checking enabled
- Use proper type definitions for all APIs
- Avoid `any` types except for legacy code

#### React Patterns
```typescript
// Preferred component structure
interface ComponentProps {
  id: number;
  title: string;
  onUpdate: (data: UpdateData) => void;
}

export function Component({ id, title, onUpdate }: ComponentProps) {
  const { data, isLoading } = useQuery({
    queryKey: [`/api/items/${id}`],
  });
  
  if (isLoading) return <Skeleton />;
  
  return (
    <div>
      {/* Component JSX */}
    </div>
  );
}
```

#### Database Operations
```typescript
// Use storage interface methods
const trip = await storage.getTrip(tripId);
const members = await storage.getTripMembers(tripId);

// Prefer transactions for complex operations
await db.transaction(async (tx) => {
  await tx.update(expenses).set(updateData);
  await tx.insert(expenseSplits).values(splitData);
});
```

### API Development

#### Route Structure
```typescript
app.get('/api/trips/:id', isAuthenticated, async (req, res) => {
  try {
    const tripId = parseInt(req.params.id);
    const trip = await storage.getTrip(tripId);
    
    if (!trip) {
      return res.status(404).json({ message: 'Trip not found' });
    }
    
    res.json(trip);
  } catch (error) {
    console.error('Error fetching trip:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});
```

#### Error Handling
- Always use try-catch blocks
- Return appropriate HTTP status codes
- Log errors for debugging
- Provide meaningful error messages

### Database Migrations

#### Schema Changes
```bash
# After modifying shared/schema.ts
npm run db:push
```

#### Data Migrations
```typescript
// Create script in scripts/ directory
import { db } from "../server/db";
import { trips } from "../shared/schema";

async function migrateData() {
  // Migration logic here
  console.log("Migration completed");
}

migrateData().then(() => process.exit(0));
```

### Testing Strategy

#### Component Testing
- Test user interactions
- Verify API integrations
- Mock external dependencies

#### API Testing
- Test authentication flows
- Verify permission logic
- Test error scenarios

#### Integration Testing
- Test complete user workflows
- Verify database consistency
- Test real-time features

## Edge Cases & Known Issues

### Financial Integrity

#### Issue: Expense Deletion Restrictions
**Problem**: Deleting expenses after settlements can corrupt financial records.

**Solution**: Implemented timestamp-based deletion restrictions.
```typescript
const hasSettlementsAfterExpense = settlements.some(
  s => new Date(s.createdAt) > new Date(expense.createdAt)
);
if (hasSettlementsAfterExpense) {
  throw new Error("Cannot delete expense - settlements exist after this expense");
}
```

#### Issue: Member Removal Financial Impact
**Problem**: Removing members can leave orphaned expenses and corrupt balances.

**Solution**: Enhanced removal system with content handling options.
- Transfer expense ownership
- Remove user from expense splits
- Preserve financial integrity

### Real-time Communication

#### Issue: WebSocket Connection Management
**Problem**: Connections can drop during network issues.

**Solution**: Automatic reconnection logic and connection state management.

#### Issue: Message Ordering
**Problem**: Messages can arrive out of order due to network latency.

**Solution**: Server-side timestamp ordering and client-side message queuing.

### Authentication & Sessions

#### Issue: Session Persistence
**Problem**: Sessions lost on server restart in development.

**Solution**: Database-backed session storage using connect-pg-simple.

#### Issue: Concurrent Login Sessions
**Problem**: Multiple device logins can cause session conflicts.

**Solution**: Session-based authentication allows multiple concurrent sessions.

### Data Consistency

#### Issue: RSVP Status Conflicts
**Problem**: Users can have conflicting trip membership and RSVP statuses.

**Solution**: Separate status tracking with validation logic.
```typescript
const isValidRSVP = (memberStatus, rsvpStatus) => {
  if (memberStatus === 'confirmed' && rsvpStatus === 'pending') return false;
  return true;
};
```

#### Issue: Activity-Expense Relationship
**Problem**: Deleting activities can orphan related expenses.

**Solution**: Cascading deletion with proper cleanup.
```typescript
// When deleting activity, handle related expenses
await storage.removeExpenseSplits(expenseId);
await storage.deleteExpense(expenseId);
```

### UI/UX Considerations

#### Issue: Mobile Responsiveness
**Problem**: Complex forms difficult to use on mobile devices.

**Solution**: Progressive disclosure with "More Details" toggles.

#### Issue: Real-time Update Conflicts
**Problem**: Multiple users editing simultaneously can cause conflicts.

**Solution**: Optimistic updates with conflict resolution.

### Performance Optimization

#### Issue: Large Trip Data Loading
**Problem**: Trips with many activities/expenses load slowly.

**Solution**: Pagination and lazy loading for large datasets.

#### Issue: WebSocket Message Volume
**Problem**: High-activity trips generate excessive WebSocket traffic.

**Solution**: Message throttling and batching for non-critical updates.

### Known Limitations

1. **File Upload**: Currently no support for file attachments
2. **Offline Support**: No offline functionality for mobile users
3. **Internationalization**: UI only supports English
4. **Time Zones**: Basic timestamp handling without timezone awareness
5. **Export Features**: No data export capabilities for trip summaries

### Browser Compatibility

#### Supported Browsers
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

#### Known Issues
- Safari WebSocket connection drops on iOS sleep mode
- Firefox may show timezone inconsistencies
- IE not supported (ES6+ features required)