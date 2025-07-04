import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Calculator, UserPlus, FileText, ChevronRight } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

interface QuickActionsProps {
  onAddTripLog: () => void;
  onAddSubstitute?: () => void;
}

export default function QuickActions({ onAddTripLog, onAddSubstitute }: QuickActionsProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Process all settlements mutation
  const processAllSettlementsMutation = useMutation({
    mutationFn: () => api.processAllSettlements(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settlements"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/profit-graph"] });
      toast({
        title: "Success",
        description: "All settlements processed successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to process settlements",
        variant: "destructive",
      });
    },
  });

  // Export data function
  const handleExport = async (type: "settlements" | "trips" | "drivers" | "vehicles") => {
    try {
      const blob = await api.exportData(type);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${type}_export_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Success",
        description: `${type.charAt(0).toUpperCase() + type.slice(1)} exported successfully`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to export ${type}`,
        variant: "destructive",
      });
    }
  };
  const actions = [
    {
      icon: Plus,
      label: "Add Trip Log",
      bgColor: "fleet-gradient-blue",
      textColor: "text-blue-900",
      iconColor: "text-blue-600",
      onClick: onAddTripLog,
      disabled: false,
    },
    {
      icon: Calculator,
      label: "Process Settlement",
      bgColor: "fleet-gradient-green",
      textColor: "text-green-900",
      iconColor: "text-green-600",
      onClick: () => processAllSettlementsMutation.mutate(),
      disabled: processAllSettlementsMutation.isPending,
    },
    {
      icon: UserPlus,
      label: "Add Substitute",
      bgColor: "fleet-gradient-purple",
      textColor: "text-purple-900",
      iconColor: "text-purple-600",
      onClick: onAddSubstitute || (() => {}),
      disabled: false,
    },
    {
      icon: FileText,
      label: "Export Report",
      bgColor: "fleet-gradient-amber",
      textColor: "text-orange-900",
      iconColor: "text-orange-600",
      onClick: () => handleExport("settlements"),
      disabled: false,
    },
  ];

  return (
    <Card className="rounded-xl shadow-sm border border-gray-200">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-gray-900">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {actions.map((action) => {
            const Icon = action.icon;
            return (
              <Button
                key={action.label}
                variant="ghost"
                className={`w-full justify-between p-3 h-auto ${action.bgColor} hover:opacity-80 transition-opacity`}
                onClick={action.onClick}
                disabled={action.disabled}
              >
                <div className="flex items-center space-x-3">
                  <Icon className={`w-5 h-5 ${action.iconColor}`} />
                  <span className={`font-medium ${action.textColor}`}>{action.label}</span>
                </div>
                <ChevronRight className={`w-4 h-4 ${action.iconColor} opacity-60`} />
              </Button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
