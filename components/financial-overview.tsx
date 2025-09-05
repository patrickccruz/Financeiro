import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, TrendingDown, DollarSign, CreditCard } from "lucide-react"
import { useEffect, useState } from "react"

interface FinancialData {
  totalBalance: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  creditCardDebt: number;
  totalCreditLimit: number; // Novo campo
  availableCredit: number; // Novo campo
  totalInitialBalance: number; // Novo campo
  totalCurrentBalance: number; // Novo campo
}

interface FinancialOverviewProps {
  financialData: FinancialData;
}

export function FinancialOverview({ financialData }: FinancialOverviewProps) {
  const balanceChange = financialData.monthlyIncome - financialData.monthlyExpenses;
  const isPositive = balanceChange > 0;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Saldo Total</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">
            R$ {financialData.totalBalance.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          </div>
          <p className="text-xs text-muted-foreground">Saldo atual em todas as contas</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Receita Mensal</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-blue-600">
            R$ {financialData.monthlyIncome.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          </div>
          <p className="text-xs text-muted-foreground">Total de entradas este mês</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Gastos Mensais</CardTitle>
          <TrendingDown className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-600">
            R$ {financialData.monthlyExpenses.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          </div>
          <p className="text-xs text-muted-foreground">Total de gastos este mês</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Dívida Cartão de Crédito</CardTitle>
          <CreditCard className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-orange-600">
            R$ {financialData.creditCardDebt.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          </div>
          <p className="text-xs text-muted-foreground">Fatura atual do cartão</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Limite Total de Crédito</CardTitle>
          <CreditCard className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            R$ {(financialData.totalCreditLimit || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          </div>
          <p className="text-xs text-muted-foreground">Soma dos limites dos seus cartões</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Crédito Disponível</CardTitle>
          <CreditCard className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-blue-600">
            R$ {(financialData.availableCredit || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          </div>
          <p className="text-xs text-muted-foreground">Disponível para gastos no crédito</p>
        </CardContent>
      </Card>

      {/* Novo Card para Saldo de Contas Bancárias */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Saldo em Contas Bancárias</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">
            R$ {(financialData.totalCurrentBalance || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          </div>
          <p className="text-xs text-muted-foreground">Total em suas contas bancárias</p>
        </CardContent>
      </Card>
    </div>
  );
}
