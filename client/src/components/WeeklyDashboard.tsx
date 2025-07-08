import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, TrendingUp, DollarSign, Users, Truck } from "lucide-react";

interface WeeklyData {
  vehicleId: number;
  weekStart: string;
  weekEnd: string;
  totalTrips: number;
  rentalRate: number;
  companyRent: number;
  driverRent: number;
  substituteRent: number;
  totalRent: number;
  profit: number;
  drivers: Array<{
    id: number;
    name: string;
    daysWorked: number;
    dailyRent: number;
    totalRent: number;
    paid: boolean;
  }>;
  substitutes: Array<{
    id: number;
    name: string;
    shiftHours: number;
    charge: number;
    tripCount: number;
  }>;
}

interface WeeklySummary {
  currentWeek: WeeklyData;
  availableWeeks: Array<{
    weekStart: string;
    weekEnd: string;
    label: string;
  }>;
}

interface WeeklyDashboardProps {
  vehicleId: number;
  vehicleNumber: string;
}

export function WeeklyDashboard({ vehicleId, vehicleNumber }: WeeklyDashboardProps) {
  const [selectedWeek, setSelectedWeek] = useState<string>("");

  const { data: weeklySummary, isLoading } = useQuery<WeeklySummary>({
    queryKey: ['/api/weekly/vehicle', vehicleId, selectedWeek],
    queryFn: () => {
      const url = selectedWeek 
        ? `/api/weekly/vehicle/${vehicleId}?week=${selectedWeek}`
        : `/api/weekly/vehicle/${vehicleId}`;
      return fetch(url).then(res => res.json());
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-gray-200 rounded animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-gray-200 rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!weeklySummary) {
    return <div className="text-center py-8">No data available</div>;
  }

  const { currentWeek, availableWeeks } = weeklySummary;

  const formatCurrency = (amount: number) => `₹${amount.toLocaleString()}`;
  const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric' 
  });

  const profitColor = currentWeek.profit >= 0 ? "text-green-600" : "text-red-600";
  const profitIcon = currentWeek.profit >= 0 ? "📈" : "📉";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">Weekly Dashboard - {vehicleNumber}</h2>
          <p className="text-gray-600">
            Week of {formatDate(currentWeek.weekStart)} - {formatDate(currentWeek.weekEnd)}
          </p>
        </div>
        
        {availableWeeks.length > 1 && (
          <Select value={selectedWeek} onValueChange={setSelectedWeek}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select week" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Current Week</SelectItem>
              {availableWeeks.map((week) => (
                <SelectItem key={week.weekStart} value={week.weekStart}>
                  {week.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Trips</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{currentWeek.totalTrips}</div>
            <p className="text-xs text-muted-foreground">
              Rate: {formatCurrency(currentWeek.rentalRate)}/day
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(currentWeek.totalRent)}</div>
            <p className="text-xs text-muted-foreground">
              Drivers: {formatCurrency(currentWeek.driverRent)} + Substitutes: {formatCurrency(currentWeek.substituteRent)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Company Rent</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(currentWeek.companyRent)}</div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(currentWeek.rentalRate)} × 7 days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Profit</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${profitColor}`}>
              {profitIcon} {formatCurrency(currentWeek.profit)}
            </div>
            <p className="text-xs text-muted-foreground">
              Revenue - Company Rent
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Driver Details */}
      {currentWeek.drivers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Driver Performance ({currentWeek.drivers.length} drivers)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {currentWeek.drivers.map((driver) => (
                <div key={driver.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <div className="font-medium">{driver.name}</div>
                    <div className="text-sm text-gray-600">
                      {driver.daysWorked} days × {formatCurrency(driver.dailyRent)}/day
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">{formatCurrency(driver.totalRent)}</div>
                    <Badge variant={driver.paid ? "default" : "destructive"}>
                      {driver.paid ? "Paid" : "Unpaid"}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Substitute Drivers */}
      {currentWeek.substitutes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Substitute Drivers ({currentWeek.substitutes.length} entries)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {currentWeek.substitutes.map((substitute, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                  <div>
                    <div className="font-medium">{substitute.name}</div>
                    <div className="text-sm text-gray-600">
                      {substitute.tripCount} trips • {substitute.shiftHours}h shift
                    </div>
                  </div>
                  <div className="font-semibold">{formatCurrency(substitute.charge)}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}