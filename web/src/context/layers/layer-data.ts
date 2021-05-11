import { createAsyncThunk, AsyncThunk } from '@reduxjs/toolkit';
import { DiscriminateUnion, LayerType } from '../../config/types';
import { Extent } from '../../components/MapView/Layers/raster-utils';

import { fetchNSOLayerData, NSOLayerData } from './nso';
import { fetchWCSLayerData, WMSLayerData } from './wms';
import { fetchPointLayerData, PointLayerData } from './point_data';
import { BoundaryLayerData, fetchBoundaryLayerData } from './boundary';
import { fetchImpactLayerData, ImpactLayerData } from './impact';

import type { CreateAsyncThunkTypes, ThunkApi } from '../store';

type LayerSpecificDataTypes = {
  boundary: BoundaryLayerData;
  wms: WMSLayerData;
  impact: ImpactLayerData;
  nso: NSOLayerData;
  // eslint-disable-next-line camelcase
  point_data: PointLayerData;
};

export interface LayerData<L extends LayerType> {
  layer: L;
  date: number;
  extent?: Extent;
  data: LayerSpecificDataTypes[L['type']];
}

export interface LayerDataParams<T extends LayerType> {
  layer: T;
  extent?: Extent;
  date?: number;

  [key: string]: any;
}

// Create a union of all the possible param types
type ParamsTypeMap = {
  [key in LayerType['type']]: LayerDataParams<
    DiscriminateUnion<LayerType, 'type', key>
  >;
};
type ParamTypes = ParamsTypeMap[keyof ParamsTypeMap];

// Create a union of all the possible return types
type LayerDataMap = {
  [key in LayerType['type']]: LayerData<
    DiscriminateUnion<LayerType, 'type', key>
  >;
};
export type LayerDataTypes = LayerDataMap[keyof LayerDataMap];

// Define a type for the object mapping layer type to fetch function
type LayerLoaders = {
  [key in LayerType['type']]: LazyLoader<
    DiscriminateUnion<LayerType, 'type', key>
  >;
};

// Less restrictive handler type since Typescript doesn't support nested union discrimination
export type LazyLoader<T extends LayerType> = (
  recursive: LoadLayerDataFuncType, // just in case a loader wants to load another layer, we pass the function recursively to prevent import cycles.
) => (
  params: LayerDataParams<T>,
  api: ThunkApi,
) => Promise<LayerSpecificDataTypes[T['type']]>;

export const loadLayerData: LoadLayerDataFuncType = createAsyncThunk<
  LayerDataTypes,
  ParamTypes,
  CreateAsyncThunkTypes
>('mapState/loadLayerData', async (params, thunkApi) => {
  const { layer, extent, date } = params;
  const layerLoaders: LayerLoaders = {
    boundary: fetchBoundaryLayerData,
    impact: fetchImpactLayerData,
    wms: fetchWCSLayerData,
    nso: fetchNSOLayerData,
    point_data: fetchPointLayerData,
  };
  const lazyLoad: LazyLoader<any> = layerLoaders[layer.type];
  try {
    const layerData = await lazyLoad(loadLayerData)(params, thunkApi);
    // Need to cast this since TS isn't smart enough to match layer & layerData types based on the nested discrimator
    // field `layer.type`.
    return {
      layer,
      extent,
      date,
      data: layerData,
    } as LayerDataTypes;
  } catch (err) {
    console.error(err);
    throw new Error(
      `Failed to load layer: ${layer.id}. Check console for more details.`,
    );
  }
});

export type LoadLayerDataFuncType = AsyncThunk<
  LayerDataTypes, // return types
  ParamTypes, // function input types
  CreateAsyncThunkTypes
>;
