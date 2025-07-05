import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

export default function UnpaidRentsPanel() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: unpaidRents, isLoading } = useQuery({
    queryKey: ["/api/driver-rent-logs/unpaid"],
    queryFn: () => api.getUnpaidRents(),
  });

  const markAsPaidMutation = useMutation({
    mutationFn: (id: number) => api.updateRentStatus(id, true),
    onSuccess: () => {
      // Invalidate all related queries for complete responsiveness
      queryClient.invalidateQueries({ queryKey: ["/api/driver-rent-logs/unpaid"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/profit-graph"] });
      queryClient.invalidateQueries({ queryKey: ["/api/settlements"] });
      queryClient.invalidateQueries({ queryKey: ["/api/vehicles"] });
      // Invalidate all vehicle summaries for precise profit calculations
      queryClient.invalidateQueries({ 
        predicate: (query) => query.queryKey[0] === "/api/vehicles" && query.queryKey[2] === "weekly-summary"
      });
      toast({
        title: "Success",
        description: "Rent marked as paid - calculations updated",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update rent status",
        variant: "destructive",
      });
    },
  });

  const totalUnpaid = unpaidRents?.reduce((sum, rent) => sum + rent.rent, 0) || 0;

  const getDaysOverdue = (date: string) => {
    const rentDate = new Date(date);
    const today = new Date();
    const diffTime = today.getTime() - rentDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getOverdueStatus = (daysOverdue: number) => {
    if (daysOverdue <= 0) return { text: "Due today", color: "bg-yellow-50" };
    if (daysOverdue === 1) return { text: "1 day overdue", color: "bg-yellow-50" };
    if (daysOverdue <= 3) return { text: `${daysOverdue} days overdue`, color: "bg-red-50" };
    return { text: `${daysOverdue} days overdue`, color: "bg-red-50" };
  };

  if (isLoading) {
    return <div className="animate-pulse h-96 bg-gray-200 rounded-xl"></div>;
  }

  return (
    <Card className="rounded-xl shadow-sm border border-gray-200">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-gray-900">Unpaid Rents</CardTitle>
          <Badge variant="destructive" className="bg-red-100 text-red-800">
            ₹{totalUnpaid.toLocaleString()} Total
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {unpaidRents && unpaidRents.length > 0 ? (
            unpaidRents.slice(0, 4).map((rent) => {
              const daysOverdue = getDaysOverdue(rent.date);
              const overdueStatus = getOverdueStatus(daysOverdue);
              
              return (
                <div key={rent.id} className={`flex items-center justify-between p-3 ${overdueStatus.color} rounded-lg`}>
                  <div>
                    <p className="font-medium text-gray-900">{rent.driverName}</p>
                    <p className="text-xs text-gray-500">{rent.vehicleNumber}</p>
                    <p className={`text-xs ${daysOverdue > 1 ? 'text-red-600' : 'text-yellow-600'}`}>
                      {overdueStatus.text}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`font-bold ${daysOverdue > 1 ? 'text-red-900' : 'text-yellow-900'}`}>
                      ₹{rent.rent.toLocaleString()}
                    </p>
                    <Button
                      size="sm"
                      variant="ghost"
                      className={`text-xs ${daysOverdue > 1 ? 'text-red-600 hover:text-red-800' : 'text-yellow-600 hover:text-yellow-800'}`}
                      onClick={() => markAsPaidMutation.mutate(rent.id)}
                      disabled={markAsPaidMutation.isPending}
                    >
                      Mark Paid
                    </Button>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p>No unpaid rents</p>
            </div>
          )}
        </div>

        {unpaidRents && unpaidRents.length > 4 && (
          <Button variant="outline" className="w-full mt-4 text-sm">
            View All Unpaid Rents ({unpaidRents.length})
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
