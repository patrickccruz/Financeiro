"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { DashboardLayout } from "@/components/dashboard-layout"
import { PaymentMethodsSettings } from "@/components/payment-methods-settings"
import { ProfileSettings } from "@/components/profile-settings"
import { NotificationSettings } from "@/components/notification-settings"
import { CategorySettings } from "@/components/category-settings"
import { BankAccountSettings } from "@/components/bank-account-settings"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function SettingsPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const token = localStorage.getItem("token")
    if (token) {
      setIsAuthenticated(true)
    } else {
      router.push("/")
    }
    setIsLoading(false)
  }, [router])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Carregando...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Configurações</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">Gerencie suas preferências e métodos de pagamento</p>
        </div>

        <Tabs defaultValue="payment-methods" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5"> {/* Aumentado para 5 colunas */}
            <TabsTrigger value="payment-methods">Métodos de Pagamento</TabsTrigger>
            <TabsTrigger value="bank-accounts">Contas Bancárias</TabsTrigger> {/* Nova aba */}
            <TabsTrigger value="profile">Perfil</TabsTrigger>
            <TabsTrigger value="categories">Categorias</TabsTrigger>
            <TabsTrigger value="notifications">Notificações</TabsTrigger>
          </TabsList>

          <TabsContent value="payment-methods" className="p-6">
            <PaymentMethodsSettings />
          </TabsContent>

          <TabsContent value="bank-accounts" className="p-6"> {/* Novo conteúdo da aba */}
            <BankAccountSettings />
          </TabsContent>

          <TabsContent value="profile" className="p-6">
            <ProfileSettings />
          </TabsContent>

          <TabsContent value="categories" className="p-6">
            <CategorySettings />
          </TabsContent>

          <TabsContent value="notifications" className="p-6">
            <NotificationSettings />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  )
}
