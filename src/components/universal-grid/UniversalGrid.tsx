'use client';

import { useCallback, useEffect, useMemo } from 'react';
import { AgGridReact } from 'ag-grid-react';
import {
  type GridReadyEvent,
  type SelectionChangedEvent,
  type ColDef,
} from 'ag-grid-community';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-quartz.css';
import { useStore } from 'zustand';
import type { UniversalGridStore } from '@/lib/universal-grid/store';

// ── Props ──────────────────────────────────────────────────────────

export interface UniversalGridProps<TData> {
  store: UniversalGridStore<TData>;
  /** 手動模式下，新增一筆 row 時的工廠函式 */
  createRow?: () => TData;
  /** api 模式下，自動 fetch 的 URL（也可由 config 帶入） */
  fetchUrl?: string;
  /** 表格高度，預設 500px */
  height?: number | string;
  /** 額外的 ag-grid props */
  gridProps?: Partial<
    Omit<
      React.ComponentProps<typeof AgGridReact<TData>>,
      | 'rowData'
      | 'columnDefs'
      | 'rowSelection'
      | 'onGridReady'
      | 'onSelectionChanged'
    >
  >;
}

// ── Component ──────────────────────────────────────────────────────

export function UniversalGrid<TData>({
  store,
  createRow,
  fetchUrl,
  height = 500,
  gridProps,
}: UniversalGridProps<TData>) {
  const mode = useStore(store, (s) => s.mode);
  const rowData = useStore(store, (s) => s.rowData);
  const columnDefs = useStore(store, (s) => s.columnDefs);
  const loading = useStore(store, (s) => s.loading);
  const error = useStore(store, (s) => s.error);
  const selectedRows = useStore(store, (s) => s.selectedRows);
  const setGridApi = useStore(store, (s) => s.setGridApi);
  const addRow = useStore(store, (s) => s.addRow);
  const deleteSelectedRows = useStore(store, (s) => s.deleteSelectedRows);
  const clearAllRows = useStore(store, (s) => s.clearAllRows);
  const setSelectedRows = useStore(store, (s) => s.setSelectedRows);
  const fetchData = useStore(store, (s) => s.fetchData);

  const mergedColumnDefs: ColDef<TData>[] = useMemo(() => {
    const selectionColumn: ColDef<TData> = {
      colId: '__selection__',
      width: 56,
      maxWidth: 56,
      minWidth: 56,
      pinned: 'left',
      resizable: false,
      sortable: false,
      filter: false,
      suppressMenu: true,
      suppressMovable: true,
      checkboxSelection: true,
      headerCheckboxSelection: true,
      headerCheckboxSelectionFilteredOnly: true,
    };

    const hasSelectionColumn = columnDefs.some(
      (columnDef) => columnDef.colId === selectionColumn.colId,
    );

    if (hasSelectionColumn) {
      return columnDefs;
    }

    return [selectionColumn, ...columnDefs];
  }, [columnDefs]);

  // API 模式自動 fetch
  useEffect(() => {
    if (mode === 'api' && fetchUrl) {
      fetchData(fetchUrl);
    }
  }, [mode, fetchUrl, fetchData]);

  const onGridReady = useCallback(
    (event: GridReadyEvent<TData>) => {
      setGridApi(event.api);
    },
    [setGridApi],
  );

  const onSelectionChanged = useCallback(
    (event: SelectionChangedEvent<TData>) => {
      const selected = event.api.getSelectedRows();
      setSelectedRows(selected);
    },
    [setSelectedRows],
  );

  const handleAdd = () => {
    if (createRow) addRow(createRow());
  };

  const handleDeleteSelected = () => {
    deleteSelectedRows();
  };

  const handleClearAll = () => {
    clearAllRows();
  };

  const handleRefetch = () => {
    if (fetchUrl) fetchData(fetchUrl);
  };

  return (
    <div style={{ width: '100%' }}>
      {/* Toolbar */}
      <div
        style={{
          display: 'flex',
          gap: 8,
          marginBottom: 8,
          alignItems: 'center',
          flexWrap: 'wrap',
        }}
      >
        {mode === 'manual' && (
          <>
            <button
              type="button"
              onClick={handleAdd}
              disabled={!createRow}
              style={btnStyle}
            >
              新增
            </button>
            <button
              type="button"
              onClick={handleDeleteSelected}
              disabled={selectedRows.length === 0}
              style={btnStyle}
            >
              刪除選取 ({selectedRows.length})
            </button>
            <button type="button" onClick={handleClearAll} style={btnStyle}>
              清除全部
            </button>
          </>
        )}

        {mode === 'api' && (
          <>
            <button type="button" onClick={handleRefetch} style={btnStyle}>
              重新載入
            </button>
            {selectedRows.length > 0 && (
              <span style={{ fontSize: 14, color: '#666' }}>
                已選取 {selectedRows.length} 筆
              </span>
            )}
          </>
        )}

        {loading && (
          <span style={{ fontSize: 14, color: '#888' }}>載入中…</span>
        )}
        {error && (
          <span style={{ fontSize: 14, color: 'red' }}>錯誤：{error}</span>
        )}
      </div>

      {/* Grid */}
      <div className="ag-theme-quartz" style={{ height, width: '100%' }}>
        <AgGridReact<TData>
          rowData={rowData}
          columnDefs={mergedColumnDefs}
          rowSelection="multiple"
          onGridReady={onGridReady}
          onSelectionChanged={onSelectionChanged}
          {...gridProps}
        />
      </div>
    </div>
  );
}

const btnStyle: React.CSSProperties = {
  padding: '6px 16px',
  fontSize: 14,
  borderRadius: 6,
  border: '1px solid #d1d5db',
  background: '#fff',
  cursor: 'pointer',
  color: '#111',
};
