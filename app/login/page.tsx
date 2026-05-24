import { login } from './actions'
import Link from 'next/link'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>
}) {
  const resolvedParams = await searchParams;
  const error = resolvedParams?.error;
  const message = resolvedParams?.message;

  return (
    <div className="min-h-screen flex w-full bg-white font-sans text-black">
      
      {/* Left Marketing Section (Hidden on small screens) */}
      <div className="hidden lg:flex w-[55%] bg-gradient-to-br from-[#f9fafb] via-[#f0fdf4] to-[#e4ff66]/30 flex-col relative overflow-hidden px-14 py-12 border-r border-gray-200/60">
        
        {/* Background decorative circles */}
        <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full border-[40px] border-[#d4ff00]/10 opacity-50 blur-3xl"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[400px] h-[400px] rounded-full border-[30px] border-green-500/5 opacity-50 blur-2xl"></div>

        <div className="relative z-10 flex flex-col h-full">
          {/* Logo */}
          <div className="mb-12">
            <h1 className="text-3xl font-extrabold tracking-tighter text-foreground">
              Traction<span className="text-primary">Flo</span>
            </h1>
          </div>

          <div className="max-w-xl">
            <div className="inline-flex items-center gap-2 bg-white/60 backdrop-blur-sm border border-primary/50 px-3 py-1.5 rounded-full mb-6 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-success"></span>
              <span className="text-[10px] font-bold text-success tracking-wider uppercase">Advanced Instagram Automation</span>
            </div>

            <h2 className="text-5xl font-extrabold leading-[1.1] mb-5 tracking-tight text-foreground">
              Powerful Instagram Automation for Modern <span className="text-primary">Businesses</span>
            </h2>
            <p className="text-gray-600 text-lg mb-12 font-medium max-w-lg leading-relaxed">
              Manage conversations, automate workflows, and grow your business with the most advanced Instagram DM platform.
            </p>

            <div className="space-y-8">
              {/* Feature 1 */}
              <div className="flex gap-4">
                <div className="w-12 h-12 rounded-xl bg-background border border-gray-200 shadow-sm flex items-center justify-center shrink-0 text-success">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground mb-1">Multi-Agent Inbox</h3>
                  <p className="text-foreground-muted text-sm font-medium">Collaborate with your team and manage all conversations in one place.</p>
                </div>
              </div>

              {/* Feature 2 */}
              <div className="flex gap-4">
                <div className="w-12 h-12 rounded-xl bg-background border border-gray-200 shadow-sm flex items-center justify-center shrink-0 text-success">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground mb-1">Smart Automation</h3>
                  <p className="text-foreground-muted text-sm font-medium">Create smart automations and chatbots to engage your followers 24/7.</p>
                </div>
              </div>

              {/* Feature 3 */}
              <div className="flex gap-4">
                <div className="w-12 h-12 rounded-xl bg-background border border-gray-200 shadow-sm flex items-center justify-center shrink-0 text-success">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground mb-1">Advanced Analytics</h3>
                  <p className="text-foreground-muted text-sm font-medium">Track performance, analyze data, and make smarter business decisions.</p>
                </div>
              </div>
            </div>
            
            {/* Decorative Image */}
            <div className="absolute right-[-25%] top-[15%] w-[80%] max-w-[600px] h-auto opacity-90 transform rotate-[-2deg] hover:rotate-0 transition-transform duration-500 hidden xl:block">
              <img 
                src="/IMG_3527.PNG" 
                alt="Platform Preview" 
                className="w-full h-auto rounded-xl shadow-2xl border-4 border-white/50"
              />
            </div>

          </div>
        </div>
      </div>

      {/* Right Auth Section */}
      <div className="w-full lg:w-[45%] flex flex-col relative bg-[#fcfcfc]">
        
        {/* Top bar */}
        

        <div className="flex-1 flex items-center justify-center p-4 sm:p-6">
          <div className="w-full max-w-[480px] bg-white rounded-[1.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 p-6 sm:p-8">
            
            <div className="text-center mb-8">
              <h1 className="text-3xl font-extrabold tracking-tighter text-foreground lg:hidden mb-6">
                Traction<span className="text-primary">Flo</span>
              </h1>
              <h2 className="text-[28px] font-extrabold text-foreground mb-2">Welcome Back!</h2>
              <p className="text-foreground-muted text-sm font-medium">Login to your account and continue to manage your Instagram Automation</p>
            </div>

            <form className="space-y-4">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                </div>
                <input 
                  id="email" 
                  name="email" 
                  type="email" 
                  required 
                  placeholder="Email Address"
                  className="w-full pl-11 pr-4 py-3.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#84a300] focus:border-transparent transition-all font-medium text-sm text-black placeholder:text-gray-400"
                />
              </div>

              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                </div>
                <input 
                  id="password" 
                  name="password" 
                  type="password" 
                  required 
                  placeholder="Password"
                  className="w-full pl-11 pr-12 py-3.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#84a300] focus:border-transparent transition-all font-medium text-sm text-black placeholder:text-gray-400"
                />
                <button type="button" className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                </button>
              </div>

              <div className="flex items-center justify-between pt-1 pb-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="w-4 h-4 rounded border-gray-300 text-success focus:ring-success cursor-pointer" />
                  <span className="text-sm font-semibold text-foreground-muted">Remember Me</span>
                </label>
                <a href="#" className="text-sm font-bold text-success hover:underline">Forgot Password?</a>
              </div>

              {error && (
                <div className="bg-destructive/10 text-destructive p-3 rounded-lg text-sm font-medium border border-destructive/20 mb-2">
                  {error}
                </div>
              )}
              
              {message && (
                <div className="bg-secondary text-success p-3 rounded-lg text-sm font-medium border border-success/20 mb-2">
                  {message}
                </div>
              )}

              <button 
                formAction={login}
                className="w-full bg-primary hover:bg-primary-hover text-black font-bold py-3.5 px-4 rounded-xl transition-all shadow-md flex justify-center items-center gap-2 text-base"
              >
                Login to Dashboard
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
              </button>

              <div className="flex items-center gap-4 py-4">
                <div className="h-px bg-gray-200 flex-1"></div>
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">OR</span>
                <div className="h-px bg-gray-200 flex-1"></div>
              </div>

              <button type="button" className="w-full bg-white border border-gray-200 hover:bg-gray-50 text-black font-bold py-3.5 px-4 rounded-xl transition-all shadow-sm flex justify-center items-center gap-3 text-sm">
                <svg className="w-5 h-5" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/><path d="M1 1h22v22H1z" fill="none"/></svg>
                Login with Google
              </button>
            </form>

            <div className="mt-8 pt-6 border-t border-gray-100 flex flex-col items-center gap-3">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-400">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                Your data is secured with enterprise-grade encryption.
              </div>
              <div className="text-sm font-medium text-gray-500">
                New to TractionFlo?{' '}
                <Link href="/signup" className="text-[#15803d] font-bold hover:underline">
                  Create an Account
                </Link>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}
