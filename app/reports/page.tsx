"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { DashboardLayout } from "@/components/dashboard-layout"
import { ExpensesByCategory } from "@/components/charts/expenses-by-category"
import { MonthlyTrends } from "@/components/charts/monthly-trends"
import { PaymentMethodsChart } from "@/components/charts/payment-methods-chart"
import { BudgetOverview } from "@/components/charts/budget-overview"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CalendarDays, TrendingUp, PieChart, CreditCard } from "lucide-react"

interface ReportSummaryData {
  totalTransactions: number;
  highestExpense: { amount: number; description: string; category_name: string } | null;
  dominantCategory: { name: string; percentage: number } | null;
  preferredPaymentMethod: string | null;
}

interface ExpensesByCategoryData {
  category: string;
  amount: number;
}

interface MonthlyTrendsData {
  month: string;
  income: number;
  expense: number;
}

interface PaymentMethodsChartData {
  method: string;
  count: number;
}

interface BudgetOverviewData {
  initialBalance: number;
  totalIncome: number;
  totalExpense: number;
  budgetAmount: number;
}

export default function ReportsPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [dataError, setDataError] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState("last-30-days")
  const [reportSummary, setReportSummary] = useState<ReportSummaryData | null>(null);
  const [expensesByCategory, setExpensesByCategory] = useState<ExpensesByCategoryData[]>([]);
  const [monthlyTrends, setMonthlyTrends] = useState<MonthlyTrendsData[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodsChartData[]>([]);
  const [budgetOverview, setBudgetOverview] = useState<BudgetOverviewData | null>(null);
  const router = useRouter()

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/");
      setIsLoading(false);
      return;
    }

    setIsAuthenticated(true);

    const fetchReportData = async () => {
      try {
        // Fetch Report Summary
        const summaryResponse = await fetch(`http://localhost:5000/api/reports/summary?period=${selectedPeriod}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!summaryResponse.ok) throw new Error("Falha ao buscar resumo de relatórios");
        const summaryData: ReportSummaryData = await summaryResponse.json();
        setReportSummary(summaryData);

        // Fetch Expenses By Category
        const expensesByCategoryResponse = await fetch(`http://localhost:5000/api/reports/expenses-by-category?period=${selectedPeriod}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!expensesByCategoryResponse.ok) throw new Error("Falha ao buscar despesas por categoria");
        const expensesByCategoryData: ExpensesByCategoryData[] = await expensesByCategoryResponse.json();
        setExpensesByCategory(expensesByCategoryData);

        // Fetch Monthly Trends
        const monthlyTrendsResponse = await fetch(`http://localhost:5000/api/reports/monthly-trends?period=${selectedPeriod}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!monthlyTrendsResponse.ok) throw new Error("Falha ao buscar tendências mensais");
        const monthlyTrendsData: MonthlyTrendsData[] = await monthlyTrendsResponse.json();
        setMonthlyTrends(monthlyTrendsData);

        // Fetch Payment Methods Chart Data
        const paymentMethodsResponse = await fetch(`http://localhost:5000/api/reports/payment-methods?period=${selectedPeriod}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!paymentMethodsResponse.ok) throw new Error("Falha ao buscar métodos de pagamento");
        const paymentMethodsData: PaymentMethodsChartData[] = await paymentMethodsResponse.json();
        setPaymentMethods(paymentMethodsData);

        // Fetch Budget Overview Data
        const budgetOverviewResponse = await fetch(`http://localhost:5000/api/reports/budget-overview?period=${selectedPeriod}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!budgetOverviewResponse.ok) throw new Error("Falha ao buscar visão geral do orçamento");
        const budgetOverviewData: BudgetOverviewData = await budgetOverviewResponse.json();
        setBudgetOverview(budgetOverviewData);

      } catch (err) {
        console.error("Erro ao carregar dados do relatório:", err);
        setDataError((err as Error).message || "Erro ao carregar dados do relatório.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchReportData();
  }, [router, selectedPeriod]);

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

  if (dataError) {
    return <p className="text-red-500">Erro: {dataError}</p>;
  }

  if (!isAuthenticated) {
    return null
  }

  if (!reportSummary || !expensesByCategory || !monthlyTrends || !paymentMethods || !budgetOverview) {
    return <p>Nenhum dado de relatório disponível.</p>;
  }

  // Cálculo da porcentagem para Categoria Dominante (assumindo total de gastos do resumo)
  const totalExpensesSummary = reportSummary.highestExpense ? reportSummary.highestExpense.amount : 0;
  const dominantCategoryPercentage = reportSummary.dominantCategory && totalExpensesSummary > 0
    ? ((reportSummary.dominantCategory.percentage / totalExpensesSummary) * 100).toFixed(2)
    : "0.00";

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Relatórios Financeiros</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">Análise detalhada das suas finanças pessoais</p>
          </div>
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="last-7-days">Últimos 7 dias</SelectItem>
              <SelectItem value="last-30-days">Últimos 30 dias</SelectItem>
              <SelectItem value="last-3-months">Últimos 3 meses</SelectItem>
              <SelectItem value="last-6-months">Últimos 6 meses</SelectItem>
              <SelectItem value="last-year">Último ano</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Transações</CardTitle>
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{reportSummary?.totalTransactions || 0}</div>
              <p className="text-xs text-muted-foreground"></p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Maior Gasto</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                R$ {reportSummary?.highestExpense?.amount?.toLocaleString("pt-BR", { minimumFractionDigits: 2 }) || "0,00"}
              </div>
              <p className="text-xs text-muted-foreground">{reportSummary?.highestExpense?.description || "N/A"} - {reportSummary?.highestExpense?.category_name || "N/A"}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Categoria Dominante</CardTitle>
              <PieChart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{reportSummary?.dominantCategory?.name || "N/A"}</div>
              <p className="text-xs text-muted-foreground">{dominantCategoryPercentage}% dos gastos totais</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Método Preferido</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">{reportSummary?.preferredPaymentMethod || "N/A"}</div>
              <p className="text-xs text-muted-foreground"></p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Grid */}
        <div className="grid gap-6 md:grid-cols-2">
          <ExpensesByCategory period={selectedPeriod} data={expensesByCategory} />
          <PaymentMethodsChart period={selectedPeriod} data={paymentMethods} />
        </div>

        <MonthlyTrends period={selectedPeriod} data={monthlyTrends} />
        <BudgetOverview period={selectedPeriod} data={budgetOverview} />
      </div>
    </DashboardLayout>
  )
}
