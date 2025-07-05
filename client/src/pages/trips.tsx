import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Calendar, Users, Car, Clock, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { api, type RecentTrip } from "@/lib/api";
import TripLogModal from "@/components/TripLogModal";
import EditTripModal from "@/components/EditTripModal";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";

export default function Trips() {
  const [isTripLogModalOpen, setIsTripLogModalOpen] = useState(false);
  const [editTrip, setEditTrip] = useState<any>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: trips, isLoading } = useQuery({
    queryKey: ["/api/trips/recent/50"],
    queryFn: () => api.getRecentTrips(50),
  });

  const { data: unpaidRents } = useQuery({
    queryKey: ["/api/driver-rent-logs/unpaid"],
    queryFn: () => api.getUnpaidRents(),
  });

  const deleteTripMutation = useMutation({
    mutationFn: (tripId: number) => api.deleteTrip(tripId),
    onSuccess: () => {
      // Invalidate all related queries for complete responsiveness
      queryClient.invalidateQueries({ queryKey: ["/api/trips/recent/50"] });
      queryClient.invalidateQueries({ queryKey: ["/api/trips/recent/10"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/profit-graph"] });
      queryClient.invalidateQueries({ queryKey: ["/api/settlements"] });
      queryClient.invalidateQueries({ queryKey: ["/api/driver-rent-logs/unpaid"] });
      queryClient.invalidateQueries({ queryKey: ["/api/vehicles"] });
      // Invalidate all vehicle summaries
      queryClient.invalidateQueries({ 
        predicate: (query) => query.queryKey[0] === "/api/vehicles" && query.queryKey[2] === "weekly-summary"
      });
      toast({ title: "Trip deleted successfully - rent logs updated", variant: "default" });
    },
    onError: (error) => {
      toast({ title: "Failed to delete trip", description: error.message, variant: "destructive" });
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

  const markAsPaidMutation = useMutation({
    mutationFn: (id: number) => api.updateRentStatus(id, true),
    onSuccess: () => {
      // Invalidate all related queries for complete responsiveness
      queryClient.invalidateQueries({ queryKey: ["/api/driver-rent-logs/unpaid"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/profit-graph"] });
      queryClient.invalidateQueries({ queryKey: ["/api/settlements"] });
      queryClient.invalidateQueries({ queryKey: ["/api/vehicles"] });
      // Invalidate all vehicle summaries for precise profit calculations
      queryClient.invalidateQueries({ 
        predicate: (query) => query.queryKey[0] === "/api/vehicles" && query.queryKey[2] === "weekly-summary"
      });
      toast({
        title: "Success",
        description: "Rent marked as paid - calculations updated",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update rent status",
        variant: "destructive",
      });
    },
  });

  // Helper function to find if a trip has unpaid rent
  const getTripRentStatus = (trip: any) => {
    return unpaidRents?.find(rent => 
      rent.driverId === trip.driverId && 
      rent.date === trip.tripDate
    );
  };

  if (isLoading) {
    return (
      <div className="flex-1 p-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-48 mb-6"></div>
          <div className="h-96 bg-gray-200 rounded-lg"></div>
        </div>
      </div>
    );
  }

  const totalTrips = trips?.reduce((sum, trip) => sum + trip.tripCount, 0) || 0;
  const todayTrips = trips?.filter(trip => 
    format(new Date(trip.tripDate), 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')
  ) || [];
  const todayTripCount = todayTrips.reduce((sum, trip) => sum + trip.tripCount, 0);

  return (
    <div className="flex-1 p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Trip Logs</h1>
          <p className="text-gray-600 mt-1">Track daily trip counts and performance</p>
        </div>
        <Button onClick={() => setIsTripLogModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Trip Log
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-500">Total Trips</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{totalTrips}</div>
            <div className="text-sm text-gray-600">All time</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-500">Today's Trips</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{todayTripCount}</div>
            <div className="text-sm text-gray-600">{todayTrips.length} entries</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-500">Recent Entries</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{trips?.length || 0}</div>
            <div className="text-sm text-gray-600">Last 50 records</div>
          </CardContent>
        </Card>
      </div>

      {/* Trips Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Trip Logs</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Vehicle</TableHead>
                <TableHead>Driver</TableHead>
                <TableHead>Shift</TableHead>
                <TableHead>Trip Count</TableHead>
                <TableHead>Rent</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {trips?.map((trip: RecentTrip) => (
                <TableRow key={trip.id}>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <span>{format(new Date(trip.tripDate), 'MMM dd, yyyy')}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Car className="w-4 h-4 text-gray-400" />
                      <span>{trip.vehicleNumber}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Users className="w-4 h-4 text-gray-400" />
                      <span>{trip.driverName}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Clock className="w-4 h-4 text-gray-400" />
                      <Badge variant={trip.shift === "morning" ? "default" : "secondary"}>
                        {trip.shift}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-semibold text-lg">
                      {trip.tripCount}
                    </div>
                  </TableCell>
                  <TableCell>
                    {(() => {
                      const rentLog = getTripRentStatus(trip);
                      return rentLog ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 border-red-200"
                          onClick={() => markAsPaidMutation.mutate(rentLog.id)}
                          disabled={markAsPaidMutation.isPending}
                        >
                          Unpaid (₹{rentLog.rent})
                        </Button>
                      ) : (
                        <Badge variant="secondary" className="bg-green-50 text-green-700">
                          Paid
                        </Badge>
                      );
                    })()}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleEditTrip(trip)}
                        className="h-8 w-8 p-0 hover:bg-blue-50 hover:text-blue-600"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleDeleteTrip(trip.id, trip.driverName, trip.vehicleNumber)}
                        disabled={deleteTripMutation.isPending}
                        className="h-8 w-8 p-0 hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          
          {trips?.length === 0 && (
            <div className="text-center py-12">
              <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No trip logs yet</h3>
              <p className="text-gray-600 mb-4">Add your first trip log to get started</p>
              <Button onClick={() => setIsTripLogModalOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Trip Log
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <TripLogModal
        open={isTripLogModalOpen}
        onOpenChange={setIsTripLogModalOpen}
      />
      
      {/* Edit Trip Modal */}
      <EditTripModal 
        trip={editTrip}
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
      />
    </div>
  );
}