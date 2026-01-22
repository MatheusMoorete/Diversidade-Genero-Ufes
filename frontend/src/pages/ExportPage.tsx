/**
 * Página 3: Exportação e importação de dados em Excel.
 */

import React, { useState, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import { exportService } from '@/services/api';
import { Button } from '@/components/shared/Button';

export const ExportPage: React.FC = () => {
  const [importResult, setImportResult] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Mutation para exportar Excel
  const exportMutation = useMutation({
    mutationFn: exportService.exportExcel,
    onSuccess: (blob) => {
      // Cria link para download
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pacientes_export_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      alert('Arquivo Excel exportado com sucesso!');
    },
    onError: (error: any) => {
      alert(`Erro ao exportar: ${error.response?.data?.detail || error.message}`);
    },
  });

  // Mutation para importar Excel
  const importMutation = useMutation({
    mutationFn: exportService.importExcel,
    onSuccess: (result) => {
      setImportResult(result);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      alert(
        `Importação concluída!\n${result.pacientes_criados} pacientes criados\n${result.pacientes_com_erro} com erro`
      );
    },
    onError: (error: any) => {
      alert(`Erro ao importar: ${error.response?.data?.detail || error.message}`);
    },
  });

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.xlsx') && !file.name.toLowerCase().endsWith('.xls')) {
      alert('Por favor, selecione um arquivo Excel (.xlsx ou .xls)');
      return;
    }

    importMutation.mutate(file);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:py-12 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-10">
          <h1 className="text-4xl font-bold text-gray-900 mb-3">
            Gerenciamento de Dados
          </h1>
          <p className="text-gray-500 text-lg">
            Exporte ou importe dados de pacientes via planilhas Excel
          </p>
        </div>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Exportação */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-[#4A6FA5]/10 flex items-center justify-center">
                <svg className="w-6 h-6 text-[#4A6FA5]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Exportar Dados</h2>
                <p className="text-gray-600 text-sm mb-4 leading-relaxed">
                  Baixe todos os pacientes e formulários em um arquivo Excel formatado e organizado.
                </p>
              </div>
            </div>
            <Button
              variant="primary"
              onClick={() => exportMutation.mutate()}
              isLoading={exportMutation.isPending}
              className="w-full mt-4"
              style={{ background: '#4A6FA5' }}
            >
              {exportMutation.isPending ? 'Exportando...' : 'Baixar Excel'}
            </Button>
          </div>

          {/* Importação */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-[#64748B]/10 flex items-center justify-center">
                <svg className="w-6 h-6 text-[#64748B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Importar Dados</h2>
                <p className="text-gray-600 text-sm mb-4 leading-relaxed">
                  Carregue pacientes a partir de um arquivo Excel. Requer coluna <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">Nome_Completo</code>.
                </p>
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleImport}
              className="hidden"
              id="file-input"
            />
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              isLoading={importMutation.isPending}
              className="w-full mt-4 border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              {importMutation.isPending ? 'Importando...' : 'Selecionar Arquivo'}
            </Button>
          </div>
        </div>

        {/* Resultado da Importação */}
        {importResult && (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Resultado da Importação</h2>
              <button
                onClick={() => setImportResult(null)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="text-center p-4 rounded-lg bg-emerald-50 border border-emerald-100">
                <p className="text-3xl font-bold text-emerald-600 mb-1">
                  {importResult.pacientes_criados}
                </p>
                <p className="text-xs font-medium text-emerald-700 uppercase tracking-wide">Criados</p>
              </div>
              <div className="text-center p-4 rounded-lg bg-rose-50 border border-rose-100">
                <p className="text-3xl font-bold text-rose-600 mb-1">
                  {importResult.pacientes_com_erro}
                </p>
                <p className="text-xs font-medium text-rose-700 uppercase tracking-wide">Erros</p>
              </div>
              <div className="text-center p-4 rounded-lg bg-slate-50 border border-slate-200">
                <p className="text-3xl font-bold text-slate-600 mb-1">
                  {importResult.total_processado}
                </p>
                <p className="text-xs font-medium text-slate-700 uppercase tracking-wide">Total</p>
              </div>
            </div>

            {/* Erros de Validação */}
            {importResult.erros_validacao && importResult.erros_validacao.length > 0 && (
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                  <svg className="w-4 h-4 mr-2 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  Erros de Validação
                </h3>
                <ul className="space-y-1.5">
                  {importResult.erros_validacao.map((erro: string, index: number) => (
                    <li key={index} className="text-sm text-rose-600 flex items-start">
                      <span className="text-rose-400 mr-2">•</span>
                      {erro}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Detalhes dos Erros */}
            {importResult.detalhes_erros && importResult.detalhes_erros.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Detalhes dos Erros</h3>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {importResult.detalhes_erros.map((erro: any, index: number) => (
                    <div key={index} className="flex items-start p-3 rounded-lg bg-gray-50 border border-gray-100">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{erro.paciente}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{erro.erro}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
