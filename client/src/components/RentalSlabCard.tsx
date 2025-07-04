import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface RentalSlabCardProps {
  vehicleId: number;
}

export default function RentalSlabCard({ vehicleId }: RentalSlabCardProps) {
  const { data: vehicleSummary, isLoading } = useQuery({
    queryKey: ["/api/vehicles", vehicleId, "weekly-summary"],
    queryFn: () => api.getVehicleSummary(vehicleId),
    enabled: !!vehicleId,
  });

  const { data: rentalSlabs } = useQuery({
    queryKey: ["/api/rental-slabs", vehicleSummary?.vehicle.company],
    queryFn: () => vehicleSummary?.vehicle.company ? api.getRentalSlabs(vehicleSummary.vehicle.company) : null,
    enabled: !!vehicleSummary?.vehicle.company,
  });

  if (isLoading) {
    return <div className="animate-pulse h-96 bg-gray-200 rounded-xl"></div>;
  }

  if (!vehicleSummary) {
    return null;
  }

  const getCurrentSlabInfo = () => {
    if (!rentalSlabs) return null;
    
    const currentSlab = rentalSlabs.find(slab => {
      const trips = vehicleSummary.totalTrips;
      return trips >= slab.minTrips && (slab.maxTrips === null || trips <= slab.maxTrips);
    });
    
    return currentSlab;
  };

  const currentSlab = getCurrentSlabInfo();

  return (
    <Card className="rounded-xl shadow-sm border border-gray-200">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-gray-900">Rental Slab Information</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Slab */}
        <div className="fleet-gradient-blue rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-blue-900">Current Slab</span>
            <Badge variant="secondary" className="bg-blue-200 text-blue-800">
              {vehicleSummary.vehicle.company}
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-lg font-bold text-blue-900">
              {currentSlab ? 
                `${currentSlab.minTrips}${currentSlab.maxTrips ? `-${currentSlab.maxTrips}` : '+'} trips` :
                'Unknown slab'
              }
            </span>
            <span className="text-lg font-bold text-blue-900">₹{vehicleSummary.rentalRate}/day</span>
          </div>
        </div>

        {/* Next Better Slab */}
        {vehicleSummary.rentalInfo.nextBetterSlab && (
          <div className="fleet-gradient-green rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-green-900">Next Better Slab</span>
              <Badge variant="secondary" className="bg-green-200 text-green-800">
                Target
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-lg font-bold text-green-900">
                {vehicleSummary.totalTrips + vehicleSummary.rentalInfo.nextBetterSlab.tripsNeeded}+ trips
              </span>
              <span className="text-lg font-bold text-green-900">
                ₹{vehicleSummary.rentalInfo.nextBetterSlab.rate}/day
              </span>
            </div>
            <p className="text-xs text-green-700 mt-2">
              Save ₹{(vehicleSummary.rentalRate - vehicleSummary.rentalInfo.nextBetterSlab.rate) * 7}/week with {vehicleSummary.rentalInfo.nextBetterSlab.tripsNeeded} more trips
            </p>
          </div>
        )}

        {/* All Slabs Reference */}
        <div className="border-t pt-4">
          <h4 className="text-sm font-medium text-gray-900 mb-3">
            {vehicleSummary.vehicle.company} Rental Slabs
          </h4>
          <div className="space-y-2 text-xs">
            {rentalSlabs?.map((slab, index) => {
              const isCurrentSlab = vehicleSummary.totalTrips >= slab.minTrips && 
                                   (slab.maxTrips === null || vehicleSummary.totalTrips <= slab.maxTrips);
              
              return (
                <div key={index} className={`flex justify-between ${isCurrentSlab ? 'text-blue-600 font-medium' : 'text-gray-600'}`}>
                  <span>
                    {slab.minTrips}{slab.maxTrips ? `-${slab.maxTrips}` : '+'} trips
                  </span>
                  <span>₹{slab.rate}/day</span>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
