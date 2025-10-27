import { apiRequest } from "./queryClient";

export interface Vehicle {
  id: number;
  vehicleNumber: string;
  qrCode?: string;
  company: "PMV" | "Letzryd";
  purchasedDate: string;
  droppedDate?: string;
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
  createdAt: string;
  updatedAt: string;
}

export interface DriverRentLog {
  id: number;
  driverId: number;
  vehicleId: number;
  date: string;
  shift: "morning" | "evening";
  rent: number;
  amountCollected: number;
  fuel: number;
  createdAt: string;
  updatedAt: string;
}

export interface RentLogWithDetails extends DriverRentLog {
  driverName: string;
  vehicleNumber: string;
}

export interface SettlementRow {
  weekStart: string;
  weekEnd: string;
  rent: number;
  wallet: number;
  companyRent: number | null;
  companyWallet: number | null;
  roomRent: number;
  profit: number | null;
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

export interface RecentTrip extends Trip {
  driverName: string;
  vehicleNumber: string;
}

export interface ProfitBreakdown {
  revenue: {
    drivers: Array<{ id: number; name: string; rent: number; daysWorked: number }>;
    substitutes: Array<{ id: number; name: string; charge: number }>;
    totalDriverRent: number;
    totalSubstituteCharges: number;
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
  weekStart: string;
  weekEnd: string;
  profit: number | null;
  rent: number;
  wallet: number;
  companyRent: number | null;
  companyWallet: number | null;
  roomRent: number;
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

  createVehicle: async (vehicle: { vehicleNumber: string; qrCode?: string; company: "PMV" | "Letzryd"; purchasedDate: string | Date }): Promise<Vehicle> => {
    const response = await fetch("/api/vehicles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(vehicle),
    });
    if (!response.ok) throw new Error("Failed to create vehicle");
    return response.json();
  },

  updateVehicle: async (id: number, vehicle: { vehicleNumber?: string; qrCode?: string; company?: "PMV" | "Letzryd"; purchasedDate?: string | Date; droppedDate?: string | Date | null }): Promise<Vehicle> => {
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
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.error || errorData.message || "Failed to create driver";
      throw new Error(errorMessage);
    }
    
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

  // Driver rent log APIs
  getRecentRentLogs: async (limit: number = 10): Promise<RentLogWithDetails[]> => {
    const response = await fetch(`/api/driver-rent-logs/recent/${limit}`);
    if (!response.ok) throw new Error("Failed to fetch recent rent logs");
    return response.json();
  },
  getAllRentLogs: async (): Promise<RentLogWithDetails[]> => {
    const response = await fetch("/api/driver-rent-logs");
    if (!response.ok) throw new Error("Failed to fetch rent logs");
    return response.json();
  },

  updateRentLog: async (id: number, rentLogData: {
    vehicleId?: number;
    driverId?: number;
    date?: Date | string;
    shift?: "morning" | "evening";
    rent?: number;
    amountCollected?: number;
    fuel?: number;
  }): Promise<DriverRentLog> => {
    const serializedData = {
      ...rentLogData,
      date: rentLogData.date instanceof Date ? rentLogData.date.toISOString() : rentLogData.date,
    };
    const response = await fetch(`/api/driver-rent-logs/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(serializedData),
    });
    if (!response.ok) throw new Error("Failed to update rent log");
    return response.json();
  },

  deleteRentLog: async (id: number): Promise<void> => {
    const response = await fetch(`/api/driver-rent-logs/${id}`, {
      method: "DELETE",
    });
    if (!response.ok) throw new Error("Failed to delete rent log");
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

  // Substitute driver APIs
  getSubstituteDrivers: async (): Promise<any[]> => {
    const response = await fetch("/api/substitute-drivers");
    if (!response.ok) throw new Error("Failed to fetch substitute drivers");
    return response.json();
  },


  createSubstituteDriver: async (substituteData: {
    name: string;
    vehicleId: number;
    date: Date | string;
    shift: "morning" | "evening";
    shiftHours: 6 | 8 | 12;
    charge: number;
    tripCount?: number;
  }): Promise<any> => {
    const serializedData = {
      ...substituteData,
      date: substituteData.date instanceof Date ? substituteData.date.toISOString() : substituteData.date,
    };
    const response = await fetch("/api/substitute-drivers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(serializedData),
    });
    if (!response.ok) throw new Error("Failed to create substitute driver");
    return response.json();
  },

  deleteSubstituteDriver: async (id: number): Promise<void> => {
    const response = await fetch(`/api/substitute-drivers/${id}`, {
      method: "DELETE",
    });
    if (!response.ok) throw new Error("Failed to delete substitute driver");
  },

  // Meta APIs
  getFirstTripDate: async (): Promise<string | null> => {
    const response = await fetch("/api/meta/first-trip-date");
    if (!response.ok) throw new Error("Failed to fetch first trip date");
    const data = await response.json();
    return data.firstTripDate;
  },

  // Weekly Summary APIs
  getWeeklySummary: async (startDate: string, endDate: string): Promise<any> => {
    const response = await fetch(`/api/weekly-summary/aggregates?startDate=${startDate}&endDate=${endDate}`);
    if (!response.ok) throw new Error("Failed to fetch weekly summary");
    return response.json();
  },

  // Settlements APIs
  getSettlements: async (): Promise<{ items: SettlementRow[] }> => {
    const response = await fetch("/api/settlements");
    if (!response.ok) throw new Error("Failed to load settlements");
    return response.json();
  },

  saveSettlement: async (p: { weekStart: string; weekEnd: string; companyRent: number | null; companyWallet: number | null }): Promise<{ ok: true; items: SettlementRow[] }> => {
    const response = await fetch("/api/settlements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(p),
    });
    if (!response.ok) throw new Error("Failed to save settlement");
    return response.json();
  },

  deleteSettlement: async (weekStart: string, weekEnd: string): Promise<{ ok: true; items: SettlementRow[] }> => {
    const response = await fetch(`/api/settlements?weekStart=${weekStart}&weekEnd=${weekEnd}`, { method: "DELETE" });
    if (!response.ok) throw new Error("Failed to delete settlement");
    return response.json();
  },
};
