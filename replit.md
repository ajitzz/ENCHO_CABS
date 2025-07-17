# Fleet Management Web Application

## Overview

This is a full-stack fleet management web application designed to help manage vehicle rental operations. The system handles vehicle leasing from providers (PMV and Letzryd), driver assignments, trip tracking, and complex rental calculations based on performance slabs.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite for development and production builds
- **UI Framework**: shadcn/ui components built on Radix UI primitives
- **Styling**: Tailwind CSS with custom theme configuration
- **State Management**: TanStack Query (React Query) for server state
- **Routing**: Wouter for lightweight client-side routing
- **Form Handling**: React Hook Form with Zod validation

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ES modules
- **Database ORM**: Drizzle ORM for type-safe database operations
- **Database**: PostgreSQL (Neon serverless)
- **Validation**: Zod schemas for runtime type checking
- **Build System**: esbuild for production bundling

### Data Storage Solutions
- **Primary Database**: PostgreSQL via Neon serverless
- **Schema Management**: Drizzle Kit for migrations
- **Connection Pooling**: Neon serverless pool with WebSocket support

## Key Components

### Database Schema
The application uses the following core entities:
- **Vehicles**: Store vehicle information with company association
- **Drivers**: Manage driver details including accommodation status
- **Vehicle Driver Assignments**: Link drivers to vehicles (morning/evening shifts)
- **Trips**: Track daily trip counts per driver/vehicle/shift
- **Driver Rent Logs**: Record daily rent payments from drivers
- **Weekly Settlements**: Calculate and store weekly rental costs
- **Substitute Drivers**: Handle temporary driver replacements

### Business Logic Components
- **Rental Calculator**: Implements complex slab-based pricing for PMV and Letzryd
- **Settlement Processor**: Calculates weekly settlements based on trip performance
- **Storage Layer**: Abstracts database operations with type-safe interfaces

### Frontend Components
- **Dashboard**: Main interface showing vehicle performance and quick actions
- **Vehicle Selector**: Dropdown for selecting vehicles with performance summary
- **Trip Logging**: Modal form for recording daily trips
- **Profit Charts**: Recharts-based visualization of vehicle profitability
- **Rental Slab Cards**: Display current pricing tier and next tier requirements
- **Payment Tracking**: Monitor unpaid rents and payment status

## Data Flow

1. **Trip Logging**: Drivers log daily trips through the web interface
2. **Real-time Updates**: TanStack Query automatically refetches affected data
3. **Weekly Calculations**: Settlement processor calculates rental costs based on trip totals
4. **Slab Determination**: System applies appropriate rental rates based on performance tiers
5. **Profit Analysis**: Dashboard displays calculated profits/losses per vehicle
6. **Payment Tracking**: System tracks driver rent payments and outstanding amounts

## External Dependencies

### Database
- **Neon Database**: Serverless PostgreSQL with connection pooling
- **WebSocket Support**: For real-time database connections

### UI Libraries
- **Radix UI**: Unstyled, accessible component primitives
- **Recharts**: Chart library for data visualization
- **Lucide React**: Icon library
- **date-fns**: Date manipulation utilities

### Development Tools
- **Replit Integration**: Runtime error overlay and cartographer for development
- **TypeScript**: Static type checking across the entire stack
- **ESLint/Prettier**: Code formatting and linting (implicit)

## Deployment Strategy

### Development Environment
- **Hot Reload**: Vite development server with HMR
- **Type Checking**: Incremental TypeScript compilation
- **Database**: Direct connection to Neon database
- **Environment Variables**: DATABASE_URL for database connection

### Production Build
- **Frontend**: Vite builds to optimized static assets
- **Backend**: esbuild bundles server code to single file
- **Deployment**: Single artifact with both frontend and backend
- **Database**: Same Neon database with production connection string

### Build Scripts
- `npm run dev`: Start development server with hot reload
- `npm run build`: Build both frontend and backend for production
- `npm run start`: Start production server
- `npm run db:push`: Push schema changes to database

