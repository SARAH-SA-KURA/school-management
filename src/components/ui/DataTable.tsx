import React, { useState } from 'react';
import { HiChevronUp, HiChevronDown } from 'react-icons/hi';
import Pagination from './Pagination';
import Spinner from './Spinner';
import { TableColumn } from '../../types';

interface DataTableProps<T> {
  columns: TableColumn<T>[];
  data: T[];
  loading?: boolean;
  currentPage?: number;
  totalPages?: number;
  totalItems?: number;
  itemsPerPage?: number;
  onPageChange?: (page: number) => void;
  onSort?: (key: string, direction: 'asc' | 'desc') => void;
  emptyMessage?: string;
  onRowClick?: (item: T) => void;
  selectable?: boolean;
  selectedIds?: Set<number | string>;
  onSelectionChange?: (ids: Set<number | string>) => void;
  headerContent?: React.ReactNode;
  perPage?: number;
  onPerPageChange?: (perPage: number) => void;
}

function DataTable<T extends { id: number | string }>({
  columns,
  data,
  loading = false,
  currentPage = 1,
  totalPages = 1,
  totalItems,
  itemsPerPage = 10,
  onPageChange,
  onSort,
  emptyMessage = 'Aucune donnée disponible',
  onRowClick,
  selectable = false,
  selectedIds,
  onSelectionChange,
  headerContent,
  perPage = 10,
  onPerPageChange,
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string>('');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const ids = selectedIds || new Set<number | string>();

  const handleSort = (key: string) => {
    const newDir = sortKey === key && sortDir === 'asc' ? 'desc' : 'asc';
    setSortKey(key);
    setSortDir(newDir);
    onSort?.(key, newDir);
  };

  const allSelected = data.length > 0 && data.every(item => ids.has(item.id));

  const toggleAll = () => {
    if (!onSelectionChange) return;
    if (allSelected) {
      onSelectionChange(new Set());
    } else {
      onSelectionChange(new Set(data.map(item => item.id)));
    }
  };

  const toggleOne = (id: number | string) => {
    if (!onSelectionChange) return;
    const newSet = new Set(ids);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    onSelectionChange(newSet);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-12">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Header content (filter bar) */}
      {headerContent && (
        <div className="px-6 pt-5 pb-2">
          {headerContent}
        </div>
      )}

      {/* Row Per Page selector */}
      {onPerPageChange && (
        <div className="px-6 py-3 flex items-center gap-2 text-sm text-gray-600">
          <span>Row Per Page</span>
          <select
            value={perPage}
            onChange={(e) => onPerPageChange(Number(e.target.value))}
            className="border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
          >
            {[10, 25, 50, 100].map(opt => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
          <span>Entries</span>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-y border-gray-200 bg-gray-50/50">
              {selectable && (
                <th className="px-4 py-3 w-10">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAll}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                </th>
              )}
              {columns.map((col) => (
                <th
                  key={String(col.key)}
                  className={`px-6 py-3 text-left text-sm font-medium text-gray-600
                    ${col.sortable ? 'cursor-pointer select-none hover:text-gray-900' : ''}
                    ${col.className || ''}`}
                  onClick={() => col.sortable && handleSort(String(col.key))}
                >
                  <div className="flex items-center gap-1.5">
                    {col.label}
                    {col.sortable && (
                      <div className="flex flex-col">
                        <HiChevronUp className={`h-3 w-3 -mb-0.5 ${sortKey === String(col.key) && sortDir === 'asc' ? 'text-gray-900' : 'text-gray-300'}`} />
                        <HiChevronDown className={`h-3 w-3 -mt-0.5 ${sortKey === String(col.key) && sortDir === 'desc' ? 'text-gray-900' : 'text-gray-300'}`} />
                      </div>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (selectable ? 1 : 0)} className="px-6 py-12 text-center text-sm text-gray-500">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((item) => (
                <tr
                  key={item.id}
                  className={`hover:bg-gray-50 transition-colors ${onRowClick ? 'cursor-pointer' : ''}`}
                  onClick={() => onRowClick?.(item)}
                >
                  {selectable && (
                    <td className="px-4 py-4 w-10">
                      <input
                        type="checkbox"
                        checked={ids.has(item.id)}
                        onChange={() => toggleOne(item.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                    </td>
                  )}
                  {columns.map((col) => (
                    <td key={String(col.key)} className={`px-6 py-4 text-sm text-gray-700 ${col.className || ''}`}>
                      {col.render
                        ? col.render(item)
                        : String((item as any)[col.key] ?? '')}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {onPageChange && totalPages > 1 && (
        <div className="border-t border-gray-100 px-4">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={onPageChange}
            totalItems={totalItems}
            itemsPerPage={itemsPerPage}
          />
        </div>
      )}
    </div>
  );
}

export default DataTable;
