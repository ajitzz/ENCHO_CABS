# Fleet Management Web Application

## Overview
This full-stack web application is designed for managing vehicle rental operations, encompassing vehicle leasing, driver assignments, trip tracking, and complex rental calculations. It supports integrations with providers like PMV and Letzryd, manages driver activities, and handles financial aspects such as rent logs, weekly settlements, and investment tracking with partial returns. The system aims to streamline fleet management, optimize rental income through performance-based pricing, and provide comprehensive financial oversight.

**Data Integrity**: Prevents duplicate driver entries on the same day - a driver can only have one trip log per date, regardless of entry method (manual or CSV import).

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
- **Core Entities**: Vehicles, Drivers, Vehicle Driver Assignments, Driver Rent Logs, Weekly Settlements, Substitute Drivers, Investments, Investment Returns.
- **Data Model**: Uses driverRentLogs table exclusively for trip tracking - trips table has been removed as redundant.

### Key Features
- **Rental Calculator**: Implements complex slab-based pricing.
- **Settlement Processor**: Calculates weekly rental costs based on trip performance.
- **Trip Logging & Management**: Allows logging, editing, and deleting daily trips; automatically creates rent logs.
- **Driver Performance**: Tracks and displays driver performance based on trip counts.
- **Rent & Payment Tracking**: Manages driver rent payments, tracks outstanding amounts, and supports "Mark as Paid" functionality.
- **Investment Tracking**: Comprehensive system for managing investments, including multiple partial returns, payment methods, and grouped views by investor.
- **QR Code System**: Unique QR code validation and display for vehicles and drivers.
- **UI/UX**: Dashboard, performance charts (Recharts), rental slab cards, and payment tracking interfaces.

## External Dependencies

### Database
- **Neon Database**: Serverless PostgreSQL.

### UI Libraries
- **Radix UI**: Accessible component primitives.
- **Recharts**: Charting library.
- **Lucide React**: Icon library.
- **date-fns**: Date manipulation utilities.

### Development Tools
- **Replit Integration**: Runtime error overlay and cartographer.
- **TypeScript**: Static type checking.

## Recent Updates

### October 27, 2025 - Database Refactoring

#### Trips Table Removal
- Removed redundant trips table from database schema
- Consolidated all trip tracking into driverRentLogs table
- Updated backend API: removed trip endpoints, added /api/driver-rent-logs/recent/:limit endpoint
- Updated frontend components to use rent logs API exclusively
- Simplified data model while maintaining all functionality
- CSV import now creates only rent logs (not separate trip records)
- All queries and mutations updated to use driver rent logs
- Architect review passed: clean refactoring with no blocking regressions

### October 27, 2025 - Keyboard Shortcuts & Data Import

#### Keyboard Shortcut for Trip Logs
- Added keyboard shortcut 'N' to open Add Trip Log modal on Trip Logs page
- Prevents activation when typing in input fields or when modals are open
- Visual hint displayed on page showing the keyboard shortcut
- Improves workflow efficiency for frequent trip log entries

### October 27, 2025 - Data Import & Vehicle Filtering

#### Trips Column in Weekly Summary
- Added editable "Trips" column between Fuel and Total Earnings
- Automatically populated with actual trip count from database
- Editable like other financial fields with auto-save functionality
- Stored in weekly_summaries table for record keeping
- Blue highlighted background for easy identification

#### Weekly Summary CSV Import
- Added "Import CSV" button to Weekly Summary page
- Allows bulk import of weekly summary data (trips, total earnings, cash, refunds)
- CSV format: Date, Driver, Trips, Total earnings, Cash collected, Refunds
- Automatically matches drivers to computed weekly summary for the selected date range
- Skips drivers not found in the computed list and displays them in a popup dialog
- Updates weekly_summaries table with imported data
- Shows import results with success count, skipped count, and errors
- API endpoint: POST /api/import/weekly-summary

#### CSV Data Import
- Added bulk import functionality for trip logs via CSV files
- New "Import Data" page in navigation with upload interface
- Automatically creates missing vehicles and drivers during import
- Skips invalid entries (No Vehicle, Leave status)
- Comprehensive import results with success/error reporting
- Validates and parses CSV format: Date (DD/MM/YYYY), Vehicle, Driver, Shift, Rent, Collection, Fuel
- Case-insensitive field names (handles DATE, Date, date, etc.)
- Handles duplicate Collection columns (uses first non-empty value)
- Handles invalid numeric values (X, -, empty) by treating as 0
- Skips duplicate entries (same driver, date, shift) automatically
- API endpoint: POST /api/import/trip-logs

#### Dropped Vehicle Filtering
- Vehicles with droppedDate <= today are automatically hidden from all forms
- Filtered from: Trip Log forms, Substitute Driver forms, Vehicle Selector, and filter dropdowns
- Date comparison at midnight ensures accurate day-based filtering
- Vehicles without droppedDate or with future droppedDate remain visible
- Consistent filtering logic across all pages

#### Confirmation Dialogs
- Added user confirmation dialogs for all edit and delete operations
- Implemented using AlertDialog components from shadcn/ui
- Replaced all native window.confirm() with proper dialog components
- Covers: Investments, Vehicles, Drivers, Trips, Trip Logs, Settlements
- Clear messaging with contextual information and destructive styling for delete actions

#### Duplicate Driver Prevention
- Enforces unique driver per day constraint across all entry methods
- **Manual Entry**: Prevents duplicate entries when adding trip logs manually through the form
- **CSV Import**: Pre-validates CSV file and rejects entire file if internal duplicates found
  - Scans CSV file before importing any data
  - Shows detailed list of duplicate drivers with dates and row numbers
  - No data is imported if duplicates are detected
  - Clear error messages with actionable instructions
- **Edit Operations**: Validates during edit operations - prevents changing to a date where driver already has an entry
- **Database Protection**: Also checks against existing database entries to prevent conflicts
- Maintains data integrity by ensuring one trip log per driver per day

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

