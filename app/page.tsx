import Image from "next/image";

export default function DashboardHome() {
  return (
    <div className="flex h-screen w-full bg-[#f9fafb] text-[#111827] font-sans">
      {/* Sidebar */}
      <aside className="w-60 flex flex-col bg-white border-r border-gray-200 shadow-sm hidden md:flex">
        <div className="p-5 flex items-center gap-3">
          <div className="w-7 h-7 bg-[#d4ff00] rounded flex items-center justify-center font-bold text-black shadow-sm text-sm">
            ⚡
          </div>
          <span className="font-extrabold text-xl tracking-tight text-black">TractionFlo</span>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {/* Active Link - explicit lime green */}
          <a href="#" className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-[#d4ff00] text-black font-bold shadow-sm transition-transform hover:scale-[1.02] text-sm">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
            Dashboard
          </a>
          <a href="#" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-500 hover:bg-[#f0fdf4] hover:text-[#15803d] transition-all font-semibold text-sm">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            Automations
          </a>
          <a href="#" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-500 hover:bg-[#f0fdf4] hover:text-[#15803d] transition-all font-semibold text-sm">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
            Audience
          </a>
          <a href="#" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-black transition-all font-semibold text-sm">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            Settings
          </a>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-y-auto relative bg-[#f9fafb]">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 py-3 px-6 flex justify-between items-center sticky top-0 z-10">
          <h1 className="text-xl font-extrabold tracking-tight text-black">Overview</h1>
          <div className="flex items-center gap-4">
            <button className="bg-[#d4ff00] hover:bg-[#b8e600] text-black px-4 py-2 rounded-full font-bold transition-transform hover:scale-105 shadow-md flex items-center gap-2 border border-[#b8e600] text-sm">
              <span>GET FOUNDING ACCESS</span>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
            </button>
            <div className="w-8 h-8 rounded-full bg-gray-200 border-2 border-white shadow-sm overflow-hidden ring-2 ring-[#d4ff00] ring-offset-1">
              <img src="https://i.pravatar.cc/150?img=32" alt="User profile" className="w-full h-full object-cover" />
            </div>
          </div>
        </header>

        {/* Dashboard Content */}
        <div className="p-6 space-y-8 max-w-6xl w-full mx-auto">
          
          <div className="space-y-1.5">
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tighter text-black">
              Turn comments into customers.<br/>
              <span className="text-[#d4ff00]" style={{ textShadow: '1px 1px 0 #000, -1px 1px 0 #000, 1px -1px 0 #000, -1px -1px 0 #000' }}>Automatically.</span>
            </h2>
            <p className="text-gray-600 text-base font-medium max-w-xl mt-2">
              People comment. People ask. People show interest. TractionFlo turns it into conversations, leads, and sales—on autopilot.
            </p>
          </div>
          
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-[#d4ff00] text-black p-5 rounded-xl shadow-md border border-[#b8e600] hover:-translate-y-1 transition-transform">
              <div className="w-8 h-8 rounded-full bg-black/10 flex items-center justify-center mb-3">
                 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
              </div>
              <p className="text-xs font-bold opacity-80 mb-1 uppercase tracking-wider">Comments Processed</p>
              <h2 className="text-3xl font-extrabold tracking-tight">12,482</h2>
              <div className="mt-3 flex items-center text-xs font-bold">
                <span className="flex items-center gap-1 bg-black/10 px-1.5 py-0.5 rounded-md">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>
                  12.5%
                </span>
              </div>
            </div>
            
            <div className="bg-[#f0fdf4] p-5 rounded-xl border border-green-200 shadow-sm hover:-translate-y-1 transition-transform relative overflow-hidden">
              <div className="w-8 h-8 rounded-full bg-white text-[#15803d] flex items-center justify-center mb-3 shadow-sm border border-green-100">
                 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
              </div>
              <p className="text-xs font-bold text-[#15803d] mb-1 uppercase tracking-wider">DMs Sent</p>
              <h2 className="text-3xl font-extrabold tracking-tight text-black">8,309</h2>
              <div className="mt-3 flex items-center text-xs font-bold">
                <span className="text-[#15803d] flex items-center gap-1 bg-white px-1.5 py-0.5 rounded-md border border-green-100 shadow-sm">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>
                  8.2%
                </span>
              </div>
            </div>

            <div className="bg-blue-50 p-5 rounded-xl border border-blue-200 shadow-sm hover:-translate-y-1 transition-transform relative overflow-hidden">
               <div className="w-8 h-8 rounded-full bg-white text-blue-500 flex items-center justify-center mb-3 shadow-sm border border-blue-100">
                 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <p className="text-xs font-bold text-blue-600 mb-1 uppercase tracking-wider">Leads Captured</p>
              <h2 className="text-3xl font-extrabold tracking-tight text-black">1,204</h2>
              <div className="mt-3 flex items-center text-xs font-bold">
                <span className="text-blue-600 flex items-center gap-1 bg-white px-1.5 py-0.5 rounded-md border border-blue-100 shadow-sm">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>
                  24.1%
                </span>
              </div>
            </div>

            <div className="bg-yellow-50 p-5 rounded-xl border border-yellow-200 shadow-sm hover:-translate-y-1 transition-transform relative overflow-hidden">
               <div className="w-8 h-8 rounded-full bg-white text-yellow-600 flex items-center justify-center mb-3 shadow-sm border border-yellow-100">
                 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <p className="text-xs font-bold text-yellow-600 mb-1 uppercase tracking-wider">Sales Tracked</p>
              <h2 className="text-3xl font-extrabold tracking-tight text-black">$48.2k</h2>
              <div className="mt-3 flex items-center text-xs font-bold">
                <span className="text-yellow-600 flex items-center gap-1 bg-white px-1.5 py-0.5 rounded-md border border-yellow-100 shadow-sm">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>
                  12.4%
                </span>
              </div>
            </div>
          </div>

          {/* Activity Section mapped to Image style notifications */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            
            <div className="bg-white rounded-2xl border border-gray-200 shadow-lg overflow-hidden p-6">
              <h3 className="font-extrabold text-xl mb-4 text-black">Live Automation Feed</h3>
              <div className="space-y-3">
                
                {/* Activity Item */}
                <div className="flex items-center gap-3 bg-white p-3 rounded-xl border border-gray-200 shadow-sm hover:border-green-300 transition-colors">
                   <div className="w-10 h-10 rounded-full bg-[#f0fdf4] text-[#15803d] flex items-center justify-center shrink-0 border border-green-100">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                   </div>
                   <div className="flex-1">
                      <h4 className="font-bold text-base text-black">Lead captured</h4>
                      <p className="text-[#15803d] font-medium text-xs">Added to list</p>
                   </div>
                   <div className="text-right">
                      <p className="font-bold text-sm text-black">Sophia O.</p>
                      <p className="text-xs text-gray-500">Just now</p>
                   </div>
                </div>

                {/* Activity Item */}
                <div className="flex items-center gap-3 bg-white p-3 rounded-xl border border-gray-200 shadow-sm hover:border-yellow-300 transition-colors">
                   <div className="w-10 h-10 rounded-full bg-yellow-50 text-yellow-600 flex items-center justify-center shrink-0 border border-yellow-100">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                   </div>
                   <div className="flex-1">
                      <h4 className="font-bold text-base text-black">Follow-up scheduled</h4>
                      <p className="text-yellow-600 font-medium text-xs">In 24 hours</p>
                   </div>
                   <div className="text-right">
                      <p className="font-bold text-sm text-black">Mike F.</p>
                      <p className="text-xs text-gray-500">2m ago</p>
                   </div>
                </div>

                {/* Activity Item */}
                <div className="flex items-center gap-3 bg-white p-3 rounded-xl border border-gray-200 shadow-sm hover:border-green-300 transition-colors">
                   <div className="w-10 h-10 rounded-full bg-[#f0fdf4] text-[#15803d] flex items-center justify-center shrink-0 border border-green-100">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" /></svg>
                   </div>
                   <div className="flex-1">
                      <h4 className="font-bold text-base text-black">Opportunity saved</h4>
                      <p className="text-[#15803d] font-medium text-xs">Ready to close</p>
                   </div>
                   <div className="text-right">
                      <p className="font-bold text-sm text-black">Alex J.</p>
                      <p className="text-xs text-gray-500">5m ago</p>
                   </div>
                </div>

              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 shadow-lg p-6 relative overflow-hidden">
               <h3 className="font-extrabold text-xl mb-2 text-black">The TractionFlo way</h3>
               <p className="text-gray-500 text-sm font-medium mb-5">Launch in minutes. Focus on growth, not workflows.</p>
               
               <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 shadow-sm mb-5 flex items-center justify-between group cursor-pointer hover:border-[#d4ff00] transition-colors">
                 <p className="font-bold text-sm text-black">"Send my guide when someone comments GUIDE"</p>
                 <div className="w-8 h-8 bg-white border border-gray-200 rounded-full flex items-center justify-center text-[#15803d] group-hover:bg-[#d4ff00] group-hover:text-black transition-colors">
                    <svg className="w-4 h-4 -rotate-45 ml-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                 </div>
               </div>

               <ul className="space-y-3 mb-6 text-black">
                 <li className="flex items-center gap-2 font-bold text-sm">
                   <svg className="w-5 h-5 text-[#15803d] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                   Replies ready
                 </li>
                 <li className="flex items-center gap-2 font-bold text-sm">
                   <svg className="w-5 h-5 text-[#15803d] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                   Follow-up ready
                 </li>
                 <li className="flex items-center gap-2 font-bold text-sm">
                   <svg className="w-5 h-5 text-[#15803d] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                   Lead capture ready
                 </li>
               </ul>

               <div className="inline-flex items-center gap-1.5 bg-[#d4ff00] text-black px-4 py-2 rounded-lg font-bold border border-[#b8e600] shadow-sm text-sm">
                 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                 Time: Minutes
               </div>
            </div>

          </div>
          
        </div>
      </main>
    </div>
  );
}
