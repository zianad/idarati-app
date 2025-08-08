
import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useTheme } from '../hooks/useTheme.ts';
import { useLanguage } from '../hooks/useLanguage.ts';
import { useAppContext } from '../hooks/useAppContext.ts';
import { UserRole, AppContextType } from '../types/index.ts';
import { TranslationKey } from '../i18n/index.ts';
import { Sun, Moon, LogOut, LayoutDashboard, BarChart2, Users, UserCog, Settings as SettingsIcon, BookCopy, Network, CalendarDays, Languages } from 'lucide-react';

const Header: React.FC = () => {
    const { theme, toggleTheme } = useTheme();
    const { language, setLanguage, t } = useLanguage();
    const { currentUser, logout, findSchool } = useAppContext() as AppContextType;
    const navigate = useNavigate();

    const school = currentUser?.schoolId ? findSchool(currentUser.schoolId) : null;

    const handleLanguageChange = () => {
        const newLang = language === 'ar' ? 'fr' : 'ar';
        setLanguage(newLang);
    };
    
    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const getInitials = (name: string = '') => {
        if (!name) return 'S';
        return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    }
    
    const navItems: { to: string; labelKey: TranslationKey; icon: React.ReactNode; role: UserRole[] }[] = [
        { to: '/', labelKey: 'dashboard', icon: <LayoutDashboard size={20} />, role: [UserRole.SchoolOwner, UserRole.Staff] },
        { to: '/students', labelKey: 'students', icon: <Users size={20} />, role: [UserRole.SchoolOwner, UserRole.Staff] },
        { to: '/teachers', labelKey: 'teachers', icon: <UserCog size={20} />, role: [UserRole.SchoolOwner, UserRole.Staff] },
        { to: '/levels-groups', labelKey: 'levelsAndGroups', icon: <Network size={20} />, role: [UserRole.SchoolOwner, UserRole.Staff] },
        { to: '/courses', labelKey: 'subjectsAndCourses', icon: <BookCopy size={20} />, role: [UserRole.SchoolOwner, UserRole.Staff] },
        { to: '/schedule', labelKey: 'schedule', icon: <CalendarDays size={20} />, role: [UserRole.SchoolOwner, UserRole.Staff] },
        { to: '/finances', labelKey: 'finances', icon: <BarChart2 size={20} />, role: [UserRole.SchoolOwner] },
        { to: '/settings', labelKey: 'settings', icon: <SettingsIcon size={20} />, role: [UserRole.SchoolOwner] },
    ];
    
    const navLinkClass = ({ isActive }: { isActive: boolean }) =>
        `flex items-center gap-3 px-4 py-3 rounded-lg text-base font-semibold transition-colors duration-200 ${
        isActive
            ? 'bg-white dark:bg-gray-900 text-blue-600 dark:text-blue-400 shadow-md'
            : 'text-white/80 hover:bg-white/20 hover:text-white'
        }`;


    if (!currentUser || currentUser.role === UserRole.SuperAdmin) return null;

    return (
        <header className="bg-blue-600 dark:bg-gray-800 text-white shadow-xl print:hidden">
            {/* Top Bar */}
            <div className="flex items-center justify-between px-4 sm:px-6 py-3">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center text-blue-600 font-bold text-xl ring-2 ring-white/50">
                        {school?.logo ? <img src={school.logo} alt="logo" className="w-full h-full rounded-full object-cover" /> : getInitials(school?.name)}
                    </div>
                    <div>
                        <h1 className="text-lg sm:text-xl font-bold">{t('adminDashboard')}</h1>
                        <p className="text-sm sm:text-base text-white/80">{school?.name || 'N/A'}</p>
                    </div>
                </div>

                <div className="flex items-center gap-2 sm:gap-4">
                     <div className="hidden sm:flex items-center gap-2 text-sm">
                        <span className="font-bold text-lg">{language === 'ar' ? 'AR' : 'FR'}</span>
                        <button onClick={handleLanguageChange} className="p-2.5 rounded-full hover:bg-white/20 transition-colors">
                            <Languages size={22} />
                        </button>
                    </div>
                    <button onClick={toggleTheme} className="p-2.5 rounded-full hover:bg-white/20 transition-colors">
                        {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
                    </button>
                    <div className="hidden sm:block text-base text-right">
                        <p>Bonjour, {currentUser.name}</p>
                    </div>
                    <button onClick={handleLogout} className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white font-bold py-2.5 px-4 rounded-lg transition-colors shadow-md hover:shadow-lg text-base">
                        <LogOut size={18} />
                        <span className="hidden sm:inline">{t('logout')}</span>
                    </button>
                </div>
            </div>

            {/* Navigation Bar */}
            <div className="px-3 sm:px-5 pb-3">
                 <nav className="bg-black/10 dark:bg-black/20 p-2 rounded-xl">
                    <ul className="flex items-center gap-2 justify-start overflow-x-auto">
                        {navItems
                            .filter(item => item.role.includes(currentUser.role as UserRole))
                            .map((item) => (
                            <li key={item.to} className="shrink-0">
                                <NavLink to={item.to} end={item.to === '/'} className={navLinkClass}>
                                    {item.icon}
                                    <span>{t(item.labelKey)}</span>
                                </NavLink>
                            </li>
                        ))}
                    </ul>
                </nav>
            </div>
        </header>
    );
};
export default Header;