import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

export default function SettlementStatusCard() {
  const { data: settlements, isLoading } = useQuery({
    queryKey: ["/api/settlements"],
    queryFn: () => api.getSettlements(),
  });

  if (isLoading) {
    return <div className="animate-pulse h-80 bg-gray-200 rounded-xl"></div>;
  }

  const getStatusColor = (paid: boolean, profit: number) => {
    if (paid) return "bg-green-100 text-green-800";
    if (profit < 0) return "bg-red-100 text-red-800";
    return "bg-yellow-100 text-yellow-800";
  };

  const getStatusText = (paid: boolean, profit: number) => {
    if (paid) return "Processed";
    if (profit < 0) return "Review";
    return "Pending";
  };

  const getBgColor = (paid: boolean, profit: number) => {
    if (paid) return "bg-green-50";
    if (profit < 0) return "bg-red-50";
    return "bg-yellow-50";
  };

  return (
    <Card className="rounded-xl shadow-sm border border-gray-200">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-gray-900">Weekly Settlements</CardTitle>
          <Button size="sm" className="bg-primary text-white hover:bg-blue-600">
            Process All
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {settlements && settlements.length > 0 ? (
            settlements.slice(0, 4).map((settlement) => (
              <div key={settlement.id} className={`flex items-center justify-between p-3 ${getBgColor(settlement.paid, settlement.profit)} rounded-lg`}>
                <div>
                  <p className="font-medium text-gray-900">{settlement.vehicleNumber}</p>
                  <p className="text-xs text-gray-500">
                    {format(new Date(settlement.weekStart), "MMM dd")} - {format(new Date(settlement.weekEnd), "MMM dd")}
                  </p>
                  <p className={`text-xs ${settlement.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {settlement.profit >= 0 ? 'Profit' : 'Loss'}: ₹{Math.abs(settlement.profit).toLocaleString()}
                  </p>
                </div>
                <div className="text-right">
                  <Badge 
                    variant="secondary" 
                    className={getStatusColor(settlement.paid, settlement.profit)}
                  >
                    {getStatusText(settlement.paid, settlement.profit)}
                  </Badge>
                  <p className="text-xs text-gray-500 mt-1">{settlement.totalTrips} trips</p>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p>No settlements found</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
