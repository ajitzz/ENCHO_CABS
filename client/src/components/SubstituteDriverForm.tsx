import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { CalendarIcon, Plus, UserPlus } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const substituteDriverSchema = z.object({
  name: z.string().min(1, "Name is required"),
  vehicleId: z.number().min(1, "Vehicle selection is required"),
  date: z.date({
    required_error: "Date is required",
  }),
  shift: z.enum(["morning", "evening"], {
    required_error: "Shift is required",
  }),
  shiftHours: z.enum(["6", "8", "12"], {
    required_error: "Shift hours are required",
  }),
});

type SubstituteDriverFormData = z.infer<typeof substituteDriverSchema>;

interface SubstituteDriverFormProps {
  vehicleId?: number | null;
  vehicles: Array<{ id: number; vehicleNumber: string; company: string }>;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export default function SubstituteDriverForm({ vehicleId, vehicles, open: externalOpen, onOpenChange }: SubstituteDriverFormProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = externalOpen !== undefined ? externalOpen : internalOpen;
  const setOpen = onOpenChange || setInternalOpen;
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<SubstituteDriverFormData>({
    resolver: zodResolver(substituteDriverSchema),
    defaultValues: {
      vehicleId: vehicleId || undefined,
      date: new Date(),
      shift: "morning",
      shiftHours: "8",
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: SubstituteDriverFormData) => {
      const shiftHours = parseInt(data.shiftHours);
      let charge: number;
      
      // Calculate charge based on hours
      switch (shiftHours) {
        case 6:
          charge = 250;
          break;
        case 8:
          charge = 350;
          break;
        case 12:
          charge = 500;
          break;
        default:
          throw new Error("Invalid shift hours");
      }

      const response = await fetch("/api/substitute-drivers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...data,
          shiftHours,
          charge,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to add substitute driver");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/substitute-drivers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/vehicles"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      toast({
        title: "Success",
        description: "Substitute driver added successfully",
      });
      form.reset();
      setOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add substitute driver",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: SubstituteDriverFormData) => {
    mutation.mutate(data);
  };

  const getChargeForHours = (hours: string) => {
    switch (hours) {
      case "6":
        return "₹250";
      case "8":
        return "₹350";
      case "12":
        return "₹500";
      default:
        return "";
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {externalOpen === undefined && (
        <DialogTrigger asChild>
          <Button variant="outline" size="sm">
            <UserPlus className="w-4 h-4 mr-2" />
            Add Substitute Driver
          </Button>
        </DialogTrigger>
      )}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Substitute Driver</DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Driver Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter substitute driver name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="vehicleId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Vehicle</FormLabel>
                  <Select 
                    onValueChange={(value) => field.onChange(parseInt(value))}
                    value={field.value?.toString() || ""}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select vehicle" />
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
              name="date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
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
                        <SelectValue placeholder="Select shift" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="morning">Morning</SelectItem>
                      <SelectItem value="evening">Evening</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="shiftHours"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Shift Hours</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select hours" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="6">6 hours (₹250)</SelectItem>
                      <SelectItem value="8">8 hours (₹350)</SelectItem>
                      <SelectItem value="12">12 hours (₹500)</SelectItem>
                    </SelectContent>
                  </Select>
                  {field.value && (
                    <p className="text-sm text-muted-foreground">
                      Charge: {getChargeForHours(field.value)}
                    </p>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={mutation.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? "Adding..." : "Add Substitute Driver"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}