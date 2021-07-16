import _ from 'lodash';
import { Map } from 'mapbox-gl';
import { LayerDefinitions } from '../../config/utils';
import { getExtent } from './Layers/raster-utils';
import { WMSLayerProps, FeatureInfoType } from '../../config/types';
import { ExposedPopulationResult } from '../../utils/analysis-utils';
import { TableData } from '../../context/tableStateSlice';

export const getActiveFeatureInfoLayers = (map: Map): WMSLayerProps[] => {
  const matchStr = 'layer-';
  const layerIds =
    map
      .getStyle()
      .layers?.filter(l => l.id.startsWith(matchStr))
      .map(l => l.id.split(matchStr)[1]) ?? [];

  if (layerIds.length === 0) {
    return [];
  }

  const featureInfoLayers = Object.values(LayerDefinitions).filter(
    l => layerIds.includes(l.id) && l.type === 'wms' && l.featureInfoProps,
  );

  if (featureInfoLayers.length === 0) {
    return [];
  }

  return featureInfoLayers as WMSLayerProps[];
};

export const getFeatureInfoParams = (
  map: Map,
  evt: any,
  date: string,
): FeatureInfoType => {
  const { x, y } = evt.point;
  const bbox = getExtent(map);
  const { clientWidth, clientHeight } = map.getContainer();

  const params = {
    bbox,
    x: Math.floor(x),
    y: Math.floor(y),
    width: clientWidth,
    height: clientHeight,
    time: date,
  };

  return params;
};

export const convertToTableData = (
  result: ExposedPopulationResult,
  groupBy: string,
) => {
  const { key, statistic } = result;
  const { features } = result.featureCollection;
  const fields = _.uniq(
    _.map(features, f => f.properties && f.properties[key]),
  );

  const featureProperties = features.map(feature => {
    return {
      [groupBy]: feature.properties?.[groupBy],
      [key]: feature.properties?.[key],
      [statistic]: feature.properties?.[statistic],
    };
  });
  const rowData = _.mapValues(_.groupBy(featureProperties, groupBy), x =>
    _.chain(x)
      .keyBy(key)
      .mapValues(statistic)
      .mapValues(z => _.parseInt(z))
      .value(),
  );

  const groupedRowData = _.map(rowData, (x, i: number) => {
    return {
      [groupBy]: i,
      ...x,
    };
  });
  const groupedRowDataWithAllLabels = _.map(groupedRowData, row => {
    let item: string = '';
    _.each(_.difference(fields, _.keysIn(row)), r => {
      // eslint-disable-next-line fp/no-mutation
      item = r;
    });
    return item !== '' ? _.assign(row, { [item]: 0 }) : row;
  });

  const headlessRows = _.map(groupedRowDataWithAllLabels as object, row => {
    let t: number = 0;
    _.each(fields, (c: string) => {
      // eslint-disable-next-line fp/no-mutation
      t += parseInt(row[c], 10);
    });
    return _.assign(row, { Total: t });
  });
  const columns = [groupBy, ...fields, 'Total'];
  const headRow = _.zipObject(columns, columns);
  const rows = [headRow, ...headlessRows];
  return { columns, rows };
};

export const exportDataTableToCSV = (data: TableData) => {
  const { rows } = data;
  return _.join(
    _.map(rows, r => _.map(_.values(r), x => x)),
    '\n',
  );
};

export const downloadToFile = (
  source: { content: string; isUrl: boolean },
  filename: string,
  contentType: string,
) => {
  const link = document.createElement('a');
  const fileType = contentType.split('/')[1];

  link.setAttribute(
    'href',
    source.isUrl
      ? source.content
      : URL.createObjectURL(new Blob([source.content], { type: contentType })),
  );
  link.setAttribute('download', `${filename}.${fileType}`);
  link.click();
};
