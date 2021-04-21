import React from 'react';
import { useSelector } from 'react-redux';
import { fromPairs } from 'lodash';
import moment from 'moment';
import { Layer, Source } from 'react-mapbox-gl';
import { WMSLayerProps } from '../../../../config/types';
import { getWMSUrl } from '../raster-utils';
import { useDefaultDate } from '../../../../utils/useDefaultDate';
import { layerFormSelector } from '../../../../context/mapStateSlice/selectors';

function WMSLayers({
  layer: {
    id,
    baseUrl,
    serverLayerName,
    additionalQueryParams,
    opacity,
    group,
  },
}: LayersProps) {
  const selectedDate = useDefaultDate(serverLayerName, group);
  const layerForm = useSelector(layerFormSelector(id));
  const layerFormParams = layerForm
    ? fromPairs(layerForm.inputs.map(input => [input.id, input.value]))
    : {};

  return (
    <>
      <Source
        id={`source-${id}`}
        tileJsonSource={{
          type: 'raster',
          tiles: [
            `${getWMSUrl(baseUrl, serverLayerName, {
              ...additionalQueryParams,
              ...layerFormParams,
              ...(selectedDate && {
                time: moment(selectedDate).format('YYYY-MM-DD'),
              }),
            })}&bbox={bbox-epsg-3857}`,
          ],
          tileSize: 256,
        }}
      />

      <Layer
        below="boundaries"
        type="raster"
        id={`layer-${id}`}
        sourceId={`source-${id}`}
        paint={{ 'raster-opacity': opacity }}
      />
    </>
  );
}

export interface LayersProps {
  layer: WMSLayerProps;
}

export default WMSLayers;
