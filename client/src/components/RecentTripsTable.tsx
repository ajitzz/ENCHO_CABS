import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function RecentTripsTable() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: recentTrips, isLoading } = useQuery({
    queryKey: ["/api/trips/recent/10"],
    queryFn: () => api.getRecentTrips(10),
  });

  const deleteTripMutation = useMutation({
    mutationFn: (tripId: number) => api.deleteTrip(tripId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trips/recent/10"] });
      queryClient.invalidateQueries({ queryKey: ["/api/trips/recent/50"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/profit-graph"] });
      queryClient.invalidateQueries({ queryKey: ["/api/settlements"] });
      toast({ title: "Trip deleted successfully", variant: "default" });
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

  if (isLoading) {
    return <div className="animate-pulse h-80 bg-gray-200 rounded-xl"></div>;
  }

  return (
    <Card className="rounded-xl shadow-sm border border-gray-200">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-gray-900">Recent Trip Logs</CardTitle>
          <Button variant="ghost" size="sm" className="text-primary hover:text-blue-700">
            View All
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {recentTrips && recentTrips.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 text-gray-500 font-medium">Date</th>
                  <th className="text-left py-2 text-gray-500 font-medium">Driver</th>
                  <th className="text-left py-2 text-gray-500 font-medium">Vehicle</th>
                  <th className="text-center py-2 text-gray-500 font-medium">Trips</th>
                  <th className="text-center py-2 text-gray-500 font-medium">Shift</th>
                  <th className="text-center py-2 text-gray-500 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {recentTrips.slice(0, 4).map((trip) => (
                  <tr key={trip.id} className="border-b border-gray-100">
                    <td className="py-3 text-gray-900">
                      {format(new Date(trip.tripDate), "MMM dd")}
                    </td>
                    <td className="py-3 text-gray-900">{trip.driverName}</td>
                    <td className="py-3 text-gray-600">{trip.vehicleNumber}</td>
                    <td className="py-3 text-center font-semibold text-gray-900">{trip.tripCount}</td>
                    <td className="py-3 text-center">
                      <Badge 
                        variant="secondary" 
                        className={trip.shift === "morning" ? "bg-blue-100 text-blue-800" : "bg-purple-100 text-purple-800"}
                      >
                        {trip.shift === "morning" ? "Morning" : "Evening"}
                      </Badge>
                    </td>
                    <td className="py-3 text-center">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleDeleteTrip(trip.id, trip.driverName, trip.vehicleNumber)}
                        disabled={deleteTripMutation.isPending}
                        className="h-8 w-8 p-0 hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <p>No recent trips found</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
