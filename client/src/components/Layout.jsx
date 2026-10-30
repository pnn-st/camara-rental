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
    label: 'Equipment & Customers',
    subLabel: 'อุปกรณ์ & ลูกค้า',
    icon: Package,
  },
  {
    to: '/booking',
    label: 'Rentals & Booking',
    subLabel: 'เปิดสัญญาเช่า',
    icon: CalendarDays,
  },
  {
    to: '/returns',
    label: 'Returns & Inspection',
    subLabel: 'ตรวจรับคืน',
    icon: RotateCcw,
  },
  {
    to: '/dashboard',
    label: 'Dashboard',
    subLabel: 'แดชบอร์ดสรุปผล',
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
      <aside className="w-full md:w-[260px] md:min-h-screen bg-[#EDB92E] border-b-3 md:border-b-0 md:border-r-3 border-black flex flex-col justify-between shrink-0 z-30">
        <div>
          {/* Brand Header */}
          <div className="p-5 md:p-6 border-b-3 border-black bg-[#F7F5EE]">
            <NavLink to="/dashboard" className="block focus:outline-none">
              <div className="text-2xl font-black uppercase tracking-tight text-black leading-tight">
                Cam Rental
              </div>
              <div className="text-[11px] font-bold uppercase tracking-tight text-neutral-800 mt-0.5 whitespace-nowrap">
                Camera & Equipment Rental
              </div>
              <div className="text-[10px] text-neutral-600 font-medium">
                ระบบเช่าอุปกรณ์กล้องและเลนส์
              </div>
            </NavLink>
          </div>

          {/* Navigation Items */}
          <nav className="p-3 md:p-4 space-y-3">
            <div className="flex md:flex-col gap-2 md:gap-3 overflow-x-auto md:overflow-visible pb-1 md:pb-0">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) =>
                      `min-h-[46px] px-3 py-2 flex items-center gap-2.5 border-3 border-black rounded-[6px] font-bold text-sm tracking-tight select-none transition-all duration-100 ${
                        isActive
                          ? 'bg-[#2F54EB] text-white shadow-[4px_4px_0px_#000000]'
                          : 'bg-[#F7F5EE] text-black shadow-[4px_4px_0px_#000000] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[6px_6px_0px_#000000] active:translate-x-1 active:translate-y-1 active:shadow-none'
                      }`
                    }
                  >
                    <Icon className="w-5 h-5 stroke-[2.5] shrink-0" />
                    <div className="flex flex-col text-left leading-tight min-w-0">
                      <span className="text-[12px] font-bold tracking-tight whitespace-nowrap">{item.label}</span>
                      <span className="text-[10px] font-medium opacity-80 whitespace-nowrap">{item.subLabel}</span>
                    </div>
                  </NavLink>
                );
              })}
            </div>
          </nav>
        </div>

        {/* Sidebar Footer (Desktop only) */}
        <div className="hidden md:block p-4 border-t-3 border-black bg-[#F7F5EE]">
          <div className="p-3 bg-[#ECE6D8] border-3 border-black rounded-[6px] shadow-[4px_4px_0px_#000000]">
            <div className="text-xs font-black uppercase tracking-wider text-black flex items-center justify-between">
              <span>SYSTEM STATUS</span>
              <span className="text-[10px] font-mono text-neutral-600">สถานะ</span>
            </div>
            <div className="flex items-center gap-2 mt-1.5">
              <span className="w-2.5 h-2.5 bg-[#48C78E] border border-black inline-block rounded-full"></span>
              <span className="font-mono font-bold text-[11px] text-black">ONLINE :5000</span>
            </div>
            <div className="text-[10px] font-medium text-neutral-600 mt-1">
              ฐานข้อมูลพร้อมทำงาน (Ready)
            </div>
          </div>
          <div className="mt-3 text-[11px] font-bold text-neutral-600 font-mono flex items-center justify-between">
            <span>Topic 30</span>
            <span>Database</span>
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

        {/* ─────────────────────────────────────────────────────────────
            GLOBAL FOOTER: Team Credits
           ───────────────────────────────────────────────────────────── */}
        <footer className="w-full border-t-3 border-black bg-[#F7F5EE] py-6 px-6 md:px-8 mt-auto">
          <div className="max-w-[1200px] mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 mb-4 border-b-2 border-black/15">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 bg-[#EDB92E] border-2 border-black inline-block"></span>
                <span className="text-xs font-black uppercase tracking-wider text-black">
                  Project Development Team · สมาชิกผู้จัดทำโครงงาน
                </span>
              </div>
              <span className="text-[11px] font-mono font-bold text-neutral-600">
                Topic 30: Camera & Equipment Rental System
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Member 1: DBA */}
              <div className="bg-[#ECE6D8] border-2 border-black rounded-[6px] p-3 shadow-[3px_3px_0px_#000000] flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="font-mono font-bold text-xs bg-[#EDB92E] px-1.5 py-0.5 border border-black rounded-[3px] text-black">
                      67363030
                    </span>
                    <span className="text-[10px] font-mono font-bold text-neutral-700 uppercase">DBA</span>
                  </div>
                  <div className="font-bold text-sm text-black">
                    นายนพกร กันทากาศ
                  </div>
                </div>
                <div className="mt-2 pt-2 border-t border-black/15 text-[11px] text-neutral-700 font-medium">
                  DBA / ออกแบบฐานข้อมูล
                </div>
              </div>

              {/* Member 2: Backend */}
              <div className="bg-[#ECE6D8] border-2 border-black rounded-[6px] p-3 shadow-[3px_3px_0px_#000000] flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="font-mono font-bold text-xs bg-[#2F54EB] px-1.5 py-0.5 border border-black rounded-[3px] text-white">
                      67363849
                    </span>
                    <span className="text-[10px] font-mono font-bold text-neutral-700 uppercase">Backend</span>
                  </div>
                  <div className="font-bold text-sm text-black">
                    นายปุณณัตถ์ พรหมเลิศ
                  </div>
                </div>
                <div className="mt-2 pt-2 border-t border-black/15 text-[11px] text-neutral-700 font-medium">
                  Backend / ฝั่งฐานข้อมูล
                </div>
              </div>

              {/* Member 3: Full-stack & Frontend */}
              <div className="bg-[#ECE6D8] border-2 border-black rounded-[6px] p-3 shadow-[3px_3px_0px_#000000] flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="font-mono font-bold text-xs bg-[#48C78E] px-1.5 py-0.5 border border-black rounded-[3px] text-black">
                      67366536
                    </span>
                    <span className="text-[10px] font-mono font-bold text-neutral-700 uppercase">Full-stack</span>
                  </div>
                  <div className="font-bold text-sm text-black">
                    นางสาวเหมหงษ์ จำปานวน
                  </div>
                </div>
                <div className="mt-2 pt-2 border-t border-black/15 text-[11px] text-neutral-700 font-medium">
                  Full-stack / ฝั่งเว็บและนำเสนอ
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-black/10 text-center text-[11px] text-neutral-600 font-mono">
              © Cam Rental · Database Management System Project
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
