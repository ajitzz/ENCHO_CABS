import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Edit, Trash2 } from "lucide-react";
import Sidebar from "@/components/Sidebar";
import { queryClient, apiRequest } from "@/lib/queryClient";

interface Investment {
  id: number;
  investorName: string;
  amountInvested: number;
  paymentGivenDate: string;
  paymentReturnDate?: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function InvestmentsPage() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingInvestment, setEditingInvestment] = useState<Investment | null>(null);
  const [formData, setFormData] = useState({
    investorName: "",
    amountInvested: "",
    paymentGivenDate: new Date().toISOString().split('T')[0],
    paymentReturnDate: "",
  });

  const { toast } = useToast();

  const { data: investments, isLoading } = useQuery<Investment[]>({
    queryKey: ["/api/investments"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("/api/investments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/investments"] });
      setIsCreateOpen(false);
      setFormData({ 
        investorName: "", 
        amountInvested: "", 
        paymentGivenDate: new Date().toISOString().split('T')[0], 
        paymentReturnDate: "" 
      });
      toast({ title: "Success", description: "Investment created successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create investment", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      return apiRequest(`/api/investments/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/investments"] });
      setIsEditOpen(false);
      setEditingInvestment(null);
      toast({ title: "Success", description: "Investment updated successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update investment", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest(`/api/investments/${id}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/investments"] });
      toast({ title: "Success", description: "Investment deleted successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete investment", variant: "destructive" });
    },
  });

  const handleCreate = () => {
    const dataToSend = {
      investorName: formData.investorName,
      amountInvested: parseInt(formData.amountInvested),
      paymentGivenDate: formData.paymentGivenDate,
      paymentReturnDate: formData.paymentReturnDate || null,
    };
    createMutation.mutate(dataToSend);
  };

  const handleEdit = (investment: Investment) => {
    setEditingInvestment(investment);
    setFormData({
      investorName: investment.investorName,
      amountInvested: investment.amountInvested.toString(),
      paymentGivenDate: investment.paymentGivenDate,
      paymentReturnDate: investment.paymentReturnDate || "",
    });
    setIsEditOpen(true);
  };

  const handleUpdate = () => {
    if (editingInvestment) {
      const dataToSend = {
        investorName: formData.investorName,
        amountInvested: parseInt(formData.amountInvested),
        paymentGivenDate: formData.paymentGivenDate,
        paymentReturnDate: formData.paymentReturnDate || null,
      };
      updateMutation.mutate({
        id: editingInvestment.id,
        data: dataToSend,
      });
    }
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this investment?")) {
      deleteMutation.mutate(id);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN');
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 p-6 overflow-auto">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">Investment Management</h1>
            
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-add-investment">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Investment
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Investment</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="investorName">Investor Name</Label>
                    <Input
                      id="investorName"
                      data-testid="input-investor-name"
                      value={formData.investorName}
                      onChange={(e) => setFormData({ ...formData, investorName: e.target.value })}
                      placeholder="Enter investor name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="amountInvested">Amount Invested (₹)</Label>
                    <Input
                      id="amountInvested"
                      type="number"
                      data-testid="input-amount-invested"
                      value={formData.amountInvested}
                      onChange={(e) => setFormData({ ...formData, amountInvested: e.target.value })}
                      placeholder="Enter amount"
                    />
                  </div>
                  <div>
                    <Label htmlFor="paymentGivenDate">Payment Given Date</Label>
                    <Input
                      id="paymentGivenDate"
                      type="date"
                      data-testid="input-payment-given-date"
                      value={formData.paymentGivenDate}
                      onChange={(e) => setFormData({ ...formData, paymentGivenDate: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="paymentReturnDate">Payment Return Date (Optional)</Label>
                    <Input
                      id="paymentReturnDate"
                      type="date"
                      data-testid="input-payment-return-date"
                      value={formData.paymentReturnDate}
                      onChange={(e) => setFormData({ ...formData, paymentReturnDate: e.target.value })}
                    />
                  </div>
                  <Button 
                    onClick={handleCreate} 
                    className="w-full"
                    data-testid="button-create-investment"
                    disabled={createMutation.isPending}
                  >
                    {createMutation.isPending ? "Creating..." : "Create Investment"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>All Investments</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8">Loading investments...</div>
              ) : !investments || investments.length === 0 ? (
                <div className="text-center py-8 text-gray-500">No investments found. Add your first investment to get started.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Investor Name</TableHead>
                      <TableHead>Amount Invested</TableHead>
                      <TableHead>Payment Given Date</TableHead>
                      <TableHead>Payment Return Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {investments.map((investment) => (
                      <TableRow key={investment.id} data-testid={`row-investment-${investment.id}`}>
                        <TableCell className="font-medium" data-testid={`text-investor-name-${investment.id}`}>
                          {investment.investorName}
                        </TableCell>
                        <TableCell data-testid={`text-amount-${investment.id}`}>
                          {formatCurrency(investment.amountInvested)}
                        </TableCell>
                        <TableCell data-testid={`text-given-date-${investment.id}`}>
                          {formatDate(investment.paymentGivenDate)}
                        </TableCell>
                        <TableCell data-testid={`text-return-date-${investment.id}`}>
                          {investment.paymentReturnDate ? formatDate(investment.paymentReturnDate) : "-"}
                        </TableCell>
                        <TableCell>
                          <span 
                            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              investment.paymentReturnDate 
                                ? "bg-green-100 text-green-800" 
                                : "bg-yellow-100 text-yellow-800"
                            }`}
                            data-testid={`status-${investment.id}`}
                          >
                            {investment.paymentReturnDate ? "Returned" : "Active"}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(investment)}
                              data-testid={`button-edit-${investment.id}`}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDelete(investment.id)}
                              data-testid={`button-delete-${investment.id}`}
                            >
                              <Trash2 className="w-4 h-4 text-red-600" />
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

          <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit Investment</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="edit-investorName">Investor Name</Label>
                  <Input
                    id="edit-investorName"
                    value={formData.investorName}
                    onChange={(e) => setFormData({ ...formData, investorName: e.target.value })}
                    placeholder="Enter investor name"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-amountInvested">Amount Invested (₹)</Label>
                  <Input
                    id="edit-amountInvested"
                    type="number"
                    value={formData.amountInvested}
                    onChange={(e) => setFormData({ ...formData, amountInvested: e.target.value })}
                    placeholder="Enter amount"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-paymentGivenDate">Payment Given Date</Label>
                  <Input
                    id="edit-paymentGivenDate"
                    type="date"
                    value={formData.paymentGivenDate}
                    onChange={(e) => setFormData({ ...formData, paymentGivenDate: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-paymentReturnDate">Payment Return Date (Optional)</Label>
                  <Input
                    id="edit-paymentReturnDate"
                    type="date"
                    value={formData.paymentReturnDate}
                    onChange={(e) => setFormData({ ...formData, paymentReturnDate: e.target.value })}
                  />
                </div>
                <Button 
                  onClick={handleUpdate} 
                  className="w-full"
                  disabled={updateMutation.isPending}
                >
                  {updateMutation.isPending ? "Updating..." : "Update Investment"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </main>
    </div>
  );
}
