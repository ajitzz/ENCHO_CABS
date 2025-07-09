import { useState, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { Trash2, Edit, Filter, X, Search, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import EditTripModal from "@/components/EditTripModal";
import TripLogModal from "@/components/TripLogModal";
import SubstituteDriverForm from "@/components/SubstituteDriverForm";

interface TripLog {
  id: number;
  driverId: number;
  vehicleId: number;
  tripDate: string;
  shift: "morning" | "evening";
  tripCount: number;
  driverName: string;
  vehicleNumber: string;
  isSubstitute?: boolean;
  charge?: number;
}

interface SubstituteDriver {
  id: number;
  name: string;
  vehicleId: number;
  date: string;
  shift: "morning" | "evening";
  shiftHours: number;
  charge: number;
  vehicleNumber: string;
}

export default function TripLogs() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [editTrip, setEditTrip] = useState<any>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [tripLogModalOpen, setTripLogModalOpen] = useState(false);
  const [substituteModalOpen, setSubstituteModalOpen] = useState(false);
  
  // Filter states
  const [startDateFilter, setStartDateFilter] = useState("");
  const [endDateFilter, setEndDateFilter] = useState("");
  const [vehicleFilter, setVehicleFilter] = useState("");
  const [driverFilter, setDriverFilter] = useState("");
  const [rentFilter, setRentFilter] = useState("all");
  const [showFilters, setShowFilters] = useState(false);

  // Fetch data
  const { data: trips = [], isLoading: tripsLoading } = useQuery({
    queryKey: ["/api/trips/recent/500"],
    queryFn: () => api.getRecentTrips(500),
  });

  const { data: substituteDrivers = [], isLoading: substitutesLoading } = useQuery({
    queryKey: ["/api/substitute-drivers"],
    queryFn: () => api.getSubstituteDrivers(),
  });

  const { data: unpaidRentLogs = [], isLoading: unpaidRentLogsLoading } = useQuery({
    queryKey: ["/api/driver-rent-logs/unpaid"],
    queryFn: () => api.getUnpaidDriverRents(),
  });

  const { data: vehicles = [] } = useQuery({
    queryKey: ["/api/vehicles"],
    queryFn: () => api.getVehicles(),
  });

  // Fetch all rent logs to show amounts even after payment
  const { data: allRentLogs = [], isLoading: allRentLogsLoading } = useQuery({
    queryKey: ["/api/driver-rent-logs/all"],
    queryFn: async () => {
      const response = await fetch("/api/driver-rent-logs");
      if (!response.ok) throw new Error("Failed to fetch all rent logs");
      return response.json();
    },
  });

  // Helper function to get rent status  
  const getRentStatus = useCallback((log: TripLog) => {
    if (log.isSubstitute) {
      return { status: "substitute", amount: log.charge || 0 };
    }
    
    // Normalize dates for comparison
    const tripDate = new Date(log.tripDate).toISOString().split('T')[0];
    
    // Check all rent logs to find the rent amount, paid or unpaid
    const rentLog = allRentLogs.find((rent: any) => {
      const rentDate = new Date(rent.date).toISOString().split('T')[0];
      return rent.driverId === log.driverId && rentDate === tripDate;
    });
    
    if (rentLog) {
      return { status: rentLog.paid ? "paid" : "unpaid", amount: rentLog.rent };
    }
    
    return { status: "unknown", amount: 0 };
  }, [allRentLogs]);

  // Combine trips and substitute drivers
  const allLogs = useMemo(() => {
    const tripLogs: TripLog[] = trips.map(trip => ({
      ...trip,
      isSubstitute: false
    }));

    const substituteLogs: TripLog[] = substituteDrivers.map(sub => ({
      id: sub.id,
      driverId: sub.id,
      vehicleId: sub.vehicleId,
      tripDate: sub.date,
      shift: sub.shift,
      tripCount: sub.tripCount || 1, // Use actual trip count for substitutes
      driverName: sub.name,
      vehicleNumber: sub.vehicleNumber,
      isSubstitute: true,
      charge: sub.charge
    }));

    return [...tripLogs, ...substituteLogs].sort((a, b) => 
      new Date(b.tripDate).getTime() - new Date(a.tripDate).getTime()
    );
  }, [trips, substituteDrivers]);

  // Filter logs
  const filteredLogs = useMemo(() => {
    if (allRentLogsLoading) return allLogs; // Return unfiltered if still loading
    
    return allLogs.filter(log => {
      const logDate = log.tripDate.split('T')[0]; // Get YYYY-MM-DD format
      
      // Date range filtering using string comparison (YYYY-MM-DD format)
      let matchesDateRange = true;
      if (startDateFilter || endDateFilter) {
        if (startDateFilter) {
          const startMatch = logDate >= startDateFilter;
          matchesDateRange = matchesDateRange && startMatch;
        }
        if (endDateFilter) {
          const endMatch = logDate <= endDateFilter;
          matchesDateRange = matchesDateRange && endMatch;
        }
        

      }
      
      const matchesVehicle = !vehicleFilter || log.vehicleNumber.toLowerCase().includes(vehicleFilter.toLowerCase());
      const matchesDriver = !driverFilter || log.driverName.toLowerCase().includes(driverFilter.toLowerCase());
      
      // Fix rent filter logic
      const rentStatus = getRentStatus(log);
      const matchesRent = !rentFilter || rentFilter === "all" || 
        (rentFilter === "paid" && rentStatus.status === "paid") || 
        (rentFilter === "unpaid" && rentStatus.status === "unpaid");
      
      return matchesDateRange && matchesVehicle && matchesDriver && matchesRent;
    });
  }, [allLogs, startDateFilter, endDateFilter, vehicleFilter, driverFilter, rentFilter, getRentStatus, allRentLogsLoading]);

  // Calculate totals for filtered data
  const totals = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const todayLogs = filteredLogs.filter(log => log.tripDate.startsWith(today));
    
    // Calculate total rent paid from filtered logs (only paid entries)
    const totalRentPaid = filteredLogs.reduce((sum, log) => {
      const rentStatus = getRentStatus(log);
      if (rentStatus.status === "paid" || rentStatus.status === "substitute") {
        return sum + rentStatus.amount;
      }
      return sum;
    }, 0);

    // Calculate today's rent paid (including substitute drivers)
    const todayRentPaid = todayLogs.reduce((sum, log) => {
      const rentStatus = getRentStatus(log);
      if (rentStatus.status === "paid" || rentStatus.status === "substitute") {
        return sum + rentStatus.amount;
      }
      return sum;
    }, 0);
    
    return {
      totalTrips: filteredLogs.reduce((sum, log) => sum + log.tripCount, 0),
      todayTrips: todayLogs.reduce((sum, log) => sum + log.tripCount, 0),
      todayRentPaid: todayRentPaid,
      totalRentPaid: totalRentPaid
    };
  }, [filteredLogs, getRentStatus]);

  const deleteTripMutation = useMutation({
    mutationFn: (tripId: number) => api.deleteTrip(tripId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trips/recent/500"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/profit-graph"] });
      queryClient.invalidateQueries({ queryKey: ["/api/settlements"] });
      queryClient.invalidateQueries({ queryKey: ["/api/driver-rent-logs/unpaid"] });
      toast({ title: "Trip deleted successfully", variant: "default" });
    },
    onError: (error) => {
      toast({ title: "Failed to delete trip", description: error.message, variant: "destructive" });
    },
  });

  const payRentMutation = useMutation({
    mutationFn: (rentLogId: number) => api.payDriverRent(rentLogId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/driver-rent-logs/unpaid"] });
      queryClient.invalidateQueries({ queryKey: ["/api/driver-rent-logs/all"] });
      toast({ title: "Rent marked as paid", variant: "default" });
    },
    onError: (error) => {
      toast({ title: "Failed to update rent status", description: error.message, variant: "destructive" });
    },
  });

  const deleteSubstituteMutation = useMutation({
    mutationFn: (substituteId: number) => api.deleteSubstituteDriver(substituteId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/substitute-drivers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/trips/recent/500"] });
      toast({ title: "Substitute driver deleted successfully", variant: "default" });
    },
    onError: (error) => {
      toast({ title: "Failed to delete substitute driver", description: error.message, variant: "destructive" });
    },
  });

  const handleDeleteTrip = (tripId: number, driverName: string, vehicleNumber: string) => {
    if (window.confirm(`Are you sure you want to delete the trip for ${driverName} (${vehicleNumber})?`)) {
      deleteTripMutation.mutate(tripId);
    }
  };

  const handleEditTrip = (trip: any) => {
    setEditTrip(trip);
    setEditModalOpen(true);
  };

  const handlePayRent = (log: TripLog) => {
    if (log.isSubstitute) return;
    
    // Normalize dates for comparison
    const tripDate = new Date(log.tripDate).toISOString().split('T')[0];
    
    // Find the corresponding rent log ID
    const rentLog = allRentLogs.find((rent: any) => {
      const rentDate = new Date(rent.date).toISOString().split('T')[0];
      return rent.driverId === log.driverId && rentDate === tripDate;
    });
    
    if (rentLog) {
      payRentMutation.mutate(rentLog.id);
    } else {
      toast({ 
        title: "Error", 
        description: "No rent log found for this trip", 
        variant: "destructive" 
      });
    }
  };

  const handleDeleteSubstitute = (substituteId: number, substituteName: string) => {
    if (window.confirm(`Are you sure you want to delete the substitute driver ${substituteName}?`)) {
      deleteSubstituteMutation.mutate(substituteId);
    }
  };

  const clearFilters = () => {
    setStartDateFilter("");
    setEndDateFilter("");
    setVehicleFilter("");
    setDriverFilter("");
    setRentFilter("all");
  };

  if (tripsLoading || substitutesLoading || allRentLogsLoading) {
    return (
      <div className="container mx-auto p-4">
        <div className="text-center">Loading trip logs...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Trip Logs</h1>
        <div className="flex items-center gap-2">
          <Button 
            onClick={() => setTripLogModalOpen(true)}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Trip Log
          </Button>
          <Button 
            variant="outline"
            onClick={() => setSubstituteModalOpen(true)}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Substitute
          </Button>
          <Button 
            variant="outline" 
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2"
          >
            <Filter className="h-4 w-4" />
            {showFilters ? "Hide Filters" : "Show Filters"}
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Total Trips</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totals.totalTrips}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Today's Trips</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totals.todayTrips}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Today's Rent Paid</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{totals.todayRentPaid}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Total Rent Paid</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{totals.totalRentPaid}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      {showFilters && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Filters</span>
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="h-4 w-4 mr-1" />
                Clear All
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Quick Date Presets */}
            <div className="flex flex-wrap gap-2 mb-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setStartDateFilter("2025-06-30");
                  setEndDateFilter("2025-07-03");
                }}
              >
                Jun 30 - Jul 3 (Your Test)
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setStartDateFilter("2025-07-05");
                  setEndDateFilter("");
                }}
              >
                From Jul 5 Onwards
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setStartDateFilter("2025-07-04");
                  setEndDateFilter("");
                }}
              >
                From Jul 4 Onwards
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const today = new Date().toISOString().split('T')[0];
                  setStartDateFilter(today);
                  setEndDateFilter(today);
                }}
              >
                Today Only
              </Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div>
                <label className="text-sm font-medium">Start Date</label>
                <Input
                  type="date"
                  value={startDateFilter}
                  onChange={(e) => setStartDateFilter(e.target.value)}
                  placeholder="From date"
                />
              </div>
              <div>
                <label className="text-sm font-medium">End Date</label>
                <Input
                  type="date"
                  value={endDateFilter}
                  onChange={(e) => setEndDateFilter(e.target.value)}
                  placeholder="To date"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Vehicle</label>
                <Input
                  value={vehicleFilter}
                  onChange={(e) => setVehicleFilter(e.target.value)}
                  placeholder="Filter by vehicle"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Driver</label>
                <Input
                  value={driverFilter}
                  onChange={(e) => setDriverFilter(e.target.value)}
                  placeholder="Filter by driver"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Rent Status</label>
                <Select value={rentFilter} onValueChange={setRentFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="unpaid">Unpaid</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Trip Logs Table */}
      <Card className="shadow-sm">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
          <CardTitle className="text-lg font-semibold text-gray-800">
            Trip Logs ({filteredLogs.length} records)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b-2 border-gray-200">
                  <th className="text-left p-4 font-semibold text-gray-700">Date</th>
                  <th className="text-left p-4 font-semibold text-gray-700">Vehicle</th>
                  <th className="text-left p-4 font-semibold text-gray-700">Driver</th>
                  <th className="text-left p-4 font-semibold text-gray-700">Shift</th>
                  <th className="text-left p-4 font-semibold text-gray-700">Trips</th>
                  <th className="text-left p-4 font-semibold text-gray-700">Type</th>
                  <th className="text-left p-4 font-semibold text-gray-700">Rent</th>
                  <th className="text-left p-4 font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((log) => {
                  const rentStatus = getRentStatus(log);
                  return (
                    <tr key={`${log.isSubstitute ? 'sub' : 'trip'}-${log.id}`} className="border-b border-gray-100 hover:bg-blue-50 transition-colors">
                      <td className="p-4 text-gray-700">
                        {format(new Date(log.tripDate), "MMM dd, yyyy")}
                      </td>
                      <td className="p-4 font-medium text-gray-800">{log.vehicleNumber}</td>
                      <td className="p-4 text-gray-700">{log.driverName}</td>
                      <td className="p-4">
                        <Badge variant={log.shift === "morning" ? "default" : "secondary"} className="font-medium">
                          {log.shift === "morning" ? "Morning" : "Evening"}
                        </Badge>
                      </td>
                      <td className="p-4 font-semibold text-blue-600">{log.tripCount}</td>
                      <td className="p-4">
                        <Badge 
                          variant={log.isSubstitute ? "outline" : "default"} 
                          className={log.isSubstitute ? "border-orange-200 text-orange-700 bg-orange-50" : "bg-blue-100 text-blue-800 border-blue-200"}
                        >
                          {log.isSubstitute ? "Substitute" : "Regular"}
                        </Badge>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-green-600">₹{rentStatus.amount}</span>
                          {rentStatus.status === "unpaid" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handlePayRent(log)}
                              className="text-xs bg-red-50 border-red-200 text-red-700 hover:bg-red-100 font-medium"
                            >
                              Mark Paid
                            </Button>
                          )}
                          {rentStatus.status === "paid" && (
                            <Badge className="text-xs bg-green-100 text-green-800 border-green-200 font-medium">
                              Paid ✓
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex gap-2">
                          {!log.isSubstitute && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleEditTrip(log)}
                                className="hover:bg-blue-50 border-blue-200 text-blue-600"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleDeleteTrip(log.id, log.driverName, log.vehicleNumber)}
                                className="hover:bg-red-50 border-red-200 text-red-600"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          {log.isSubstitute && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDeleteSubstitute(log.id, log.driverName)}
                              className="hover:bg-red-50 border-red-200 text-red-600"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <EditTripModal
        trip={editTrip}
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
      />

      <TripLogModal
        open={tripLogModalOpen}
        onOpenChange={setTripLogModalOpen}
      />

      <SubstituteDriverForm
        open={substituteModalOpen}
        onOpenChange={setSubstituteModalOpen}
        vehicles={vehicles}
      />
    </div>
  );
}