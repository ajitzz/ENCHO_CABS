import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Clock, User, Calendar, IndianRupee } from "lucide-react";

interface SubstituteDriver {
  id: number;
  name: string;
  vehicleId: number;
  date: string;
  shift: string;
  shiftHours: number;
  charge: number;
  createdAt: string;
  updatedAt: string;
}

interface SubstituteDriverWithVehicle extends SubstituteDriver {
  vehicleNumber: string;
}

interface SubstituteDriverListProps {
  vehicleId?: number | null;
  weekStart?: Date;
  weekEnd?: Date;
}

export default function SubstituteDriverList({ vehicleId, weekStart, weekEnd }: SubstituteDriverListProps) {
  const { data: substituteDrivers, isLoading } = useQuery({
    queryKey: ["/api/substitute-drivers", vehicleId, weekStart, weekEnd],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (vehicleId) params.append("vehicleId", vehicleId.toString());
      if (weekStart) params.append("weekStart", weekStart.toISOString());
      if (weekEnd) params.append("weekEnd", weekEnd.toISOString());
      
      const response = await fetch(`/api/substitute-drivers?${params}`);
      if (!response.ok) throw new Error("Failed to fetch substitute drivers");
      return response.json();
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Substitute Drivers
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-16 bg-gray-200 rounded-md"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const totalCost = substituteDrivers?.reduce((sum: number, driver: SubstituteDriverWithVehicle) => sum + driver.charge, 0) || 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Substitute Drivers
          </div>
          {totalCost > 0 && (
            <Badge variant="secondary" className="flex items-center gap-1">
              <IndianRupee className="w-3 h-3" />
              {totalCost}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!substituteDrivers || substituteDrivers.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <User className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No substitute drivers found</p>
            <p className="text-sm">Add a substitute driver when regular drivers take leave</p>
          </div>
        ) : (
          <div className="space-y-3">
            {substituteDrivers.map((driver: SubstituteDriverWithVehicle) => (
              <div
                key={driver.id}
                className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">{driver.name}</h4>
                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {format(new Date(driver.date), "MMM dd, yyyy")}
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {driver.shiftHours} hours
                      </div>
                      {!vehicleId && (
                        <div className="text-blue-600 font-medium">
                          {driver.vehicleNumber}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-green-600 flex items-center gap-1">
                      <IndianRupee className="w-4 h-4" />
                      {driver.charge}
                    </div>
                    <div className="text-xs text-gray-500">
                      {driver.shiftHours === 6 && "6-hour rate"}
                      {driver.shiftHours === 8 && "8-hour rate"}
                      {driver.shiftHours === 12 && "12-hour rate"}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            
            {substituteDrivers.length > 1 && (
              <div className="border-t pt-3 mt-4">
                <div className="flex items-center justify-between text-sm font-medium">
                  <span>Total Substitute Cost:</span>
                  <span className="flex items-center gap-1 text-green-600">
                    <IndianRupee className="w-4 h-4" />
                    {totalCost}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}