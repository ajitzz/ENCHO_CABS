import { useQuery } from "@tanstack/react-query";
import { api, ProfitData } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { BarChart3, Calculator } from "lucide-react";
import { useState } from "react";
import ProfitBreakdownModal from "./ProfitBreakdownModal";

export default function ProfitChart() {
  const [selectedData, setSelectedData] = useState<ProfitData | null>(null);
  const [breakdownModalOpen, setBreakdownModalOpen] = useState(false);

  const { data: profitData, isLoading } = useQuery({
    queryKey: ["/api/dashboard/profit-graph"],
    queryFn: () => api.getProfitGraphData(),
  });

  const handleViewBreakdown = (vehicleNumber: string) => {
    const data = profitData?.find(item => item.vehicleNumber === vehicleNumber);
    if (data) {
      setSelectedData(data);
      setBreakdownModalOpen(true);
    }
  };

  if (isLoading) {
    return <div className="animate-pulse h-80 bg-gray-200 rounded-xl"></div>;
  }

  const chartData = profitData?.map(item => ({
    vehicleNumber: item.vehicleNumber,
    profit: item.profit,
    totalTrips: item.totalTrips,
  })) || [];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg min-w-[200px]">
          <p className="font-semibold mb-2">{label}</p>
          <p className="text-sm text-gray-600">Trips: {data.totalTrips}</p>
          <p className={`text-sm font-medium mb-3 ${data.profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
            {data.profit >= 0 ? 'Profit' : 'Loss'}: ₹{Math.abs(data.profit).toLocaleString()}
          </p>
          <Button 
            size="sm" 
            variant="outline" 
            className="w-full"
            onClick={(e) => {
              e.stopPropagation();
              handleViewBreakdown(label);
            }}
          >
            <Calculator className="w-3 h-3 mr-1" />
            View Breakdown
          </Button>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="rounded-xl shadow-sm border border-gray-200">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-gray-900">Vehicle Profit Comparison</CardTitle>
          <div className="flex items-center space-x-2">
            <Select defaultValue="this-week">
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="this-week">This Week</SelectItem>
                <SelectItem value="last-week">Last Week</SelectItem>
                <SelectItem value="this-month">This Month</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <p className="text-sm text-gray-600 mt-1">
          Hover over bars and click "View Breakdown" for detailed profit/loss calculations
        </p>
      </CardHeader>
      <CardContent>
        {chartData.length > 0 ? (
          <>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis 
                    dataKey="vehicleNumber" 
                    tick={{ fontSize: 12 }}
                    axisLine={false}
                  />
                  <YAxis 
                    tick={{ fontSize: 12 }}
                    axisLine={false}
                    tickFormatter={(value) => `₹${Math.abs(value / 1000)}k`}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="profit" radius={[4, 4, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.profit >= 0 ? 'hsl(142, 76%, 36%)' : 'hsl(0, 84%, 60%)'} 
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            
            {/* Chart Legend */}
            <div className="flex items-center justify-center space-x-6 mt-4">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-emerald-500 rounded"></div>
                <span className="text-sm text-gray-600">Profit</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-red-500 rounded"></div>
                <span className="text-sm text-gray-600">Loss</span>
              </div>
            </div>

            {/* Quick Access Breakdown Buttons */}
            {chartData.length > 0 && (
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <h4 className="text-sm font-medium text-gray-900 mb-3">Quick Breakdown Access:</h4>
                <div className="flex flex-wrap gap-2">
                  {chartData.map((vehicle, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewBreakdown(vehicle.vehicleNumber)}
                      className="text-xs"
                    >
                      <Calculator className="w-3 h-3 mr-1" />
                      {vehicle.vehicleNumber}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="h-64 flex items-center justify-center text-center">
            <div>
              <BarChart3 className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p className="text-gray-500 text-sm">No profit data available</p>
              <p className="text-xs text-gray-400 mt-1">Process weekly settlements to see chart</p>
            </div>
          </div>
        )}
      </CardContent>

      {/* Profit Breakdown Modal */}
      <ProfitBreakdownModal
        data={selectedData}
        open={breakdownModalOpen}
        onOpenChange={setBreakdownModalOpen}
      />
    </Card>
  );
}
