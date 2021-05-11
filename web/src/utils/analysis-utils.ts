import { get, has, isNull, isString, mean, invert } from 'lodash';
import { Feature, FeatureCollection } from 'geojson';
import bbox from '@turf/bbox';
import {
  AggregationOperations,
  AsyncReturnType,
  ImpactLayerProps,
  LayerType,
  LegendDefinition,
  NSOLayerProps,
  StatsApi,
  ThresholdDefinition,
  WMSLayerProps,
} from '../config/types';
import type { ThunkApi } from '../context/store';
import { layerDataSelector } from '../context/mapStateSlice/selectors';
import {
  Extent,
  featureIntersectsImage,
  GeoJsonBoundary,
  pixelsInFeature,
} from '../components/MapView/Layers/raster-utils';
import { BoundaryLayerData } from '../context/layers/boundary';
import { NSOLayerData } from '../context/layers/nso';
import { getWCSLayerUrl, WMSLayerData } from '../context/layers/wms';
import type {
  LayerData,
  LayerDataParams,
  LoadLayerDataFuncType,
} from '../context/layers/layer-data';
import { LayerDefinitions } from '../config/utils';
import type { TableRow } from '../context/analysisResultStateSlice';

export type BaselineLayerData = NSOLayerData;
type BaselineRecord = BaselineLayerData['layerData'][0];
type RasterLayer = LayerData<WMSLayerProps>;

export type Column = {
  id: keyof TableRow;
  label: string;
  format?: (value: number) => string;
};

const hasKeys = (obj: any, keys: string[]): boolean =>
  !keys.find(key => !has(obj, key));

const checkRasterLayerData = (layerData: LayerData<LayerType>): RasterLayer => {
  const isRasterLayerData = (maybeData: any): maybeData is WMSLayerData =>
    hasKeys(maybeData, ['rasters', 'image', 'transform']);

  const { layer, data } = layerData;

  if (layer.type === 'wms' && isRasterLayerData(data)) {
    return layerData as RasterLayer;
  }
  throw new Error(
    `Data for layer '${layer.id}' does not appear to be valid raster data.`,
  );
};

const operations = {
  mean, // mean method directly from lodash
  median: (data: number[]) => {
    // eslint-disable-next-line fp/no-mutating-methods
    const sortedValues = [...data].sort();
    // Odd cases we use the middle value
    if (sortedValues.length % 2 !== 0) {
      return sortedValues[Math.floor(sortedValues.length / 2)];
    }
    // Even cases we average the two middles
    const floor = sortedValues.length / 2 - 1;
    const ceil = sortedValues.length / 2;
    return (sortedValues[floor] + sortedValues[ceil]) / 2;
  },
};

const scaleValueIfDefined = (
  value: number,
  scale?: number,
  offset?: number,
) => {
  return scale !== undefined && offset !== undefined
    ? value * scale + offset
    : value;
};

function thresholdOrNaN(value: number, threshold?: ThresholdDefinition) {
  if (threshold === undefined) {
    return value;
  }

  const isAbove =
    threshold.above === undefined ? true : value >= threshold.above;
  const isBelow =
    threshold.below === undefined ? true : value <= threshold.below;
  return isAbove && isBelow ? value : NaN;
}

function getBaselineDataForFeature(
  feature: GeoJsonBoundary,
  baselineData: BaselineLayerData,
): BaselineRecord | undefined {
  const { NSO_CODE: nsoCode } = feature.properties!;
  return baselineData.layerData.find(
    ({ adminKey }) => nsoCode.indexOf(adminKey) === 0,
  );
}

function mergeFeaturesByProperty(
  baselineFeatures: Feature[],
  aggregateData: Array<object>,
  id: string,
): Feature[] {
  return baselineFeatures.map(feature1 => {
    const aggregateProperties = aggregateData.find(
      item => get(item, id) === get(feature1, ['properties', id]) && item,
    );
    const properties = {
      ...get(feature1, 'properties'),
      ...aggregateProperties,
      impactValue: get(feature1, 'properties.data'),
    };
    return { ...feature1, properties };
  });
}
export const checkBaselineDataLayer = (
  layerId: string,
  data: any,
): BaselineLayerData => {
  const isBaselineData = (maybeData: any): maybeData is BaselineLayerData =>
    hasKeys(maybeData, ['features', 'layerData']);

  if (isBaselineData(data)) {
    return data;
  }
  throw new Error(
    `Data for layer '${layerId}' does not appear to be valid baseline data.`,
  );
};

/* eslint-disable camelcase */
export type ApiData = {
  geotiff_url: ReturnType<typeof getWCSLayerUrl>; // helps developers get an understanding of what might go here, despite the type eventually being a string.
  zones_url: string;
  group_by?: string;
  geojson_out?: boolean;
};

