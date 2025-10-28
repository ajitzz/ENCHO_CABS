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
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { CalendarIcon, Upload, AlertCircle } from "lucide-react";

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

// Helper function to get Sunday of the week for any given date
function getSundayOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() + (day === 0 ? 0 : 7 - day); // If Sunday, stay; otherwise add days to reach Sunday
  const sunday = new Date(d.setDate(diff));
  sunday.setHours(0, 0, 0, 0);
  return sunday;
}

// Helper function to get today in IST
function getTodayIST(): Date {
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istDate = new Date(now.getTime() + istOffset);
  istDate.setHours(0, 0, 0, 0);
  return istDate;
}

const inr = (n: number) => `₹${n.toLocaleString()}`;

export default function WeeklySummary() {
  const [startDate, setStartDate] = useState<Date>(getMondayOfCurrentWeek());
  const [endDate, setEndDate] = useState<Date>(getSundayOfWeek(getMondayOfCurrentWeek()));
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);
  const [showNotFoundDialog, setShowNotFoundDialog] = useState(false);
  const [driversNotFound, setDriversNotFound] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Automatically update end date to Sunday of the selected start date's week
  useEffect(() => {
    setEndDate(getSundayOfWeek(startDate));
  }, [startDate]);

  // Edit mode state
  const [editingDriverId, setEditingDriverId] = useState<number | null>(null);
  const [draftTotalEarnings, setDraftTotalEarnings] = useState<string>("");
  const [draftCash, setDraftCash] = useState<string>("");
  const [draftRefund, setDraftRefund] = useState<string>("");
  const [draftExpenses, setDraftExpenses] = useState<string>("");
  const [draftDues, setDraftDues] = useState<string>("");
  const [draftPayout, setDraftPayout] = useState<string>("");

  // Confirmation dialog states
  const [saveConfirm, setSaveConfirm] = useState<{ driverId: number; driverName: string } | null>(null);
  const [clearConfirm, setClearConfirm] = useState<{ driverId: number; driverName: string } | null>(null);
  const [duplicateConfirm, setDuplicateConfirm] = useState<{
    csvData: any[];
    existingData: Array<{ driverName: string; weekStart: string; weekEnd: string }>;
  } | null>(null);

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

  const saveMutation = useMutation({
    mutationFn: async (data: { driverId: number } & EditableFields) => {
      return apiRequest("POST", "/api/weekly-summary", {
        driverId: data.driverId,
        startDate: startDateStr,
        endDate: endDateStr,
        totalEarnings: data.totalEarnings,
        cash: data.cash,
        refund: data.refund,
        expenses: data.expenses,
        dues: data.dues,
        payout: data.payout,
      });
    },
    onSuccess: () => {
      setEditingDriverId(null);
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
    onSuccess: () => {
      // Exit edit mode and reset draft state
      setEditingDriverId(null);
      setDraftTotalEarnings("");
      setDraftCash("");
      setDraftRefund("");
      setDraftExpenses("");
      setDraftDues("");
      setDraftPayout("");
      
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

  const onEdit = (row: WeeklySummaryRow) => {
    setEditingDriverId(row.driverId);
    setDraftTotalEarnings(String(row.totalEarnings));
    setDraftCash(String(row.cash));
    setDraftRefund(String(row.refund));
    setDraftExpenses(String(row.expenses));
    setDraftDues(String(row.dues));
    setDraftPayout(String(row.payout));
  };

  const onCancel = () => {
    setEditingDriverId(null);
    setDraftTotalEarnings("");
    setDraftCash("");
    setDraftRefund("");
    setDraftExpenses("");
    setDraftDues("");
    setDraftPayout("");
  };

  const onSave = (driverId: number, driverName: string) => {
    setSaveConfirm({ driverId, driverName });
  };

  const confirmSave = () => {
    if (saveConfirm) {
      saveMutation.mutate({
        driverId: saveConfirm.driverId,
        totalEarnings: draftTotalEarnings === "" ? 0 : Number(draftTotalEarnings),
        cash: draftCash === "" ? 0 : Number(draftCash),
        refund: draftRefund === "" ? 0 : Number(draftRefund),
        expenses: draftExpenses === "" ? 0 : Number(draftExpenses),
        dues: draftDues === "" ? 0 : Number(draftDues),
        payout: draftPayout === "" ? 0 : Number(draftPayout),
      });
      setSaveConfirm(null);
    }
  };

  const onClear = (driverId: number, driverName: string) => {
    setClearConfirm({ driverId, driverName });
  };

  const confirmClear = () => {
    if (clearConfirm) {
      clearMutation.mutate(clearConfirm.driverId);
      setClearConfirm(null);
    }
  };

  const calculateWallet = (totalEarnings: number, cash: number, refund: number, expenses: number): number => {
    return totalEarnings - cash + refund - expenses - 100;
  };

  const calculateTotal = (collection: number, rent: number, totalEarnings: number, cash: number, refund: number, expenses: number, dues: number, payout: number): number => {
    const wallet = calculateWallet(totalEarnings, cash, refund, expenses);
    return collection + wallet + dues - rent - payout;
  };

  const handleImportCSV = async (event: React.ChangeEvent<HTMLInputElement>, confirmOverwrite = false) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setImportResult(null);

    try {
      const text = await file.text();
      
      const parseResult: any = Papa.parse(text, {
        header: true,
        skipEmptyLines: true,
        trimHeaders: true,
        transform: (value: any) => value.trim(),
      });

      if (parseResult.errors && parseResult.errors.length > 0) {
        console.error("CSV parsing errors:", parseResult.errors);
      }

      const csvData = parseResult.data;

      // Send to API (date is now taken from CSV, not from UI selection)
      const response = await fetch('/api/import/weekly-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          csvData,
          confirmOverwrite,
        }),
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || 'Import failed');
      }

      // Check if duplicates were found
      if (result.duplicatesFound && !confirmOverwrite) {
        setDuplicateConfirm({
          csvData,
          existingData: result.existingData,
        });
        setIsImporting(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        return;
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

  const confirmOverwriteImport = async () => {
    if (!duplicateConfirm) return;

    setIsImporting(true);

    try {
      const response = await fetch('/api/import/weekly-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          csvData: duplicateConfirm.csvData,
          confirmOverwrite: true,
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
      setDuplicateConfirm(null);
    }
  };

  if (isLoading) {
    return (
      <div className="w-full p-4 md:p-6 lg:p-8">
        <div className="animate-pulse h-96 bg-gray-200 rounded-xl"></div>
      </div>
    );
  }

  return (
    <div className="w-full p-4 md:p-6 lg:p-8">
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
              <Label>End Date (Auto)</Label>
              <div
                className="w-[200px] h-10 px-3 py-2 border border-gray-200 rounded-md bg-gray-50 flex items-center text-sm text-gray-700"
                data-testid="text-end-date"
              >
                <CalendarIcon className="mr-2 h-4 w-4 text-gray-400" />
                {format(endDate, "PPP")}
              </div>
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
                    <th className="text-right py-3 px-2 text-gray-700 font-semibold">Total Earnings</th>
                    <th className="text-right py-3 px-2 text-gray-700 font-semibold">Cash</th>
                    <th className="text-right py-3 px-2 text-gray-700 font-semibold">Refund</th>
                    <th className="text-right py-3 px-2 text-gray-700 font-semibold">Expenses</th>
                    <th className="text-right py-3 px-2 text-gray-700 font-semibold">Wallet</th>
                    <th className="text-right py-3 px-2 text-gray-700 font-semibold">Dues</th>
                    <th className="text-right py-3 px-2 text-gray-700 font-semibold">Payout</th>
                    <th className="text-right py-3 px-2 text-gray-700 font-semibold">Total</th>
                    <th className="text-center py-3 px-2 text-gray-700 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {summaries.map((row) => {
                    const editing = editingDriverId === row.driverId;
                    
                    // Use draft values when editing, else use saved values
                    const totalEarnings = editing ? (draftTotalEarnings === "" ? 0 : Number(draftTotalEarnings)) : row.totalEarnings;
                    const cash = editing ? (draftCash === "" ? 0 : Number(draftCash)) : row.cash;
                    const refund = editing ? (draftRefund === "" ? 0 : Number(draftRefund)) : row.refund;
                    const expenses = editing ? (draftExpenses === "" ? 0 : Number(draftExpenses)) : row.expenses;
                    const dues = editing ? (draftDues === "" ? 0 : Number(draftDues)) : row.dues;
                    const payout = editing ? (draftPayout === "" ? 0 : Number(draftPayout)) : row.payout;

                    const wallet = calculateWallet(totalEarnings, cash, refund, expenses);
                    const total = calculateTotal(row.collection, row.rent, totalEarnings, cash, refund, expenses, dues, payout);

                    return (
                      <tr key={row.driverId} className="border-b border-gray-200 hover:bg-gray-50">
                        <td className="py-3 px-2 text-gray-900" data-testid={`text-driver-id-${row.driverId}`}>{row.driverId}</td>
                        <td className="py-3 px-2 text-gray-900" data-testid={`text-driver-name-${row.driverId}`}>{row.driverName}</td>
                        <td className="py-3 px-2 text-right text-gray-900" data-testid={`text-rent-${row.driverId}`}>{inr(row.rent)}</td>
                        <td className="py-3 px-2 text-right text-gray-900" data-testid={`text-collection-${row.driverId}`}>{inr(row.collection)}</td>
                        <td className="py-3 px-2 text-right text-gray-900" data-testid={`text-fuel-${row.driverId}`}>{inr(row.fuel)}</td>

                        <td className="py-3 px-2 text-right">
                          {editing ? (
                            <Input
                              type="number"
                              value={draftTotalEarnings}
                              onChange={(e) => setDraftTotalEarnings(e.target.value)}
                              className="w-24 text-right"
                              data-testid={`input-total-earnings-${row.driverId}`}
                            />
                          ) : (totalEarnings ? inr(totalEarnings) : "—")}
                        </td>

                        <td className="py-3 px-2 text-right">
                          {editing ? (
                            <Input
                              type="number"
                              value={draftCash}
                              onChange={(e) => setDraftCash(e.target.value)}
                              className="w-24 text-right"
                              data-testid={`input-cash-${row.driverId}`}
                            />
                          ) : (cash ? inr(cash) : "—")}
                        </td>

                        <td className="py-3 px-2 text-right">
                          {editing ? (
                            <Input
                              type="number"
                              value={draftRefund}
                              onChange={(e) => setDraftRefund(e.target.value)}
                              className="w-24 text-right"
                              data-testid={`input-refund-${row.driverId}`}
                            />
                          ) : (refund ? inr(refund) : "—")}
                        </td>

                        <td className="py-3 px-2 text-right">
                          {editing ? (
                            <Input
                              type="number"
                              value={draftExpenses}
                              onChange={(e) => setDraftExpenses(e.target.value)}
                              className="w-24 text-right"
                              data-testid={`input-expenses-${row.driverId}`}
                            />
                          ) : (expenses ? inr(expenses) : "—")}
                        </td>

                        <td className="py-3 px-2 text-right font-semibold" data-testid={`text-wallet-${row.driverId}`}>
                          {inr(wallet)}
                        </td>

                        <td className="py-3 px-2 text-right">
                          {editing ? (
                            <Input
                              type="number"
                              value={draftDues}
                              onChange={(e) => setDraftDues(e.target.value)}
                              className="w-24 text-right"
                              data-testid={`input-dues-${row.driverId}`}
                            />
                          ) : (dues ? inr(dues) : "—")}
                        </td>

                        <td className="py-3 px-2 text-right">
                          {editing ? (
                            <Input
                              type="number"
                              value={draftPayout}
                              onChange={(e) => setDraftPayout(e.target.value)}
                              className="w-24 text-right"
                              data-testid={`input-payout-${row.driverId}`}
                            />
                          ) : (payout ? inr(payout) : "—")}
                        </td>

                        <td className="py-3 px-2 text-right font-bold" data-testid={`text-total-${row.driverId}`}>
                          {inr(total)}
                        </td>

                        <td className="py-3 px-2 text-center">
                          <div className="flex gap-2 justify-center">
                            {!editing ? (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => onEdit(row)}
                                  data-testid={`button-edit-${row.driverId}`}
                                >
                                  ✎ Edit
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => onClear(row.driverId, row.driverName)}
                                  data-testid={`button-clear-${row.driverId}`}
                                >
                                  🗑 Clear
                                </Button>
                              </>
                            ) : (
                              <>
                                <Button
                                  size="sm"
                                  onClick={() => onSave(row.driverId, row.driverName)}
                                  disabled={saveMutation.isPending}
                                  data-testid={`button-save-${row.driverId}`}
                                >
                                  ✓ Save
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={onCancel}
                                  data-testid={`button-cancel-${row.driverId}`}
                                >
                                  ↩ Cancel
                                </Button>
                              </>
                            )}
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

      {/* Save Confirmation Dialog */}
      <AlertDialog open={saveConfirm !== null} onOpenChange={() => setSaveConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Save</AlertDialogTitle>
            <AlertDialogDescription>
              {saveConfirm && `Are you sure you want to save the weekly summary for ${saveConfirm.driverName}? This will update the financial data in the database.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmSave}>
              Save
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Clear Confirmation Dialog */}
      <AlertDialog open={clearConfirm !== null} onOpenChange={() => setClearConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Clear</AlertDialogTitle>
            <AlertDialogDescription>
              {clearConfirm && `Are you sure you want to clear the weekly summary data (Total Earnings, Cash, Refund, Expenses) for ${clearConfirm.driverName}? This action will delete the imported data from the database and cannot be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmClear}
              className="bg-red-600 hover:bg-red-700"
            >
              Clear
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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

      {/* Duplicate Data Confirmation Dialog */}
      <AlertDialog open={duplicateConfirm !== null} onOpenChange={() => setDuplicateConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Data Already Exists</AlertDialogTitle>
            <AlertDialogDescription>
              The following drivers already have data for these weeks. Do you want to overwrite the existing data?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="my-4 max-h-64 overflow-y-auto">
            <ul className="list-disc list-inside space-y-1">
              {duplicateConfirm?.existingData.map((item, index) => (
                <li key={index} className="text-sm text-gray-700">
                  <strong>{item.driverName}</strong> - Week of {format(new Date(item.weekStart), "MMM d")} to {format(new Date(item.weekEnd), "MMM d, yyyy")}
                </li>
              ))}
            </ul>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmOverwriteImport}
              className="bg-orange-600 hover:bg-orange-700"
            >
              Overwrite
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
