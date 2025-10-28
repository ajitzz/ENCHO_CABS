import { useState, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { Trash2, Edit, Filter, X, Search, Plus, Check, ChevronsUpDown, RefreshCw, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import EditTripModal from "@/components/EditTripModal";
import TripLogModal from "@/components/TripLogModal";
import SubstituteDriverForm from "@/components/SubstituteDriverForm";

interface TripLog {
  id: number;
  driverId: number;
  vehicleId: number;
  tripDate: string;
  shift: "morning" | "evening";
  driverName: string;
  vehicleNumber: string;
  isSubstitute?: boolean;
  charge?: number;
  rent?: number;
  amountCollected?: number;
  fuel?: number;
}

interface SubstituteDriver {
  id: number;
  name: string;
  vehicleId: number;
  date: string;
  shift: "morning" | "evening";
  shiftHours: number;
  charge: number;
  vehicleNumber: string;
}

export default function TripLogs() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [editTrip, setEditTrip] = useState<any>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [repairingData, setRepairingData] = useState(false);
  const [tripLogModalOpen, setTripLogModalOpen] = useState(false);
  const [substituteModalOpen, setSubstituteModalOpen] = useState(false);
  
  // Delete confirmation states
  const [deleteTripConfirm, setDeleteTripConfirm] = useState<{ id: number; driverName: string; vehicleNumber: string } | null>(null);
  const [deleteSubstituteConfirm, setDeleteSubstituteConfirm] = useState<{ id: number; name: string } | null>(null);
  
  // Filter states
  const [startDateFilter, setStartDateFilter] = useState("");
  const [endDateFilter, setEndDateFilter] = useState("");
  const [vehicleFilter, setVehicleFilter] = useState("");
  const [driverFilter, setDriverFilter] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  
  // Combobox states
  const [openVehicleSelect, setOpenVehicleSelect] = useState(false);
  const [openDriverSelect, setOpenDriverSelect] = useState(false);
  

  // Fetch data
  const { data: rentLogs = [], isLoading: tripsLoading } = useQuery({
    queryKey: ["/api/driver-rent-logs/recent/500"],
    queryFn: () => api.getRecentRentLogs(500),
  });

  const { data: substituteDrivers = [], isLoading: substitutesLoading } = useQuery({
    queryKey: ["/api/substitute-drivers"],
    queryFn: () => api.getSubstituteDrivers(),
  });


  const { data: vehicles = [] } = useQuery({
    queryKey: ["/api/vehicles"],
    queryFn: () => api.getVehicles(),
  });

  const { data: drivers = [] } = useQuery({
    queryKey: ["/api/drivers"],
    queryFn: () => api.getDrivers(),
  });

  // Filter active vehicles (not dropped)
  const activeVehicles = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return vehicles.filter((vehicle) => {
      if (!vehicle.droppedDate) return true;
      
      const droppedDate = new Date(vehicle.droppedDate);
      droppedDate.setHours(0, 0, 0, 0);
      
      return droppedDate > today;
    });
  }, [vehicles]);

  // Fetch all rent logs to show amounts even after payment
  const { data: allRentLogs = [], isLoading: allRentLogsLoading, refetch: refetchAllRentLogs } = useQuery({
    queryKey: ["/api/driver-rent-logs"],
    queryFn: async () => {
      const response = await fetch("/api/driver-rent-logs");
      if (!response.ok) throw new Error("Failed to fetch all rent logs");
      return response.json();
    },
  });

  // Helper function to get rent details
  const getRentDetails = useCallback((log: TripLog) => {
    if (log.isSubstitute) {
      return { rent: log.charge || 0, amountCollected: 0, fuel: 0 };
    }
    
    // Normalize dates for comparison
    const tripDate = new Date(log.tripDate);
    const tripDateStr = tripDate.toISOString().split('T')[0];
    
    // Find matching rent log with exact shift matching
    const rentLog = allRentLogs.find((rent: any) => {
      const rentDate = new Date(rent.date);
      const rentDateStr = rentDate.toISOString().split('T')[0];
      
      // Exact match: same driver, same date, and same shift
      const dateMatch = rentDateStr === tripDateStr;
      const driverMatch = rent.driverId === log.driverId;
      const shiftMatch = rent.shift === log.shift;
      
      return driverMatch && dateMatch && shiftMatch;
    });
    
    if (rentLog) {
      return { 
        rent: rentLog.rent || 0,
        amountCollected: rentLog.amountCollected || 0,
        fuel: rentLog.fuel || 0,
        rentLogId: rentLog.id
      };
    }
    
    // Fallback: if no rent log found, use default values
    const driver = drivers.find(d => d.id === log.driverId);
    const fallbackRent = driver?.hasAccommodation ? 600 : 500;
    
    // Trigger auto-creation of missing rent log with shift
    autoCreateMissingRentLog(log.driverId, new Date(log.tripDate), log.vehicleId, fallbackRent, log.shift, 0, 0);
    
    return { 
      rent: fallbackRent,
      amountCollected: 0,
      fuel: 0
    };
  }, [allRentLogs, drivers]);

  // Auto-create missing rent logs
  const autoCreateMissingRentLog = useCallback(async (driverId: number, date: Date, vehicleId: number, rent: number, shift: string, amountCollected: number, fuel: number) => {
    try {
      // Calculate week boundaries
      const weekStart = new Date(date);
      const day = weekStart.getDay();
      const diff = weekStart.getDate() - day + (day === 0 ? -6 : 1);
      weekStart.setDate(diff);
      weekStart.setHours(0, 0, 0, 0);
      
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);

      // Create the missing rent log with shift
      const rentLogData = {
        driverId,
        date: date.toISOString(),
        shift,
        rent,
        amountCollected,
        fuel,
        vehicleId,
        weekStart: weekStart.toISOString(),
        weekEnd: weekEnd.toISOString()
      };

      const response = await fetch("/api/driver-rent-logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(rentLogData)
      });

      if (response.ok) {
        console.log(`Auto-created rent log for driver ${driverId} ${shift} shift on ${date.toISOString().split('T')[0]}`);
        // Refresh rent logs data
        queryClient.invalidateQueries({ queryKey: ["/api/driver-rent-logs"] });
        return await response.json();
      }
    } catch (error) {
      console.error("Failed to auto-create rent log:", error);
    }
  }, [queryClient]);

  // Manual data repair function (obsolete - kept for backwards compatibility)
  const repairAllMissingRentLogs = useCallback(async () => {
    // This function is no longer needed since trips and rent logs are now the same table
    toast({
      title: "Repair Not Needed",
      description: "This feature is obsolete. Trip logs and rent logs are now unified in a single table.",
    });
  }, [toast]);

  // Combine rent logs and substitute drivers
  const allLogs = useMemo(() => {
    const tripLogs: TripLog[] = rentLogs.map(rentLog => ({
      id: rentLog.id,
      driverId: rentLog.driverId,
      vehicleId: rentLog.vehicleId,
      tripDate: rentLog.date,
      shift: rentLog.shift,
      driverName: rentLog.driverName,
      vehicleNumber: rentLog.vehicleNumber,
      isSubstitute: false,
      rent: rentLog.rent,
      amountCollected: rentLog.amountCollected,
      fuel: rentLog.fuel
    }));

    const substituteLogs: TripLog[] = substituteDrivers.map(sub => ({
      id: sub.id,
      driverId: sub.id,
      vehicleId: sub.vehicleId,
      tripDate: sub.date,
      shift: sub.shift,
      driverName: sub.name,
      vehicleNumber: sub.vehicleNumber,
      isSubstitute: true,
      charge: sub.charge
    }));

    return [...tripLogs, ...substituteLogs].sort((a, b) => 
      new Date(b.tripDate).getTime() - new Date(a.tripDate).getTime()
    );
  }, [rentLogs, substituteDrivers]);

  // Filter logs
  const filteredLogs = useMemo(() => {
    // Wait for all data to load before filtering
    if (allRentLogsLoading || tripsLoading || substitutesLoading) {
      return [];
    }
    
    return allLogs.filter(log => {
      // Convert log date to proper Date object
      const logDateTime = new Date(log.tripDate);
      
      // Date range filtering with proper time boundaries
      let matchesDateRange = true;
      if (startDateFilter || endDateFilter) {
        if (startDateFilter) {
          const start = new Date(startDateFilter);
          start.setHours(0, 0, 0, 0); // Set to start of day
          matchesDateRange = matchesDateRange && logDateTime >= start;
        }
        if (endDateFilter) {
          const end = new Date(endDateFilter);
          end.setHours(23, 59, 59, 999); // Set to end of day
          matchesDateRange = matchesDateRange && logDateTime <= end;
        }
      }
      
      const matchesVehicle = !vehicleFilter || log.vehicleNumber.toLowerCase().includes(vehicleFilter.toLowerCase());
      const matchesDriver = !driverFilter || log.driverName.toLowerCase().includes(driverFilter.toLowerCase());
      
      return matchesDateRange && matchesVehicle && matchesDriver;
    });
  }, [allLogs, startDateFilter, endDateFilter, vehicleFilter, driverFilter, allRentLogsLoading, tripsLoading, substitutesLoading]);

  // Calculate totals for filtered data
  const totals = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const todayLogs = filteredLogs.filter(log => log.tripDate.startsWith(today));
    
    // Calculate total rent, collection, fuel from all filtered logs
    const totalRent = filteredLogs.reduce((sum, log) => {
      const details = getRentDetails(log);
      return sum + details.rent;
    }, 0);

    const totalCollection = filteredLogs.reduce((sum, log) => {
      const details = getRentDetails(log);
      return sum + details.amountCollected;
    }, 0);

    const totalFuel = filteredLogs.reduce((sum, log) => {
      const details = getRentDetails(log);
      return sum + details.fuel;
    }, 0);

    // Calculate today's rent, collection, fuel
    const todayRent = todayLogs.reduce((sum, log) => {
      const details = getRentDetails(log);
      return sum + details.rent;
    }, 0);

    const todayCollection = todayLogs.reduce((sum, log) => {
      const details = getRentDetails(log);
      return sum + details.amountCollected;
    }, 0);

    const todayFuel = todayLogs.reduce((sum, log) => {
      const details = getRentDetails(log);
      return sum + details.fuel;
    }, 0);
    
    return {
      totalRent,
      totalCollection,
      totalFuel,
      todayRent,
      todayCollection,
      todayFuel
    };
  }, [filteredLogs, getRentDetails]);

  const deleteTripMutation = useMutation({
    mutationFn: (rentLogId: number) => api.deleteRentLog(rentLogId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/driver-rent-logs/recent/500"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/profit-graph"] });
      queryClient.invalidateQueries({ queryKey: ["/api/settlements"] });
      queryClient.invalidateQueries({ queryKey: ["/api/driver-rent-logs"] });
      toast({ title: "Trip log deleted successfully", variant: "default" });
    },
    onError: (error) => {
      toast({ title: "Failed to delete trip log", description: error.message, variant: "destructive" });
    },
  });

  // Pay rent feature is disabled - no 'paid' field in schema
  const payRentMutation = useMutation({
    mutationFn: async (rentLogId: number) => {
      // Feature disabled - no backend support
      throw new Error("Pay rent feature is not implemented");
    },
    onSuccess: async (rentLogId) => {
      console.log(`Successfully marked rent log ${rentLogId} as paid`);
      
      // STEP 1: Immediately update cache with optimistic UI
      queryClient.setQueryData(["/api/driver-rent-logs/all"], (oldData: any) => {
        if (!oldData) return oldData;
        return oldData.map((log: any) => 
          log.id === rentLogId ? { ...log, paid: true, updatedAt: new Date().toISOString() } : log
        );
      });
      
      // STEP 2: Remove from unpaid list immediately
      queryClient.setQueryData(["/api/driver-rent-logs/unpaid"], (oldData: any) => {
        if (!oldData) return oldData;
        return oldData.filter((log: any) => log.id !== rentLogId);
      });
      
      // STEP 3: Verify payment in database and refresh from server
      setTimeout(async () => {
        try {
          // Double-check the payment status in database
          const response = await fetch(`/api/driver-rent-logs`);
          if (response.ok) {
            const allLogs = await response.json();
            const updatedLog = allLogs.find((log: any) => log.id === rentLogId);
            
            if (updatedLog && !updatedLog.paid) {
              console.error(`CRITICAL: Payment verification failed for rent log ${rentLogId}`);
              toast({
                title: "Payment Verification Failed",
                description: `Please verify rent log #${rentLogId} manually`,
                variant: "destructive"
              });
            } else {
              console.log(`Payment verification successful for rent log ${rentLogId}`);
            }
          }
          
          // Force refresh all queries
          await Promise.all([
            refetchAllRentLogs(),
            queryClient.refetchQueries({ queryKey: ["/api/driver-rent-logs/unpaid"] }),
            queryClient.refetchQueries({ queryKey: ["/api/driver-rent-logs"] })
          ]);
        } catch (error) {
          console.error("Payment verification error:", error);
        }
      }, 200);
      
      // STEP 4: Invalidate related caches
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/profit-graph"] });
      queryClient.invalidateQueries({ queryKey: ["/api/settlements"] });
      
      toast({ 
        title: "Payment Recorded Successfully", 
        description: `Rent log #${rentLogId} marked as paid`,
        variant: "default" 
      });
    },
    onError: (error) => {
      console.error("Payment update failed:", error);
      toast({ 
        title: "Payment Update Failed", 
        description: error.message || "Unable to mark rent as paid", 
        variant: "destructive" 
      });
    },
  });

  const deleteSubstituteMutation = useMutation({
    mutationFn: (substituteId: number) => api.deleteSubstituteDriver(substituteId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/substitute-drivers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/trips/recent/500"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/profit-graph"] });
      queryClient.invalidateQueries({ queryKey: ["/api/settlements"] });
      toast({ title: "Substitute driver deleted successfully", variant: "default" });
    },
    onError: (error) => {
      toast({ title: "Failed to delete substitute driver", description: error.message, variant: "destructive" });
    },
  });

  const handleDeleteTrip = (tripId: number, driverName: string, vehicleNumber: string) => {
    setDeleteTripConfirm({ id: tripId, driverName, vehicleNumber });
  };

  const handleEditTrip = (trip: any) => {
    setEditTrip(trip);
    setEditModalOpen(true);
  };

  const handlePayRent = async (log: TripLog) => {
    if (log.isSubstitute) return;
    
    // Normalize dates for comparison
    const tripDate = new Date(log.tripDate).toISOString().split('T')[0];
    
    // Find the corresponding rent log ID with exact shift matching
    let rentLog = allRentLogs.find((rent: any) => {
      const rentDate = new Date(rent.date).toISOString().split('T')[0];
      return rent.driverId === log.driverId && rentDate === tripDate && rent.shift === log.shift;
    });
    
    if (rentLog) {
      // Double-check if already paid to prevent duplicate payments
      if (rentLog.paid) {
        toast({ 
          title: "Already Paid", 
          description: `Rent for ${log.driverName} ${log.shift} shift on ${tripDate} is already marked as paid`, 
          variant: "default" 
        });
        return;
      }
      
      console.log(`Paying rent for log ID ${rentLog.id}, driver: ${log.driverName}, ${log.shift} shift, date: ${tripDate}, current paid status: ${rentLog.paid}`);
      payRentMutation.mutate(rentLog.id);
    } else {
      // Create missing rent log first, then mark as paid
      try {
        console.log(`Creating missing rent log for ${log.driverName} ${log.shift} shift on ${tripDate}`);
        
        // Find driver details for accurate rent calculation
        const driver = drivers.find(d => d.id === log.driverId);
        const amount = driver?.hasAccommodation ? 600 : 500;
        
        // Create the rent log with shift
        const newRentLog = await autoCreateMissingRentLog(log.driverId, new Date(log.tripDate), log.vehicleId, amount, log.shift, 0, 0);
        
        if (newRentLog) {
          console.log(`Successfully created rent log ${newRentLog.id}, now marking as paid`);
          // Small delay to ensure cache is updated
          setTimeout(() => {
            payRentMutation.mutate(newRentLog.id);
          }, 100);
        }
      } catch (error) {
        console.error("Failed to create rent log:", error);
        toast({ 
          title: "Error Creating Rent Log", 
          description: `Failed to create rent log for ${log.driverName} ${log.shift} shift`, 
          variant: "destructive" 
        });
      }
    }
  };

  const handleDeleteSubstitute = (substituteId: number, substituteName: string) => {
    setDeleteSubstituteConfirm({ id: substituteId, name: substituteName });
  };

  const clearFilters = () => {
    setStartDateFilter("");
    setEndDateFilter("");
    setVehicleFilter("");
    setDriverFilter("");
  };

  // Get unique driver names from trips, substitutes, and regular drivers
  const allDriverNames = useMemo(() => {
    const names = new Set<string>();
    
    // Add names from regular drivers
    drivers.forEach(driver => names.add(driver.name));
    
    // Add names from trip logs
    allLogs.forEach(log => names.add(log.driverName));
    
    return Array.from(names).sort();
  }, [drivers, allLogs]);

  const isLoading = tripsLoading || substitutesLoading || allRentLogsLoading;

  if (isLoading) {
    return (
      <div className="w-full p-4 md:p-6 lg:p-8">
        <div className="text-center">Loading trip logs...</div>
      </div>
    );
  }

  return (
    <div className="w-full p-4 md:p-6 lg:p-8 space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Trip Logs</h1>
        <div className="flex items-center gap-2">
          <Button 
            onClick={() => setTripLogModalOpen(true)}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Trip Log
          </Button>
          <Button 
            variant="outline"
            onClick={() => setSubstituteModalOpen(true)}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Substitute
          </Button>
          <Button 
            variant="outline" 
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2"
          >
            <Filter className="h-4 w-4" />
            {showFilters ? "Hide Filters" : "Show Filters"}
          </Button>
          <Button 
            onClick={repairAllMissingRentLogs} 
            variant="outline"
            disabled={repairingData}
            className="border-red-200 text-red-700 hover:bg-red-50 flex items-center gap-2"
          >
            {repairingData ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            {repairingData ? "Repairing..." : "Fix ₹0 Issues"}
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Total Rent</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{totals.totalRent}</div>
            <div className="text-xs text-gray-500 mt-1">Today: ₹{totals.todayRent}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Total Collection</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{totals.totalCollection}</div>
            <div className="text-xs text-gray-500 mt-1">Today: ₹{totals.todayCollection}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Total Fuel</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{totals.totalFuel}</div>
            <div className="text-xs text-gray-500 mt-1">Today: ₹{totals.todayFuel}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      {showFilters && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Filters</span>
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="h-4 w-4 mr-1" />
                Clear All
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Quick Date Presets */}
            <div className="flex flex-wrap gap-2 mb-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setStartDateFilter("2025-06-30");
                  setEndDateFilter("2025-07-03");
                }}
              >
                Jun 30 - Jul 3 (Your Test)
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setStartDateFilter("2025-07-05");
                  setEndDateFilter("");
                }}
              >
                From Jul 5 Onwards
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setStartDateFilter("2025-07-04");
                  setEndDateFilter("");
                }}
              >
                From Jul 4 Onwards
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const today = new Date().toISOString().split('T')[0];
                  setStartDateFilter(today);
                  setEndDateFilter(today);
                }}
              >
                Today Only
              </Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="text-sm font-medium">Start Date</label>
                <Input
                  type="date"
                  value={startDateFilter}
                  onChange={(e) => setStartDateFilter(e.target.value)}
                  placeholder="From date"
                />
              </div>
              <div>
                <label className="text-sm font-medium">End Date</label>
                <Input
                  type="date"
                  value={endDateFilter}
                  onChange={(e) => setEndDateFilter(e.target.value)}
                  placeholder="To date"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Vehicle</label>
                <Select value={vehicleFilter || "all"} onValueChange={(value) => setVehicleFilter(value === "all" ? "" : value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="All vehicles" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All vehicles</SelectItem>
                    {activeVehicles.map((vehicle) => (
                      <SelectItem key={vehicle.id} value={vehicle.vehicleNumber}>
                        {vehicle.vehicleNumber} ({vehicle.company})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Driver</label>
                <Popover open={openDriverSelect} onOpenChange={setOpenDriverSelect}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={openDriverSelect}
                      className="w-full justify-between"
                    >
                      {driverFilter ? driverFilter : "All drivers"}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0">
                    <Command>
                      <CommandInput 
                        placeholder="Search or type driver name..." 
                        value={driverFilter}
                        onValueChange={setDriverFilter}
                      />
                      <CommandList>
                        <CommandEmpty>
                          {driverFilter ? `Use "${driverFilter}"` : "No drivers found."}
                        </CommandEmpty>
                        <CommandGroup>
                          <CommandItem
                            value=""
                            onSelect={() => {
                              setDriverFilter("");
                              setOpenDriverSelect(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                driverFilter === "" ? "opacity-100" : "opacity-0"
                              )}
                            />
                            All drivers
                          </CommandItem>
                          {allDriverNames.map((name) => (
                            <CommandItem
                              key={name}
                              value={name}
                              onSelect={(currentValue) => {
                                setDriverFilter(currentValue === driverFilter ? "" : currentValue);
                                setOpenDriverSelect(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  driverFilter === name ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {name}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Trip Logs Table */}
      <Card className="shadow-sm">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
          <CardTitle className="text-lg font-semibold text-gray-800">
            Trip Logs ({filteredLogs.length} records)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b-2 border-gray-200">
                  <th className="text-left p-4 font-semibold text-gray-700">Date</th>
                  <th className="text-left p-4 font-semibold text-gray-700">Vehicle</th>
                  <th className="text-left p-4 font-semibold text-gray-700">Driver</th>
                  <th className="text-left p-4 font-semibold text-gray-700">Shift</th>
                  <th className="text-left p-4 font-semibold text-gray-700">Rent</th>
                  <th className="text-left p-4 font-semibold text-gray-700">Collection</th>
                  <th className="text-left p-4 font-semibold text-gray-700">Fuel</th>
                  <th className="text-left p-4 font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((log) => {
                  const details = getRentDetails(log);
                  return (
                    <tr key={`${log.isSubstitute ? 'sub' : 'trip'}-${log.id}`} className="border-b border-gray-100 hover:bg-blue-50 transition-colors">
                      <td className="p-4 text-gray-700">
                        {format(new Date(log.tripDate), "MMM dd, yyyy")}
                      </td>
                      <td className="p-4">
                        <span className="font-medium text-gray-800">{log.vehicleNumber}</span>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-col">
                          <span className="font-medium text-gray-800">{log.driverName}</span>
                          {log.isSubstitute && (
                            <Badge variant="outline" className="border-orange-200 text-orange-700 bg-orange-50 text-xs mt-1 w-fit">
                              Substitute
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <Badge variant={log.shift === "morning" ? "default" : "secondary"} className="font-medium">
                          {log.shift === "morning" ? "Morning" : "Evening"}
                        </Badge>
                      </td>
                      <td className="p-4 font-semibold text-green-600">₹{details.rent}</td>
                      <td className="p-4 font-semibold text-blue-600">₹{details.amountCollected}</td>
                      <td className="p-4 font-semibold text-purple-600">₹{details.fuel}</td>
                      <td className="p-4">
                        <div className="flex gap-2">
                          {!log.isSubstitute && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleEditTrip(log)}
                                className="hover:bg-blue-50 border-blue-200 text-blue-600"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleDeleteTrip(log.id, log.driverName, log.vehicleNumber)}
                                className="hover:bg-red-50 border-red-200 text-red-600"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          {log.isSubstitute && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDeleteSubstitute(log.id, log.driverName)}
                              className="hover:bg-red-50 border-red-200 text-red-600"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <EditTripModal
        trip={editTrip}
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
      />

      <TripLogModal
        open={tripLogModalOpen}
        onOpenChange={setTripLogModalOpen}
      />

      <SubstituteDriverForm
        open={substituteModalOpen}
        onOpenChange={setSubstituteModalOpen}
        vehicles={activeVehicles}
      />

      {/* Delete Trip Confirmation Dialog */}
      <AlertDialog open={deleteTripConfirm !== null} onOpenChange={() => setDeleteTripConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Delete Trip</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTripConfirm && `Are you sure you want to delete the trip for ${deleteTripConfirm.driverName} (${deleteTripConfirm.vehicleNumber})? This action cannot be undone and will remove the trip from the database and update rent logs.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteTripConfirm) {
                  deleteTripMutation.mutate(deleteTripConfirm.id);
                  setDeleteTripConfirm(null);
                }
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Substitute Driver Confirmation Dialog */}
      <AlertDialog open={deleteSubstituteConfirm !== null} onOpenChange={() => setDeleteSubstituteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Delete Substitute Driver</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteSubstituteConfirm && `Are you sure you want to delete the substitute driver ${deleteSubstituteConfirm.name}? This action cannot be undone and will remove the record from the database.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteSubstituteConfirm) {
                  deleteSubstituteMutation.mutate(deleteSubstituteConfirm.id);
                  setDeleteSubstituteConfirm(null);
                }
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}