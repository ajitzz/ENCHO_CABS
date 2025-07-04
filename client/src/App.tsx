import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Dashboard from "@/pages/dashboard";
import Vehicles from "@/pages/vehicles";
import Drivers from "@/pages/drivers";
import Trips from "@/pages/trips";
import Settlements from "@/pages/settlements";
import RentTracking from "@/pages/rent-tracking";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/vehicles" component={Vehicles} />
      <Route path="/drivers" component={Drivers} />
      <Route path="/trips" component={Trips} />
      <Route path="/settlements" component={Settlements} />
      <Route path="/rent-tracking" component={RentTracking} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