/* eslint-disable camelcase */
export type AlertRequest = {
  alert_name: string;
  alert_config: WMSLayerProps;
  email: string;
  max?: string;
  min?: string;
  prism_url: string;
  zones: object;
};

export function getPrismUrl(): string {
  const { hostname, origin } = window.location;
  if (hostname === 'localhost') {
    // Special case - if we're testing locally, then assume we are testing prism-mongolia
    // This is to ensure we don't pollute the database with localhost URLs
    return 'https://prism-mongolia.org';
  }

  return origin;
}

export async function fetchApiData(
  url: string,
  apiData: ApiData | AlertRequest,
): Promise<Array<{ [k in string]: string | number }>> {
  return (
    await fetch(url, {
      method: 'POST',
      cache: 'no-cache',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      // body data type must match "Content-Type" header
      body: JSON.stringify(apiData),
    })
  )
    .text()
    .then(message => {
      try {
        return JSON.parse(message);
      } catch (e) {
        // In some cases the response isn't valid JSON.
        // In those cases, just wrap the full response in an object.
        return {
          message,
        };
      }
    });
}

export function scaleAndFilterAggregateData(
  aggregateData: AsyncReturnType<typeof fetchApiData>,
  hazardLayerDef: WMSLayerProps,
  operation: AggregationOperations,
  threshold: ThresholdDefinition,
): AsyncReturnType<typeof fetchApiData> {
  const { wcsConfig } = hazardLayerDef;
  const { scale, offset } = wcsConfig || {};

  return aggregateData
    .map(data => {
      return {
        ...data,
        [operation]: scaleValueIfDefined(
          get(data, `stats_${operation}`) as number,
          scale,
          offset,
        ),
      };
    })
    .filter(data => {
      return !Number.isNaN(
        thresholdOrNaN(data[operation] as number, threshold),
      );
    });
}

export function generateFeaturesFromApiData(
  aggregateData: AsyncReturnType<typeof fetchApiData>,
  baselineData: NSOLayerData,
  groupBy: StatsApi['groupBy'],
  operation: AggregationOperations,
): GeoJsonBoundary[] {
  const mergedFeatures = mergeFeaturesByProperty(
    baselineData.features.features,
    aggregateData,
    groupBy,
  );

  return mergedFeatures.filter(feature => {
    const value = get(feature, ['properties', operation]);
    return value && !Number.isNaN(value);
  }) as GeoJsonBoundary[];
}

export async function loadFeaturesFromApi(
  layer: ImpactLayerProps,
  baselineData: BaselineLayerData,
  hazardLayerDef: WMSLayerProps,
  operation: AggregationOperations,
  extent?: Extent,
  date?: number,
): Promise<GeoJsonBoundary[]> {
  const wcsUrl = getWCSLayerUrl({
    layer: hazardLayerDef,
    extent,
    date,
  } as LayerDataParams<WMSLayerProps>);

  const statsApi = layer.api as StatsApi;
  const apiUrl = statsApi.url;

  const apiData = {
    geotiff_url: wcsUrl,
    zones_url: statsApi.zonesUrl,
    group_by: statsApi.groupBy,
    geojson_out: false,
  };

  const aggregateData = scaleAndFilterAggregateData(
    await fetchApiData(apiUrl, apiData),
    hazardLayerDef,
    operation,
    layer.threshold,
  );

  return generateFeaturesFromApiData(
    aggregateData,
    baselineData,
    statsApi.groupBy,
    operation,
  );
}

