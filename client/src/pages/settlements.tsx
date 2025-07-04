import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Calendar, DollarSign, TrendingUp, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { api, type SettlementWithVehicle } from "@/lib/api";
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

export default function Settlements() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: settlements, isLoading } = useQuery({
    queryKey: ["/api/settlements"],
    queryFn: () => api.getSettlements(),
  });

  const processAllSettlementsMutation = useMutation({
    mutationFn: () => api.processAllSettlements(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settlements"] });
      toast({
        title: "Success",
        description: "All settlements processed successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to process settlements",
        variant: "destructive",
      });
    },
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

  const totalProfit = settlements?.reduce((sum, settlement) => sum + settlement.profit, 0) || 0;
  const totalRevenue = settlements?.reduce((sum, settlement) => sum + settlement.totalRentToCompany, 0) || 0;
  const paidSettlements = settlements?.filter(s => s.paid).length || 0;
  const unpaidSettlements = settlements?.filter(s => !s.paid).length || 0;

  return (
    <div className="flex-1 p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Weekly Settlements</h1>
          <p className="text-gray-600 mt-1">Track weekly rental calculations and profits</p>
        </div>
        <Button
          onClick={() => processAllSettlementsMutation.mutate()}
          disabled={processAllSettlementsMutation.isPending}
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          {processAllSettlementsMutation.isPending ? "Processing..." : "Process All"}
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-500">Total Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">₹{totalRevenue.toLocaleString()}</div>
            <div className="text-sm text-gray-600">Company rentals</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-500">Total Profit</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              ₹{totalProfit.toLocaleString()}
            </div>
            <div className="text-sm text-gray-600">Net profit/loss</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-500">Paid Settlements</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{paidSettlements}</div>
            <div className="text-sm text-gray-600">Completed</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-500">Pending Settlements</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{unpaidSettlements}</div>
            <div className="text-sm text-gray-600">Awaiting payment</div>
          </CardContent>
        </Card>
      </div>

      {/* Settlements Table */}
      <Card>
        <CardHeader>
          <CardTitle>Settlement History</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Week Period</TableHead>
                <TableHead>Vehicle</TableHead>
                <TableHead>Total Trips</TableHead>
                <TableHead>Company Rental</TableHead>
                <TableHead>Driver Rent</TableHead>
                <TableHead>Profit/Loss</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {settlements?.map((settlement: SettlementWithVehicle) => (
                <TableRow key={settlement.id}>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <div>
                        <div className="font-medium">
                          {format(new Date(settlement.weekStart), 'MMM dd')} - {format(new Date(settlement.weekEnd), 'MMM dd')}
                        </div>
                        <div className="text-sm text-gray-500">
                          {format(new Date(settlement.weekStart), 'yyyy')}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{settlement.vehicleNumber}</div>
                  </TableCell>
                  <TableCell>
                    <div className="font-semibold">{settlement.totalTrips}</div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-1">
                      <DollarSign className="w-4 h-4 text-gray-400" />
                      <span>₹{settlement.totalRentToCompany.toLocaleString()}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-1">
                      <DollarSign className="w-4 h-4 text-gray-400" />
                      <span>₹{settlement.totalDriverRent.toLocaleString()}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className={`flex items-center space-x-1 font-semibold ${settlement.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      <TrendingUp className="w-4 h-4" />
                      <span>₹{settlement.profit.toLocaleString()}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={settlement.paid ? "default" : "destructive"}>
                      {settlement.paid ? "Paid" : "Pending"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          
          {settlements?.length === 0 && (
            <div className="text-center py-12">
              <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No settlements yet</h3>
              <p className="text-gray-600 mb-4">Process settlements to see weekly calculations</p>
              <Button onClick={() => processAllSettlementsMutation.mutate()}>
                <Plus className="w-4 h-4 mr-2" />
                Process Settlements
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}