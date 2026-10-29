import { useState, useEffect, useMemo } from 'react';
import {
  getCustomers,
  getStaff,
  getInsurance,
  getEquipment,
  createRental,
} from '../api';
import {
  CalendarDays,
  Shield,
  User,
  BadgeCheck,
  CreditCard,
  Camera,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Search,
  Check,
  Receipt,
  AlertCircle,
  Clock,
  X,
} from 'lucide-react';

export default function BookingPage() {
  // Reference data
  const [customers, setCustomers] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [insurancePlans, setInsurancePlans] = useState([]);
  const [equipmentList, setEquipmentList] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form Fields
  const todayStr = new Date().toISOString().split('T')[0];
  const [customerId, setCustomerId] = useState('');
  const [staffId, setStaffId] = useState('');
  const [insuranceId, setInsuranceId] = useState('');
  const [startDate, setStartDate] = useState(todayStr);
  const [endDate, setEndDate] = useState(todayStr);
  const [selectedEquipmentIds, setSelectedEquipmentIds] = useState([]);
  const [depositAmount, setDepositAmount] = useState('0');
  const [paymentMethod, setPaymentMethod] = useState('Cash');

  // Equipment selector filters
  const [eqSearch, setEqSearch] = useState('');
  const [eqCategoryFilter, setEqCategoryFilter] = useState('');
  const [onlyAvailable, setOnlyAvailable] = useState(true);

  // Submission & Validation States
  const [formErrors, setFormErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [successResult, setSuccessResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Fetch reference data on mount
  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      const [custs, staff, ins, eq] = await Promise.all([
        getCustomers(),
        getStaff(),
        getInsurance(),
        getEquipment(),
      ]);

      setCustomers(custs);
      setStaffList(staff);
      setInsurancePlans(ins);
      setEquipmentList(eq);

      // Default select first available if present
      if (staff.length > 0) setStaffId(String(staff[0].staff_id));
      if (ins.length > 0) setInsuranceId(String(ins[0].insurance_id));
    } catch (err) {
      setServerError(`Failed to load reference data: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  // Categories list for filtering
  const categories = useMemo(() => {
    const map = new Map();
    equipmentList.forEach((e) => {
      if (e.category_id && !map.has(e.category_id)) {
        map.set(e.category_id, e.category_name);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [equipmentList]);

  // Filtered equipment list for selection
  const filteredEquipment = useMemo(() => {
    return equipmentList.filter((item) => {
      if (onlyAvailable && item.status !== 'Available') return false;
      if (eqCategoryFilter && String(item.category_id) !== String(eqCategoryFilter)) {
        return false;
      }
      if (eqSearch.trim()) {
        const q = eqSearch.toLowerCase();
        return (
          item.equipment_name.toLowerCase().includes(q) ||
          item.serial_number.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [equipmentList, onlyAvailable, eqCategoryFilter, eqSearch]);

  // Selected Equipment Objects
  const selectedEquipmentObjects = useMemo(() => {
    return equipmentList.filter((e) => selectedEquipmentIds.includes(e.equipment_id));
  }, [equipmentList, selectedEquipmentIds]);

  // Selected Insurance Plan Object
  const selectedInsurance = useMemo(() => {
    return insurancePlans.find((i) => String(i.insurance_id) === String(insuranceId));
  }, [insurancePlans, insuranceId]);

  // Fee Calculations
  const calculation = useMemo(() => {
    if (!startDate || !endDate) {
      return { days: 0, sumDaily: 0, insuranceFee: 0, totalFee: 0, isValidDates: false };
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = end.getTime() - start.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;

    if (diffDays <= 0) {
      return { days: diffDays, sumDaily: 0, insuranceFee: 0, totalFee: 0, isValidDates: false };
    }

    const sumDaily = selectedEquipmentObjects.reduce(
      (acc, eq) => acc + parseFloat(eq.daily_rate || 0),
      0
    );

    const feeRate = selectedInsurance ? parseFloat(selectedInsurance.fee_rate || 0) : 0;
    // Formula: total_rental_fee = Σ(snapshot_daily_rate × days) × (1 + fee_rate/100)
    const baseRentalFee = sumDaily * diffDays;
    const totalFee = baseRentalFee * (1 + feeRate / 100);
    const insuranceFee = totalFee - baseRentalFee;

    return {
      days: diffDays,
      sumDaily,
      insuranceFee: Math.round(insuranceFee * 100) / 100,
      totalFee: Math.round(totalFee * 100) / 100,
      isValidDates: true,
    };
  }, [startDate, endDate, selectedEquipmentObjects, selectedInsurance]);

  // Toggle Equipment Selection (only allowed for Available items)
  function toggleEquipment(eq) {
    if (eq.status !== 'Available') {
      return; // Do not allow selecting Rented or Maintenance items
    }
    const id = eq.equipment_id;
    setSelectedEquipmentIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
    if (formErrors.equipment_ids) {
      setFormErrors((prev) => ({ ...prev, equipment_ids: null }));
    }
  }

  // Client-side Validation
  function validate() {
    const errors = {};

    if (!customerId) {
      errors.customer_id = 'Please select a customer';
    }
    if (!staffId) {
      errors.staff_id = 'Please select an authorized staff member';
    }
    if (!insuranceId) {
      errors.insurance_id = 'Please select an insurance policy plan';
    }
    if (!startDate) {
      errors.start_date = 'Please specify rental start date';
    }
    if (!endDate) {
      errors.end_date = 'Please specify rental end date';
    } else if (startDate && endDate < startDate) {
      errors.end_date = 'End date must be greater than or equal to start date';
    }

    if (selectedEquipmentIds.length === 0) {
      errors.equipment_ids = 'Please select at least 1 equipment item';
    } else {
      const unavailableSelected = selectedEquipmentObjects.filter((e) => e.status !== 'Available');
      if (unavailableSelected.length > 0) {
        errors.equipment_ids = `Cannot rent unavailable equipment: ${unavailableSelected.map((e) => e.equipment_name).join(', ')}`;
      }
    }

    if (depositAmount === '' || isNaN(Number(depositAmount)) || Number(depositAmount) < 0) {
      errors.deposit_amount = 'Deposit amount must be a number >= 0';
    }

    if (!paymentMethod) {
      errors.payment_method = 'Please select a deposit payment method';
    }

    return errors;
  }

  // Submit Handler
  async function handleSubmit(e) {
    e.preventDefault();
    setServerError('');
    setSuccessResult(null);

    const errors = validate();
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setFormErrors({});
    setSubmitting(true);

    const payload = {
      customer_id: parseInt(customerId, 10),
      staff_id: parseInt(staffId, 10),
      insurance_id: parseInt(insuranceId, 10),
      start_date: startDate,
      end_date: endDate,
      equipment_ids: selectedEquipmentIds,
      deposit_amount: parseFloat(depositAmount || 0),
      payment_method: paymentMethod,
    };

    try {
      const res = await createRental(payload);
      setSuccessResult({
        rental_id: res.rental_id,
        itemsCount: selectedEquipmentIds.length,
        totalFee: calculation.totalFee,
        days: calculation.days,
      });

      // Reload equipment list to reflect new 'Rented' statuses if rented today
      const eq = await getEquipment();
      setEquipmentList(eq);

      // Reset selection
      setSelectedEquipmentIds([]);
    } catch (err) {
      // Display server exception message directly (e.g. from RAISE EXCEPTION)
      setServerError(err.message || 'Database transaction failed to create rental contract');
    } finally {
      setSubmitting(false);
    }
  }

  function handleReset() {
    setCustomerId('');
    setStartDate(todayStr);
    setEndDate(todayStr);
    setSelectedEquipmentIds([]);
    setDepositAmount('0');
    setPaymentMethod('Cash');
    setFormErrors({});
    setServerError('');
    setSuccessResult(null);
  }

  return (
    <div className="space-y-6">
      {/* ─────────────────────────────────────────────────────────────
          PAGE HEADER: Title + Subtitle + Action Button
         ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-2">
        <div className="text-left">
          <h1 className="text-4xl font-bold tracking-tight text-black uppercase leading-none">
            Rentals & Booking
          </h1>
          <p className="text-base text-neutral-800 mt-2 font-medium">
            Create contracts, select equipment items, verify scheduling conflicts, and calculate rental fees.
          </p>
        </div>

        <button
          type="button"
          onClick={handleReset}
          className="neo-btn neo-btn-secondary shrink-0"
        >
          <RefreshCw className="w-4 h-4 stroke-[2.5]" />
          <span>Reset Form</span>
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
                  Database Transaction Error (Rolled Back)
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
      {successResult && (
        <div className="p-5 rounded-[6px] bg-[#48C78E] border-3 border-black shadow-neo text-black">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-6 h-6 stroke-[2.5] shrink-0 mt-0.5" />
              <div>
                <h3 className="text-lg font-bold uppercase tracking-tight">
                  Rental Contract Created Successfully
                </h3>
                <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-2.5 bg-[#F7F5EE] border-2 border-black rounded-[4px]">
                    <span className="text-[10px] font-bold text-neutral-600 uppercase block">Contract ID</span>
                    <strong className="text-lg font-mono font-bold text-black">#{successResult.rental_id}</strong>
                  </div>
                  <div className="p-2.5 bg-[#F7F5EE] border-2 border-black rounded-[4px]">
                    <span className="text-[10px] font-bold text-neutral-600 uppercase block">Equipment Count</span>
                    <strong className="text-base font-bold text-black">{successResult.itemsCount} Items</strong>
                  </div>
                  <div className="p-2.5 bg-[#F7F5EE] border-2 border-black rounded-[4px]">
                    <span className="text-[10px] font-bold text-neutral-600 uppercase block">Duration</span>
                    <strong className="text-base font-bold text-black">{successResult.days} Days</strong>
                  </div>
                  <div className="p-2.5 bg-[#F7F5EE] border-2 border-black rounded-[4px]">
                    <span className="text-[10px] font-bold text-neutral-600 uppercase block">Total Fee</span>
                    <strong className="text-base font-mono font-bold text-black">
                      ฿{successResult.totalFee.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                    </strong>
                  </div>
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSuccessResult(null)}
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
          <p className="text-sm font-bold uppercase tracking-wider">Loading rental references...</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* ─────────────────────────────────────────────────────────────
                LEFT COLUMN: Booking Configuration (2 cols)
               ───────────────────────────────────────────────────────────── */}
            <div className="lg:col-span-2 space-y-6">
              {/* Section 1: Customer & Staff */}
              <div className="neo-card space-y-4">
                <div className="flex items-center gap-2 pb-3 border-b-3 border-black">
                  <span className="w-7 h-7 rounded-[4px] bg-[#EDB92E] border-2 border-black flex items-center justify-center font-bold text-xs text-black">
                    1
                  </span>
                  <span className="font-bold text-black uppercase tracking-tight text-base">
                    Customer & Authorized Staff
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Customer Select */}
                  <div>
                    <label className="block text-xs font-bold text-black uppercase tracking-wider mb-1.5">
                      Customer <span className="text-[#E8505B]">*</span>
                    </label>
                    <select
                      value={customerId}
                      onChange={(e) => {
                        setCustomerId(e.target.value);
                        if (formErrors.customer_id) {
                          setFormErrors((prev) => ({ ...prev, customer_id: null }));
                        }
                      }}
                      className="neo-select"
                    >
                      <option value="">-- Select Customer --</option>
                      {customers.map((c) => (
                        <option key={c.customer_id} value={c.customer_id}>
                          {c.full_name} ({c.phone})
                        </option>
                      ))}
                    </select>
                    {formErrors.customer_id && (
                      <div className="field-error-box">{formErrors.customer_id}</div>
                    )}
                  </div>

                  {/* Staff Select */}
                  <div>
                    <label className="block text-xs font-bold text-black uppercase tracking-wider mb-1.5">
                      Staff Representative <span className="text-[#E8505B]">*</span>
                    </label>
                    <select
                      value={staffId}
                      onChange={(e) => {
                        setStaffId(e.target.value);
                        if (formErrors.staff_id) {
                          setFormErrors((prev) => ({ ...prev, staff_id: null }));
                        }
                      }}
                      className="neo-select"
                    >
                      <option value="">-- Select Staff --</option>
                      {staffList.map((s) => (
                        <option key={s.staff_id} value={s.staff_id}>
                          {s.full_name} ({s.role})
                        </option>
                      ))}
                    </select>
                    {formErrors.staff_id && (
                      <div className="field-error-box">{formErrors.staff_id}</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Section 2: Dates & Insurance */}
              <div className="neo-card space-y-4">
                <div className="flex items-center gap-2 pb-3 border-b-3 border-black">
                  <span className="w-7 h-7 rounded-[4px] bg-[#2F54EB] text-white border-2 border-black flex items-center justify-center font-bold text-xs">
                    2
                  </span>
                  <span className="font-bold text-black uppercase tracking-tight text-base">
                    Rental Duration & Insurance
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Start Date */}
                  <div>
                    <label className="block text-xs font-bold text-black uppercase tracking-wider mb-1.5">
                      Start Date <span className="text-[#E8505B]">*</span>
                    </label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => {
                        setStartDate(e.target.value);
                        if (formErrors.start_date || formErrors.end_date) {
                          setFormErrors((prev) => ({
                            ...prev,
                            start_date: null,
                            end_date: null,
                          }));
                        }
                      }}
                      className="neo-input font-bold"
                    />
                    {formErrors.start_date && (
                      <div className="field-error-box">{formErrors.start_date}</div>
                    )}
                  </div>

                  {/* End Date */}
                  <div>
                    <label className="block text-xs font-bold text-black uppercase tracking-wider mb-1.5">
                      End Date <span className="text-[#E8505B]">*</span>
                    </label>
                    <input
                      type="date"
                      min={startDate}
                      value={endDate}
                      onChange={(e) => {
                        setEndDate(e.target.value);
                        if (formErrors.end_date) {
                          setFormErrors((prev) => ({ ...prev, end_date: null }));
                        }
                      }}
                      className="neo-input font-bold"
                    />
                    {formErrors.end_date && (
                      <div className="field-error-box">{formErrors.end_date}</div>
                    )}
                  </div>

                  {/* Insurance Plan */}
                  <div>
                    <label className="block text-xs font-bold text-black uppercase tracking-wider mb-1.5">
                      Insurance Policy <span className="text-[#E8505B]">*</span>
                    </label>
                    <select
                      value={insuranceId}
                      onChange={(e) => {
                        setInsuranceId(e.target.value);
                        if (formErrors.insurance_id) {
                          setFormErrors((prev) => ({ ...prev, insurance_id: null }));
                        }
                      }}
                      className="neo-select"
                    >
                      <option value="">-- Select Insurance Plan --</option>
                      {insurancePlans.map((ins) => (
                        <option key={ins.insurance_id} value={ins.insurance_id}>
                          {ins.plan_name} (+{ins.fee_rate}%)
                        </option>
                      ))}
                    </select>
                    {formErrors.insurance_id && (
                      <div className="field-error-box">{formErrors.insurance_id}</div>
                    )}
                  </div>
                </div>

                {/* Duration Badge */}
                <div className="flex flex-wrap items-center gap-3 p-3 bg-[#ECE6D8] rounded-[6px] border-2 border-black">
                  <div className="flex items-center gap-1.5 text-xs font-bold uppercase text-black">
                    <Clock className="w-4 h-4 stroke-[2.5]" />
                    <span>Duration:</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-[4px] border border-black bg-[#EDB92E] text-black font-bold text-xs font-mono">
                    {calculation.isValidDates ? `${calculation.days} Days` : 'Invalid Dates'}
                  </span>
                  {selectedInsurance && (
                    <span className="px-2 py-0.5 rounded-[4px] border border-black bg-[#F7F5EE] text-black font-bold text-xs">
                      Plan: {selectedInsurance.plan_name} (Coverage Limit ฿{Number(selectedInsurance.coverage_limit || 0).toLocaleString()})
                    </span>
                  )}
                </div>
              </div>

              {/* Section 3: Equipment Multi-Select */}
              <div className="neo-card space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b-3 border-black">
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-[4px] bg-[#EDB92E] text-black border-2 border-black flex items-center justify-center font-bold text-xs">
                      3
                    </span>
                    <span className="font-bold text-black uppercase tracking-tight text-base">
                      Select Equipment Items
                    </span>
                    <span className="text-[#E8505B] font-bold">*</span>
                  </div>
                  <span className="px-2.5 py-1 rounded-[4px] border-2 border-black bg-[#EDB92E] text-black font-bold text-xs">
                    {selectedEquipmentIds.length} Items Selected
                  </span>
                </div>

                {formErrors.equipment_ids && (
                  <div className="field-error-box flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 stroke-[2.5] shrink-0" />
                    <span>{formErrors.equipment_ids}</span>
                  </div>
                )}

                {/* Filters */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-600" />
                    <input
                      type="text"
                      placeholder="Search name or serial..."
                      value={eqSearch}
                      onChange={(e) => setEqSearch(e.target.value)}
                      className="neo-input pl-9 text-xs"
                    />
                  </div>

                  <div>
                    <select
                      value={eqCategoryFilter}
                      onChange={(e) => setEqCategoryFilter(e.target.value)}
                      className="neo-select text-xs"
                    >
                      <option value="">All Categories</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center">
                    <label className="inline-flex items-center gap-2 text-xs font-bold text-black cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={onlyAvailable}
                        onChange={(e) => setOnlyAvailable(e.target.checked)}
                        className="w-4 h-4 border-2 border-black rounded-[3px] accent-black cursor-pointer"
                      />
                      <span>Only Available Items</span>
                    </label>
                  </div>
                </div>

                {/* Equipment Selection List */}
                <div className="max-h-96 overflow-y-auto divide-y-2 divide-black/10 border-3 border-black rounded-[6px] bg-[#F7F5EE]">
                  {filteredEquipment.length === 0 ? (
                    <div className="p-8 text-center text-neutral-500 font-bold text-sm">
                      No equipment matches current criteria.
                    </div>
                  ) : (
                    filteredEquipment.map((eq) => {
                      const isSelected = selectedEquipmentIds.includes(eq.equipment_id);
                      const isAvailable = eq.status === 'Available';

                      return (
                        <div
                          key={eq.equipment_id}
                          onClick={() => isAvailable && toggleEquipment(eq)}
                          className={`p-3.5 flex items-center justify-between transition select-none ${
                            !isAvailable
                              ? 'opacity-60 bg-[#ECE6D8]/60 cursor-not-allowed border-l-4 border-l-neutral-400'
                              : isSelected
                              ? 'bg-[#EDB92E]/25 border-l-4 border-l-black font-bold cursor-pointer'
                              : 'hover:bg-[#ECE6D8] cursor-pointer'
                          }`}
                          title={!isAvailable ? `ไม่สามารถเลือกได้ (สถานะ: ${eq.status})` : 'คลิกเพื่อเลือก'}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-6 h-6 rounded-[4px] border-2 flex items-center justify-center transition ${
                                !isAvailable
                                  ? 'border-neutral-400 bg-neutral-200 text-neutral-400 cursor-not-allowed'
                                  : isSelected
                                  ? 'border-black bg-black text-[#EDB92E]'
                                  : 'border-black bg-[#F7F5EE]'
                              }`}
                            >
                              {isSelected && <Check className="w-4 h-4 stroke-[3]" />}
                            </div>

                            <div>
                              <div className={`text-sm font-bold ${!isAvailable ? 'text-neutral-500' : 'text-black'}`}>
                                {eq.equipment_name}
                              </div>
                              <div className="text-xs text-neutral-600 flex items-center gap-2 mt-0.5 font-bold">
                                <span className="font-mono text-black">#{eq.serial_number}</span>
                                <span>•</span>
                                <span>{eq.category_name}</span>
                                {!isAvailable && (
                                  <span className="text-[#E8505B] text-[11px] font-bold">
                                    [ไม่พร้อมให้เช่า / กำลังถูกเช่า]
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <div className="text-sm font-bold font-mono text-black">
                                ฿{Number(eq.daily_rate).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                              </div>
                              <div className="text-[10px] uppercase font-bold text-neutral-500">/ Day</div>
                            </div>

                            <span
                              className={
                                eq.status === 'Available'
                                  ? 'badge-available'
                                  : eq.status === 'Maintenance'
                                  ? 'badge-maintenance'
                                  : 'badge-rented'
                              }
                            >
                              {eq.status}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Section 4: Deposit and Payment */}
              <div className="neo-card space-y-4">
                <div className="flex items-center gap-2 pb-3 border-b-3 border-black">
                  <span className="w-7 h-7 rounded-[4px] bg-[#48C78E] text-black border-2 border-black flex items-center justify-center font-bold text-xs">
                    4
                  </span>
                  <span className="font-bold text-black uppercase tracking-tight text-base">
                    Deposit & Payment Method
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-black uppercase tracking-wider mb-1.5">
                      Deposit Amount (THB) <span className="text-[#E8505B]">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-black font-bold text-sm">
                        ฿
                      </span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={depositAmount}
                        onChange={(e) => {
                          setDepositAmount(e.target.value);
                          if (formErrors.deposit_amount) {
                            setFormErrors((prev) => ({ ...prev, deposit_amount: null }));
                          }
                        }}
                        className="neo-input pl-8 font-mono font-bold"
                      />
                    </div>
                    {formErrors.deposit_amount && (
                      <div className="field-error-box">{formErrors.deposit_amount}</div>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-black uppercase tracking-wider mb-1.5">
                      Payment Method <span className="text-[#E8505B]">*</span>
                    </label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="neo-select"
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

            {/* ─────────────────────────────────────────────────────────────
                RIGHT COLUMN: Order Summary & Submit (Sticky card)
               ───────────────────────────────────────────────────────────── */}
            <div className="space-y-6">
              <div className="bg-[#F7F5EE] rounded-[6px] border-3 border-black shadow-neo p-6 sticky top-8 space-y-4">
                <div className="flex items-center gap-2 pb-3 border-b-3 border-black">
                  <div className="w-8 h-8 rounded-[4px] bg-[#EDB92E] border-2 border-black flex items-center justify-center">
                    <Receipt className="w-4 h-4 text-black stroke-[2.5]" />
                  </div>
                  <h3 className="font-bold text-black uppercase tracking-tight text-base m-0">
                    Rental Summary
                  </h3>
                </div>

                {/* Selected Items Breakdown */}
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between font-bold uppercase text-neutral-600">
                    <span>Selected Items</span>
                    <span className="px-2 py-0.5 rounded-[4px] border border-black bg-black text-white text-[10px] font-mono font-bold">
                      {selectedEquipmentObjects.length} Items
                    </span>
                  </div>

                  {selectedEquipmentObjects.length === 0 ? (
                    <div className="p-4 bg-[#ECE6D8] rounded-[6px] border-2 border-black text-neutral-600 font-bold text-center">
                      No items currently selected
                    </div>
                  ) : (
                    <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                      {selectedEquipmentObjects.map((eq) => (
                        <div
                          key={eq.equipment_id}
                          className="p-2 bg-[#ECE6D8] rounded-[4px] border-2 border-black flex items-center justify-between text-xs"
                        >
                          <span className="truncate pr-2 font-bold text-black">
                            {eq.equipment_name}
                          </span>
                          <span className="font-mono font-bold text-black shrink-0">
                            ฿{Number(eq.daily_rate).toFixed(2)}/day
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Calculation Summary Table */}
                <div className="pt-3 border-t-3 border-black space-y-2 text-xs">
                  <div className="flex items-center justify-between font-bold">
                    <span className="text-neutral-600">Duration:</span>
                    <span className="text-black font-mono font-bold">
                      {calculation.isValidDates ? `${calculation.days} Days` : '—'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between font-bold">
                    <span className="text-neutral-600">Daily Subtotal:</span>
                    <span className="font-mono font-bold text-black">
                      ฿{calculation.sumDaily.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div className="flex items-center justify-between font-bold">
                    <span className="text-neutral-600">
                      Insurance Fee ({selectedInsurance ? `${selectedInsurance.fee_rate}%` : '0%'}):
                    </span>
                    <span className="font-mono font-bold text-black">
                      +฿{calculation.insuranceFee.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div className="flex items-center justify-between font-bold">
                    <span className="text-neutral-600">Security Deposit:</span>
                    <span className="font-mono font-bold text-[#2F54EB]">
                      ฿{Number(depositAmount || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  {/* Highlight Box for Total Fee */}
                  <div className="mt-4 p-4 rounded-[6px] bg-[#EDB92E] border-3 border-black shadow-neo text-black">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider">
                        Estimated Total Fee
                      </span>
                      <span className="text-xs font-mono font-bold px-1.5 py-0.5 rounded border border-black bg-[#F7F5EE]">THB</span>
                    </div>
                    <div className="text-3xl font-bold font-mono mt-1">
                      ฿{calculation.totalFee.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                    </div>
                    <div className="text-[10px] font-bold text-neutral-800 mt-1">
                      Formula: Σ(daily_rate × days) × (1 + fee_rate)
                    </div>
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={submitting || selectedEquipmentIds.length === 0 || !calculation.isValidDates}
                  className="neo-btn neo-btn-primary w-full py-3.5 text-base uppercase tracking-wider font-bold shadow-neo"
                >
                  {submitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 stroke-[2.5] animate-spin" />
                      <span>Creating Contract...</span>
                    </>
                  ) : (
                    <>
                      <BadgeCheck className="w-5 h-5 stroke-[2.5]" />
                      <span>Confirm & Create Rental</span>
                    </>
                  )}
                </button>

                <p className="text-[11px] text-center font-bold text-neutral-600">
                  Atomic Postgres Transaction with Stored Procedure Conflict Check
                </p>
              </div>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
