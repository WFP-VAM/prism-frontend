import moment from 'moment';
import { xml2js } from 'xml-js';
import { get, isEmpty, isString, merge, union } from 'lodash';

import { appConfig } from '../config';
import { LayerDefinitions } from '../config/utils';
import type { AvailableDates, PointDataLayerProps } from '../config/types';
import { ImpactLayerProps, WMSLayerProps } from '../config/types';

// Note: PRISM's date picker is designed to work with dates in the UTC timezone
// Therefore, ambiguous dates (dates passed as string e.g 2020-08-01) shouldn't be calculated from the user's timezone and instead be converted directly to UTC. Possibly with moment.utc(string)

const xml2jsOptions = {
  compact: true,
  trim: true,
  ignoreComment: true,
};
export type DateCompatibleLayer =
  | WMSLayerProps
  | ImpactLayerProps
  | PointDataLayerProps;
export const getPossibleDatesForLayer = (
  layer: DateCompatibleLayer,
  serverAvailableDates: AvailableDates,
  // eslint-disable-next-line consistent-return
): number[] => {
  // eslint-disable-next-line default-case
  switch (layer.type) {
    case 'wms':
      return serverAvailableDates[layer.serverLayerName];
    case 'impact':
      return serverAvailableDates[
        (LayerDefinitions[layer.hazardLayer] as WMSLayerProps).serverLayerName
      ];
    case 'point_data':
      return serverAvailableDates[layer.id];
  }
};

export function formatUrl(
  baseUrl: string,
  params: { [key: string]: any } = {},
): string {
  const url = new URL(baseUrl);
  Object.keys(params).forEach(k => url.searchParams.append(k, params[k]));
  return url.toString();
}

/**
 * Format the raw data to { [layerId]: availableDates }
 * @param rawLayers Layers data return by the server 'GetCapabilities' request
 * @param layerIdPath path to layer's id
 * @param datesPath path to layer's available dates
 * @returns an object shape like { [layerId]: availableDates }
 */
function formatCapabilitiesInfo(
  rawLayers: any,
  layerIdPath: string,
  datesPath: string,
): AvailableDates {
  return rawLayers.reduce((acc: any, layer: any) => {
    const layerId = get(layer, layerIdPath);
    const rawDates = get(layer, datesPath, []);

    const dates: (string | { _text: string })[] = isString(rawDates)
      ? rawDates.split(',')
      : rawDates;

    const availableDates = dates
      .filter(date => !isEmpty(date))
      .map(date =>
        // adding 12 hours to avoid  errors due to daylight saving
        moment
          .utc(get(date, '_text', date).split('T')[0])
          .set({ hour: 12 })
          .valueOf(),
      );

    const { [layerId]: oldLayerDates } = acc;
    return {
      ...acc,
      [layerId]: union(availableDates, oldLayerDates),
    };
  }, {});
}

type FlatLayer = {
  Name: {
    _text: string;
    [key: string]: any;
  };
  Dimension: {
    _text: string;
    [key: string]: any;
  };
  [key: string]: any;
};

type FlatLayerContainer = { Layer: FlatLayer; [key: string]: any };
type LayerContainer =
  | { Layer: LayerContainer; [key: string]: any }
  | FlatLayerContainer[]
  | FlatLayer[];

const isArrayOfFlatLayerContainers = (
  maybeArray: LayerContainer,
): maybeArray is FlatLayerContainer[] => {
  return (maybeArray as FlatLayerContainer[])[0].Layer !== undefined;
};

function flattenLayers(rawLayers: LayerContainer): FlatLayer[] {
  if ('Layer' in rawLayers) {
    return flattenLayers(rawLayers.Layer);
  }
  if (!Array.isArray(rawLayers) || rawLayers.length === 0) {
    return [];
  }
  if (isArrayOfFlatLayerContainers(rawLayers)) {
    return rawLayers.reduce(
      (acc, { Layer }) => acc.concat(Layer),
      [] as FlatLayer[],
    );
  }
  return rawLayers as FlatLayer[];
}

export function formatWMSLegendUrl(baseUrl: string, serverLayerName: string) {
  const legendOptions = {
    fontAntiAliasing: true,
    fontSize: 13,
    fontName: 'Roboto Light',
    forceLabels: 'on',
    fontColor: '0x2D3436',
  };

  const requestParams = {
    service: 'WMS',
    request: 'GetLegendGraphic',
    format: 'image/png',
    layer: serverLayerName,
    legend_options: Object.entries(legendOptions)
      .map(([key, value]) => `${key}:${value}`)
      .join(';'),
  };

  return formatUrl(`${baseUrl}/ows`, requestParams);
}

