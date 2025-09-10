'use client';

import { Button } from '@/components/ui/button';
import { Pencil, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { EditDebtModal } from './edit-debt-modal'; // Será criado no próximo passo
import { Badge } from './ui/badge'; // Importar Badge para tags
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
} from "@/components/ui/alert-dialog"; // Importar AlertDialog

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

interface DebtListProps {
  debts: Debt[];
  onDebtUpdated: () => void;
  onDebtDeleted: () => void;
}

export function DebtList({ debts, onDebtUpdated, onDebtDeleted }: DebtListProps) {
  const [showEditDebtModal, setShowEditDebtModal] = useState(false);
  const [selectedDebt, setSelectedDebt] = useState<Debt | null>(null);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false); // Novo estado para o modal de confirmação
  const [debtToDeleteId, setDebtToDeleteId] = useState<number | null>(null); // Novo estado para o ID da dívida a ser excluída

  const handleEditClick = (debt: Debt) => {
    setSelectedDebt(debt);
    setShowEditDebtModal(true);
  };

  const handleDeleteClick = (debtId: number) => {
    setDebtToDeleteId(debtId);
    setShowDeleteConfirmModal(true);
  };

  const confirmDelete = async () => {
    if (debtToDeleteId === null) return;

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Token de autenticação não encontrado.');
      }

      const response = await fetch(`/api/debts/${debtToDeleteId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Falha ao excluir dívida.');
      }

      onDebtDeleted(); // Atualiza a lista após a exclusão
      alert('Dívida excluída com sucesso!');
    } catch (error) {
      console.error('Erro ao excluir dívida:', error);
      alert(`Erro ao excluir dívida: ${(error as Error).message}`);
    } finally {
      setShowDeleteConfirmModal(false);
      setDebtToDeleteId(null);
    }
  };

  return (
    <div>
      {debts.map((debt) => (
        <div key={debt.id} className="border-b py-4 flex justify-between items-center">
          <div>
            <p className="font-medium text-lg">{debt.description} - R$ {parseFloat(debt.amount.toString()).toFixed(2)}</p>
            <p className="text-sm text-gray-500">Vence em: {new Date(debt.due_date).toLocaleDateString('pt-BR')}</p>
            <p className={`text-sm ${debt.status === 'pending' ? 'text-yellow-500' : debt.status === 'paid' ? 'text-green-500' : 'text-red-500'}`}>
              Status: {debt.status === 'pending' ? 'Pendente' : debt.status === 'paid' ? 'Pago' : 'Atrasado'}
            </p>
            {debt.comments && (
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Comentários: {debt.comments}</p>
            )}
            {debt.tags && ( // Renderizar tags como badges
              <div className="flex flex-wrap gap-1 mt-1">
                {debt.tags.split(',').map((tag, index) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    {tag.trim()}
                  </Badge>
                ))}
              </div>
            )}
          </div>
          <div className="flex space-x-2">
            <Button variant="outline" size="sm" onClick={() => handleEditClick(debt)}>
              <Pencil className="h-4 w-4 mr-2" /> Editar
            </Button>
            {/* Botão de Excluir */}
            <Button variant="destructive" size="sm" onClick={() => handleDeleteClick(debt.id)}> 
                <Trash2 className="h-4 w-4 mr-2" /> Excluir
            </Button>
          </div>
        </div>
      ))}

      {selectedDebt && (
        <EditDebtModal
          isOpen={showEditDebtModal}
          onClose={() => setShowEditDebtModal(false)}
          onDebtUpdated={() => { onDebtUpdated(); setShowEditDebtModal(false); }}
          debt={selectedDebt}
        />
      )}

      <AlertDialog open={showDeleteConfirmModal} onOpenChange={setShowDeleteConfirmModal}> {/* Modal de confirmação */}
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem certeza absoluta?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Isso excluirá permanentemente sua dívida de nossos servidores.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Continuar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
