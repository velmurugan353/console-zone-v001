import { Outlet } from 'react-router-dom';
import AdminSidebar from './AdminSidebar';

export default function AdminLayout() {
  return (
    <div className="flex h-screen bg-[#050505] text-white">
      <AdminSidebar />
      <div className="flex-1 ml-64 overflow-y-auto">
        <div className="p-8">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
