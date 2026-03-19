'use client';

import { useState } from 'react';
import type { ColDef } from 'ag-grid-community';
import {
  UniversalGrid,
  useCreateUniversalGridStore,
  useGridStore,
} from '@/components/universal-grid';

// ── Demo 資料型別 ──────────────────────────────────────────────────

interface ManualRow {
  id: number;
  name: string;
  age: number;
}

interface ApiRow {
  id: number;
  name: string;
  username: string;
  email: string;
}

// ── Column 定義 ────────────────────────────────────────────────────

const manualColumns: ColDef<ManualRow>[] = [
  { field: 'id', headerName: 'ID', width: 80 },
  { field: 'name', headerName: '名稱', flex: 1 },
  { field: 'age', headerName: '年齡', width: 100 },
];

const apiColumns: ColDef<ApiRow>[] = [
  { field: 'id', headerName: 'ID', width: 80 },
  { field: 'name', headerName: '名稱', flex: 1 },
  { field: 'username', headerName: '使用者名稱', flex: 1 },
  { field: 'email', headerName: 'Email', flex: 1 },
];

// ── 手動模式 Demo ──────────────────────────────────────────────────

let nextId = 1;

function ManualDemo() {
  const store = useCreateUniversalGridStore<ManualRow>({
    mode: 'manual',
    columnDefs: manualColumns,
  });

  const rowCount = useGridStore(store, (s) => s.rowData.length);

  return (
    <div>
      <h2 style={{ marginBottom: 8 }}>手動輸入模式（{rowCount} 筆）</h2>
      <UniversalGrid
        store={store}
        createRow={() => ({
          id: nextId++,
          name: `User ${nextId}`,
          age: Math.floor(Math.random() * 40) + 20,
        })}
        height={300}
      />
    </div>
  );
}

// ── API 模式 Demo ──────────────────────────────────────────────────

function ApiDemo() {
  const store = useCreateUniversalGridStore<ApiRow>({
    mode: 'api',
    columnDefs: apiColumns,
  });

  const rowCount = useGridStore(store, (s) => s.rowData.length);

  return (
    <div>
      <h2 style={{ marginBottom: 8 }}>API 資料模式（{rowCount} 筆）</h2>
      <UniversalGrid
        store={store}
        fetchUrl="https://jsonplaceholder.typicode.com/users"
        height={300}
      />
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────

export default function Home() {
  const [tab, setTab] = useState<'manual' | 'api'>('manual');

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: 32 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 16 }}>
        Universal Grid Demo
      </h1>

      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        <button
          type="button"
          onClick={() => setTab('manual')}
          style={{
            padding: '8px 20px',
            borderRadius: 6,
            border: '1px solid #d1d5db',
            background: tab === 'manual' ? '#111' : '#fff',
            color: tab === 'manual' ? '#fff' : '#111',
            cursor: 'pointer',
            fontWeight: 600,
          }}
        >
          手動輸入
        </button>
        <button
          type="button"
          onClick={() => setTab('api')}
          style={{
            padding: '8px 20px',
            borderRadius: 6,
            border: '1px solid #d1d5db',
            background: tab === 'api' ? '#111' : '#fff',
            color: tab === 'api' ? '#fff' : '#111',
            cursor: 'pointer',
            fontWeight: 600,
          }}
        >
          API 資料
        </button>
      </div>

      {tab === 'manual' ? <ManualDemo /> : <ApiDemo />}
    </div>
  );
}
