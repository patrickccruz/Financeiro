"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { DashboardLayout } from "@/components/dashboard-layout"
import { TransactionsList } from "@/components/transactions-list"
import { TransactionFilters } from "@/components/transaction-filters"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { AddTransactionModal } from "@/components/add-transaction-modal"

interface Transaction {
  id: number;
  description: string;
  amount: string;
  type: "income" | "expense";
  payment_method: "credit" | "debit" | "cash" | "pix";
  category_name: string;
  date: string;
  category_id: number | null; // Adicionado category_id
  is_generated_recurring?: boolean; // Adicionado para identificar transações recorrentes geradas
}

export default function TransactionsPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [dataError, setDataError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [showAddTransaction, setShowAddTransaction] = useState(false)
  const [filters, setFilters] = useState({
    search: "",
    category: "",
    paymentMethod: "",
    type: "",
    dateFrom: "",
    dateTo: "",
  })
  const router = useRouter()

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/");
      setIsLoading(false);
      return;
    }

    setIsAuthenticated(true);

    const fetchTransactions = async () => {
      console.log("useEffect em TransactionsPage acionado. refreshKey:", refreshKey); // Adicionado para depuração
      try {
        const response = await fetch(`http://localhost:5000/api/transactions?search=${filters.search}&category=${filters.category}&paymentMethod=${filters.paymentMethod}&type=${filters.type}&dateFrom=${filters.dateFrom}&dateTo=${filters.dateTo}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!response.ok) {
          throw new Error("Falha ao buscar transações");
        }
        const data: Transaction[] = await response.json();
        setTransactions(data);
      } catch (err) {
        console.error("Erro ao carregar transações:", err);
        setDataError((err as Error).message || "Erro ao carregar transações.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchTransactions();
  }, [router, filters, refreshKey]);

  const handleTransactionSaved = () => {
    console.log("handleTransactionSaved chamado, incrementando refreshKey"); // Adicionado para depuração
    setRefreshKey(prevKey => prevKey + 1);
  };

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

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Transações</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">Gerencie todas as suas transações financeiras</p>
          </div>
          <Button onClick={() => setShowAddTransaction(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nova Transação
          </Button>
        </div>

        <TransactionFilters filters={filters} onFiltersChange={setFilters} />
        <TransactionsList
          transactions={transactions}
          filters={filters}
          onTransactionDeleted={handleTransactionSaved}
          onTransactionEdited={handleTransactionSaved} // Novo callback para edição
        />

        <AddTransactionModal
          isOpen={showAddTransaction}
          onClose={() => setShowAddTransaction(false)}
          defaultType="expense"
          onTransactionSaved={handleTransactionSaved}
        />
      </div>
    </DashboardLayout>
  )
}
