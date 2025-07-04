import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { BarChart3 } from "lucide-react";

export default function ProfitChart() {
  const { data: profitData, isLoading } = useQuery({
    queryKey: ["/api/dashboard/profit-graph"],
    queryFn: () => api.getProfitGraphData(),
  });

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
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold">{label}</p>
          <p className="text-sm text-gray-600">Trips: {data.totalTrips}</p>
          <p className={`text-sm font-medium ${data.profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
            {data.profit >= 0 ? 'Profit' : 'Loss'}: ₹{Math.abs(data.profit).toLocaleString()}
          </p>
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
    </Card>
  );
}
