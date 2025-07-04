import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { api } from "@/lib/api";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";

const editTripSchema = z.object({
  driverId: z.number().min(1, "Please select a driver"),
  vehicleId: z.number().min(1, "Please select a vehicle"),
  tripDate: z.date({
    required_error: "Trip date is required",
  }),
  shift: z.enum(["morning", "evening"], {
    required_error: "Please select a shift",
  }),
  tripCount: z.number().min(1, "Trip count must be at least 1"),
});

type EditTripFormData = z.infer<typeof editTripSchema>;

interface Trip {
  id: number;
  driverId: number;
  vehicleId: number;
  tripDate: string;
  shift: "morning" | "evening";
  tripCount: number;
  driverName: string;
  vehicleNumber: string;
}

interface EditTripModalProps {
  trip: Trip | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function EditTripModal({ trip, open, onOpenChange }: EditTripModalProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: vehicles = [] } = useQuery({
    queryKey: ["/api/vehicles"],
    queryFn: api.getVehicles,
  });

  const { data: drivers = [] } = useQuery({
    queryKey: ["/api/drivers"],
    queryFn: api.getDrivers,
  });

  const form = useForm<EditTripFormData>({
    resolver: zodResolver(editTripSchema),
    defaultValues: {
      driverId: 0,
      vehicleId: 0,
      tripDate: new Date(),
      shift: "morning",
      tripCount: 1,
    },
  });

  // Reset form when trip changes
  useEffect(() => {
    if (trip) {
      form.reset({
        driverId: trip.driverId,
        vehicleId: trip.vehicleId,
        tripDate: new Date(trip.tripDate),
        shift: trip.shift,
        tripCount: trip.tripCount,
      });
    }
  }, [trip, form]);

  const updateTripMutation = useMutation({
    mutationFn: (data: EditTripFormData) => {
      if (!trip) throw new Error("No trip selected");
      return api.updateTrip(trip.id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trips/recent/10"] });
      queryClient.invalidateQueries({ queryKey: ["/api/trips/recent/50"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/profit-graph"] });
      queryClient.invalidateQueries({ queryKey: ["/api/settlements"] });
      toast({ title: "Trip updated successfully", variant: "default" });
      onOpenChange(false);
    },
    onError: (error) => {
      toast({ title: "Failed to update trip", description: error.message, variant: "destructive" });
    },
  });

  const onSubmit = (data: EditTripFormData) => {
    updateTripMutation.mutate(data);
  };

  if (!trip) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Trip Log</DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="vehicleId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Vehicle</FormLabel>
                  <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value.toString()}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a vehicle" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {vehicles.map((vehicle) => (
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
                  <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value.toString()}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a driver" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {drivers.map((driver) => (
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

            <FormField
              control={form.control}
              name="tripDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Trip Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={`w-full pl-3 text-left font-normal ${
                            !field.value && "text-muted-foreground"
                          }`}
                        >
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : (
                            <span>Pick a date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) =>
                          date > new Date() || date < new Date("1900-01-01")
                        }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="shift"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Shift</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a shift" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="morning">Morning (6 AM - 2 PM)</SelectItem>
                      <SelectItem value="evening">Evening (2 PM - 10 PM)</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="tripCount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Number of Trips</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="1"
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={updateTripMutation.isPending}
                className="flex-1"
              >
                {updateTripMutation.isPending ? "Updating..." : "Update Trip"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}