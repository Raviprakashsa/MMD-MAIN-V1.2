"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { signIn } from "next-auth/react"
import NeuroBackground from "@/components/layout/NeuroBackground"

export default function LoginPage() {
  const router = useRouter()
  const showTestAccounts = process.env.NEXT_PUBLIC_SHOW_TEST_ACCOUNTS === "true"
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (loading) return

    setError("")
    setLoading(true)

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      })

      if (result?.error) {
        setError("Invalid email or password")
        return
      }

      if (result?.ok) {
        router.replace("/dashboard")
        router.refresh()
        return
      }

      setError("Unable to sign in. Please try again.")
    } catch (error) {
      console.error('Login error:', error)
      setError("An unexpected error occurred")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#050710] px-4 relative overflow-y-auto scroll-smooth">
      {/* Three.js Neural Background - Full screen dramatic effect */}
      <div className="absolute inset-0 z-0">
        <NeuroBackground variant="aurora" intensity={1.2} />
      </div>

      {/* Overlay gradient for depth */}
      <div className="absolute inset-0 z-[1] bg-[radial-gradient(circle_at_50%_30%,rgba(23,0,174,0.25),transparent_50%),radial-gradient(circle_at_80%_80%,rgba(0,27,255,0.15),transparent_40%)]" />

      {/* Premium card container */}
      <div className="relative z-10 w-full max-w-md animate-in zoom-in-95 fade-in duration-500">
        <div className="bg-white/95 backdrop-blur-2xl rounded-3xl p-8 space-y-6 shadow-[0_0_0_1px_rgba(255,255,255,0.1),0_25px_50px_-12px_rgba(0,0,0,0.6),0_50px_100px_-24px_rgba(23,0,174,0.4)] border border-white/20">
          {/* Logo section */}
          <div className="text-center space-y-3">
            <h1 className="text-4xl font-bold tracking-tight font-display">
              <span className="text-slate-900">Magnus</span>
              <span className="bg-gradient-to-r from-brand-700 via-brand-600 to-brand-500 bg-clip-text text-transparent">Copo</span>
            </h1>
            <p className="text-slate-500 text-sm font-medium">
              Enterprise Staffing Operations Platform
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label htmlFor="email" className="block text-sm font-semibold text-slate-700">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition-all placeholder:text-slate-400 shadow-sm"
                placeholder="you@company.com"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="block text-sm font-semibold text-slate-700">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition-all placeholder:text-slate-400 shadow-sm"
                placeholder="Password"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm animate-in fade-in duration-200">
                <svg className="h-4 w-4 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 px-4 bg-gradient-to-r from-[#1700ae] via-[#2a10c0] to-[#001bff] text-white font-semibold rounded-xl shadow-[0_1px_2px_rgba(0,0,0,0.2),0_8px_24px_rgba(23,0,174,0.5),inset_0_1px_0_rgba(255,255,255,0.2)] hover:shadow-[0_2px_4px_rgba(0,0,0,0.2),0_16px_40px_rgba(23,0,174,0.6),inset_0_1px_0_rgba(255,255,255,0.25)] hover:-translate-y-1 active:translate-y-0 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none text-lg tracking-wide"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  <span>Signing in...</span>
                </span>
              ) : (
                "Sign In"
              )}
            </button>
          </form>

          {showTestAccounts && (
            <div className="text-center pt-3 border-t border-slate-100">
              <p className="text-xs text-slate-500 font-medium">
                Test accounts: <span className="px-2 py-1 rounded-md bg-brand-50 text-brand-700 font-semibold">ADMIN</span> / <span className="px-2 py-1 rounded-md bg-brand-50 text-brand-700 font-semibold">COORDINATOR</span> / <span className="px-2 py-1 rounded-md bg-brand-50 text-brand-700 font-semibold">RECRUITER</span>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
