import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useServerEvents } from "@/lib/events";
import Layout from "@/components/Layout";
import Dashboard from "@/pages/dashboard";
import Vehicles from "@/pages/vehicles";
import Drivers from "@/pages/drivers";
import Trips from "@/pages/trips";
import TripLogs from "@/pages/TripLogs";
import Settlements from "@/pages/settlements";
import DriversPayments from "@/pages/drivers-payments";
import WeeklySummary from "@/pages/WeeklySummary";
import Investments from "@/pages/investments";
import NotFound from "@/pages/not-found";

function Router() {
  const qc = useQueryClient();
  useServerEvents(qc);

  return (
    <Layout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/dashboard" component={Dashboard} />
        <Route path="/vehicles" component={Vehicles} />
        <Route path="/drivers" component={Drivers} />
        <Route path="/trips" component={Trips} />
        <Route path="/trip-logs" component={TripLogs} />
        <Route path="/settlements" component={Settlements} />
        <Route path="/drivers-payments" component={DriversPayments} />
        <Route path="/weekly-summary" component={WeeklySummary} />
        <Route path="/investments" component={Investments} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
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
