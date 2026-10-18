import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { DatabaseBackup, Download, RotateCcw, Trash2, Upload } from 'lucide-react';
import {
  createBackup,
  deleteBackup,
  downloadBackup,
  getBackups,
  restoreBackup,
  uploadBackup,
} from '../../api/admin';
import { useAuthStore } from '../../store/authStore';
import { apiErrorMessage } from '../../lib/errors';
import type { Backup, BackupKind } from '../../types';

const CONFIRM_WORD = 'RESTAURAR';

const KIND_LABELS: Record<BackupKind, { label: string; className: string }> = {
  auto: { label: 'Automática', className: 'bg-indigo-50 text-indigo-700' },
  manual: { label: 'Manual', className: 'bg-emerald-50 text-emerald-700' },
  'pre-restore': { label: 'Antes de restaurar', className: 'bg-amber-50 text-amber-700' },
  upload: { label: 'Subida', className: 'bg-sky-50 text-sky-700' },
};

function fileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function BackupsPage() {
  const qc = useQueryClient();
  const logout = useAuthStore((s) => s.logout);
  const fileInput = useRef<HTMLInputElement>(null);

  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [restoring, setRestoring] = useState<Backup | null>(null);
  const [confirmText, setConfirmText] = useState('');

  const { data: backups = [], isLoading } = useQuery({ queryKey: ['backups'], queryFn: getBackups });
  const refresh = () => qc.invalidateQueries({ queryKey: ['backups'] });

  const onError = (fallback: string) => (err: unknown) => setError(apiErrorMessage(err, fallback));
  const create = useMutation({
    mutationFn: createBackup,
    onSuccess: (b) => {
      setNotice(`Copia creada: ${b.name}`);
      void refresh();
    },
    onError: onError('No se pudo crear la copia.'),
  });
  const upload = useMutation({
    mutationFn: uploadBackup,
    onSuccess: (b) => {
      setNotice(`Copia subida: ${b.name}. Ya puedes restaurarla desde la lista.`);
      void refresh();
    },
    onError: onError('No se pudo subir el archivo. ¿Es una copia de esta app (.dump)?'),
  });
  const remove = useMutation({
    mutationFn: deleteBackup,
    onSuccess: () => void refresh(),
    onError: onError('No se pudo eliminar la copia.'),
  });
  const restore = useMutation({
    mutationFn: ({ name }: { name: string }) => restoreBackup(name, confirmText),
    onSuccess: async () => {
      // All data (users included) was replaced: start a fresh session.
      window.alert('Copia restaurada. Vuelve a iniciar sesión.');
      await logout();
      window.location.reload();
    },
    onError: onError('No se pudo restaurar. Los datos no se han modificado.'),
  });

  const start = () => {
    setError('');
    setNotice('');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Copias de seguridad</h1>
          <p className="text-sm text-gray-500 mt-1">
            Se hace una copia automática cada día a las 06:00. Descarga alguna de vez en cuando y
            guárdala fuera del servidor.
          </p>
        </div>
        <div className="flex gap-2">
          <input
            ref={fileInput}
            type="file"
            accept=".dump"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = '';
              if (file) {
                start();
                upload.mutate(file);
              }
            }}
          />
          <button
            onClick={() => fileInput.current?.click()}
            disabled={upload.isPending}
            className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            <Upload className="h-4 w-4" />
            {upload.isPending ? 'Subiendo...' : 'Subir copia'}
          </button>
          <button
            onClick={() => {
              start();
              create.mutate();
            }}
            disabled={create.isPending}
            className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            <DatabaseBackup className="h-4 w-4" />
            {create.isPending ? 'Creando...' : 'Crear copia ahora'}
          </button>
        </div>
      </div>

      {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      {notice && <div className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</div>}

      {restoring && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-5 space-y-3">
          <p className="text-sm font-semibold text-red-800">
            Restaurar la copia del{' '}
            {format(parseISO(restoring.created_at), "d 'de' MMMM yyyy 'a las' HH:mm", { locale: es })}
          </p>
          <p className="text-sm text-red-700">
            Se sustituirán <strong>todos</strong> los datos actuales (fichajes, gastos, ventas,
            empleados y cuentas) por los de esa copia. Antes se guardará automáticamente una copia
            del estado actual por si necesitas volver atrás.
          </p>
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="block text-xs font-medium text-red-800 mb-1">
                Escribe {CONFIRM_WORD} para confirmar
              </label>
              <input
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                className="rounded-lg border border-red-300 bg-white px-3 py-2 text-sm focus:border-red-500 focus:outline-none"
              />
            </div>
            <button
              onClick={() => {
                start();
                restore.mutate({ name: restoring.name });
              }}
              disabled={confirmText !== CONFIRM_WORD || restore.isPending}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
            >
              {restore.isPending ? 'Restaurando...' : 'Restaurar'}
            </button>
            <button
              onClick={() => setRestoring(null)}
              disabled={restore.isPending}
              className="rounded-lg border border-red-300 bg-white px-4 py-2 text-sm text-red-700 hover:bg-red-100"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        {isLoading ? (
          <div className="flex items-center justify-center p-10">
            <div className="h-6 w-6 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
          </div>
        ) : backups.length === 0 ? (
          <div className="p-10 text-center text-sm text-gray-400">
            Todavía no hay copias. Crea la primera con «Crear copia ahora».
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-gray-100 text-left text-xs uppercase text-gray-500">
              <tr>
                <th className="px-5 py-3 font-medium">Fecha</th>
                <th className="px-5 py-3 font-medium">Tipo</th>
                <th className="px-5 py-3 text-right font-medium">Tamaño</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {backups.map((b) => (
                <tr key={b.name}>
                  <td className="px-5 py-3 whitespace-nowrap text-gray-900">
                    {format(parseISO(b.created_at), "EEE d MMM yyyy, HH:mm", { locale: es })}
                  </td>
                  <td className="px-5 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs ${KIND_LABELS[b.kind].className}`}>
                      {KIND_LABELS[b.kind].label}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right tabular-nums text-gray-600">{fileSize(b.size_bytes)}</td>
                  <td className="px-5 py-3">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => {
                          start();
                          downloadBackup(b.name).catch(onError('No se pudo descargar la copia.'));
                        }}
                        className="flex items-center gap-1 rounded-lg border border-gray-300 px-2.5 py-1 text-xs text-gray-600 hover:bg-gray-50"
                      >
                        <Download className="h-3.5 w-3.5" /> Descargar
                      </button>
                      <button
                        onClick={() => {
                          start();
                          setConfirmText('');
                          setRestoring(b);
                        }}
                        className="flex items-center gap-1 rounded-lg border border-gray-300 px-2.5 py-1 text-xs text-gray-600 hover:bg-gray-50"
                      >
                        <RotateCcw className="h-3.5 w-3.5" /> Restaurar
                      </button>
                      <button
                        onClick={() => {
                          if (window.confirm(`¿Eliminar la copia ${b.name}?`)) {
                            start();
                            remove.mutate(b.name);
                          }
                        }}
                        className="p-1 text-gray-400 hover:text-red-500"
                        aria-label="Eliminar copia"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
