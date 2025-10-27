import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Edit, Trash2 } from "lucide-react";
import Sidebar from "@/components/Sidebar";

interface Vehicle {
  id: number;
  vehicleNumber: string;
  qrCode?: string;
  company: "PMV" | "Letzryd";
  purchasedDate: string;
  droppedDate?: string;
  createdAt: string;
  updatedAt: string;
}

export default function VehiclesPage() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [formData, setFormData] = useState({
    vehicleNumber: "",
    qrCode: "",
    company: "PMV" as "PMV" | "Letzryd",
    purchasedDate: new Date().toISOString().split('T')[0],
    droppedDate: "",
  });
  
  // Confirmation dialog states
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [updateConfirm, setUpdateConfirm] = useState(false);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: vehicles, isLoading } = useQuery<Vehicle[]>({
    queryKey: ["/api/vehicles"],
  });

  const createMutation = useMutation({
    mutationFn: api.createVehicle,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vehicles"] });
      setIsCreateOpen(false);
      setFormData({ vehicleNumber: "", qrCode: "", company: "PMV", purchasedDate: new Date().toISOString().split('T')[0], droppedDate: "" });
      toast({ title: "Success", description: "Vehicle created successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create vehicle", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Vehicle> }) => api.updateVehicle(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vehicles"] });
      setIsEditOpen(false);
      setEditingVehicle(null);
      toast({ title: "Success", description: "Vehicle updated successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update vehicle", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: api.deleteVehicle,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vehicles"] });
      toast({ title: "Success", description: "Vehicle deleted successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete vehicle", variant: "destructive" });
    },
  });

  const handleCreate = () => {
    const dataToSend = {
      vehicleNumber: formData.vehicleNumber,
      qrCode: formData.qrCode || undefined,
      company: formData.company,
      purchasedDate: formData.purchasedDate,
    };
    createMutation.mutate(dataToSend);
  };

  const handleEdit = (vehicle: Vehicle) => {
    setEditingVehicle(vehicle);
    setFormData({
      vehicleNumber: vehicle.vehicleNumber,
      qrCode: vehicle.qrCode || "",
      company: vehicle.company,
      purchasedDate: vehicle.purchasedDate,
      droppedDate: vehicle.droppedDate || "",
    });
    setIsEditOpen(true);
  };

  const handleUpdate = () => {
    if (editingVehicle) {
      setUpdateConfirm(true);
    }
  };

  const confirmUpdate = () => {
    if (editingVehicle) {
      const dataToSend = {
        ...formData,
        qrCode: formData.qrCode || undefined,
        droppedDate: formData.droppedDate || null,
      };
      updateMutation.mutate({
        id: editingVehicle.id,
        data: dataToSend,
      });
      setUpdateConfirm(false);
    }
  };

  const handleDelete = (id: number) => {
    setDeleteConfirm(id);
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <main className="flex-1 p-6 overflow-auto">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">Vehicle Management</h1>
            
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Vehicle
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Vehicle</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="vehicleNumber">Vehicle Number</Label>
                    <Input
                      id="vehicleNumber"
                      value={formData.vehicleNumber}
                      onChange={(e) => setFormData({ ...formData, vehicleNumber: e.target.value })}
                      placeholder="e.g., KA-01-AB-1234"
                    />
                  </div>
                  <div>
                    <Label htmlFor="qrCode">QR Code Number</Label>
                    <Input
                      id="qrCode"
                      value={formData.qrCode}
                      onChange={(e) => setFormData({ ...formData, qrCode: e.target.value })}
                      placeholder="e.g., QR123456"
                    />
                  </div>
                  <div>
                    <Label htmlFor="company">Company</Label>
                    <Select value={formData.company} onValueChange={(value: "PMV" | "Letzryd") => setFormData({ ...formData, company: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PMV">PMV</SelectItem>
                        <SelectItem value="Letzryd">Letzryd</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="purchasedDate">Purchased Date</Label>
                    <Input
                      id="purchasedDate"
                      type="date"
                      value={formData.purchasedDate}
                      onChange={(e) => setFormData({ ...formData, purchasedDate: e.target.value })}
                      required
                    />
                  </div>
                  <Button onClick={handleCreate} disabled={createMutation.isPending} className="w-full">
                    {createMutation.isPending ? "Creating..." : "Create Vehicle"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>All Vehicles</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div>Loading vehicles...</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Vehicle Number</TableHead>
                      <TableHead>QR Code</TableHead>
                      <TableHead>Company</TableHead>
                      <TableHead>Purchased</TableHead>
                      <TableHead>Dropped</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {vehicles?.map((vehicle) => (
                      <TableRow key={vehicle.id}>
                        <TableCell className="font-medium">{vehicle.vehicleNumber}</TableCell>
                        <TableCell className="text-blue-600 font-mono">{vehicle.qrCode || "Not Set"}</TableCell>
                        <TableCell>{vehicle.company}</TableCell>
                        <TableCell>{vehicle.purchasedDate ? new Date(vehicle.purchasedDate).toLocaleDateString() : "-"}</TableCell>
                        <TableCell>{vehicle.droppedDate ? new Date(vehicle.droppedDate).toLocaleDateString() : "-"}</TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(vehicle)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDelete(vehicle.id)}
                              disabled={deleteMutation.isPending}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Edit Dialog */}
          <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit Vehicle</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="editVehicleNumber">Vehicle Number</Label>
                  <Input
                    id="editVehicleNumber"
                    value={formData.vehicleNumber}
                    onChange={(e) => setFormData({ ...formData, vehicleNumber: e.target.value })}
                    placeholder="e.g., KA-01-AB-1234"
                  />
                </div>
                <div>
                  <Label htmlFor="editQrCode">QR Code Number</Label>
                  <Input
                    id="editQrCode"
                    value={formData.qrCode}
                    onChange={(e) => setFormData({ ...formData, qrCode: e.target.value })}
                    placeholder="e.g., QR123456"
                  />
                </div>
                <div>
                  <Label htmlFor="editCompany">Company</Label>
                  <Select value={formData.company} onValueChange={(value: "PMV" | "Letzryd") => setFormData({ ...formData, company: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PMV">PMV</SelectItem>
                      <SelectItem value="Letzryd">Letzryd</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="editPurchasedDate">Purchased Date</Label>
                  <Input
                    id="editPurchasedDate"
                    type="date"
                    value={formData.purchasedDate}
                    onChange={(e) => setFormData({ ...formData, purchasedDate: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="editDroppedDate">Dropped Date (Optional)</Label>
                  <Input
                    id="editDroppedDate"
                    type="date"
                    value={formData.droppedDate}
                    onChange={(e) => setFormData({ ...formData, droppedDate: e.target.value })}
                  />
                </div>
                <Button onClick={handleUpdate} disabled={updateMutation.isPending} className="w-full">
                  {updateMutation.isPending ? "Updating..." : "Update Vehicle"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Confirmation Dialogs */}
          <AlertDialog open={deleteConfirm !== null} onOpenChange={() => setDeleteConfirm(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Confirm Delete Vehicle</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete this vehicle? This action cannot be undone and will remove the vehicle from the database.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => {
                    if (deleteConfirm) {
                      deleteMutation.mutate(deleteConfirm);
                      setDeleteConfirm(null);
                    }
                  }}
                  className="bg-red-600 hover:bg-red-700"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <AlertDialog open={updateConfirm} onOpenChange={setUpdateConfirm}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Confirm Update Vehicle</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to update this vehicle's information? This will modify the vehicle details in the database.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={confirmUpdate}>
                  Update
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </main>
    </div>
  );
}