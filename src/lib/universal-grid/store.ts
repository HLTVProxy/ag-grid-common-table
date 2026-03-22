import { useRef } from 'react';
import { createStore, useStore, type StoreApi } from 'zustand';
import type { ColDef, GridApi } from 'ag-grid-community';

// ── Types ──────────────────────────────────────────────────────────

export type GridMode = 'manual' | 'api';

export interface UniversalGridConfig<TData> {
  mode: GridMode;
  columnDefs: ColDef<TData>[];
  /** 僅 api 模式需要 */
  fetchUrl?: string;
  /** 可選的初始資料 */
  initialRowData?: TData[];
  /** 自訂 fetch 函式，預設使用 window.fetch */
  fetchFn?: (url: string) => Promise<TData[]>;
}

export interface UniversalGridState<TData> {
  mode: GridMode;
  columnDefs: ColDef<TData>[];
  rowData: TData[];
  selectedRows: TData[];
  loading: boolean;
  error: string | null;
  gridApi: GridApi<TData> | null;

  // Actions
  setGridApi: (api: GridApi<TData>) => void;
  setRowData: (data: TData[]) => void;
  addRow: (row: TData) => void;
  deleteSelectedRows: () => void;
  clearAllRows: () => void;
  setSelectedRows: (rows: TData[]) => void;
  applySelectedRows: (rows: TData[]) => void;
  clearSelection: () => void;
  fetchData: (url: string) => Promise<void>;
}

export type UniversalGridStore<TData> = StoreApi<UniversalGridState<TData>>;

// ── Store factory ──────────────────────────────────────────────────

export function createUniversalGridStore<TData>(
  config: UniversalGridConfig<TData>,
): UniversalGridStore<TData> {
  const { mode, columnDefs, initialRowData = [], fetchFn } = config;

  const syncGridSelection = (
    api: GridApi<TData> | null,
    rows: TData[],
  ): void => {
    if (!api) {
      return;
    }

    const selectedSet = new Set(rows);
    api.forEachNode((node) => {
      node.setSelected(selectedSet.has(node.data as TData));
    });
  };

  return createStore<UniversalGridState<TData>>((set, get) => ({
    mode,
    columnDefs,
    rowData: initialRowData,
    selectedRows: [],
    loading: false,
    error: null,
    gridApi: null,

    setGridApi: (api) => {
      syncGridSelection(api, get().selectedRows);
      set({ gridApi: api });
    },

    setRowData: (data) => {
      syncGridSelection(get().gridApi, []);
      set({ rowData: data, selectedRows: [] });
    },

    addRow: (row) => set((state) => ({ rowData: [...state.rowData, row] })),

    deleteSelectedRows: () => {
      const { selectedRows, rowData } = get();
      const selectedSet = new Set(selectedRows);
      set({
        rowData: rowData.filter((r) => !selectedSet.has(r)),
        selectedRows: [],
      });
    },

    clearAllRows: () => {
      syncGridSelection(get().gridApi, []);
      set({ rowData: [], selectedRows: [] });
    },

    setSelectedRows: (rows) => set({ selectedRows: rows }),

    applySelectedRows: (rows) => {
      syncGridSelection(get().gridApi, rows);
      set({ selectedRows: rows });
    },

    clearSelection: () => {
      syncGridSelection(get().gridApi, []);
      set({ selectedRows: [] });
    },

    fetchData: async (url) => {
      set({ loading: true, error: null });
      try {
        let data: TData[];
        if (fetchFn) {
          data = await fetchFn(url);
        } else {
          const res = await fetch(url);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          data = await res.json();
        }
        syncGridSelection(get().gridApi, []);
        set({ rowData: data, selectedRows: [], loading: false });
      } catch (err) {
        set({
          error: err instanceof Error ? err.message : String(err),
          loading: false,
        });
      }
    },
  }));
}

// ── Custom hook：建立並回傳 store instance ─────────────────────────

export function useCreateUniversalGridStore<TData>(
  config: UniversalGridConfig<TData>,
): UniversalGridStore<TData> {
  const storeRef = useRef<UniversalGridStore<TData> | null>(null);
  if (storeRef.current === null) {
    storeRef.current = createUniversalGridStore(config);
  }
  return storeRef.current;
}

// ── 方便的 selector hook ───────────────────────────────────────────

export function useGridStore<TData, U>(
  store: UniversalGridStore<TData>,
  selector: (state: UniversalGridState<TData>) => U,
): U {
  return useStore(store, selector);
}
