const DAY_CLOSED = /^Day (\d{4}-\d{2}-\d{2}) is closed$/;

/** Human-readable message from an API error (axios), in Spanish where we know it. */
export function apiErrorMessage(err: unknown, fallback = 'Ha ocurrido un error.'): string {
  const detail = (err as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail;
  if (typeof detail !== 'string') return fallback;
  const closed = DAY_CLOSED.exec(detail);
  if (closed) return `El día ${closed[1]} está cerrado y no se puede modificar.`;
  if (detail === 'Insufficient permissions') return 'No tienes permiso para esta acción.';
  if (detail === 'Registration is closed')
    return 'El registro está cerrado. Pide al dueño del negocio que te cree una cuenta.';
  if (detail === 'Email already registered') return 'Ese email ya está registrado.';
  if (detail === 'Not a pg_dump custom-format file')
    return 'El archivo no es una copia de seguridad válida de esta app (.dump).';
  if (detail === 'Backup not found') return 'Esa copia ya no existe.';
  if (detail === 'File too large') return 'El archivo es demasiado grande.';
  if (detail === 'Pay bands overlap') return 'Los tramos del horario se solapan.';
  return detail;
}
