import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  getEquipment,
  createEquipment,
  updateEquipment,
  deleteEquipment,
  getCategories,
  getCustomers,
  createCustomer,
  updateCustomer,
  deleteCustomer,
} from '../api';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  X,
  Camera,
  Users,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';

const INITIAL_EQUIPMENT_FORM = {
  category_id: '',
  equipment_name: '',
  serial_number: '',
  daily_rate: '',
  status: 'Available',
};

const INITIAL_CUSTOMER_FORM = {
  full_name: '',
  email: '',
  phone: '',
  id_card_number: '',
};

export default function EquipmentCustomerPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') === 'customers' ? 'customers' : 'equipment';

  // ─────────────────────────────────────────────────────────────
  // 1. EQUIPMENT STATE
  // ─────────────────────────────────────────────────────────────
  const [equipmentList, setEquipmentList] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loadingEq, setLoadingEq] = useState(true);
  const [refreshingEq, setRefreshingEq] = useState(false);

  const [eqSearch, setEqSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const [isEqModalOpen, setIsEqModalOpen] = useState(false);
  const [eqModalMode, setEqModalMode] = useState('create');
  const [editingEqId, setEditingEqId] = useState(null);
  const [eqFormData, setEqFormData] = useState(INITIAL_EQUIPMENT_FORM);
  const [eqFormErrors, setEqFormErrors] = useState({});
  const [submittingEq, setSubmittingEq] = useState(false);
  const [eqServerError, setEqServerError] = useState('');
  const [eqNotification, setEqNotification] = useState(null);
  const [deletingEqId, setDeletingEqId] = useState(null);

  // ─────────────────────────────────────────────────────────────
  // 2. CUSTOMER STATE
  // ─────────────────────────────────────────────────────────────
  const [customerList, setCustomerList] = useState([]);
  const [loadingCust, setLoadingCust] = useState(true);
  const [refreshingCust, setRefreshingCust] = useState(false);

  const [custSearch, setCustSearch] = useState('');

  const [isCustModalOpen, setIsCustModalOpen] = useState(false);
  const [custModalMode, setCustModalMode] = useState('create');
  const [editingCustId, setEditingCustId] = useState(null);
  const [custFormData, setCustFormData] = useState(INITIAL_CUSTOMER_FORM);
  const [custFormErrors, setCustFormErrors] = useState({});
  const [submittingCust, setSubmittingCust] = useState(false);
  const [custServerError, setCustServerError] = useState('');
  const [custNotification, setCustNotification] = useState(null);
  const [deletingCustId, setDeletingCustId] = useState(null);

  // ─────────────────────────────────────────────────────────────
  // Initial Data Fetch
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    fetchEquipmentData();
    fetchCustomerData();
  }, []);

  async function fetchEquipmentData() {
    try {
      setLoadingEq(true);
      const [cats, eq] = await Promise.all([getCategories(), getEquipment()]);
      setCategories(cats);
      setEquipmentList(eq);
    } catch (err) {
      setEqNotification({ type: 'error', message: `โหลดข้อมูลอุปกรณ์ไม่สำเร็จ: ${err.message}` });
    } finally {
      setLoadingEq(false);
    }
  }

  async function reloadEquipment() {
    try {
      setRefreshingEq(true);
      const eq = await getEquipment();
      setEquipmentList(eq);
    } catch (err) {
      setEqNotification({ type: 'error', message: `รีเฟรชข้อมูลไม่สำเร็จ: ${err.message}` });
    } finally {
      setRefreshingEq(false);
    }
  }

  async function fetchCustomerData() {
    try {
      setLoadingCust(true);
      const custs = await getCustomers();
      setCustomerList(custs);
    } catch (err) {
      setCustNotification({ type: 'error', message: `โหลดข้อมูลลูกค้าไม่สำเร็จ: ${err.message}` });
    } finally {
      setLoadingCust(false);
    }
  }

  async function reloadCustomers() {
    try {
      setRefreshingCust(true);
      const custs = await getCustomers();
      setCustomerList(custs);
    } catch (err) {
      setCustNotification({ type: 'error', message: `รีเฟรชข้อมูลไม่สำเร็จ: ${err.message}` });
    } finally {
      setRefreshingCust(false);
    }
  }

  // ─────────────────────────────────────────────────────────────
  // EQUIPMENT LOGIC
  // ─────────────────────────────────────────────────────────────
  const filteredEquipment = useMemo(() => {
    return equipmentList.filter((item) => {
      if (filterCategory && String(item.category_id) !== String(filterCategory)) {
        return false;
      }
      if (filterStatus && item.status !== filterStatus) {
        return false;
      }
      if (eqSearch.trim()) {
        const q = eqSearch.toLowerCase();
        const matchName = item.equipment_name.toLowerCase().includes(q);
        const matchSerial = item.serial_number.toLowerCase().includes(q);
        const matchCat = (item.category_name || '').toLowerCase().includes(q);
        return matchName || matchSerial || matchCat;
      }
      return true;
    });
  }, [equipmentList, filterCategory, filterStatus, eqSearch]);

  function openCreateEqModal() {
    setEqModalMode('create');
    setEditingEqId(null);
    setEqFormData({
      category_id: categories.length > 0 ? String(categories[0].category_id) : '',
      equipment_name: '',
      serial_number: '',
      daily_rate: '',
      status: 'Available',
    });
    setEqFormErrors({});
    setEqServerError('');
    setIsEqModalOpen(true);
  }

  function openEditEqModal(item) {
    setEqModalMode('edit');
    setEditingEqId(item.equipment_id);
    setEqFormData({
      category_id: String(item.category_id),
      equipment_name: item.equipment_name,
      serial_number: item.serial_number,
      daily_rate: String(item.daily_rate),
      status: item.status,
    });
    setEqFormErrors({});
    setEqServerError('');
    setIsEqModalOpen(true);
  }

  function closeEqModal() {
    setIsEqModalOpen(false);
    setEqFormErrors({});
    setEqServerError('');
  }

  function handleEqChange(field, value) {
    setEqFormData((prev) => ({ ...prev, [field]: value }));
    if (eqFormErrors[field]) {
      setEqFormErrors((prev) => ({ ...prev, [field]: null }));
    }
  }

  function validateEqForm() {
    const errors = {};
    if (!eqFormData.category_id) {
      errors.category_id = 'กรุณาเลือกหมวดหมู่อุปกรณ์';
    }
    if (!eqFormData.equipment_name.trim()) {
      errors.equipment_name = 'กรุณากรอกชื่ออุปกรณ์';
    }
    if (!eqFormData.serial_number.trim()) {
      errors.serial_number = 'กรุณากรอก Serial Number';
    }
    if (!eqFormData.daily_rate || isNaN(eqFormData.daily_rate) || parseFloat(eqFormData.daily_rate) <= 0) {
      errors.daily_rate = 'กรุณากรอกอัตราค่าเช่าที่มากกว่า 0';
    }
    if (!eqFormData.status) {
      errors.status = 'กรุณาเลือกสถานะ';
    }
    setEqFormErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleEqSubmit(e) {
    e.preventDefault();
    setEqServerError('');
    if (!validateEqForm()) return;

    const payload = {
      category_id: parseInt(eqFormData.category_id, 10),
      equipment_name: eqFormData.equipment_name.trim(),
      serial_number: eqFormData.serial_number.trim(),
      daily_rate: parseFloat(eqFormData.daily_rate),
      status: eqFormData.status,
    };

    try {
      setSubmittingEq(true);
      if (eqModalMode === 'create') {
        const created = await createEquipment(payload);
        setEquipmentList((prev) => [created, ...prev]);
        setEqNotification({
          type: 'success',
          message: `เพิ่มอุปกรณ์ "${created.equipment_name}" สำเร็จ`,
        });
      } else {
        const updated = await updateEquipment(editingEqId, payload);
        setEquipmentList((prev) =>
          prev.map((item) => (item.equipment_id === editingEqId ? updated : item))
        );
        setEqNotification({
          type: 'success',
          message: `อัปเดตอุปกรณ์ "${updated.equipment_name}" สำเร็จ`,
        });
      }
      closeEqModal();
    } catch (err) {
      setEqServerError(err.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    } finally {
      setSubmittingEq(false);
    }
  }

  async function handleEqDelete(id) {
    try {
      setSubmittingEq(true);
      await deleteEquipment(id);
      setEquipmentList((prev) => prev.filter((item) => item.equipment_id !== id));
      setEqNotification({
        type: 'success',
        message: `ลบอุปกรณ์ ID #${id} เรียบร้อยแล้ว`,
      });
      setDeletingEqId(null);
    } catch (err) {
      setEqNotification({
        type: 'error',
        message: `ลบอุปกรณ์ไม่สำเร็จ: ${err.message}`,
      });
      setDeletingEqId(null);
    } finally {
      setSubmittingEq(false);
    }
  }

  // ─────────────────────────────────────────────────────────────
  // CUSTOMER LOGIC
  // ─────────────────────────────────────────────────────────────
  const filteredCustomers = useMemo(() => {
    if (!custSearch.trim()) return customerList;
    const q = custSearch.toLowerCase();
    return customerList.filter((c) => {
      const matchName = c.full_name.toLowerCase().includes(q);
      const matchEmail = (c.email || '').toLowerCase().includes(q);
      const matchPhone = (c.phone || '').includes(q);
      const matchId = (c.id_card_number || '').includes(q);
      return matchName || matchEmail || matchPhone || matchId;
    });
  }, [customerList, custSearch]);

  function openCreateCustModal() {
    setCustModalMode('create');
    setEditingCustId(null);
    setCustFormData(INITIAL_CUSTOMER_FORM);
    setCustFormErrors({});
    setCustServerError('');
    setIsCustModalOpen(true);
  }

  function openEditCustModal(item) {
    setCustModalMode('edit');
    setEditingCustId(item.customer_id);
    setCustFormData({
      full_name: item.full_name,
      email: item.email || '',
      phone: item.phone,
      id_card_number: item.id_card_number,
    });
    setCustFormErrors({});
    setCustServerError('');
    setIsCustModalOpen(true);
  }

  function closeCustModal() {
    setIsCustModalOpen(false);
    setCustFormErrors({});
    setCustServerError('');
  }

  function handleCustChange(field, value) {
    setCustFormData((prev) => ({ ...prev, [field]: value }));
    if (custFormErrors[field]) {
      setCustFormErrors((prev) => ({ ...prev, [field]: null }));
    }
  }

  function validateCustForm() {
    const errors = {};
    if (!custFormData.full_name.trim()) {
      errors.full_name = 'กรุณากรอกชื่อ-นามสกุล';
    }
    if (!custFormData.email.trim()) {
      errors.email = 'กรุณากรอกอีเมล';
    } else if (!/\S+@\S+\.\S+/.test(custFormData.email)) {
      errors.email = 'รูปแบบอีเมลไม่ถูกต้อง';
    }
    if (!custFormData.phone.trim()) {
      errors.phone = 'กรุณากรอกเบอร์โทรศัพท์';
    }
    if (!custFormData.id_card_number.trim()) {
      errors.id_card_number = 'กรุณากรอกเลขประจำตัวประชาชน 13 หลัก';
    } else if (custFormData.id_card_number.replace(/\D/g, '').length !== 13) {
      errors.id_card_number = 'เลขประจำตัวประชาชนต้องมี 13 หลัก';
    }
    setCustFormErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleCustSubmit(e) {
    e.preventDefault();
    setCustServerError('');
    if (!validateCustForm()) return;

    const payload = {
      full_name: custFormData.full_name.trim(),
      email: custFormData.email.trim(),
      phone: custFormData.phone.trim(),
      id_card_number: custFormData.id_card_number.trim(),
    };

    try {
      setSubmittingCust(true);
      if (custModalMode === 'create') {
        const created = await createCustomer(payload);
        setCustomerList((prev) => [created, ...prev]);
        setCustNotification({
          type: 'success',
          message: `เพิ่มลูกค้า "${created.full_name}" สำเร็จ`,
        });
      } else {
        const updated = await updateCustomer(editingCustId, payload);
        setCustomerList((prev) =>
          prev.map((item) => (item.customer_id === editingCustId ? updated : item))
        );
        setCustNotification({
          type: 'success',
          message: `อัปเดตลูกค้า "${updated.full_name}" สำเร็จ`,
        });
      }
      closeCustModal();
    } catch (err) {
      setCustServerError(err.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    } finally {
      setSubmittingCust(false);
    }
  }

  async function handleCustDelete(id) {
    try {
      setSubmittingCust(true);
      await deleteCustomer(id);
      setCustomerList((prev) => prev.filter((item) => item.customer_id !== id));
      setCustNotification({
        type: 'success',
        message: `ลบลูกค้า ID #${id} เรียบร้อยแล้ว`,
      });
      setDeletingCustId(null);
    } catch (err) {
      setCustNotification({
        type: 'error',
        message: `ลบลูกค้าไม่สำเร็จ: ${err.message}`,
      });
      setDeletingCustId(null);
    } finally {
      setSubmittingCust(false);
    }
  }

  function renderStatusBadge(status) {
    switch (status) {
      case 'Available':
        return <span className="badge-available">Available (พร้อมเช่า)</span>;
      case 'Rented':
        return <span className="badge-rented">Rented (กำลังเช่า)</span>;
      case 'Maintenance':
        return <span className="badge-maintenance">Maintenance (ส่งซ่อม)</span>;
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 text-xs font-bold border-2 border-black rounded-[4px] bg-[#F7F5EE] text-black uppercase">
            {status}
          </span>
        );
    }
  }

  return (
    <div className="space-y-6">
      {/* ─────────────────────────────────────────────────────────────
          PAGE HEADER: Space Grotesk Bold Title + Subtitle
         ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-2">
        <div className="text-left">
          <div className="flex items-center gap-3">
            <h1 className="text-4xl font-bold tracking-tight text-black uppercase leading-none">
              Equipment & Customers
            </h1>
            <span className="px-2.5 py-1 bg-[#EDB92E] border-2 border-black rounded-[4px] text-xs font-bold uppercase tracking-wider text-black">
              จัดการอุปกรณ์และลูกค้า
            </span>
          </div>
          <p className="text-sm sm:text-base text-neutral-800 mt-2 font-medium">
            Equipment catalog, availability tracking, customer directory, and contact records.
            <span className="block text-xs text-neutral-600 font-normal mt-0.5">
              (ทะเบียนรายการอุปกรณ์ในคลัง ตรวจสอบสถานะการใช้งาน พร้อมฐานข้อมูลลูกค้าและประวัติการติดต่อ)
            </span>
          </p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={activeTab === 'equipment' ? reloadEquipment : reloadCustomers}
            disabled={activeTab === 'equipment' ? refreshingEq : refreshingCust}
            className="neo-btn neo-btn-secondary"
          >
            <RefreshCw
              className={`w-4 h-4 stroke-[2.5] ${
                (activeTab === 'equipment' ? refreshingEq : refreshingCust) ? 'animate-spin' : ''
              }`}
            />
            <span>Refresh <span className="text-xs font-normal opacity-80">(รีเฟรช)</span></span>
          </button>
          <button
            type="button"
            onClick={activeTab === 'equipment' ? openCreateEqModal : openCreateCustModal}
            className="neo-btn neo-btn-yellow"
          >
            <Plus className="w-5 h-5 stroke-[2.5]" />
            <span>
              {activeTab === 'equipment' ? (
                <>Add Equipment <span className="text-xs font-normal opacity-80">(+เพิ่มอุปกรณ์)</span></>
              ) : (
                <>Add Customer <span className="text-xs font-normal opacity-80">(+เพิ่มลูกค้า)</span></>
              )}
            </span>
          </button>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          TAB SWITCHER: Neobrutalist Pill-free Chunky Tabs
         ───────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setSearchParams({ tab: 'equipment' })}
          className={`min-h-[44px] px-5 py-2.5 flex items-center gap-2.5 border-3 border-black rounded-[6px] font-bold text-sm tracking-tight select-none cursor-pointer transition-all ${
            activeTab === 'equipment'
              ? 'bg-[#2F54EB] text-white shadow-[4px_4px_0_0_#000000]'
              : 'bg-[#F7F5EE] text-black shadow-[4px_4px_0_0_#000000] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[6px_6px_0_0_#000000] active:translate-x-1 active:translate-y-1 active:shadow-none'
          }`}
        >
          <Camera className="w-5 h-5 stroke-[2.5]" />
          <span>
            Equipment Catalog
            <span className="text-xs font-normal normal-case block sm:inline opacity-80 sm:ml-1.5">
              (รายการอุปกรณ์)
            </span>
          </span>
          <span
            className={`px-2 py-0.5 rounded-[4px] border border-black font-mono text-xs font-bold ${
              activeTab === 'equipment' ? 'bg-[#EDB92E] text-black' : 'bg-[#ECE6D8] text-black'
            }`}
          >
            {equipmentList.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setSearchParams({ tab: 'customers' })}
          className={`min-h-[44px] px-5 py-2.5 flex items-center gap-2.5 border-3 border-black rounded-[6px] font-bold text-sm tracking-tight select-none cursor-pointer transition-all ${
            activeTab === 'customers'
              ? 'bg-[#2F54EB] text-white shadow-[4px_4px_0_0_#000000]'
              : 'bg-[#F7F5EE] text-black shadow-[4px_4px_0_0_#000000] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[6px_6px_0_0_#000000] active:translate-x-1 active:translate-y-1 active:shadow-none'
          }`}
        >
          <Users className="w-5 h-5 stroke-[2.5]" />
          <span>
            Customer Directory
            <span className="text-xs font-normal normal-case block sm:inline opacity-80 sm:ml-1.5">
              (ข้อมูลลูกค้า)
            </span>
          </span>
          <span
            className={`px-2 py-0.5 rounded-[4px] border border-black font-mono text-xs font-bold ${
              activeTab === 'customers' ? 'bg-[#EDB92E] text-black' : 'bg-[#ECE6D8] text-black'
            }`}
          >
            {customerList.length}
          </span>
        </button>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          TAB 1: EQUIPMENT
         ───────────────────────────────────────────────────────────── */}
      {activeTab === 'equipment' && (
        <div className="space-y-6">
          {/* Notification Alert */}
          {eqNotification && (
            <div
              className={`p-4 border-3 border-black shadow-neo rounded-[6px] text-black font-bold text-sm flex items-center justify-between ${
                eqNotification.type === 'success' ? 'bg-[#48C78E]' : 'bg-[#E8505B] text-white'
              }`}
            >
              <div className="flex items-center gap-2.5">
                {eqNotification.type === 'success' ? (
                  <CheckCircle2 className="w-5 h-5 stroke-[2.5] shrink-0" />
                ) : (
                  <AlertCircle className="w-5 h-5 stroke-[2.5] shrink-0" />
                )}
                <span>{eqNotification.message}</span>
              </div>
              <button
                type="button"
                onClick={() => setEqNotification(null)}
                className="neo-btn-sm neo-btn-secondary p-1 min-h-[30px]"
              >
                <X className="w-4 h-4 stroke-[2.5]" />
              </button>
            </div>
          )}

          {/* Filter Bar Card */}
          <div className="neo-card">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-600" />
                <input
                  type="text"
                  placeholder="Search equipment name, serial number... (ค้นหาอุปกรณ์)"
                  value={eqSearch}
                  onChange={(e) => setEqSearch(e.target.value)}
                  className="neo-input pl-10"
                />
              </div>

              <div>
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="neo-select"
                >
                  <option value="">All Categories (ทุกหมวดหมู่)</option>
                  {categories.map((c) => (
                    <option key={c.category_id} value={c.category_id}>
                      {c.category_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="neo-select"
                >
                  <option value="">All Statuses (ทุกสถานะ)</option>
                  <option value="Available">Available (พร้อมให้เช่า)</option>
                  <option value="Rented">Rented (กำลังถูกเช่า)</option>
                  <option value="Maintenance">Maintenance (ส่งซ่อมบำรุง)</option>
                </select>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t-2 border-black/10 flex items-center justify-between text-xs font-bold text-neutral-700">
              <span>
                Showing <strong className="text-black font-mono">{filteredEquipment.length}</strong> of{' '}
                <span className="font-mono text-black">{equipmentList.length}</span> items (แสดง {filteredEquipment.length} ชิ้น)
              </span>
              {(eqSearch || filterCategory || filterStatus) && (
                <button
                  type="button"
                  onClick={() => {
                    setEqSearch('');
                    setFilterCategory('');
                    setFilterStatus('');
                  }}
                  className="text-black underline font-bold hover:text-[#E8505B]"
                >
                  [ Clear Filters (ล้างตัวกรอง) ]
                </button>
              )}
            </div>
          </div>

          {/* Equipment Table Container */}
          <div className="border-3 border-black shadow-neo rounded-[6px] overflow-hidden bg-[#F7F5EE]">
            {loadingEq ? (
              <div className="p-16 text-center text-black">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto text-black mb-3" />
                <p className="text-sm font-bold uppercase tracking-wider">Loading Equipment Catalog...</p>
                <p className="text-xs font-normal text-neutral-600 mt-1">(กำลังโหลดรายการอุปกรณ์)</p>
              </div>
            ) : filteredEquipment.length === 0 ? (
              <div className="p-16 text-center text-black">
                <Camera className="w-12 h-12 mx-auto text-neutral-400 mb-3" />
                <p className="text-base font-bold">No equipment items match the search filters.</p>
                <p className="text-xs font-normal text-neutral-600 mt-1">(ไม่พบอุปกรณ์ที่ตรงตามเงื่อนไขการค้นหา)</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-black border-collapse">
                  <thead className="bg-[#EDB92E] text-black text-xs font-bold uppercase tracking-wider border-b-3 border-black">
                    <tr>
                      <th className="px-4 py-3.5 text-center w-16 border-r-2 border-black/20">
                        ID
                        <span className="text-[10px] font-normal block text-neutral-800">รหัส</span>
                      </th>
                      <th className="px-4 py-3.5 border-r-2 border-black/20">
                        Equipment Name
                        <span className="text-[10px] font-normal block text-neutral-800">ชื่ออุปกรณ์</span>
                      </th>
                      <th className="px-4 py-3.5 border-r-2 border-black/20">
                        Category
                        <span className="text-[10px] font-normal block text-neutral-800">หมวดหมู่</span>
                      </th>
                      <th className="px-4 py-3.5 border-r-2 border-black/20">
                        Serial Number
                        <span className="text-[10px] font-normal block text-neutral-800">ซีเรียล</span>
                      </th>
                      <th className="px-4 py-3.5 text-right border-r-2 border-black/20">
                        Daily Rate
                        <span className="text-[10px] font-normal block text-neutral-800">ค่าเช่า/วัน</span>
                      </th>
                      <th className="px-4 py-3.5 text-center border-r-2 border-black/20">
                        Status
                        <span className="text-[10px] font-normal block text-neutral-800">สถานะ</span>
                      </th>
                      <th className="px-4 py-3.5 text-center w-40">
                        Actions
                        <span className="text-[10px] font-normal block text-neutral-800">จัดการ</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y-2 divide-black/10">
                    {filteredEquipment.map((item, idx) => (
                      <tr
                        key={item.equipment_id}
                        className={`transition-colors hover:bg-[#ECE6D8] ${
                          idx % 2 === 0 ? 'bg-[#F7F5EE]' : 'bg-[#EFECE3]'
                        }`}
                      >
                        <td className="px-4 py-3.5 text-center font-mono font-bold text-xs border-r border-neutral-300">
                          #{item.equipment_id}
                        </td>
                        <td className="px-4 py-3.5 font-bold text-black border-r border-neutral-300">
                          {item.equipment_name}
                        </td>
                        <td className="px-4 py-3.5 text-black border-r border-neutral-300">
                          <span className="inline-block px-2 py-0.5 text-xs font-bold border border-black rounded-[4px] bg-[#ECE6D8]">
                            {item.category_name}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 font-mono text-xs font-bold text-black border-r border-neutral-300">
                          {item.serial_number}
                        </td>
                        <td className="px-4 py-3.5 text-right font-mono font-bold text-black border-r border-neutral-300">
                          ฿{Number(item.daily_rate).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3.5 text-center border-r border-neutral-300">
                          {renderStatusBadge(item.status)}
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <div className="inline-flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => openEditEqModal(item)}
                              className="neo-btn-sm neo-btn-yellow"
                              title="Edit Equipment (แก้ไข)"
                            >
                              <Edit2 className="w-3.5 h-3.5 stroke-[2.5]" />
                              <span>Edit <span className="text-[10px] font-normal opacity-80">(แก้ไข)</span></span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeletingEqId(item.equipment_id)}
                              className="neo-btn-sm neo-btn-danger"
                              title="Delete Equipment (ลบ)"
                            >
                              <Trash2 className="w-3.5 h-3.5 stroke-[2.5]" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Equipment Modal */}
          {isEqModalOpen && (
            <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
              <div className="bg-[#F7F5EE] rounded-[6px] border-3 border-black shadow-[6px_6px_0px_#000000] max-w-lg w-full p-6 relative">
                <div className="flex items-center justify-between pb-4 border-b-3 border-black">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-[4px] bg-[#EDB92E] border-2 border-black flex items-center justify-center">
                      <Camera className="w-4 h-4 stroke-[2.5]" />
                    </div>
                    <h2 className="text-xl font-bold text-black uppercase m-0">
                      {eqModalMode === 'create' ? (
                        <>Add Equipment <span className="text-sm font-normal normal-case opacity-80">(เพิ่มอุปกรณ์ใหม่)</span></>
                      ) : (
                        <>Edit Equipment #{editingEqId} <span className="text-sm font-normal normal-case opacity-80">(แก้ไขอุปกรณ์)</span></>
                      )}
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={closeEqModal}
                    className="neo-btn-sm neo-btn-secondary p-1 min-h-[32px]"
                  >
                    <X className="w-5 h-5 stroke-[2.5]" />
                  </button>
                </div>

                {eqServerError && (
                  <div className="mt-4 p-3 rounded-[6px] bg-[#E8505B] border-3 border-black text-white font-bold text-sm flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 stroke-[2.5] shrink-0 mt-0.5" />
                    <span>{eqServerError}</span>
                  </div>
                )}

                <form onSubmit={handleEqSubmit} className="mt-5 space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-black uppercase tracking-wider mb-1.5">
                      Category <span className="text-[11px] font-normal text-neutral-600 lowercase">(หมวดหมู่อุปกรณ์)</span> <span className="text-[#E8505B]">*</span>
                    </label>
                    <select
                      value={eqFormData.category_id}
                      onChange={(e) => handleEqChange('category_id', e.target.value)}
                      className="neo-select"
                    >
                      <option value="">-- Select Category (เลือกหมวดหมู่) --</option>
                      {categories.map((c) => (
                        <option key={c.category_id} value={c.category_id}>
                          {c.category_name}
                        </option>
                      ))}
                    </select>
                    {eqFormErrors.category_id && (
                      <div className="field-error-box">{eqFormErrors.category_id}</div>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-black uppercase tracking-wider mb-1.5">
                      Equipment Name <span className="text-[11px] font-normal text-neutral-600 lowercase">(ชื่ออุปกรณ์)</span> <span className="text-[#E8505B]">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Sony FX3 Cinema Line, Canon RF 50mm f/1.2L"
                      value={eqFormData.equipment_name}
                      onChange={(e) => handleEqChange('equipment_name', e.target.value)}
                      className="neo-input"
                    />
                    {eqFormErrors.equipment_name && (
                      <div className="field-error-box">{eqFormErrors.equipment_name}</div>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-black uppercase tracking-wider mb-1.5">
                      Serial Number <span className="text-[11px] font-normal text-neutral-600 lowercase">(หมายเลขซีเรียล)</span> <span className="text-[#E8505B]">* (Unique / ห้ามซ้ำ)</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. SN-FX3-90812"
                      value={eqFormData.serial_number}
                      onChange={(e) => handleEqChange('serial_number', e.target.value)}
                      className="neo-input font-mono"
                    />
                    {eqFormErrors.serial_number && (
                      <div className="field-error-box">{eqFormErrors.serial_number}</div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-black uppercase tracking-wider mb-1.5">
                        Daily Rate (THB) <span className="text-[11px] font-normal text-neutral-600 lowercase">(ค่าเช่าต่อวัน)</span> <span className="text-[#E8505B]">*</span>
                      </label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-black font-bold text-sm">
                          ฿
                        </span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          value={eqFormData.daily_rate}
                          onChange={(e) => handleEqChange('daily_rate', e.target.value)}
                          className="neo-input pl-8 font-mono"
                        />
                      </div>
                      {eqFormErrors.daily_rate && (
                        <div className="field-error-box">{eqFormErrors.daily_rate}</div>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-black uppercase tracking-wider mb-1.5">
                        Status <span className="text-[11px] font-normal text-neutral-600 lowercase">(สถานะอุปกรณ์)</span> <span className="text-[#E8505B]">*</span>
                      </label>
                      <select
                        value={eqFormData.status}
                        onChange={(e) => handleEqChange('status', e.target.value)}
                        className="neo-select"
                      >
                        <option value="Available">Available (พร้อมให้เช่า)</option>
                        <option value="Rented">Rented (กำลังถูกเช่า)</option>
                        <option value="Maintenance">Maintenance (ส่งซ่อมบำรุง)</option>
                      </select>
                      {eqFormErrors.status && (
                        <div className="field-error-box">{eqFormErrors.status}</div>
                      )}
                    </div>
                  </div>

                  <div className="pt-4 border-t-3 border-black flex items-center justify-end gap-3">
                    <button
                      type="button"
                      onClick={closeEqModal}
                      disabled={submittingEq}
                      className="neo-btn neo-btn-secondary"
                    >
                      Cancel <span className="text-xs font-normal opacity-80">(ยกเลิก)</span>
                    </button>
                    <button
                      type="submit"
                      disabled={submittingEq}
                      className="neo-btn neo-btn-primary"
                    >
                      {submittingEq && <RefreshCw className="w-4 h-4 animate-spin" />}
                      <span>
                        {eqModalMode === 'create' ? (
                          <>Save Equipment <span className="text-xs font-normal opacity-80">(บันทึก)</span></>
                        ) : (
                          <>Update Equipment <span className="text-xs font-normal opacity-80">(อัปเดต)</span></>
                        )}
                      </span>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Equipment Delete Confirm Modal */}
          {deletingEqId && (
            <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
              <div className="bg-[#F7F5EE] rounded-[6px] border-3 border-black shadow-[6px_6px_0px_#000000] max-w-md w-full p-6 text-center">
                <div className="w-12 h-12 rounded-[6px] bg-[#E8505B] border-3 border-black shadow-[3px_3px_0px_#000000] flex items-center justify-center mx-auto mb-4 text-white">
                  <Trash2 className="w-6 h-6 stroke-[2.5]" />
                </div>
                <h3 className="text-xl font-bold text-black uppercase">Confirm Equipment Deletion</h3>
                <p className="text-sm font-medium text-neutral-800 mt-2">
                  Are you sure you want to delete equipment <strong className="font-mono text-black">#{deletingEqId}</strong>?
                  This action cannot be undone.
                  <span className="block text-xs text-neutral-600 mt-1">
                    (คุณแน่ใจหรือไม่ว่าต้องการลบอุปกรณ์นี้? การกระทำนี้ไม่สามารถย้อนกลับได้)
                  </span>
                </p>
                <div className="mt-6 flex items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => setDeletingEqId(null)}
                    disabled={submittingEq}
                    className="neo-btn neo-btn-secondary"
                  >
                    Cancel <span className="text-xs font-normal opacity-80">(ยกเลิก)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleEqDelete(deletingEqId)}
                    disabled={submittingEq}
                    className="neo-btn neo-btn-danger"
                  >
                    {submittingEq ? 'Deleting... (กำลังลบ)' : 'Delete Equipment (ยืนยันการลบ)'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          TAB 2: CUSTOMERS
         ───────────────────────────────────────────────────────────── */}
      {activeTab === 'customers' && (
        <div className="space-y-6">
          {/* Notification Alert */}
          {custNotification && (
            <div
              className={`p-4 border-3 border-black shadow-neo rounded-[6px] text-black font-bold text-sm flex items-center justify-between ${
                custNotification.type === 'success' ? 'bg-[#48C78E]' : 'bg-[#E8505B] text-white'
              }`}
            >
              <div className="flex items-center gap-2.5">
                {custNotification.type === 'success' ? (
                  <CheckCircle2 className="w-5 h-5 stroke-[2.5] shrink-0" />
                ) : (
                  <AlertCircle className="w-5 h-5 stroke-[2.5] shrink-0" />
                )}
                <span>{custNotification.message}</span>
              </div>
              <button
                type="button"
                onClick={() => setCustNotification(null)}
                className="neo-btn-sm neo-btn-secondary p-1 min-h-[30px]"
              >
                <X className="w-4 h-4 stroke-[2.5]" />
              </button>
            </div>
          )}

          {/* Search Bar Card */}
          <div className="neo-card">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-600" />
              <input
                type="text"
                placeholder="Search customer name, email, phone, or national ID... (ค้นหาลูกค้า)"
                value={custSearch}
                onChange={(e) => setCustSearch(e.target.value)}
                className="neo-input pl-10"
              />
            </div>

            <div className="mt-4 pt-3 border-t-2 border-black/10 flex items-center justify-between text-xs font-bold text-neutral-700">
              <span>
                Showing <strong className="text-black font-mono">{filteredCustomers.length}</strong> of{' '}
                <span className="font-mono text-black">{customerList.length}</span> customers (แสดง {filteredCustomers.length} ราย)
              </span>
              {custSearch && (
                <button
                  type="button"
                  onClick={() => setCustSearch('')}
                  className="text-black underline font-bold hover:text-[#E8505B]"
                >
                  [ Clear Search (ล้างการค้นหา) ]
                </button>
              )}
            </div>
          </div>

          {/* Customer Table Container */}
          <div className="border-3 border-black shadow-neo rounded-[6px] overflow-hidden bg-[#F7F5EE]">
            {loadingCust ? (
              <div className="p-16 text-center text-black">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto text-black mb-3" />
                <p className="text-sm font-bold uppercase tracking-wider">Loading Customer Directory...</p>
                <p className="text-xs font-normal text-neutral-600 mt-1">(กำลังโหลดฐานข้อมูลลูกค้า)</p>
              </div>
            ) : filteredCustomers.length === 0 ? (
              <div className="p-16 text-center text-black">
                <Users className="w-12 h-12 mx-auto text-neutral-400 mb-3" />
                <p className="text-base font-bold">No customers match the search criteria.</p>
                <p className="text-xs font-normal text-neutral-600 mt-1">(ไม่พบข้อมูลลูกค้าที่ตรงตามเงื่อนไขการค้นหา)</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-black border-collapse">
                  <thead className="bg-[#EDB92E] text-black text-xs font-bold uppercase tracking-wider border-b-3 border-black">
                    <tr>
                      <th className="px-4 py-3.5 text-center w-16 border-r-2 border-black/20">
                        ID
                        <span className="text-[10px] font-normal block text-neutral-800">รหัส</span>
                      </th>
                      <th className="px-4 py-3.5 border-r-2 border-black/20">
                        Customer Name
                        <span className="text-[10px] font-normal block text-neutral-800">ชื่อ-นามสกุล</span>
                      </th>
                      <th className="px-4 py-3.5 border-r-2 border-black/20">
                        Email Address
                        <span className="text-[10px] font-normal block text-neutral-800">อีเมล</span>
                      </th>
                      <th className="px-4 py-3.5 border-r-2 border-black/20">
                        Phone Number
                        <span className="text-[10px] font-normal block text-neutral-800">เบอร์โทรศัพท์</span>
                      </th>
                      <th className="px-4 py-3.5 border-r-2 border-black/20">
                        National ID
                        <span className="text-[10px] font-normal block text-neutral-800">เลขบัตรประชาชน</span>
                      </th>
                      <th className="px-4 py-3.5 text-center w-40">
                        Actions
                        <span className="text-[10px] font-normal block text-neutral-800">จัดการ</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y-2 divide-black/10">
                    {filteredCustomers.map((cust, idx) => (
                      <tr
                        key={cust.customer_id}
                        className={`transition-colors hover:bg-[#ECE6D8] ${
                          idx % 2 === 0 ? 'bg-[#F7F5EE]' : 'bg-[#EFECE3]'
                        }`}
                      >
                        <td className="px-4 py-3.5 text-center font-mono font-bold text-xs border-r border-neutral-300">
                          #{cust.customer_id}
                        </td>
                        <td className="px-4 py-3.5 font-bold text-black border-r border-neutral-300">
                          {cust.full_name}
                        </td>
                        <td className="px-4 py-3.5 text-black font-mono text-xs border-r border-neutral-300">
                          {cust.email}
                        </td>
                        <td className="px-4 py-3.5 text-black font-medium border-r border-neutral-300">
                          {cust.phone}
                        </td>
                        <td className="px-4 py-3.5 font-mono text-xs font-bold text-black border-r border-neutral-300">
                          {cust.id_card_number}
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <div className="inline-flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => openEditCustModal(cust)}
                              className="neo-btn-sm neo-btn-yellow"
                              title="Edit Customer (แก้ไข)"
                            >
                              <Edit2 className="w-3.5 h-3.5 stroke-[2.5]" />
                              <span>Edit <span className="text-[10px] font-normal opacity-80">(แก้ไข)</span></span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeletingCustId(cust.customer_id)}
                              className="neo-btn-sm neo-btn-danger"
                              title="Delete Customer (ลบ)"
                            >
                              <Trash2 className="w-3.5 h-3.5 stroke-[2.5]" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Customer Modal */}
          {isCustModalOpen && (
            <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
              <div className="bg-[#F7F5EE] rounded-[6px] border-3 border-black shadow-[6px_6px_0px_#000000] max-w-lg w-full p-6 relative">
                <div className="flex items-center justify-between pb-4 border-b-3 border-black">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-[4px] bg-[#2F54EB] text-white border-2 border-black flex items-center justify-center">
                      <Users className="w-4 h-4 stroke-[2.5]" />
                    </div>
                    <h2 className="text-xl font-bold text-black uppercase m-0">
                      {custModalMode === 'create' ? (
                        <>Add Customer <span className="text-sm font-normal normal-case opacity-80">(เพิ่มลูกค้าใหม่)</span></>
                      ) : (
                        <>Edit Customer #{editingCustId} <span className="text-sm font-normal normal-case opacity-80">(แก้ไขลูกค้า)</span></>
                      )}
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={closeCustModal}
                    className="neo-btn-sm neo-btn-secondary p-1 min-h-[32px]"
                  >
                    <X className="w-5 h-5 stroke-[2.5]" />
                  </button>
                </div>

                {custServerError && (
                  <div className="mt-4 p-3 rounded-[6px] bg-[#E8505B] border-3 border-black text-white font-bold text-sm flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 stroke-[2.5] shrink-0 mt-0.5" />
                    <span>{custServerError}</span>
                  </div>
                )}

                <form onSubmit={handleCustSubmit} className="mt-5 space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-black uppercase tracking-wider mb-1.5">
                      Full Name <span className="text-[11px] font-normal text-neutral-600 lowercase">(ชื่อ-นามสกุล)</span> <span className="text-[#E8505B]">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Somchai Jaidee, Jane Doe"
                      value={custFormData.full_name}
                      onChange={(e) => handleCustChange('full_name', e.target.value)}
                      className="neo-input"
                    />
                    {custFormErrors.full_name && (
                      <div className="field-error-box">{custFormErrors.full_name}</div>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-black uppercase tracking-wider mb-1.5">
                      Email Address <span className="text-[11px] font-normal text-neutral-600 lowercase">(อีเมล)</span> <span className="text-[#E8505B]">* (Unique / ห้ามซ้ำ)</span>
                    </label>
                    <input
                      type="email"
                      placeholder="e.g. customer@example.com"
                      value={custFormData.email}
                      onChange={(e) => handleCustChange('email', e.target.value)}
                      className="neo-input font-mono"
                    />
                    {custFormErrors.email && (
                      <div className="field-error-box">{custFormErrors.email}</div>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-black uppercase tracking-wider mb-1.5">
                      Phone Number <span className="text-[11px] font-normal text-neutral-600 lowercase">(เบอร์โทรศัพท์)</span> <span className="text-[#E8505B]">*</span>
                    </label>
                    <input
                      type="tel"
                      placeholder="e.g. 081-234-5678"
                      value={custFormData.phone}
                      onChange={(e) => handleCustChange('phone', e.target.value)}
                      className="neo-input"
                    />
                    {custFormErrors.phone && (
                      <div className="field-error-box">{custFormErrors.phone}</div>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-black uppercase tracking-wider mb-1.5">
                      National ID Card (13 Digits) <span className="text-[11px] font-normal text-neutral-600 lowercase">(เลขบัตรประชาชน)</span> <span className="text-[#E8505B]">*</span>
                    </label>
                    <input
                      type="text"
                      maxLength={17}
                      placeholder="e.g. 1-2345-67890-12-3"
                      value={custFormData.id_card_number}
                      onChange={(e) => handleCustChange('id_card_number', e.target.value)}
                      className="neo-input font-mono"
                    />
                    {custFormErrors.id_card_number && (
                      <div className="field-error-box">{custFormErrors.id_card_number}</div>
                    )}
                  </div>

                  <div className="pt-4 border-t-3 border-black flex items-center justify-end gap-3">
                    <button
                      type="button"
                      onClick={closeCustModal}
                      disabled={submittingCust}
                      className="neo-btn neo-btn-secondary"
                    >
                      Cancel <span className="text-xs font-normal opacity-80">(ยกเลิก)</span>
                    </button>
                    <button
                      type="submit"
                      disabled={submittingCust}
                      className="neo-btn neo-btn-primary"
                    >
                      {submittingCust && <RefreshCw className="w-4 h-4 animate-spin" />}
                      <span>
                        {custModalMode === 'create' ? (
                          <>Save Customer <span className="text-xs font-normal opacity-80">(บันทึก)</span></>
                        ) : (
                          <>Update Customer <span className="text-xs font-normal opacity-80">(อัปเดต)</span></>
                        )}
                      </span>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Customer Delete Confirm Modal */}
          {deletingCustId && (
            <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
              <div className="bg-[#F7F5EE] rounded-[6px] border-3 border-black shadow-[6px_6px_0px_#000000] max-w-md w-full p-6 text-center">
                <div className="w-12 h-12 rounded-[6px] bg-[#E8505B] border-3 border-black shadow-[3px_3px_0px_#000000] flex items-center justify-center mx-auto mb-4 text-white">
                  <Trash2 className="w-6 h-6 stroke-[2.5]" />
                </div>
                <h3 className="text-xl font-bold text-black uppercase">Confirm Customer Deletion</h3>
                <p className="text-sm font-medium text-neutral-800 mt-2">
                  Are you sure you want to delete customer <strong className="font-mono text-black">#{deletingCustId}</strong>?
                  This action cannot be undone.
                  <span className="block text-xs text-neutral-600 mt-1">
                    (คุณแน่ใจหรือไม่ว่าต้องการลบข้อมูลลูกค้านี้? การกระทำนี้ไม่สามารถย้อนกลับได้)
                  </span>
                </p>
                <div className="mt-6 flex items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => setDeletingCustId(null)}
                    disabled={submittingCust}
                    className="neo-btn neo-btn-secondary"
                  >
                    Cancel <span className="text-xs font-normal opacity-80">(ยกเลิก)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCustDelete(deletingCustId)}
                    disabled={submittingCust}
                    className="neo-btn neo-btn-danger"
                  >
                    {submittingCust ? 'Deleting... (กำลังลบ)' : 'Delete Customer (ยืนยันการลบ)'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
