export default function ForbiddenPage() {
  return (
    <div className="h-screen overflow-y-auto scroll-smooth flex items-center justify-center bg-[#0B0F19] px-4">
      <div className="max-w-lg w-full text-center space-y-4">
        <h1 className="text-4xl font-bold text-[#6366F1]">403 - Forbidden</h1>
        <p className="text-slate-300">
          You do not have permission to access this page. Please contact an administrator if you believe this is an error.
        </p>
        <a
          href="/dashboard"
          className="inline-flex items-center justify-center px-4 py-2 rounded-md bg-[#4F46E5] text-white hover:bg-[#4338CA]"
        >
          Go to Dashboard
        </a>
      </div>
    </div>
  )
}
