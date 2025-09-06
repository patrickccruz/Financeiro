import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowUpRight, ArrowDownRight, CreditCard, Banknote } from "lucide-react"
import { useEffect, useState } from "react"

interface Transaction {
  id: number
  description: string
  amount: string // Alterado para string para corresponder ao DECIMAL do PostgreSQL
  type: "income" | "expense"
  payment_method: "credit" | "debit" | "cash" | "pix" | "bank_account"
  category_name: string // Alterado para category_name
  bank_account_name?: string; // Adicionado para exibir o nome da conta bancária
  date: string
  is_generated_recurring?: boolean; // Adicionado para identificar transações recorrentes geradas
}

interface RecentTransactionsProps {
  transactions: Transaction[];
}

export function RecentTransactions({ transactions }: RecentTransactionsProps) {
  // Remove the useEffect and state for fetching data, as it's now passed via props
  // const [transactions, setTransactions] = useState<Transaction[]>([]);
  // const [isLoading, setIsLoading] = useState(true);
  // const [error, setError] = useState<string | null>(null);

  // useEffect(() => {
  //   const fetchTransactions = async () => {
  //     const token = localStorage.getItem("token");
  //     if (!token) {
  //       setError("Token de autenticação não encontrado. Faça login novamente.");
  //       setIsLoading(false);
  //       return;
  //     }
  //
  //     try {
  //       const response = await fetch("http://localhost:5000/api/transactions", {
  //         headers: {
  //           Authorization: `Bearer ${token}`,
  //         },
  //       });
  //
  //       if (!response.ok) {
  //         if (response.status === 401 || response.status === 403) {
  //           setError("Sessão expirada ou não autorizada. Por favor, faça login novamente.");
  //           // Opcional: Redirecionar para a página de login
  //           // router.push("/");
  //         } else {
  //           throw new Error("Falha ao buscar transações");
  //         }
  //       }
  //       const data: Transaction[] = await response.json();
  //       setTransactions(data);
  //     } catch (err) {
  //       console.error("Erro ao buscar transações:", err);
  //       setError((err as Error).message || "Erro ao carregar transações.");
  //     } finally {
  //       setIsLoading(false);
  //     }
  //   };
  //
  //   fetchTransactions();
  // }, []);

  // if (isLoading) {
  //   return <p>Carregando transações...</p>;
  // }

  // if (error) {
  //   return <p className="text-red-500">Erro: {error}</p>;
  // }

  // if (transactions.length === 0) {
  //   return <p>Nenhuma transação encontrada.</p>
  // }
  // Mock data - will be replaced with real data later
  // const transactions: Transaction[] = [
  //   {
  //     id: "1",
  //     description: "Salário",
  //     amount: 3200.0,
  //     type: "income",
  //     paymentMethod: "debit",
  //     category: "Trabalho",
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
  //     description: "Freelance",
  //     amount: 450.0,
  //     type: "income",
  //     paymentMethod: "debit",
  //     category: "Trabalho",
  //     date: "2024-01-12",
  //   },
  //   {
  //     id: "5",
  //     description: "Farmácia",
  //     amount: -85.3,
  //     type: "expense",
  //     paymentMethod: "cash",
  //     category: "Saúde",
  //     date: "2024-01-11",
  //   },
  // ]

  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case "credit":
        return <CreditCard className="h-4 w-4" />
      case "cash":
        return <Banknote className="h-4 w-4" />
      case "pix":
        return <Banknote className="h-4 w-4" /> // Adicionado Pix
      case "debit":
        return <CreditCard className="h-4 w-4" /> // Adicionado débito
      case "bank_account":
        return <Banknote className="h-4 w-4" /> // Adicionado conta bancária
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
      case "bank_account":
        return "Conta Bancária"
      default:
        return method
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Transações Recentes</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {transactions.length === 0 ? (
            <p>Nenhuma transação encontrada.</p>
          ) : (
            transactions.map((transaction) => (
              <div key={transaction.id} className="flex items-center justify-between p-3 rounded-lg border">
                <div className="flex items-center space-x-3">
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
                    <p className="font-medium">
                      {transaction.description === "Saldo inicial da conta bancária" && transaction.bank_account_name
                        ? `Saldo inicial da conta ${transaction.bank_account_name}`
                        : transaction.description}
                      {transaction.is_generated_recurring && <span className="ml-2 text-xs text-blue-500">(Recorrente Futuro)</span>}
                    </p>
                    <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                      {transaction.description !== "Saldo inicial da conta bancária" && (
                        <>
                          <span>{transaction.category_name}</span>
                          <span>•</span>
                          <div className="flex items-center space-x-1">
                            {getPaymentMethodIcon(transaction.payment_method)}
                            <span>{getPaymentMethodLabel(transaction.payment_method)}</span>
                          </div>
                        </>
                      )}
                      {transaction.description === "Saldo inicial da conta bancária" && transaction.bank_account_name && (
                        <div className="flex items-center space-x-1">
                          {getPaymentMethodIcon("bank_account")}
                          <span>{transaction.bank_account_name}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`font-semibold ${transaction.type === "income" ? "text-green-600" : "text-red-600"}`}>
                    {transaction.type === "income" ? "+" : ""}R${" "}
                    {Math.abs(parseFloat(transaction.amount)).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(transaction.date).toLocaleDateString("pt-BR")}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
