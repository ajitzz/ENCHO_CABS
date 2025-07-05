import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { Trash2, Edit, Filter, X, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import EditTripModal from "@/components/EditTripModal";

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
  
  // Filter states
  const [dateFilter, setDateFilter] = useState("");
  const [vehicleFilter, setVehicleFilter] = useState("");
  const [driverFilter, setDriverFilter] = useState("");
  const [rentFilter, setRentFilter] = useState("");
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

  const { data: rentLogs = [], isLoading: rentLogsLoading } = useQuery({
    queryKey: ["/api/driver-rent-logs/unpaid"],
    queryFn: () => api.getUnpaidDriverRents(),
  });

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
      tripCount: sub.shiftHours, // Use shift hours as trip count for substitutes
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
    return allLogs.filter(log => {
      const matchesDate = !dateFilter || log.tripDate.includes(dateFilter);
      const matchesVehicle = !vehicleFilter || log.vehicleNumber.toLowerCase().includes(vehicleFilter.toLowerCase());
      const matchesDriver = !driverFilter || log.driverName.toLowerCase().includes(driverFilter.toLowerCase());
      const matchesRent = !rentFilter || (rentFilter === "paid" && log.isSubstitute) || (rentFilter === "unpaid" && !log.isSubstitute);
      
      return matchesDate && matchesVehicle && matchesDriver && matchesRent;
    });
  }, [allLogs, dateFilter, vehicleFilter, driverFilter, rentFilter]);

  // Calculate totals for filtered data
  const totals = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const todayLogs = filteredLogs.filter(log => log.tripDate.startsWith(today));
    
    return {
      totalTrips: filteredLogs.reduce((sum, log) => sum + log.tripCount, 0),
      todayTrips: todayLogs.reduce((sum, log) => sum + log.tripCount, 0),
      todayRentPaid: todayLogs.filter(log => log.isSubstitute).reduce((sum, log) => sum + (log.charge || 0), 0)
    };
  }, [filteredLogs]);

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
      toast({ title: "Rent marked as paid", variant: "default" });
    },
    onError: (error) => {
      toast({ title: "Failed to update rent status", description: error.message, variant: "destructive" });
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

  const handlePayRent = (rentLogId: number) => {
    payRentMutation.mutate(rentLogId);
  };

  const clearFilters = () => {
    setDateFilter("");
    setVehicleFilter("");
    setDriverFilter("");
    setRentFilter("");
  };

  const getRentStatus = (log: TripLog) => {
    if (log.isSubstitute) {
      return { status: "unpaid", amount: log.charge || 0 };
    }
    
    const rentLog = rentLogs.find(rent => 
      rent.driverId === log.driverId && 
      rent.date.startsWith(log.tripDate.split('T')[0])
    );
    
    if (rentLog) {
      return { status: rentLog.paid ? "paid" : "unpaid", amount: rentLog.rent };
    }
    
    return { status: "unknown", amount: 0 };
  };

  if (tripsLoading || substitutesLoading || rentLogsLoading) {
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
        <Button 
          variant="outline" 
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2"
        >
          <Filter className="h-4 w-4" />
          {showFilters ? "Hide Filters" : "Show Filters"}
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="text-sm font-medium">Date</label>
                <Input
                  type="date"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  placeholder="Filter by date"
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
                    <SelectItem value="">All</SelectItem>
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
      <Card>
        <CardHeader>
          <CardTitle>Trip Logs ({filteredLogs.length} records)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Date</th>
                  <th className="text-left p-2">Vehicle</th>
                  <th className="text-left p-2">Driver</th>
                  <th className="text-left p-2">Shift</th>
                  <th className="text-left p-2">Trips</th>
                  <th className="text-left p-2">Type</th>
                  <th className="text-left p-2">Rent</th>
                  <th className="text-left p-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((log) => {
                  const rentStatus = getRentStatus(log);
                  return (
                    <tr key={`${log.isSubstitute ? 'sub' : 'trip'}-${log.id}`} className="border-b hover:bg-gray-50">
                      <td className="p-2">
                        {format(new Date(log.tripDate), "MMM dd, yyyy")}
                      </td>
                      <td className="p-2">{log.vehicleNumber}</td>
                      <td className="p-2">{log.driverName}</td>
                      <td className="p-2">
                        <Badge variant={log.shift === "morning" ? "default" : "secondary"}>
                          {log.shift}
                        </Badge>
                      </td>
                      <td className="p-2">{log.tripCount}</td>
                      <td className="p-2">
                        <Badge variant={log.isSubstitute ? "outline" : "default"}>
                          {log.isSubstitute ? "Substitute" : "Regular"}
                        </Badge>
                      </td>
                      <td className="p-2">
                        <div className="flex items-center gap-2">
                          <span>₹{rentStatus.amount}</span>
                          {rentStatus.status === "unpaid" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handlePayRent(log.id)}
                              className="text-xs"
                            >
                              Mark Paid
                            </Button>
                          )}
                          {rentStatus.status === "paid" && (
                            <Badge variant="default" className="text-xs">
                              Paid
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="p-2">
                        <div className="flex gap-2">
                          {!log.isSubstitute && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleEditTrip(log)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleDeleteTrip(log.id, log.driverName, log.vehicleNumber)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
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
    </div>
  );
}