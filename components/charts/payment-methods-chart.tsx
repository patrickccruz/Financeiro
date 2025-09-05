"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"

interface PaymentMethodsChartProps {
  period: string;
  data: { method: string; count: number }[]; // Novo prop para os dados
}

export function PaymentMethodsChart({ period, data }: PaymentMethodsChartProps) {
  // Mock data - will be replaced with real data based on period
  // const data = [
  //   { method: "Crédito", transactions: 45, amount: 2800 },
  //   { method: "Débito", transactions: 28, amount: 1200 },
  //   { method: "PIX", transactions: 15, amount: 650 },
  //   { method: "Dinheiro", transactions: 8, amount: 320 },
  // ]

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-gray-800 p-3 border rounded-lg shadow-lg">
          <p className="font-medium mb-2">{label}</p>
          <p className="text-sm text-blue-600">Transações: {payload[0]?.value}</p>
          {/* <p className="text-sm text-green-600">Valor: R$ {payload[1]?.value.toLocaleString("pt-BR")}</p> */}
        </div>
      )
    }
    return null
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Uso por Método de Pagamento</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="h-80 flex items-center justify-center text-muted-foreground">
            Nenhum dado de métodos de pagamento disponível para o período selecionado.
          </div>
        ) : (
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="method" className="text-muted-foreground" />
                <YAxis className="text-muted-foreground" /> {/* Removido yAxisId="left" */}
                {/* <YAxis yAxisId="right" orientation="right" className="text-muted-foreground" /> */}
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" fill="#3b82f6" name="Transações" /> {/* Alterado dataKey e removido yAxisId */}
                {/* <Bar yAxisId="right" dataKey="amount" fill="#22c55e" name="Valor (R$)" /> */}
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
