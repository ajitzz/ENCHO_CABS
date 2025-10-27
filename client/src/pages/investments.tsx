import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, ArrowLeftRight, Trash2, IndianRupee } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";

interface Investment {
  id: number;
  investorName: string;
  amountInvested: number;
  paymentGivenDate: string;
  totalReturned: number;
  balance: number;
  createdAt: string;
  updatedAt: string;
}

interface InvestmentReturn {
  id: number;
  investmentId: number;
  returnDate: string;
  amountReturned: number;
  createdAt: string;
  updatedAt: string;
}

export default function InvestmentsPage() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isReturnOpen, setIsReturnOpen] = useState(false);
  const [selectedInvestment, setSelectedInvestment] = useState<Investment | null>(null);
  const [formData, setFormData] = useState({
    investorName: "",
    amountInvested: "",
    paymentGivenDate: new Date().toISOString().split('T')[0],
  });
  const [returnFormData, setReturnFormData] = useState({
    returnDate: new Date().toISOString().split('T')[0],
    amountReturned: "",
  });

  const { toast } = useToast();

  const { data: investments, isLoading } = useQuery<Investment[]>({
    queryKey: ["/api/investments"],
  });

  const { data: selectedReturns } = useQuery<InvestmentReturn[]>({
    queryKey: selectedInvestment ? [`/api/investments/${selectedInvestment.id}/returns`] : [],
    enabled: !!selectedInvestment,
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", "/api/investments", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/investments"] });
      setIsCreateOpen(false);
      setFormData({ 
        investorName: "", 
        amountInvested: "", 
        paymentGivenDate: new Date().toISOString().split('T')[0],
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

  const addReturnMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", "/api/investment-returns", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/investments"] });
      if (selectedInvestment) {
        queryClient.invalidateQueries({ queryKey: [`/api/investments/${selectedInvestment.id}/returns`] });
      }
      setIsReturnOpen(false);
      setReturnFormData({ 
        returnDate: new Date().toISOString().split('T')[0], 
        amountReturned: "" 
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

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/investments/${id}`);
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
    if (!formData.investorName || !formData.amountInvested) {
      toast({ 
        title: "Validation Error", 
        description: "Please fill all required fields", 
        variant: "destructive" 
      });
      return;
    }

    const dataToSend = {
      investorName: formData.investorName,
      amountInvested: parseInt(formData.amountInvested),
      paymentGivenDate: formData.paymentGivenDate,
    };
    createMutation.mutate(dataToSend);
  };

  const handleAddReturn = () => {
    if (!selectedInvestment || !returnFormData.amountReturned) {
      toast({ 
        title: "Validation Error", 
        description: "Please enter return amount", 
        variant: "destructive" 
      });
      return;
    }

    const amount = parseInt(returnFormData.amountReturned);
    if (amount > selectedInvestment.balance) {
      toast({ 
        title: "Validation Error", 
        description: "Return amount cannot be greater than balance", 
        variant: "destructive" 
      });
      return;
    }

    const dataToSend = {
      investmentId: selectedInvestment.id,
      returnDate: returnFormData.returnDate,
      amountReturned: amount,
    };
    addReturnMutation.mutate(dataToSend);
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

  const openReturnDialog = (investment: Investment) => {
    setSelectedInvestment(investment);
    setIsReturnOpen(true);
  };

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Investment Tracking</h1>
              <p className="text-gray-600 mt-1">Track investments and partial returns</p>
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

          {isLoading ? (
            <div className="text-center py-12">
              <div className="text-lg text-gray-600">Loading investments...</div>
            </div>
          ) : !investments || investments.length === 0 ? (
            <Card className="text-center py-12">
              <CardContent>
                <IndianRupee className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-lg text-gray-600 mb-2">No investments found</p>
                <p className="text-sm text-gray-500">Add your first investment to get started</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {investments.map((investment) => (
                <Card 
                  key={investment.id} 
                  className={`border-2 ${investment.balance === 0 ? 'border-green-200 bg-green-50' : 'border-orange-200 bg-white hover:shadow-lg'} transition-all duration-200`}
                  data-testid={`card-investment-${investment.id}`}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-2xl font-bold text-gray-900" data-testid={`text-investor-name-${investment.id}`}>
                          {investment.investorName}
                        </CardTitle>
                        <p className="text-sm text-gray-500 mt-1">
                          Started: {formatDate(investment.paymentGivenDate)}
                        </p>
                      </div>
                      <span 
                        className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${
                          investment.balance === 0
                            ? "bg-green-500 text-white" 
                            : "bg-orange-500 text-white"
                        }`}
                        data-testid={`status-${investment.id}`}
                      >
                        {investment.balance === 0 ? "Completed" : "Active"}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-gray-600">Total Investment</span>
                      </div>
                      <div className="text-3xl font-bold text-blue-900" data-testid={`text-amount-${investment.id}`}>
                        {formatCurrency(investment.amountInvested)}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                        <div className="text-xs text-gray-600 mb-1">Returned</div>
                        <div className="text-lg font-bold text-green-700" data-testid={`text-returned-${investment.id}`}>
                          {formatCurrency(investment.totalReturned)}
                        </div>
                      </div>
                      <div className={`p-3 rounded-lg border ${investment.balance > 0 ? 'bg-orange-50 border-orange-200' : 'bg-gray-50 border-gray-200'}`}>
                        <div className="text-xs text-gray-600 mb-1">Balance</div>
                        <div className={`text-lg font-bold ${investment.balance > 0 ? 'text-orange-700' : 'text-gray-500'}`} data-testid={`text-balance-${investment.id}`}>
                          {formatCurrency(investment.balance)}
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-2">
                      {investment.balance > 0 && (
                        <Button
                          variant="default"
                          size="sm"
                          className="flex-1"
                          onClick={() => openReturnDialog(investment)}
                          data-testid={`button-add-return-${investment.id}`}
                        >
                          <ArrowLeftRight className="w-4 h-4 mr-1" />
                          Add Return
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(investment.id)}
                        data-testid={`button-delete-${investment.id}`}
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          <Dialog open={isReturnOpen} onOpenChange={setIsReturnOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Return Payment</DialogTitle>
                {selectedInvestment && (
                  <p className="text-sm text-gray-600">
                    Investor: <span className="font-semibold">{selectedInvestment.investorName}</span> | 
                    Balance: <span className="font-semibold">{formatCurrency(selectedInvestment.balance)}</span>
                  </p>
                )}
              </DialogHeader>
              <div className="space-y-4">
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
                  {selectedInvestment && (
                    <p className="text-xs text-gray-500 mt-1">
                      Maximum: {formatCurrency(selectedInvestment.balance)}
                    </p>
                  )}
                </div>

                {selectedReturns && selectedReturns.length > 0 && (
                  <div className="border-t pt-4">
                    <h4 className="text-sm font-semibold mb-2">Previous Returns</h4>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {selectedReturns.map((ret) => (
                        <div key={ret.id} className="flex justify-between text-sm bg-gray-50 p-2 rounded">
                          <span className="text-gray-600">{formatDate(ret.returnDate)}</span>
                          <span className="font-semibold text-green-700">{formatCurrency(ret.amountReturned)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

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
        </div>
      </div>
  );
}
