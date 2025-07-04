import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Calculator, UserPlus, FileText, ChevronRight } from "lucide-react";

interface QuickActionsProps {
  onAddTripLog: () => void;
}

export default function QuickActions({ onAddTripLog }: QuickActionsProps) {
  const actions = [
    {
      icon: Plus,
      label: "Add Trip Log",
      bgColor: "fleet-gradient-blue",
      textColor: "text-blue-900",
      iconColor: "text-blue-600",
      onClick: onAddTripLog,
    },
    {
      icon: Calculator,
      label: "Process Settlement",
      bgColor: "fleet-gradient-green",
      textColor: "text-green-900",
      iconColor: "text-green-600",
      onClick: () => console.log("Process settlement"),
    },
    {
      icon: UserPlus,
      label: "Add Substitute",
      bgColor: "fleet-gradient-purple",
      textColor: "text-purple-900",
      iconColor: "text-purple-600",
      onClick: () => console.log("Add substitute"),
    },
    {
      icon: FileText,
      label: "Export Report",
      bgColor: "fleet-gradient-amber",
      textColor: "text-orange-900",
      iconColor: "text-orange-600",
      onClick: () => console.log("Export report"),
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
