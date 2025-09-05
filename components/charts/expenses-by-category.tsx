"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts"

interface ExpensesByCategoryProps {
  period: string;
  data: { category: string; amount: number; color: string }[]; // Novo prop para os dados com cor
}

const COLORS = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6", "#8b5cf6", "#6b7280", "#14b8a6", "#a855f7", "#ec4899"]; // Remover se não for mais usado

export function ExpensesByCategory({ period, data }: ExpensesByCategoryProps) {
  // Mock data - will be replaced with real data based on period
  // const data = [
  //   { name: "Alimentação", value: 1200, color: "#ef4444" },
  //   { name: "Transporte", value: 800, color: "#f97316" },
  //   { name: "Entretenimento", value: 450, color: "#eab308" },
  //   { name: "Saúde", value: 320, color: "#22c55e" },
  //   { name: "Compras", value: 280, color: "#3b82f6" },
  //   { name: "Contas", value: 650, color: "#8b5cf6" },
  //   { name: "Outros", value: 180, color: "#6b7280" },
  // ]

  const chartData = data.map((item) => ({
    name: item.category,
    value: item.amount,
    color: item.color, // Atribui a cor diretamente dos dados
  }));

  const total = chartData.reduce((sum, item) => sum + item.value, 0)

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length && total > 0) {
      const data = payload[0]
      const percentage = ((data.value / total) * 100).toFixed(1)
      return (
        <div className="bg-white dark:bg-gray-800 p-3 border rounded-lg shadow-lg">
          <p className="font-medium">{data.name}</p>
          <p className="text-sm text-muted-foreground">
            R$ {data.value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} ({percentage}%)
          </p>
        </div>
      )
    }
    return null
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gastos por Categoria</CardTitle>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <div className="h-80 flex items-center justify-center text-muted-foreground">
            Nenhum dado de gastos por categoria disponível para o período selecionado.
          </div>
        ) : (
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={chartData} cx="50%" cy="50%" innerRadius={60} outerRadius={120} paddingAngle={2} dataKey="value">
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  verticalAlign="bottom"
                  height={36}
                  formatter={(value, entry: any) => <span style={{ color: entry.payload.color }}>{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {chartData.length > 0 && (
          <div className="mt-4 space-y-2">
            {chartData.map((item) => (
              <div key={item.name} className="flex items-center justify-between text-sm">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                  <span>{item.name}</span>
                </div>
                <span className="font-medium">
                  R$ {item.value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} ({((item.value / total) * 100).toFixed(1)}%)
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
