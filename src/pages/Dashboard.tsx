import { useState, useEffect } from 'react';
import { DownloadCloud, Play, RefreshCcw, FileText } from 'lucide-react';
import * as XLSX from 'xlsx';

export function Dashboard() {
  const [dataInicial, setDataInicial] = useState(new Date().toISOString().split('T')[0]);
  const [dataFinal, setDataFinal] = useState(new Date().toISOString().split('T')[0]);
  const [syncing, setSyncing] = useState(false);
  const [logs, setLogs] = useState<{ status: string; message: string; time: string }[]>([]);

  useEffect(() => {
    // Escuta eventos de progresso do backend
    window.electronAPI.onSyncProgress((data) => {
      setLogs((prev) => [
        ...prev,
        { ...data, time: new Date().toLocaleTimeString() },
      ]);

      if (data.status === 'completed' || data.status === 'error') {
        setSyncing(false);
      }
    });
  }, []);

  const handleStartSync = async () => {
    setSyncing(true);
    setLogs([{ status: 'info', message: 'Iniciando processo de sincronização...', time: new Date().toLocaleTimeString() }]);

    // Chama o backend para iniciar
    const result = await window.electronAPI.startSync(dataInicial, dataFinal);
    if (!result.success) {
      setSyncing(false);
      setLogs((prev) => [...prev, { status: 'error', message: result.message || 'Erro fatal', time: new Date().toLocaleTimeString() }]);
    }
  };

  const handleExportMockExcel = () => {
    // Apenas um mock demonstrativo. Num cenário real, buscaria do Supabase.
    const ws = XLSX.utils.json_to_sheet([
      { Chave: '35230112345678000199550010000000011123456789', Emitente: '12.345.678/0001-99', Valor: 1500.00, Status: 'Autorizado' },
      { Chave: '35230112345678000199550010000000021123456780', Emitente: '12.345.678/0001-99', Valor: 3200.50, Status: 'Autorizado' },
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Notas Fiscais");
    XLSX.writeFile(wb, "Relatorio_NFSe.xlsx");
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8 flex flex-col gap-6">
      <header className="flex justify-between items-center bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <DownloadCloud className="w-6 h-6 text-blue-600" /> Dashboard NFS-e Nacional
          </h1>
          <p className="text-sm text-gray-500 mt-1">Sincronize as notas diretamente para o seu banco Supabase.</p>
        </div>
        <button
          onClick={handleExportMockExcel}
          className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition"
        >
          <FileText className="w-4 h-4" /> Exportar Relatório Excel
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1">

        {/* Painel de Controle */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 lg:col-span-1 h-fit">
          <h2 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">Controle de Captura</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data Inicial</label>
              <input
                type="date"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-blue-500"
                value={dataInicial}
                onChange={(e) => setDataInicial(e.target.value)}
                disabled={syncing}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data Final</label>
              <input
                type="date"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-blue-500"
                value={dataFinal}
                onChange={(e) => setDataFinal(e.target.value)}
                disabled={syncing}
              />
            </div>

            <button
              onClick={handleStartSync}
              disabled={syncing}
              className={`w-full font-medium py-3 rounded-lg transition flex items-center justify-center gap-2 ${
                syncing
                  ? 'bg-orange-500 text-white cursor-wait'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {syncing ? <RefreshCcw className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5" />}
              {syncing ? 'Sincronizando em Background...' : 'Iniciar Sincronização'}
            </button>
          </div>

          <div className="mt-6 bg-blue-50 rounded-lg p-4 text-sm text-blue-800">
            <strong>Nota:</strong> A sincronização respeita os limites de tempo da API do Governo (1 requisição a cada 1.5s). O processo pode demorar dependendo do volume.
          </div>
        </div>

        {/* Terminal de Progresso */}
        <div className="bg-gray-900 rounded-xl shadow-sm border border-gray-800 lg:col-span-2 flex flex-col overflow-hidden h-[600px]">
          <div className="bg-gray-800 px-4 py-3 flex items-center justify-between border-b border-gray-700">
            <h2 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
              <RefreshCcw className="w-4 h-4" /> Terminal de Sincronização
            </h2>
            {syncing && <span className="flex h-3 w-3 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
            </span>}
          </div>

          <div className="p-4 flex-1 overflow-y-auto font-mono text-sm space-y-2">
            {logs.length === 0 ? (
              <p className="text-gray-500 italic">Aguardando início da operação...</p>
            ) : (
              logs.map((log, i) => (
                <div key={i} className={`flex gap-3 ${
                  log.status === 'error' ? 'text-red-400' :
                  log.status === 'completed' ? 'text-green-400' :
                  'text-gray-300'
                }`}>
                  <span className="text-gray-600 shrink-0">[{log.time}]</span>
                  <span>{log.message}</span>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
