import { useState, useEffect, useRef } from "react";
import Papa from "papaparse";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { CalendarIcon, Save, RotateCcw, Upload, AlertCircle } from "lucide-react";

interface WeeklySummaryRow {
  driverId: number;
  driverName: string;
  rent: number;
  collection: number;
  fuel: number;
  trips: number;
  totalEarnings: number;
  cash: number;
  refund: number;
  expenses: number;
  dues: number;
  payout: number;
}

interface EditableFields {
  trips: number;
  totalEarnings: number;
  cash: number;
  refund: number;
  expenses: number;
  dues: number;
  payout: number;
}

// Helper function to get Monday of current week in IST
function getMondayOfCurrentWeek(): Date {
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000; // IST is UTC+5:30
  const istDate = new Date(now.getTime() + istOffset);
  const day = istDate.getDay();
  const diff = istDate.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
  const monday = new Date(istDate.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  return monday;
}

// Helper function to get today in IST
function getTodayIST(): Date {
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istDate = new Date(now.getTime() + istOffset);
  istDate.setHours(0, 0, 0, 0);
  return istDate;
}

export default function WeeklySummary() {
  const [startDate, setStartDate] = useState<Date>(getMondayOfCurrentWeek());
  const [endDate, setEndDate] = useState<Date>(getTodayIST());
  const [editableData, setEditableData] = useState<Record<number, EditableFields>>({});
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);
  const [showNotFoundDialog, setShowNotFoundDialog] = useState(false);
  const [driversNotFound, setDriversNotFound] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const startDateStr = format(startDate, "yyyy-MM-dd");
  const endDateStr = format(endDate, "yyyy-MM-dd");

  const { data: summaries, isLoading, refetch } = useQuery<WeeklySummaryRow[]>({
    queryKey: ["/api/weekly-summary/aggregates", startDateStr, endDateStr],
    queryFn: async () => {
      const response = await fetch(
        `/api/weekly-summary/aggregates?startDate=${startDateStr}&endDate=${endDateStr}`
      );
      if (!response.ok) {
        throw new Error("Failed to fetch weekly summaries");
      }
      return response.json();
    },
  });

  // Initialize editable data when summaries load
  useEffect(() => {
    if (summaries) {
      const initialData: Record<number, EditableFields> = {};
      summaries.forEach((row) => {
        initialData[row.driverId] = {
          trips: row.trips,
          totalEarnings: row.totalEarnings,
          cash: row.cash,
          refund: row.refund,
          expenses: row.expenses,
          dues: row.dues,
          payout: row.payout,
        };
      });
      setEditableData(initialData);
    }
  }, [summaries]);

  const saveMutation = useMutation({
    mutationFn: async (data: { driverId: number } & EditableFields) => {
      return apiRequest("POST", "/api/weekly-summary", {
        driverId: data.driverId,
        startDate: startDateStr,
        endDate: endDateStr,
        trips: data.trips,
        totalEarnings: data.totalEarnings,
        cash: data.cash,
        refund: data.refund,
        expenses: data.expenses,
        dues: data.dues,
        payout: data.payout,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ["/api/weekly-summary/aggregates", startDateStr, endDateStr] 
      });
      toast({
        title: "Success",
        description: "Weekly summary saved successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save weekly summary",
        variant: "destructive",
      });
    },
  });

  const clearMutation = useMutation({
    mutationFn: async (driverId: number) => {
      return apiRequest("DELETE", `/api/weekly-summary?driverId=${driverId}&startDate=${startDateStr}&endDate=${endDateStr}`);
    },
    onSuccess: (_, driverId) => {
      // Reset editable fields to zero
      setEditableData((prev) => ({
        ...prev,
        [driverId]: {
          totalEarnings: 0,
          cash: 0,
          refund: 0,
          expenses: 0,
          dues: 0,
          payout: 0,
        },
      }));
      queryClient.invalidateQueries({ 
        queryKey: ["/api/weekly-summary/aggregates", startDateStr, endDateStr] 
      });
      toast({
        title: "Success",
        description: "Weekly summary cleared successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to clear weekly summary",
        variant: "destructive",
      });
    },
  });

  const handleFieldChange = (driverId: number, field: keyof EditableFields, value: number) => {
    setEditableData((prev) => ({
      ...prev,
      [driverId]: {
        ...prev[driverId],
        [field]: value,
      },
    }));
  };

  const handleSave = (driverId: number) => {
    const data = editableData[driverId];
    saveMutation.mutate({ driverId, ...data });
  };

  const handleClear = (driverId: number) => {
    if (window.confirm("Are you sure you want to clear all editable fields for this driver?")) {
      clearMutation.mutate(driverId);
    }
  };

  const calculateWallet = (driverId: number): number => {
    const data = editableData[driverId];
    if (!data) return 0;
    return data.totalEarnings - data.cash + data.refund - data.expenses - 100;
  };

  const calculateTotal = (driverId: number, collection: number): number => {
    const data = editableData[driverId];
    if (!data) return 0;
    const wallet = calculateWallet(driverId);
    const row = summaries?.find(s => s.driverId === driverId);
    const rent = row?.rent || 0;
    return collection + wallet + data.dues - rent - data.payout;
  };

  const handleImportCSV = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setImportResult(null);

    try {
      const text = await file.text();
      
      const parseResult = Papa.parse(text, {
        header: true,
        skipEmptyLines: true,
        trimHeaders: true,
        transform: (value) => value.trim(),
      });

      if (parseResult.errors.length > 0) {
        console.error("CSV parsing errors:", parseResult.errors);
      }

      const csvData = parseResult.data;

      // Send to API
      const response = await fetch('/api/import/weekly-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          csvData,
          startDate: startDateStr,
          endDate: endDateStr,
        }),
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || 'Import failed');
      }

      setImportResult(result);
      
      if (result.driversNotFound && result.driversNotFound.length > 0) {
        setDriversNotFound(result.driversNotFound);
        setShowNotFoundDialog(true);
      }

      // Refresh the summary data
      queryClient.invalidateQueries({ 
        queryKey: ["/api/weekly-summary/aggregates", startDateStr, endDateStr] 
      });

      toast({
        title: "Import completed",
        description: `Successfully imported ${result.success} records. ${result.skipped} skipped.`,
      });
    } catch (error: any) {
      console.error("Import error:", error);
      toast({
        title: "Import failed",
        description: error.message || "Failed to import CSV file",
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse h-96 bg-gray-200 rounded-xl"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <Card className="rounded-xl shadow-sm border border-gray-200">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-gray-900">Weekly Summary</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Date Range Filter and Import */}
          <div className="flex gap-4 mb-6 items-end flex-wrap">
            <div>
              <Label>Start Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-[200px] justify-start text-left font-normal"
                    data-testid="button-start-date"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(startDate, "PPP")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={(date) => date && setStartDate(date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <Label>End Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-[200px] justify-start text-left font-normal"
                    data-testid="button-end-date"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(endDate, "PPP")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={(date) => date && setEndDate(date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <Button 
              onClick={() => refetch()} 
              data-testid="button-refresh"
            >
              Refresh
            </Button>

            <div className="flex gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleImportCSV}
                className="hidden"
                data-testid="input-file-csv"
              />
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={isImporting}
                variant="outline"
                data-testid="button-import-csv"
              >
                <Upload className="h-4 w-4 mr-2" />
                {isImporting ? "Importing..." : "Import CSV"}
              </Button>
            </div>
          </div>

          {/* Import Results */}
          {importResult && (
            <Alert className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Import completed: {importResult.success} successful, {importResult.skipped} skipped
                {importResult.errors.length > 0 && `, ${importResult.errors.length} errors`}
              </AlertDescription>
            </Alert>
          )}

          {/* Summary Table */}
          {summaries && summaries.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b-2 border-gray-300">
                    <th className="text-left py-3 px-2 text-gray-700 font-semibold">Driver ID</th>
                    <th className="text-left py-3 px-2 text-gray-700 font-semibold">Name</th>
                    <th className="text-right py-3 px-2 text-gray-700 font-semibold">Rent</th>
                    <th className="text-right py-3 px-2 text-gray-700 font-semibold">Collection</th>
                    <th className="text-right py-3 px-2 text-gray-700 font-semibold">Fuel</th>
                    <th className="text-right py-3 px-2 text-gray-700 font-semibold bg-blue-50">Trips*</th>
                    <th className="text-right py-3 px-2 text-gray-700 font-semibold bg-blue-50">Total Earnings*</th>
                    <th className="text-right py-3 px-2 text-gray-700 font-semibold bg-blue-50">Cash*</th>
                    <th className="text-right py-3 px-2 text-gray-700 font-semibold bg-blue-50">Refund*</th>
                    <th className="text-right py-3 px-2 text-gray-700 font-semibold bg-blue-50">Expenses*</th>
                    <th className="text-right py-3 px-2 text-gray-700 font-semibold bg-green-50">Wallet</th>
                    <th className="text-right py-3 px-2 text-gray-700 font-semibold bg-blue-50">Dues*</th>
                    <th className="text-right py-3 px-2 text-gray-700 font-semibold bg-blue-50">Payout*</th>
                    <th className="text-right py-3 px-2 text-gray-700 font-semibold bg-green-50">Total</th>
                    <th className="text-center py-3 px-2 text-gray-700 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {summaries.map((row) => {
                    const data = editableData[row.driverId] || row;
                    const wallet = calculateWallet(row.driverId);
                    const total = calculateTotal(row.driverId, row.collection);

                    return (
                      <tr key={row.driverId} className="border-b border-gray-200 hover:bg-gray-50">
                        <td className="py-3 px-2 text-gray-900" data-testid={`text-driver-id-${row.driverId}`}>{row.driverId}</td>
                        <td className="py-3 px-2 text-gray-900" data-testid={`text-driver-name-${row.driverId}`}>{row.driverName}</td>
                        <td className="py-3 px-2 text-right text-gray-900" data-testid={`text-rent-${row.driverId}`}>₹{row.rent.toLocaleString()}</td>
                        <td className="py-3 px-2 text-right text-gray-900" data-testid={`text-collection-${row.driverId}`}>₹{row.collection.toLocaleString()}</td>
                        <td className="py-3 px-2 text-right text-gray-900" data-testid={`text-fuel-${row.driverId}`}>₹{row.fuel.toLocaleString()}</td>
                        <td className="py-3 px-2 bg-blue-50">
                          <Input
                            type="number"
                            value={data.trips}
                            onChange={(e) => handleFieldChange(row.driverId, "trips", parseInt(e.target.value) || 0)}
                            className="w-24 text-right"
                            data-testid={`input-trips-${row.driverId}`}
                          />
                        </td>
                        <td className="py-3 px-2 bg-blue-50">
                          <Input
                            type="number"
                            value={data.totalEarnings}
                            onChange={(e) => handleFieldChange(row.driverId, "totalEarnings", parseInt(e.target.value) || 0)}
                            className="w-24 text-right"
                            data-testid={`input-total-earnings-${row.driverId}`}
                          />
                        </td>
                        <td className="py-3 px-2 bg-blue-50">
                          <Input
                            type="number"
                            value={data.cash}
                            onChange={(e) => handleFieldChange(row.driverId, "cash", parseInt(e.target.value) || 0)}
                            className="w-24 text-right"
                            data-testid={`input-cash-${row.driverId}`}
                          />
                        </td>
                        <td className="py-3 px-2 bg-blue-50">
                          <Input
                            type="number"
                            value={data.refund}
                            onChange={(e) => handleFieldChange(row.driverId, "refund", parseInt(e.target.value) || 0)}
                            className="w-24 text-right"
                            data-testid={`input-refund-${row.driverId}`}
                          />
                        </td>
                        <td className="py-3 px-2 bg-blue-50">
                          <Input
                            type="number"
                            value={data.expenses}
                            onChange={(e) => handleFieldChange(row.driverId, "expenses", parseInt(e.target.value) || 0)}
                            className="w-24 text-right"
                            data-testid={`input-expenses-${row.driverId}`}
                          />
                        </td>
                        <td className="py-3 px-2 text-right font-semibold bg-green-50" data-testid={`text-wallet-${row.driverId}`}>
                          ₹{wallet.toLocaleString()}
                        </td>
                        <td className="py-3 px-2 bg-blue-50">
                          <Input
                            type="number"
                            value={data.dues}
                            onChange={(e) => handleFieldChange(row.driverId, "dues", parseInt(e.target.value) || 0)}
                            className="w-24 text-right"
                            data-testid={`input-dues-${row.driverId}`}
                          />
                        </td>
                        <td className="py-3 px-2 bg-blue-50">
                          <Input
                            type="number"
                            value={data.payout}
                            onChange={(e) => handleFieldChange(row.driverId, "payout", parseInt(e.target.value) || 0)}
                            className="w-24 text-right"
                            data-testid={`input-payout-${row.driverId}`}
                          />
                        </td>
                        <td className="py-3 px-2 text-right font-bold bg-green-50" data-testid={`text-total-${row.driverId}`}>
                          ₹{total.toLocaleString()}
                        </td>
                        <td className="py-3 px-2 text-center">
                          <div className="flex gap-2 justify-center">
                            <Button
                              size="sm"
                              onClick={() => handleSave(row.driverId)}
                              disabled={saveMutation.isPending}
                              data-testid={`button-save-${row.driverId}`}
                            >
                              <Save className="h-4 w-4 mr-1" />
                              Save
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleClear(row.driverId)}
                              disabled={clearMutation.isPending}
                              data-testid={`button-clear-${row.driverId}`}
                            >
                              <RotateCcw className="h-4 w-4 mr-1" />
                              Clear
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p>No driver data found for the selected date range</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Drivers Not Found Dialog */}
      <AlertDialog open={showNotFoundDialog} onOpenChange={setShowNotFoundDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Drivers Not Found</AlertDialogTitle>
            <AlertDialogDescription>
              The following drivers from the CSV were not found in the computed weekly summary for the selected date range and were skipped:
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="my-4">
            <ul className="list-disc list-inside space-y-1">
              {driversNotFound.map((driver, index) => (
                <li key={index} className="text-sm text-gray-700">{driver}</li>
              ))}
            </ul>
          </div>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setShowNotFoundDialog(false)}>
              OK
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
