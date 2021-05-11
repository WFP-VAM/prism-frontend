import { get } from 'lodash';
import moment from 'moment';
import type { LayerDataParams, LazyLoader } from './layer-data';
import { WMSLayerProps } from '../../config/types';
import {
  GeoTiffImage,
  loadGeoTiff,
  Rasters,
  TransformMatrix,
  WCSRequestUrl,
} from '../../components/MapView/Layers/raster-utils';

export type WMSLayerData = {
  image: GeoTiffImage;
  rasters: Rasters;
  transform: TransformMatrix;
};

export function getWCSLayerUrl({
  layer,
  extent,
  date,
}: LayerDataParams<WMSLayerProps>) {
  if (!extent) {
    throw new Error(
      `Can't fetch WCS data for layer ${layer.id} without providing an extent!`,
    );
  }

  return WCSRequestUrl(
    layer.baseUrl,
    layer.serverLayerName,
    date ? moment(date).format('YYYY-MM-DD') : undefined,
    extent,
    get(layer, 'wcsConfig.pixelResolution'),
  );
}

export const fetchWCSLayerData: LazyLoader<WMSLayerProps> = () => async ({
  layer,
  extent,
  date,
}: LayerDataParams<WMSLayerProps>) => {
  if (!extent) {
    throw new Error(
      `Can't fetch WCS data for layer ${layer.id} without providing an extent!`,
    );
  }

  return loadGeoTiff(getWCSLayerUrl({ layer, extent, date }));
};
