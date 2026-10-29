import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import EquipmentCustomerPage from './pages/EquipmentCustomerPage';
import BookingPage from './pages/BookingPage';
import ReturnInspectionPage from './pages/ReturnInspectionPage';
import DashboardPage from './pages/DashboardPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/manage" replace />} />
          <Route path="manage" element={<EquipmentCustomerPage />} />
          <Route path="booking" element={<BookingPage />} />
          <Route path="returns" element={<ReturnInspectionPage />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="*" element={<Navigate to="/manage" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
