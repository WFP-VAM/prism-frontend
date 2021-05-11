import GeoJSON from 'geojson';
import moment from 'moment';
import type { LazyLoader } from './layer-data';
import { PointDataLayerProps } from '../../config/types';

declare module 'geojson' {
  export const version: string;
  export const defaults: object;

  export function parse(
    data: object,
    properties: object,
    callback?: Function,
  ): PointLayerData;
}

export type PointLayerData = {
  lat: number;
  lon: number;
  date: number; // in unix time.
  [key: string]: any;
}[];

export const fetchPointLayerData: LazyLoader<PointDataLayerProps> = () => async ({
  date,
  layer: { data: dataUrl, fallbackData },
}) => {
  // This function fetches point data from the API.
  // If this endpoint is not available or we run into an error,
  // we should get the data from the local public file in layer.fallbackData

  const formattedDate = date && moment(date).format('YYYY-MM-DD');
  // TODO exclusive to this api...
  const dateQuery = `?beginDateTime=${
    formattedDate || '2000-01-01'
  }&endDateTime=${formattedDate || '2023-12-21'}`;
  let data;
  try {
    // eslint-disable-next-line fp/no-mutation
    data = (await (
      await fetch(dataUrl + dateQuery, {
        mode: 'cors',
      })
    ).json()) as PointLayerData;
  } catch (ignored) {
    // fallback data isn't filtered, therefore we must filter it.
    // eslint-disable-next-line fp/no-mutation
    data = ((await (
      await fetch(fallbackData || '')
    ).json()) as PointLayerData).filter(
      // we cant do a string comparison here because sometimes the date in json is stored as YYYY-M-D instead of YYYY-MM-DD
      // using moment here helps compensate for these discrepancies
      obj =>
        moment(obj.date).format('YYYY-MM-DD') ===
        moment(formattedDate).format('YYYY-MM-DD'),
    );
  }
  return GeoJSON.parse(data, { Point: ['lat', 'lon'] });
};
