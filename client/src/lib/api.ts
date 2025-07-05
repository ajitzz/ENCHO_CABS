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
    optimizationTip: string;
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

export interface ProfitBreakdown {
  revenue: {
    driver1Rent: number;
    driver2Rent: number;
    substituteRent: number;
    totalDriverRent: number;
  };
  expenses: {
    slabRentPerDay: number;
    totalDays: number;
    totalCompanyRent: number;
    company: string;
  };
  calculation: {
    totalRevenue: number;
    totalExpenses: number;
    netProfit: number;
  };
}

export interface ProfitData {
  vehicleNumber: string;
  vehicleId: number;
  profit: number;
  totalTrips: number;
  weekStart: string;
  weekEnd: string;
  breakdown: ProfitBreakdown;
}

export interface SettlementWithVehicle extends WeeklySettlement {
  vehicleNumber: string;
}

// API functions
export const api = {
  // Vehicle APIs
  getVehicles: async (): Promise<Vehicle[]> => {
    const response = await fetch("/api/vehicles");
    if (!response.ok) throw new Error("Failed to fetch vehicles");
    return response.json();
  },

  getVehicle: async (id: number): Promise<Vehicle> => {
    const response = await fetch(`/api/vehicles/${id}`);
    if (!response.ok) throw new Error("Failed to fetch vehicle");
    return response.json();
  },

  createVehicle: async (vehicle: { vehicleNumber: string; company: "PMV" | "Letzryd" }): Promise<Vehicle> => {
    const response = await fetch("/api/vehicles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(vehicle),
    });
    if (!response.ok) throw new Error("Failed to create vehicle");
    return response.json();
  },

  updateVehicle: async (id: number, vehicle: { vehicleNumber?: string; company?: "PMV" | "Letzryd" }): Promise<Vehicle> => {
    const response = await fetch(`/api/vehicles/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(vehicle),
    });
    if (!response.ok) throw new Error("Failed to update vehicle");
    return response.json();
  },

  deleteVehicle: async (id: number): Promise<void> => {
    const response = await fetch(`/api/vehicles/${id}`, {
      method: "DELETE",
    });
    if (!response.ok) throw new Error("Failed to delete vehicle");
  },

  getVehicleSummary: async (id: number, weekStart?: string): Promise<VehicleSummary> => {
    const url = weekStart ? `/api/vehicles/${id}/weekly-summary?weekStart=${weekStart}` : `/api/vehicles/${id}/weekly-summary`;
    const response = await fetch(url);
    if (!response.ok) throw new Error("Failed to fetch vehicle summary");
    return response.json();
  },

  // Driver APIs
  getDrivers: async (): Promise<Driver[]> => {
    const response = await fetch("/api/drivers");
    if (!response.ok) throw new Error("Failed to fetch drivers");
    return response.json();
  },

  createDriver: async (driverData: {
    name: string;
    phone: string;
    hasAccommodation: boolean;
  }): Promise<Driver> => {
    const response = await fetch("/api/drivers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(driverData),
    });
    if (!response.ok) throw new Error("Failed to create driver");
    return response.json();
  },

  updateDriver: async (id: number, driver: { name?: string; phone?: string; hasAccommodation?: boolean }): Promise<Driver> => {
    const response = await fetch(`/api/drivers/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(driver),
    });
    if (!response.ok) throw new Error("Failed to update driver");
    return response.json();
  },

  deleteDriver: async (id: number): Promise<void> => {
    const response = await fetch(`/api/drivers/${id}`, {
      method: "DELETE",
    });
    if (!response.ok) throw new Error("Failed to delete driver");
  },

  // Trip APIs
  createTrip: async (tripData: {
    driverId: number;
    vehicleId: number;
    tripDate: Date | string;
    shift: "morning" | "evening";
    tripCount: number;
  }): Promise<Trip> => {
    const serializedData = {
      ...tripData,
      tripDate: tripData.tripDate instanceof Date ? tripData.tripDate.toISOString() : tripData.tripDate,
    };
    const response = await fetch("/api/trips", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(serializedData),
    });
    if (!response.ok) throw new Error("Failed to create trip");
    return response.json();
  },

  getRecentTrips: async (limit: number = 10): Promise<RecentTrip[]> => {
    const response = await fetch(`/api/trips/recent/${limit}`);
    if (!response.ok) throw new Error("Failed to fetch recent trips");
    return response.json();
  },

  updateTrip: async (id: number, tripData: {
    driverId: number;
    vehicleId: number;
    tripDate: Date | string;
    shift: "morning" | "evening";
    tripCount: number;
  }): Promise<Trip> => {
    const serializedData = {
      ...tripData,
      tripDate: tripData.tripDate instanceof Date ? tripData.tripDate.toISOString() : tripData.tripDate,
    };
    const response = await fetch(`/api/trips/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(serializedData),
    });
    if (!response.ok) throw new Error("Failed to update trip");
    return response.json();
  },

  deleteTrip: async (id: number): Promise<void> => {
    const response = await fetch(`/api/trips/${id}`, {
      method: "DELETE",
    });
    if (!response.ok) throw new Error("Failed to delete trip");
  },

  // Driver rent log APIs
  updateRentStatus: async (id: number, paid: boolean): Promise<DriverRentLog> => {
    const response = await fetch(`/api/driver-rent-logs/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paid }),
    });
    if (!response.ok) throw new Error("Failed to update rent status");
    return response.json();
  },

  getUnpaidRents: async (): Promise<UnpaidRent[]> => {
    const response = await fetch("/api/driver-rent-logs/unpaid");
    if (!response.ok) throw new Error("Failed to fetch unpaid rents");
    return response.json();
  },

  // Settlement APIs
  processSettlement: async (vehicleId: number, weekStartDate: string): Promise<void> => {
    const response = await fetch("/api/settlements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vehicleId, weekStartDate }),
    });
    if (!response.ok) throw new Error("Failed to process settlement");
  },

  processAllSettlements: async (weekStartDate?: string): Promise<void> => {
    const response = await fetch("/api/settlements/process-all", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ weekStartDate: weekStartDate || new Date().toISOString() }),
    });
    if (!response.ok) throw new Error("Failed to process all settlements");
  },

  getSettlements: async (): Promise<SettlementWithVehicle[]> => {
    const response = await fetch("/api/settlements");
    if (!response.ok) throw new Error("Failed to fetch settlements");
    return response.json();
  },

  // Dashboard APIs
  getProfitGraphData: async (): Promise<ProfitData[]> => {
    const response = await fetch("/api/dashboard/profit-graph");
    if (!response.ok) throw new Error("Failed to fetch profit graph data");
    return response.json();
  },

  // Rental slab APIs
  getRentalSlabs: async (company: "PMV" | "Letzryd"): Promise<any[]> => {
    const response = await fetch(`/api/rental-slabs/${company}`);
    if (!response.ok) throw new Error("Failed to fetch rental slabs");
    return response.json();
  },

  // Export APIs
  exportData: async (type: "settlements" | "trips" | "drivers" | "vehicles"): Promise<Blob> => {
    const response = await fetch(`/api/export/${type}`, {
      method: "GET",
      headers: { "Accept": "application/json" },
    });
    if (!response.ok) throw new Error(`Failed to export ${type}`);
    return response.blob();
  },
};
