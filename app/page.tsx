import { LoginForm } from "@/components/login-form"

export default function HomePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Ajeita ai</h1>
          <p className="text-gray-600 dark:text-gray-400">Gerencie suas finanças pessoais de forma inteligente</p>
        </div>
        <LoginForm />
      </div>
    </div>
  )
}
