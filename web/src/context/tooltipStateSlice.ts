import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { merge } from 'lodash';
import type { RootState } from './store';

export interface PopupData {
  [key: string]: { data: number; coordinates: GeoJSON.Position };
}

export interface MapTooltipState {
  coordinates?: GeoJSON.Position;
  locationName: string;
  data: PopupData;
  showing: boolean;
}

type ShowPopupType = {
  coordinates: GeoJSON.Position;
  locationName: string;
};

const initialState: MapTooltipState = {
  locationName: '',
  data: {},
  showing: false,
};

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
  setPopupShowing,
  hidePopup,
  showPopup,
  setPopupCoordinates,
} = tooltipStateSlice.actions;

export default tooltipStateSlice.reducer;
