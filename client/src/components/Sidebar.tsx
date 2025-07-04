import { Truck, BarChart3, Car, Users, Route, Calculator, Banknote } from "lucide-react";

export default function Sidebar() {
  const currentWeek = new Date().toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  const menuItems = [
    { icon: BarChart3, label: "Dashboard", href: "#dashboard", active: true },
    { icon: Car, label: "Vehicles", href: "#vehicles" },
    { icon: Users, label: "Drivers", href: "#drivers" },
    { icon: Route, label: "Trip Logs", href: "#trips" },
    { icon: Calculator, label: "Settlements", href: "#settlements" },
    { icon: Banknote, label: "Rent Tracking", href: "#rentals" },
  ];

  return (
    <div className="w-64 bg-white shadow-sm border-r border-gray-200 flex-shrink-0">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
            <Truck className="text-white text-lg" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">FleetManager</h1>
            <p className="text-sm text-gray-500">Admin Dashboard</p>
          </div>
        </div>
      </div>
      
      <nav className="p-4 space-y-2">
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <a
              key={item.label}
              href={item.href}
              className={`flex items-center space-x-3 px-3 py-2 rounded-lg font-medium transition-colors ${
                item.active
                  ? "bg-primary/10 text-primary"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <Icon className="w-5 h-5" />
              <span>{item.label}</span>
            </a>
          );
        })}
      </nav>
      
      {/* Current Week Info */}
      <div className="p-4 mt-auto">
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Current Week</p>
          <p className="text-sm font-semibold text-gray-900">{currentWeek}</p>
        </div>
      </div>
    </div>
  );
}
