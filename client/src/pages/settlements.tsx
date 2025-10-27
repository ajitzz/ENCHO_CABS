import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type SettlementRow } from "@/lib/api";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableHead, TableHeader, TableRow, TableBody, TableCell } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Save } from "lucide-react";

const inr = (n: number | null) => {
  if (n === null) return "-";
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n || 0);
};

const fmt = (iso: string) => new Date(iso).toLocaleDateString("en-GB");

interface EditState {
  weekStart: string;
  weekEnd: string;
  companyRent: string;
  companyWallet: string;
}

export default function SettlementsPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data, isLoading, error } = useQuery({ 
    queryKey: ["settlements"], 
    queryFn: () => api.getSettlements() 
  });
  const rows = data?.items ?? [];

  const [edits, setEdits] = useState<Record<string, EditState>>({});

  const mSave = useMutation({
    mutationFn: api.saveSettlement,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["settlements"] });
      setEdits({});
      toast({ title: "Saved", description: "Settlement updated successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to save settlement", variant: "destructive" });
    },
  });

  const mDel = useMutation({
    mutationFn: ({ weekStart, weekEnd }: { weekStart: string; weekEnd: string }) => api.deleteSettlement(weekStart, weekEnd),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["settlements"] });
      setEdits({});
      toast({ title: "Deleted", description: "Settlement cleared successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete settlement", variant: "destructive" });
    },
  });

  const getEditKey = (weekStart: string, weekEnd: string) => `${weekStart}_${weekEnd}`;

  const getEditValue = (row: SettlementRow, field: "companyRent" | "companyWallet") => {
    const key = getEditKey(row.weekStart, row.weekEnd);
    if (edits[key]) {
      return edits[key][field];
    }
    return row[field] === null ? "" : String(row[field]);
  };

  const setEditValue = (row: SettlementRow, field: "companyRent" | "companyWallet", value: string) => {
    const key = getEditKey(row.weekStart, row.weekEnd);
    setEdits(prev => ({
      ...prev,
      [key]: {
        weekStart: row.weekStart,
        weekEnd: row.weekEnd,
        companyRent: field === "companyRent" ? value : getEditValue(row, "companyRent"),
        companyWallet: field === "companyWallet" ? value : getEditValue(row, "companyWallet"),
      },
    }));
  };

  const handleSave = (row: SettlementRow) => {
    const key = getEditKey(row.weekStart, row.weekEnd);
    const edit = edits[key];
    if (!edit) return;

    const companyRent = edit.companyRent.trim() === "" ? null : parseInt(edit.companyRent, 10);
    const companyWallet = edit.companyWallet.trim() === "" ? null : parseInt(edit.companyWallet, 10);

    mSave.mutate({
      weekStart: row.weekStart,
      weekEnd: row.weekEnd,
      companyRent,
      companyWallet,
    });
  };

  const handleDelete = (row: SettlementRow) => {
    if (!confirm("Clear company fields for this week?")) return;
    mDel.mutate({ weekStart: row.weekStart, weekEnd: row.weekEnd });
  };

  const hasEdits = (row: SettlementRow) => {
    const key = getEditKey(row.weekStart, row.weekEnd);
    return !!edits[key];
  };

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settlements</h1>
          <p className="text-sm text-gray-600 mt-1">Weekly profit calculations (Monday to Sunday)</p>
        </div>

        {isLoading && (
          <Card className="p-8 text-center text-gray-500">Loading settlements...</Card>
        )}

        {error && (
          <Card className="p-8 text-center text-red-500">Failed to load settlements</Card>
        )}

        {!isLoading && rows.length === 0 && (
          <Card className="p-8 text-center text-gray-500">No settlements found</Card>
        )}

        {!isLoading && rows.length > 0 && (
          <Card>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[180px]">Week (Mon–Sun)</TableHead>
                    <TableHead className="text-right min-w-[120px]">Rent</TableHead>
                    <TableHead className="text-right min-w-[120px]">Wallet</TableHead>
                    <TableHead className="text-right min-w-[140px]">Company Rent</TableHead>
                    <TableHead className="text-right min-w-[140px]">Company Wallet</TableHead>
                    <TableHead className="text-right min-w-[120px]">Room Rent</TableHead>
                    <TableHead className="text-right min-w-[120px]">Profit</TableHead>
                    <TableHead className="text-center min-w-[140px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow key={`${row.weekStart}_${row.weekEnd}`}>
                      <TableCell className="font-medium whitespace-nowrap">
                        {fmt(row.weekStart)} – {fmt(row.weekEnd)}
                      </TableCell>
                      <TableCell className="text-right">{inr(row.rent)}</TableCell>
                      <TableCell className="text-right">{inr(row.wallet)}</TableCell>
                      <TableCell className="text-right">
                        <Input
                          type="number"
                          min="0"
                          placeholder="Enter amount"
                          value={getEditValue(row, "companyRent")}
                          onChange={(e) => setEditValue(row, "companyRent", e.target.value)}
                          className="w-32 text-right"
                          data-testid={`input-company-rent-${row.weekStart}`}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Input
                          type="number"
                          min="0"
                          placeholder="Enter amount"
                          value={getEditValue(row, "companyWallet")}
                          onChange={(e) => setEditValue(row, "companyWallet", e.target.value)}
                          className="w-32 text-right"
                          data-testid={`input-company-wallet-${row.weekStart}`}
                        />
                      </TableCell>
                      <TableCell className="text-right">{inr(row.roomRent)}</TableCell>
                      <TableCell className={`text-right font-semibold ${row.profit !== null && row.profit < 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {inr(row.profit)}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex gap-2 justify-center">
                          <Button
                            size="sm"
                            onClick={() => handleSave(row)}
                            disabled={!hasEdits(row) || mSave.isPending}
                            data-testid={`button-save-${row.weekStart}`}
                          >
                            <Save className="w-4 h-4 mr-1" />
                            Save
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDelete(row)}
                            disabled={mDel.isPending}
                            data-testid={`button-delete-${row.weekStart}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
