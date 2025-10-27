import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { api, type Vehicle, type VehicleSummary } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { RefreshCw, Route, Building, TrendingUp, Lightbulb } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface VehicleSelectorProps {
  selectedVehicleId: number | null;
  onVehicleSelect: (vehicleId: number | null) => void;
}

export default function VehicleSelector({ selectedVehicleId, onVehicleSelect }: VehicleSelectorProps) {
  const { data: vehicles, isLoading: vehiclesLoading } = useQuery({
    queryKey: ["/api/vehicles"],
    queryFn: () => api.getVehicles(),
    enabled: true,
  });

  const { data: vehicleSummary, isLoading: summaryLoading, refetch } = useQuery({
    queryKey: ["/api/vehicles", selectedVehicleId, "weekly-summary"],
    queryFn: () => selectedVehicleId ? api.getVehicleSummary(selectedVehicleId) : null,
    enabled: !!selectedVehicleId,
  });

  const handleVehicleChange = (value: string) => {
    const vehicleId = value ? parseInt(value) : null;
    onVehicleSelect(vehicleId);
  };

  // Filter active vehicles (not dropped)
  const activeVehicles = useMemo(() => {
    if (!vehicles || !Array.isArray(vehicles)) return [];
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return vehicles.filter((vehicle: Vehicle) => {
      if (!vehicle.droppedDate) return true;
      
      const droppedDate = new Date(vehicle.droppedDate);
      droppedDate.setHours(0, 0, 0, 0);
      
      return droppedDate > today;
    });
  }, [vehicles]);

  if (vehiclesLoading) {
    return <div className="mb-6 animate-pulse h-48 bg-gray-200 rounded-xl"></div>;
  }

  return (
    <div className="mb-6">
      <Card className="rounded-xl shadow-sm border border-gray-200">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Vehicle Performance</h3>
            <div className="flex items-center space-x-4">
              <Select value={selectedVehicleId?.toString() || ""} onValueChange={handleVehicleChange}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Select Vehicle" />
                </SelectTrigger>
                <SelectContent>
                  {activeVehicles.map((vehicle: Vehicle) => (
                    <SelectItem key={vehicle.id} value={vehicle.id.toString()}>
                      {vehicle.vehicleNumber} ({vehicle.company})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => refetch()}
                disabled={summaryLoading}
              >
                <RefreshCw className={`w-4 h-4 ${summaryLoading ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </div>

          {selectedVehicleId && vehicleSummary && (
            <>
              {/* Quick Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="fleet-gradient-blue rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-blue-600 text-xs font-medium uppercase tracking-wide">Total Trips</p>
                      <p className="text-2xl font-bold text-blue-900">{vehicleSummary.totalTrips}</p>
                      <p className="text-xs text-blue-600">This Week</p>
                    </div>
                    <Route className="text-blue-400 text-xl" />
                  </div>
                </div>

                <div className="fleet-gradient-amber rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-amber-600 text-xs font-medium uppercase tracking-wide">Rental Rate</p>
                      <p className="text-2xl font-bold text-amber-900">₹{vehicleSummary.rentalRate}</p>
                      <p className="text-xs text-amber-600">Per Day</p>
                    </div>
                    <Building className="text-amber-400 text-xl" />
                  </div>
                </div>

                <div className="fleet-gradient-red rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-red-600 text-xs font-medium uppercase tracking-wide">Company Rent</p>
                      <p className="text-2xl font-bold text-red-900">₹{vehicleSummary.totalRentToCompany.toLocaleString()}</p>
                      <p className="text-xs text-red-600">This Week</p>
                    </div>
                    <Building className="text-red-400 text-xl" />
                  </div>
                </div>

                <div className={`${vehicleSummary.profit >= 0 ? 'fleet-gradient-emerald' : 'fleet-gradient-red'} rounded-lg p-4`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className={`${vehicleSummary.profit >= 0 ? 'text-emerald-600' : 'text-red-600'} text-xs font-medium uppercase tracking-wide`}>
                        Weekly {vehicleSummary.profit >= 0 ? 'Profit' : 'Loss'}
                      </p>
                      <p className={`text-2xl font-bold ${vehicleSummary.profit >= 0 ? 'text-emerald-900' : 'text-red-900'}`}>
                        ₹{Math.abs(vehicleSummary.profit).toLocaleString()}
                      </p>
                      <p className={`text-xs ${vehicleSummary.profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        Net {vehicleSummary.profit >= 0 ? 'Income' : 'Loss'}
                      </p>
                    </div>
                    <TrendingUp className={`${vehicleSummary.profit >= 0 ? 'text-emerald-400' : 'text-red-400'} text-xl`} />
                  </div>
                </div>
              </div>

              {/* Optimization Tip */}
              {vehicleSummary.rentalInfo.nextBetterSlab && (
                <Alert className="bg-yellow-50 border-yellow-200">
                  <Lightbulb className="h-4 w-4 text-yellow-500" />
                  <AlertDescription className="text-yellow-800">
                    <span className="font-medium">Optimization Tip:</span>{" "}
                    {vehicleSummary.rentalInfo.nextBetterSlab.tripsNeeded} more trips needed to reach the ₹{vehicleSummary.rentalInfo.nextBetterSlab.rate}/day rental slab. 
                    Current: {vehicleSummary.totalTrips} trips, Target: {vehicleSummary.totalTrips + vehicleSummary.rentalInfo.nextBetterSlab.tripsNeeded} trips.
                  </AlertDescription>
                </Alert>
              )}
            </>
          )}

          {selectedVehicleId && !vehicleSummary && !summaryLoading && (
            <div className="text-center py-8 text-gray-500">
              <Route className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No data available for this vehicle</p>
            </div>
          )}

          {!selectedVehicleId && (
            <div className="text-center py-8 text-gray-500">
              <Route className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>Select a vehicle to view performance data</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
