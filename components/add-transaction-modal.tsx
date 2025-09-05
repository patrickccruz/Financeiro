"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CreditCard, Banknote, Smartphone } from "lucide-react"
import * as Icons from "lucide-react"; // Importa todos os ícones Lucide
import { toast } from "sonner";

interface AddTransactionModalProps {
  isOpen: boolean
  onClose: () => void
  defaultType: "income" | "expense"
  onTransactionSaved: () => void; // Novo prop de callback
}

// Definição da interface para o método de pagamento
interface PaymentMethod {
  id: number;
  type: string;
  name: string;
  last_four: string | null;
  limit: number | null;
  is_active: boolean;
  is_default: boolean;
}

export function AddTransactionModal({ isOpen, onClose, defaultType, onTransactionSaved }: AddTransactionModalProps) {
  const [formData, setFormData] = useState({
    description: "",
    amount: "",
    type: defaultType,
    payment_method_type: "credit", // Renomeado de paymentMethod para payment_method_type
    payment_method_id: null as number | null, // Novo campo para o ID do método de pagamento específico
    category: "", // Armazenará o ID da categoria
    date: new Date().toISOString().split("T")[0],
  });
  const [categories, setCategories] = useState<{ id: number; name: string; color: string; icon: string }[]>([]); // Atualiza a interface da categoria
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]); // Novo estado para todos os métodos de pagamento
  const [creditCards, setCreditCards] = useState<PaymentMethod[]>([]); // Novo estado para cartões de crédito
  const [debitCards, setDebitCards] = useState<PaymentMethod[]>([]); // Novo estado para cartões de débito

  const token = typeof window !== 'undefined' ? localStorage.getItem("token") : null;

  useEffect(() => {
    // Atualiza o tipo da transação quando o modal é aberto ou o defaultType muda
    setFormData(prevData => ({
      ...prevData,
      type: defaultType,
    }));

    if (isOpen && token) {
      const fetchData = async () => {
        // Buscar categorias
        try {
          const categoriesResponse = await fetch("http://localhost:5000/api/categories", {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
          if (!categoriesResponse.ok) {
            throw new Error("Falha ao buscar categorias");
          }
          const categoriesData = await categoriesResponse.json();
          setCategories(categoriesData);
        } catch (error) {
          console.error("Erro ao buscar categorias:", error);
          toast.error("Erro ao carregar categorias.");
        }

        // Buscar métodos de pagamento
        try {
          const paymentMethodsResponse = await fetch("http://localhost:5000/api/payment-methods", {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
          if (!paymentMethodsResponse.ok) {
            throw new Error("Falha ao buscar métodos de pagamento");
          }
          const paymentMethodsData: PaymentMethod[] = await paymentMethodsResponse.json();
          setPaymentMethods(paymentMethodsData);

          const filteredCreditCards = paymentMethodsData.filter(pm => pm.type === 'credit');
          setCreditCards(filteredCreditCards);

          const filteredDebitCards = paymentMethodsData.filter(pm => pm.type === 'debit');
          setDebitCards(filteredDebitCards);

          // Lógica para definir o tipo de método de pagamento padrão e o ID
          let newPaymentMethodType: "credit" | "debit" | "cash" | "pix" = "cash"; // Default para dinheiro
          let newPaymentMethodId: number | null = null;

          const defaultCreditCard = filteredCreditCards.find(pm => pm.is_default);
          const defaultDebitCard = filteredDebitCards.find(pm => pm.is_default);

          if (defaultType === "expense") {
            if (defaultDebitCard) {
              newPaymentMethodType = "debit";
              newPaymentMethodId = defaultDebitCard.id;
            } else if (defaultCreditCard) {
              newPaymentMethodType = "credit";
              newPaymentMethodId = defaultCreditCard.id;
            } else if (filteredDebitCards.length > 0) { // Se não houver padrão, pega o primeiro débito
                newPaymentMethodType = "debit";
                newPaymentMethodId = filteredDebitCards[0].id;
            } else if (filteredCreditCards.length > 0) { // Se não houver padrão, pega o primeiro crédito
                newPaymentMethodType = "credit";
                newPaymentMethodId = filteredCreditCards[0].id;
            }
          } else if (defaultType === "income") {
              newPaymentMethodType = "cash"; // Mantém dinheiro como padrão para receitas
              newPaymentMethodId = null;
          }

          setFormData(prev => ({
            ...prev,
            payment_method_type: newPaymentMethodType,
            payment_method_id: newPaymentMethodId,
          }));

        } catch (error) {
          console.error("Erro ao buscar métodos de pagamento:", error);
          toast.error("Erro ao carregar métodos de pagamento.");
        }
      };
      fetchData();
    }
  }, [isOpen, defaultType, token]);

  useEffect(() => {
    // Resetar payment_method_id quando o tipo de pagamento muda para algo que não seja crédito ou débito
    if (formData.payment_method_type !== 'credit' && formData.payment_method_type !== 'debit') {
      setFormData(prev => ({ ...prev, payment_method_id: null }));
    }
  }, [formData.payment_method_type]);

  // const expenseCategories = [
  //   "Alimentação",
  //   "Transporte",
  //   "Saúde",
  //   "Educação",
  //   "Entretenimento",
  //   "Compras",
  //   "Contas",
  //   "Outros",
  // ]
  
  // const incomeCategories = ["Salário", "Freelance", "Investimentos", "Vendas", "Outros"]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const token = localStorage.getItem("token");
    if (!token) {
      console.error("Token não encontrado");
      toast.error("Você não está autenticado. Por favor, faça login novamente.");
      return;
    }

    // Validação específica para cartão de crédito e débito
    if (formData.payment_method_type === 'credit' && (formData.payment_method_id === null || creditCards.length === 0)) {
      toast.error("Por favor, selecione um cartão de crédito ou cadastre um nas configurações.");
      return;
    }

    if (formData.payment_method_type === 'debit' && (formData.payment_method_id === null || debitCards.length === 0)) {
      toast.error("Por favor, selecione um cartão de débito ou cadastre um nas configurações.");
      return;
    }

    try {
      const response = await fetch("http://localhost:5000/api/transactions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          description: formData.description,
          amount: parseFloat(formData.amount),
          type: formData.type,
          category_id: parseInt(formData.category) || null, // Garante que seja null se vazio
          payment_method: formData.payment_method_type, // Envia o tipo (ex: 'credit', 'pix')
          payment_method_id: formData.payment_method_id, // Envia o ID específico do método de pagamento
          date: formData.date,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Falha ao salvar transação");
      }

      toast.success("Transação salva com sucesso!");

      // Reset form
      setFormData({
        description: "",
        amount: "",
        type: defaultType,
        payment_method_type: "credit",
        payment_method_id: null,
        category: "",
        date: new Date().toISOString().split("T")[0],
      });
      onClose();
      onTransactionSaved(); // Chama o callback após salvar com sucesso
    } catch (error: any) {
      console.error("Erro ao salvar transação:", error);
      toast.error(error.message || "Erro ao salvar transação.");
    }
  };

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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{formData.type === "income" ? "Adicionar Receita" : "Adicionar Gasto"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Input
              id="description"
              placeholder="Ex: Supermercado, Salário..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              required
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
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Categoria</Label>
            <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma categoria">
                  {formData.category ? (
                    (() => {
                      const selectedCategory = categories.find(cat => String(cat.id) === formData.category);
                      if (selectedCategory) {
                        const IconComponent = (Icons as any)[selectedCategory.icon] || Icons.Tag; // Ícone padrão
                        return (
                          <div className="flex items-center space-x-2">
                            <IconComponent className="h-4 w-4" style={{ color: selectedCategory.color }} />
                            <span style={{ color: selectedCategory.color }}>{selectedCategory.name}</span>
                          </div>
                        );
                      }
                      return "Selecione uma categoria";
                    })()
                  ) : (
                    "Selecione uma categoria"
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => {
                  const IconComponent = (Icons as any)[category.icon] || Icons.Tag; // Ícone padrão
                  return (
                    <SelectItem key={category.id} value={String(category.id)}>
                      <div className="flex items-center space-x-2">
                        <IconComponent className="h-4 w-4" style={{ color: category.color }} />
                        <span style={{ color: category.color }}>{category.name}</span>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="paymentMethod">Método de Pagamento</Label>
            <Select
              value={formData.payment_method_type} // Usa o novo estado para o tipo
              onValueChange={(value: "credit" | "debit" | "cash" | "pix") =>
                setFormData({ ...formData, payment_method_type: value })
              }
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

          {formData.payment_method_type === "credit" && (
            <div className="space-y-2">
              <Label htmlFor="credit-card-select">Qual cartão de crédito?</Label>
              {creditCards.length > 0 ? (
                <Select
                  value={String(formData.payment_method_id)}
                  onValueChange={(value) =>
                    setFormData(prev => ({ ...prev, payment_method_id: Number(value) }))
                  }
                >
                  <SelectTrigger id="credit-card-select">
                    <SelectValue placeholder="Selecione um cartão" />
                  </SelectTrigger>
                  <SelectContent>
                    {creditCards.map((pm) => (
                      <SelectItem key={pm.id} value={String(pm.id)}>
                        <div className="flex items-center space-x-2">
                          <CreditCard className="h-4 w-4" />
                          <span>{pm.name} {pm.last_four ? `(**** ${pm.last_four})` : ''}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-sm text-muted-foreground mt-2">
                  Nenhum cartão de crédito cadastrado. Adicione um nas configurações de Métodos de Pagamento.
                </p>
              )}
            </div>
          )}

          {formData.payment_method_type === "debit" && (
            <div className="space-y-2">
              <Label htmlFor="debit-card-select">Qual cartão de débito?</Label>
              {debitCards.length > 0 ? (
                <Select
                  value={String(formData.payment_method_id)}
                  onValueChange={(value) =>
                    setFormData(prev => ({ ...prev, payment_method_id: Number(value) }))
                  }
                >
                  <SelectTrigger id="debit-card-select">
                    <SelectValue placeholder="Selecione um cartão" />
                  </SelectTrigger>
                  <SelectContent>
                    {debitCards.map((pm) => (
                      <SelectItem key={pm.id} value={String(pm.id)}>
                        <div className="flex items-center space-x-2">
                          <CreditCard className="h-4 w-4" />
                          <span>{pm.name} {pm.last_four ? `(**** ${pm.last_four})` : ''}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-sm text-muted-foreground mt-2">
                  Nenhum cartão de débito cadastrado. Adicione um nas configurações de Métodos de Pagamento.
                </p>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="date">Data</Label>
            <Input
              id="date"
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              required
            />
          </div>

          <div className="flex space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1 bg-transparent">
              Cancelar
            </Button>
            <Button type="submit" className="flex-1">
              Salvar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
