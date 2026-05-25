"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Inbox from "../components/Inbox";
import { signout } from "../login/actions";

function DashboardContent() {
  const [isConnected, setIsConnected] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const searchParams = useSearchParams();

  useEffect(() => {
    // Use Next.js native searchParams for reliability
    const connectedFromSearch = searchParams?.get('ig_connected') === 'true';
    const connected = connectedFromSearch || localStorage.getItem('ig_connected') === 'true';

    if (connectedFromSearch) {
      localStorage.setItem('ig_connected', 'true');
    }

    if (connected) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Hydrates persisted Instagram connection state.
      setIsConnected(true);
    }
  }, [searchParams]);

  return (
    <div className="flex h-screen w-full bg-[#f9fafb] text-[#111827] font-sans">
      {/* Sidebar */}
      <aside className="w-52 flex flex-col bg-white border-r border-gray-200 shadow-sm hidden md:flex">
        <div className="p-4 flex items-center gap-2.5 border-b border-gray-100">
          <div className="w-6 h-6 bg-[#d4ff00] rounded flex items-center justify-center font-bold text-black shadow-sm text-xs">
            ⚡
          </div>
          <span className="font-extrabold text-lg tracking-tight text-black">TractionFlo</span>
        </div>

        <nav className="flex-1 px-3 py-3 space-y-1">
          {/* Active Link - explicit lime green */}
          <button 
            onClick={() => setActiveTab('dashboard')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg font-bold shadow-sm transition-transform hover:scale-[1.02] text-xs ${activeTab === 'dashboard' ? 'bg-[#d4ff00] text-black' : 'text-gray-500 hover:bg-gray-100 hover:text-black'}`}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012-2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
            Dashboard
          </button>
          
          <button 
            onClick={() => setActiveTab('inbox')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg font-bold shadow-sm transition-transform hover:scale-[1.02] text-xs ${activeTab === 'inbox' ? 'bg-[#d4ff00] text-black' : 'text-gray-500 hover:bg-gray-100 hover:text-black'}`}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
            Inbox
          </button>

          <button className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-gray-500 hover:bg-[#f0fdf4] hover:text-[#15803d] transition-all font-semibold text-xs">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            Automations
          </button>
          <button className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-gray-500 hover:bg-[#f0fdf4] hover:text-[#15803d] transition-all font-semibold text-xs">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
            Audience
          </button>
          <button className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-black transition-all font-semibold text-xs">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            Settings
          </button>

          <form action={signout} className="mt-auto pt-4 border-t border-gray-100">
            <button type="submit" className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-red-500 hover:bg-red-50 hover:text-red-600 transition-all font-semibold text-xs">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
              Logout
            </button>
          </form>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-y-auto relative bg-[#f9fafb]">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 py-2.5 px-5 flex justify-between items-center sticky top-0 z-10">
          <h1 className="text-lg font-extrabold tracking-tight text-black">Overview</h1>
          <div className="flex items-center gap-3">
            {!isConnected ? (
              <a 
                href="/api/auth/instagram" 
                target="popup" 
                onClick={(e) => {
                  e.preventDefault();
                  window.open('/api/auth/instagram', 'popup', 'width=600,height=700,scrollbars=yes');
                }} 
                className="bg-[#d4ff00] hover:bg-[#b8e600] text-black px-3 py-1.5 rounded-full font-bold transition-transform hover:scale-105 shadow-sm flex items-center gap-1.5 border border-[#b8e600] text-[11px]"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
                <span>CONNECT INSTAGRAM</span>
              </a>
            ) : (
              <div className="bg-[#f0fdf4] text-[#15803d] px-3 py-1.5 rounded-full font-bold shadow-sm flex items-center gap-1.5 border border-green-200 text-[11px]">
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
                <span>CONNECTED</span>
                <svg className="w-3.5 h-3.5 ml-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
              </div>
            )}
            <div className="w-7 h-7 rounded-full bg-gray-200 border-2 border-white shadow-sm overflow-hidden ring-2 ring-[#d4ff00] ring-offset-1">
              <img src="https://i.pravatar.cc/150?img=32" alt="User profile" className="w-full h-full object-cover" />
            </div>
          </div>
        </header>

        {/* Dashboard Content OR Inbox Content */}
        {activeTab === 'dashboard' ? (
          <div className="p-5 md:p-6 space-y-6 w-full">
            
            <div className="space-y-1">
              <h2 className="text-2xl md:text-3xl font-extrabold tracking-tighter text-black">
                Turn comments into customers.<br/>
                <span className="text-[#d4ff00]" style={{ textShadow: '1px 1px 0 #000, -1px 1px 0 #000, 1px -1px 0 #000, -1px -1px 0 #000' }}>Automatically.</span>
              </h2>
              <p className="text-gray-600 text-sm font-medium max-w-lg mt-1.5">
                People comment. People ask. People show interest. TractionFlo turns it into conversations, leads, and sales—on autopilot.
              </p>
            </div>
            
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
              <div className="bg-[#d4ff00] text-black p-4 rounded-xl shadow-sm border border-[#b8e600] hover:-translate-y-0.5 transition-transform">
                <div className="w-6 h-6 rounded-full bg-black/10 flex items-center justify-center mb-2.5">
                   <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                </div>
                <p className="text-[10px] font-bold opacity-80 mb-0.5 uppercase tracking-wider">Comments Processed</p>
                <h2 className="text-2xl font-extrabold tracking-tight">12,482</h2>
                <div className="mt-2 flex items-center text-[10px] font-bold">
                  <span className="flex items-center gap-1 bg-black/10 px-1.5 py-0.5 rounded-md">
                    <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>
                    12.5%
                  </span>
                </div>
              </div>
              
              <div className="bg-[#f0fdf4] p-4 rounded-xl border border-green-200 shadow-sm hover:-translate-y-0.5 transition-transform relative overflow-hidden">
                <div className="w-6 h-6 rounded-full bg-white text-[#15803d] flex items-center justify-center mb-2.5 shadow-sm border border-green-100">
                   <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                </div>
                <p className="text-[10px] font-bold text-[#15803d] mb-0.5 uppercase tracking-wider">DMs Sent</p>
                <h2 className="text-2xl font-extrabold tracking-tight text-black">8,309</h2>
                <div className="mt-2 flex items-center text-[10px] font-bold">
                  <span className="text-[#15803d] flex items-center gap-1 bg-white px-1.5 py-0.5 rounded-md border border-green-100 shadow-sm">
                    <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>
                    8.2%
                  </span>
                </div>
              </div>

              <div className="bg-blue-50 p-4 rounded-xl border border-blue-200 shadow-sm hover:-translate-y-0.5 transition-transform relative overflow-hidden">
                 <div className="w-6 h-6 rounded-full bg-white text-blue-500 flex items-center justify-center mb-2.5 shadow-sm border border-blue-100">
                   <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
                <p className="text-[10px] font-bold text-blue-600 mb-0.5 uppercase tracking-wider">Leads Captured</p>
                <h2 className="text-2xl font-extrabold tracking-tight text-black">1,204</h2>
                <div className="mt-2 flex items-center text-[10px] font-bold">
                  <span className="text-blue-600 flex items-center gap-1 bg-white px-1.5 py-0.5 rounded-md border border-blue-100 shadow-sm">
                    <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>
                    24.1%
                  </span>
                </div>
              </div>

              <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-200 shadow-sm hover:-translate-y-0.5 transition-transform relative overflow-hidden">
                 <div className="w-6 h-6 rounded-full bg-white text-yellow-600 flex items-center justify-center mb-2.5 shadow-sm border border-yellow-100">
                   <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
                <p className="text-[10px] font-bold text-yellow-600 mb-0.5 uppercase tracking-wider">Sales Tracked</p>
                <h2 className="text-2xl font-extrabold tracking-tight text-black">$48.2k</h2>
                <div className="mt-2 flex items-center text-[10px] font-bold">
                  <span className="text-yellow-600 flex items-center gap-1 bg-white px-1.5 py-0.5 rounded-md border border-yellow-100 shadow-sm">
                    <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>
                    12.4%
                  </span>
                </div>
              </div>
            </div>

            {/* Activity Section mapped to Image style notifications */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
              
              <div className="bg-white rounded-xl border border-gray-200 shadow-md overflow-hidden p-5">
                <h3 className="font-extrabold text-lg mb-3 text-black">Live Automation Feed</h3>
                <div className="space-y-2.5">
                  
                  {/* Activity Item */}
                  <div className="flex items-center gap-2.5 bg-white p-2.5 rounded-lg border border-gray-200 shadow-sm hover:border-green-300 transition-colors">
                     <div className="w-8 h-8 rounded-full bg-[#f0fdf4] text-[#15803d] flex items-center justify-center shrink-0 border border-green-100">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                     </div>
                     <div className="flex-1">
                        <h4 className="font-bold text-sm text-black">Lead captured</h4>
                        <p className="text-[#15803d] font-medium text-[11px]">Added to list</p>
                     </div>
                     <div className="text-right">
                        <p className="font-bold text-xs text-black">Sophia O.</p>
                        <p className="text-[10px] text-gray-500">Just now</p>
                     </div>
                  </div>

                  {/* Activity Item */}
                  <div className="flex items-center gap-2.5 bg-white p-2.5 rounded-lg border border-gray-200 shadow-sm hover:border-yellow-300 transition-colors">
                     <div className="w-8 h-8 rounded-full bg-yellow-50 text-yellow-600 flex items-center justify-center shrink-0 border border-yellow-100">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                     </div>
                     <div className="flex-1">
                        <h4 className="font-bold text-sm text-black">Follow-up scheduled</h4>
                        <p className="text-yellow-600 font-medium text-[11px]">In 24 hours</p>
                     </div>
                     <div className="text-right">
                        <p className="font-bold text-xs text-black">Mike F.</p>
                        <p className="text-[10px] text-gray-500">2m ago</p>
                     </div>
                  </div>

                  {/* Activity Item */}
                  <div className="flex items-center gap-2.5 bg-white p-2.5 rounded-lg border border-gray-200 shadow-sm hover:border-green-300 transition-colors">
                     <div className="w-8 h-8 rounded-full bg-[#f0fdf4] text-[#15803d] flex items-center justify-center shrink-0 border border-green-100">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" /></svg>
                     </div>
                     <div className="flex-1">
                        <h4 className="font-bold text-sm text-black">Opportunity saved</h4>
                        <p className="text-[#15803d] font-medium text-[11px]">Ready to close</p>
                     </div>
                     <div className="text-right">
                        <p className="font-bold text-xs text-black">Alex J.</p>
                        <p className="text-[10px] text-gray-500">5m ago</p>
                     </div>
                  </div>

                </div>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 shadow-md p-5 relative overflow-hidden">
                 <h3 className="font-extrabold text-lg mb-1.5 text-black">The TractionFlo way</h3>
                 <p className="text-gray-500 text-xs font-medium mb-4">Launch in minutes. Focus on growth, not workflows.</p>
                 
                 <div className="bg-gray-50 rounded-lg p-3 border border-gray-200 shadow-sm mb-4 flex items-center justify-between group cursor-pointer hover:border-[#d4ff00] transition-colors">
                   <p className="font-bold text-xs text-black">&quot;Send my guide when someone comments GUIDE&quot;</p>
                   <div className="w-6 h-6 bg-white border border-gray-200 rounded-full flex items-center justify-center text-[#15803d] group-hover:bg-[#d4ff00] group-hover:text-black transition-colors">
                      <svg className="w-3 h-3 -rotate-45 ml-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                   </div>
                 </div>

                 <ul className="space-y-2.5 mb-5 text-black">
                   <li className="flex items-center gap-2 font-bold text-xs">
                     <svg className="w-4 h-4 text-[#15803d] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                     Replies ready
                   </li>
                   <li className="flex items-center gap-2 font-bold text-xs">
                     <svg className="w-4 h-4 text-[#15803d] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                     Follow-up ready
                   </li>
                   <li className="flex items-center gap-2 font-bold text-xs">
                     <svg className="w-4 h-4 text-[#15803d] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                     Lead capture ready
                   </li>
                 </ul>

                 <div className="inline-flex items-center gap-1.5 bg-[#d4ff00] text-black px-3 py-1.5 rounded-md font-bold border border-[#b8e600] shadow-sm text-xs">
                   <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                   Time: Minutes
                 </div>
              </div>

            </div>
            
          </div>
        ) : (
          <div className="flex-1 w-full h-full overflow-hidden flex flex-col bg-white">
            <Inbox />
          </div>
        )}
      </main>
    </div>
  );
}

export default function DashboardHome() {
  return (
    <Suspense fallback={<div className="flex h-screen w-full items-center justify-center bg-[#f9fafb]">Loading...</div>}>
      <DashboardContent />
    </Suspense>
  );
}
