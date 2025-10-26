import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Edit, Trash2, Home } from "lucide-react";
import Sidebar from "@/components/Sidebar";

interface Driver {
  id: number;
  name: string;
  phone: string;
  qrCode?: string;
  hasAccommodation: boolean;
  joinedDate: string;
  dismissDate?: string;
  createdAt: string;
  updatedAt: string;
}

export default function DriversPage() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    qrCode: "",
    hasAccommodation: false,
    joinedDate: new Date().toISOString().split('T')[0],
    dismissDate: "",
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: drivers, isLoading } = useQuery<Driver[]>({
    queryKey: ["/api/drivers"],
  });

  const createMutation = useMutation({
    mutationFn: api.createDriver,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/drivers"] });
      setIsCreateOpen(false);
      setFormData({ name: "", phone: "", qrCode: "", hasAccommodation: false, joinedDate: new Date().toISOString().split('T')[0], dismissDate: "" });
      toast({ title: "Success", description: "Driver created successfully" });
    },
    onError: (error: any) => {
      console.error("Create driver error:", error);
      let errorMessage = "Failed to create driver";
      
      // Try to get detailed error message from server response
      if (error.message) {
        if (error.message.includes("ID sequence needs to be reset")) {
          errorMessage = "Database error. Please refresh the page and try again.";
        } else if (error.message.includes("duplicate")) {
          errorMessage = "A driver with this information already exists.";
        } else {
          errorMessage = error.message;
        }
      }
      
      toast({ 
        title: "Error", 
        description: errorMessage, 
        variant: "destructive" 
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Driver> }) => api.updateDriver(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/drivers"] });
      setIsEditOpen(false);
      setEditingDriver(null);
      toast({ title: "Success", description: "Driver updated successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update driver", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: api.deleteDriver,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/drivers"] });
      toast({ title: "Success", description: "Driver deleted successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete driver", variant: "destructive" });
    },
  });

  const handleCreate = () => {
    const dataToSend = {
      name: formData.name,
      phone: formData.phone,
      qrCode: formData.qrCode || undefined,
      hasAccommodation: formData.hasAccommodation,
      joinedDate: formData.joinedDate,
    };
    createMutation.mutate(dataToSend);
  };

  const handleEdit = (driver: Driver) => {
    setEditingDriver(driver);
    setFormData({
      name: driver.name,
      phone: driver.phone,
      qrCode: driver.qrCode || "",
      hasAccommodation: driver.hasAccommodation,
      joinedDate: driver.joinedDate,
      dismissDate: driver.dismissDate || "",
    });
    setIsEditOpen(true);
  };

  const handleUpdate = () => {
    if (editingDriver) {
      const dataToSend = {
        name: formData.name,
        phone: formData.phone,
        qrCode: formData.qrCode || undefined,
        hasAccommodation: formData.hasAccommodation,
        joinedDate: formData.joinedDate,
        dismissDate: formData.dismissDate || null,
      };
      updateMutation.mutate({
        id: editingDriver.id,
        data: dataToSend,
      });
    }
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this driver?")) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <main className="flex-1 p-6 overflow-auto">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">Driver Management</h1>
            
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Driver
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Driver</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name">Driver Name</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g., Rajesh Kumar"
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="e.g., 9876543210"
                    />
                  </div>
                  <div>
                    <Label htmlFor="qrCode">QR Code (Optional)</Label>
                    <Input
                      id="qrCode"
                      value={formData.qrCode}
                      onChange={(e) => setFormData({ ...formData, qrCode: e.target.value })}
                      placeholder="e.g., QR12345678"
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="hasAccommodation"
                      checked={formData.hasAccommodation}
                      onCheckedChange={(checked) => setFormData({ ...formData, hasAccommodation: checked })}
                    />
                    <Label htmlFor="hasAccommodation" className="flex items-center space-x-2">
                      <Home className="w-4 h-4" />
                      <span>Has Accommodation</span>
                    </Label>
                  </div>
                  <div>
                    <Label htmlFor="joinedDate">Joined Date</Label>
                    <Input
                      id="joinedDate"
                      type="date"
                      value={formData.joinedDate}
                      onChange={(e) => setFormData({ ...formData, joinedDate: e.target.value })}
                      required
                    />
                  </div>
                  <Button onClick={handleCreate} disabled={createMutation.isPending} className="w-full">
                    {createMutation.isPending ? "Creating..." : "Create Driver"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>All Drivers</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div>Loading drivers...</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>QR Code</TableHead>
                      <TableHead>Accommodation</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead>Dismiss</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {drivers?.map((driver) => (
                      <TableRow key={driver.id}>
                        <TableCell className="font-medium">{driver.name}</TableCell>
                        <TableCell>{driver.phone}</TableCell>
                        <TableCell>
                          {driver.qrCode ? (
                            <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm font-mono">
                              {driver.qrCode}
                            </span>
                          ) : (
                            <span className="text-gray-400 text-sm">No QR Code</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            {driver.hasAccommodation ? (
                              <>
                                <Home className="w-4 h-4 text-green-600" />
                                <span className="text-green-600">Yes</span>
                              </>
                            ) : (
                              <span className="text-gray-500">No</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{driver.joinedDate ? new Date(driver.joinedDate).toLocaleDateString() : "-"}</TableCell>
                        <TableCell>{driver.dismissDate ? new Date(driver.dismissDate).toLocaleDateString() : "-"}</TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(driver)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDelete(driver.id)}
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
                <DialogTitle>Edit Driver</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="editName">Driver Name</Label>
                  <Input
                    id="editName"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="editPhone">Phone Number</Label>
                  <Input
                    id="editPhone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="editQrCode">QR Code (Optional)</Label>
                  <Input
                    id="editQrCode"
                    value={formData.qrCode}
                    onChange={(e) => setFormData({ ...formData, qrCode: e.target.value })}
                    placeholder="e.g., QR12345678"
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="editHasAccommodation"
                    checked={formData.hasAccommodation}
                    onCheckedChange={(checked) => setFormData({ ...formData, hasAccommodation: checked })}
                  />
                  <Label htmlFor="editHasAccommodation" className="flex items-center space-x-2">
                    <Home className="w-4 h-4" />
                    <span>Has Accommodation</span>
                  </Label>
                </div>
                <div>
                  <Label htmlFor="editJoinedDate">Joined Date</Label>
                  <Input
                    id="editJoinedDate"
                    type="date"
                    value={formData.joinedDate}
                    onChange={(e) => setFormData({ ...formData, joinedDate: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="editDismissDate">Dismiss Date (Optional)</Label>
                  <Input
                    id="editDismissDate"
                    type="date"
                    value={formData.dismissDate}
                    onChange={(e) => setFormData({ ...formData, dismissDate: e.target.value })}
                  />
                </div>
                <Button onClick={handleUpdate} disabled={updateMutation.isPending} className="w-full">
                  {updateMutation.isPending ? "Updating..." : "Update Driver"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </main>
    </div>
  );
}