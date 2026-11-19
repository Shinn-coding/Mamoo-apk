/** Versi data: naik setiap mutasi supaya layar tahu kapan harus muat ulang. */
import { create } from 'zustand';

type DataState = {
  /** counter mutasi transaksi/kategori/dompet */
  version: number;
  bump: () => void;
};

export const useDataStore = create<DataState>((set) => ({
  version: 0,
  bump: () => set((state) => ({ version: state.version + 1 })),
}));

/** Hook sederhana untuk memuat data saat `version` berubah. */
export function useDataVersion(): number {
  return useDataStore((state) => state.version);
}
