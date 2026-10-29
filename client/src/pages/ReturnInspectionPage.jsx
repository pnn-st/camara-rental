import { useState, useEffect, useMemo } from 'react';
import { getActiveRentals, getStaff, processReturn } from '../api';
import {
  RotateCcw,
  Search,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  User,
  Shield,
  CreditCard,
  Camera,
  Check,
  AlertTriangle,
  Receipt,
  Clock,
  X,
} from 'lucide-react';

export default function ReturnInspectionPage() {
  const [activeRentals, setActiveRentals] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Search & Selected Rental
  const [search, setSearch] = useState('');
  const [selectedRentalId, setSelectedRentalId] = useState(null);

  // Return & Inspection Form State
  const [inspectorStaffId, setInspectorStaffId] = useState('');
  const todayStr = new Date().toISOString().split('T')[0];
  const [returnDate, setReturnDate] = useState(todayStr);

  // Selected item returns: map of rental_item_id -> { selected, condition_note, damage_fee, repair_cost }
  const [itemForms, setItemForms] = useState({});

  // Payment State
  const [settleAmount, setSettleAmount] = useState('0');
  const [paymentType, setPaymentType] = useState('Settlement'); // 'Settlement' | 'Fine'
  const [paymentMethod, setPaymentMethod] = useState('Cash');

  // Submission States
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState('');
  const [successInfo, setSuccessInfo] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      const [rentals, staff] = await Promise.all([
        getActiveRentals(),
        getStaff(),
      ]);
      setActiveRentals(rentals);
      setStaffList(staff);
      if (staff.length > 0) {
        setInspectorStaffId(String(staff[0].staff_id));
      }
      if (rentals.length > 0) {
        selectRental(rentals[0]);
      }
    } catch (err) {
      setServerError(`Failed to load return data: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  async function reloadRentals() {
    try {
      setRefreshing(true);
      const rentals = await getActiveRentals();
      setActiveRentals(rentals);
      if (selectedRentalId) {
        const found = rentals.find((r) => r.rental_id === selectedRentalId);
        if (found) {
          selectRental(found);
        } else if (rentals.length > 0) {
          selectRental(rentals[0]);
        } else {
          setSelectedRentalId(null);
        }
      }
    } catch (err) {
      setServerError(`Failed to refresh rentals: ${err.message}`);
    } finally {
      setRefreshing(false);
    }
  }

  // Selected Rental Object
  const selectedRental = useMemo(() => {
    return activeRentals.find((r) => r.rental_id === selectedRentalId) || null;
  }, [activeRentals, selectedRentalId]);

  // When a rental is selected, initialize item forms
  function selectRental(rental) {
    setSelectedRentalId(rental.rental_id);
    setServerError('');
    setSuccessInfo(null);

    const forms = {};
    (rental.items || []).forEach((item) => {
      // By default select unreturned items
      const isUnreturned = !item.returned_at;
      forms[item.rental_item_id] = {
        selected: isUnreturned,
        condition_note: 'Returned in good condition',
        damage_fee: '0',
        repair_cost: '0',
      };
    });
    setItemForms(forms);
  }

  // Filtered active rentals
  const filteredRentals = useMemo(() => {
    if (!search.trim()) return activeRentals;
    const q = search.toLowerCase();
    return activeRentals.filter((r) => {
      return (
        String(r.rental_id).includes(q) ||
        (r.customer_name && r.customer_name.toLowerCase().includes(q)) ||
        (r.customer_phone && r.customer_phone.includes(q))
      );
    });
  }, [activeRentals, search]);

  // Item form change handlers
  function toggleItemSelection(itemId) {
    setItemForms((prev) => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        selected: !prev[itemId]?.selected,
      },
    }));
  }

  function handleItemFieldChange(itemId, field, value) {
    setItemForms((prev) => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        [field]: value,
      },
    }));
  }

  // Computed returning items
  const returningItems = useMemo(() => {
    if (!selectedRental) return [];
    return (selectedRental.items || []).filter((item) => {
      return !item.returned_at && itemForms[item.rental_item_id]?.selected;
    });
  }, [selectedRental, itemForms]);

  // Financial calculations for settlement
  const returnFinancials = useMemo(() => {
    if (!selectedRental) {
      return { assessedDamage: 0, assessedRepair: 0, totalDue: 0, remainingToPay: 0 };
    }

    let assessedDamage = 0;
    let assessedRepair = 0;

    returningItems.forEach((item) => {
      const form = itemForms[item.rental_item_id];
      if (form) {
        assessedDamage += parseFloat(form.damage_fee || 0);
        assessedRepair += parseFloat(form.repair_cost || 0);
      }
    });

    const totalRentalFee = parseFloat(selectedRental.total_rental_fee || 0);
    const existingDamageFee = parseFloat(selectedRental.total_damage_fee || 0);
    const depositAmount = parseFloat(selectedRental.deposit_amount || 0);

    // After return, total fee = rental fee + existing damage + new damage + new repair
    const totalFeeWithDamage = totalRentalFee + existingDamageFee + assessedDamage + assessedRepair;
    // Remaining balance = Total fee - Deposit already paid
    const remainingToPay = Math.max(0, Math.round((totalFeeWithDamage - depositAmount) * 100) / 100);

    return {
      assessedDamage,
      assessedRepair,
      totalFeeWithDamage,
      depositAmount,
      remainingToPay,
    };
  }, [selectedRental, returningItems, itemForms]);

  // Auto-fill settlement amount when returning items change
  useEffect(() => {
    if (returnFinancials.remainingToPay > 0) {
      setSettleAmount(String(returnFinancials.remainingToPay));
      setPaymentType('Settlement');
    } else {
      setSettleAmount('0');
    }
  }, [returnFinancials.remainingToPay]);

  // Submit Handler
  async function handleSubmitReturn(e) {
    e.preventDefault();
    setServerError('');
    setSuccessInfo(null);

    if (!selectedRental) {
      setServerError('Please select an active rental contract');
      return;
    }

    if (!inspectorStaffId) {
      setServerError('Please select an inspecting staff member');
      return;
    }

    if (returningItems.length === 0) {
      setServerError('Please select at least 1 equipment item to return');
      return;
    }

    const itemsPayload = returningItems.map((item) => {
      const form = itemForms[item.rental_item_id] || {};
      return {
        rental_item_id: item.rental_item_id,
        equipment_id: item.equipment_id,
        condition_note: form.condition_note || 'Returned in good condition',
        damage_fee: parseFloat(form.damage_fee || 0),
        repair_cost: parseFloat(form.repair_cost || 0),
      };
    });

    const payload = {
      rental_id: selectedRental.rental_id,
      staff_id: parseInt(inspectorStaffId, 10),
      return_date: returnDate || todayStr,
      items: itemsPayload,
    };

    const settleNum = parseFloat(settleAmount || 0);
    if (settleNum > 0) {
      payload.payment = {
        payment_type: paymentType || 'Settlement',
        amount: settleNum,
        payment_method: paymentMethod || 'Cash',
      };
    }

    setSubmitting(true);
    try {
      const res = await processReturn(payload);
      setSuccessInfo({
        rental_id: res.rental_id,
        completed: res.completed,
        returnedCount: itemsPayload.length,
        updatedRental: res.rental,
      });

      // Reload active rentals
      await reloadRentals();
    } catch (err) {
      setServerError(err.message || 'Database transaction failed during return process');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* ─────────────────────────────────────────────────────────────
          PAGE HEADER: Title + Subtitle + Refresh Button
         ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-2">
        <div className="text-left">
          <h1 className="text-4xl font-bold tracking-tight text-black uppercase leading-none">
            Returns & Inspection
          </h1>
          <p className="text-base text-neutral-800 mt-2 font-medium">
            Equipment condition assessment, automatic damage fee recalculation, and contract settlement.
          </p>
        </div>

        <button
          type="button"
          onClick={reloadRentals}
          disabled={refreshing}
          className="neo-btn neo-btn-secondary shrink-0"
        >
          <RefreshCw className={`w-4 h-4 stroke-[2.5] ${refreshing ? 'animate-spin' : ''}`} />
          <span>Refresh Active Rentals</span>
        </button>
      </div>

      {/* Prominent Server Error Alert */}
      {serverError && (
        <div className="p-4 rounded-[6px] bg-[#E8505B] border-3 border-black shadow-neo text-white">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 stroke-[2.5] shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="text-xs font-bold uppercase tracking-wider">
                  Transaction Error (Rolled Back)
                </div>
                <div className="mt-1 p-2.5 bg-[#F7F5EE] border-2 border-black rounded-[4px] font-mono text-xs font-bold text-black break-words">
                  {serverError}
                </div>
                <p className="mt-1 text-[11px] font-bold text-white/90">
                  Automatic rollback executed. System integrity preserved.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setServerError('')}
              className="neo-btn-sm neo-btn-secondary p-1 min-h-[30px]"
            >
              <X className="w-4 h-4 stroke-[2.5]" />
            </button>
          </div>
        </div>
      )}

      {/* Success Alert */}
      {successInfo && (
        <div className="p-5 rounded-[6px] bg-[#48C78E] border-3 border-black shadow-neo text-black">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-6 h-6 stroke-[2.5] shrink-0 mt-0.5" />
              <div>
                <h3 className="text-lg font-bold uppercase tracking-tight">
                  Return & Inspection Processed Successfully
                </h3>
                <p className="text-sm font-medium text-black mt-1">
                  Checked in <strong>{successInfo.returnedCount} items</strong> for Contract{' '}
                  <strong className="font-mono bg-[#F7F5EE] px-2 py-0.5 rounded-[4px] border border-black">
                    #{successInfo.rental_id}
                  </strong>
                  {successInfo.completed ? (
                    <span className="ml-2 inline-flex items-center px-2 py-0.5 text-xs font-bold border border-black rounded-[4px] bg-black text-white uppercase">
                      Contract Completed
                    </span>
                  ) : (
                    <span className="ml-2 inline-flex items-center px-2 py-0.5 text-xs font-bold border border-black rounded-[4px] bg-[#EDB92E] text-black uppercase">
                      Remaining Items Pending
                    </span>
                  )}
                </p>
                {successInfo.updatedRental && (
                  <div className="mt-2 flex flex-wrap items-center gap-4 text-xs font-bold text-black">
                    <span>
                      Accumulated Damage Fee (Trigger):{' '}
                      <strong className="font-mono">
                        ฿{Number(successInfo.updatedRental.total_damage_fee || 0).toLocaleString()}
                      </strong>
                    </span>
                    <span>•</span>
                    <span>
                      Status:{' '}
                      <span className="px-2 py-0.5 rounded-[4px] border border-black bg-[#F7F5EE] text-black uppercase font-bold">
                        {successInfo.updatedRental.rental_status}
                      </span>
                    </span>
                  </div>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSuccessInfo(null)}
              className="neo-btn-sm neo-btn-secondary p-1 min-h-[30px]"
            >
              <X className="w-4 h-4 stroke-[2.5]" />
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="neo-card p-16 text-center text-black">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-black mb-3" />
          <p className="text-sm font-bold uppercase tracking-wider">Loading active rental contracts...</p>
        </div>
      ) : activeRentals.length === 0 ? (
        <div className="neo-card p-16 text-center text-black">
          <div className="w-14 h-14 rounded-[6px] bg-[#48C78E] border-3 border-black shadow-neo flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-black stroke-[2.5]" />
          </div>
          <h3 className="text-2xl font-bold text-black uppercase">No Active Rentals Outstanding</h3>
          <p className="text-sm font-medium text-neutral-700 mt-2">
            All equipment items have been returned and closed, or no active contracts have been opened yet.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ─────────────────────────────────────────────────────────────
              LEFT COLUMN: Active Rentals List (1 col)
             ───────────────────────────────────────────────────────────── */}
          <div className="space-y-4">
            <div className="neo-card space-y-4">
              <div className="flex items-center justify-between pb-3 border-b-3 border-black">
                <div className="font-bold text-black text-sm flex items-center gap-2 uppercase">
                  <Clock className="w-4 h-4 stroke-[2.5]" />
                  <span>Active Rentals</span>
                </div>
                <span className="px-2 py-0.5 rounded-[4px] border border-black bg-[#EDB92E] text-black font-mono font-bold text-xs">
                  {activeRentals.length} Contracts
                </span>
              </div>

              {/* Search */}
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-600" />
                <input
                  type="text"
                  placeholder="Search contract ID, customer..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="neo-input pl-10 text-xs"
                />
              </div>

              {/* List */}
              <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
                {filteredRentals.map((rental) => {
                  const isSelected = rental.rental_id === selectedRentalId;
                  const unreturnedCount = (rental.items || []).filter((i) => !i.returned_at).length;

                  return (
                    <div
                      key={rental.rental_id}
                      onClick={() => selectRental(rental)}
                      className={`p-3.5 rounded-[6px] border-3 border-black text-left cursor-pointer transition-all select-none ${
                        isSelected
                          ? 'bg-[#EDB92E] shadow-neo translate-x-[-1px] translate-y-[-1px]'
                          : 'bg-[#F7F5EE] shadow-neo hover:-translate-x-0.5 hover:-translate-y-0.5 hover:bg-[#ECE6D8]'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-xs text-black">
                          #{rental.rental_id}
                        </span>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 text-[10px] font-bold border border-black rounded-[4px] uppercase ${
                            unreturnedCount > 0
                              ? 'bg-[#E8505B] text-white'
                              : 'bg-[#48C78E] text-black'
                          }`}
                        >
                          {unreturnedCount} Items Due
                        </span>
                      </div>

                      <div className="mt-1.5 text-sm font-bold text-black">
                        {rental.customer_name}
                      </div>

                      <div className="text-xs font-medium text-neutral-800 mt-1 flex items-center justify-between">
                        <span>{rental.customer_phone}</span>
                        <span className="font-mono text-[11px] font-bold">
                          {rental.start_date?.slice(0, 10)} → {rental.end_date?.slice(0, 10)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ─────────────────────────────────────────────────────────────
              RIGHT COLUMN: Return & Inspection Details (2 cols)
             ───────────────────────────────────────────────────────────── */}
          <div className="lg:col-span-2 space-y-6">
            {selectedRental ? (
              <form onSubmit={handleSubmitReturn} className="space-y-6">
                {/* Rental Summary Card */}
                <div className="neo-card space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b-3 border-black gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-[4px] border border-black bg-black text-white font-mono font-bold text-xs">
                          RENTAL #{selectedRental.rental_id}
                        </span>
                        <span className="px-2 py-0.5 rounded-[4px] border border-black bg-[#EDB92E] text-black font-bold text-xs uppercase">
                          {selectedRental.rental_status}
                        </span>
                      </div>
                      <h2 className="text-2xl font-bold text-black uppercase mt-2 m-0">
                        {selectedRental.customer_name}
                      </h2>
                    </div>

                    <div className="text-xs font-medium text-black text-left sm:text-right">
                      <div>Phone: <strong className="font-mono">{selectedRental.customer_phone}</strong></div>
                      <div>Email: <span className="font-mono">{selectedRental.customer_email}</span></div>
                    </div>
                  </div>

                  {/* Financial & Plan Badges */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 bg-[#ECE6D8] p-3.5 rounded-[6px] border-2 border-black text-xs">
                    <div className="min-w-0">
                      <span className="text-neutral-600 font-bold block uppercase text-[10px]">Rental Period</span>
                      <strong className="text-black font-mono font-bold text-[11px] sm:text-xs block whitespace-nowrap">
                        {selectedRental.start_date?.slice(0, 10)} → {selectedRental.end_date?.slice(0, 10)}
                      </strong>
                    </div>
                    <div className="min-w-0">
                      <span className="text-neutral-600 font-bold block uppercase text-[10px]">Insurance Plan</span>
                      <strong className="text-black font-bold block truncate">
                        {selectedRental.insurance_name} (+{selectedRental.insurance_fee_rate}%)
                      </strong>
                    </div>
                    <div className="min-w-0">
                      <span className="text-neutral-600 font-bold block uppercase text-[10px]">Security Deposit</span>
                      <strong className="text-[#2F54EB] font-mono font-bold block whitespace-nowrap">
                        ฿{Number(selectedRental.deposit_amount || 0).toLocaleString()}
                      </strong>
                    </div>
                    <div className="min-w-0">
                      <span className="text-neutral-600 font-bold block uppercase text-[10px]">Total Contract Fee</span>
                      <strong className="text-black font-mono font-bold block whitespace-nowrap">
                        ฿{Number(selectedRental.total_rental_fee || 0).toLocaleString()}
                      </strong>
                    </div>
                  </div>

                  {/* Inspector and Date */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                    <div>
                      <label className="block text-xs font-bold text-black uppercase tracking-wider mb-1.5">
                        Inspecting Staff Member <span className="text-[#E8505B]">*</span>
                      </label>
                      <select
                        value={inspectorStaffId}
                        onChange={(e) => setInspectorStaffId(e.target.value)}
                        className="neo-select"
                      >
                        {staffList.map((s) => (
                          <option key={s.staff_id} value={s.staff_id}>
                            {s.full_name} ({s.role})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-black uppercase tracking-wider mb-1.5">
                        Return Date <span className="text-[#E8505B]">*</span>
                      </label>
                      <input
                        type="date"
                        value={returnDate}
                        onChange={(e) => setReturnDate(e.target.value)}
                        className="neo-input font-bold"
                      />
                    </div>
                  </div>
                </div>

                {/* Items to Inspect & Return */}
                <div className="neo-card space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b-3 border-black gap-2">
                    <div className="font-bold text-black text-sm flex items-center gap-2 uppercase">
                      <Camera className="w-4 h-4 stroke-[2.5]" />
                      <span>Contract Items ({selectedRental.items?.length || 0} Total)</span>
                    </div>
                    <span className="text-xs font-bold text-neutral-700">
                      Select items below to inspect and check-in
                    </span>
                  </div>

                  <div className="space-y-3">
                    {(selectedRental.items || []).map((item) => {
                      const isReturned = !!item.returned_at;
                      const form = itemForms[item.rental_item_id] || {};
                      const isSelected = form.selected;

                      return (
                        <div
                          key={item.rental_item_id}
                          className={`p-4 rounded-[6px] border-3 border-black transition-all ${
                            isReturned
                              ? 'bg-neutral-200/60 opacity-60'
                              : isSelected
                              ? 'bg-[#EDB92E]/20 shadow-neo'
                              : 'bg-[#F7F5EE] shadow-neo'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3">
                              {!isReturned ? (
                                <input
                                  type="checkbox"
                                  checked={!!isSelected}
                                  onChange={() => toggleItemSelection(item.rental_item_id)}
                                  className="w-5 h-5 mt-0.5 border-2 border-black rounded-[4px] accent-black cursor-pointer"
                                />
                              ) : (
                                <CheckCircle2 className="w-5 h-5 text-black stroke-[2.5] shrink-0 mt-0.5" />
                              )}

                              <div>
                                <div className="font-bold text-black text-sm flex items-center gap-2">
                                  <span>{item.equipment_name}</span>
                                  {isReturned && (
                                    <span className="badge-available text-[10px]">
                                      Returned on {item.returned_at?.slice(0, 10)}
                                    </span>
                                  )}
                                </div>
                                <div className="text-xs font-medium text-neutral-700 font-mono mt-0.5">
                                  SN: {item.serial_number} • Rate: ฿{Number(item.snapshot_daily_rate).toFixed(2)}/day
                                </div>
                              </div>
                            </div>

                            <span className="font-mono font-bold text-xs bg-black text-white px-2 py-0.5 rounded-[4px]">
                              ITEM #{item.rental_item_id}
                            </span>
                          </div>

                          {/* Inspection Fields */}
                          {!isReturned && isSelected && (
                            <div className="mt-4 pt-4 border-t-2 border-black grid grid-cols-1 sm:grid-cols-3 gap-3">
                              {/* Condition Note */}
                              <div className="sm:col-span-1">
                                <label className="block text-xs font-bold text-black mb-1">
                                  Condition Note
                                </label>
                                <input
                                  type="text"
                                  value={form.condition_note || ''}
                                  onChange={(e) =>
                                    handleItemFieldChange(
                                      item.rental_item_id,
                                      'condition_note',
                                      e.target.value
                                    )
                                  }
                                  placeholder="e.g. Lens clear, no scratch"
                                  className="neo-input text-xs py-1.5 min-h-[40px]"
                                />
                              </div>

                              {/* Damage Fee */}
                              <div>
                                <label className="block text-xs font-bold text-black mb-1">
                                  Damage Fee (THB)
                                </label>
                                <div className="relative">
                                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-black font-bold text-xs">
                                    ฿
                                  </span>
                                  <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={form.damage_fee}
                                    onChange={(e) =>
                                      handleItemFieldChange(
                                        item.rental_item_id,
                                        'damage_fee',
                                        e.target.value
                                      )
                                    }
                                    className="neo-input text-xs py-1.5 pl-6 font-mono font-bold min-h-[40px]"
                                  />
                                </div>
                              </div>

                              {/* Repair Cost */}
                              <div>
                                <label className="block text-xs font-bold text-black mb-1">
                                  Repair Cost (THB)
                                </label>
                                <div className="relative">
                                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-black font-bold text-xs">
                                    ฿
                                  </span>
                                  <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={form.repair_cost}
                                    onChange={(e) =>
                                      handleItemFieldChange(
                                        item.rental_item_id,
                                        'repair_cost',
                                        e.target.value
                                      )
                                    }
                                    className="neo-input text-xs py-1.5 pl-6 font-mono font-bold min-h-[40px]"
                                  />
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Settlement & Payment Card */}
                <div className="neo-card space-y-4">
                  <div className="flex items-center gap-2 pb-3 border-b-3 border-black font-bold text-black text-sm uppercase">
                    <Receipt className="w-4 h-4 stroke-[2.5]" />
                    <span>Settlement & Final Accounting</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {/* Breakdown */}
                    <div className="space-y-2 text-xs bg-[#ECE6D8] p-4 rounded-[6px] border-2 border-black font-bold">
                      <div className="flex justify-between text-neutral-700">
                        <span>Original Rental Fee:</span>
                        <span className="font-mono text-black font-bold">
                          ฿{Number(selectedRental.total_rental_fee || 0).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between text-neutral-700">
                        <span>Previous Accumulated Damage:</span>
                        <span className="font-mono text-black font-bold">
                          ฿{Number(selectedRental.total_damage_fee || 0).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between text-[#E8505B]">
                        <span>+ Assessed Damage / Repair (Trigger):</span>
                        <span className="font-mono font-bold">
                          +฿{(returnFinancials.assessedDamage + returnFinancials.assessedRepair).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between text-emerald-800">
                        <span>- Security Deposit Credit:</span>
                        <span className="font-mono font-bold">
                          -฿{Number(selectedRental.deposit_amount || 0).toLocaleString()}
                        </span>
                      </div>
                      <div className="pt-2 border-t-2 border-black flex justify-between text-sm font-bold text-black">
                        <span>Net Balance Due:</span>
                        <span className="font-mono text-base bg-[#EDB92E] px-2 py-0.5 rounded border border-black">
                          ฿{returnFinancials.remainingToPay.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>

                    {/* Payment Input */}
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-bold text-black uppercase mb-1">
                          Payment Classification
                        </label>
                        <select
                          value={paymentType}
                          onChange={(e) => setPaymentType(e.target.value)}
                          className="neo-select text-xs"
                        >
                          <option value="Settlement">Settlement (Outstanding rental balance)</option>
                          <option value="Fine">Fine (Damage & repair penalty)</option>
                        </select>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-black uppercase mb-1">
                            Amount (THB)
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={settleAmount}
                            onChange={(e) => setSettleAmount(e.target.value)}
                            className="neo-input text-xs font-mono font-bold"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-black uppercase mb-1">
                            Payment Method
                          </label>
                          <select
                            value={paymentMethod}
                            onChange={(e) => setPaymentMethod(e.target.value)}
                            className="neo-select text-xs"
                          >
                            <option value="Cash">Cash</option>
                            <option value="Credit Card">Credit Card</option>
                            <option value="Bank Transfer">Bank Transfer</option>
                            <option value="PromptPay">PromptPay QR</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <div className="pt-4 border-t-3 border-black flex items-center justify-end">
                    <button
                      type="submit"
                      disabled={submitting || returningItems.length === 0}
                      className="neo-btn neo-btn-primary px-6 py-3 text-base uppercase tracking-wider font-bold shadow-neo"
                    >
                      {submitting ? (
                        <>
                          <RefreshCw className="w-4 h-4 stroke-[2.5] animate-spin" />
                          <span>Executing Transaction...</span>
                        </>
                      ) : (
                        <>
                          <Check className="w-5 h-5 stroke-[2.5]" />
                          <span>Confirm Return & Settle ({returningItems.length} Items)</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </form>
            ) : (
              <div className="neo-card p-12 text-center text-neutral-600 font-bold">
                Please select an active rental contract from the left panel.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
