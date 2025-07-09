import { useState } from "react";
import VehicleSelector from "@/components/VehicleSelector";
import DriverPerformanceCard from "@/components/DriverPerformanceCard";
import ProfitChart from "@/components/ProfitChart";
import RentalSlabCard from "@/components/RentalSlabCard";
import UnpaidRentsPanel from "@/components/UnpaidRentsPanel";
import QuickActions from "@/components/QuickActions";
import RecentTripsTable from "@/components/RecentTripsTable";
import SettlementStatusCard from "@/components/SettlementStatusCard";
import TripLogModal from "@/components/TripLogModal";
import SubstituteDriverForm from "@/components/SubstituteDriverForm";
import SubstituteDriverList from "@/components/SubstituteDriverList";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";

export default function Dashboard() {
  const [selectedVehicleId, setSelectedVehicleId] = useState<number | null>(null);
  const [showTripLogModal, setShowTripLogModal] = useState(false);
  const [showSubstituteModal, setShowSubstituteModal] = useState(false);

  // Fetch vehicles for substitute driver form
  const { data: vehicles } = useQuery<Array<{ id: number; vehicleNumber: string; company: string }>>({
    queryKey: ["/api/vehicles"],
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Fleet Dashboard</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">Monitor your fleet performance and manage rentals</p>
        </div>
        <div className="flex items-center space-x-4">
          <Button
            onClick={() => setShowTripLogModal(true)}
            className="bg-primary text-white hover:bg-blue-600"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Trip Log
          </Button>
          <div className="flex items-center space-x-2 text-sm">
            <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
            <span className="text-gray-600 dark:text-gray-300">System Online</span>
          </div>
        </div>
      </div>

      {/* Vehicle Selector */}
      <VehicleSelector 
        selectedVehicleId={selectedVehicleId}
        onVehicleSelect={setSelectedVehicleId}
      />

      {/* Main Dashboard Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left Column - Driver Performance */}
        <div className="xl:col-span-2 space-y-6">
          {/* Driver Performance */}
          {selectedVehicleId && (
            <DriverPerformanceCard vehicleId={selectedVehicleId} />
          )}

          {/* Profit Chart */}
          <ProfitChart />
        </div>

        {/* Right Column - Rental Tracking & Unpaid Panel */}
        <div className="space-y-6">
          {/* Rental Slab Information */}
          {selectedVehicleId && (
            <RentalSlabCard vehicleId={selectedVehicleId} />
          )}

          {/* Unpaid Rents Panel */}
          <UnpaidRentsPanel />

          {/* Quick Actions */}
          <QuickActions 
            onAddTripLog={() => setShowTripLogModal(true)}
            onAddSubstitute={() => setShowSubstituteModal(true)}
          />

          {/* Substitute Driver Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Substitute Drivers</h3>
            </div>
            <SubstituteDriverList vehicleId={selectedVehicleId} />
          </div>
        </div>
      </div>

      {/* Bottom Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <RecentTripsTable />
        <SettlementStatusCard />
      </div>

      {/* Trip Log Modal */}
      <TripLogModal
        open={showTripLogModal}
        onOpenChange={setShowTripLogModal}
      />

      {/* Substitute Driver Modal */}
      {vehicles && vehicles.length > 0 && (
        <SubstituteDriverForm
          vehicleId={selectedVehicleId}
          vehicles={vehicles}
          open={showSubstituteModal}
          onOpenChange={setShowSubstituteModal}
        />
      )}
    </div>
  );
}