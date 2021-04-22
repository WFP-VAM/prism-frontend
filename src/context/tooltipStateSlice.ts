import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { merge } from 'lodash';
import type { RootState } from './store';

export interface PopupData {
  [key: string]: { data: number; coordinates: GeoJSON.Position };
}

export interface PopupComponentSpec {
  type: string;
  key: number;
  params: { [key: string]: any };
}

export interface PopupRemoteData {
  components: Array<PopupComponentSpec>;
}

export interface MapTooltipState {
  coordinates?: GeoJSON.Position;
  locationName: string;
  data: PopupData;
  remoteData: PopupRemoteData | null;
  showing: boolean;
  loading: boolean;
}

type ShowPopupType = {
  coordinates: GeoJSON.Position;
  locationName: string;
};

const initialState: MapTooltipState = {
  locationName: '',
  data: {},
  remoteData: null,
  showing: false,
  loading: false,
};

export const fetchPopupData = createAsyncThunk(
  'tooltipState/fetchPopupData',
  async (url: string) => {
    return (
      await fetch(url, {
        mode: url.includes('http') ? 'cors' : 'same-origin',
      })
    ).json();
  },
);

export const tooltipStateSlice = createSlice({
  name: 'tooltipState',
  initialState,
  reducers: {
    addPopupData: (
      { data, ...rest },
      { payload }: PayloadAction<PopupData>,
    ) => ({
      ...rest,
      data: merge({}, data, payload),
    }),

    setPopupData: (state, { payload }: PayloadAction<PopupData>) => ({
      ...state,
      data: payload,
    }),

    clearRemotePopupData: state => ({
      ...state,
      remoteData: null,
    }),

    setPopupShowing: (state, { payload }: PayloadAction<boolean>) => ({
      ...state,
      showing: payload,
    }),

    hidePopup: state => ({
      ...state,
      showing: false,
      data: {},
    }),

    showPopup: (state, { payload }: PayloadAction<ShowPopupType>) => ({
      ...state,
      showing: true,
      locationName: payload.locationName,
      coordinates: payload.coordinates,
    }),

    setPopupCoordinates: (
      state,
      { payload }: PayloadAction<GeoJSON.Position>,
    ) => ({
      ...state,
      coordinates: payload,
    }),
  },
  extraReducers: builder => {
    builder.addCase(fetchPopupData.fulfilled, (state, { payload }) => ({
      ...state,
      loading: false,
      remoteData: payload,
    }));

    builder.addCase(fetchPopupData.pending, state => ({
      ...state,
      remoteData: null,
      loading: true,
    }));

    builder.addCase(fetchPopupData.rejected, state => ({
      ...state,
      remoteData: null,
      loading: false,
    }));
  },
});

// Getters
export const tooltipSelector = (state: RootState): MapTooltipState =>
  state.tooltipState;
export const tooltipShowingSelector = (
  state: RootState,
): MapTooltipState['showing'] => state.tooltipState.showing;

// Setters
export const {
  addPopupData,
  setPopupData,
  clearRemotePopupData,
  setPopupShowing,
  hidePopup,
  showPopup,
  setPopupCoordinates,
} = tooltipStateSlice.actions;

export default tooltipStateSlice.reducer;