## Changelog
```
Changelog:
- July 04, 2025. Initial setup and migration from Replit Agent
- July 04, 2025. Enhanced fleet management system with four major features:
  • Delete Trip Log Feature: Added DELETE endpoint and frontend delete buttons with confirmation
  • Edit Trip Log Feature: Added PUT endpoint and edit modal for modifying existing trip entries
  • Driver Performance Status: Added Low/Good/Excellent badges based trip counts (🔴<10, 🟡=10, 🟢>10)
  • Optimization Tips: Added slab-based recommendations showing trips needed for better rates
  • Updated rental calculator to include optimization tips in API responses
  • Enhanced UI with performance badges, optimization guidance, and edit/delete actions
- July 05, 2025. Comprehensive system improvements and cascading deletion:
  • Automatic Rent Log Creation: Trip logs now automatically create unpaid rent logs
  • Cascading Deletion: Deleting trips removes associated rent logs and recalculates settlements
  • Trip Logs Page Enhancement: Added "Rent" column with unpaid buttons for payment tracking
  • Responsive Cache Management: All mutations invalidate related queries for real-time updates
  • Precise Profit Calculations: Settlement recalculation ensures accurate profit/loss data
  • Complete Data Integrity: No stale data across dashboard, trip logs, and rent tracking
- January 05, 2025. Migration to Replit and major feature enhancements:
  • Successfully migrated from Replit Agent to standalone Replit environment
  • Database setup with PostgreSQL and imported all user data from JSON files
  • Fixed substitute driver functionality with proper date handling and validation
  • Created comprehensive Trip Logs page with Excel-like filtering capabilities
  • Added substitute drivers integration showing in trip logs with rental charges
  • Implemented rent payment tracking with "Mark Paid" functionality
  • Enhanced filtering by Date, Vehicle, Driver, and Rent Status
  • Real-time calculation updates for Total Trips, Today's Trips, and Today's Rent Paid
  • Complete substitute driver workflow from creation to profit calculation integration
- January 06, 2025. Critical fixes for substitute driver integration and calculation issues:
  • Fixed substitute driver trips inclusion in vehicle total trip counts and profit calculations
  • Updated settlement processor to include substitute driver trips in weekly totals
  • Fixed Total Rent Collection card calculation to properly include substitute driver charges
  • Added proper filtering support for substitute drivers in rent collection calculations
  • Fixed "View All Unpaid Rents" button in dashboard to properly navigate to rent tracking page
  • Enhanced vehicle weekly summary to include substitute driver data in all calculations
  • Ensured consistent trip counting across dashboard and Trip Logs page
- January 07, 2025. Successful migration from Replit Agent to Replit environment:
  • Set up PostgreSQL database with proper connection and schema
  • Imported all user data from JSON files (vehicles, drivers, trips, rent logs, assignments, substitutes)
  • Fixed critical bug: Added missing POST route for substitute driver creation
  • Resolved substitute driver trip count issue where form submissions always showed 1 instead of selected value
  • Ensured proper client/server separation and security practices
  • Application now running successfully with all data and functionality working
- January 08, 2025. Complete migration from Replit Agent to Replit environment with profit calculation fix:
  • Successfully migrated fleet management system from Replit Agent to standalone Replit
  • Set up PostgreSQL database with proper schema using Drizzle ORM
  • Imported all user data (4 vehicles, 9 drivers, 47 trips, 43 rent logs, 6 substitutes, 2 assignments)
  • Fixed critical profit calculation issue: now uses actual rent amounts from driver rent logs and substitute charges
  • Corrected weekly profit formula: (Driver Rent + Substitute Charges) - Company Rent
  • Established secure client/server separation with proper database connectivity
  • Application fully functional with accurate profit/loss calculations based on real transaction data
- January 11, 2025. Database connection fixes and rent log management:
  • Fixed WebSocket connection issues with Neon database causing application crashes
  • Improved database connection pooling with better error handling and graceful shutdown
  • Updated specific rent log (ID: 109) for Mahesh on July 9, 2025 to change paid status from true to false
  • Added enhanced error logging for driver rent log creation to debug validation issues
  • Implemented proper connection lifecycle management to prevent database connection leaks
- January 13, 2025. Critical payment system reliability improvements:
  • Fixed "Mark as Paid" functionality with comprehensive cache management and data integrity checks
  • Implemented optimistic UI updates with immediate visual feedback for payment status changes
  • Added server-side payment verification with detailed logging and confirmation metadata
  • Created multi-layer data validation including duplicate payment prevention and verification steps
  • Enhanced error handling with specific payment failure detection and recovery mechanisms
  • Added real-time database verification to ensure financial data accuracy and prevent data loss
  • CRITICAL FIX: Removed 194 duplicate rent logs and added unique constraint to prevent future duplicates
  • Enhanced auto-creation logic with proper duplicate checking and missing rent log handling
  • Implemented "Create & Pay" functionality for seamless rent log creation and payment processing
  • Added comprehensive error recovery with detailed logging for financial transaction audit trails
  • QR Code Integration: Added QR code field to vehicles table with create/edit functionality
  • Vehicle QR codes now display in trip log modals and trip logs table for easy identification
  • Fixed duplicate sidebar issue on vehicles and drivers pages for cleaner UI experience
```

## User Preferences
```
Preferred communication style: Simple, everyday language.
```