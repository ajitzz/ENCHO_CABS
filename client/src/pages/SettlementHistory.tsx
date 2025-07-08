import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { CalendarDays, DollarSign, TrendingUp, Archive, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

interface Settlement {
  id: number;
  vehicleId: number;
  vehicleNumber: string;
  weekStart: string;
  weekEnd: string;
  totalTrips: number;
  profit: number;
  companyRent: number;
  driverRent: number;
  substituteRent: number;
  totalRent: number;
  settlementDate: string;
  status: string;
  processedBy: string;
  notes?: string;
}

interface CurrentWeekStatus {
  isSettled: boolean;
  canSettle: boolean;
  weekStart: string;
  weekEnd: string;
}

export default function SettlementHistory() {
  const [selectedVehicle, setSelectedVehicle] = useState<number | null>(null);
  const [settlementNotes, setSettlementNotes] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch vehicles
  const { data: vehicles = [] } = useQuery({
    queryKey: ["/api/vehicles"],
  });

  // Fetch settlements for selected vehicle
  const { data: settlements = [], isLoading: settlementsLoading } = useQuery({
    queryKey: ["/api/settlements/vehicle", selectedVehicle],
    enabled: !!selectedVehicle,
  });

  // Fetch current week status
  const { data: weekStatus } = useQuery<CurrentWeekStatus>({
    queryKey: ["/api/settlements/status", selectedVehicle],
    enabled: !!selectedVehicle,
  });

  // Process settlement mutation
  const processSettlementMutation = useMutation({
    mutationFn: async (data: { vehicleId: number; weekStart: string; notes?: string }) => {
      const response = await fetch("/api/settlements/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          processedBy: "User"
        }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to process settlement");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Settlement Processed",
        description: "Weekly settlement has been successfully processed and archived.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/settlements/vehicle", selectedVehicle] });
      queryClient.invalidateQueries({ queryKey: ["/api/settlements/status", selectedVehicle] });
      queryClient.invalidateQueries({ queryKey: ["/api/weekly/vehicle", selectedVehicle] });
      setSettlementNotes("");
    },
    onError: (error: Error) => {
      toast({
        title: "Settlement Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleProcessSettlement = () => {
    if (!selectedVehicle || !weekStatus) return;
    
    processSettlementMutation.mutate({
      vehicleId: selectedVehicle,
      weekStart: weekStatus.weekStart,
      notes: settlementNotes || undefined,
    });
  };

  const formatCurrency = (amount: number) => `₹${amount.toLocaleString()}`;
  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString();

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Settlement History</h1>
          <p className="text-muted-foreground">
            Process weekly settlements and view historical records
          </p>
        </div>
      </div>

      {/* Vehicle Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Select Vehicle</CardTitle>
          <CardDescription>Choose a vehicle to view settlements and process new ones</CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={selectedVehicle?.toString() || ""} onValueChange={(value) => setSelectedVehicle(parseInt(value))}>
            <SelectTrigger className="w-full max-w-sm">
              <SelectValue placeholder="Select a vehicle" />
            </SelectTrigger>
            <SelectContent>
              {vehicles.map((vehicle: any) => (
                <SelectItem key={vehicle.id} value={vehicle.id.toString()}>
                  {vehicle.vehicleNumber} - {vehicle.company}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Current Week Status */}
      {selectedVehicle && weekStatus && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5" />
              Current Week Status
            </CardTitle>
            <CardDescription>
              Week: {formatDate(weekStatus.weekStart)} to {formatDate(weekStatus.weekEnd)}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <Badge variant={weekStatus.isSettled ? "default" : "secondary"}>
                {weekStatus.isSettled ? "Settled" : "Active"}
              </Badge>
              {weekStatus.isSettled && (
                <Badge variant="outline" className="text-green-600">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Week Completed
                </Badge>
              )}
            </div>

            {!weekStatus.isSettled && weekStatus.canSettle && (
              <div className="space-y-4">
                <Textarea
                  placeholder="Add settlement notes (optional)"
                  value={settlementNotes}
                  onChange={(e) => setSettlementNotes(e.target.value)}
                  className="max-w-md"
                />
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button className="flex items-center gap-2">
                      <Archive className="h-4 w-4" />
                      Process Settlement
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Process Weekly Settlement</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently save the current week's data and start a fresh week. 
                        This action cannot be undone. Continue?
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction 
                        onClick={handleProcessSettlement}
                        disabled={processSettlementMutation.isPending}
                      >
                        {processSettlementMutation.isPending ? "Processing..." : "Process Settlement"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            )}

            {!weekStatus.canSettle && !weekStatus.isSettled && (
              <p className="text-muted-foreground">
                No activity this week. Settlement will be available once there are trips or driver assignments.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Settlements History */}
      {selectedVehicle && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Settlement History
            </CardTitle>
            <CardDescription>All processed weekly settlements for this vehicle</CardDescription>
          </CardHeader>
          <CardContent>
            {settlementsLoading ? (
              <div className="text-center py-8">Loading settlements...</div>
            ) : settlements.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No settlements found for this vehicle
              </div>
            ) : (
              <div className="space-y-4">
                {settlements.map((settlement: Settlement) => (
                  <Card key={settlement.id} className="border-l-4 border-l-blue-500">
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">
                              {formatDate(settlement.weekStart)} - {formatDate(settlement.weekEnd)}
                            </Badge>
                            <Badge variant={settlement.profit >= 0 ? "default" : "destructive"}>
                              {settlement.profit >= 0 ? "Profit" : "Loss"}: {formatCurrency(Math.abs(settlement.profit))}
                            </Badge>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <span className="text-muted-foreground">Total Trips:</span>
                              <div className="font-medium">{settlement.totalTrips}</div>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Company Rent:</span>
                              <div className="font-medium">{formatCurrency(settlement.companyRent)}</div>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Driver Rent:</span>
                              <div className="font-medium">{formatCurrency(settlement.driverRent)}</div>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Total Income:</span>
                              <div className="font-medium">{formatCurrency(settlement.totalRent)}</div>
                            </div>
                          </div>
                          {settlement.notes && (
                            <div className="text-sm">
                              <span className="text-muted-foreground">Notes:</span>
                              <div className="italic">{settlement.notes}</div>
                            </div>
                          )}
                        </div>
                        <div className="text-right text-sm text-muted-foreground">
                          <div>Processed: {formatDate(settlement.settlementDate)}</div>
                          <div>By: {settlement.processedBy}</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}