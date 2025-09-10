'use client';

import React, { useState } from 'react';
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

interface AddDebtModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDebtSaved: () => void;
}

export function AddDebtModal({ isOpen, onClose, onDebtSaved }: AddDebtModalProps) {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState<Date | undefined>(undefined);
  const [recurrenceType, setRecurrenceType] = useState('none'); // none, monthly, custom, installments
  const [recurrenceInterval, setRecurrenceInterval] = useState<string | number>('');
  const [recurrenceUnit, setRecurrenceUnit] = useState(''); // day, week, month, year
  const [installments, setInstallments] = useState<string | number>('');
  const [comments, setComments] = useState(''); // NOVO: Estado para comentários
  const [tags, setTags] = useState(''); // NOVO: Estado para tags
  const [isLoading, setIsLoading] = useState(false);

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

    const debtData = {
      description,
      amount: parseFloat(amount as string),
      due_date: dueDate.toISOString().split('T')[0],
      recurrence_type: recurrenceType,
      recurrence_interval: recurrenceType === 'custom' ? parseInt(recurrenceInterval as string) : null,
      recurrence_unit: recurrenceType === 'custom' ? recurrenceUnit : null,
      installments: recurrenceType === 'installments' ? parseInt(installments as string) : null,
      comments: comments.trim() || null, // Incluir comentários
      tags: tags.trim() || null, // Incluir tags
    };

    try {
      const response = await fetch('/api/debts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(debtData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Falha ao adicionar dívida.');
      }

      alert('Dívida adicionada com sucesso!');
      onClose();
      onDebtSaved();
      // Resetar estado do formulário
      setDescription('');
      setAmount('');
      setDueDate(undefined);
      setRecurrenceType('none');
      setRecurrenceInterval('');
      setRecurrenceUnit('');
      setInstallments('');
      setComments(''); // Resetar comentários
      setTags(''); // Resetar tags
    } catch (error) {
      console.error('Erro ao salvar dívida:', error);
      alert(`Erro ao salvar dívida: ${(error as Error).message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Adicionar Nova Dívida</DialogTitle>
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
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="installments" className="text-right">
                Parcelas
              </Label>
              <Input
                id="installments"
                value={installments}
                onChange={(e) => setInstallments(e.target.value)}
                className="col-span-3"
                type="number"
              />
            </div>
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
        <DialogFooter>
          <Button type="submit" onClick={handleSubmit} disabled={isLoading}>Salvar Dívida {isLoading && '...'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
