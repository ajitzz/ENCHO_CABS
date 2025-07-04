import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { User, Check, Clock, X, Minus } from "lucide-react";

interface DriverPerformanceCardProps {
  vehicleId: number;
}

// Helper function to determine driver performance status
function getDriverPerformanceStatus(tripCount: number) {
  if (tripCount < 10) return { label: "Low", color: "bg-red-100 text-red-800", emoji: "🔴" };
  if (tripCount === 10) return { label: "Good", color: "bg-yellow-100 text-yellow-800", emoji: "🟡" };
  return { label: "Excellent", color: "bg-green-100 text-green-800", emoji: "🟢" };
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

  const renderPaymentStatus = (daysData: boolean[]) => {
    const statusIcons = {
      paid: Check,
      pending: Clock,
      overdue: X,
      notDue: Minus,
    };

    return (
      <div className="grid grid-cols-7 gap-1">
        {daysData.map((paid, index) => {
          const Icon = paid ? statusIcons.paid : 
                     index < 5 ? statusIcons.pending : 
                     index === 5 ? statusIcons.overdue : 
                     statusIcons.notDue;
          
          const bgColor = paid ? "bg-emerald-500 hover:bg-emerald-600" : 
                         index < 5 ? "bg-emerald-500 hover:bg-emerald-600" : 
                         index === 5 ? "bg-red-500 hover:bg-red-600" : 
                         "bg-gray-300 hover:bg-gray-400";

          return (
            <Button
              key={index}
              size="sm"
              className={`w-8 h-8 rounded p-0 ${bgColor} text-white transition-colors`}
              title={`Day ${index + 1} - ${paid ? 'Paid' : 'Pending'}`}
            >
              <Icon className="w-3 h-3" />
            </Button>
          );
        })}
      </div>
    );
  };

  return (
    <Card className="rounded-xl shadow-sm border border-gray-200">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-gray-900">Driver Performance</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Morning Driver */}
        {vehicleSummary.morningDriver && (
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <User className="text-blue-600 w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">{vehicleSummary.morningDriver.name}</h4>
                  <p className="text-sm text-gray-500">Morning Shift (6 AM - 2 PM)</p>
                </div>
              </div>
              <div className="text-right">
                <div className="flex items-center justify-end space-x-2 mb-1">
                  <Badge className={getDriverPerformanceStatus(vehicleSummary.totalTrips).color}>
                    {getDriverPerformanceStatus(vehicleSummary.totalTrips).emoji} {getDriverPerformanceStatus(vehicleSummary.totalTrips).label}
                  </Badge>
                </div>
                <p className="text-lg font-bold text-gray-900">{vehicleSummary.totalTrips} trips</p>
                <p className="text-sm text-gray-500">This Week</p>
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
            
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Payment Status</span>
                <span className="text-xs text-gray-500">Last 7 Days</span>
              </div>
              {renderPaymentStatus([true, true, true, true, false, false, false])}
            </div>
          </div>
        )}

        {/* Evening Driver */}
        {vehicleSummary.eveningDriver && (
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                  <User className="text-purple-600 w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">{vehicleSummary.eveningDriver.name}</h4>
                  <p className="text-sm text-gray-500">Evening Shift (2 PM - 10 PM)</p>
                </div>
              </div>
              <div className="text-right">
                <div className="flex items-center justify-end space-x-2 mb-1">
                  <Badge className={getDriverPerformanceStatus(vehicleSummary.totalTrips).color}>
                    {getDriverPerformanceStatus(vehicleSummary.totalTrips).emoji} {getDriverPerformanceStatus(vehicleSummary.totalTrips).label}
                  </Badge>
                </div>
                <p className="text-lg font-bold text-gray-900">{vehicleSummary.totalTrips} trips</p>
                <p className="text-sm text-gray-500">This Week</p>
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
            
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Payment Status</span>
                <span className="text-xs text-gray-500">Last 7 Days</span>
              </div>
              {renderPaymentStatus([true, true, false, true, true, false, false])}
            </div>
          </div>
        )}

        {!vehicleSummary.morningDriver && !vehicleSummary.eveningDriver && (
          <div className="text-center py-8 text-gray-500">
            <User className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>No drivers assigned to this vehicle</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
