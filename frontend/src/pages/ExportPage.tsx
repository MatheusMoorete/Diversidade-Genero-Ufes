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
    <div className="p-4 sm:p-6 lg:p-8">
      <h1 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6">Exportar/Importar Dados</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Exportação */}
        <div className="bg-white p-4 sm:p-6 rounded-md shadow">
          <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4">Exportar para Excel</h2>
          <p className="text-gray-600 mb-4">
            Exporte todos os pacientes e suas respostas de formulário para um arquivo Excel
            formatado.
          </p>
          <Button
            variant="primary"
            onClick={() => exportMutation.mutate()}
            isLoading={exportMutation.isPending}
            className="w-full"
          >
            {exportMutation.isPending ? 'Exportando...' : 'Exportar Excel'}
          </Button>
        </div>

        {/* Importação */}
        <div className="bg-white p-4 sm:p-6 rounded-md shadow">
          <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4">Importar de Excel</h2>
          <p className="text-gray-600 mb-4">
            Importe pacientes de um arquivo Excel. O arquivo deve conter a coluna:
            Nome_Completo.
          </p>
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
            className="w-full"
          >
            {importMutation.isPending ? 'Importando...' : 'Selecionar Arquivo Excel'}
          </Button>
        </div>
      </div>

      {/* Resultado da Importação */}
      {importResult && (
        <div className="mt-4 sm:mt-6 bg-white p-4 sm:p-6 rounded-lg shadow">
          <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4">Resultado da Importação</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="bg-green-50 p-4 rounded-md">
              <p className="text-sm text-gray-600">Pacientes Criados</p>
              <p className="text-2xl font-bold text-green-600">
                {importResult.pacientes_criados}
              </p>
            </div>
            <div className="bg-red-50 p-4 rounded-md">
              <p className="text-sm text-gray-600">Pacientes com Erro</p>
              <p className="text-2xl font-bold text-red-600">
                {importResult.pacientes_com_erro}
              </p>
            </div>
            <div className="bg-blue-50 p-4 rounded-md">
              <p className="text-sm text-gray-600">Total Processado</p>
              <p className="text-2xl font-bold text-blue-600">
                {importResult.total_processado}
              </p>
            </div>
          </div>

          {importResult.erros_validacao && importResult.erros_validacao.length > 0 && (
            <div className="mb-4">
              <h3 className="font-semibold text-gray-700 mb-2">Erros de Validação:</h3>
              <ul className="list-disc list-inside space-y-1 text-sm text-red-600">
                {importResult.erros_validacao.map((erro: string, index: number) => (
                  <li key={index}>{erro}</li>
                ))}
              </ul>
            </div>
          )}

          {importResult.detalhes_erros && importResult.detalhes_erros.length > 0 && (
            <div>
              <h3 className="font-semibold text-gray-700 mb-2">Detalhes dos Erros:</h3>
              <div className="space-y-2">
                {importResult.detalhes_erros.map((erro: any, index: number) => (
                  <div key={index} className="bg-red-50 p-3 rounded text-sm">
                    <p className="font-medium text-red-800">{erro.paciente}</p>
                    <p className="text-red-600">{erro.erro}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

