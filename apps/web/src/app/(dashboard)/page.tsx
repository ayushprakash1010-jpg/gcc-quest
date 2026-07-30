export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Stat Cards */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 shadow-sm">
          <h3 className="text-sm font-medium text-gray-400">
            Total Articles Discovered
          </h3>
          <p className="mt-2 text-3xl font-bold text-white">0</p>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 shadow-sm">
          <h3 className="text-sm font-medium text-gray-400">Pending Drafts</h3>
          <p className="mt-2 text-3xl font-bold text-white">0</p>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 shadow-sm">
          <h3 className="text-sm font-medium text-gray-400">Published Posts</h3>
          <p className="mt-2 text-3xl font-bold text-white">0</p>
        </div>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 flex flex-col items-center justify-center min-h-[400px] text-center">
        <div className="w-16 h-16 bg-blue-500/20 text-blue-400 rounded-full flex items-center justify-center mb-4">
          <svg
            className="w-8 h-8"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 10V3L4 14h7v7l9-11h-7z"
            />
          </svg>
        </div>
        <h2 className="text-xl font-bold mb-2">Welcome to GCC Quest AI</h2>
        <p className="text-gray-400 max-w-md">
          The content intelligence platform is ready. In upcoming sprints we
          will integrate the discovery pipeline, intelligence engine, and
          content generation.
        </p>
      </div>
    </div>
  );
}
