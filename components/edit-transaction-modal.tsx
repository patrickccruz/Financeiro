"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CreditCard, Banknote, Smartphone } from "lucide-react"
import { toast } from "sonner"
import { Checkbox } from "@/components/ui/checkbox"; // Importar Checkbox

interface Category {
  id: number;
  name: string;
}

interface Transaction {
  id: number;
  description: string;
  amount: string;
  type: "income" | "expense";
  payment_method: "credit" | "debit" | "cash" | "pix";
  category_id: number | null; // Assumindo que category_id é number ou null
  date: string;
  is_recurring: boolean; // Novo campo para indicar se a transação é recorrente
  frequency: "weekly" | "monthly" | "annually" | "custom" | null; // Frequência da recorrência
  recurrence_end_date: string | null; // Data de término da recorrência
  custom_recurrence_interval: string | null; // Para recorrência personalizada
}

interface EditTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: Transaction | null;
  onTransactionUpdated: () => void;
}

export function EditTransactionModal({ isOpen, onClose, transaction, onTransactionUpdated }: EditTransactionModalProps) {
  const [formData, setFormData] = useState<Omit<Transaction, 'id' | 'category_name'>>({
    description: "",
    amount: "",
    type: "expense",
    payment_method: "credit",
    category_id: null,
    date: new Date().toISOString().split("T")[0],
    is_recurring: false,
    frequency: null,
    recurrence_end_date: null,
    custom_recurrence_interval: null,
  });
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const token = typeof window !== 'undefined' ? localStorage.getItem("token") : null;

  useEffect(() => {
    if (transaction) {
      // Formata a data para "YYYY-MM-DD" antes de definir no formulário
      const formattedDate = transaction.date ? new Date(transaction.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
      setFormData({
        description: transaction.description,
        amount: String(Math.abs(parseFloat(transaction.amount))),
        type: transaction.type,
        payment_method: transaction.payment_method,
        category_id: transaction.category_id,
        date: formattedDate, // Usa a data formatada
        is_recurring: transaction.is_recurring || false,
        frequency: transaction.frequency || "monthly",
        recurrence_end_date: transaction.recurrence_end_date || "",
        custom_recurrence_interval: transaction.custom_recurrence_interval || "",
      });
    } else {
      // Resetar o formulário se não houver transação
      setFormData({
        description: "",
        amount: "",
        type: "expense",
        payment_method: "credit",
        category_id: null,
        date: new Date().toISOString().split("T")[0],
        is_recurring: false,
        frequency: null,
        recurrence_end_date: null,
        custom_recurrence_interval: null,
      });
    }

    if (isOpen && token) {
      const fetchCategories = async () => {
        try {
          const response = await fetch("http://localhost:5000/api/categories", {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
          if (!response.ok) {
            throw new Error("Falha ao buscar categorias");
          }
          const data = await response.json();
          setCategories(data);
        } catch (error) {
          console.error("Erro ao buscar categorias:", error);
          toast.error("Erro ao carregar categorias.");
        }
      };
      fetchCategories();
    }
  }, [isOpen, transaction, token]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleSelectChange = (id: string, value: string | number) => {
    if (id === "category_id" && value === "") {
      setFormData(prev => ({ ...prev, [id]: null }));
    } else if (id === "amount") {
      setFormData(prev => ({ ...prev, [id]: String(value) }));
    } else if (id === "type" || id === "payment_method" || id === "frequency") {
        setFormData(prev => ({ ...prev, [id]: value as "income" | "expense" | "credit" | "debit" | "cash" | "pix" | "weekly" | "monthly" | "annually" | "custom" }));
    } else {
      setFormData(prev => ({ ...prev, [id]: value }));
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!transaction?.id) {
      toast.error("ID da transação não encontrado para edição.");
      return;
    }

    if (!token) {
      console.error("Token não encontrado");
      toast.error("Você não está autenticado.");
      return;
    }

    setIsLoading(true);
    try {
      const finalAmount = formData.type === "expense" ? -Math.abs(parseFloat(formData.amount)) : Math.abs(parseFloat(formData.amount));
      
      const response = await fetch(`http://localhost:5000/api/transactions/${transaction.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          description: formData.description,
          amount: finalAmount,
          type: formData.type,
          category_id: formData.category_id,
          payment_method: formData.payment_method,
          date: formData.date,
          is_recurring: formData.is_recurring,
          frequency: formData.is_recurring ? formData.frequency : null,
          recurrence_end_date: formData.is_recurring && formData.recurrence_end_date ? formData.recurrence_end_date : null,
          custom_recurrence_interval: formData.is_recurring && formData.frequency === "custom" ? formData.custom_recurrence_interval : null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Falha ao atualizar transação");
      }

      toast.success("Transação atualizada com sucesso!");
      onClose();
      onTransactionUpdated?.(); // Alterado para usar optional chaining
    } catch (error: any) {
      console.error("Erro ao atualizar transação:", error);
      toast.error(error.message || "Erro ao atualizar transação.");
    } finally {
      setIsLoading(false);
    }
  };

  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case "credit":
      case "debit":
        return <CreditCard className="h-4 w-4" />;
      case "cash":
        return <Banknote className="h-4 w-4" />;
      case "pix":
        return <Smartphone className="h-4 w-4" />;
      default:
        return <CreditCard className="h-4 w-4" />;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Editar Transação</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Input
              id="description"
              placeholder="Ex: Supermercado, Salário..."
              value={formData.description}
              onChange={handleInputChange}
              required
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Valor (R$)</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              placeholder="0,00"
              value={formData.amount}
              onChange={handleInputChange}
              required
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">Tipo</Label>
            <Select value={formData.type} onValueChange={(value) => handleSelectChange("type", value)} disabled={isLoading}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="income">Receita</SelectItem>
                <SelectItem value="expense">Gasto</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="category_id">Categoria</Label>
            <Select
              value={formData.category_id !== null ? String(formData.category_id) : ""}
              onValueChange={(value) => handleSelectChange("category_id", value !== "" ? parseInt(value) : null)}
              disabled={isLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma categoria" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={String(category.id)}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="payment_method">Método de Pagamento</Label>
            <Select
              value={formData.payment_method}
              onValueChange={(value) => handleSelectChange("payment_method", value)}
              disabled={isLoading}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="credit">
                  <div className="flex items-center space-x-2">
                    <CreditCard className="h-4 w-4" />
                    <span>Cartão de Crédito</span>
                  </div>
                </SelectItem>
                <SelectItem value="debit">
                  <div className="flex items-center space-x-2">
                    <CreditCard className="h-4 w-4" />
                    <span>Cartão de Débito</span>
                  </div>
                </SelectItem>
                <SelectItem value="cash">
                  <div className="flex items-center space-x-2">
                    <Banknote className="h-4 w-4" />
                    <span>Dinheiro</span>
                  </div>
                </SelectItem>
                <SelectItem value="pix">
                  <div className="flex items-center space-x-2">
                    <Smartphone className="h-4 w-4" />
                    <span>PIX</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="date">Data</Label>
            <Input
              id="date"
              type="date"
              value={formData.date}
              onChange={handleInputChange}
              required
              disabled={isLoading}
            />
          </div>

          <div className="flex items-center space-x-2 pt-2">
            <Checkbox
              id="isRecurring"
              checked={formData.is_recurring}
              onCheckedChange={(checked) => {
                setFormData(prev => ({
                  ...prev,
                  is_recurring: typeof checked === 'boolean' ? checked : false,
                  ...(typeof checked === 'boolean' && !checked && { frequency: "monthly", recurrence_end_date: "", custom_recurrence_interval: "" })
                }));
              }}
              disabled={isLoading}
            />
            <Label htmlFor="isRecurring">Transação Recorrente</Label>
          </div>

          {formData.is_recurring && (
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label htmlFor="frequency">Frequência</Label>
                <Select
                  value={formData.frequency || "monthly"} // Default para "monthly" se for null
                  onValueChange={(value: "weekly" | "monthly" | "annually" | "custom") =>
                    setFormData(prev => ({
                      ...prev,
                      frequency: value,
                      ...(value !== "custom" && { custom_recurrence_interval: "" })
                    }))
                  }
                  disabled={isLoading}
                >
                  <SelectTrigger id="frequency">
                    <SelectValue placeholder="Selecione a frequência" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekly">Semanal</SelectItem>
                    <SelectItem value="monthly">Mensal</SelectItem>
                    <SelectItem value="annually">Anual</SelectItem>
                    <SelectItem value="custom">Personalizado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.frequency === "custom" && (
                <div className="space-y-2">
                  <Label htmlFor="customRecurrenceInterval">Intervalo Personalizado</Label>
                  <Input
                    id="custom_recurrence_interval"
                    type="text"
                    placeholder="Ex: 'a cada 15 dias', 'primeira segunda-feira do mês'"
                    value={formData.custom_recurrence_interval || ""}
                    onChange={handleInputChange}
                    disabled={isLoading}
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="recurrenceEndDate">Data de Término da Recorrência (Opcional)</Label>
                <Input
                  id="recurrence_end_date"
                  type="date"
                  value={formData.recurrence_end_date || ""}
                  onChange={handleInputChange}
                  disabled={isLoading}
                />
              </div>
            </div>
          )}

          <div className="flex space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1 bg-transparent" disabled={isLoading}>
              Cancelar
            </Button>
            <Button type="submit" className="flex-1" disabled={isLoading}>
              {isLoading ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
