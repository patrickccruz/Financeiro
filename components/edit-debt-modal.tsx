'use client';

import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Calendar } from './ui/calendar';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Textarea } from './ui/textarea'; // Importar Textarea

interface Debt {
  id: number;
  description: string;
  amount: number;
  due_date: string;
  status: 'pending' | 'paid' | 'overdue';
  recurrence_type: string;
  recurrence_interval: number | null;
  recurrence_unit: string | null;
  installments: number | null;
  paid_installments: number;
  comments: string | null; // NOVO: Comentários
  tags: string | null;     // NOVO: Tags
}

interface EditDebtModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDebtUpdated: () => void;
  debt: Debt;
}

export function EditDebtModal({ isOpen, onClose, onDebtUpdated, debt }: EditDebtModalProps) {
  const [description, setDescription] = useState(debt.description);
  const [amount, setAmount] = useState(debt.amount.toString());
  const [dueDate, setDueDate] = useState<Date | undefined>(new Date(debt.due_date));
  const [status, setStatus] = useState(debt.status);
  const [recurrenceType, setRecurrenceType] = useState(debt.recurrence_type);
  const [recurrenceInterval, setRecurrenceInterval] = useState<string | number>(debt.recurrence_interval || '');
  const [recurrenceUnit, setRecurrenceUnit] = useState(debt.recurrence_unit || '');
  const [installments, setInstallments] = useState<string | number>(debt.installments || '');
  const [paidInstallments, setPaidInstallments] = useState<string | number>(debt.paid_installments || '');
  const [comments, setComments] = useState(debt.comments || ''); // NOVO: Estado para comentários
  const [tags, setTags] = useState(debt.tags || '');       // NOVO: Estado para tags
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (debt) {
      setDescription(debt.description);
      setAmount(debt.amount.toString());
      setDueDate(new Date(debt.due_date));
      setStatus(debt.status);
      setRecurrenceType(debt.recurrence_type);
      setRecurrenceInterval(debt.recurrence_interval || '');
      setRecurrenceUnit(debt.recurrence_unit || '');
      setInstallments(debt.installments || '');
      setPaidInstallments(debt.paid_installments || '');
      setComments(debt.comments || ''); // Carregar comentários
      setTags(debt.tags || '');         // Carregar tags
    }
  }, [debt]);

  const handleSubmit = async () => {
    if (!description || !amount || !dueDate) {
      alert('Por favor, preencha todos os campos obrigatórios (Descrição, Valor, Vencimento).');
      return;
    }

    setIsLoading(true);
    const token = localStorage.getItem('token');
    if (!token) {
      alert('Token de autenticação não encontrado. Por favor, faça login novamente.');
      setIsLoading(false);
      return;
    }

    const updatedDebtData = {
      description,
      amount: parseFloat(amount as string),
      due_date: dueDate.toISOString().split('T')[0],
      status,
      recurrence_type: recurrenceType,
      recurrence_interval: recurrenceType === 'custom' ? parseInt(recurrenceInterval as string) : null,
      recurrence_unit: recurrenceType === 'custom' ? recurrenceUnit : null,
      installments: recurrenceType === 'installments' ? parseInt(installments as string) : null,
      paid_installments: recurrenceType === 'installments' ? parseInt(paidInstallments as string) : null,
      comments: comments.trim() || null, // Incluir comentários
      tags: tags.trim() || null, // Incluir tags
    };

    try {
      const response = await fetch(`/api/debts/${debt.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(updatedDebtData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Falha ao atualizar dívida.');
      }

      alert('Dívida atualizada com sucesso!');
      onClose();
      onDebtUpdated();
    } catch (error) {
      console.error('Erro ao atualizar dívida:', error);
      alert(`Erro ao atualizar dívida: ${(error as Error).message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Tem certeza que deseja excluir esta dívida? Esta ação é irreversível.')) {
      return;
    }

    setIsLoading(true);
    const token = localStorage.getItem('token');
    if (!token) {
      alert('Token de autenticação não encontrado. Por favor, faça login novamente.');
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch(`/api/debts/${debt.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Falha ao excluir dívida.');
      }

      alert('Dívida excluída com sucesso!');
      onClose();
      onDebtUpdated(); // Recarrega a lista após a exclusão
    } catch (error) {
      console.error('Erro ao excluir dívida:', error);
      alert(`Erro ao excluir dívida: ${(error as Error).message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Editar Dívida</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="description" className="text-right">
              Descrição
            </Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="amount" className="text-right">
              Valor
            </Label>
            <Input
              id="amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="col-span-3"
              type="number"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="dueDate" className="text-right">
              Vencimento
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={ "outline" }
                  className={cn(
                    "w-[240px] pl-3 text-left font-normal col-span-3",
                    !dueDate && "text-muted-foreground"
                  )}
                >
                  {dueDate ? format(dueDate, "PPP") : <span>Selecione a data</span>}
                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dueDate}
                  onSelect={setDueDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="status" className="text-right">
              Status
            </Label>
            <Select onValueChange={setStatus} value={status}>
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Selecionar status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pendente</SelectItem>
                <SelectItem value="paid">Pago</SelectItem>
                <SelectItem value="overdue">Atrasado</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="recurrenceType" className="text-right">
              Recorrência
            </Label>
            <Select onValueChange={setRecurrenceType} value={recurrenceType}>
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Selecionar tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhuma</SelectItem>
                <SelectItem value="monthly">Mensal</SelectItem>
                <SelectItem value="installments">Parcelado</SelectItem>
                <SelectItem value="custom">Personalizado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {recurrenceType === 'custom' && (
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="recurrenceInterval" className="text-right">
                Intervalo
              </Label>
              <Input
                id="recurrenceInterval"
                value={recurrenceInterval}
                onChange={(e) => setRecurrenceInterval(e.target.value)}
                className="col-span-1"
                type="number"
              />
              <Select onValueChange={setRecurrenceUnit} value={recurrenceUnit}>
                <SelectTrigger className="col-span-2">
                  <SelectValue placeholder="Unidade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="day">Dia(s)</SelectItem>
                  <SelectItem value="week">Semana(s)</SelectItem>
                  <SelectItem value="month">Mês(es)</SelectItem>
                  <SelectItem value="year">Ano(s)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {recurrenceType === 'installments' && (
            <>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="installments" className="text-right">
                  Total Parcelas
                </Label>
                <Input
                  id="installments"
                  value={installments}
                  onChange={(e) => setInstallments(e.target.value)}
                  className="col-span-3"
                  type="number"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="paidInstallments" className="text-right">
                  Parcelas Pagas
                </Label>
                <Input
                  id="paidInstallments"
                  value={paidInstallments}
                  onChange={(e) => setPaidInstallments(e.target.value)}
                  className="col-span-3"
                  type="number"
                />
              </div>
            </>
          )}

          {/* NOVO: Campo para Comentários */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="comments" className="text-right">
              Comentários
            </Label>
            <Textarea
              id="comments"
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              className="col-span-3"
              placeholder="Adicione quaisquer notas ou comentários sobre a dívida..."
            />
          </div>

          {/* NOVO: Campo para Tags */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="tags" className="text-right">
              Tags
            </Label>
            <Input
              id="tags"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              className="col-span-3"
              placeholder="Ex: #casa, #urgente, #boleto (separar por vírgula)"
            />
          </div>
        </div>
        <DialogFooter className="flex justify-between">
          <Button variant="destructive" onClick={handleDelete} disabled={isLoading}>
            Excluir Dívida {isLoading && '...'}
          </Button>
          <Button type="submit" onClick={handleSubmit} disabled={isLoading}>Salvar Alterações {isLoading && '...'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
