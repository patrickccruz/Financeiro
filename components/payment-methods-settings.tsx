"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
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
import { CreditCard, Plus, Edit, Trash2, Banknote, Smartphone } from "lucide-react"
import { useRouter } from "next/navigation" // Importar useRouter

interface PaymentMethod {
  id: number; // Alterado para number
  type: "credit" | "debit" | "cash" | "pix";
  name: string;
  last_four?: string; // Alterado para last_four
  limit?: number; // Alterado para number
  is_active: boolean; // Alterado para is_active
  is_default: boolean; // Alterado para is_default
}

export function PaymentMethodsSettings() {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]) // Começa vazio
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [methodToEdit, setMethodToEdit] = useState<PaymentMethod | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [methodToDelete, setMethodToDelete] = useState<number | null>(null) // ID agora é number
  const [newMethod, setNewMethod] = useState({
    type: "credit" as const,
    name: "",
    last_four: "", // Alterado para last_four
    limit: "",
    is_default: false, // Adicionado is_default
  })

  const router = useRouter(); // Inicializar useRouter

  const fetchPaymentMethods = async () => {
    setIsLoading(true);
    setError(null);
    const token = localStorage.getItem("token");
    if (!token) {
      setError("Token de autenticação não encontrado.");
      setIsLoading(false);
      return;
    }
    try {
      const response = await fetch("http://localhost:5000/api/payment-methods", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        throw new Error("Falha ao buscar métodos de pagamento.");
      }
      const data: PaymentMethod[] = await response.json();
      setPaymentMethods(data);
    } catch (err) {
      console.error("Erro ao buscar métodos de pagamento:", err);
      setError((err as Error).message || "Erro ao carregar métodos de pagamento.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPaymentMethods();
  }, []);

  const getMethodIcon = (type: string) => {
    switch (type) {
      case "credit":
      case "debit":
        return <CreditCard className="h-5 w-5" />
      case "cash":
        return <Banknote className="h-5 w-5" />
      case "pix":
        return <Smartphone className="h-5 w-5" />
      default:
        return <CreditCard className="h-5 w-5" />
    }
  }

  const getMethodLabel = (type: string) => {
    switch (type) {
      case "credit":
        return "Cartão de Crédito"
      case "debit":
        return "Cartão de Débito"
      case "cash":
        return "Dinheiro"
      case "pix":
        return "PIX"
      default:
        return type
    }
  }

  const handleAddMethod = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      setError("Token de autenticação não encontrado.");
      return;
    }

    try {
      const response = await fetch("http://localhost:5000/api/payment-methods", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          type: newMethod.type,
          name: newMethod.name,
          last_four: newMethod.last_four || null,
          limit: newMethod.limit ? parseFloat(newMethod.limit) : null,
          is_default: newMethod.is_default,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Falha ao adicionar método de pagamento");
      }

      console.log("Método de pagamento adicionado com sucesso!");
      fetchPaymentMethods(); // Atualiza a lista
      setNewMethod({ type: "credit", name: "", last_four: "", limit: "", is_default: false });
      setShowAddDialog(false);
      router.refresh(); // Força a atualização do dashboard e outras rotas
    } catch (err) {
      console.error("Erro ao adicionar método:", err);
      setError((err as Error).message || "Erro ao adicionar método de pagamento.");
    }
  };

  const handleEditMethod = (method: PaymentMethod) => {
    setMethodToEdit(method);
    // Preencher o formulário de edição com os dados do método
    setNewMethod({
      type: method.type,
      name: method.name,
      last_four: method.last_four || "",
      limit: method.limit?.toString() || "",
      is_default: method.is_default,
    });
    setShowEditDialog(true);
  };

  const confirmEdit = async () => {
    if (!methodToEdit) return;

    const token = localStorage.getItem("token");
    if (!token) {
      setError("Token de autenticação não encontrado.");
      return;
    }

    try {
      const response = await fetch(`http://localhost:5000/api/payment-methods/${methodToEdit.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          type: newMethod.type,
          name: newMethod.name,
          last_four: newMethod.last_four || null,
          limit: newMethod.limit ? parseFloat(newMethod.limit) : null,
          is_active: methodToEdit.is_active, // Manter o status ativo atual
          is_default: newMethod.is_default, // Usar o novo status padrão do formulário
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Falha ao atualizar método de pagamento");
      }

      console.log("Método de pagamento atualizado com sucesso!");
      fetchPaymentMethods(); // Atualiza a lista
      setMethodToEdit(null);
      setNewMethod({ type: "credit", name: "", last_four: "", limit: "", is_default: false });
      setShowEditDialog(false);
      router.refresh(); // Força a atualização do dashboard e outras rotas
    } catch (err) {
      console.error("Erro ao atualizar método:", err);
      setError((err as Error).message || "Erro ao atualizar método de pagamento.");
    }
  };

  const handleDeleteMethod = (id: number) => {
    setMethodToDelete(id)
    setShowDeleteDialog(true)
  }

  const confirmDelete = async () => {
    if (methodToDelete === null) return;

    const token = localStorage.getItem("token");
    if (!token) {
      setError("Token de autenticação não encontrado.");
      return;
    }

    try {
      const response = await fetch(`http://localhost:5000/api/payment-methods/${methodToDelete}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Falha ao deletar método de pagamento");
      }

      console.log("Método de pagamento deletado com sucesso!");
      fetchPaymentMethods(); // Atualiza a lista
      setMethodToDelete(null);
      setShowDeleteDialog(false);
      router.refresh(); // Força a atualização do dashboard e outras rotas
    } catch (err) {
      console.error("Erro ao deletar método:", err);
      setError((err as Error).message || "Erro ao deletar método de pagamento.");
    }
  };

  const toggleMethodStatus = async (method: PaymentMethod) => {
    const token = localStorage.getItem("token");
    if (!token) {
      setError("Token de autenticação não encontrado.");
      return;
    }

    try {
      const response = await fetch(`http://localhost:5000/api/payment-methods/${method.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ ...method, is_active: !method.is_active }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Falha ao atualizar status do método");
      }
      console.log("Status do método atualizado com sucesso!");
      fetchPaymentMethods(); // Atualiza a lista
      router.refresh(); // Força a atualização do dashboard e outras rotas
    } catch (err) {
      console.error("Erro ao alternar status do método:", err);
      setError((err as Error).message || "Erro ao alternar status do método.");
    }
  };

  const setAsDefault = async (method: PaymentMethod) => {
    const token = localStorage.getItem("token");
    if (!token) {
      setError("Token de autenticação não encontrado.");
      return;
    }

    try {
      const response = await fetch(`http://localhost:5000/api/payment-methods/${method.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ ...method, is_default: true, type: method.type }), // Incluir o tipo do método
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Falha ao definir como padrão");
      }

      console.log("Método definido como padrão com sucesso!");
      fetchPaymentMethods(); // Atualiza a lista
      router.refresh(); // Força a atualização do dashboard e outras rotas
    } catch (err) {
      console.error("Erro ao definir como padrão:", err);
      setError((err as Error).message || "Erro ao definir método como padrão.");
    }
  };

  if (isLoading) {
    return <p>Carregando métodos de pagamento...</p>;
  }

  if (error) {
    return <p className="text-red-500">Erro: {error}</p>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Métodos de Pagamento</CardTitle>
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Adicionar Método
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Adicionar Método de Pagamento</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="type">Tipo</Label>
                  <select
                    id="type"
                    value={newMethod.type}
                    onChange={(e) => setNewMethod({ ...newMethod, type: e.target.value as any })}
                    className="w-full p-2 border rounded-md"
                  >
                    <option value="credit">Cartão de Crédito</option>
                    <option value="debit">Cartão de Débito</option>
                    <option value="cash">Dinheiro</option>
                    <option value="pix">PIX</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="name">Nome</Label>
                  <Input
                    id="name"
                    placeholder="Ex: Cartão Nubank, Conta Itaú..."
                    value={newMethod.name}
                    onChange={(e) => setNewMethod({ ...newMethod, name: e.target.value })}
                  />
                </div>

                {(newMethod.type === "credit" || newMethod.type === "debit") && (
                  <div className="space-y-2">
                    <Label htmlFor="last_four">Últimos 4 dígitos</Label>
                    <Input
                      id="last_four"
                      placeholder="1234"
                      maxLength={4}
                      value={newMethod.last_four}
                      onChange={(e) => setNewMethod({ ...newMethod, last_four: e.target.value })}
                    />
                  </div>
                )}

                {newMethod.type === "credit" && (
                  <div className="space-y-2">
                    <Label htmlFor="limit">Limite (R$)</Label>
                    <Input
                      id="limit"
                      type="number"
                      placeholder="2000.00"
                      value={newMethod.limit}
                      onChange={(e) => setNewMethod({ ...newMethod, limit: e.target.value })}
                    />
                  </div>
                )}

                <div className="flex items-center space-x-2">
                  <Switch
                    id="is_default_add"
                    checked={newMethod.is_default}
                    onCheckedChange={(checked) => setNewMethod({ ...newMethod, is_default: checked })}
                  />
                  <Label htmlFor="is_default_add">Definir como padrão</Label>
                </div>

                <div className="flex space-x-2 pt-4">
                  <Button variant="outline" onClick={() => setShowAddDialog(false)} className="flex-1 bg-transparent">
                    Cancelar
                  </Button>
                  <Button onClick={handleAddMethod} className="flex-1" disabled={!newMethod.name}>
                    Adicionar
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {paymentMethods.length === 0 ? (
              <p className="text-muted-foreground">Nenhum método de pagamento cadastrado.</p>
            ) : (
              paymentMethods.map((method) => (
                <div key={method.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="p-2 bg-muted rounded-full">{getMethodIcon(method.type)}</div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <p className="font-medium">{method.name}</p>
                        {method.is_default && <Badge variant="default">Padrão</Badge>}
                        {!method.is_active && <Badge variant="secondary">Inativo</Badge>}
                      </div>
                      <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                        <span>{getMethodLabel(method.type)}</span>
                        {method.last_four && (
                          <>
                            <span>•</span>
                            <span>****{method.last_four}</span>
                          </>
                        )}
                        {method.limit !== null && method.limit !== undefined && (
                          <>
                            <span>•</span>
                            <span>Limite: R$ {method.limit.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="flex items-center space-x-2">
                      <Label htmlFor={`active-${method.id}`} className="text-sm">
                        Ativo
                      </Label>
                      <Switch
                        id={`active-${method.id}`}
                        checked={method.is_active}
                        onCheckedChange={() => toggleMethodStatus(method)}
                      />
                    </div>
                    {!method.is_default && method.is_active && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setAsDefault(method)}
                        className="bg-transparent"
                      >
                        Definir como Padrão
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" onClick={() => handleEditMethod(method)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteMethod(method.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Dialog para Edição de Método de Pagamento */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Método de Pagamento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="type_edit">Tipo</Label>
              <select
                id="type_edit"
                value={newMethod.type}
                onChange={(e) => setNewMethod({ ...newMethod, type: e.target.value as any })}
                className="w-full p-2 border rounded-md"
              >
                <option value="credit">Cartão de Crédito</option>
                <option value="debit">Cartão de Débito</option>
                <option value="cash">Dinheiro</option>
                <option value="pix">PIX</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name_edit">Nome</Label>
              <Input
                id="name_edit"
                placeholder="Ex: Cartão Nubank, Conta Itaú..."
                value={newMethod.name}
                onChange={(e) => setNewMethod({ ...newMethod, name: e.target.value })}
              />
            </div>

            {(newMethod.type === "credit" || newMethod.type === "debit") && (
              <div className="space-y-2">
                <Label htmlFor="last_four_edit">Últimos 4 dígitos</Label>
                <Input
                  id="last_four_edit"
                  placeholder="1234"
                  maxLength={4}
                  value={newMethod.last_four}
                  onChange={(e) => setNewMethod({ ...newMethod, last_four: e.target.value })}
                />
              </div>
            )}

            {newMethod.type === "credit" && (
              <div className="space-y-2">
                <Label htmlFor="limit_edit">Limite (R$)</Label>
                <Input
                  id="limit_edit"
                  type="number"
                  placeholder="2000.00"
                  value={newMethod.limit}
                  onChange={(e) => setNewMethod({ ...newMethod, limit: e.target.value })}
                />
              </div>
            )}

            <div className="flex items-center space-x-2">
              <Switch
                id="is_default_edit"
                checked={newMethod.is_default}
                onCheckedChange={(checked) => setNewMethod({ ...newMethod, is_default: checked })}
              />
              <Label htmlFor="is_default_edit">Definir como padrão</Label>
            </div>

            <div className="flex space-x-2 pt-4">
              <Button variant="outline" onClick={() => setShowEditDialog(false)} className="flex-1 bg-transparent">
                Cancelar
              </Button>
              <Button onClick={confirmEdit} className="flex-1" disabled={!newMethod.name}>
                Salvar Alterações
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Método de Pagamento</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este método de pagamento? Esta ação não pode ser desfeita.
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
    </div>
  )
}
