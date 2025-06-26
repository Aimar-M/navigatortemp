# Navigator - Group Travel Financial Management Platform

## Overview

Navigator is a comprehensive group travel financial management platform that combines collaborative trip planning, intelligent expense tracking, and seamless communication tools. Built with TypeScript, React, and PostgreSQL, the application empowers users to plan trips together while managing shared expenses and settlements through an intuitive, real-time interface.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build System**: Vite for fast development and optimized production builds
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack Query (React Query v5) for server state management
- **UI Framework**: Radix UI components with Tailwind CSS for styling
- **Component Library**: Shadcn/ui design system with customizable components

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript for type safety across the entire stack
- **Real-time Communication**: WebSocket connections for live chat and updates
- **Session Management**: Express-session with PostgreSQL store for authentication
- **API Design**: RESTful endpoints with consistent error handling

### Database Architecture
- **Primary Database**: PostgreSQL with Neon serverless hosting
- **ORM**: Drizzle ORM for type-safe database operations
- **Migration System**: Drizzle-kit for schema migrations and versioning
- **Connection**: Connection pooling with SSL support for production

## Key Components

### Authentication System
- Session-based authentication using express-session
- PostgreSQL session store for scalability
- Token-based API authentication for mobile compatibility
- Invitation link system for trip member onboarding

### Trip Management
- **Trip Creation**: Wizard-guided setup with destination, dates, and member management
- **Member Management**: Role-based permissions (organizer, admin, member)
- **RSVP Workflow**: Confirmation system with optional down payment requirements
- **Settings**: Configurable trip options (admin-only itinerary, payment requirements)

### Financial Engine
- **Expense Tracking**: Detailed expense recording with category classification
- **Smart Splitting**: Automatic cost allocation across participants
- **Settlement Algorithm**: Optimized debt settlement to minimize transaction count
- **Payment Integration**: PayPal and Venmo integration for seamless payments
- **Financial Integrity**: Data consistency protection through deletion restrictions

### Communication Platform
- **Real-time Chat**: WebSocket-powered group messaging
- **Polling System**: Democratic decision-making with integrated voting
- **Activity Notifications**: Real-time updates for trip changes and payments
- **Unread Message Tracking**: Visual indicators for new messages

### Itinerary System
- **Activity Management**: Collaborative activity planning with RSVP tracking
- **Calendar Views**: Day-based and chronological activity organization
- **Accommodation Tracking**: Custom-named accommodation links and booking management
- **Flight Information**: Flight tracking with airline integration lookup

## Data Flow

### User Journey
1. **Registration/Login**: User creates account or logs in with existing credentials
2. **Trip Creation**: Organizer creates trip with basic details and settings
3. **Member Invitation**: Share invitation links for seamless member onboarding
4. **RSVP Process**: Members confirm participation with optional payment
5. **Collaborative Planning**: Members add activities, expenses, and participate in discussions
6. **Real-time Updates**: Live synchronization of all trip changes across devices
7. **Settlement**: Automated debt calculation and payment facilitation

### Data Synchronization
- Real-time WebSocket updates for chat messages and activity changes
- Optimistic updates with React Query for responsive user experience
- Background synchronization for expense calculations and member status
- Conflict resolution for concurrent edits

## External Dependencies

### Third-party Services
- **Neon Database**: Serverless PostgreSQL hosting with automatic scaling
- **PayPal SDK**: Payment processing for expense settlements
- **Venmo Integration**: Alternative payment method for user convenience

### Development Tools
- **Replit**: Primary development and deployment platform
- **Vite**: Fast development server with hot module replacement
- **TypeScript**: Compile-time type checking and IntelliSense
- **ESBuild**: Fast bundling for production builds

### UI Libraries
- **Radix UI**: Unstyled, accessible component primitives
- **Tailwind CSS**: Utility-first CSS framework for styling
- **Lucide Icons**: Consistent icon library for UI elements
- **Recharts**: Data visualization for expense charts and analytics

## Deployment Strategy

### Production Environment
- **Backend Platform**: Railway with Node.js hosting
- **Frontend Platform**: Vercel with static site deployment
- **Build Process**: Separate builds for frontend (Vite) and backend (ESBuild)
- **SSL**: Automatic HTTPS on both Railway and Vercel
- **Architecture**: Decoupled frontend and backend services

### Deployment Configuration
- **Railway Backend**: 
  - Express.js server with PostgreSQL
  - WebSocket support for real-time features
  - Health check endpoint at `/api/health`
  - CORS configuration for Vercel frontend
- **Vercel Frontend**:
  - Static React SPA deployment
  - Environment variables for API URL configuration
  - Proxy configuration for API and WebSocket connections

### Development Workflow
- **Hot Reload**: Vite development server with instant updates
- **Database**: Direct connection to Neon PostgreSQL for development
- **Environment**: Node.js 20 with PostgreSQL 16 modules
- **Process Management**: Separate npm scripts for frontend and backend

### Scaling Considerations
- **Database**: Neon serverless automatically scales with demand
- **Backend**: Railway autoscaling based on resource usage
- **Frontend**: Vercel edge network with global CDN
- **Session Storage**: PostgreSQL session store supports horizontal scaling
- **WebSocket**: Direct connections from Vercel to Railway backend

## Changelog

Changelog:
- June 26, 2025. Initial setup
- June 26, 2025. Prepared app for Railway (backend) + Vercel (frontend) deployment:
  - Created separate package.json files for client and server
  - Added CORS configuration for cross-origin requests
  - Created deployment configuration files (railway.json, vercel.json)
  - Updated API client to work with external backend URL
  - Added health check endpoint for Railway monitoring
  - Created comprehensive deployment documentation

## User Preferences

Preferred communication style: Simple, everyday language.