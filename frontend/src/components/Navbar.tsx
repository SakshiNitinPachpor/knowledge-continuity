import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  ShieldCheck, Moon, Sun, Monitor, LogOut,
  ChevronDown, Settings, LayoutDashboard, PlusCircle
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, logout, theme, effectiveTheme, setThemePreference } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [themeMenuOpen, setThemeMenuOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-50 bg-[#F8F6F1] dark:bg-[#111827] border-b border-[#E5E1D8] dark:border-[#1F2937] transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo & Product Brand */}
          <Link to={user ? "/dashboard" : "/"} className="flex items-center space-x-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#151923] to-[#1B2432] dark:from-[#B9825A] dark:to-[#8E5E3C] flex items-center justify-center text-white shadow-soft transition-transform group-hover:scale-105">
              <ShieldCheck className="w-6 h-6 text-[#B9825A] dark:text-[#111827]" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-lg tracking-tight text-[#151923] dark:text-white">
                  Knowledge Continuity
                </span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-[#B9825A]/15 dark:bg-[#B9825A]/25 text-[#B9825A] dark:text-[#D4A373]">
                  Enterprise
                </span>
              </div>
              <p className="text-[11px] text-[#64748B] dark:text-gray-400 font-medium">
                Preserve Knowledge. Continue Progress.
              </p>
            </div>
          </Link>

          {/* Right Navigation & Controls */}
          <div className="flex items-center space-x-3">
            
            {/* Real-time Light / Dark / System Theme Selector */}
            <div className="relative">
              <button
                onClick={() => setThemeMenuOpen(!themeMenuOpen)}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border border-[#E5E1D8] dark:border-gray-800 bg-white dark:bg-[#1B2432] text-[#151923] dark:text-gray-200 hover:border-[#B9825A] transition shadow-xs text-xs font-medium"
                title="Change theme preference"
                aria-label="Theme selector"
              >
                {effectiveTheme === 'dark' ? (
                  <Moon className="w-4 h-4 text-amber-400" />
                ) : (
                  <Sun className="w-4 h-4 text-[#B9825A]" />
                )}
                <span className="capitalize hidden sm:inline">{theme}</span>
                <ChevronDown className="w-3 h-3 text-gray-400" />
              </button>

              {themeMenuOpen && (
                <div className="absolute right-0 mt-2 w-36 bg-white dark:bg-[#1B2432] border border-[#E5E1D8] dark:border-gray-800 rounded-xl shadow-xl py-1.5 z-50">
                  <button
                    onClick={() => { setThemePreference('light'); setThemeMenuOpen(false); }}
                    className={`w-full flex items-center space-x-2 px-3 py-1.5 text-xs text-left ${
                      theme === 'light' ? 'font-bold text-[#B9825A] bg-[#F8F6F1] dark:bg-gray-800' : 'text-[#151923] dark:text-gray-300 hover:bg-[#F2EFE9] dark:hover:bg-gray-800'
                    }`}
                  >
                    <Sun className="w-3.5 h-3.5" />
                    <span>Light Mode</span>
                  </button>
                  <button
                    onClick={() => { setThemePreference('dark'); setThemeMenuOpen(false); }}
                    className={`w-full flex items-center space-x-2 px-3 py-1.5 text-xs text-left ${
                      theme === 'dark' ? 'font-bold text-[#B9825A] bg-[#F8F6F1] dark:bg-gray-800' : 'text-[#151923] dark:text-gray-300 hover:bg-[#F2EFE9] dark:hover:bg-gray-800'
                    }`}
                  >
                    <Moon className="w-3.5 h-3.5" />
                    <span>Dark Mode</span>
                  </button>
                  <button
                    onClick={() => { setThemePreference('system'); setThemeMenuOpen(false); }}
                    className={`w-full flex items-center space-x-2 px-3 py-1.5 text-xs text-left ${
                      theme === 'system' ? 'font-bold text-[#B9825A] bg-[#F8F6F1] dark:bg-gray-800' : 'text-[#151923] dark:text-gray-300 hover:bg-[#F2EFE9] dark:hover:bg-gray-800'
                    }`}
                  >
                    <Monitor className="w-3.5 h-3.5" />
                    <span>System Default</span>
                  </button>
                </div>
              )}
            </div>

            {user ? (
              <div className="relative">
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center space-x-2.5 p-1.5 pl-2.5 rounded-full bg-white dark:bg-[#1B2432] border border-[#E5E1D8] dark:border-gray-800 hover:border-[#B9825A] transition shadow-xs"
                >
                  <div className="w-7 h-7 rounded-full bg-[#B9825A]/15 text-[#B9825A] dark:bg-[#B9825A]/25 flex items-center justify-center font-bold text-xs">
                    {user.full_name ? user.full_name.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <div className="text-left hidden sm:block">
                    <p className="text-xs font-semibold leading-tight text-[#151923] dark:text-white">{user.full_name}</p>
                    <p className="text-[10px] text-[#64748B] dark:text-gray-400 leading-none">{user.title || 'Member'}</p>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                </button>

                {dropdownOpen && (
                  <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-[#1B2432] border border-[#E5E1D8] dark:border-gray-800 rounded-2xl shadow-xl py-2 z-50">
                    <div className="px-4 py-2 border-b border-[#E5E1D8] dark:border-gray-800">
                      <p className="text-xs font-bold text-[#151923] dark:text-white">{user.full_name}</p>
                      <p className="text-[11px] text-[#64748B] dark:text-gray-400 truncate">{user.email}</p>
                      <span className="inline-block mt-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#F2EFE9] dark:bg-gray-800 text-[#151923] dark:text-gray-300">
                        {user.title || 'Team Member'}
                      </span>
                    </div>

                    <Link
                      to="/dashboard"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center space-x-2 px-4 py-2 text-xs text-[#151923] dark:text-gray-300 hover:bg-[#F2EFE9] dark:hover:bg-gray-800"
                    >
                      <LayoutDashboard className="w-3.5 h-3.5 text-[#B9825A]" />
                      <span>My Workspace Dashboard</span>
                    </Link>

                    <Link
                      to="/settings"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center space-x-2 px-4 py-2 text-xs text-[#151923] dark:text-gray-300 hover:bg-[#F2EFE9] dark:hover:bg-gray-800"
                    >
                      <Settings className="w-3.5 h-3.5 text-[#64748B] dark:text-gray-400" />
                      <span>Account & Workspace Settings</span>
                    </Link>

                    <div className="border-t border-[#E5E1D8] dark:border-gray-800 my-1"></div>

                    <button
                      onClick={() => { setDropdownOpen(false); logout(); navigate('/'); }}
                      className="w-full text-left flex items-center space-x-2 px-4 py-2 text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center space-x-3">
                <Link
                  to="/login"
                  className="text-xs font-semibold text-[#151923] dark:text-white hover:text-[#B9825A] px-3 py-2 transition"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="text-xs font-semibold px-4 py-2 rounded-xl bg-[#151923] dark:bg-[#B9825A] text-white dark:text-[#111827] hover:bg-black dark:hover:bg-[#a6724d] transition shadow-xs"
                >
                  Create Account
                </Link>
              </div>
            )}

          </div>

        </div>
      </div>
    </header>
  );
};
