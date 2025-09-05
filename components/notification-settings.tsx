"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"

export function NotificationSettings() {
  const [notifications, setNotifications] = useState({
    emailTransactions: true,
    emailReports: true,
    pushTransactions: false,
    pushBudgetAlerts: true,
    smsAlerts: false,
  })

  const handleSave = () => {
    // Mock save - will be replaced with real API call
    console.log("Saving notifications:", notifications)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Preferências de Notificação</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Email</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="email-transactions">Notificações de Transações</Label>
                <p className="text-sm text-muted-foreground">Receba emails quando novas transações forem adicionadas</p>
              </div>
              <Switch
                id="email-transactions"
                checked={notifications.emailTransactions}
                onCheckedChange={(checked) => setNotifications({ ...notifications, emailTransactions: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="email-reports">Relatórios Mensais</Label>
                <p className="text-sm text-muted-foreground">Receba um resumo mensal das suas finanças</p>
              </div>
              <Switch
                id="email-reports"
                checked={notifications.emailReports}
                onCheckedChange={(checked) => setNotifications({ ...notifications, emailReports: checked })}
              />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-medium">Push Notifications</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="push-transactions">Transações</Label>
                <p className="text-sm text-muted-foreground">Notificações push para novas transações</p>
              </div>
              <Switch
                id="push-transactions"
                checked={notifications.pushTransactions}
                onCheckedChange={(checked) => setNotifications({ ...notifications, pushTransactions: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="push-budget">Alertas de Orçamento</Label>
                <p className="text-sm text-muted-foreground">Alertas quando você exceder limites de gastos</p>
              </div>
              <Switch
                id="push-budget"
                checked={notifications.pushBudgetAlerts}
                onCheckedChange={(checked) => setNotifications({ ...notifications, pushBudgetAlerts: checked })}
              />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-medium">SMS</h3>
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="sms-alerts">Alertas Críticos</Label>
              <p className="text-sm text-muted-foreground">SMS para alertas importantes de segurança</p>
            </div>
            <Switch
              id="sms-alerts"
              checked={notifications.smsAlerts}
              onCheckedChange={(checked) => setNotifications({ ...notifications, smsAlerts: checked })}
            />
          </div>
        </div>

        <Button onClick={handleSave}>Salvar Preferências</Button>
      </CardContent>
    </Card>
  )
}
