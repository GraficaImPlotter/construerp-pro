
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, HardHat, DollarSign, FileText, LogOut, Settings, ShoppingCart, Users, UserSquare2, UserCircle } from 'lucide-react';
import { useAuth } from '../services/authContext';

const Sidebar: React.FC = () => {
  const { pathname } = useLocation();
  const { logout, user } = useAuth();

  const menuItems = [
    { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/works', icon: HardHat, label: 'Obras & Diário' },
    { path: '/customers', icon: UserSquare2, label: 'Clientes' },
    { path: '/finance', icon: DollarSign, label: 'Financeiro' },
    { path: '/purchases', icon: ShoppingCart, label: 'Compras & Estoque' },
    { path: '/fiscal', icon: FileText, label: 'Fiscal (NF-e)' },
  ];

  if (user?.role === 'master' || user?.role === 'admin') {
    menuItems.push({ path: '/users', icon: Users, label: 'Usuários' });
  }

  const isActive = (path: string) => pathname === path;

  return (
    <aside className="w-64 bg-slate-900 text-white flex flex-col h-screen fixed left-0 top-0 z-20 shadow-xl">
      <div className="p-6 border-b border-slate-700 flex items-center gap-2">
        <div className="bg-blue-500 p-2 rounded-lg">
          <HardHat size={24} className="text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight">ConstruERP</h1>
          <span className="text-xs text-slate-400">Professional</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-6 px-3 space-y-1">
        <div className="mb-4 px-3">
          <p className="text-xs uppercase text-slate-500 font-semibold tracking-wider">Menu Principal</p>
        </div>
        {menuItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`flex items-center gap-3 px-3 py-3 rounded-lg transition-colors duration-200 group ${
              isActive(item.path)
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <item.icon size={20} className={isActive(item.path) ? 'text-white' : 'text-slate-400 group-hover:text-white'} />
            <span className="font-medium">{item.label}</span>
          </Link>
        ))}
      </div>

      <div className="p-4 border-t border-slate-800">
        <Link 
          to="/profile"
          className="flex items-center gap-3 mb-4 px-2 py-2 rounded-lg hover:bg-slate-800 transition-colors group"
          title="Configurações de Perfil"
        >
          <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-sm font-bold text-blue-400 group-hover:bg-blue-600 group-hover:text-white transition-colors">
            {user?.nick.substring(0, 2).toUpperCase()}
          </div>
          <div className="overflow-hidden">
            <p className="text-sm font-medium truncate">{user?.nick}</p>
            <p className="text-xs text-slate-500 capitalize group-hover:text-slate-300">{user?.role}</p>
          </div>
          <Settings size={16} className="ml-auto text-slate-600 group-hover:text-slate-300" />
        </Link>
        <button
          onClick={logout}
          className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-red-600/90 text-slate-300 hover:text-white py-2 rounded-md transition-all duration-200 text-sm font-medium"
        >
          <LogOut size={16} />
          Sair do Sistema
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;