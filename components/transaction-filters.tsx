"use client"

import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Search, Filter, X } from "lucide-react"
import { useEffect, useState } from "react"

interface TransactionFiltersProps {
  filters: {
    search: string
    category: string
    paymentMethod: string
    type: string
    dateFrom: string
    dateTo: string
  }
  onFiltersChange: (filters: any) => void
}

export function TransactionFilters({ filters, onFiltersChange }: TransactionFiltersProps) {
  const [categories, setCategories] = useState<{ id: number; name: string }[]>([]);
  const token = typeof window !== 'undefined' ? localStorage.getItem("token") : null;
  const [periodFilter, setPeriodFilter] = useState<"custom" | "last_30_days" | "this_month" | "next_30_days" | "all_transactions">("custom");

  useEffect(() => {
    const fetchCategories = async () => {
      if (!token) {
        console.error("Token não encontrado");
        return;
      }
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
      }
    };
    fetchCategories();
  }, [token]);

  // Função auxiliar para calcular o intervalo de datas baseado no período
  const calculateDateRange = (period: typeof periodFilter) => {
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
      case "custom":
        // Manter os filtros de data existentes ou limpá-los se nenhum período for selecionado
        break;
    }
    return { dateFrom: start ? start.toISOString().split('T')[0] : "", dateTo: end ? end.toISOString().split('T')[0] : "" };
  };

  useEffect(() => {
    if (periodFilter !== "custom") {
      const { dateFrom, dateTo } = calculateDateRange(periodFilter);
      onFiltersChange({ ...filters, dateFrom, dateTo });
    }
  }, [periodFilter]); // Apenas reage a mudanças no periodFilter

  // Quando as datas customizadas são alteradas, resetar o periodFilter para 'custom'
  useEffect(() => {
    if ((filters.dateFrom !== "" || filters.dateTo !== "") && periodFilter !== "custom") {
      // Isso pode gerar um loop se não for tratado com cuidado. 
      // A ideia é que se o usuário altera as datas manualmente, o `periodFilter` deve voltar para `custom`
      setPeriodFilter("custom");
    }
  }, [filters.dateFrom, filters.dateTo]); // Reage a mudanças nas datas de filtro customizadas

  // const categories = [
  //   "Alimentação",
  //   "Transporte",
  //   "Saúde",
  //   "Educação",
  //   "Entretenimento",
  //   "Compras",
  //   "Contas",
  //   "Salário",
  //   "Freelance",
  //   "Investimentos",
  //   "Vendas",
  //   "Outros",
  // ]

  const clearFilters = () => {
    onFiltersChange({
      search: "",
      category: "",
      paymentMethod: "",
      type: "",
      dateFrom: "",
      dateTo: "",
    })
  }

  const hasActiveFilters = Object.values(filters).some((value) => value !== "")

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <h3 className="font-medium">Filtros</h3>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="ml-auto">
                <X className="h-4 w-4 mr-1" />
                Limpar
              </Button>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
            <div className="relative lg:col-span-2">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar transações..."
                value={filters.search}
                onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
                className="pl-10"
              />
            </div>

            <Select value={filters.type} onValueChange={(value) => onFiltersChange({ ...filters, type: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="income">Receita</SelectItem>
                <SelectItem value="expense">Gasto</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={filters.category}
              onValueChange={(value) => onFiltersChange({ ...filters, category: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.name}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filters.paymentMethod}
              onValueChange={(value) => onFiltersChange({ ...filters, paymentMethod: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Pagamento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="credit">Crédito</SelectItem>
                <SelectItem value="debit">Débito</SelectItem>
                <SelectItem value="cash">Dinheiro</SelectItem>
                <SelectItem value="pix">PIX</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex space-x-2">
              <Input
                type="date"
                placeholder="De"
                value={filters.dateFrom}
                onChange={(e) => onFiltersChange({ ...filters, dateFrom: e.target.value })}
              />
              <Input
                type="date"
                placeholder="Até"
                value={filters.dateTo}
                onChange={(e) => onFiltersChange({ ...filters, dateTo: e.target.value })}
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
