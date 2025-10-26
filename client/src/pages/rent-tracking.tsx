import { useQuery } from "@tanstack/react-query";
import { DollarSign, Calendar, Users, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";

export default function RentTracking() {
  const { data: rentLogs, isLoading } = useQuery({
    queryKey: ["/api/driver-rent-logs"],
    queryFn: () => api.getAllRentLogs(),
  });

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

  const totalRent = rentLogs?.reduce((sum, log) => sum + log.rent, 0) || 0;
  const totalCollection = rentLogs?.reduce((sum, log) => sum + log.amountCollected, 0) || 0;
  const totalFuel = rentLogs?.reduce((sum, log) => sum + log.fuel, 0) || 0;
  const uniqueDrivers = new Set(rentLogs?.map(log => log.driverName)).size;

  return (
    <div className="flex-1 p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Financial Records</h1>
          <p className="text-gray-600 mt-1">Track daily driver rent, collections, and fuel expenses</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card data-testid="card-total-rent">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-500">Total Rent</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">₹{totalRent.toLocaleString()}</div>
            <div className="text-sm text-gray-600">All entries</div>
          </CardContent>
        </Card>
        
        <Card data-testid="card-total-collection">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-500">Total Collection</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">₹{totalCollection.toLocaleString()}</div>
            <div className="text-sm text-gray-600">All entries</div>
          </CardContent>
        </Card>
        
        <Card data-testid="card-total-fuel">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-500">Total Fuel</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">₹{totalFuel.toLocaleString()}</div>
            <div className="text-sm text-gray-600">All entries</div>
          </CardContent>
        </Card>
        
        <Card data-testid="card-drivers">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-500">Total Drivers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{uniqueDrivers}</div>
            <div className="text-sm text-gray-600">Unique drivers</div>
          </CardContent>
        </Card>
      </div>

      <Card data-testid="card-records-table">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <TrendingUp className="w-5 h-5 text-blue-500" />
            <span>All Financial Records</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Vehicle</TableHead>
                <TableHead>Driver</TableHead>
                <TableHead>Shift</TableHead>
                <TableHead>Rent</TableHead>
                <TableHead>Collection</TableHead>
                <TableHead>Fuel</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rentLogs?.map((log) => {
                const logDate = new Date(log.date);
                
                return (
                  <TableRow key={log.id} data-testid={`row-record-${log.id}`}>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span>{format(logDate, 'MMM dd, yyyy')}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{log.vehicleNumber}</div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Users className="w-4 h-4 text-gray-400" />
                        <span>{log.driverName}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        log.shift === 'morning' 
                          ? 'bg-blue-100 text-blue-800' 
                          : 'bg-purple-100 text-purple-800'
                      }`}>
                        {log.shift === 'morning' ? 'Morning' : 'Evening'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-1">
                        <DollarSign className="w-4 h-4 text-gray-400" />
                        <span className="font-semibold">₹{log.rent}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-1">
                        <DollarSign className="w-4 h-4 text-gray-400" />
                        <span className="font-semibold text-blue-600">₹{log.amountCollected}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-1">
                        <DollarSign className="w-4 h-4 text-gray-400" />
                        <span className="font-semibold text-orange-600">₹{log.fuel}</span>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          
          {rentLogs?.length === 0 && (
            <div className="text-center py-12">
              <TrendingUp className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No records found</h3>
              <p className="text-gray-600">Financial records will appear here once trips are logged</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="mt-6" data-testid="card-guidelines">
        <CardHeader>
          <CardTitle>Financial Tracking Guidelines</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-medium text-gray-900">Driver Rent Rates</h4>
              <div className="text-sm text-gray-600">
                <div className="flex justify-between">
                  <span>With Accommodation:</span>
                  <span className="font-semibold">₹600/day</span>
                </div>
                <div className="flex justify-between">
                  <span>Without Accommodation:</span>
                  <span className="font-semibold">₹500/day</span>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium text-gray-900">Tracking Metrics</h4>
              <div className="text-sm text-gray-600">
                <div>• Driver rent per shift</div>
                <div>• Amount collected from customers</div>
                <div>• Fuel expenses per shift</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
