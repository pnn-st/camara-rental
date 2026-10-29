import { useState, useEffect } from 'react';
import { getDashboard } from '../api';
import { RefreshCw, AlertCircle, ArrowUpRight } from 'lucide-react';

function PixelBar({ pct }) {
  const totalBlocks = 10;
  const num = parseFloat(pct) || 0;
  const filled = Math.min(totalBlocks, Math.max(0, Math.round(num / 10)));
  const fillColor = num >= 50 ? 'bg-[#48C78E]' : num >= 15 ? 'bg-[#EDB92E]' : 'bg-[#E8505B]';

  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-1 select-none">
        {Array.from({ length: totalBlocks }).map((_, i) => (
          <span
            key={i}
            className={`inline-block w-2.5 h-3.5 border-2 border-black ${
              i < filled ? fillColor : 'bg-[#F7F5EE]'
            }`}
          />
        ))}
      </div>
      <span className="font-pixel text-[11px] text-black tracking-tight">{num.toFixed(1)}%</span>
    </div>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState({ summary: null, categories: [] });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchDashboard();
  }, []);

  async function fetchDashboard() {
    try {
      setLoading(true);
      setError('');
      const res = await getDashboard();
      setData(res);
    } catch (err) {
      setError(`Database error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  async function reloadDashboard() {
    try {
      setRefreshing(true);
      setError('');
      const res = await getDashboard();
      setData(res);
    } catch (err) {
      setError(`Failed to reload dashboard: ${err.message}`);
    } finally {
      setRefreshing(false);
    }
  }

  const { summary, categories } = data;

  const netRevenue = summary
    ? Math.round((summary.total_revenue - summary.total_repair_cost) * 100) / 100
    : 0;

  const avgUtilization =
    categories.length > 0
      ? Math.round(
          (categories.reduce((acc, c) => acc + parseFloat(c.utilization_pct || 0), 0) /
            categories.length) *
            100
        ) / 100
      : 0;

  // Max revenue for relative chart scale
  const maxCategoryRevenue = Math.max(
    ...categories.map((c) => parseFloat(c.total_revenue || 0)),
    1
  );

  return (
    <div className="space-y-6">
      {/* ─────────────────────────────────────────────────────────────
          PAGE HEADER: Large bold title with short one-line subtitle
         ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-2">
        <div className="text-left">
          <div className="flex items-center gap-3">
            <h1 className="text-4xl font-bold tracking-tight text-black uppercase leading-none">
              Dashboard
            </h1>
            <span className="px-2.5 py-1 bg-[#EDB92E] border-2 border-black rounded-[4px] text-xs font-bold uppercase tracking-wider text-black">
              แดชบอร์ดสรุปผล
            </span>
          </div>
          <p className="text-sm sm:text-base text-neutral-800 mt-2 font-medium">
            Equipment utilization, rental volume, and revenue performance summary.
            <span className="block text-xs text-neutral-600 mt-0.5">
              สรุปภาพรวมสถิติการใช้งานอุปกรณ์ (Utilization), ปริมาณวันเช่าสะสม, และผลประกอบการรายได้-ค่าซ่อมบำรุง
            </span>
          </p>
        </div>

        <button
          type="button"
          onClick={reloadDashboard}
          disabled={refreshing}
          className="neo-btn neo-btn-secondary shrink-0"
        >
          <RefreshCw className={`w-4 h-4 stroke-[2.5] ${refreshing ? 'animate-spin' : ''}`} />
          <span>Refresh Data <span className="text-xs font-normal opacity-80">(รีเฟรช)</span></span>
        </button>
      </div>

      {/* Error Alert in Coral Warning Box */}
      {error && (
        <div className="p-4 bg-[#E8505B] border-3 border-black shadow-neo rounded-[6px] text-white">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 stroke-[2.5] shrink-0 mt-0.5" />
              <div>
                <div className="text-xs font-black uppercase tracking-wider">DATABASE WARNING // แจ้งเตือนข้อผิดพลาด</div>
                <div className="text-sm font-bold mt-0.5">{error}</div>
              </div>
            </div>
            <button
              type="button"
              onClick={fetchDashboard}
              className="neo-btn-sm bg-[#F7F5EE] text-black"
            >
              Retry (ลองใหม่)
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="neo-card p-16 text-center">
          <div className="font-pixel text-xs text-black animate-pulse mb-3">
            [ LOADING POSTGRESQL VIEW METRICS... ]
          </div>
          <p className="text-sm font-semibold text-neutral-700">
            Fetching metrics from vw_equipment_utilization_and_revenue_summary (กำลังดึงข้อมูลสถิติ)
          </p>
        </div>
      ) : (
        <>
          {/* ─────────────────────────────────────────────────────────────
              ROW OF 4 STAT CARDS (Yellow, Blue, Mint, Coral)
              48px big numbers, small labels, 24px padding
             ───────────────────────────────────────────────────────────── */}
          {summary && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Card 1: Total Units (Yellow) */}
              <div className="bg-[#EDB92E] border-3 border-black shadow-neo rounded-[6px] p-5 text-black flex flex-col justify-between">
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-black flex items-center justify-between">
                    <span>Total Equipment</span>
                    <span className="text-[10px] font-medium text-neutral-800">อุปกรณ์ทั้งหมด</span>
                  </div>
                  <div className="text-3xl xl:text-4xl font-black tracking-tight font-sans mt-2 whitespace-nowrap">
                    {summary.total_equipment} <span className="text-lg font-bold">Units</span>
                  </div>
                </div>
                <div className="text-xs font-bold uppercase tracking-wider text-neutral-800 mt-4 pt-3 border-t-2 border-black flex items-center justify-between">
                  <span>{categories.length} Categories</span>
                  <span className="text-[10px] font-normal">เปิดใช้งาน {categories.length} หมวด</span>
                </div>
              </div>

              {/* Card 2: Total Days (Blue) */}
              <div className="bg-[#2F54EB] border-3 border-black shadow-neo rounded-[6px] p-5 text-white flex flex-col justify-between">
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-white flex items-center justify-between">
                    <span>Days Rented</span>
                    <span className="text-[10px] font-medium text-white/80">วันเช่าสะสม</span>
                  </div>
                  <div className="text-3xl xl:text-4xl font-black tracking-tight font-sans mt-2 text-white whitespace-nowrap">
                    {Number(summary.total_rented_days).toLocaleString()} <span className="text-lg font-bold">Days</span>
                  </div>
                </div>
                <div className="text-xs font-bold uppercase tracking-wider text-white/90 mt-4 pt-3 border-t-2 border-black flex items-center justify-between">
                  <span>Avg Utilization {avgUtilization}%</span>
                  <span className="text-[10px] font-normal">อัตราการใช้เฉลี่ย</span>
                </div>
              </div>

              {/* Card 3: Revenue (Mint) */}
              <div className="bg-[#48C78E] border-3 border-black shadow-neo rounded-[6px] p-5 text-black flex flex-col justify-between">
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-black flex items-center justify-between">
                    <span>Total Revenue</span>
                    <span className="text-[10px] font-medium text-neutral-800">รายได้รวมทั้งหมด</span>
                  </div>
                  <div className="text-2xl sm:text-3xl xl:text-4xl font-black tracking-tight font-sans mt-2 text-black whitespace-nowrap">
                    ฿{Math.round(summary.total_revenue).toLocaleString()}
                  </div>
                </div>
                <div className="text-xs font-bold uppercase tracking-wider text-neutral-800 mt-4 pt-3 border-t-2 border-black flex items-center justify-between">
                  <span>Gross Billings</span>
                  <span className="text-[10px] font-normal">ยอดบิลรวม</span>
                </div>
              </div>

              {/* Card 4: Repair Costs & Net (Coral) */}
              <div className="bg-[#E8505B] border-3 border-black shadow-neo rounded-[6px] p-5 text-white flex flex-col justify-between">
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-white flex items-center justify-between">
                    <span>Repair Costs</span>
                    <span className="text-[10px] font-medium text-white/80">ค่าซ่อมแซมสะสม</span>
                  </div>
                  <div className="text-2xl sm:text-3xl xl:text-4xl font-black tracking-tight font-sans mt-2 text-white whitespace-nowrap">
                    ฿{Math.round(summary.total_repair_cost).toLocaleString()}
                  </div>
                </div>
                <div className="text-xs font-bold uppercase tracking-wider text-white mt-4 pt-3 border-t-2 border-black flex items-center justify-between">
                  <span>Net Profit (กำไรสุทธิ):</span>
                  <span className="font-mono font-bold">฿{Math.round(netRevenue).toLocaleString()}</span>
                </div>
              </div>
            </div>
          )}

          {/* ─────────────────────────────────────────────────────────────
              CHART CARD: Category Revenue Comparison Bar Chart
             ───────────────────────────────────────────────────────────── */}
          <div className="neo-card space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b-3 border-black">
              <div>
                <h2 className="text-[20px] font-bold uppercase tracking-tight text-black m-0">
                  Revenue By Category
                </h2>
                <p className="text-xs text-neutral-600 mt-0.5">
                  Comparison of rental income and repair expenses • สัดส่วนรายได้แยกตามประเภทอุปกรณ์
                </p>
              </div>
              <div className="text-xs font-bold uppercase tracking-wider px-2.5 py-1 bg-[#EDB92E] border-2 border-black rounded-[4px] self-start sm:self-auto text-black">
                Billed vs Repairs // รายรับ vs ค่าซ่อม
              </div>
            </div>

            <div className="space-y-3 pt-2">
              {categories.map((cat) => {
                const rev = parseFloat(cat.total_revenue || 0);
                const rep = parseFloat(cat.total_repair_cost || 0);
                const pctOfMax = Math.round((rev / maxCategoryRevenue) * 100);

                return (
                  <div key={cat.category_name} className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-black">{cat.category_name}</span>
                      <div className="flex items-center gap-3 font-mono">
                        <span className="text-black">฿{rev.toLocaleString('th-TH', { minimumFractionDigits: 0 })}</span>
                        <span className="text-[#E8505B] text-[11px] font-bold">(repairs: ฿{rep.toLocaleString('th-TH', { minimumFractionDigits: 0 })})</span>
                      </div>
                    </div>
                    {/* Thick horizontal bar with black border and solid fill */}
                    <div className="w-full bg-[#F7F5EE] border-3 border-black h-5 rounded-[4px] overflow-hidden flex">
                      <div
                        className="bg-[#2F54EB] h-full border-r-2 border-black transition-all duration-300"
                        style={{ width: `${Math.max(2, pctOfMax)}%` }}
                        title={`Revenue: ฿${rev.toLocaleString()}`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ─────────────────────────────────────────────────────────────
              SUMMARY TABLE CARD: Wrapped in bordered card with shadow
              Header row yellow with bold uppercase, 2px row dividers
             ───────────────────────────────────────────────────────────── */}
          <div className="neo-card overflow-hidden p-0">
            <div className="p-6 bg-[#F7F5EE] border-b-3 border-black flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-[20px] font-bold uppercase tracking-tight text-black m-0">
                  Utilization & Revenue Summary
                </h2>
                <p className="text-xs font-mono text-neutral-600 mt-1">
                  vw_equipment_utilization_and_revenue_summary • สรุปอัตราความคุ้มค่าและผลประกอบการ
                </p>
              </div>

              <div className="text-xs font-bold px-3 py-1.5 bg-[#ECE6D8] border-2 border-black rounded-[4px]">
                Formula: rented_days ÷ (equipment_count × total_days) × 100
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-black border-collapse">
                <thead className="bg-[#EDB92E] text-black text-xs font-bold uppercase tracking-wider border-b-3 border-black">
                  <tr>
                    <th className="px-5 py-3.5 border-r-2 border-black">
                      Category <span className="text-[10px] font-normal block text-neutral-800">หมวดหมู่</span>
                    </th>
                    <th className="px-4 py-3.5 text-center border-r-2 border-black">
                      Units <span className="text-[10px] font-normal block text-neutral-800">จำนวน</span>
                    </th>
                    <th className="px-4 py-3.5 text-center border-r-2 border-black">
                      Days Rented <span className="text-[10px] font-normal block text-neutral-800">วันเช่า</span>
                    </th>
                    <th className="px-5 py-3.5 border-r-2 border-black min-w-[190px]">
                      Utilization <span className="text-[10px] font-normal block text-neutral-800">อัตราการใช้</span>
                    </th>
                    <th className="px-5 py-3.5 text-right border-r-2 border-black">
                      Revenue (THB) <span className="text-[10px] font-normal block text-neutral-800">รายได้</span>
                    </th>
                    <th className="px-5 py-3.5 text-right border-r-2 border-black">
                      Repairs (THB) <span className="text-[10px] font-normal block text-neutral-800">ค่าซ่อม</span>
                    </th>
                    <th className="px-5 py-3.5 text-right">
                      Net Profit (THB) <span className="text-[10px] font-normal block text-neutral-800">กำไรสุทธิ</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y-2 divide-black">
                  {categories.map((row) => {
                    const utilPct = parseFloat(row.utilization_pct || 0);
                    const rev = parseFloat(row.total_revenue || 0);
                    const repair = parseFloat(row.total_repair_cost || 0);
                    const net = rev - repair;

                    return (
                      <tr
                        key={row.category_name}
                        className="bg-[#F7F5EE] hover:bg-[#ECE6D8] transition-colors"
                      >
                        {/* Category */}
                        <td className="px-5 py-4 font-bold text-black border-r-2 border-black">
                          {row.category_name}
                        </td>

                        {/* Units */}
                        <td className="px-4 py-4 text-center font-bold border-r-2 border-black">
                          <span className="inline-block px-2.5 py-0.5 border-2 border-black rounded-[4px] bg-[#ECE6D8] font-mono text-xs">
                            {row.equipment_count}
                          </span>
                        </td>

                        {/* Days Rented */}
                        <td className="px-4 py-4 text-center font-mono font-bold border-r-2 border-black">
                          {Number(row.rented_days).toLocaleString()}
                        </td>

                        {/* Utilization Bar */}
                        <td className="px-5 py-4 border-r-2 border-black">
                          <PixelBar pct={utilPct} />
                        </td>

                        {/* Revenue */}
                        <td className="px-5 py-4 text-right font-mono font-bold text-black border-r-2 border-black">
                          ฿{rev.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                        </td>

                        {/* Repairs */}
                        <td className="px-5 py-4 text-right font-mono font-bold text-[#E8505B] border-r-2 border-black">
                          ฿{repair.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                        </td>

                        {/* Net */}
                        <td className="px-5 py-4 text-right font-mono font-bold text-black">
                          <span className="px-2 py-0.5 bg-[#48C78E] border-2 border-black rounded-[4px] inline-block">
                            ฿{net.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>

                {/* Table Footer */}
                {summary && (
                  <tfoot className="bg-[#EDB92E] font-bold border-t-3 border-black text-xs text-black">
                    <tr>
                      <td className="px-5 py-4 uppercase text-sm border-r-2 border-black">
                        Total (รวม)
                      </td>
                      <td className="px-4 py-4 text-center font-bold border-r-2 border-black font-mono text-sm">
                        {summary.total_equipment}
                      </td>
                      <td className="px-4 py-4 text-center font-mono font-bold border-r-2 border-black text-sm">
                        {summary.total_rented_days.toLocaleString()}
                      </td>
                      <td className="px-5 py-4 font-mono font-bold border-r-2 border-black">
                        <span className="font-pixel text-[10px]">Avg {avgUtilization}%</span>
                      </td>
                      <td className="px-5 py-4 text-right font-mono font-bold border-r-2 border-black text-sm">
                        ฿{summary.total_revenue.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-5 py-4 text-right font-mono font-bold border-r-2 border-black text-sm text-[#E8505B]">
                        ฿{summary.total_repair_cost.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-5 py-4 text-right font-mono font-black text-sm text-black">
                        ฿{netRevenue.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
