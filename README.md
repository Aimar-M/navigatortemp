# Navigator 🧭

A comprehensive group travel financial management platform that empowers collaborative expense tracking and intelligent settlement through cutting-edge technology and user-centered design.

![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)
![Express.js](https://img.shields.io/badge/Express.js-404D59?style=for-the-badge)

## ✨ Features

### 🎯 Trip Management
- **Smart Trip Planning**: Create detailed trips with destinations, dates, and custom settings
- **Invitation System**: Share trip links for seamless member onboarding
- **Admin Controls**: Granular permission system for trip organizers and admins
- **Payment Workflows**: Optional down payment requirements with RSVP integration

### 💰 Financial Management
- **Intelligent Expense Tracking**: Automatic cost splitting across participants
- **Smart Settlement Engine**: Debt optimization algorithms minimize transaction complexity
- **PayPal Integration**: Seamless payment processing for settlements
- **Financial Integrity Protection**: Prevents data corruption through expense deletion restrictions

### 📅 Itinerary Planning
- **Collaborative Activities**: Group activity planning with RSVP management
- **Flexible Payment Types**: Support for free, prepaid, advance payment, and on-site payment models
- **Calendar Views**: Day-based and list-based activity organization
- **Accommodation Management**: Custom-named accommodation links and booking tracking

### 💬 Real-time Communication
- **Live Group Chat**: WebSocket-powered messaging for instant communication
- **Democratic Polling**: Group decision-making with integrated voting system
- **Activity Notifications**: Real-time updates for trip changes and payments

### 👥 Advanced Member Management
- **Enhanced Removal System**: Safe member removal while preserving financial integrity
- **Role-based Permissions**: Organizer, admin, and member access levels
- **RSVP Workflows**: Confirmation processes with payment validation

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- PostgreSQL database
- npm or yarn package manager

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/your-username/navigator.git
cd navigator
```

2. **Install dependencies**
```bash
npm install
```

3. **Environment setup**
```bash
# Create .env file
cp .env.example .env

# Add your configuration
DATABASE_URL=postgresql://username:password@localhost:5432/navigator
SESSION_SECRET=your-secure-session-secret
PAYPAL_CLIENT_ID=your-paypal-client-id
PAYPAL_CLIENT_SECRET=your-paypal-secret
```

4. **Database setup**
```bash
npm run db:push
```

5. **Start development server**
```bash
npm run dev
```

Visit `http://localhost:5000` to access the application.

## 🏗️ Architecture

### Technology Stack

**Frontend**
- React 18 with TypeScript
- Vite for build tooling
- Tailwind CSS + Radix UI components
- TanStack Query for state management
- Wouter for routing

**Backend**
- Express.js with TypeScript
- WebSocket for real-time features
- Session-based authentication
- Drizzle ORM for database operations

**Database**
- PostgreSQL with Neon serverless
- Comprehensive relational schema
- Database-backed session storage

### Project Structure

```
navigator/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/         # Route components
│   │   ├── hooks/         # Custom React hooks
│   │   └── lib/           # Utilities and configurations
├── server/                # Express backend
│   ├── routes.ts          # API endpoints
│   ├── db-storage.ts      # Database operations
│   └── index.ts           # Server entry point
├── shared/                # Shared types and schemas
│   └── schema.ts          # Drizzle database schema
└── scripts/               # Database and utility scripts
```

## 📊 Key Features Deep Dive

### Financial Intelligence

Navigator's financial system prevents common group expense pitfalls:

- **Smart Splitting**: Automatic expense allocation with customizable participation
- **Debt Optimization**: Minimizes number of transactions needed for settlement
- **Integrity Protection**: Timestamp-based restrictions prevent data corruption
- **Real-time Balances**: Live updates of who owes what to whom

### Permission System

Sophisticated role-based access control:

```typescript
// Trip Organizer: Ultimate authority
- Delete trip, transfer ownership, cannot be removed

// Trip Admin: Management capabilities  
- Add/remove members, modify settings, delete content

// Confirmed Member: Full participation
- Create expenses, add activities, chat and vote

// Pending Member: Limited access
- View trip details, complete RSVP workflow
```

### Real-time Collaboration

WebSocket-powered features for seamless group coordination:

- **Live Chat**: Instant messaging with message history
- **Activity Updates**: Real-time RSVP changes and notifications  
- **Financial Updates**: Live expense tracking and settlement notifications
- **Polling System**: Democratic decision-making with live vote counts

## 🔧 API Reference

### Core Endpoints

#### Authentication
```http
GET    /api/auth/me              # Get current user
POST   /api/auth/login           # User login
POST   /api/auth/logout          # User logout
```

#### Trip Management
```http
GET    /api/trips                # List user trips
POST   /api/trips                # Create trip
GET    /api/trips/:id             # Get trip details
PUT    /api/trips/:id             # Update trip
DELETE /api/trips/:id             # Delete trip
```

#### Financial Operations
```http
GET    /api/trips/:id/expenses           # Get expenses
POST   /api/trips/:id/expenses           # Create expense
GET    /api/trips/:id/expenses/balances  # Get balances
POST   /api/trips/:id/settlements        # Create settlement
```

#### Real-time Features
```http
GET    /api/trips/:id/messages    # Get chat messages
POST   /api/trips/:id/messages    # Send message
GET    /api/trips/:id/polls       # Get polls
POST   /api/polls/:id/vote        # Vote on poll
```

See [DEVELOPER_DOCUMENTATION.md](./DEVELOPER_DOCUMENTATION.md) for complete API reference.

## 🗄️ Database Schema

### Core Tables

- **users**: User accounts and payment preferences
- **trips**: Trip information and settings
- **trip_members**: Member relationships and permissions
- **activities**: Itinerary items with RSVP tracking
- **expenses**: Financial transactions and splits
- **settlements**: Payment confirmations and debt resolution

### Key Relationships

```mermaid
erDiagram
    users ||--o{ trips : organizes
    users ||--o{ trip_members : participates
    trips ||--o{ activities : contains
    trips ||--o{ expenses : tracks
    activities ||--o{ expenses : generates
    expenses ||--o{ expense_splits : divides
```

## 🚢 Deployment

### Production Deployment

1. **Build the application**
```bash
npm run build
```

2. **Set production environment variables**
```bash
export NODE_ENV=production
export DATABASE_URL=your-production-db-url
export SESSION_SECRET=your-production-secret
```

3. **Start the server**
```bash
npm start
```

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `SESSION_SECRET` | ✅ | Session encryption key |
| `PAYPAL_CLIENT_ID` | ❌ | PayPal integration |
| `PAYPAL_CLIENT_SECRET` | ❌ | PayPal integration |
| `NODE_ENV` | ❌ | Environment mode |

## 🤝 Contributing

We welcome contributions! Please see our [contribution guidelines](./DEVELOPER_DOCUMENTATION.md#contribution-guidelines) for details.

### Development Workflow

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Add tests for new functionality
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

### Code Style

- TypeScript with strict type checking
- React functional components with hooks
- Tailwind CSS for styling
- Comprehensive error handling
- Database transactions for complex operations

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with [React](https://reactjs.org/) and [TypeScript](https://www.typescriptlang.org/)
- UI components from [Radix UI](https://www.radix-ui.com/)
- Database management with [Drizzle ORM](https://orm.drizzle.team/)
- Hosted on [Replit](https://replit.com/) with [Neon](https://neon.tech/) PostgreSQL

## 📞 Support

- 📖 [Documentation](./DEVELOPER_DOCUMENTATION.md)
- 🐛 [Issue Tracker](https://github.com/your-username/navigator/issues)
- 💬 [Discussions](https://github.com/your-username/navigator/discussions)

---

**Navigator** - Empowering collaborative travel through intelligent financial management.