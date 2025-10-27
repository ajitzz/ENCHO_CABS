import { useState } from "react";
import Papa from "papaparse";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function ImportPage() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<any>(null);
  const { toast } = useToast();

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      toast({
        title: "Invalid File",
        description: "Please upload a CSV file",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    setResult(null);

    try {
      // Read file
      const text = await file.text();
      
      // Parse CSV using Papaparse (handles quoted fields, commas, etc.)
      const parseResult = Papa.parse(text, {
        header: true,
        skipEmptyLines: true,
        trimHeaders: true,
        transform: (value) => value.trim(),
      });

      if (parseResult.errors.length > 0) {
        console.error("CSV parsing errors:", parseResult.errors);
        toast({
          title: "CSV Parsing Warning",
          description: `Found ${parseResult.errors.length} parsing issues. The import will continue.`,
          variant: "destructive",
        });
      }

      const csvData = parseResult.data;

      // Send to API
      const response = await fetch('/api/import/trip-logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ csvData }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Check if this is a duplicate rejection
        if (data.rejected && data.duplicates) {
          setResult({
            rejected: true,
            message: data.message,
            duplicates: data.duplicates,
          });
        } else {
          throw new Error(data.message || 'Import failed');
        }
      } else {
        setResult(data);
        toast({
          title: "Import Successful",
          description: `Imported ${data.success} records successfully`,
        });
      }
    } catch (error: any) {
      toast({
        title: "Import Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
      // Reset file input
      event.target.value = '';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Import Trip Logs</h1>
        <p className="text-gray-600 mt-2">Upload a CSV file to bulk import trip log data</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>CSV File Upload</CardTitle>
          <CardDescription>
            Upload a CSV file with columns: Date, Vehicle, Driver, Shift, Rent, Collection, Fuel
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
            <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <label htmlFor="csv-upload" className="cursor-pointer">
              <Button 
                variant="outline" 
                disabled={isProcessing}
                onClick={() => document.getElementById('csv-upload')?.click()}
                data-testid="button-upload-csv"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Choose CSV File
                  </>
                )}
              </Button>
              <input
                id="csv-upload"
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="hidden"
                disabled={isProcessing}
              />
            </label>
            <p className="text-sm text-gray-500 mt-2">
              Supported format: CSV (.csv)
            </p>
          </div>

          {result && (
            <div className="space-y-4 mt-6">
              {result.rejected ? (
                <Alert className="border-red-500 bg-red-50">
                  <AlertCircle className="h-4 w-4 text-red-500" />
                  <AlertDescription>
                    <div className="space-y-3">
                      <p className="font-semibold text-red-700 text-lg">File Rejected - Duplicate Entries Found</p>
                      <p className="text-red-600">{result.message}</p>
                      <div className="bg-white border border-red-300 rounded p-3 mt-3">
                        <p className="font-semibold text-red-700 mb-2">Duplicate Drivers Found:</p>
                        <ul className="list-disc list-inside space-y-1 text-sm max-h-48 overflow-y-auto">
                          {result.duplicates?.map((dup: string, index: number) => (
                            <li key={index} className="text-red-600 font-mono text-xs">{dup}</li>
                          ))}
                        </ul>
                      </div>
                      <p className="text-sm text-red-700 mt-3">
                        <strong>Action required:</strong> Please remove the duplicate entries from your CSV file and try importing again. 
                        Each driver can only have one entry per day.
                      </p>
                    </div>
                  </AlertDescription>
                </Alert>
              ) : (
                <>
                  <Alert className={result.errors?.length > 0 ? "border-yellow-500" : "border-green-500"}>
                    {result.errors?.length > 0 ? (
                      <AlertCircle className="h-4 w-4 text-yellow-500" />
                    ) : (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    )}
                    <AlertDescription>
                      <div className="space-y-2">
                        <p className="font-semibold">Import Results:</p>
                        <ul className="list-disc list-inside space-y-1 text-sm">
                          <li>Successfully imported: <span className="font-bold text-green-600">{result.success}</span> records</li>
                          <li>Skipped: <span className="font-bold text-gray-600">{result.skipped}</span> records (No Vehicle/Leave entries or existing entries)</li>
                          {result.details?.tripsCreated > 0 && (
                            <li>Trips created: <span className="font-bold">{result.details.tripsCreated}</span></li>
                          )}
                          {result.details?.rentLogsCreated > 0 && (
                            <li>Rent logs created: <span className="font-bold">{result.details.rentLogsCreated}</span></li>
                          )}
                          {result.details?.vehiclesCreated?.length > 0 && (
                            <li>New vehicles created: <span className="font-bold">{result.details.vehiclesCreated.join(', ')}</span></li>
                          )}
                          {result.details?.driversCreated?.length > 0 && (
                            <li>New drivers created: <span className="font-bold">{result.details.driversCreated.join(', ')}</span></li>
                          )}
                        </ul>
                      </div>
                    </AlertDescription>
                  </Alert>

                  {result.errors?.length > 0 && (
                    <Alert className="border-red-500">
                      <AlertCircle className="h-4 w-4 text-red-500" />
                      <AlertDescription>
                        <div className="space-y-2">
                          <p className="font-semibold text-red-700">Errors ({result.errors.length}):</p>
                          <ul className="list-disc list-inside space-y-1 text-sm max-h-48 overflow-y-auto">
                            {result.errors.map((error: string, index: number) => (
                              <li key={index} className="text-red-600">{error}</li>
                            ))}
                          </ul>
                        </div>
                      </AlertDescription>
                    </Alert>
                  )}
                </>
              )}
            </div>
          )}

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
            <h4 className="font-semibold text-blue-900 mb-2">CSV Format Requirements:</h4>
            <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
              <li>Date format: DD/MM/YYYY (e.g., 06/10/2025)</li>
              <li>Vehicle: Vehicle number (e.g., KA05AP7645)</li>
              <li>Driver: Driver name</li>
              <li>Shift: Morning or Evening</li>
              <li>Rent: Numeric value (can be empty)</li>
              <li>Collection: Numeric value (can be empty)</li>
              <li>Fuel: Numeric value (can be empty)</li>
            </ul>
            <p className="text-sm text-blue-700 mt-3">
              <strong>Important:</strong> Each driver can only have ONE entry per day. The file will be rejected if duplicate drivers are found on the same date.
            </p>
            <p className="text-sm text-blue-700 mt-1">
              <strong>Note:</strong> Rows with "No Vechicle" or "Leave" will be automatically skipped. 
              Missing vehicles and drivers will be created automatically.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
