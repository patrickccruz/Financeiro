"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  ArrowUpRight,
  ArrowDownRight,
  CreditCard,
  Banknote,
  Smartphone,
  MoreHorizontal,
  Edit,
  Trash2,
} from "lucide-react"
import { EditTransactionModal } from "@/components/edit-transaction-modal"
import * as Icons from "lucide-react"; // Importa todos os ícones Lucide

interface Transaction {
  id: number; // Alterado para number
  description: string;
  amount: string; // Alterado para string
  type: "income" | "expense";
  payment_method: "credit" | "debit" | "cash" | "pix";
  category_name: string; // Alterado para category_name
  date: string;
  category_id: number | null; // Adicionado category_id
  category_color: string; // Adicionado
  category_icon: string; // Adicionado
}

interface TransactionsListProps {
  transactions: Transaction[]; // Transações agora vêm via prop
  filters: {
    search: string
    category: string
    paymentMethod: string
    type: string
    dateFrom: string
    dateTo: string
  }
  onTransactionDeleted: () => void; // Novo callback para notificar exclusão
  onTransactionEdited: () => void; // Novo callback para notificar edição
}

export function TransactionsList({ transactions, filters, onTransactionDeleted, onTransactionEdited }: TransactionsListProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [transactionToDelete, setTransactionToDelete] = useState<number | null>(null) // ID agora é number
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [transactionToEdit, setTransactionToEdit] = useState<Transaction | null>(null);

  // Mock data - will be replaced with real data later
  // const allTransactions: Transaction[] = [
  //   {
  //     id: "1",
  //     description: "Salário",
  //     amount: 3200.0,
  //     type: "income",
  //     paymentMethod: "debit",
  //     category: "Salário",
  //     date: "2024-01-15",
  //   },
  //   {
  //     id: "2",
  //     description: "Supermercado Extra",
  //     amount: -180.5,
  //     type: "expense",
  //     paymentMethod: "credit",
  //     category: "Alimentação",
  //     date: "2024-01-14",
  //   },
  //   {
  //     id: "3",
  //     description: "Combustível",
  //     amount: -120.0,
  //     type: "expense",
  //     paymentMethod: "debit",
  //     category: "Transporte",
  //     date: "2024-01-13",
  //   },
  //   {
  //     id: "4",
  //     description: "Freelance Design",
  //     amount: 450.0,
  //     type: "income",
  //     paymentMethod: "pix",
  //     category: "Freelance",
  //     date: "2024-01-12",
  //   },
  //   {
  //     id: "5",
  //     description: "Farmácia São João",
  //     amount: -85.3,
  //     type: "expense",
  //     paymentMethod: "cash",
  //     category: "Saúde",
  //     date: "2024-01-11",
  //   },
  //   {
  //     id: "6",
  //     description: "Netflix",
  //     amount: -29.9,
  //     type: "expense",
  //     paymentMethod: "credit",
  //     category: "Entretenimento",
  //     date: "2024-01-10",
  //   },
  //   {
  //     id: "7",
  //     description: "Uber",
  //     amount: -25.0,
  //     type: "expense",
  //     paymentMethod: "credit",
  //     category: "Transporte",
  //     date: "2024-01-09",
  //   },
  //   {
  //     id: "8",
  //     description: "Venda Produto",
  //     amount: 150.0,
  //     type: "income",
  //     paymentMethod: "pix",
  //     category: "Vendas",
  //     date: "2024-01-08",
  //   },
  // ]

  // Filter transactions based on filters
  const filteredTransactions = transactions.filter((transaction) => {
    const matchesSearch = transaction.description.toLowerCase().includes(filters.search.toLowerCase())
    const matchesCategory = !filters.category || transaction.category_name === filters.category
    const matchesPaymentMethod = !filters.paymentMethod || transaction.payment_method === filters.paymentMethod
    const matchesType = !filters.type || transaction.type === filters.type
    const matchesDateFrom = !filters.dateFrom || transaction.date >= filters.dateFrom
    const matchesDateTo = !filters.dateTo || transaction.date <= filters.dateTo

    return matchesSearch && matchesCategory && matchesPaymentMethod && matchesType && matchesDateFrom && matchesDateTo
  })

  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case "credit":
      case "debit":
        return <CreditCard className="h-4 w-4" />
      case "cash":
        return <Banknote className="h-4 w-4" />
      case "pix":
        return <Smartphone className="h-4 w-4" />
      default:
        return <CreditCard className="h-4 w-4" />
    }
  }

  const getPaymentMethodLabel = (method: string) => {
    switch (method) {
      case "credit":
        return "Crédito"
      case "debit":
        return "Débito"
      case "cash":
        return "Dinheiro"
      case "pix":
        return "PIX"
      default:
        return method
    }
  }

  const handleDeleteTransaction = (id: number) => {
    setTransactionToDelete(id)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (transactionToDelete === null) return;

    const token = localStorage.getItem("token");
    if (!token) {
      console.error("Token não encontrado");
      // TODO: Redirecionar para login ou exibir erro para o usuário
      return;
    }

    try {
      const response = await fetch(`http://localhost:5000/api/transactions/${transactionToDelete}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Falha ao deletar transação");
      }

      console.log("Transação deletada com sucesso!");
      onTransactionDeleted(); // Notifica a página pai para atualizar
    } catch (error) {
      console.error("Erro ao deletar transação:", error);
      // TODO: Exibir mensagem de erro para o usuário
    } finally {
      setDeleteDialogOpen(false);
      setTransactionToDelete(null);
    }
  };

  const totalIncome = filteredTransactions.filter((t) => t.type === "income").reduce((sum, t) => sum + parseFloat(t.amount), 0)

  const totalExpenses = filteredTransactions
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + Math.abs(parseFloat(t.amount)), 0)

  return (
    <>
      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">
              R$ {totalIncome.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </div>
            <p className="text-sm text-muted-foreground">Total de Receitas</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-red-600">
              R$ {totalExpenses.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </div>
            <p className="text-sm text-muted-foreground">Total de Gastos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div
              className={`text-2xl font-bold ${totalIncome - totalExpenses >= 0 ? "text-green-600" : "text-red-600"}`}
            >
              R$ {(totalIncome - totalExpenses).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </div>
            <p className="text-sm text-muted-foreground">Saldo Líquido</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Todas as Transações ({filteredTransactions.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredTransactions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>Nenhuma transação encontrada com os filtros aplicados.</p>
              </div>
            ) : (
              filteredTransactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50"
                >
                  <div className="flex items-center space-x-4">
                    <div
                      className={`p-2 rounded-full ${
                        transaction.type === "income"
                          ? "bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-400"
                          : "bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-400"
                      }`}
                    >
                      {transaction.type === "income" ? (
                        <ArrowUpRight className="h-4 w-4" />
                      ) : (
                        <ArrowDownRight className="h-4 w-4" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium">{transaction.description}</p>
                      <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                        {(() => {
                          const IconComponent = (Icons as any)[transaction.category_icon] || Icons.Tag; // Ícone padrão
                          return (
                            <div className="flex items-center space-x-1 p-1 rounded-md"
                              style={{ backgroundColor: transaction.category_color + "30", color: transaction.category_color }}>
                              <IconComponent className="h-3 w-3" />
                              <span className="font-medium" style={{ color: transaction.category_color }}>{transaction.category_name}</span>
                            </div>
                          );
                        })()}
                        <div className="flex items-center space-x-1">
                          {getPaymentMethodIcon(transaction.payment_method)}
                          <span>{getPaymentMethodLabel(transaction.payment_method)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <p
                        className={`font-semibold ${transaction.type === "income" ? "text-green-600" : "text-red-600"}`}
                      >
                        {transaction.type === "income" ? "+" : ""}R${" "}
                        {Math.abs(parseFloat(transaction.amount)).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(transaction.date).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => {
                          setTransactionToEdit(transaction);
                          setEditDialogOpen(true);
                        }}>
                          <Edit className="mr-2 h-4 w-4" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-red-600"
                          onClick={() => handleDeleteTransaction(transaction.id)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Transação</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta transação? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <EditTransactionModal
        isOpen={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        transaction={transactionToEdit}
        onTransactionUpdated={onTransactionEdited} // Repassa a nova prop
      />
    </>
  )
}
