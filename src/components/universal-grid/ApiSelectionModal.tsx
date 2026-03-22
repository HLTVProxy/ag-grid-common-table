'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AgGridReact } from 'ag-grid-react';
import type {
  ColDef,
  GridApi,
  GridReadyEvent,
  SelectionChangedEvent,
} from 'ag-grid-community';
import { useStore } from 'zustand';
import type { UniversalGridStore } from '@/lib/universal-grid/store';

interface ApiSelectionModalProps<TData> {
  store: UniversalGridStore<TData>;
  title?: string;
}

export function ApiSelectionModal<TData>({
  store,
  title = '選擇 API 資料',
}: ApiSelectionModalProps<TData>) {
  const rowData = useStore(store, (state) => state.rowData);
  const columnDefs = useStore(store, (state) => state.columnDefs);
  const selectedRows = useStore(store, (state) => state.selectedRows);
  const loading = useStore(store, (state) => state.loading);
  const applySelectedRows = useStore(store, (state) => state.applySelectedRows);

  const [isOpen, setIsOpen] = useState(false);
  const [draftSelectedRows, setDraftSelectedRows] = useState<TData[]>([]);

  const sourceGridApiRef = useRef<GridApi<TData> | null>(null);
  const isSyncingSourceRef = useRef(false);
  const initialSelectedRowsRef = useRef<TData[]>([]);

  const getRowKey = useCallback(
    (row: TData): string => {
      if (typeof row === 'object' && row !== null && 'id' in row) {
        const rowId = (row as { id?: unknown }).id;
        if (rowId !== undefined && rowId !== null) {
          return String(rowId);
        }
      }

      return String(rowData.indexOf(row));
    },
    [rowData],
  );

  const syncSourceGridSelection = useCallback(
    (rows: TData[]) => {
      if (!sourceGridApiRef.current) {
        return;
      }

      const selectedSet = new Set(rows.map(getRowKey));
      isSyncingSourceRef.current = true;
      sourceGridApiRef.current.forEachNode((node) => {
        if (!node.data) {
          return;
        }

        node.setSelected(selectedSet.has(getRowKey(node.data)));
      });
      isSyncingSourceRef.current = false;
    },
    [getRowKey],
  );

  const updateDraftSelectedRows = useCallback(
    (rows: TData[]) => {
      setDraftSelectedRows(rows);
      syncSourceGridSelection(rows);
    },
    [syncSourceGridSelection],
  );

  const toggleDraftRow = useCallback(
    (row: TData, checked: boolean) => {
      const rowKey = getRowKey(row);
      const nextRows = checked
        ? [
            ...draftSelectedRows.filter((item) => getRowKey(item) !== rowKey),
            row,
          ]
        : draftSelectedRows.filter((item) => getRowKey(item) !== rowKey);

      updateDraftSelectedRows(nextRows);
    },
    [draftSelectedRows, getRowKey, updateDraftSelectedRows],
  );

  const sourceColumnDefs = useMemo<ColDef<TData>[]>(() => {
    const selectionColumn: ColDef<TData> = {
      colId: '__modal_source_selection__',
      width: 56,
      maxWidth: 56,
      minWidth: 56,
      pinned: 'left',
      sortable: false,
      filter: false,
      resizable: false,
      suppressMenu: true,
      suppressMovable: true,
      checkboxSelection: true,
      headerCheckboxSelection: true,
      headerCheckboxSelectionFilteredOnly: true,
    };

    return [selectionColumn, ...columnDefs];
  }, [columnDefs]);

  const selectedColumnDefs = useMemo<ColDef<TData>[]>(() => {
    const selectionColumn: ColDef<TData> = {
      colId: '__modal_selected_selection__',
      headerName: 'Included',
      width: 88,
      maxWidth: 88,
      minWidth: 88,
      pinned: 'left',
      sortable: false,
      filter: false,
      resizable: false,
      suppressMenu: true,
      suppressMovable: true,
      cellRenderer: (params: { data?: TData }) => {
        if (!params.data) {
          return null;
        }

        return (
          <label style={checkboxLabelStyle}>
            <input
              type="checkbox"
              checked
              onChange={(event) =>
                toggleDraftRow(params.data as TData, event.target.checked)
              }
            />
          </label>
        );
      },
    };

    return [selectionColumn, ...columnDefs];
  }, [columnDefs, toggleDraftRow]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setDraftSelectedRows(selectedRows);
    syncSourceGridSelection(selectedRows);
  }, [isOpen, selectedRows, syncSourceGridSelection]);

  const handleSourceGridReady = (event: GridReadyEvent<TData>) => {
    sourceGridApiRef.current = event.api;
    syncSourceGridSelection(draftSelectedRows);
  };

  const handleSourceSelectionChanged = (
    event: SelectionChangedEvent<TData>,
  ) => {
    if (isSyncingSourceRef.current) {
      return;
    }

    setDraftSelectedRows(event.api.getSelectedRows());
  };

  const handleOpen = () => {
    initialSelectedRowsRef.current = selectedRows;
    setDraftSelectedRows(selectedRows);
    setIsOpen(true);
  };

  const handleCancel = () => {
    applySelectedRows(initialSelectedRowsRef.current);
    setDraftSelectedRows(initialSelectedRowsRef.current);
    setIsOpen(false);
  };

  const handleApply = () => {
    applySelectedRows(draftSelectedRows);
    setIsOpen(false);
  };

  return (
    <>
      <button type="button" onClick={handleOpen} style={buttonStyle}>
        開啟選取器
      </button>

      {isOpen && (
        <div style={overlayStyle}>
          <div style={modalStyle}>
            <div style={headerStyle}>
              <div>
                <h3 style={titleStyle}>{title}</h3>
                <p style={subtitleStyle}>
                  Source 勾選後會同步顯示在 Selected，Apply 後才會回寫主表格。
                </p>
              </div>
              <button
                type="button"
                onClick={handleCancel}
                style={iconButtonStyle}
              >
                關閉
              </button>
            </div>

            <div style={gridLayoutStyle}>
              <section style={panelStyle}>
                <div style={panelHeaderStyle}>
                  <strong>Source</strong>
                  <span style={countStyle}>{rowData.length} 筆</span>
                </div>
                <div className="ag-theme-quartz" style={gridStyle}>
                  <AgGridReact<TData>
                    rowData={rowData}
                    columnDefs={sourceColumnDefs}
                    rowSelection="multiple"
                    rowMultiSelectWithClick
                    suppressRowClickSelection
                    onGridReady={handleSourceGridReady}
                    onSelectionChanged={handleSourceSelectionChanged}
                  />
                </div>
              </section>

              <section style={panelStyle}>
                <div style={panelHeaderStyle}>
                  <strong>Selected</strong>
                  <span style={countStyle}>{draftSelectedRows.length} 筆</span>
                </div>
                <div className="ag-theme-quartz" style={gridStyle}>
                  <AgGridReact<TData>
                    rowData={draftSelectedRows}
                    columnDefs={selectedColumnDefs}
                  />
                </div>
              </section>
            </div>

            <div style={footerStyle}>
              <button
                type="button"
                onClick={handleCancel}
                style={secondaryButtonStyle}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApply}
                style={primaryButtonStyle}
                disabled={loading}
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

const buttonStyle: React.CSSProperties = {
  padding: '6px 16px',
  fontSize: 14,
  borderRadius: 6,
  border: '1px solid #d1d5db',
  background: '#fff',
  cursor: 'pointer',
  color: '#111',
};

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(15, 23, 42, 0.45)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 24,
  zIndex: 1000,
};

const modalStyle: React.CSSProperties = {
  width: 'min(1120px, 100%)',
  maxHeight: 'min(90vh, 900px)',
  overflow: 'hidden',
  borderRadius: 16,
  background: '#ffffff',
  boxShadow: '0 24px 80px rgba(15, 23, 42, 0.25)',
  display: 'flex',
  flexDirection: 'column',
  gap: 20,
  padding: 24,
};

const headerStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: 16,
  alignItems: 'flex-start',
};

const titleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 22,
};

const subtitleStyle: React.CSSProperties = {
  margin: '6px 0 0',
  fontSize: 14,
  color: '#64748b',
};

const iconButtonStyle: React.CSSProperties = {
  padding: '6px 12px',
  fontSize: 14,
  borderRadius: 6,
  border: '1px solid #d1d5db',
  background: '#fff',
  cursor: 'pointer',
  color: '#111',
};

const gridLayoutStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  gap: 16,
};

const panelStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 10,
  minWidth: 0,
};

const panelHeaderStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
};

const countStyle: React.CSSProperties = {
  fontSize: 13,
  color: '#64748b',
};

const checkboxLabelStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  height: '100%',
};

const gridStyle: React.CSSProperties = {
  height: 360,
  width: '100%',
  border: '1px solid #e2e8f0',
  borderRadius: 12,
  overflow: 'hidden',
};

const footerStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'flex-end',
  gap: 12,
};

const secondaryButtonStyle: React.CSSProperties = {
  padding: '10px 18px',
  fontSize: 14,
  borderRadius: 8,
  border: '1px solid #cbd5e1',
  background: '#fff',
  cursor: 'pointer',
  color: '#0f172a',
};

const primaryButtonStyle: React.CSSProperties = {
  padding: '10px 18px',
  fontSize: 14,
  borderRadius: 8,
  border: '1px solid #0f172a',
  background: '#0f172a',
  cursor: 'pointer',
  color: '#fff',
};
