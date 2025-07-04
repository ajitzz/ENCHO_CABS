import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DollarSign, Calendar, Users, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { api, type UnpaidRent } from "@/lib/api";
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

export default function RentTracking() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: unpaidRents, isLoading } = useQuery({
    queryKey: ["/api/driver-rent-logs/unpaid"],
    queryFn: () => api.getUnpaidRents(),
  });

  const updateRentStatusMutation = useMutation({
    mutationFn: ({ id, paid }: { id: number; paid: boolean }) =>
      api.updateRentStatus(id, paid),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/driver-rent-logs/unpaid"] });
      toast({
        title: "Success",
        description: "Rent status updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update rent status",
        variant: "destructive",
      });
    },
  });

  const handleMarkPaid = (id: number) => {
    updateRentStatusMutation.mutate({ id, paid: true });
  };

  const handleMarkUnpaid = (id: number) => {
    updateRentStatusMutation.mutate({ id, paid: false });
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

  const totalUnpaidAmount = unpaidRents?.reduce((sum, rent) => sum + rent.rent, 0) || 0;
  const uniqueDrivers = new Set(unpaidRents?.map(rent => rent.driverName)).size;
  const overdueRents = unpaidRents?.filter(rent => {
    const rentDate = new Date(rent.date);
    const today = new Date();
    const diffDays = Math.floor((today.getTime() - rentDate.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays > 1;
  }) || [];

  return (
    <div className="flex-1 p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Rent Tracking</h1>
          <p className="text-gray-600 mt-1">Monitor daily driver rent payments</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-500">Total Unpaid</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">₹{totalUnpaidAmount.toLocaleString()}</div>
            <div className="text-sm text-gray-600">Outstanding amount</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-500">Unpaid Entries</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{unpaidRents?.length || 0}</div>
            <div className="text-sm text-gray-600">Pending payments</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-500">Drivers with Dues</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{uniqueDrivers}</div>
            <div className="text-sm text-gray-600">Unique drivers</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-500">Overdue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{overdueRents.length}</div>
            <div className="text-sm text-gray-600">More than 1 day</div>
          </CardContent>
        </Card>
      </div>

      {/* Unpaid Rents Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <AlertCircle className="w-5 h-5 text-red-500" />
            <span>Unpaid Rent Entries</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Driver</TableHead>
                <TableHead>Vehicle</TableHead>
                <TableHead>Rent Amount</TableHead>
                <TableHead>Days Overdue</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {unpaidRents?.map((rent: UnpaidRent) => {
                const rentDate = new Date(rent.date);
                const today = new Date();
                const diffDays = Math.floor((today.getTime() - rentDate.getTime()) / (1000 * 60 * 60 * 24));
                
                return (
                  <TableRow key={rent.id}>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span>{format(rentDate, 'MMM dd, yyyy')}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Users className="w-4 h-4 text-gray-400" />
                        <span>{rent.driverName}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{rent.vehicleNumber}</div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-1">
                        <DollarSign className="w-4 h-4 text-gray-400" />
                        <span className="font-semibold">₹{rent.rent}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={diffDays > 1 ? "destructive" : "secondary"}>
                        {diffDays === 0 ? "Today" : `${diffDays} days`}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        onClick={() => handleMarkPaid(rent.id)}
                        disabled={updateRentStatusMutation.isPending}
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Mark Paid
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          
          {unpaidRents?.length === 0 && (
            <div className="text-center py-12">
              <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">All rents are paid!</h3>
              <p className="text-gray-600">No outstanding rent payments at the moment</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Rent Payment Guidelines */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Rent Payment Guidelines</CardTitle>
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
              <h4 className="font-medium text-gray-900">Payment Schedule</h4>
              <div className="text-sm text-gray-600">
                <div>• Daily rent collection recommended</div>
                <div>• Weekly settlements for drivers</div>
                <div>• Track overdue payments regularly</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}