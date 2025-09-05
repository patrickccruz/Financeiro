"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts"

interface MonthlyTrendsProps {
  period: string;
  data: { month: string; income: number; expense: number }[]; // Novo prop para os dados
}

export function MonthlyTrends({ period, data }: MonthlyTrendsProps) {
  // Mock data - will be replaced with real data based on period
  // const data = [
  //   { month: "Set", receitas: 3200, gastos: 2800, saldo: 400 },
  //   { month: "Out", receitas: 3400, gastos: 2950, saldo: 450 },
  //   { month: "Nov", receitas: 3100, gastos: 3200, saldo: -100 },
  //   { month: "Dez", receitas: 4200, gastos: 3800, saldo: 400 },
  //   { month: "Jan", receitas: 3200, gastos: 2900, saldo: 300 },
  //   { month: "Fev", receitas: 3300, gastos: 2750, saldo: 550 },
  // ]

  const formatMonth = (monthString: string) => {
    const [year, month] = monthString.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, 1);
    return date.toLocaleString('pt-BR', { month: 'short' });
  };

  const chartData = data.map(item => ({
    month: formatMonth(item.month),
    receitas: item.income,
    gastos: item.expense,
    saldo: item.income - item.expense,
  }));

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-gray-800 p-3 border rounded-lg shadow-lg">
          <p className="font-medium mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: R$ {entry.value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tendências Mensais</CardTitle>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <div className="h-80 flex items-center justify-center text-muted-foreground">
            Nenhum dado de tendências mensais disponível para o período selecionado.
          </div>
        ) : (
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" className="text-muted-foreground" />
                <YAxis className="text-muted-foreground" />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="receitas"
                  stroke="#22c55e"
                  strokeWidth={3}
                  name="Receitas"
                  dot={{ fill: "#22c55e", strokeWidth: 2, r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="gastos"
                  stroke="#ef4444"
                  strokeWidth={3}
                  name="Gastos"
                  dot={{ fill: "#ef4444", strokeWidth: 2, r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="saldo"
                  stroke="#3b82f6"
                  strokeWidth={3}
                  name="Saldo"
                  dot={{ fill: "#3b82f6", strokeWidth: 2, r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
