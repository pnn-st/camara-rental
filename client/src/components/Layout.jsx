import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  Package,
  CalendarDays,
  RotateCcw,
  LayoutDashboard,
} from 'lucide-react';

const navItems = [
  {
    to: '/manage',
    label: 'Equipment',
    icon: Package,
  },
  {
    to: '/booking',
    label: 'Rentals',
    icon: CalendarDays,
  },
  {
    to: '/returns',
    label: 'Returns',
    icon: RotateCcw,
  },
  {
    to: '/dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
  },
];

export default function Layout() {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-[#ECE6D8] text-[#000000] font-sans flex flex-col md:flex-row antialiased">
      {/* ─────────────────────────────────────────────────────────────
          LEFT SIDEBAR (DESKTOP) / TOP BAR (MOBILE)
          240px wide on desktop, warm mustard yellow #EDB92E, 3px black right border
         ───────────────────────────────────────────────────────────── */}
      <aside className="w-full md:w-[240px] md:min-h-screen bg-[#EDB92E] border-b-3 md:border-b-0 md:border-r-3 border-black flex flex-col justify-between shrink-0 z-30">
        <div>
          {/* Brand Header */}
          <div className="p-6 border-b-3 border-black bg-[#F7F5EE]">
            <NavLink to="/dashboard" className="block focus:outline-none">
              <div className="text-2xl font-black uppercase tracking-tight text-black leading-tight">
                Cam Rental
              </div>
              <div className="text-[11px] font-bold uppercase tracking-tight text-neutral-700 mt-0.5 whitespace-nowrap">
                Camera & Equipment Rental
              </div>
            </NavLink>
          </div>

          {/* Navigation Items */}
          <nav className="p-4 md:p-6 space-y-3">
            <div className="flex md:flex-col gap-2 md:gap-3 overflow-x-auto md:overflow-visible pb-1 md:pb-0">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) =>
                      `min-h-[44px] px-4 py-2.5 flex items-center gap-3 border-3 border-black rounded-[6px] font-bold text-sm tracking-tight select-none transition-all duration-100 whitespace-nowrap ${
                        isActive
                          ? 'bg-[#2F54EB] text-white shadow-[4px_4px_0px_#000000]'
                          : 'bg-[#F7F5EE] text-black shadow-[4px_4px_0px_#000000] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[6px_6px_0px_#000000] active:translate-x-1 active:translate-y-1 active:shadow-none'
                      }`
                    }
                  >
                    <Icon className="w-5 h-5 stroke-[2.5] shrink-0" />
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}
            </div>
          </nav>
        </div>

        {/* Sidebar Footer (Desktop only) */}
        <div className="hidden md:block p-6 border-t-3 border-black bg-[#F7F5EE]">
          <div className="p-3 bg-[#ECE6D8] border-3 border-black rounded-[6px] shadow-[4px_4px_0px_#000000]">
            <div className="text-xs font-black uppercase tracking-wider text-black">
              Status
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="w-2.5 h-2.5 bg-[#48C78E] border border-black inline-block"></span>
              <span className="font-pixel text-[9px] text-black">ONLINE :5000</span>
            </div>
          </div>
          <div className="mt-3 text-[11px] font-bold text-neutral-600 font-mono">
            Topic 30 • 2026
          </div>
        </div>
      </aside>

      {/* ─────────────────────────────────────────────────────────────
          MAIN CONTENT AREA (Cream canvas #FFF8E7 with 1200px max width)
         ───────────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">
        <main className="flex-1 w-full max-w-[1200px] mx-auto p-6 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
