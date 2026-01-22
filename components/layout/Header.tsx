import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { LogOut, RefreshCw, Settings, Image, Wrench, User, Menu, X, Sun, Moon } from 'lucide-react';
import { NeuralLogo } from '../shared/NeuralLogo';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import DeveloperTools from '../panels/DeveloperTools';
import { useConnections } from '../../contexts/ConnectionContext';

interface HeaderProps {
    isComfyConnected: boolean;
    isRemote: boolean;
    onToggleDevTools: () => void;
    onReset: () => void;
    onGoHome: () => void;
    onOpenGallery: () => void;
    showDevTools: boolean;
    logs: {
        system: string[];
        ollama: string[];
        comfy: string[];
    };
    devSettings: {
        mockAnalysis: boolean;
        mockGeneration: boolean;
    };
    onUpdateSettings: (settings: any) => void;
    onOpenSettings?: () => void;
}

const NavAction: React.FC<{
    onClick?: () => void;
    icon: React.ReactNode;
    label: string;
    isActive?: boolean;
    danger?: boolean;
    className?: string; 
}> = ({ onClick, icon, label, isActive, danger, className }) => (
    <button
        onClick={onClick}
        className={`group relative flex items-center justify-center p-2 rounded-lg transition-all duration-300
        ${isActive ? 'bg-cyan-500/10 text-accent border border-subtle-accent' : 'bg-transparent hover:bg-hover text-dim hover:text-main'}
        ${danger ? 'hover:text-red-600 dark:hover:text-red-400 hover:bg-red-500/10' : ''}
        ${className || ''}`}
    >
        <div className="relative z-10 w-5 h-5 flex items-center justify-center">{icon}</div>
        
        {/* Tooltip Popup (Desktop Only) */}
        <span className="hidden md:block absolute top-full mt-2 left-1/2 -translate-x-1/2 px-2 py-1 bg-app/80 border border-subtle rounded text-xs text-main opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50 backdrop-blur-md">
            {label}
        </span>
        
        {/* Mobile Label (Sidebar style if needed, but for now we just rely on vertical layout showing basic buttons, or we can add text next to icon) */}
        {/* Actually, user asked for "menu items aligned vertically". Usually this implies Text is visible in mobile menu. */}
    </button>
);

const MobileNavAction: React.FC<{
    onClick?: () => void;
    icon: React.ReactNode;
    label: string;
    isActive?: boolean;
    danger?: boolean;
}> = ({ onClick, icon, label, isActive, danger }) => (
    <button
        onClick={onClick}
        className={`w-full flex items-center gap-4 p-4 rounded-lg transition-all
        ${isActive ? 'bg-cyan-500/10 text-accent border border-subtle-accent' : 'bg-card text-dim hover:bg-hover hover:text-main border border-subtle'}
        ${danger ? 'text-red-600 dark:text-red-400 border-red-500/20 bg-red-500/5 hover:bg-red-500/10' : ''}`}
    >
        {icon}
        <span className="text-lg font-medium">{label}</span>
    </button>
);


