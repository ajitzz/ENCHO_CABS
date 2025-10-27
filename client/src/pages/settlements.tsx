import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableHead, TableHeader, TableRow, TableBody, TableCell } from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const inr = (n:number)=> new Intl.NumberFormat("en-IN",{style:"currency",currency:"INR",maximumFractionDigits:0}).format(n||0);
const fmt = (iso:string)=> new Date(iso).toLocaleDateString("en-GB");

type Key = string; // `${weekStart}-${weekEnd}`

export default function SettlementsPage() {
  const qc = useQueryClient();
  const { data, isLoading, error } = useQuery({ queryKey:["settlements"], queryFn: () => api.getSettlements() });
  const rows = data?.items ?? [];

  // which row is in edit mode + its drafts
  const [editingKey, setEditingKey] = useState<Key | null>(null);
  const [draftCR, setDraftCR] = useState<string>(""); // Company Rent
  const [draftCW, setDraftCW] = useState<string>(""); // Company Wallet
  
  // Confirmation dialog states
  const [saveConfirm, setSaveConfirm] = useState<{ weekStart: string; weekEnd: string } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ weekStart: string; weekEnd: string } | null>(null);

  const mSave = useMutation({
    mutationFn: api.saveSettlement,
    onSuccess: () => {
      setEditingKey(null);
      setDraftCR("");
      setDraftCW("");
      qc.invalidateQueries({ queryKey:["settlements"] });
    },
  });
  const mDel = useMutation({
    mutationFn: ({weekStart, weekEnd}:{weekStart:string; weekEnd:string}) => api.deleteSettlement(weekStart, weekEnd),
    onSuccess: () => qc.invalidateQueries({ queryKey:["settlements"] }),
  });

  const onEdit = (key: Key, crInit: number | null, cwInit: number | null) => {
    setEditingKey(key);
    setDraftCR(crInit!=null? String(crInit):"");
    setDraftCW(cwInit!=null? String(cwInit):"");
  };
  const onCancel = () => {
    setEditingKey(null);
    setDraftCR("");
    setDraftCW("");
  };
  const onSave = (weekStart:string, weekEnd:string) => {
    setSaveConfirm({ weekStart, weekEnd });
  };

  const confirmSave = () => {
    if (saveConfirm) {
      mSave.mutate({
        weekStart: saveConfirm.weekStart,
        weekEnd: saveConfirm.weekEnd,
        companyRent: draftCR==="" ? null : Number(draftCR),
        companyWallet: draftCW==="" ? null : Number(draftCW),
      });
      setSaveConfirm(null);
    }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Settlements</h1>

      <Card className="p-0 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Week</TableHead>
              <TableHead className="text-right">Rent</TableHead>
              <TableHead className="text-right">Wallet</TableHead>
              <TableHead className="text-right">Company Rent</TableHead>
              <TableHead className="text-right">Company Wallet</TableHead>
              <TableHead className="text-right">Room Rent</TableHead>
              <TableHead className="text-right">Profit</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && <TableRow><TableCell colSpan={8}>Loading…</TableCell></TableRow>}
            {error && <TableRow><TableCell colSpan={8}>Failed to load.</TableCell></TableRow>}
            {!isLoading && rows.length===0 && <TableRow><TableCell colSpan={8}>No data.</TableCell></TableRow>}

            {rows.map(r => {
              const key: Key = `${r.weekStart}-${r.weekEnd}`;
              const editing = editingKey === key;

              // profit should use edited values in edit mode, else saved values
              const canCalc = editing ? (draftCR!=="" && draftCW!=="") : (r.companyRent!=null && r.companyWallet!=null);
              const profit = canCalc
                ? (r.rent - r.wallet - Number(editing?draftCR:(r.companyRent||0)) + Number(editing?draftCW:(r.companyWallet||0)) - r.roomRent)
                : null;

              return (
                <TableRow key={key}>
                  <TableCell>{fmt(r.weekStart)} – {fmt(r.weekEnd)}</TableCell>

                  <TableCell className="text-right">
                    <span className="text-green-600 font-semibold">{inr(r.rent)}</span>
                  </TableCell>

                  <TableCell className="text-right">
                    <span className="text-purple-600 font-semibold">{inr(r.wallet)}</span>
                  </TableCell>

                  <TableCell className="text-right">
                    {editing ? (
                      <Input className="text-right" type="number" min={0} step={1} value={draftCR} onChange={e=>setDraftCR(e.target.value)} />
                    ) : (r.companyRent==null ? "—" : inr(r.companyRent))}
                  </TableCell>

                  <TableCell className="text-right">
                    {editing ? (
                      <Input className="text-right" type="number" min={0} step={1} value={draftCW} onChange={e=>setDraftCW(e.target.value)} />
                    ) : (r.companyWallet==null ? "—" : inr(r.companyWallet))}
                  </TableCell>

                  <TableCell className="text-right">{inr(r.roomRent)}</TableCell>

                  <TableCell className="text-right">{profit==null ? "—" : inr(profit)}</TableCell>

                  <TableCell className="text-right space-x-2">
                    {!editing ? (
                      <>
                        <Button size="sm" variant="outline" onClick={()=>onEdit(key, r.companyRent, r.companyWallet)}>✎ Edit</Button>
                        <Button size="sm" variant="destructive" onClick={()=>setDeleteConfirm({ weekStart:r.weekStart, weekEnd:r.weekEnd })}>🗑 Delete</Button>
                      </>
                    ) : (
                      <>
                        <Button size="sm" onClick={()=>onSave(r.weekStart, r.weekEnd)} disabled={mSave.isPending}>✓ Save</Button>
                        <Button size="sm" variant="ghost" onClick={onCancel}>↩ Cancel</Button>
                      </>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>

      {/* Save Confirmation Dialog */}
      <AlertDialog open={saveConfirm !== null} onOpenChange={() => setSaveConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Update Settlement</AlertDialogTitle>
            <AlertDialogDescription>
              {saveConfirm && `Are you sure you want to update the settlement for ${fmt(saveConfirm.weekStart)} – ${fmt(saveConfirm.weekEnd)}? This will modify the settlement details in the database.`}
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

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirm !== null} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Delete Settlement</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteConfirm && `Are you sure you want to delete the settlement for ${fmt(deleteConfirm.weekStart)} – ${fmt(deleteConfirm.weekEnd)}? This action cannot be undone and will remove the settlement from the database.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteConfirm) {
                  mDel.mutate({ weekStart: deleteConfirm.weekStart, weekEnd: deleteConfirm.weekEnd });
                  setDeleteConfirm(null);
                }
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
