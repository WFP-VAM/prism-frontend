import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import { AvailableDates } from '../config/types';
import { getLayersAvailableDates } from '../utils/server-utils';
import type { CreateAsyncThunkTypes, RootState } from './store';

type ServerState = {
  availableDates: AvailableDates;
  loading: boolean;
  error?: string;
};

const initialState: ServerState = {
  availableDates: {},
  loading: false,
};

export const loadAvailableDates = createAsyncThunk<
  AvailableDates,
  void,
  CreateAsyncThunkTypes
>('serverState/loadAvailableDates', () => getLayersAvailableDates());

export const serverStateSlice = createSlice({
  name: 'serverState',
  initialState,
  reducers: {
    updateLayersCapabilities: (
      state,
      { payload }: PayloadAction<AvailableDates>,
    ) => ({
      ...state,
      availableDates: payload,
    }),
  },
  extraReducers: builder => {
    builder.addCase(
      loadAvailableDates.fulfilled,
      (state, { payload }: PayloadAction<AvailableDates>) => ({
        ...state,
        loading: false,
        availableDates: payload,
      }),
    );

    builder.addCase(loadAvailableDates.rejected, (state, action) => ({
      ...state,
      loading: false,
      error: action.error.message
        ? action.error.message
        : action.error.toString(),
    }));

    builder.addCase(loadAvailableDates.pending, state => ({
      ...state,
      loading: true,
    }));
  },
});

// Getters
export const availableDatesSelector = (
  state: RootState,
): ServerState['availableDates'] => state.serverState.availableDates;

export const isLoading = (state: RootState): ServerState['loading'] =>
  state.serverState.loading;

export const datesErrorSelector = (state: RootState): string | undefined =>
  state.serverState.error;

// Setters
export const { updateLayersCapabilities } = serverStateSlice.actions;

export default serverStateSlice.reducer;