const Header: React.FC<HeaderProps> = ({
    isComfyConnected, isRemote, onToggleDevTools,
    onReset, onGoHome, onOpenGallery, showDevTools, logs, devSettings, onUpdateSettings, onOpenSettings
}) => {
    const { user, logout } = useAuth();
    const { connections } = useConnections();
    const { theme, toggleTheme } = useTheme();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const location = useLocation();

    const toggleMobileMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);

    // Close menu when an action is clicked
    const handleMobileAction = (action: () => void) => {
        action();
        setIsMobileMenuOpen(false);
    }

    return (
        <header className="flex flex-col md:flex-row items-center justify-between px-6 py-4 border-b border-subtle bg-surface/90 backdrop-blur-md sticky top-0 z-40 w-full gap-4 transition-colors duration-300">
            
            {/* 1. Top Section (Logo + Mobile Toggle + User) */}
            <div className="w-full md:w-auto flex items-center justify-between">
                
                {/* Logo */}
                <div className="flex items-center gap-4 shrink-0">
                    <div className="relative group cursor-pointer" onClick={onGoHome} title="Return to Home">
                        <NeuralLogo />
                    </div>
                    <div onClick={onGoHome} className="cursor-pointer hover:opacity-80 transition-opacity" title="Return to Home">
                        <h1 className="text-xl font-bold tracking-tight text-main mb-1">Animated<span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400">Dreams</span></h1>
                    </div>
                </div>

                {/* Mobile Toggle */}
                <button 
                    className="md:hidden p-2 text-dim hover:text-slate-900 dark:hover:text-white transition-colors"
                    onClick={toggleMobileMenu}
                >
                    {isMobileMenuOpen ? <X /> : <Menu />}
                </button>

                {/* User Profile (Desktop - Hidden on Mobile to save space, moved to menu? or Keep?) */}
                {/* Standard pattern: Keep user icon visible or put in menu. Let's keep it visible if space, or move into menu for cleaner look. Let's Keep distinct but maybe minimal. */}
                {/* Actually, let's Hide User on Right in Mobile because it takes width. Put it inside Hamburger. */}
            </div>


            {/* 2. Middle: Navigation Actions (Desktop Only) */}
            <nav className="hidden md:flex items-center flex-1 justify-center gap-8 px-4">
                
                {/* Group: Utilities & System */}
                <div className="flex items-center gap-4 justify-center">
                    {/* Gallery Moved to User Section */}
                    <NavAction onClick={onReset} icon={<RefreshCw className="w-4 h-4" />} label="Reset" />
                    
                    <div className="relative">
                        <NavAction onClick={onToggleDevTools} icon={<Wrench className="w-4 h-4" />} label="DevTools" isActive={showDevTools} />
                        <DeveloperTools isOpen={showDevTools} onToggle={onToggleDevTools} logs={logs} devSettings={devSettings} onUpdateSettings={onUpdateSettings} />
                    </div>

                    <NavAction onClick={onOpenSettings} icon={<Settings className="w-4 h-4" />} label="Settings" />
                    
                    {/* Theme Toggle */}
                    <NavAction 
                        onClick={toggleTheme} 
                        icon={theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />} 
                        label={theme === 'dark' ? 'Light Mode' : 'Dark Mode'} 
                    />
                </div>
            </nav>

            {/* 3. Right: User Profile (Desktop Only) */}
            <div className="hidden md:flex items-center gap-4 shrink-0">
                {user && (
                    <div className="flex items-center gap-3 px-1">
                        <div className="flex items-center gap-2 text-main hover:text-main transition-colors cursor-default">
                            <div className="p-1.5 bg-white/5 rounded-full border border-white/5">
                                <User className="w-4 h-4" />
                            </div>
                            <span className="text-sm font-semibold">{user.username}</span>
                        </div>
                        
                        <div className="h-4 w-px bg-white/10 mx-1"></div>
                        
                        {/* Gallery - Personal to User */}
                        <NavAction 
                            onClick={onOpenGallery} 
                            icon={<Image className="w-4 h-4" />} 
                            label="Gallery" 
                            isActive={location.pathname === '/gallery'} 
                        />

                        <div className="h-4 w-px bg-white/10 mx-1"></div>
                        
                        <NavAction onClick={logout} icon={<LogOut className="w-4 h-4" />} label="Logout" danger />
                    </div>
                )}
            </div>

            {/* 4. Mobile Menu Overlay */}
            {isMobileMenuOpen && (
                <div className="absolute top-full left-0 w-full bg-app/95 border-b border-subtle backdrop-blur-xl p-6 flex flex-col gap-4 animate-in slide-in-from-top-4 z-50 md:hidden shadow-2xl">
                     {user && (
                        <div className="flex items-center gap-3 p-4 bg-white/5 rounded-lg border border-white/5 mb-2">
                             <div className="p-2 bg-purple-500/20 rounded-full text-purple-400"><User /></div>
                             <div className="flex-1">
                                 <div className="text-sm text-dim">Signed in as</div>
                                 <div className="font-bold text-white">{user.username}</div>
                             </div>
                        </div>
                    )}

                    <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mt-2">Tools</div>
                    <MobileNavAction onClick={() => handleMobileAction(onOpenGallery)} icon={<Image />} label="Gallery" />
                    <MobileNavAction onClick={() => handleMobileAction(onReset)} icon={<RefreshCw />} label="Reset Interface" />
                    <MobileNavAction onClick={() => handleMobileAction(onToggleDevTools)} icon={<Wrench />} label="Developer Tools" isActive={showDevTools} />
                    <MobileNavAction onClick={() => handleMobileAction(onOpenSettings || (()=>{}))} icon={<Settings />} label="Settings" />
                    <MobileNavAction 
                        onClick={() => handleMobileAction(toggleTheme)} 
                        icon={theme === 'dark' ? <Sun /> : <Moon />} 
                        label={theme === 'dark' ? 'Light Mode' : 'Dark Mode'} 
                    />
                    
                    {user && (
                         <div className="mt-4 pt-4 border-t border-white/10">
                            <MobileNavAction onClick={() => handleMobileAction(logout)} icon={<LogOut />} label="Logout" danger />
                         </div>
                    )}
                </div>
            )}

        </header>
    );
};

export default Header;
