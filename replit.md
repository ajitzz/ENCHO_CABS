# Fleet Management Web Application

## Overview
This full-stack web application is designed for managing vehicle rental operations, encompassing vehicle leasing, driver assignments, trip tracking, and complex rental calculations. It supports integrations with providers like PMV and Letzryd, manages driver activities, and handles financial aspects such as rent logs, weekly settlements, and investment tracking with partial returns. The system aims to streamline fleet management, optimize rental income through performance-based pricing, and provide comprehensive financial oversight.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **UI Framework**: shadcn/ui (built on Radix UI)
- **Styling**: Tailwind CSS
- **State Management**: TanStack Query (React Query)
- **Routing**: Wouter
- **Form Handling**: React Hook Form with Zod validation

### Backend
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript (ES modules)
- **Database ORM**: Drizzle ORM
- **Database**: PostgreSQL (Neon serverless)
- **Validation**: Zod schemas
- **Build System**: esbuild

### Data Storage and Schema
- **Primary Database**: PostgreSQL via Neon serverless
- **Schema Management**: Drizzle Kit for migrations
- **Connection Pooling**: Neon serverless pool with WebSocket support
- **Core Entities**: Vehicles, Drivers, Vehicle Driver Assignments, Trips, Driver Rent Logs, Weekly Settlements, Substitute Drivers, Investments, Investment Returns.

### Key Features
- **Rental Calculator**: Implements complex slab-based pricing.
- **Settlement Processor**: Calculates weekly rental costs based on trip performance.
- **Trip Logging & Management**: Allows logging, editing, and deleting daily trips; automatically creates rent logs.
- **Driver Performance**: Tracks and displays driver performance based on trip counts.
- **Rent & Payment Tracking**: Manages driver rent payments, tracks outstanding amounts, and supports "Mark as Paid" functionality.
- **Investment Tracking**: Comprehensive system for managing investments, including multiple partial returns, payment methods, and grouped views by investor.
- **QR Code System**: Unique QR code validation and display for vehicles and drivers.
- **Excel Import**: Bulk import of drivers, vehicles, and trip logs from Excel files with data preview and validation.
- **Confirmation Dialogs**: All edit and delete operations require user confirmation via AlertDialog components for data safety.
- **UI/UX**: Dashboard, performance charts (Recharts), rental slab cards, and payment tracking interfaces.

## External Dependencies

### Database
- **Neon Database**: Serverless PostgreSQL.

### UI Libraries
- **Radix UI**: Accessible component primitives.
- **Recharts**: Charting library.
- **Lucide React**: Icon library.
- **date-fns**: Date manipulation utilities.
- **xlsx**: Excel file parsing and manipulation.

### Development Tools
- **Replit Integration**: Runtime error overlay and cartographer.
- **TypeScript**: Static type checking.

## Recent Updates

### October 27, 2025 - Confirmation Dialogs & Excel Import

#### Confirmation Dialogs for All Operations
- Added AlertDialog confirmation for all edit and delete operations across the entire app
- Replaced all native window.confirm() with shadcn/ui AlertDialog components
- Implemented consistent pattern: state-managed confirmations with clear descriptions
- Delete operations use destructive styling (red buttons)
- All dialogs include contextual information (driver name, vehicle number, date ranges)
- Database updates only occur after user confirms the action
- Applied to: Investments, Vehicles, Drivers, Trips, TripLogs, Settlements pages

#### Excel Import Feature
- New Import page accessible from sidebar with Upload icon
- Automatically detects and extracts data from "September" sheet in Excel files
- Column mapping: Date, Car Reg (vehicle), Drivers, Rent, Amount Received/QR Amount, Fuel, Shift
- Data preview table shows first 50 rows before import
- Bulk creates unique drivers and vehicles from extracted data
- Automatically generates QR codes for new drivers and vehicles
- Creates trip logs with all financial data (rent, collection, fuel)
- Import results dashboard shows counts of drivers, vehicles, and trips added
- Error handling with detailed error messages for failed imports
- Handles duplicate entries gracefully (skips already existing records)
- Uses xlsx library for robust Excel file parsing

### October 27, 2025 - Investment Management Enhancements

#### Add More Investment Feature
- Added "Add Investment" button within each investor card in the Investment History section
- Allows adding additional investments for existing investors without creating new investor cards
- Pre-fills investor name and only requires date, amount, and optional payment method
- Automatically updates totals (Total Invested, Total Returned, Balance) when new investments are added
- Uses separate dialog and mutation for better UX and state management
- Button located next to Investment History heading for easy access

#### Investment Display Improvements
- Grouped view shows all investments and returns per investor
- Color-coded headers: green for completed investments (balance = 0), blue/orange for active
- Comprehensive tables showing investment dates, amounts, payment methods
- Complete return history with edit and delete capabilities
- Totals section shows Total Invested, Total Returned, and Balance with color indicators

