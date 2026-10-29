const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

/**
 * Common fetch wrapper with JSON serialization and error handling
 */
async function request(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  if (config.body && typeof config.body === 'object' && !(config.body instanceof FormData)) {
    config.body = JSON.stringify(config.body);
  }

  const res = await fetch(url, config);
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const errorMsg = data.error || data.message || `Request failed with status ${res.status}`;
    const error = new Error(errorMsg);
    error.status = res.status;
    error.data = data;
    throw error;
  }

  return data;
}

// ── Dropdowns / References ─────────────────────────────────────
export const getCategories = () => request('/categories');
export const getStaff = () => request('/staff');
export const getInsurance = () => request('/insurance');

// ── Equipment CRUD ─────────────────────────────────────────────
export const getEquipment = (params = {}) => {
  const query = new URLSearchParams(params).toString();
  return request(`/equipment${query ? `?${query}` : ''}`);
};
export const getEquipmentById = (id) => request(`/equipment/${id}`);
export const createEquipment = (data) => request('/equipment', { method: 'POST', body: data });
export const updateEquipment = (id, data) => request(`/equipment/${id}`, { method: 'PUT', body: data });
export const deleteEquipment = (id) => request(`/equipment/${id}`, { method: 'DELETE' });

// ── Customers CRUD ─────────────────────────────────────────────
export const getCustomers = (params = {}) => {
  const query = new URLSearchParams(params).toString();
  return request(`/customers${query ? `?${query}` : ''}`);
};
export const getCustomerById = (id) => request(`/customers/${id}`);
export const createCustomer = (data) => request('/customers', { method: 'POST', body: data });
export const updateCustomer = (id, data) => request(`/customers/${id}`, { method: 'PUT', body: data });
export const deleteCustomer = (id) => request(`/customers/${id}`, { method: 'DELETE' });

// ── Rentals ───────────────────────────────────────────────────
export const getActiveRentals = () => request('/rentals/active');
export const getRentals = (params = {}) => {
  const query = new URLSearchParams(params).toString();
  return request(`/rentals${query ? `?${query}` : ''}`);
};
export const getRentalById = (id) => request(`/rentals/${id}`);
export const createRental = (data) => request('/rentals', { method: 'POST', body: data });

// ── Returns & Inspections ─────────────────────────────────────
export const processReturn = (data) => request('/returns', { method: 'POST', body: data });

// ── Dashboard ─────────────────────────────────────────────────
export const getDashboard = () => request('/dashboard');

// ── Health ────────────────────────────────────────────────────
export const checkHealth = () => request('/health');

export default {
  getCategories,
  getStaff,
  getInsurance,
  getEquipment,
  getEquipmentById,
  createEquipment,
  updateEquipment,
  deleteEquipment,
  getCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  getActiveRentals,
  getRentals,
  getRentalById,
  createRental,
  processReturn,
  getDashboard,
  checkHealth,
};
