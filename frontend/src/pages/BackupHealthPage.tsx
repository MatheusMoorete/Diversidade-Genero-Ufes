import React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { Button } from '@/components/shared/Button';
import { queryKeys } from '@/config/queryKeys';
import { useToast } from '@/hooks/useToast';
import { backupService } from '@/services/api';

const formatDate = (value?: string | null) => {
  if (!value) return 'Nao informado';

  try {
    return format(parseISO(value), "dd/MM/yyyy 'as' HH:mm", { locale: ptBR });
  } catch {
    return value;
  }
};

export const BackupHealthPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: queryKeys.backup.neonStatus(),
    queryFn: () => backupService.getNeonStatus(),
    staleTime: 1000 * 60,
  });

  const snapshotMutation = useMutation({
    mutationFn: () => backupService.createNeonSnapshot(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.backup.all });
      showToast('Snapshot do Neon criado com sucesso.', 'success');
    },
    onError: (error: any) => {
      showToast(
        `Erro ao criar snapshot: ${error.response?.data?.detail || error.message}`,
        'error'
      );
    },
  });

  const backupStatus = data ?? {
    configured: false,
    healthy: false,
    checked_at: '',
    retention_days: 0,
    max_age_hours: 0,
    recent_snapshots: [],
    issues: [],
    latest_snapshot: null,
    latest_snapshot_age_hours: null,
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:py-12 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-3">Seguranca do Backup</h1>
            <p className="text-gray-500 text-lg">
              Estado dos snapshots do Neon e checklist operacional da TI.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button
              variant="outline"
              className="border-gray-300 text-gray-700 hover:bg-gray-100"
              onClick={() => refetch()}
              isLoading={isRefetching}
            >
              Atualizar status
            </Button>
            <Button
              variant="outline"
              className="border-emerald-300 text-emerald-700 hover:bg-emerald-50"
              onClick={() => snapshotMutation.mutate()}
              isLoading={snapshotMutation.isPending}
            >
              Criar snapshot agora
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="bg-white rounded-xl border border-gray-200 p-10 text-center text-gray-500">
            Carregando status do Neon...
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <p className="text-sm font-medium text-gray-500 mb-2">Saude atual</p>
                <div className="flex items-center gap-3">
                  <span className={`w-3 h-3 rounded-full ${backupStatus.healthy ? 'bg-emerald-500' : 'bg-red-500'}`} />
                  <p className="text-2xl font-semibold text-gray-900">
                    {backupStatus.healthy ? 'Saudavel' : 'Atencao'}
                  </p>
                </div>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <p className="text-sm font-medium text-gray-500 mb-2">Ultimo snapshot</p>
                <p className="text-xl font-semibold text-gray-900">
                  {formatDate(backupStatus.latest_snapshot?.created_at)}
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  Idade: {backupStatus.latest_snapshot_age_hours != null ? `${backupStatus.latest_snapshot_age_hours}h` : 'Nao disponivel'}
                </p>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <p className="text-sm font-medium text-gray-500 mb-2">Retencao</p>
                <p className="text-xl font-semibold text-gray-900">
                  {backupStatus.retention_days} dias
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  Tolerancia maxima: {backupStatus.max_age_hours}h sem snapshot
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center justify-between gap-3 mb-5">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">Snapshots recentes</h2>
                    <p className="text-sm text-gray-500 mt-1">
                      Ultima verificacao: {formatDate(backupStatus.checked_at)}
                    </p>
                  </div>
                  <span className="px-3 py-1 text-sm rounded-full bg-gray-100 text-gray-700">
                    {backupStatus.recent_snapshots.length} encontrados
                  </span>
                </div>

                {!backupStatus.configured ? (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                    A integracao com o Neon ainda nao foi configurada neste ambiente.
                  </div>
                ) : backupStatus.recent_snapshots.length === 0 ? (
                  <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                    Nenhum snapshot foi encontrado para a branch principal da pesquisa.
                  </div>
                ) : (
                  <div className="overflow-hidden rounded-lg border border-gray-200">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 text-gray-600">
                        <tr>
                          <th className="text-left px-4 py-3 font-medium">Nome</th>
                          <th className="text-left px-4 py-3 font-medium">Criado em</th>
                          <th className="text-left px-4 py-3 font-medium">Expira em</th>
                        </tr>
                      </thead>
                      <tbody>
                        {backupStatus.recent_snapshots.map((snapshot) => (
                          <tr key={snapshot.id || snapshot.name} className="border-t border-gray-200">
                            <td className="px-4 py-3 text-gray-800">{snapshot.name || snapshot.id || 'Snapshot'}</td>
                            <td className="px-4 py-3 text-gray-600">{formatDate(snapshot.created_at)}</td>
                            <td className="px-4 py-3 text-gray-600">{formatDate(snapshot.expires_at)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="space-y-6">
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">Alertas</h2>
                  {backupStatus.issues.length > 0 ? (
                    <div className="space-y-3">
                      {backupStatus.issues.map((issue) => (
                        <div key={issue} className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                          {issue}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
                      Nenhum alerta aberto no momento.
                    </div>
                  )}
                </div>

                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">Configuracao</h2>
                  <div className="space-y-3 text-sm text-gray-600">
                    <p><span className="font-medium text-gray-900">Projeto:</span> {backupStatus.project_id || 'Nao configurado'}</p>
                    <p><span className="font-medium text-gray-900">Branch:</span> {backupStatus.branch_id || 'Nao configurado'}</p>
                    <p><span className="font-medium text-gray-900">Secret GitHub:</span> <code className="bg-gray-100 px-1.5 py-0.5 rounded">NEON_API_KEY</code></p>
                    <p><span className="font-medium text-gray-900">Secret GitHub:</span> <code className="bg-gray-100 px-1.5 py-0.5 rounded">NEON_PROJECT_ID</code></p>
                    <p><span className="font-medium text-gray-900">Secret GitHub:</span> <code className="bg-gray-100 px-1.5 py-0.5 rounded">NEON_BRANCH_ID</code></p>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">O que a TI precisa fazer</h2>
                <div className="space-y-3 text-sm text-gray-600">
                  <p>1. Configurar <code className="bg-gray-100 px-1.5 py-0.5 rounded">NEON_API_KEY</code>, <code className="bg-gray-100 px-1.5 py-0.5 rounded">NEON_PROJECT_ID</code> e <code className="bg-gray-100 px-1.5 py-0.5 rounded">NEON_BRANCH_ID</code> no backend.</p>
                  <p>2. Cadastrar os mesmos valores como secrets do GitHub para o workflow automatico.</p>
                  <p>3. Verificar nesta tela, uma vez por semana, se o status continua saudavel.</p>
                  <p>4. Se aparecer alerta vermelho, criar um snapshot manual imediatamente e revisar o workflow.</p>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Como restaurar</h2>
                <div className="space-y-3 text-sm text-gray-600">
                  <p>1. Abrir o projeto no console do Neon.</p>
                  <p>2. Localizar o snapshot desejado.</p>
                  <p>3. Restaurar para uma branch nova primeiro, para conferir os dados com seguranca.</p>
                  <p>4. Depois de validar, promover a branch restaurada ou atualizar a <code className="bg-gray-100 px-1.5 py-0.5 rounded">DATABASE_URL</code> do sistema.</p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
