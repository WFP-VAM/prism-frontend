import { FeatureCollection } from 'geojson';
import type { LayerDataParams, LazyLoader } from './layer-data';
import { BoundaryLayerProps } from '../../config/types';

export interface BoundaryLayerData extends FeatureCollection {}

export const fetchBoundaryLayerData: LazyLoader<BoundaryLayerProps> = () => async (
  params: LayerDataParams<BoundaryLayerProps>,
) => {
  const { layer } = params;
  const { path } = layer;

  return (await fetch(path)).json();
};
