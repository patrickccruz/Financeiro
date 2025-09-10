"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"; // Importar Input
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"; // Importar componentes Select
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useEffect, useCallback } from "react"; // Importar useEffect e useCallback
import { useToast } from "@/components/ui/use-toast"; // Importar useToast

const formSchema = z.object({
  emailTransactions: z.boolean().default(false).optional(),
  emailReports: z.boolean().default(false).optional(),
  pushTransactions: z.boolean().default(false).optional(),
  pushBudgetAlerts: z.boolean().default(false).optional(),
  smsAlerts: z.boolean().default(false).optional(),
  debtAlertValue: z.coerce.number().min(0).default(7),
  debtAlertUnit: z.enum(['day', 'week', 'month']).default('day'),
});

// Placeholder para obter o token de autenticação
const useAuthToken = () => {
  // Em um ambiente real, você obteria isso de um AuthContext, localStorage, etc.
  // Por enquanto, vamos mockar um token ou esperar que o usuário esteja logado no frontend
  return localStorage.getItem('token'); // Exemplo: assuming token is stored in localStorage
};

export function NotificationSettings() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const authToken = useAuthToken();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      emailTransactions: false,
      emailReports: false,
      pushTransactions: false,
      pushBudgetAlerts: false,
      smsAlerts: false,
      debtAlertValue: 0,
      debtAlertUnit: 'day',
    },
  });

  const fetchSettings = useCallback(async () => {
    if (!authToken) {
      setError("Token de autenticação não encontrado.");
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("http://localhost:5000/api/notifications/settings", {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });
      if (!response.ok) {
        throw new Error(`Erro ao carregar configurações: ${response.statusText}`);
      }
      const data = await response.json();
      // Mapear os nomes das propriedades para o formato do formulário
      form.reset({
        emailTransactions: data.email_transactions === 1,
        emailReports: data.email_reports === 1,
        pushTransactions: data.push_transactions === 1,
        pushBudgetAlerts: data.push_budget_alerts === 1,
        smsAlerts: data.sms_alerts === 1,
        debtAlertValue: data.debt_alert_value,
        debtAlertUnit: data.debt_alert_unit || 'day',
      });
    } catch (err) {
      console.error("Erro ao buscar configurações:", err);
      setError(err instanceof Error ? err.message : "Erro desconhecido ao carregar configurações.");
      toast({
        title: "Erro",
        description: "Não foi possível carregar as preferências de notificação.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [authToken, form, toast]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!authToken) {
      setError("Token de autenticação não encontrado.");
      toast({
        title: "Erro",
        description: "Você não está autenticado para salvar as preferências.",
        variant: "destructive",
      });
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      const response = await fetch("http://localhost:5000/api/notifications/settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          emailTransactions: values.emailTransactions,
          emailReports: values.emailReports,
          pushTransactions: values.pushTransactions,
          pushBudgetAlerts: values.pushBudgetAlerts,
          smsAlerts: values.smsAlerts,
          debtAlertValue: values.debtAlertValue,
          debtAlertUnit: values.debtAlertUnit,
        }),
      });

      if (!response.ok) {
        throw new Error(`Erro ao salvar configurações: ${response.statusText}`);
      }
      toast({
        title: "Sucesso",
        description: "Preferências de notificação salvas com sucesso!",
      });
    } catch (err) {
      console.error("Erro ao salvar configurações:", err);
      setError(err instanceof Error ? err.message : "Erro desconhecido ao salvar configurações.");
      toast({
        title: "Erro",
        description: "Não foi possível salvar as preferências de notificação.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  }

  // Removida a função handleSendMonthlyReport (funcionalidade de teste)

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Preferências de Notificação</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <p>Carregando preferências...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Preferências de Notificação</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-red-500">Erro ao carregar: {error}</p>
          <Button onClick={fetchSettings}>Tentar Novamente</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Preferências de Notificação</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Email</h3>
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="emailTransactions"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Notificações de Transações</FormLabel>
                        <FormDescription>
                          Receba emails quando novas transações forem adicionadas
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          disabled={isSaving} // Desabilitar durante o salvamento
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="emailReports"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Relatórios Mensais</FormLabel>
                        <FormDescription>
                          Receba um resumo mensal das suas finanças
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          disabled={isSaving}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-medium">Push Notifications</h3>
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="pushTransactions"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Transações</FormLabel>
                        <FormDescription>
                          Notificações push para novas transações
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          disabled={isSaving}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="pushBudgetAlerts"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Alertas de Orçamento</FormLabel>
                        <FormDescription>
                          Alertas quando você exceder limites de gastos
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          disabled={isSaving}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-medium">SMS</h3>
              <FormField
                control={form.control}
                name="smsAlerts"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Alertas Críticos</FormLabel>
                      <FormDescription>
                        SMS para alertas importantes de segurança
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={isSaving}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-medium">Alertas de Dívidas a Vencer</h3>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <FormField
                  control={form.control}
                  name="debtAlertValue"
                  render={({ field }) => (
                    <FormItem>
                      <div className="space-y-0.5">
                        <FormLabel htmlFor="debt-alert-value" className="text-base">Receber alerta antes da dívida vencer</FormLabel>
                        <FormDescription>
                          Defina quantos dias, semanas ou meses antes do vencimento você deseja ser notificado.
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Input
                          id="debt-alert-value"
                          type="number"
                          placeholder="7"
                          {...field}
                          onChange={e => field.onChange(parseInt(e.target.value))}
                          className="w-20"
                          disabled={isSaving} // Desabilitar durante o salvamento
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="debtAlertUnit"
                  render={({ field }) => (
                    <FormItem>
                      <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isSaving}> {/* Desabilitar durante o salvamento */}
                        <FormControl>
                          <SelectTrigger className="w-[100px]">
                            <SelectValue placeholder="Unidade" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="day">Dia(s)</SelectItem>
                          <SelectItem value="week">Semana(s)</SelectItem>
                          <SelectItem value="month">Mês(es)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="mt-8">
              <Button type="submit" className="w-full" disabled={isSaving}>
                {isSaving ? "Salvando..." : "Salvar Preferências"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
