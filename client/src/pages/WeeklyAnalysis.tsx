import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { WeeklyDashboard } from "@/components/WeeklyDashboard";
import { Loader2 } from "lucide-react";

interface Vehicle {
  id: number;
  vehicleNumber: string;
  company: string;
}

export default function WeeklyAnalysis() {
  const [selectedVehicleId, setSelectedVehicleId] = useState<number | null>(null);

  const { data: vehicles, isLoading: vehiclesLoading } = useQuery<Vehicle[]>({
    queryKey: ['/api/vehicles'],
  });

  const selectedVehicle = vehicles?.find(v => v.id === selectedVehicleId);

  if (vehiclesLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading vehicles...</span>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-3xl font-bold">Weekly Analysis</h1>
          <p className="text-gray-600">
            Comprehensive weekly breakdown of trips, rent, and profits (Sunday to Saturday)
          </p>
        </div>

        {/* Vehicle Selector */}
        <Card>
          <CardHeader>
            <CardTitle>Select Vehicle</CardTitle>
          </CardHeader>
          <CardContent>
            <Select 
              value={selectedVehicleId?.toString() || ""} 
              onValueChange={(value) => setSelectedVehicleId(Number(value))}
            >
              <SelectTrigger className="w-full max-w-md">
                <SelectValue placeholder="Choose a vehicle to analyze" />
              </SelectTrigger>
              <SelectContent>
                {vehicles?.map((vehicle) => (
                  <SelectItem key={vehicle.id} value={vehicle.id.toString()}>
                    {vehicle.vehicleNumber} ({vehicle.company})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Weekly Dashboard */}
        {selectedVehicle && (
          <WeeklyDashboard 
            vehicleId={selectedVehicle.id} 
            vehicleNumber={selectedVehicle.vehicleNumber}
          />
        )}

        {!selectedVehicle && (
          <Card>
            <CardContent className="py-12">
              <div className="text-center text-gray-500">
                <div className="text-6xl mb-4">📊</div>
                <h3 className="text-lg font-medium mb-2">Select a Vehicle</h3>
                <p>Choose a vehicle from the dropdown above to view its weekly analysis</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}