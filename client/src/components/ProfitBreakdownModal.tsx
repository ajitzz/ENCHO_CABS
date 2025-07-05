import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { TrendingUp, TrendingDown, Calculator, DollarSign, Users, Car } from "lucide-react";
import { format } from "date-fns";
import { ProfitData } from "@/lib/api";

interface ProfitBreakdownModalProps {
  data: ProfitData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ProfitBreakdownModal({ data, open, onOpenChange }: ProfitBreakdownModalProps) {
  if (!data) return null;

  const { breakdown } = data;
  const isProfit = data.profit >= 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Car className="w-6 h-6" />
            Profit/Loss Breakdown - {data.vehicleNumber}
            <Badge variant={isProfit ? "default" : "destructive"} className="ml-2">
              {isProfit ? "Profitable" : "Loss"}
            </Badge>
          </DialogTitle>
          <p className="text-sm text-gray-600">
            Week: {format(new Date(data.weekStart), "MMM dd")} - {format(new Date(data.weekEnd), "MMM dd, yyyy")}
            • {data.totalTrips} Total Trips
          </p>
        </DialogHeader>

        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                <TrendingUp className="h-4 w-4 text-emerald-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-emerald-600">
                  ₹{breakdown.calculation.totalRevenue.toLocaleString()}
                </div>
                <p className="text-xs text-gray-600">From drivers & substitutes</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
                <TrendingDown className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  ₹{breakdown.calculation.totalExpenses.toLocaleString()}
                </div>
                <p className="text-xs text-gray-600">Company rental fees</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Net Profit/Loss</CardTitle>
                <Calculator className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${isProfit ? 'text-emerald-600' : 'text-red-600'}`}>
                  {isProfit ? '+' : ''}₹{breakdown.calculation.netProfit.toLocaleString()}
                </div>
                <p className="text-xs text-gray-600">Revenue - Expenses</p>
              </CardContent>
            </Card>
          </div>

          {/* Revenue Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-emerald-600" />
                Revenue Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {breakdown.revenue.drivers.map((driver, index) => (
                <div key={driver.id} className="flex justify-between items-center p-3 bg-emerald-50 rounded-lg">
                  <div>
                    <p className="font-medium text-emerald-800">{driver.name}</p>
                    <p className="text-sm text-emerald-600">{driver.daysWorked} days @ rate based on accommodation</p>
                  </div>
                  <div className="text-lg font-bold text-emerald-700">
                    ₹{driver.rent.toLocaleString()}
                  </div>
                </div>
              ))}

              {breakdown.revenue.substitutes.map((substitute, index) => (
                <div key={substitute.id} className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                  <div>
                    <p className="font-medium text-blue-800">{substitute.name} (Substitute)</p>
                    <p className="text-sm text-blue-600">Variable charges based on shift hours</p>
                  </div>
                  <div className="text-lg font-bold text-blue-700">
                    ₹{substitute.charge.toLocaleString()}
                  </div>
                </div>
              ))}

              {breakdown.revenue.drivers.length === 0 && breakdown.revenue.substitutes.length === 0 && (
                <div className="text-center text-gray-500 py-4">
                  No driver revenue data available
                </div>
              )}

              <Separator />
              <div className="flex justify-between items-center p-3 bg-emerald-100 rounded-lg">
                <div>
                  <p className="font-semibold text-emerald-900">Total Revenue</p>
                  <p className="text-sm text-emerald-700">Sum of all driver payments</p>
                </div>
                <div className="text-xl font-bold text-emerald-800">
                  ₹{breakdown.revenue.totalDriverRent.toLocaleString()}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Expenses Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-red-600" />
                Expenses Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
                <div>
                  <p className="font-medium text-red-800">Company Rental ({breakdown.expenses.company})</p>
                  <p className="text-sm text-red-600">
                    ₹{breakdown.expenses.slabRentPerDay.toLocaleString()} per day × {breakdown.expenses.totalDays} days
                  </p>
                  <p className="text-xs text-red-500 mt-1">
                    Rate based on {data.totalTrips} trips performance slab
                  </p>
                </div>
                <div className="text-lg font-bold text-red-700">
                  ₹{breakdown.expenses.totalCompanyRent.toLocaleString()}
                </div>
              </div>

              <Separator />
              <div className="flex justify-between items-center p-3 bg-red-100 rounded-lg">
                <div>
                  <p className="font-semibold text-red-900">Total Expenses</p>
                  <p className="text-sm text-red-700">Company rental fees</p>
                </div>
                <div className="text-xl font-bold text-red-800">
                  ₹{breakdown.expenses.totalCompanyRent.toLocaleString()}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Calculation Formula */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="w-5 h-5 text-gray-600" />
                Profit/Loss Calculation
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
                <div className="text-center text-lg font-mono">
                  <span className="text-emerald-600 font-semibold">Revenue</span>
                  <span className="text-gray-500 mx-2">-</span>
                  <span className="text-red-600 font-semibold">Expenses</span>
                  <span className="text-gray-500 mx-2">=</span>
                  <span className={`font-bold ${isProfit ? 'text-emerald-600' : 'text-red-600'}`}>
                    {isProfit ? 'Profit' : 'Loss'}
                  </span>
                </div>
                
                <div className="text-center text-xl font-mono">
                  <span className="text-emerald-600">₹{breakdown.calculation.totalRevenue.toLocaleString()}</span>
                  <span className="text-gray-500 mx-2">-</span>
                  <span className="text-red-600">₹{breakdown.calculation.totalExpenses.toLocaleString()}</span>
                  <span className="text-gray-500 mx-2">=</span>
                  <span className={`font-bold ${isProfit ? 'text-emerald-600' : 'text-red-600'}`}>
                    {isProfit ? '+' : ''}₹{breakdown.calculation.netProfit.toLocaleString()}
                  </span>
                </div>

                <div className="text-center text-sm text-gray-600 mt-3">
                  Formula: (Driver 1 Rent + Driver 2 Rent + Substitute Rent) - (Slab Rent × 7 days)
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}