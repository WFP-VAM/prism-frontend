import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import * as Papa from 'papaparse';
import { TableType } from '../config/types';
import { TableDefinitions } from '../config/utils';
import type { CreateAsyncThunkTypes, RootState } from './store';

export type TableRowType = { [key: string]: string | number };
export type TableData = {
  columns: string[];
  rows: TableRowType[];
};

type TableState = {
  definition?: TableType;
  data?: TableData;
  loading: boolean;
  error?: string;
  isShowing: boolean;
};

const initialState: TableState = {
  loading: false,
  isShowing: false,
};

export const loadTable = createAsyncThunk<
  TableData,
  keyof typeof TableDefinitions,
  CreateAsyncThunkTypes
>('tableState/loadTable', async (key: keyof typeof TableDefinitions) => {
  const { table } = TableDefinitions[key];
  const url = process.env.PUBLIC_URL + table;

  return new Promise<TableData>((resolve, reject) =>
    Papa.parse(url, {
      header: true,
      download: true,
      complete: results =>
        resolve({ rows: results.data, columns: Object.keys(results.data[0]) }),
      error: error => reject(error),
    }),
  );
});

export const tableStateSlice = createSlice({
  name: 'tableState',
  initialState,
  reducers: {
    hideTable: ({ definition, data, error, ...rest }) => ({
      ...rest,
      isShowing: false,
    }),
  },
  extraReducers: builder => {
    builder.addCase(
      loadTable.fulfilled,
      (state, { payload }: PayloadAction<TableData>) => ({
        ...state,
        loading: false,
        data: payload,
      }),
    );

    builder.addCase(loadTable.rejected, (state, action) => ({
      ...state,
      loading: false,
      error: action.error.message
        ? action.error.message
        : action.error.toString(),
    }));

    builder.addCase(loadTable.pending, ({ error, ...state }, { meta }) => ({
      ...state,
      definition: TableDefinitions[meta.arg],
      isShowing: true,
      loading: true,
    }));
  },
});

export const getCurrentDefinition = (state: RootState): TableType | undefined =>
  state.tableState.definition;

// prevent trying to load and display table on start of app
export const getIsShowing = (state: RootState): boolean =>
  state.tableState.isShowing;

export const isLoading = (state: RootState): boolean =>
  state.tableState.loading;

export const getCurrentData = (state: RootState): TableData =>
  state.tableState.data || { columns: [], rows: [] };

export const tableErrorSelector = (state: RootState): string | undefined =>
  state.tableState.error;

// export actions
export const { hideTable } = tableStateSlice.actions;

export default tableStateSlice.reducer;
