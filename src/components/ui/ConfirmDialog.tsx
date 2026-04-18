import React from 'react';
import Modal from './Modal';
import Button from './Button';
import { HiExclamation } from 'react-icons/hi';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'primary';
  loading?: boolean;
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirmer',
  cancelText = 'Annuler',
  variant = 'danger',
  loading = false,
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
      <div className="flex flex-col items-center text-center py-4">
        <div className={`p-3 rounded-full mb-4 ${variant === 'danger' ? 'bg-danger-100' : 'bg-primary-100'}`}>
          <HiExclamation className={`h-6 w-6 ${variant === 'danger' ? 'text-danger-600' : 'text-primary-600'}`} />
        </div>
        <p className="text-sm text-gray-600">{message}</p>
      </div>
      <div className="flex items-center justify-end gap-3 pt-4">
        <Button variant="secondary" onClick={onClose} disabled={loading}>
          {cancelText}
        </Button>
        <Button variant={variant === 'danger' ? 'danger' : 'primary'} onClick={onConfirm} loading={loading}>
          {confirmText}
        </Button>
      </div>
    </Modal>
  );
};

export default ConfirmDialog;
