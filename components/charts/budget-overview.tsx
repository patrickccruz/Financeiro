"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, CheckCircle, Clock } from "lucide-react"

interface BudgetOverviewProps {
  period: string;
  data: { initialBalance: number; totalIncome: number; totalExpense: number; budgetAmount: number } | null; // Novo prop para os dados
}

export function BudgetOverview({ period, data }: BudgetOverviewProps) {
  // Mock data - will be replaced with real data based on period
  // const budgets = [
  //   {
  //     category: "Alimentação",
  //     budget: 1500,
  //     spent: 1200,
  //     percentage: 80,
  //     status: "good" as const,
  //   },
  //   {
  //     category: "Transporte",
  //     budget: 600,
  //     spent: 800,
  //     percentage: 133,
  //     status: "over" as const,
  //   },
  //   {
  //     category: "Entretenimento",
  //     budget: 500,
  //     spent: 450,
  //     percentage: 90,
  //     status: "warning" as const,
  //   },
  //   {
  //     category: "Saúde",
  //     budget: 400,
  //     spent: 320,
  //     percentage: 80,
  //     status: "good" as const,
  //   },
  //   {
  //     category: "Compras",
  //     budget: 300,
  //     spent: 280,
  //     percentage: 93,
  //     status: "warning" as const,
  //   },
  // ]

  if (!data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Visão Geral do Orçamento</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-40 flex items-center justify-center text-muted-foreground">
            Nenhum dado de orçamento disponível para o período selecionado.
          </div>
        </CardContent>
      </Card>
    );
  }

  const { initialBalance, totalIncome, totalExpense, budgetAmount } = data;
  const actualBalance = initialBalance + totalIncome - totalExpense;
  const budgetProgress = (totalExpense / budgetAmount) * 100;

  let budgetStatus: "good" | "warning" | "over";
  if (totalExpense > budgetAmount) {
    budgetStatus = "over";
  } else if (budgetProgress > 80) {
    budgetStatus = "warning";
  } else {
    budgetStatus = "good";
  }

  const getStatusIcon = (status: "good" | "warning" | "over") => {
    switch (status) {
      case "good":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "warning":
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case "over":
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      default:
        return null;
    }
  };

  const getProgressColor = (status: "good" | "warning" | "over") => {
    switch (status) {
      case "good":
        return "bg-green-500";
      case "warning":
        return "bg-yellow-500";
      case "over":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Visão Geral do Orçamento</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between text-sm">
            <span>Saldo Inicial:</span>
            <span className="font-medium">R$ {initialBalance.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span>Total de Receitas:</span>
            <span className="font-medium text-green-600">+ R$ {totalIncome.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span>Total de Despesas:</span>
            <span className="font-medium text-red-600">- R$ {totalExpense.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
          </div>
          <div className="border-t pt-4 mt-4 flex items-center justify-between text-base font-semibold">
            <span>Saldo Atual:</span>
            <span className={`${actualBalance >= 0 ? "text-green-600" : "text-red-600"}`}>
              R$ {actualBalance.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </span>
          </div>

          <div className="mt-6 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="font-medium">Orçamento Total</span>
                {getStatusIcon(budgetStatus)}
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-muted-foreground">
                  R$ {totalExpense.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} / R$ {budgetAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </span>
                <Badge variant={budgetStatus === "over" ? "destructive" : "secondary"}>
                  {budgetProgress.toFixed(1)}%
                </Badge>
              </div>
            </div>
            <div className="space-y-1">
              <Progress value={Math.min(budgetProgress, 100)} className={`h-2 ${getProgressColor(budgetStatus)}`} />
              {budgetStatus === "over" && (
                <div className="text-xs text-red-600 font-medium">
                  Excedeu o orçamento em R$ {(totalExpense - budgetAmount).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
