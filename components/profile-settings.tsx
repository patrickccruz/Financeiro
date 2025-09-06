"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { User, Mail, Phone, MapPin } from "lucide-react"
import { toast } from "sonner"; // Importar toast para notificações
import { useRouter } from "next/navigation"; // Importar useRouter para redirecionamento
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export function ProfileSettings() {
  const [profile, setProfile] = useState({
    username: typeof window !== "undefined" ? localStorage.getItem("username") || "" : "",
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPassword, setCurrentPassword] = useState(""); // Novo estado para senha atual
  const [newPassword, setNewPassword] = useState(""); // Novo estado para nova senha
  const [showDeleteModal, setShowDeleteModal] = useState(false); // Novo estado para controlar o modal de exclusão
  const [confirmPassword, setConfirmPassword] = useState(""); // Novo estado para a senha de confirmação
  const router = useRouter(); // Inicializar o router

  const fetchProfile = async () => {
    setIsLoading(true);
    setError(null);
    const token = localStorage.getItem("token");
    if (!token) {
      setError("Token de autenticação não encontrado.");
      setIsLoading(false);
      return;
    }
    try {
      const response = await fetch("http://localhost:5000/api/profile", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        throw new Error("Falha ao buscar perfil.");
      }
      const data = await response.json();
      setProfile({ username: data.username });
    } catch (err) {
      console.error("Erro ao buscar perfil:", err);
      setError((err as Error).message || "Erro ao carregar perfil.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleSave = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      setError("Token de autenticação não encontrado.");
      return;
    }

    try {
      const response = await fetch("http://localhost:5000/api/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ username: profile.username }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Falha ao atualizar perfil");
      }

      const updatedUser = await response.json();
      localStorage.setItem("username", updatedUser.user.username); // Atualiza o localStorage
      fetchProfile(); // Re-busca para garantir consistência
      console.log("Perfil atualizado com sucesso!");
    } catch (err) {
      console.error("Erro ao salvar perfil:", err);
      setError((err as Error).message || "Erro ao salvar perfil.");
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword) {
      setError("Por favor, preencha a senha atual e a nova senha.");
      return;
    }

    setIsLoading(true);
    setError(null);
    const token = localStorage.getItem("token");
    if (!token) {
      setError("Token de autenticação não encontrado.");
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch("http://localhost:5000/api/profile/change-password", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Falha ao alterar senha.");
      }
      toast.success("Senha alterada com sucesso!");
      setCurrentPassword("");
      setNewPassword("");
    } catch (err) {
      console.error("Erro ao alterar senha:", err);
      setError((err as Error).message || "Erro ao alterar senha.");
      toast.error((err as Error).message || "Erro ao alterar senha.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!confirmPassword) {
      setError("Por favor, digite sua senha de confirmação.");
      return;
    }

    setIsLoading(true);
    setError(null);
    const token = localStorage.getItem("token");
    if (!token) {
      setError("Token de autenticação não encontrado.");
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch("http://localhost:5000/api/profile/delete", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ password: confirmPassword }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Falha ao excluir dados da conta.");
      }
      toast.success("Dados financeiros e categorias apagados com sucesso! Sua conta de usuário foi mantida.");
      fetchProfile(); // Recarrega o perfil para garantir consistência
    } catch (err) {
      console.error("Erro ao excluir conta:", err);
      setError((err as Error).message || "Erro ao excluir dados da conta.");
      toast.error((err as Error).message || "Erro ao excluir dados da conta.");
    } finally {
      setIsLoading(false);
      setShowDeleteModal(false); // Fechar o modal após a tentativa (sucesso ou falha)
      setConfirmPassword(""); // Limpa a senha de confirmação
    }
  };

  if (isLoading) {
    return <p>Carregando configurações de perfil...</p>;
  }

  if (error) {
    return <p className="text-red-500">Erro: {error}</p>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Informações do Perfil</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Removido: Opção de alterar foto */}
        {/* <div className="flex items-center space-x-4">
          <Avatar className="h-20 w-20">
            <AvatarImage src="/placeholder.svg?height=80&width=80" />
            <AvatarFallback className="text-lg">
              {profile.username
                .split(" ")
                .map((n) => n[0])
                .join("")}
            </AvatarFallback>
          </Avatar>
          <Button variant="outline" className="bg-transparent">
            Alterar Foto
          </Button>
        </div> */}

        <div className="grid gap-4">
          <div className="space-y-2">
            <Label htmlFor="username">Usuário</Label>
            <div className="relative">
              <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="username"
                value={profile.username}
                onChange={(e) => setProfile({ ...profile, username: e.target.value })}
                className="pl-10"
              />
            </div>
          </div>
          {/* Os campos de Email, Telefone e Endereço não são suportados pelo backend atual */}
          {/* <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                value={profile.email}
                onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                className="pl-10"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Telefone</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="phone"
                value={profile.phone}
                onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                className="pl-10"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Endereço</Label>
            <div className="relative">
              <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="address"
                value={profile.address}
                onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                className="pl-10"
              />
            </div>
          </div> */}
        </div>

        <Button onClick={handleSave} disabled={isLoading}>Salvar Alterações</Button>

        <div className="grid gap-4 pt-6">
          <CardTitle>Alterar Senha</CardTitle>
          <div className="space-y-2">
            <Label htmlFor="current-password">Senha Atual</Label>
            <Input
              id="current-password"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              disabled={isLoading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-password">Nova Senha</Label>
            <Input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              disabled={isLoading}
            />
          </div>
          <Button onClick={handleChangePassword} disabled={isLoading} className="w-fit">
            {isLoading ? "Alterando..." : "Alterar Senha"}
          </Button>
        </div>

        <div className="grid gap-4 pt-6">
          <CardTitle className="text-red-600">Apagar Dados da Conta</CardTitle>
          <AlertDialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="w-fit">Apagar Dados</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Você tem certeza absoluta?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta ação não pode ser desfeita. Isso excluirá permanentemente seus dados financeiros
                  e removerá seus dados de nossos servidores.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="grid gap-4">
                <Label htmlFor="confirm-password">Digite sua senha para confirmar</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={isLoading}
                />
              </div>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteAccount}
                  disabled={isLoading || confirmPassword === ""}
                  className="bg-red-600 hover:bg-red-700"
                >
                  {isLoading ? "Apagando..." : "Confirmar Exclusão"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  )
}
