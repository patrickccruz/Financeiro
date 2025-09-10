'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { AddDebtModal } from '@/components/add-debt-modal';
import { DebtList } from '@/components/debt-list';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'; // Importar Select
import { Input } from '@/components/ui/input'; // Importar Input

export default function DebtsPage() {
  const [showAddDebtModal, setShowAddDebtModal] = useState(false);
  const [debts, setDebts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterMonth, setFilterMonth] = useState<string>(''); // NOVO: Estado para filtro por mês
  const [filterYear, setFilterYear] = useState<string>(new Date().getFullYear().toString()); // NOVO: Estado para filtro por ano (ano atual como padrão)
  const [filterWeek, setFilterWeek] = useState<string>(''); // NOVO: Estado para filtro por semana

  const fetchDebts = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Token de autenticação não encontrado.');
      }

      // Construir query params para os filtros
      const queryParams = new URLSearchParams();
      if (filterMonth) {
        queryParams.append('month', filterMonth);
      }
      if (filterYear) {
        queryParams.append('year', filterYear);
      }
      if (filterWeek) {
        queryParams.append('week', filterWeek);
      }

      const url = `/api/debts${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Falha ao buscar dívidas.');
      }
      const data = await response.json();
      setDebts(data);
    } catch (err) {
      console.error('Erro ao buscar dívidas:', err);
      setError(`Erro ao carregar dívidas: ${(err as Error).message}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDebts();
  }, [filterMonth, filterYear, filterWeek]); // Re-fetch ao mudar os filtros

  const months = [
    { value: '1', label: 'Janeiro' },
    { value: '2', label: 'Fevereiro' },
    { value: '3', label: 'Março' },
    { value: '4', label: 'Abril' },
    { value: '5', label: 'Maio' },
    { value: '6', label: 'Junho' },
    { value: '7', label: 'Julho' },
    { value: '8', label: 'Agosto' },
    { value: '9', label: 'Setembro' },
    { value: '10', label: 'Outubro' },
    { value: '11', label: 'Novembro' },
    { value: '12', label: 'Dezembro' },
  ];

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(year => ({
    value: year.toString(),
    label: year.toString(),
  }));

  const weeks = Array.from({ length: 53 }, (_, i) => i + 1).map(week => ({
    value: week.toString(),
    label: `Semana ${week}`,
  }));

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Gerenciar Dívidas</h2>
        <div className="flex items-center space-x-2">
          <Button onClick={() => setShowAddDebtModal(true)}>
            <PlusCircle className="mr-2 h-4 w-4" /> Adicionar Nova Dívida
          </Button>
        </div>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Minhas Dívidas</CardTitle>
          <div className="flex flex-wrap items-center gap-4 mt-4">
            {/* Filtro por Mês */}
            <Select onValueChange={setFilterMonth} value={filterMonth}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filtrar por Mês" />
              </SelectTrigger>
              <SelectContent>
                {months.map(month => (
                  <SelectItem key={month.value} value={month.value}>{month.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Filtro por Ano */}
            <Select onValueChange={setFilterYear} value={filterYear}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Filtrar por Ano" />
              </SelectTrigger>
              <SelectContent>
                {years.map(year => (
                  <SelectItem key={year.value} value={year.value}>{year.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Filtro por Semana */}
            <Select onValueChange={setFilterWeek} value={filterWeek}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Filtrar por Semana" />
              </SelectTrigger>
              <SelectContent>
                {weeks.map(week => (
                  <SelectItem key={week.value} value={week.value}>{week.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p>Carregando dívidas...</p>
          ) : error ? (
            <p className="text-red-500">{error}</p>
          ) : debts.length === 0 ? (
            <p>Nenhuma dívida cadastrada. Adicione uma nova dívida para começar.</p>
          ) : (
            <DebtList debts={debts} onDebtUpdated={fetchDebts} onDebtDeleted={fetchDebts} />
          )}
        </CardContent>
      </Card>

      <AddDebtModal
        isOpen={showAddDebtModal}
        onClose={() => setShowAddDebtModal(false)}
        onDebtSaved={() => { fetchDebts(); setShowAddDebtModal(false); }}
      />
    </DashboardLayout>
  );
}
