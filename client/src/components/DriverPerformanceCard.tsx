import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { User } from "lucide-react";

interface DriverPerformanceCardProps {
  vehicleId: number;
}

export default function DriverPerformanceCard({ vehicleId }: DriverPerformanceCardProps) {
  const { data: vehicleSummary, isLoading } = useQuery({
    queryKey: ["/api/vehicles", vehicleId, "weekly-summary"],
    queryFn: () => api.getVehicleSummary(vehicleId),
    enabled: !!vehicleId,
  });

  if (isLoading) {
    return <div className="animate-pulse h-96 bg-gray-200 rounded-xl"></div>;
  }

  if (!vehicleSummary) {
    return null;
  }

  return (
    <Card className="rounded-xl shadow-sm border border-gray-200" data-testid="card-driver-info">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-gray-900">Driver Information</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {vehicleSummary.morningDriver && (
          <div className="border border-gray-200 rounded-lg p-4" data-testid="driver-morning">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <User className="text-blue-600 w-5 h-5" />
              </div>
              <div>
                <h4 className="font-semibold text-gray-900">{vehicleSummary.morningDriver.name}</h4>
                <p className="text-sm text-gray-500">Morning Shift (6 AM - 2 PM)</p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500 uppercase tracking-wide">Accommodation</p>
                <p className="text-sm font-semibold text-gray-900">
                  {vehicleSummary.morningDriver.hasAccommodation ? "Yes - ₹600/day" : "No - ₹500/day"}
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500 uppercase tracking-wide">Weekly Due</p>
                <p className="text-sm font-semibold text-gray-900">
                  ₹{((vehicleSummary.morningDriver.hasAccommodation ? 600 : 500) * 7).toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        )}

        {vehicleSummary.eveningDriver && (
          <div className="border border-gray-200 rounded-lg p-4" data-testid="driver-evening">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                <User className="text-purple-600 w-5 h-5" />
              </div>
              <div>
                <h4 className="font-semibold text-gray-900">{vehicleSummary.eveningDriver.name}</h4>
                <p className="text-sm text-gray-500">Evening Shift (2 PM - 10 PM)</p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500 uppercase tracking-wide">Accommodation</p>
                <p className="text-sm font-semibold text-gray-900">
                  {vehicleSummary.eveningDriver.hasAccommodation ? "Yes - ₹600/day" : "No - ₹500/day"}
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500 uppercase tracking-wide">Weekly Due</p>
                <p className="text-sm font-semibold text-gray-900">
                  ₹{((vehicleSummary.eveningDriver.hasAccommodation ? 600 : 500) * 7).toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        )}

        {!vehicleSummary.morningDriver && !vehicleSummary.eveningDriver && (
          <div className="text-center py-8 text-gray-500" data-testid="no-drivers">
            <User className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>No drivers assigned to this vehicle</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