/**
 * List capabilities for a WMS layer.
 * @param serverUri
 */
async function getWMSCapabilities(serverUri: string) {
  const requestUri = formatUrl(serverUri, { request: 'GetCapabilities' });

  try {
    const response = await fetch(requestUri);
    if (!response.ok) {
      throw new Error(`${response.status}: ${response.statusText}`);
    }
    const responseText = await response.text();
    const responseJS = xml2js(responseText, xml2jsOptions);

    const rawLayers = get(responseJS, 'WMS_Capabilities.Capability.Layer');

    const flatLayers = flattenLayers(
      Array.isArray(rawLayers) ? rawLayers : [rawLayers],
    );

    return formatCapabilitiesInfo(flatLayers, 'Name._text', 'Dimension._text');
  } catch (error) {
    // TODO we used to throw the error here so a notification appears. Removed because a failure of one shouldn't prevent the successful requests from saving.
    console.error(error);
    return {};
  }
}

/**
 * List capabilities for a WCS layer.
 * @param serverUri
 */
async function getWCSCoverage(serverUri: string) {
  const requestUri = formatUrl(serverUri, {
    request: 'DescribeCoverage',
  });

  try {
    const response = await fetch(requestUri);
    if (!response.ok) {
      throw new Error(`${response.status}: ${response.statusText}`);
    }
    const responseText = await response.text();
    const responseJS = xml2js(responseText, xml2jsOptions);

    const rawLayers = get(responseJS, 'CoverageDescription.CoverageOffering');

    return formatCapabilitiesInfo(
      rawLayers,
      'name._text',
      'domainSet.temporalDomain.gml:timePosition',
    );
  } catch (error) {
    // TODO we used to throw the error here so a notification appears via middleware. Removed because a failure of one shouldn't prevent the successful requests from saving.
    // we could do a dispatch for a notification, but getting a dispatch reference here would be complex, just for a notification
    console.error(error);
    return {};
  }
}

type PointDataDates = Array<{
  date: string;
}>;
// used to cache repeat date requests to same URL
const pointDataFetchPromises: {
  [k in PointDataLayerProps['dateUrl']]: Promise<PointDataDates>;
} = {};

/**
 * Gets the available dates for a point data layer.
 */
async function getPointDataCoverage(layer: PointDataLayerProps) {
  const { dateUrl: url, fallbackData: fallbackUrl, id } = layer;
  const loadPointLayerDataFromURL = async (fetchUrl: string) => {
    const data = (await (await fetch(fetchUrl || '')).json()) as PointDataDates; // raw data comes in as { date: yyyy-mm-dd }[]
    return data;
  };
  // eslint-disable-next-line fp/no-mutation
  const data = await (pointDataFetchPromises[url] =
    pointDataFetchPromises[url] || loadPointLayerDataFromURL(url)).catch(
    err => {
      console.error(err);
      console.warn(
        `Failed loading point data layer: ${id}. Attempting to load fallback URL...`,
      );
      return loadPointLayerDataFromURL(fallbackUrl || '');
    },
  );

  const possibleDates = data
    // adding 12 hours to avoid  errors due to daylight saving, and convert to number
    .map(item => moment.utc(item.date).set({ hour: 12 }).valueOf())
    // remove duplicate dates - indexOf returns first index of item
    .filter((date, index, arr) => {
      return arr.indexOf(date) === index;
    });

  return possibleDates;
}

/**
 * Load available dates for WMS and WCS using a serverUri defined in prism.json and for GeoJSONs (point data) using their API endpoint.
 *
 * @return a Promise of Map<LayerID (not always id from LayerProps but can be), availableDates[]>
 */
export async function getLayersAvailableDates(): Promise<AvailableDates> {
  const wmsServerUrls: string[] = get(appConfig, 'serversUrls.wms', []);
  const wcsServerUrls: string[] = get(appConfig, 'serversUrls.wcs', []);

  const pointDataLayers = Object.values(LayerDefinitions).filter(
    (layer): layer is PointDataLayerProps => layer.type === 'point_data',
  );

  const layerDates: AvailableDates[] = await Promise.all([
    ...wmsServerUrls.map(url => getWMSCapabilities(url)),
    ...wcsServerUrls.map(url => getWCSCoverage(url)),
    ...pointDataLayers.map(async layer => ({
      [layer.id]: await getPointDataCoverage(layer),
    })),
  ]);

  return merge({}, ...layerDates);
}
