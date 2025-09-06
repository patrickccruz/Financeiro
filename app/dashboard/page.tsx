"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { DashboardLayout } from "@/components/dashboard-layout"
import { FinancialOverview } from "@/components/financial-overview"
import { RecentTransactions } from "@/components/recent-transactions"
import { QuickActions } from "@/components/quick-actions"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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

interface Transaction {
  id: number;
  description: string;
  amount: string;
  type: "income" | "expense";
  payment_method: "credit" | "debit" | "cash" | "pix";
  category_name: string;
  date: string;
  is_generated_recurring?: boolean; // Adicionado para identificar transações recorrentes geradas
}

export default function DashboardPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [financialData, setFinancialData] = useState<FinancialData | null>(null);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [dataError, setDataError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0) // Estado para forçar a atualização
  const [filterPeriod, setFilterPeriod] = useState<"last_30_days" | "this_month" | "next_30_days" | "all_transactions">("last_30_days");
  const [startDate, setStartDate] = useState<string | null>(null);
  const [endDate, setEndDate] = useState<string | null>(null);
  const router = useRouter()

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/");
      setIsLoading(false);
      return;
    }

    setIsAuthenticated(true);

    const calculateDateRange = (period: typeof filterPeriod) => {
      const today = new Date();
      let start: Date | null = null;
      let end: Date | null = null;

      switch (period) {
        case "last_30_days":
          start = new Date(today);
          start.setDate(today.getDate() - 30);
          end = today;
          break;
        case "this_month":
          start = new Date(today.getFullYear(), today.getMonth(), 1);
          end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
          break;
        case "next_30_days":
          start = today;
          end = new Date(today);
          end.setDate(today.getDate() + 30);
          break;
        case "all_transactions":
          // Sem filtros de data para mostrar tudo
          break;
      }
      return { startDate: start ? start.toISOString().split('T')[0] : null, endDate: end ? end.toISOString().split('T')[0] : null };
    };

    const fetchDashboardData = async () => {
      const { startDate: calculatedStartDate, endDate: calculatedEndDate } = calculateDateRange(filterPeriod);
      setStartDate(calculatedStartDate);
      setEndDate(calculatedEndDate);

      let transactionsApiUrl = "http://localhost:5000/api/transactions";
      const queryParams = [];
      if (calculatedStartDate) {
        queryParams.push(`startDate=${calculatedStartDate}`);
      }
      if (calculatedEndDate) {
        queryParams.push(`endDate=${calculatedEndDate}`);
      }
      if (queryParams.length > 0) {
        transactionsApiUrl += `?${queryParams.join('&')}`;
      }

      try {
        // Fetch Financial Overview
        const financialResponse = await fetch("http://localhost:5000/api/financial-overview", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (!financialResponse.ok) {
          throw new Error("Falha ao buscar visão geral financeira");
        }
        const financialData = await financialResponse.json();
        setFinancialData(financialData);
        console.log({ financialData }); // Adicionado para depuração

        // Fetch Recent Transactions
        const transactionsResponse = await fetch(transactionsApiUrl, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (!transactionsResponse.ok) {
          throw new Error("Falha ao buscar transações recentes");
        }
        const transactionsData = await transactionsResponse.json();
        setRecentTransactions(transactionsData);

      } catch (err) {
        console.error("Erro ao carregar dados do dashboard:", err);
        setDataError((err as Error).message || "Erro ao carregar dados do dashboard.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, [router, refreshKey, filterPeriod]); // Adicionado refreshKey e filterPeriod como dependências

  const onFinancialDataUpdated = () => { // Renomeado de handleTransactionSaved
    console.log("onFinancialDataUpdated chamado, incrementando refreshKey");
    setRefreshKey(prevKey => prevKey + 1)
  }

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
    console.error("Erro no DashboardPage:", dataError);
    return <p className="text-red-500">Erro: {dataError}</p>;
  }

  if (!isAuthenticated) {
    console.log("Não autenticado, retornando null");
    return null
  }
  if (!financialData || !recentTransactions) {
    console.log("Dados financeiros ou transações recentes não disponíveis, retornando placeholder");
    return <p>Nenhum dado disponível.</p>;
  }

  console.log("DashboardPage renderizando com dados:", { financialData, recentTransactions, refreshKey });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Dashboard Financeiro</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">Visão geral das suas finanças pessoais</p>
        </div>

        <FinancialOverview financialData={financialData} />
        <QuickActions onTransactionSaved={onFinancialDataUpdated} /> {/* Usando o novo nome aqui */}
 
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Transações Recentes</h2>
          <Select value={filterPeriod} onValueChange={(value: typeof filterPeriod) => setFilterPeriod(value)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filtrar por período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="last_30_days">Últimos 30 Dias</SelectItem>
              <SelectItem value="this_month">Este Mês</SelectItem>
              <SelectItem value="next_30_days">Próximos 30 Dias (Recorrentes)</SelectItem>
              <SelectItem value="all_transactions">Todas as Transações</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <RecentTransactions transactions={recentTransactions} />
      </div>
    </DashboardLayout>
  )
}
