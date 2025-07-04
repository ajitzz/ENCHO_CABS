import { apiRequest } from "./queryClient";

export interface Vehicle {
  id: number;
  vehicleNumber: string;
  company: "PMV" | "Letzryd";
  createdAt: string;
  updatedAt: string;
}

export interface Driver {
  id: number;
  name: string;
  phone: string;
  hasAccommodation: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Trip {
  id: number;
  driverId: number;
  vehicleId: number;
  tripDate: string;
  shift: "morning" | "evening";
  tripCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface DriverRentLog {
  id: number;
  driverId: number;
  date: string;
  rent: number;
  paid: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface WeeklySettlement {
  id: number;
  vehicleId: number;
  weekStart: string;
  weekEnd: string;
  totalTrips: number;
  rentalRate: number;
  totalRentToCompany: number;
  driver1Data: { id: number; rent: number } | null;
  driver2Data: { id: number; rent: number } | null;
  totalDriverRent: number;
  profit: number;
  paid: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface VehicleSummary {
  vehicle: Vehicle;
  totalTrips: number;
  rentalRate: number;
  totalRentToCompany: number;
  totalDriverRent: number;
  profit: number;
  rentalInfo: {
    currentRate: number;
    nextBetterSlab: {
      rate: number;
      tripsNeeded: number;
    } | null;
    weeklyCost: number;
  };
  morningDriver: Driver | null;
  eveningDriver: Driver | null;
}

export interface UnpaidRent extends DriverRentLog {
  driverName: string;
  vehicleNumber: string;
}

export interface RecentTrip extends Trip {
  driverName: string;
  vehicleNumber: string;
}

export interface ProfitData {
  vehicleNumber: string;
  profit: number;
  totalTrips: number;
  weekStart: string;
  weekEnd: string;
}

export interface SettlementWithVehicle extends WeeklySettlement {
  vehicleNumber: string;
}

// API functions
export const api = {
  // Vehicle APIs
  getVehicles: async (): Promise<Vehicle[]> => {
    const response = await apiRequest("GET", "/api/vehicles");
    return response.json();
  },

  getVehicle: async (id: number): Promise<Vehicle> => {
    const response = await apiRequest("GET", `/api/vehicles/${id}`);
    return response.json();
  },

  getVehicleSummary: async (id: number, weekStart?: string): Promise<VehicleSummary> => {
    const url = weekStart ? `/api/vehicles/${id}/weekly-summary?weekStart=${weekStart}` : `/api/vehicles/${id}/weekly-summary`;
    const response = await apiRequest("GET", url);
    return response.json();
  },

  // Driver APIs
  getDrivers: async (): Promise<Driver[]> => {
    const response = await apiRequest("GET", "/api/drivers");
    return response.json();
  },

  // Trip APIs
  createTrip: async (tripData: {
    driverId: number;
    vehicleId: number;
    tripDate: string;
    shift: "morning" | "evening";
    tripCount: number;
  }): Promise<Trip> => {
    const response = await apiRequest("POST", "/api/trips", tripData);
    return response.json();
  },

  getRecentTrips: async (limit: number = 10): Promise<RecentTrip[]> => {
    const response = await apiRequest("GET", `/api/trips/recent/${limit}`);
    return response.json();
  },

  // Driver rent log APIs
  updateRentStatus: async (id: number, paid: boolean): Promise<DriverRentLog> => {
    const response = await apiRequest("PATCH", `/api/driver-rent-logs/${id}/status`, { paid });
    return response.json();
  },

  getUnpaidRents: async (): Promise<UnpaidRent[]> => {
    const response = await apiRequest("GET", "/api/driver-rent-logs/unpaid");
    return response.json();
  },

  // Settlement APIs
  processSettlement: async (vehicleId: number, weekStartDate: string): Promise<void> => {
    await apiRequest("POST", "/api/settlements", { vehicleId, weekStartDate });
  },

  processAllSettlements: async (weekStartDate?: string): Promise<void> => {
    await apiRequest("POST", "/api/settlements/process-all", { weekStartDate });
  },

  getSettlements: async (): Promise<SettlementWithVehicle[]> => {
    const response = await apiRequest("GET", "/api/settlements");
    return response.json();
  },

  // Dashboard APIs
  getProfitGraphData: async (): Promise<ProfitData[]> => {
    const response = await apiRequest("GET", "/api/dashboard/profit-graph");
    return response.json();
  },

  // Rental slab APIs
  getRentalSlabs: async (company: "PMV" | "Letzryd"): Promise<any[]> => {
    const response = await apiRequest("GET", `/api/rental-slabs/${company}`);
    return response.json();
  },
};
