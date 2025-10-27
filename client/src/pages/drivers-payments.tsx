import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import Sidebar from "@/components/Sidebar";

const inr = (n: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n || 0);

const todayIST = () => {
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istTime = new Date(now.getTime() + istOffset);
  return istTime.toISOString().split("T")[0];
};

interface DriverPaymentRow {
  driverId: number;
  driverName: string;
  rent: number;
  collection: number;
  fuel: number;
  totalEarnings: number;
  cash: number;
  refund: number;
  expenses: number;
  dues: number;
  payout: number;
}

export default function DriversPaymentsPage() {
  const [start, setStart] = useState<string>("");
  const [end, setEnd] = useState<string>("");

  useEffect(() => {
    (async () => {
      try {
        const firstTripDate = await api.getFirstTripDate();
        const today = todayIST();
        setStart(firstTripDate ?? today);
        setEnd(today);
      } catch {
        const today = todayIST();
        setStart(today);
        setEnd(today);
      }
    })();
  }, []);

  const { data: items = [], isLoading, error } = useQuery({
    queryKey: ["drivers-payments", start, end],
    queryFn: async () => {
      const data = await api.getWeeklySummary(start, end);
      return data as DriverPaymentRow[];
    },
    enabled: !!start && !!end,
  });

  const calculateTotal = (row: DriverPaymentRow): number => {
    const wallet = row.totalEarnings - row.cash + row.refund - row.expenses - 100;
    const total = row.collection + wallet + row.dues - row.rent - row.payout;
    return total;
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 p-6 overflow-auto">
        <div className="max-w-6xl mx-auto space-y-6">
          <h1 className="text-2xl font-bold text-gray-900">Drivers Payments</h1>

          <Card>
            <CardContent className="p-4">
              <div className="flex gap-4 items-end">
                <div className="flex-1">
                  <Label htmlFor="start-date">Start</Label>
                  <Input
                    id="start-date"
                    type="date"
                    value={start}
                    onChange={(e) => setStart(e.target.value)}
                    data-testid="input-start-date"
                  />
                </div>
                <div className="flex-1">
                  <Label htmlFor="end-date">End</Label>
                  <Input
                    id="end-date"
                    type="date"
                    value={end}
                    onChange={(e) => setEnd(e.target.value)}
                    data-testid="input-end-date"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Driver</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading && (
                    <TableRow>
                      <TableCell colSpan={2} className="text-center">
                        Loading…
                      </TableCell>
                    </TableRow>
                  )}
                  {error && (
                    <TableRow>
                      <TableCell colSpan={2} className="text-center text-red-500">
                        Failed to load.
                      </TableCell>
                    </TableRow>
                  )}
                  {!isLoading && items.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={2} className="text-center text-gray-500">
                        No drivers in this range.
                      </TableCell>
                    </TableRow>
                  )}
                  {items.map((row) => (
                    <TableRow key={row.driverId} data-testid={`row-driver-${row.driverId}`}>
                      <TableCell className="font-medium" data-testid={`text-driver-name-${row.driverId}`}>
                        {row.driverName}
                      </TableCell>
                      <TableCell className="text-right" data-testid={`text-total-${row.driverId}`}>
                        {inr(calculateTotal(row))}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
