export interface RentalSlab {
  minTrips: number;
  maxTrips: number | null;
  rate: number;
}

export interface RentalInfo {
  currentRate: number;
  nextBetterSlab: {
    rate: number;
    tripsNeeded: number;
  } | null;
  weeklyCost: number;
  optimizationTip: string;
}

const LETZRYD_SLABS: RentalSlab[] = [
  { minTrips: 140, maxTrips: null, rate: 260 },
  { minTrips: 125, maxTrips: 139, rate: 380 },
  { minTrips: 110, maxTrips: 124, rate: 470 },
  { minTrips: 80, maxTrips: 109, rate: 600 },
  { minTrips: 65, maxTrips: 79, rate: 710 },
  { minTrips: 0, maxTrips: 64, rate: 950 },
];

const PMV_SLABS: RentalSlab[] = [
  { minTrips: 140, maxTrips: null, rate: 150 },
  { minTrips: 135, maxTrips: 139, rate: 249 },
  { minTrips: 120, maxTrips: 134, rate: 444 },
  { minTrips: 80, maxTrips: 119, rate: 640 },
  { minTrips: 65, maxTrips: 79, rate: 750 },
  { minTrips: 0, maxTrips: 64, rate: 949 },
];

export function getRentalRate(company: "PMV" | "Letzryd", tripCount: number): number {
  const slabs = company === "PMV" ? PMV_SLABS : LETZRYD_SLABS;
  
  for (const slab of slabs) {
    if (tripCount >= slab.minTrips && (slab.maxTrips === null || tripCount <= slab.maxTrips)) {
      return slab.rate;
    }
  }
  
  // Fallback to highest rate if no slab matches
  return slabs[slabs.length - 1].rate;
}

export function getRentalInfo(company: "PMV" | "Letzryd", tripCount: number): RentalInfo {
  const slabs = company === "PMV" ? PMV_SLABS : LETZRYD_SLABS;
  const currentRate = getRentalRate(company, tripCount);
  const weeklyCost = currentRate * 7;
  
  // Find next better slab (lower rate with higher trip requirement)
  let nextBetterSlab = null;
  
  for (const slab of slabs) {
    if (slab.rate < currentRate && tripCount < slab.minTrips) {
      const tripsNeeded = slab.minTrips - tripCount;
      nextBetterSlab = {
        rate: slab.rate,
        tripsNeeded,
      };
      break;
    }
  }
  
  // Generate optimization tip
  let optimizationTip = "";
  if (nextBetterSlab) {
    optimizationTip = `${nextBetterSlab.tripsNeeded} more trips needed to reach ₹${nextBetterSlab.rate}/day slab. Current: ${tripCount} trips, Target: ${nextBetterSlab.tripsNeeded + tripCount} trips.`;
  } else {
    optimizationTip = "You've reached the best slab! 🎉";
  }

  return {
    currentRate,
    nextBetterSlab,
    weeklyCost,
    optimizationTip,
  };
}

export function getDriverRent(hasAccommodation: boolean): number {
  return hasAccommodation ? 600 : 500;
}

export function getSubstituteDriverCharge(shiftHours: 6 | 8 | 12): number {
  const rates = {
    6: 250,
    8: 350,
    12: 500,
  };
  return rates[shiftHours];
}

export function getAllSlabs(company: "PMV" | "Letzryd"): RentalSlab[] {
  return company === "PMV" ? PMV_SLABS : LETZRYD_SLABS;
}
