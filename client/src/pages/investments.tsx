import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, ArrowLeftRight, Trash2, IndianRupee, Edit } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";

interface InvestmentRecord {
  id: number;
  investorName: string;
  amountInvested: number;
  paymentGivenDate: string;
  paymentMethod?: string;
  createdAt: string;
  updatedAt: string;
}

interface InvestmentReturn {
  id: number;
  investmentId: number;
  returnDate: string;
  amountReturned: number;
  paymentMethod?: string;
  investmentDate: string;
  createdAt: string;
  updatedAt: string;
}

interface InvestorGroup {
  investorName: string;
  investments: InvestmentRecord[];
  returns: InvestmentReturn[];
  totalInvested: number;
  totalReturned: number;
  balance: number;
}

export default function InvestmentsPage() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isAddMoreOpen, setIsAddMoreOpen] = useState(false);
  const [isReturnOpen, setIsReturnOpen] = useState(false);
  const [isEditReturnOpen, setIsEditReturnOpen] = useState(false);
  const [selectedInvestorGroup, setSelectedInvestorGroup] = useState<InvestorGroup | null>(null);
  const [selectedReturn, setSelectedReturn] = useState<InvestmentReturn | null>(null);
  
  const [formData, setFormData] = useState({
    investorName: "",
    amountInvested: "",
    paymentGivenDate: new Date().toISOString().split('T')[0],
    paymentMethod: "",
  });
  
  const [addMoreFormData, setAddMoreFormData] = useState({
    paymentGivenDate: new Date().toISOString().split('T')[0],
    amountInvested: "",
    paymentMethod: "",
  });

  const [returnFormData, setReturnFormData] = useState({
    investmentId: "",
    returnDate: new Date().toISOString().split('T')[0],
    amountReturned: "",
    paymentMethod: "",
  });

  const [editReturnFormData, setEditReturnFormData] = useState({
    returnDate: "",
    amountReturned: "",
    paymentMethod: "",
  });

  const { toast } = useToast();

  const { data: investors, isLoading } = useQuery<InvestorGroup[]>({
    queryKey: ["/api/investments/by-investor"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", "/api/investments", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/investments/by-investor"] });
      setIsCreateOpen(false);
      setFormData({ 
        investorName: "", 
        amountInvested: "", 
        paymentGivenDate: new Date().toISOString().split('T')[0],
        paymentMethod: "",
      });
      toast({ title: "Success", description: "Investment created successfully" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to create investment", 
        variant: "destructive" 
      });
    },
  });

  const addMoreMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", "/api/investments", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/investments/by-investor"] });
      setIsAddMoreOpen(false);
      setAddMoreFormData({ 
        paymentGivenDate: new Date().toISOString().split('T')[0],
        amountInvested: "",
        paymentMethod: "",
      });
      toast({ title: "Success", description: "Investment added successfully" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to add investment", 
        variant: "destructive" 
      });
    },
  });

  const addReturnMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", "/api/investment-returns", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/investments/by-investor"] });
      setIsReturnOpen(false);
      setReturnFormData({ 
        investmentId: "",
        returnDate: new Date().toISOString().split('T')[0], 
        amountReturned: "",
        paymentMethod: "",
      });
      toast({ title: "Success", description: "Return payment added successfully" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to add return payment", 
        variant: "destructive" 
      });
    },
  });

  const editReturnMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      return apiRequest("PUT", `/api/investment-returns/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/investments/by-investor"] });
      setIsEditReturnOpen(false);
      setSelectedReturn(null);
      toast({ title: "Success", description: "Return payment updated successfully" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to update return payment", 
        variant: "destructive" 
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/investments/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/investments/by-investor"] });
      toast({ title: "Success", description: "Investment deleted successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete investment", variant: "destructive" });
    },
  });

  const handleCreate = () => {
    if (!formData.investorName || !formData.amountInvested || !formData.paymentGivenDate) {
      toast({ 
        title: "Validation Error", 
        description: "Please fill all required fields", 
        variant: "destructive" 
      });
      return;
    }

    // Check if investor name already exists
    if (investors && investors.some(inv => inv.investorName.toLowerCase() === formData.investorName.toLowerCase())) {
      toast({ 
        title: "Investor Already Exists", 
        description: `An investor named "${formData.investorName}" already exists. Please use the "Add Investment" button in their card to add more investments.`, 
        variant: "destructive" 
      });
      return;
    }

    const dataToSend = {
      investorName: formData.investorName,
      amountInvested: parseInt(formData.amountInvested),
      paymentGivenDate: formData.paymentGivenDate,
      paymentMethod: formData.paymentMethod || undefined,
    };
    createMutation.mutate(dataToSend);
  };

  const handleAddReturn = () => {
    if (!returnFormData.investmentId || !returnFormData.amountReturned || !returnFormData.returnDate) {
      toast({ 
        title: "Validation Error", 
        description: "Please fill all required fields (Investment, Date, and Amount)", 
        variant: "destructive" 
      });
      return;
    }

    const dataToSend = {
      investmentId: parseInt(returnFormData.investmentId),
      returnDate: returnFormData.returnDate,
      amountReturned: parseInt(returnFormData.amountReturned),
      paymentMethod: returnFormData.paymentMethod || undefined,
    };
    addReturnMutation.mutate(dataToSend);
  };

  const handleEditReturn = () => {
    if (!selectedReturn || !editReturnFormData.amountReturned || !editReturnFormData.returnDate) {
      toast({ 
        title: "Validation Error", 
        description: "Please fill all required fields (Date and Amount)", 
        variant: "destructive" 
      });
      return;
    }

    const dataToSend = {
      returnDate: editReturnFormData.returnDate,
      amountReturned: parseInt(editReturnFormData.amountReturned),
      paymentMethod: editReturnFormData.paymentMethod || undefined,
    };
    editReturnMutation.mutate({ id: selectedReturn.id, data: dataToSend });
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

  const handleAddMore = () => {
    if (!selectedInvestorGroup || !addMoreFormData.amountInvested || !addMoreFormData.paymentGivenDate) {
      toast({ 
        title: "Validation Error", 
        description: "Please fill all required fields (Date and Amount)", 
        variant: "destructive" 
      });
      return;
    }

    const dataToSend = {
      investorName: selectedInvestorGroup.investorName,
      amountInvested: parseInt(addMoreFormData.amountInvested),
      paymentGivenDate: addMoreFormData.paymentGivenDate,
      paymentMethod: addMoreFormData.paymentMethod || undefined,
    };
    addMoreMutation.mutate(dataToSend);
  };

  const openAddMoreDialog = (investorGroup: InvestorGroup) => {
    setSelectedInvestorGroup(investorGroup);
    setIsAddMoreOpen(true);
  };

  const openReturnDialog = (investorGroup: InvestorGroup) => {
    setSelectedInvestorGroup(investorGroup);
    setIsReturnOpen(true);
  };

  const openEditReturnDialog = (ret: InvestmentReturn) => {
    setSelectedReturn(ret);
    setEditReturnFormData({
      returnDate: ret.returnDate,
      amountReturned: ret.amountReturned.toString(),
      paymentMethod: ret.paymentMethod || "",
    });
    setIsEditReturnOpen(true);
  };

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Investment Tracking</h1>
              <p className="text-gray-600 mt-1">Track investments grouped by investor</p>
            </div>
            
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button size="lg" data-testid="button-add-investment">
                  <Plus className="w-5 h-5 mr-2" />
                  New Investment
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Investment</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="investorName">Investor Name*</Label>
                    <Input
                      id="investorName"
                      data-testid="input-investor-name"
                      value={formData.investorName}
                      onChange={(e) => setFormData({ ...formData, investorName: e.target.value })}
                      placeholder="Enter investor name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="amountInvested">Amount Invested (₹)*</Label>
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
                    <Label htmlFor="paymentGivenDate">Payment Given Date*</Label>
                    <Input
                      id="paymentGivenDate"
                      type="date"
                      data-testid="input-payment-given-date"
                      value={formData.paymentGivenDate}
                      onChange={(e) => setFormData({ ...formData, paymentGivenDate: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="paymentMethod">Payment Method</Label>
                    <Input
                      id="paymentMethod"
                      data-testid="input-payment-method"
                      value={formData.paymentMethod}
                      onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                      placeholder="e.g., Cash, Bank Transfer, UPI"
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

          {/* Summary Cards */}
          {investors && investors.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="border border-gray-200 shadow-sm">
                <CardContent className="pt-6">
                  <h3 className="text-lg font-semibold text-gray-700 mb-2">Total Investment</h3>
                  <div className="text-4xl font-bold text-gray-900" data-testid="text-total-investment-all">
                    {formatCurrency(investors.reduce((sum, inv) => sum + inv.totalInvested, 0))}
                  </div>
                </CardContent>
              </Card>

              <Card className="border border-gray-200 shadow-sm">
                <CardContent className="pt-6">
                  <h3 className="text-lg font-semibold text-gray-700 mb-2">Total Returned</h3>
                  <div className="text-4xl font-bold text-gray-900" data-testid="text-total-returned-all">
                    {formatCurrency(investors.reduce((sum, inv) => sum + inv.totalReturned, 0))}
                  </div>
                </CardContent>
              </Card>

              <Card className="border border-gray-200 shadow-sm">
                <CardContent className="pt-6">
                  <h3 className="text-lg font-semibold text-gray-700 mb-2">Remaining Amount</h3>
                  <div className="text-4xl font-bold text-gray-900" data-testid="text-remaining-amount-all">
                    {formatCurrency(investors.reduce((sum, inv) => sum + inv.balance, 0))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {isLoading ? (
            <div className="text-center py-12">
              <div className="text-lg text-gray-600">Loading investments...</div>
            </div>
          ) : !investors || investors.length === 0 ? (
            <Card className="text-center py-12">
              <CardContent>
                <IndianRupee className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-lg text-gray-600 mb-2">No investments found</p>
                <p className="text-sm text-gray-500">Add your first investment to get started</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {investors.map((investor) => (
                <Card 
                  key={investor.investorName} 
                  className={`border-2 ${investor.balance === 0 ? 'border-green-300 bg-gradient-to-br from-green-50 to-white' : 'border-blue-300 bg-gradient-to-br from-blue-50 to-white'} shadow-lg`}
                  data-testid={`card-investor-${investor.investorName}`}
                >
                  <CardHeader className="pb-4 bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-t-lg">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-3xl font-bold" data-testid={`text-investor-${investor.investorName}`}>
                          {investor.investorName}
                        </CardTitle>
                        <div className="grid grid-cols-3 gap-4 mt-4">
                          <div className="bg-white/20 p-3 rounded-lg backdrop-blur-sm">
                            <div className="text-xs opacity-90">Total Invested</div>
                            <div className="text-2xl font-bold" data-testid={`text-total-invested-${investor.investorName}`}>
                              {formatCurrency(investor.totalInvested)}
                            </div>
                          </div>
                          <div className="bg-white/20 p-3 rounded-lg backdrop-blur-sm">
                            <div className="text-xs opacity-90">Total Returned</div>
                            <div className="text-2xl font-bold" data-testid={`text-total-returned-${investor.investorName}`}>
                              {formatCurrency(investor.totalReturned)}
                            </div>
                          </div>
                          <div className="bg-white/20 p-3 rounded-lg backdrop-blur-sm">
                            <div className="text-xs opacity-90">Balance</div>
                            <div className="text-2xl font-bold" data-testid={`text-balance-${investor.investorName}`}>
                              {formatCurrency(investor.balance)}
                            </div>
                          </div>
                        </div>
                      </div>
                      <span 
                        className={`inline-flex px-4 py-2 text-sm font-semibold rounded-full ml-4 ${
                          investor.balance === 0
                            ? "bg-green-500 text-white" 
                            : "bg-orange-500 text-white"
                        }`}
                        data-testid={`status-${investor.investorName}`}
                      >
                        {investor.balance === 0 ? "Completed" : "Active"}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-6 space-y-6">
                    {/* Investment History */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                          <span className="bg-blue-600 text-white px-3 py-1 rounded-full text-sm mr-2">
                            {investor.investments.length}
                          </span>
                          Investment History
                        </h3>
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => openAddMoreDialog(investor)}
                          data-testid={`button-add-more-investment-${investor.investorName}`}
                        >
                          <Plus className="w-4 h-4 mr-1" />
                          Add Investment
                        </Button>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b-2 border-gray-200 bg-gray-50">
                              <th className="text-left p-3 text-sm font-semibold text-gray-700">Date</th>
                              <th className="text-left p-3 text-sm font-semibold text-gray-700">Amount</th>
                              <th className="text-left p-3 text-sm font-semibold text-gray-700">Payment Method</th>
                              <th className="text-left p-3 text-sm font-semibold text-gray-700">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {investor.investments.map((inv) => (
                              <tr key={inv.id} className="border-b border-gray-100 hover:bg-gray-50">
                                <td className="p-3 text-sm text-gray-900">{formatDate(inv.paymentGivenDate)}</td>
                                <td className="p-3 text-sm font-semibold text-blue-700">{formatCurrency(inv.amountInvested)}</td>
                                <td className="p-3 text-sm text-gray-600">{inv.paymentMethod || '-'}</td>
                                <td className="p-3">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => deleteMutation.mutate(inv.id)}
                                    data-testid={`button-delete-investment-${inv.id}`}
                                  >
                                    <Trash2 className="w-4 h-4 text-red-600" />
                                  </Button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Return History */}
                    {investor.returns.length > 0 && (
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                          <span className="bg-green-600 text-white px-3 py-1 rounded-full text-sm mr-2">
                            {investor.returns.length}
                          </span>
                          Return History
                        </h3>
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead>
                              <tr className="border-b-2 border-gray-200 bg-gray-50">
                                <th className="text-left p-3 text-sm font-semibold text-gray-700">Return Date</th>
                                <th className="text-left p-3 text-sm font-semibold text-gray-700">Amount Returned</th>
                                <th className="text-left p-3 text-sm font-semibold text-gray-700">Payment Method</th>
                                <th className="text-left p-3 text-sm font-semibold text-gray-700">Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {investor.returns.map((ret) => (
                                <tr key={ret.id} className="border-b border-gray-100 hover:bg-gray-50">
                                  <td className="p-3 text-sm text-gray-900">{formatDate(ret.returnDate)}</td>
                                  <td className="p-3 text-sm font-semibold text-green-700">{formatCurrency(ret.amountReturned)}</td>
                                  <td className="p-3 text-sm text-gray-600">{ret.paymentMethod || '-'}</td>
                                  <td className="p-3">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => openEditReturnDialog(ret)}
                                      data-testid={`button-edit-return-${ret.id}`}
                                    >
                                      <Edit className="w-4 h-4 text-blue-600" />
                                    </Button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* Add Return Button */}
                    {investor.balance > 0 && (
                      <div className="pt-4 border-t">
                        <Button
                          variant="default"
                          size="lg"
                          className="w-full"
                          onClick={() => openReturnDialog(investor)}
                          data-testid={`button-add-return-${investor.investorName}`}
                        >
                          <ArrowLeftRight className="w-5 h-5 mr-2" />
                          Add Return Payment
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Add Return Dialog */}
          <Dialog open={isReturnOpen} onOpenChange={setIsReturnOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Return Payment</DialogTitle>
                {selectedInvestorGroup && (
                  <p className="text-sm text-gray-600">
                    Investor: <span className="font-semibold">{selectedInvestorGroup.investorName}</span> | 
                    Balance: <span className="font-semibold">{formatCurrency(selectedInvestorGroup.balance)}</span>
                  </p>
                )}
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="investmentId">Select Investment*</Label>
                  <select
                    id="investmentId"
                    className="w-full border rounded-md p-2"
                    value={returnFormData.investmentId}
                    onChange={(e) => setReturnFormData({ ...returnFormData, investmentId: e.target.value })}
                  >
                    <option value="">Select an investment</option>
                    {selectedInvestorGroup?.investments.map((inv) => (
                      <option key={inv.id} value={inv.id}>
                        {formatDate(inv.paymentGivenDate)} - {formatCurrency(inv.amountInvested)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="returnDate">Return Date*</Label>
                  <Input
                    id="returnDate"
                    type="date"
                    value={returnFormData.returnDate}
                    onChange={(e) => setReturnFormData({ ...returnFormData, returnDate: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="amountReturned">Amount Returned (₹)*</Label>
                  <Input
                    id="amountReturned"
                    type="number"
                    value={returnFormData.amountReturned}
                    onChange={(e) => setReturnFormData({ ...returnFormData, amountReturned: e.target.value })}
                    placeholder="Enter amount to return"
                  />
                </div>
                <div>
                  <Label htmlFor="returnPaymentMethod">Payment Method</Label>
                  <Input
                    id="returnPaymentMethod"
                    value={returnFormData.paymentMethod}
                    onChange={(e) => setReturnFormData({ ...returnFormData, paymentMethod: e.target.value })}
                    placeholder="e.g., Cash, Bank Transfer, UPI"
                  />
                </div>

                <Button 
                  onClick={handleAddReturn} 
                  className="w-full"
                  disabled={addReturnMutation.isPending}
                >
                  {addReturnMutation.isPending ? "Adding..." : "Add Return Payment"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Edit Return Dialog */}
          <Dialog open={isEditReturnOpen} onOpenChange={setIsEditReturnOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit Return Payment</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="editReturnDate">Return Date*</Label>
                  <Input
                    id="editReturnDate"
                    type="date"
                    value={editReturnFormData.returnDate}
                    onChange={(e) => setEditReturnFormData({ ...editReturnFormData, returnDate: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="editAmountReturned">Amount Returned (₹)*</Label>
                  <Input
                    id="editAmountReturned"
                    type="number"
                    value={editReturnFormData.amountReturned}
                    onChange={(e) => setEditReturnFormData({ ...editReturnFormData, amountReturned: e.target.value })}
                    placeholder="Enter amount"
                  />
                </div>
                <div>
                  <Label htmlFor="editPaymentMethod">Payment Method</Label>
                  <Input
                    id="editPaymentMethod"
                    value={editReturnFormData.paymentMethod}
                    onChange={(e) => setEditReturnFormData({ ...editReturnFormData, paymentMethod: e.target.value })}
                    placeholder="e.g., Cash, Bank Transfer, UPI"
                  />
                </div>

                <Button 
                  onClick={handleEditReturn} 
                  className="w-full"
                  disabled={editReturnMutation.isPending}
                >
                  {editReturnMutation.isPending ? "Updating..." : "Update Return Payment"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Add More Investment Dialog */}
          <Dialog open={isAddMoreOpen} onOpenChange={setIsAddMoreOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add More Investment</DialogTitle>
                {selectedInvestorGroup && (
                  <p className="text-sm text-gray-600">
                    Investor: <span className="font-semibold">{selectedInvestorGroup.investorName}</span>
                  </p>
                )}
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="addMoreDate">Date of Investment*</Label>
                  <Input
                    id="addMoreDate"
                    type="date"
                    value={addMoreFormData.paymentGivenDate}
                    onChange={(e) => setAddMoreFormData({ ...addMoreFormData, paymentGivenDate: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="addMoreAmount">Investment Amount (₹)*</Label>
                  <Input
                    id="addMoreAmount"
                    type="number"
                    value={addMoreFormData.amountInvested}
                    onChange={(e) => setAddMoreFormData({ ...addMoreFormData, amountInvested: e.target.value })}
                    placeholder="Enter amount"
                  />
                </div>
                <div>
                  <Label htmlFor="addMorePaymentMethod">Payment Method</Label>
                  <Input
                    id="addMorePaymentMethod"
                    value={addMoreFormData.paymentMethod}
                    onChange={(e) => setAddMoreFormData({ ...addMoreFormData, paymentMethod: e.target.value })}
                    placeholder="e.g., Cash, Bank Transfer, UPI"
                  />
                </div>

                <Button 
                  onClick={handleAddMore} 
                  className="w-full"
                  disabled={addMoreMutation.isPending}
                >
                  {addMoreMutation.isPending ? "Adding..." : "Add Investment"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
  );
}
