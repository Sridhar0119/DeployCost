import { useLocation, Link } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { 
  Rocket, 
  LayoutDashboard, 
  Sliders, 
  FileText, 
  Bell, 
  Settings, 
  ShieldAlert, 
  LogOut 
} from 'lucide-react';

export default function Sidebar() {
  const { user, isSuperAdmin, logout } = useAuth();
  const location = useLocation();
  const path = location.pathname;

  const links = [
    { name: 'Dashboard', to: '/', icon: LayoutDashboard, color: 'text-gray- dark hover:text-purple' },
    { name: 'Configure', to: '/configure', icon: Sliders, color: 'text-gray-dark hover:text-purple' },
    { name: 'Reports', to: '/reports', icon: FileText, color: 'text-gray-dark hover:text-purple' },
    { name: 'Alerts', to: '/alerts', icon: Bell, color: 'text-gray-dark hover:text-purple' },
    { name: 'Settings', to: '/settings', icon: Settings, color: 'text-gray-dark hover:text-purple' },
  ];

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to log out?')) {
      logout();
    }
  };

  return (
    <>
      {/* Horizontal Top Nav on Mobile */}
      <div id="mobile-nav" className="flex md:hidden w-full bg-white border-b border-[#d8d5cb] px-4 py-3 items-center justify-between z-10 sticky top-0">
        <div className="flex items-center space-x-2">
          <Rocket className="w-6 h-6 text-[#534AB7]" />
          <span className="font-sans font-bold tracking-tight text-[#2C2C2A]">DeployCost</span>
        </div>
        <div className="flex items-center space-x-4">
          {links.map((link) => {
            const Icon = link.icon;
            const active = path === link.to;
            return (
              <Link
                key={link.name}
                id={`nav-mob-${link.name.toLowerCase()}`}
                to={link.to}
                className={`p-1 ${active ? 'text-[#534AB7]' : 'text-[#2C2C2A]'}`}
                title={link.name}
              >
                <Icon className="w-5 h-5" />
              </Link>
            );
          })}
          {isSuperAdmin && (
            <Link
              id="nav-mob-admin"
              to="/admin"
              className={`p-1 ${path === '/admin' ? 'text-[#BA7517]' : 'text-[#BA7517]/70'}`}
              title="Admin Panel"
            >
              <ShieldAlert className="w-5 h-5" />
            </Link>
          )}
          <button
            id="btn-mob-logout"
            onClick={handleLogout}
            className="p-1 text-[#2C2C2A] hover:text-[#534AB7]"
            title="Log Out"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Desktop Vertical Sidebar */}
      <aside 
        id="desktop-sidebar" 
        className="hidden md:flex flex-col w-[200px] shrink-0 min-h-screen bg-white border-r border-[#d8d5cb] py-6 px-4 justify-between sticky top-0 h-screen"
      >
        <div className="space-y-8">
          {/* Logo / Brand Header */}
          <div className="flex items-center space-x-2 px-2">
            <Rocket className="w-7 h-7 text-[#534AB7]" />
            <span className="font-sans font-extrabold text-xl tracking-tight text-[#2C2C2A]">DeployCost</span>
          </div>

          {/* Navigation Items */}
          <nav className="flex flex-col space-y-2">
            {links.map((link) => {
              const Icon = link.icon;
              const active = path === link.to;
              return (
                <Link
                  key={link.name}
                  id={`nav-link-${link.name.toLowerCase()}`}
                  to={link.to}
                  className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-sans font-medium transition-colors ${
                    active 
                      ? 'bg-[#534AB7]/10 text-[#534AB7]' 
                      : 'text-[#2C2C2A] hover:bg-[#F1EFE8] hover:text-[#534AB7]'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{link.name}</span>
                </Link>
              );
            })}

            {isSuperAdmin && (
              <Link
                id="nav-link-admin"
                to="/admin"
                className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-sans font-semibold transition-colors ${
                  path === '/admin'
                    ? 'bg-[#BA7517]/15 text-[#BA7517]'
                    : 'text-[#BA7517] hover:bg-[#BA7517]/10'
                }`}
              >
                <ShieldAlert className="w-4 h-4 shrink-0 animate-pulse" />
                <span>Admin Panel</span>
              </Link>
            )}
          </nav>
        </div>

        {/* Desktop User Account Summary */}
        <div className="space-y-4 border-t border-[#d8d5cb] pt-4">
          <div className="flex items-center space-x-2.5 px-2">
            {user?.avatar_url ? (
              <img 
                src={user.avatar_url} 
                alt={user.name} 
                className="w-8 h-8 rounded-full border border-[#d8d5cb]" 
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-[#534AB7] text-white flex items-center justify-center font-sans font-bold text-xs uppercase">
                {user?.name ? user.name.slice(0, 2) : 'U'}
              </div>
            )}
            <div className="flex flex-col min-w-0">
              <span className="font-sans font-semibold text-xs text-[#2C2C2A] truncate leading-tight">
                {user?.name}
              </span>
              <span className="font-sans text-[10px] text-gray-400 truncate">
                {user?.email}
              </span>
            </div>
          </div>

          <button
            id="btn-desktop-logout"
            onClick={handleLogout}
            className="flex items-center space-x-3 w-full px-3 py-2 rounded-lg text-xs font-sans text-red-500 hover:bg-red-50 hover:text-red-600 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Log Out</span>
          </button>
        </div>
      </aside>
    </>
  );
}
