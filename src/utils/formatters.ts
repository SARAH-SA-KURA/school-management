export const formatDate = (date: string): string => {
  return new Date(date).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

export const formatDateTime = (date: string): string => {
  return new Date(date).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const formatTime = (time: string): string => {
  return time.slice(0, 5);
};

export const getInitials = (nom: string, prenom: string): string => {
  return `${prenom.charAt(0)}${nom.charAt(0)}`.toUpperCase();
};

export const formatNote = (note: number): string => {
  return note.toFixed(2);
};

export const getStatusColor = (status: string): string => {
  const colors: Record<string, string> = {
    actif: 'bg-success-100 text-success-700',
    abandon: 'bg-danger-100 text-danger-700',
    diplome: 'bg-primary-100 text-primary-700',
    suspendu: 'bg-warning-100 text-warning-600',
    justifiee: 'bg-success-100 text-success-700',
    non_justifiee: 'bg-danger-100 text-danger-700',
    en_attente: 'bg-warning-100 text-warning-600',
  };
  return colors[status] || 'bg-gray-100 text-gray-700';
};

export const truncate = (str: string, length: number): string => {
  if (str.length <= length) return str;
  return str.slice(0, length) + '...';
};
