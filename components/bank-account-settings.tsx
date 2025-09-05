"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Plus, Banknote, Landmark } from "lucide-react"
import { useRouter } from "next/navigation"

interface BankAccount {
  id: number;
  name: string;
  initial_balance: number;
  current_balance: number;
  is_default: boolean;
}

export function BankAccountSettings() {
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newAccount, setNewAccount] = useState({
    name: "",
    initial_balance: "",
    is_default: false,
  });

  const router = useRouter();

  const fetchBankAccounts = async () => {
    setIsLoading(true);
    setError(null);
    const token = localStorage.getItem("token");
    if (!token) {
      setError("Token de autenticação não encontrado.");
      setIsLoading(false);
      return;
    }
    try {
      const response = await fetch("http://localhost:5000/api/bank-accounts", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        throw new Error("Falha ao buscar contas bancárias.");
      }
      const data: BankAccount[] = await response.json();
      setBankAccounts(data);
    } catch (err) {
      console.error("Erro ao buscar contas bancárias:", err);
      setError((err as Error).message || "Erro ao carregar contas bancárias.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBankAccounts();
  }, []);

  const handleAddAccount = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      setError("Token de autenticação não encontrado.");
      return;
    }

    try {
      const response = await fetch("http://localhost:5000/api/bank-accounts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: newAccount.name,
          initial_balance: newAccount.initial_balance ? parseFloat(newAccount.initial_balance) : 0.00,
          is_default: newAccount.is_default,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Falha ao adicionar conta bancária");
      }

      console.log("Conta bancária adicionada com sucesso!");
      fetchBankAccounts(); // Atualiza a lista
      setNewAccount({ name: "", initial_balance: "", is_default: false });
      setShowAddDialog(false);
      router.refresh(); // Força a atualização do dashboard e outras rotas
    } catch (err) {
      console.error("Erro ao adicionar conta bancária:", err);
      setError((err as Error).message || "Erro ao adicionar conta bancária.");
    }
  };

  const setAsDefault = async (account: BankAccount) => {
    const token = localStorage.getItem("token");
    if (!token) {
      setError("Token de autenticação não encontrado.");
      return;
    }

    try {
      const response = await fetch(`http://localhost:5000/api/bank-accounts/${account.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ ...account, is_default: true }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Falha ao definir como padrão");
      }

      console.log("Conta bancária definida como padrão com sucesso!");
      fetchBankAccounts(); // Atualiza a lista
      router.refresh(); // Força a atualização do dashboard e outras rotas
    } catch (err) {
      console.error("Erro ao definir como padrão:", err);
      setError((err as Error).message || "Erro ao definir conta bancária como padrão.");
    }
  };


  if (isLoading) {
    return <p>Carregando contas bancárias...</p>;
  }

  if (error) {
    return <p className="text-red-500">Erro: {error}</p>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Contas Bancárias</CardTitle>
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Adicionar Conta
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Adicionar Conta Bancária</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome da Conta</Label>
                  <Input
                    id="name"
                    placeholder="Ex: Conta Corrente, Poupança..."
                    value={newAccount.name}
                    onChange={(e) => setNewAccount({ ...newAccount, name: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="initial_balance">Saldo Inicial (R$)</Label>
                  <Input
                    id="initial_balance"
                    type="number"
                    placeholder="1000.00"
                    value={newAccount.initial_balance}
                    onChange={(e) => setNewAccount({ ...newAccount, initial_balance: e.target.value })}
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="is_default_add_account"
                    checked={newAccount.is_default}
                    onCheckedChange={(checked) => setNewAccount({ ...newAccount, is_default: checked })}
                  />
                  <Label htmlFor="is_default_add_account">Definir como padrão</Label>
                </div>

                <div className="flex space-x-2 pt-4">
                  <Button variant="outline" onClick={() => setShowAddDialog(false)} className="flex-1 bg-transparent">
                    Cancelar
                  </Button>
                  <Button onClick={handleAddAccount} className="flex-1" disabled={!newAccount.name}>
                    Adicionar
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {bankAccounts.length === 0 ? (
              <p className="text-muted-foreground">Nenhuma conta bancária cadastrada.</p>
            ) : (
              bankAccounts.map((account) => (
                <div key={account.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="p-2 bg-muted rounded-full"><Landmark className="h-5 w-5" /></div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <p className="font-medium">{account.name}</p>
                        {account.is_default && <Badge variant="default">Padrão</Badge>}
                      </div>
                      <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                        <span>Saldo Atual: R$ {account.current_balance.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {!account.is_default && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setAsDefault(account)}
                        className="bg-transparent"
                      >
                        Definir como Padrão
                      </Button>
                    )}
                    {/* Botões de editar e deletar serão adicionados depois, se necessário */}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
