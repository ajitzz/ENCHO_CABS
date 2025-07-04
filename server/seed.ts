import { storage } from "./storage";

async function seedDatabase() {
  try {
    console.log("Starting database seeding...");

    // Create sample vehicles
    const vehicle1 = await storage.createVehicle({
      vehicleNumber: "KA01AB1234",
      company: "PMV"
    });

    const vehicle2 = await storage.createVehicle({
      vehicleNumber: "KA02CD5678", 
      company: "Letzryd"
    });

    // Create sample drivers
    const driver1 = await storage.createDriver({
      name: "Rajesh Kumar",
      phone: "+91-9876543210",
      hasAccommodation: true
    });

    const driver2 = await storage.createDriver({
      name: "Suresh Reddy", 
      phone: "+91-9876543211",
      hasAccommodation: false
    });

    const driver3 = await storage.createDriver({
      name: "Mahesh Singh",
      phone: "+91-9876543212", 
      hasAccommodation: true
    });

    const driver4 = await storage.createDriver({
      name: "Ramesh Gupta",
      phone: "+91-9876543213",
      hasAccommodation: false
    });

    // Create vehicle-driver assignments
    await storage.createVehicleDriverAssignment({
      vehicleId: vehicle1.id,
      morningDriverId: driver1.id,
      eveningDriverId: driver2.id
    });

    await storage.createVehicleDriverAssignment({
      vehicleId: vehicle2.id,
      morningDriverId: driver3.id,
      eveningDriverId: driver4.id
    });

    // Create sample trips for the past week
    const today = new Date();
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    for (let i = 0; i < 7; i++) {
      const tripDate = new Date(weekAgo.getTime() + i * 24 * 60 * 60 * 1000);
      
      // Vehicle 1 trips
      await storage.createTrip({
        driverId: driver1.id,
        vehicleId: vehicle1.id,
        tripDate,
        shift: "morning",
        tripCount: Math.floor(Math.random() * 15) + 8 // 8-22 trips
      });

      await storage.createTrip({
        driverId: driver2.id,
        vehicleId: vehicle1.id,
        tripDate,
        shift: "evening", 
        tripCount: Math.floor(Math.random() * 15) + 8 // 8-22 trips
      });

      // Vehicle 2 trips
      await storage.createTrip({
        driverId: driver3.id,
        vehicleId: vehicle2.id,
        tripDate,
        shift: "morning",
        tripCount: Math.floor(Math.random() * 12) + 6 // 6-17 trips
      });

      await storage.createTrip({
        driverId: driver4.id,
        vehicleId: vehicle2.id,
        tripDate,
        shift: "evening",
        tripCount: Math.floor(Math.random() * 12) + 6 // 6-17 trips
      });
    }

    // Create sample rent logs
    for (let i = 0; i < 5; i++) {
      const rentDate = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
      
      await storage.createDriverRentLog({
        driverId: driver1.id,
        date: rentDate,
        rent: 600,
        paid: i < 3 // First 3 days paid, last 2 unpaid
      });

      await storage.createDriverRentLog({
        driverId: driver2.id,
        date: rentDate,
        rent: 500,
        paid: i < 2 // First 2 days paid, last 3 unpaid
      });

      await storage.createDriverRentLog({
        driverId: driver3.id,
        date: rentDate,
        rent: 600,
        paid: true // All paid
      });

      await storage.createDriverRentLog({
        driverId: driver4.id,
        date: rentDate,
        rent: 500,
        paid: i < 4 // First 4 days paid, last 1 unpaid
      });
    }

    console.log("Database seeding completed successfully!");
    console.log(`Created ${2} vehicles, ${4} drivers, ${28} trips, and ${20} rent logs`);

  } catch (error) {
    console.error("Error seeding database:", error);
    throw error;
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

export { seedDatabase };