import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLocation } from "wouter";
import { format } from "date-fns";

export default function UnpaidRentsPanel() {
  const [, setLocation] = useLocation();

  const { data: rentLogs, isLoading } = useQuery({
    queryKey: ["/api/driver-rent-logs"],
    queryFn: () => api.getAllRentLogs(),
  });

  if (isLoading) {
    return <div className="animate-pulse h-96 bg-gray-200 rounded-xl"></div>;
  }

  const recentLogs = rentLogs?.slice(0, 5) || [];
  const totalRent = recentLogs.reduce((sum, log) => sum + log.rent, 0);
  const totalCollection = recentLogs.reduce((sum, log) => sum + log.amountCollected, 0);
  const totalFuel = recentLogs.reduce((sum, log) => sum + log.fuel, 0);

  return (
    <Card className="rounded-xl shadow-sm border border-gray-200" data-testid="card-recent-records">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-gray-900">Recent Records</CardTitle>
          <Badge variant="secondary" className="bg-blue-100 text-blue-800">
            {recentLogs.length} entries
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {recentLogs.length > 0 ? (
            <>
              {recentLogs.map((log) => {
                const logDate = new Date(log.date);
                
                return (
                  <div 
                    key={log.id} 
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    data-testid={`record-${log.id}`}
                  >
                    <div>
                      <p className="font-medium text-gray-900">{log.driverName}</p>
                      <p className="text-xs text-gray-500">
                        {log.vehicleNumber} • {log.shift === 'morning' ? 'Morning' : 'Evening'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {format(logDate, 'MMM dd, yyyy')}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-green-600">₹{log.rent}</p>
                      <p className="text-xs text-gray-500">
                        <span className="text-blue-600">₹{log.amountCollected}</span> collected
                      </p>
                      <p className="text-xs text-gray-500">
                        <span className="text-orange-600">₹{log.fuel}</span> fuel
                      </p>
                    </div>
                  </div>
                );
              })}
              
              <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-gray-200">
                <div className="text-center">
                  <p className="text-xs text-gray-500">Total Rent</p>
                  <p className="font-bold text-green-600">₹{totalRent}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-500">Collection</p>
                  <p className="font-bold text-blue-600">₹{totalCollection}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-500">Fuel</p>
                  <p className="font-bold text-orange-600">₹{totalFuel}</p>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p>No records available</p>
            </div>
          )}
        </div>

        {rentLogs && rentLogs.length > 5 && (
          <Button 
            variant="outline" 
            className="w-full mt-4 text-sm"
            onClick={() => setLocation("/rent-tracking")}
            data-testid="button-view-all"
          >
            View All Records ({rentLogs.length})
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