export async function loadFeaturesClientSide(
  api: ThunkApi,
  layer: ImpactLayerProps,
  adminBoundaries: BoundaryLayerData,
  baselineData: BaselineLayerData,
  hazardLayerDef: WMSLayerProps,
  operation: AggregationOperations,
  loadLayerData: LoadLayerDataFuncType,
  extent?: Extent,
  date?: number,
): Promise<GeoJsonBoundary[]> {
  const { getState, dispatch } = api;

  const { wcsConfig } = hazardLayerDef;
  const { noData, scale, offset } = wcsConfig || {};

  const existingHazardLayer = layerDataSelector(
    layer.hazardLayer,
    date,
  )(getState());

  if (!existingHazardLayer) {
    await dispatch(
      loadLayerData({
        layer: hazardLayerDef,
        extent,
        date,
      } as LayerDataParams<WMSLayerProps>),
    );
  }

  const hazardLayer = checkRasterLayerData(
    layerDataSelector(layer.hazardLayer, date)(getState())!,
  );
  const {
    data: { rasters, transform, image },
  } = hazardLayer;

  // Calculate a bounding box for each feature that we have baseline data for
  const matchingFeatures = adminBoundaries.features.reduce(
    (acc, f) => {
      const feature = f as GeoJsonBoundary;
      const baseline =
        featureIntersectsImage(feature, image) &&
        getBaselineDataForFeature(feature, baselineData);
      return baseline
        ? acc.concat({
            id: baseline.adminKey,
            baseline,
            feature,
            bounds: bbox(feature),
          })
        : acc;
    },
    [] as {
      id: string;
      baseline: BaselineRecord;
      feature: GeoJsonBoundary;
      bounds: ReturnType<typeof bbox>;
    }[],
  );

  // Loop over the features and grab pixels that are contained by the feature.
  const buckets = matchingFeatures.reduce((acc, { id, feature }) => {
    const contained = pixelsInFeature(
      feature,
      rasters[0],
      rasters.width,
      transform,
    );
    return contained.length > 0 ? { ...acc, [id]: contained } : acc;
  }, {} as { [key: string]: number[] });

  return matchingFeatures.reduce((acc, { id, feature, baseline }) => {
    const values = buckets[id];

    if (values) {
      const raw = operations[operation](
        noData ? values.filter(value => value !== noData) : values,
      );
      const scaled = scaleValueIfDefined(raw, scale, offset);
      const aggregateValue = thresholdOrNaN(scaled, layer.threshold);
      if (!Number.isNaN(aggregateValue)) {
        const { properties } = feature;

        const baselineValue = isString(baseline.value)
          ? parseFloat(baseline.value)
          : baseline.value;
        return isNull(baselineValue)
          ? acc
          : acc.concat({
              ...feature,
              properties: {
                ...properties,
                [operation]: aggregateValue,
                impactValue: baselineValue,
              },
            });
      }
    }
    return acc;
  }, [] as GeoJsonBoundary[]);
}

export function getAnalysisTableColumns(
  analysisResult: AnalysisResult,
): Column[] {
  const { statistic } = analysisResult;
  const baselineLayerTitle = analysisResult.getBaselineLayer().title;

  return [
    {
      id: 'localName',
      label: 'Local Name',
    },
    {
      id: 'name',
      label: 'Name',
    },
    {
      id: statistic,
      label: invert(AggregationOperations)[statistic], // invert maps from computer name to display name.
      format: (value: number) => value.toLocaleString('en-US'),
    },

    {
      id: 'baselineValue',
      label: baselineLayerTitle,
      format: (value: number | string) => value.toLocaleString('en-US'),
    },
  ];
}

export function downloadCSVFromTableData(analysisResult: AnalysisResult) {
  const { tableData, key: createdAt } = analysisResult;
  const columns = getAnalysisTableColumns(analysisResult);
  // Built with https://stackoverflow.com/a/14966131/5279269
  const csvLines = [
    columns.map(col => col.label).join(','),
    ...tableData.map(row => columns.map(col => row[col.id]).join(',')),
  ];
  const rawCsv = `data:text/csv;charset=utf-8,${csvLines.join('\n')}`;

  const encodedUri = encodeURI(rawCsv);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute(
    'download',
    `analysis_${new Date(createdAt).toDateString()}.csv`,
  );
  document.body.appendChild(link); // Required for FF

  link.click();
}
// not in analysisResultStateSlice to prevent import cycle
export class AnalysisResult {
  key: number = Date.now();
  featureCollection: FeatureCollection;
  tableData: TableRow[];
  // for debugging purposes only, as its easy to view the raw API response via Redux Devtools. Should be left empty in production
  private rawApiData?: object[];

  statistic: AggregationOperations;
  threshold: ThresholdDefinition;

  legend: LegendDefinition;
  hazardLayerId: WMSLayerProps['id'];
  baselineLayerId: NSOLayerProps['id'];

  constructor(
    tableData: TableRow[],
    featureCollection: FeatureCollection,
    hazardLayer: WMSLayerProps,
    baselineLayer: NSOLayerProps,
    statistic: AggregationOperations,
    threshold: ThresholdDefinition,
    rawApiData?: object[],
  ) {
    this.featureCollection = featureCollection;
    this.tableData = tableData;
    this.statistic = statistic;
    this.threshold = threshold;
    this.legend = baselineLayer.legend;
    this.rawApiData = rawApiData;

    this.hazardLayerId = hazardLayer.id;
    this.baselineLayerId = baselineLayer.id;
  }
  getHazardLayer(): WMSLayerProps {
    return LayerDefinitions[this.hazardLayerId] as WMSLayerProps;
  }
  getBaselineLayer(): NSOLayerProps {
    return LayerDefinitions[this.baselineLayerId] as NSOLayerProps;
  }
}
