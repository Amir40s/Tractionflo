"use client";

import { useState, useEffect } from "react";

export default function Inbox() {
  const [messages, setMessages] = useState<any[]>([]);

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const res = await fetch('/api/messages');
        if (res.ok) {
          const data = await res.json();
          setMessages(data);
        }
      } catch (err) {}
    };

    fetchMessages();
    // Poll every 3 seconds
    const interval = setInterval(fetchMessages, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex h-full w-full bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden text-sm">
      
      {/* Left Panel: Chat List */}
      <div className="w-80 border-r border-gray-200 flex flex-col bg-white shrink-0">
        
        {/* Header */}
        <div className="h-20 px-5 flex items-center justify-between border-b border-gray-100 shrink-0 pt-2">
          <div className="flex items-center gap-2 cursor-pointer">
            <h2 className="text-lg font-bold text-black tracking-tight">mharoon07</h2>
            <svg className="w-4 h-4 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg>
          </div>
          <button className="text-black hover:opacity-70 transition-opacity">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
          </button>
        </div>

        {/* Search */}
        <div className="px-5 py-3 shrink-0">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            </div>
            <input 
              type="text" 
              placeholder="Search" 
              className="w-full pl-9 pr-3 py-2 bg-gray-100 border-none rounded-lg text-black focus:ring-0 focus:outline-none placeholder-gray-500 font-medium text-[13px]"
            />
          </div>
        </div>

        {/* Tabs */}
        <div className="px-5 flex gap-5 border-b border-gray-100 shrink-0 font-bold text-[13px] text-gray-400">
          <button className="pb-3 text-black border-b border-black">Primary</button>
          <button className="pb-3 hover:text-gray-600 transition-colors">General</button>
          <button className="pb-3 hover:text-gray-600 transition-colors">Requests</button>
        </div>

        {/* Chat List */}
        <div className="flex-1 overflow-y-auto">
          {/* Active Chat Item */}
          <div className="flex items-center gap-3 px-5 py-2.5 hover:bg-gray-50 cursor-pointer transition-colors bg-gray-50">
            <div className="w-14 h-14 rounded-full overflow-hidden shrink-0 border border-gray-200">
              <img src="https://i.pravatar.cc/150?img=1" alt="Avatar" className="w-full h-full object-cover" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-black truncate text-[14px]">Sophia O.</h3>
              <p className="text-gray-500 truncate text-[13px]">s s • 2m</p>
            </div>
            <div className="w-2.5 h-2.5 bg-blue-500 rounded-full shrink-0"></div>
          </div>

          {/* Other Chat Items */}
          <div className="flex items-center gap-3 px-5 py-2.5 hover:bg-gray-50 cursor-pointer transition-colors">
            <div className="w-14 h-14 rounded-full overflow-hidden shrink-0 border border-gray-200">
              <img src="https://i.pravatar.cc/150?img=12" alt="Avatar" className="w-full h-full object-cover" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-black truncate text-[14px]">Mike F.</h3>
              <p className="text-gray-500 truncate text-[13px]">Thanks for the guide! • 1h</p>
            </div>
          </div>

          <div className="flex items-center gap-3 px-5 py-2.5 hover:bg-gray-50 cursor-pointer transition-colors">
            <div className="w-14 h-14 rounded-full overflow-hidden shrink-0 border border-gray-200">
              <img src="https://i.pravatar.cc/150?img=33" alt="Avatar" className="w-full h-full object-cover" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-black truncate text-[14px]">Alex J.</h3>
              <p className="text-gray-500 truncate text-[13px]">How much is coaching? • 3h</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel: Active Chat */}
      <div className="flex-1 flex flex-col bg-white">
        
        {/* Chat Header */}
        <div className="h-20 px-6 flex items-center justify-between border-b border-gray-100 shrink-0 pt-2">
          <div className="flex items-center gap-3 cursor-pointer">
            <div className="w-10 h-10 rounded-full overflow-hidden border border-gray-200">
              <img src="https://i.pravatar.cc/150?img=1" alt="Avatar" className="w-full h-full object-cover" />
            </div>
            <div>
              <h3 className="font-bold text-black text-[15px]">Sophia O.</h3>
              <p className="text-gray-500 text-[12px] font-medium">sophia.online</p>
            </div>
          </div>
          <div className="flex items-center gap-5">
            <button className="text-black hover:opacity-70 transition-opacity">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
            </button>
            <button className="text-black hover:opacity-70 transition-opacity">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
            </button>
            <button className="text-black hover:opacity-70 transition-opacity">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </button>
          </div>
        </div>

        {/* Chat History */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 flex flex-col">
          
          <div className="flex justify-center my-4">
            <span className="text-[11px] font-semibold text-gray-400">TODAY</span>
          </div>

          {messages.length === 0 ? (
            <div className="text-center text-gray-400 text-sm mt-10">
              Waiting for new messages from Instagram...
            </div>
          ) : (
            messages.map((msg, index) => (
              <div key={msg.id || index} className="flex flex-col gap-1 w-full">
                {/* Received Bubble */}
                <div className="flex items-end gap-2 self-start max-w-[70%]">
                  <div className="w-7 h-7 rounded-full overflow-hidden shrink-0 border border-gray-200 mb-1">
                    <img src="https://i.pravatar.cc/150?img=1" alt="Avatar" className="w-full h-full object-cover" />
                  </div>
                  <div className="bg-[#efefef] text-black px-4 py-2.5 rounded-2xl rounded-bl-sm font-medium text-[14px]">
                    {msg.text}
                  </div>
                </div>

                {/* Sent Bubble (AI Automation Mock) */}
                <div className="flex items-end gap-2 self-end max-w-[70%] mt-2">
                  <div className="bg-[#0095f6] text-white px-4 py-2.5 rounded-2xl rounded-br-sm font-medium text-[14px]">
                    Hey there! Thanks for your message. This is an automated reply from TractionFlo 🚀
                  </div>
                </div>
                
                <div className="flex justify-end pr-2 -mt-1 mb-3">
                  <span className="text-[11px] font-semibold text-gray-400 flex items-center gap-1">
                     <svg className="w-3 h-3 text-[#d4ff00]" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/></svg>
                     AI Responded
                  </span>
                </div>
              </div>
            ))
          )}

        </div>

        {/* Input Area */}
        <div className="p-5 pt-2 shrink-0">
          <div className="border border-gray-200 rounded-full flex items-center px-4 py-2 bg-white gap-3 focus-within:border-gray-400 transition-colors">
            <button className="text-black hover:opacity-70 transition-opacity">
               <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </button>
            <input 
              type="text" 
              placeholder="Message..." 
              className="flex-1 bg-transparent border-none focus:ring-0 focus:outline-none text-[14px] font-medium text-black placeholder-gray-400"
            />
            <button className="text-black hover:opacity-70 transition-opacity font-semibold text-[14px]">
               Send
            </button>
            <button className="text-black hover:opacity-70 transition-opacity">
               <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            </button>
            <button className="text-black hover:opacity-70 transition-opacity">
               <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
            </button>
          </div>
        </div>

      </div>
      
    </div>
  );
}
