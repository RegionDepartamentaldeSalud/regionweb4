import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Calendar, 
  CheckSquare, 
  LogOut, 
  Settings, 
  User, 
  Palette, 
  Globe, 
  FileText, 
  ClipboardList, 
  FileDigit, 
  Database,
  Trophy,
  X as XIcon
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { cn } from '../lib/utils';

interface SidebarProps {
  onClose?: () => void;
}

export default function Sidebar({ onClose }: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { t } = useLanguage();
  const [showSettings, setShowSettings] = React.useState(false);

  const navigation = [
    { name: t('dashboard'), href: '/', icon: LayoutDashboard },
    { name: t('tasks'), href: '/tasks', icon: CheckSquare },
    { name: t('calendar'), href: '/calendar', icon: Calendar },
    { name: 'Números de Oficio', href: '/office-numbers', icon: ClipboardList },
    { name: 'Oficios Admon Digitales', href: '/digital-office-documents', icon: FileDigit },
    { name: 'Base de Datos de Oficios', href: '/office-database', icon: Database },
    { name: 'Logros de la Institución', href: '/achievements', icon: Trophy },
  ];

  const settingsOptions = [
    { name: t('account'), icon: User, href: '/settings/account' },
    { name: t('theme'), icon: Palette, href: '/settings/theme' },
    { name: t('language'), icon: Globe, href: '/settings/language' },
    { name: t('terms'), icon: FileText, href: '/settings/terms' },
  ];

  const handleNavigation = (path: string) => {
    navigate(path);
    onClose?.();
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between h-16 px-4 border-b">
        <h1 className="text-xl font-bold text-gray-900">Task Manager</h1>
        {onClose && (
          <button onClick={onClose} className="lg:hidden p-2 -mr-2">
            <XIcon className="h-5 w-5 text-gray-500" />
          </button>
        )}
      </div>

      <nav className="flex-1 p-4 overflow-y-auto">
        <ul className="space-y-1">
          {navigation.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.name}>
                <button
                  onClick={() => handleNavigation(item.href)}
                  className={cn(
                    'flex w-full items-center px-4 py-2 text-sm font-medium rounded-md',
                    location.pathname === item.href
                      ? 'bg-gray-100 text-gray-900'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  )}
                >
                  <Icon className="mr-3 h-5 w-5" />
                  {item.name}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="p-4 border-t space-y-2">
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="flex items-center w-full px-4 py-2 text-sm font-medium text-gray-600 rounded-md hover:bg-gray-50 hover:text-gray-900"
        >
          <Settings className="mr-3 h-5 w-5" />
          {t('settings')}
        </button>
        
        {showSettings && (
          <div className="pl-4 space-y-1">
            {settingsOptions.map((option) => (
              <button
                key={option.name}
                onClick={() => {
                  handleNavigation(option.href);
                  setShowSettings(false);
                }}
                className="flex items-center w-full px-4 py-2 text-sm font-medium text-gray-600 rounded-md hover:bg-gray-50 hover:text-gray-900"
              >
                <option.icon className="mr-3 h-4 w-4" />
                {option.name}
              </button>
            ))}
          </div>
        )}

        <button
          onClick={() => signOut()}
          className="flex items-center w-full px-4 py-2 text-sm font-medium text-gray-600 rounded-md hover:bg-gray-50 hover:text-gray-900"
        >
          <LogOut className="mr-3 h-5 w-5" />
          {t('signOut')}
        </button>
      </div>
    </div>
  );
}