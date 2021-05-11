// cannot exist within mapStateSlice due to import cycles with
// layerDataSelector(used to be mapStateSlice) -> nso/impact -> layer-data -> mapStateSlice
// x -> y .. x is used by y
import { Map as MapBoxMap } from 'mapbox-gl';
import type { RootState } from '../store';
import type { LayerDataTypes } from '../layers/layer-data';
import type { MapState } from '.';
import type { LayerKey } from '../../config/types';

export const layersSelector = (state: RootState): MapState['layers'] =>
  state.mapState.layers;
export const dateRangeSelector = (state: RootState): MapState['dateRange'] =>
  state.mapState.dateRange;
export const mapSelector = (state: RootState): MapBoxMap | undefined =>
  state.mapState.mapboxMap();

export const layerDataSelector = (id: LayerKey, date?: number) => (
  state: RootState,
): LayerDataTypes | undefined =>
  state.mapState.layersData.find(
    ({ layer, date: dataDate }) =>
      layer.id === id && (!date || date === dataDate),
  );
export const isLoading = (state: RootState): boolean =>
  state.mapState.loading > 0;
