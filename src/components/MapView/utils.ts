import { Map } from 'mapbox-gl';
import { LayerDefinitions } from '../../config/utils';
import { getExtent } from './Layers/raster-utils';
import { WMSLayerProps, FeatureInfoType } from '../../config/types';

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
