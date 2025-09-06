"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { MoreHorizontal } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { toast } from "sonner"
import * as Icons from "lucide-react"; // Importa todos os ícones Lucide
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import React from "react"; // Importa React para usar React.createElement


interface Category {
  id: number;
  name: string;
  color: string; // Adicionado
  icon: string; // Adicionado
}

export function CategorySettings() {
  const [categories, setCategories] = useState<Category[]>([])
  const [newCategoryName, setNewCategoryName] = useState("")
  const [newCategoryColor, setNewCategoryColor] = useState("#CCCCCC"); // Valor padrão
  const [newCategoryIcon, setNewCategoryIcon] = useState("Tag"); // Valor padrão
  const [editCategory, setEditCategory] = useState<Category | null>(null)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const token = typeof window !== 'undefined' ? localStorage.getItem("token") : null

  // Cores predefinidas com conceito financeiro
  const predefinedColors = [
    { name: "Verde (Receita)", value: "#10B981" }, // Esmeralda - Receitas, Saldo Positivo
    { name: "Vermelho (Despesa)", value: "#EF4444" }, // Vermelho - Despesas, Alertas
    { name: "Azul (Investimento)", value: "#3B82F6" }, // Azul vibrante - Investimentos
    { name: "Amarelo (Economia)", value: "#F59E0B" }, // Laranja/Amarelo - Poupança, Metas
    { name: "Roxo (Lazer)", value: "#8B5CF6" }, // Violeta - Lazer, Supérfluos
    { name: "Ciano (Contas)", value: "#06B6D4" }, // Ciano - Contas a Pagar, Fixas
    { name: "Rosa (Saúde)", value: "#EC4899" }, // Rosa - Saúde, Bem-estar
    { name: "Cinza (Outros)", value: "#6B7280" }, // Cinza - Diversos, Neutro
  ];

  // Ícones Lucide relevantes para finanças
  const predefinedIcons = [
    { name: "Tag", label: "Etiqueta" },
    { name: "Home", label: "Casa" },
    { name: "Car", label: "Carro" },
    { name: "Utensils", label: "Utensílios" },
    { name: "ShoppingBag", label: "Sacola de Compras" },
    { name: "Briefcase", label: "Pasta" },
    { name: "Heart", label: "Coração" },
    { name: "PiggyBank", label: "Cofre" },
    { name: "CreditCard", label: "Cartão de Crédito" },
    { name: "Landmark", label: "Marco" },
    { name: "Wallet", label: "Carteira" },
    { name: "Receipt", label: "Recibo" },
    { name: "Gift", label: "Presente" },
    { name: "Plane", label: "Avião" },
    { name: "Book", label: "Livro" },
    { name: "GraduationCap", label: "Capelo" },
    { name: "Handshake", label: "Aperto de Mãos" },
    { name: "Wrench", label: "Chave Inglesa" },
    { name: "Couch", label: "Sofá" },
    { name: "Bus", label: "Ônibus" },
    { name: "Coffee", label: "Café" },
    { name: "Banknote", label: "Nota de Banco" },
    { name: "Coins", label: "Moedas" },
    { name: "Scale", label: "Balança" },
    { name: "ChartLine", label: "Gráfico de Linha" }
  ];

  const fetchCategories = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch("http://localhost:5000/api/categories", {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      })
      if (!response.ok) {
        throw new Error("Falha ao buscar categorias")
      }
      const data = await response.json()
      setCategories(data)
    } catch (err: any) {
      setError(err.message || "Erro ao carregar categorias.")
      toast.error(err.message || "Erro ao carregar categorias.")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (token) {
      fetchCategories()
    }
  }, [token])

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) {
      toast.error("O nome da categoria não pode ser vazio.")
      return
    }
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch("http://localhost:5000/api/categories", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ name: newCategoryName, color: newCategoryColor, icon: newCategoryIcon })
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.message || "Falha ao adicionar categoria.")
      }
      setCategories(prev => [...prev, data])
      setNewCategoryName("")
      setNewCategoryColor("#CCCCCC"); // Resetar cor
      setNewCategoryIcon("Tag"); // Resetar ícone
      setShowAddDialog(false)
      toast.success("Categoria adicionada com sucesso!")
    } catch (err: any) {
      setError(err.message || "Erro ao adicionar categoria.")
      toast.error(err.message || "Erro ao adicionar categoria.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleEditCategory = async () => {
    if (!editCategory || !editCategory.name.trim()) {
      toast.error("O nome da categoria não pode ser vazio.")
      return
    }
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch(`http://localhost:5000/api/categories/${editCategory.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ name: editCategory.name, color: editCategory.color, icon: editCategory.icon }) // Envia cor e ícone
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.message || "Falha ao atualizar categoria.")
      }
      setCategories(prev => prev.map(cat => cat.id === editCategory.id ? data : cat))
      setEditCategory(null)
      setShowEditDialog(false)
      toast.success("Categoria atualizada com sucesso!")
    } catch (err: any) {
      setError(err.message || "Erro ao atualizar categoria.")
      toast.error(err.message || "Erro ao atualizar categoria.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteCategory = async (id: number) => {
    if (!window.confirm("Tem certeza que deseja deletar esta categoria? Todas as transações associadas a ela ficarão sem categoria.")) {
      return
    }
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch(`http://localhost:5000/api/categories/${id}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      })
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.message || "Falha ao deletar categoria.")
      }
      setCategories(prev => prev.filter(cat => cat.id !== id))
      toast.success("Categoria deletada com sucesso!")
    } catch (err: any) {
      setError(err.message || "Erro ao deletar categoria.")
      toast.error(err.message || "Erro ao deletar categoria.")
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading && categories.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Gerenciar Categorias</CardTitle>
          <CardDescription>Adicione, edite ou remova categorias para suas transações.</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center p-6">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="ml-4">Carregando categorias...</p>
        </CardContent>
      </Card>
    )
  }

  if (error && categories.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Gerenciar Categorias</CardTitle>
          <CardDescription>Adicione, edite ou remova categorias para suas transações.</CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <p className="text-red-500">{error}</p>
          <Button onClick={fetchCategories} className="mt-4">Tentar Novamente</Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-2xl font-bold">Gerenciar Categorias</CardTitle>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button>Adicionar Categoria</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Nova Categoria</DialogTitle>
              <DialogDescription>
                Adicione uma nova categoria para organizar suas transações.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">
                  Nome
                </Label>
                <Input
                  id="name"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  className="col-span-3"
                  disabled={isLoading}
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="color" className="text-right">
                  Cor
                </Label>
                <Select
                  value={newCategoryColor}
                  onValueChange={setNewCategoryColor}
                  disabled={isLoading}
                >
                  <SelectTrigger className="col-span-3 h-8">
                    <SelectValue placeholder="Selecione uma cor" />
                  </SelectTrigger>
                  <SelectContent>
                    {predefinedColors.map((colorOption) => (
                      <SelectItem key={colorOption.value} value={colorOption.value}>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-4 h-4 rounded-full"
                            style={{ backgroundColor: colorOption.value }}
                          />
                          {colorOption.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="icon" className="text-right">
                  Ícone
                </Label>
                <Select
                  value={newCategoryIcon}
                  onValueChange={setNewCategoryIcon}
                  disabled={isLoading}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Selecione um ícone">
                      {newCategoryIcon ? (
                        <div className="flex items-center gap-2">
                          {React.createElement((Icons as any)[newCategoryIcon], { className: "h-5 w-5" })}
                          {predefinedIcons.find(icon => icon.name === newCategoryIcon)?.label || newCategoryIcon}
                        </div>
                      ) : (
                        "Selecione um ícone"
                      )}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="max-h-60 overflow-y-auto">
                    {predefinedIcons.map((icon) => {
                      const IconComponent = (Icons as any)[icon.name] || Icons.Tag;
                      return (
                        <SelectItem key={icon.name} value={icon.name}>
                          <div className="flex items-center gap-2">
                            <IconComponent className="h-5 w-5" />
                            {icon.label}
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => setShowAddDialog(false)} variant="outline" disabled={isLoading}>Cancelar</Button>
              <Button type="submit" onClick={handleAddCategory} disabled={isLoading}>
                {isLoading ? "Adicionando..." : "Adicionar Categoria"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {categories.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400">Nenhuma categoria encontrada. Adicione uma nova!</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Cor</TableHead>
                <TableHead>Ícone</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.map((category) => {
                const IconComponent = (Icons as any)[category.icon] || Icons.Tag; // Ícone padrão se não encontrado
                return (
                  <TableRow key={category.id}>
                    <TableCell className="font-medium">{category.name}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full" style={{ backgroundColor: category.color }} />
                        <span>{category.color}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <IconComponent className="h-5 w-5" style={{ color: category.color }} />
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Abrir menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Ações</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => {
                            setEditCategory(category)
                            setShowEditDialog(true)
                          }}>
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleDeleteCategory(category.id)} className="text-red-600">
                            Deletar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Editar Categoria</DialogTitle>
            <DialogDescription>
              Edite o nome da categoria.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-name" className="text-right">
                Nome
              </Label>
              <Input
                id="edit-name"
                value={editCategory?.name || ""}
                onChange={(e) => setEditCategory(prev => prev ? { ...prev, name: e.target.value } : null)}
                className="col-span-3"
                disabled={isLoading}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-color" className="text-right">
                Cor
              </Label>
              <Select
                value={editCategory?.color || "#CCCCCC"}
                onValueChange={(value) => setEditCategory(prev => prev ? { ...prev, color: value } : null)}
                disabled={isLoading}
              >
                <SelectTrigger className="col-span-3 h-8">
                  <SelectValue placeholder="Selecione uma cor" />
                </SelectTrigger>
                <SelectContent>
                  {predefinedColors.map((colorOption) => (
                    <SelectItem key={colorOption.value} value={colorOption.value}>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: colorOption.value }}
                        />
                        {colorOption.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-icon" className="text-right">
                Ícone
              </Label>
              <Select
                value={editCategory?.icon || "Tag"}
                onValueChange={(value) => setEditCategory(prev => prev ? { ...prev, icon: value } : null)}
                disabled={isLoading}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Selecione um ícone">
                    {editCategory?.icon ? (
                      <div className="flex items-center gap-2">
                        {React.createElement((Icons as any)[editCategory.icon], { className: "h-5 w-5" })}
                        {predefinedIcons.find(icon => icon.name === editCategory.icon)?.label || editCategory.icon}
                      </div>
                    ) : (
                      "Selecione um ícone"
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="max-h-60 overflow-y-auto">
                  {predefinedIcons.map((icon) => {
                    const IconComponent = (Icons as any)[icon.name] || Icons.Tag;
                    return (
                      <SelectItem key={icon.name} value={icon.name}>
                        <div className="flex items-center gap-2">
                          <IconComponent className="h-5 w-5" />
                          {icon.label}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setShowEditDialog(false)} variant="outline" disabled={isLoading}>Cancelar</Button>
            <Button type="submit" onClick={handleEditCategory} disabled={isLoading}>
              {isLoading ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
