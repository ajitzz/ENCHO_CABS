import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { api } from "@/lib/api";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

const tripLogFormSchema = z.object({
  vehicleId: z.string().min(1, "Vehicle is required"),
  driverId: z.string().min(1, "Driver is required"),
  tripDate: z.string().min(1, "Date is required"),
  tripCount: z.string().min(1, "Trip count is required"),
  shift: z.enum(["morning", "evening"], {
    required_error: "Shift is required",
  }),
});

const tripLogSchema = tripLogFormSchema.transform((data) => ({
  vehicleId: Number(data.vehicleId),
  driverId: Number(data.driverId),
  tripDate: data.tripDate,
  tripCount: Number(data.tripCount),
  shift: data.shift,
}));

type TripLogFormData = z.infer<typeof tripLogFormSchema>;

interface TripLogModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function TripLogModal({ open, onOpenChange }: TripLogModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedVehicleId, setSelectedVehicleId] = useState<number | null>(null);

  const { data: vehicles } = useQuery<any[]>({
    queryKey: ["/api/vehicles"],
    enabled: open,
  });

  const { data: drivers } = useQuery<any[]>({
    queryKey: ["/api/drivers"],
    enabled: open,
  });

  const { data: vehicleAssignment } = useQuery({
    queryKey: ["/api/vehicles", selectedVehicleId, "assignment"],
    queryFn: async () => {
      if (!selectedVehicleId) return null;
      const res = await fetch(`/api/vehicles/${selectedVehicleId}/assignment`);
      if (res.status === 404) return null; // No assignment found
      if (!res.ok) throw new Error('Failed to fetch assignment');
      return res.json();
    },
    enabled: !!selectedVehicleId,
  });

  const form = useForm<TripLogFormData>({
    resolver: zodResolver(tripLogFormSchema),
    defaultValues: {
      tripDate: format(new Date(), "yyyy-MM-dd"),
    },
  });

  const createTripMutation = useMutation({
    mutationFn: (data: TripLogFormData) => {
      const parsedData = {
        vehicleId: parseInt(data.vehicleId),
        driverId: parseInt(data.driverId),
        tripDate: data.tripDate,
        shift: data.shift as "morning" | "evening",
        tripCount: parseInt(data.tripCount),
      };
      return api.createTrip(parsedData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trips"] });
      queryClient.invalidateQueries({ queryKey: ["/api/vehicles"] });
      toast({
        title: "Success",
        description: "Trip log added successfully",
      });
      form.reset();
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add trip log",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: TripLogFormData) => {
    createTripMutation.mutate(data);
  };

  const handleVehicleChange = (vehicleId: string) => {
    const id = parseInt(vehicleId);
    setSelectedVehicleId(id);
    form.setValue("vehicleId", vehicleId);
    form.setValue("driverId", ""); // Reset driver selection
  };

  const getAvailableDrivers = () => {
    if (!drivers || !Array.isArray(drivers)) return [];
    
    // If no vehicle is selected or no assignment exists, show all drivers
    if (!selectedVehicleId || !vehicleAssignment) return drivers;
    
    const availableDriverIds = [
      vehicleAssignment.morningDriverId,
      vehicleAssignment.eveningDriverId
    ].filter(Boolean);
    
    // If no drivers are assigned, show all drivers
    if (availableDriverIds.length === 0) return drivers;
    
    return drivers.filter((driver: any) => availableDriverIds.includes(driver.id));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Trip Log</DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="vehicleId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Vehicle</FormLabel>
                  <Select onValueChange={handleVehicleChange} value={field.value?.toString()}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select Vehicle" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {vehicles?.map((vehicle) => (
                        <SelectItem key={vehicle.id} value={vehicle.id.toString()}>
                          {vehicle.vehicleNumber} ({vehicle.company})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="driverId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Driver</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value?.toString()}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select Driver" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {getAvailableDrivers().map((driver) => (
                        <SelectItem key={driver.id} value={driver.id.toString()}>
                          {driver.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="tripDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Trip Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="tripCount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Trip Count</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={form.control}
              name="shift"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Shift</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      value={field.value}
                      className="grid grid-cols-2 gap-2"
                    >
                      <div className="flex items-center space-x-2 p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                        <RadioGroupItem value="morning" id="morning" />
                        <Label htmlFor="morning" className="text-sm cursor-pointer">Morning</Label>
                      </div>
                      <div className="flex items-center space-x-2 p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                        <RadioGroupItem value="evening" id="evening" />
                        <Label htmlFor="evening" className="text-sm cursor-pointer">Evening</Label>
                      </div>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="flex space-x-3 pt-4">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1"
                disabled={createTripMutation.isPending}
              >
                {createTripMutation.isPending ? "Adding..." : "Add Trip Log"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
