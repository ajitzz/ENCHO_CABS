import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle } from "lucide-react";
import * as XLSX from 'xlsx';

interface ExcelRow {
  date: string;
  carReg: string;
  drivers: string;
  rent: number;
  amountReceived: number;
  qrAmountCollected: number;
  fuel: number;
  shift: string;
}

export default function ImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [data, setData] = useState<ExcelRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [importResults, setImportResults] = useState<{
    drivers: number;
    vehicles: number;
    trips: number;
    errors: string[];
  } | null>(null);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0];
    if (!uploadedFile) return;

    setFile(uploadedFile);
    setData([]);
    setImportResults(null);

    try {
      const arrayBuffer = await uploadedFile.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      
      const septemberSheet = workbook.Sheets['September Driver Analysis'];
      if (!septemberSheet) {
        toast({
          title: "Error",
          description: "Could not find 'September Driver Analysis' sheet in the Excel file.",
          variant: "destructive",
        });
        return;
      }

      const jsonData = XLSX.utils.sheet_to_json(septemberSheet, { header: 1 });
      
      if (jsonData.length < 2) {
        toast({
          title: "Error",
          description: "No data found in September Driver Analysis sheet.",
          variant: "destructive",
        });
        return;
      }

      const headers = jsonData[0] as string[];
      const dateIdx = headers.findIndex(h => h?.toLowerCase().includes('date'));
      const carRegIdx = headers.findIndex(h => h?.toLowerCase().includes('car') || h?.toLowerCase().includes('reg'));
      const driversIdx = headers.findIndex(h => h?.toLowerCase().includes('driver'));
      const rentIdx = headers.findIndex(h => h?.toLowerCase().includes('rent') && !h?.toLowerCase().includes('room'));
      const amountReceivedIdx = headers.findIndex(h => h?.toLowerCase().includes('amount') && h?.toLowerCase().includes('received'));
      const qrAmountIdx = headers.findIndex(h => h?.toLowerCase().includes('qr') && h?.toLowerCase().includes('amount'));
      const fuelIdx = headers.findIndex(h => h?.toLowerCase().includes('fuel'));
      const shiftIdx = headers.findIndex(h => h?.toLowerCase().includes('shift'));

      const extractedData: ExcelRow[] = [];
      
      for (let i = 1; i < jsonData.length; i++) {
        const row = jsonData[i] as any[];
        
        if (!row || row.length === 0 || !row[driversIdx] || !row[carRegIdx]) {
          continue;
        }

        let dateValue = '';
        if (dateIdx >= 0 && row[dateIdx]) {
          const rawDate = row[dateIdx];
          if (typeof rawDate === 'number') {
            const date = XLSX.SSF.parse_date_code(rawDate);
            dateValue = `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`;
          } else {
            dateValue = String(rawDate);
          }
        }

        const amountReceived = amountReceivedIdx >= 0 ? parseFloat(row[amountReceivedIdx]) || 0 : 0;
        const qrAmount = qrAmountIdx >= 0 ? parseFloat(row[qrAmountIdx]) || 0 : 0;
        const collection = amountReceived || qrAmount;

        extractedData.push({
          date: dateValue,
          carReg: String(row[carRegIdx] || '').trim(),
          drivers: String(row[driversIdx] || '').trim(),
          rent: rentIdx >= 0 ? parseFloat(row[rentIdx]) || 0 : 0,
          amountReceived,
          qrAmountCollected: qrAmount,
          fuel: fuelIdx >= 0 ? parseFloat(row[fuelIdx]) || 0 : 0,
          shift: shiftIdx >= 0 ? String(row[shiftIdx] || '').trim() : 'Day',
        });
      }

      setData(extractedData);
      toast({
        title: "Success",
        description: `Extracted ${extractedData.length} rows from September Driver Analysis sheet.`,
      });
    } catch (error) {
      console.error('Error reading Excel file:', error);
      toast({
        title: "Error",
        description: "Failed to read Excel file. Please check the file format.",
        variant: "destructive",
      });
    }
  };

  const handleImport = async () => {
    if (data.length === 0) {
      toast({
        title: "No Data",
        description: "Please upload and extract data first.",
        variant: "destructive",
      });
      return;
    }

    setImporting(true);
    const errors: string[] = [];
    let driversAdded = 0;
    let vehiclesAdded = 0;
    let tripsAdded = 0;

    try {
      const uniqueDrivers = Array.from(new Set(data.map(d => d.drivers))).filter(Boolean);
      const uniqueVehicles = Array.from(new Set(data.map(d => d.carReg))).filter(Boolean);

      for (const driverName of uniqueDrivers) {
        try {
          await apiRequest('/api/drivers', 'POST', {
            name: driverName,
            qrCode: `DRV-${driverName.replace(/\s+/g, '-').toUpperCase()}`,
            startDate: data.find(d => d.drivers === driverName)?.date || new Date().toISOString().split('T')[0],
          });
          driversAdded++;
        } catch (error: any) {
          if (!error?.message?.includes('duplicate') && !error?.message?.includes('unique')) {
            errors.push(`Driver ${driverName}: ${error?.message || 'Unknown error'}`);
          }
        }
      }

      for (const vehicleReg of uniqueVehicles) {
        try {
          await apiRequest('/api/vehicles', 'POST', {
            number: vehicleReg,
            qrCode: `VEH-${vehicleReg.replace(/\s+/g, '-').toUpperCase()}`,
            provider: 'PMV',
            startDate: data.find(d => d.carReg === vehicleReg)?.date || new Date().toISOString().split('T')[0],
          });
          vehiclesAdded++;
        } catch (error: any) {
          if (!error?.message?.includes('duplicate') && !error?.message?.includes('unique')) {
            errors.push(`Vehicle ${vehicleReg}: ${error?.message || 'Unknown error'}`);
          }
        }
      }

      for (const row of data) {
        try {
          const collection = row.amountReceived || row.qrAmountCollected;
          
          await apiRequest('/api/trips', 'POST', {
            date: row.date,
            vehicleNumber: row.carReg,
            driverName: row.drivers,
            shift: row.shift || 'Day',
            rent: row.rent,
            collection,
            fuel: row.fuel,
          });
          tripsAdded++;
        } catch (error: any) {
          errors.push(`Trip on ${row.date} for ${row.drivers}: ${error?.message || 'Unknown error'}`);
        }
      }

      setImportResults({
        drivers: driversAdded,
        vehicles: vehiclesAdded,
        trips: tripsAdded,
        errors,
      });

      queryClient.invalidateQueries({ queryKey: ['/api/drivers'] });
      queryClient.invalidateQueries({ queryKey: ['/api/vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['/api/trips'] });

      toast({
        title: "Import Complete",
        description: `Added ${driversAdded} drivers, ${vehiclesAdded} vehicles, and ${tripsAdded} trips.`,
      });
    } catch (error) {
      toast({
        title: "Import Failed",
        description: "An error occurred during import.",
        variant: "destructive",
      });
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Import from Excel</h1>
        <p className="text-muted-foreground mt-2">
          Upload your Excel file to import drivers, vehicles, and trip logs from the September Driver Analysis sheet.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Upload Excel File
          </CardTitle>
          <CardDescription>
            Select an Excel file containing the September Driver Analysis sheet with your trip data.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileUpload}
              data-testid="input-excel-file"
            />
            {file && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <FileSpreadsheet className="h-4 w-4" />
                {file.name}
              </div>
            )}
          </div>

          {data.length > 0 && (
            <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <span className="font-medium">
                  {data.length} rows extracted from September Driver Analysis sheet
                </span>
              </div>
              <Button
                onClick={handleImport}
                disabled={importing}
                data-testid="button-import-data"
              >
                <Upload className="h-4 w-4 mr-2" />
                {importing ? 'Importing...' : 'Import Data'}
              </Button>
            </div>
          )}

          {importResults && (
            <div className="space-y-3 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
              <h3 className="font-semibold flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-blue-600" />
                Import Results
              </h3>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <div className="text-muted-foreground">Drivers Added</div>
                  <div className="text-2xl font-bold text-green-600">{importResults.drivers}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Vehicles Added</div>
                  <div className="text-2xl font-bold text-blue-600">{importResults.vehicles}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Trips Added</div>
                  <div className="text-2xl font-bold text-purple-600">{importResults.trips}</div>
                </div>
              </div>
              {importResults.errors.length > 0 && (
                <div className="mt-4">
                  <div className="flex items-center gap-2 text-orange-600 mb-2">
                    <AlertCircle className="h-4 w-4" />
                    <span className="font-medium">Warnings/Errors ({importResults.errors.length})</span>
                  </div>
                  <div className="max-h-40 overflow-y-auto space-y-1">
                    {importResults.errors.slice(0, 10).map((error, idx) => (
                      <div key={idx} className="text-xs text-muted-foreground">
                        • {error}
                      </div>
                    ))}
                    {importResults.errors.length > 10 && (
                      <div className="text-xs text-muted-foreground font-medium">
                        ... and {importResults.errors.length - 10} more
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {data.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Preview Data ({data.length} rows)</CardTitle>
            <CardDescription>
              Review the extracted data before importing
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg overflow-hidden">
              <div className="max-h-96 overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Vehicle</TableHead>
                      <TableHead>Driver</TableHead>
                      <TableHead>Shift</TableHead>
                      <TableHead className="text-right">Rent</TableHead>
                      <TableHead className="text-right">Collection</TableHead>
                      <TableHead className="text-right">Fuel</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.slice(0, 50).map((row, idx) => (
                      <TableRow key={idx}>
                        <TableCell>{row.date}</TableCell>
                        <TableCell>{row.carReg}</TableCell>
                        <TableCell>{row.drivers}</TableCell>
                        <TableCell>{row.shift}</TableCell>
                        <TableCell className="text-right">₹{row.rent}</TableCell>
                        <TableCell className="text-right">
                          ₹{row.amountReceived || row.qrAmountCollected}
                        </TableCell>
                        <TableCell className="text-right">₹{row.fuel}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {data.length > 50 && (
                <div className="p-3 bg-muted text-sm text-center">
                  Showing first 50 rows of {data.length}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
