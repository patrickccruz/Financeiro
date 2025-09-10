"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, TrendingUp, TrendingDown, PieChart } from "lucide-react"
import { AddTransactionModal } from "@/components/add-transaction-modal"
import { AddDebtModal } from "@/components/add-debt-modal";

interface QuickActionsProps {
  onTransactionSaved: () => void;
}

export function QuickActions({ onTransactionSaved }: QuickActionsProps) {
  const [showAddTransaction, setShowAddTransaction] = useState(false)
  const [transactionType, setTransactionType] = useState<"income" | "expense">("expense")
  const [showAddDebt, setShowAddDebt] = useState(false); // NOVO: Estado para controlar o modal de dívidas

  const handleAddIncome = () => {
    setTransactionType("income")
    setShowAddTransaction(true)
  }

  const handleAddExpense = () => {
    setTransactionType("expense")
    setShowAddTransaction(true)
  }

  // NOVO: Handler para abrir o modal de adicionar dívida
  const handleAddDebt = () => {
    setShowAddDebt(true);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Ações Rápidas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Button onClick={handleAddExpense} className="h-20 flex-col space-y-2 bg-red-600 hover:bg-red-700">
              <TrendingDown className="h-6 w-6" />
              <span>Adicionar Gasto</span>
            </Button>

            <Button
              onClick={handleAddIncome}
              variant="outline"
              className="h-20 flex-col space-y-2 border-green-600 text-green-600 hover:bg-green-50 dark:hover:bg-green-900 bg-transparent"
            >
              <TrendingUp className="h-6 w-6" />
              <span>Adicionar Receita</span>
            </Button>

            {/* NOVO: Botão para adicionar dívida */}
            <Button
              onClick={handleAddDebt}
              variant="outline"
              className="h-20 flex-col space-y-2 bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Plus className="h-6 w-6" />
              <span>Adicionar Dívida</span>
            </Button>

            <Button
              variant="outline"
              className="h-20 flex-col space-y-2 bg-transparent"
              onClick={() => (window.location.href = "/reports")}
            >
              <PieChart className="h-6 w-6" />
              <span>Ver Relatórios</span>
            </Button>

            <Button
              variant="outline"
              className="h-20 flex-col space-y-2 bg-transparent"
              onClick={() => (window.location.href = "/transactions")}
            >
              <Plus className="h-6 w-6" />
              <span>Todas Transações</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      <AddTransactionModal
        isOpen={showAddTransaction}
        onClose={() => setShowAddTransaction(false)}
        defaultType={transactionType}
        onTransactionSaved={onTransactionSaved} // Passa o callback
      />

      {/* NOVO: AddDebtModal */}
      <AddDebtModal
        isOpen={showAddDebt}
        onClose={() => setShowAddDebt(false)}
        onDebtSaved={onTransactionSaved} // Reutiliza o callback para atualizar dados no dashboard
      />
    </>
  )
}
