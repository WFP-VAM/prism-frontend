import React from 'react';
import moment from 'moment';
import { useDispatch, useSelector } from 'react-redux';
import { get } from 'lodash';
import { GeoJSONLayer } from 'react-mapbox-gl';
import * as MapboxGL from 'mapbox-gl';
import {
  showPopup,
  fetchPopupData,
  clearRemotePopupData,
} from '../../../../context/tooltipStateSlice';
import { BoundaryLayerProps } from '../../../../config/types';
import { LayerData } from '../../../../context/layers/layer-data';
import {
  layersSelector,
  layerDataSelector,
  dateRangeSelector,
} from '../../../../context/mapStateSlice/selectors';

/**
 * To activate fillOnClick option, we "fill in"
 * polygons with opacity 0.
 */
const fillPaint: MapboxGL.FillPaint = {
  'fill-opacity': 0,
};

function onToggleHover(cursor: string, targetMap: MapboxGL.Map) {
  // eslint-disable-next-line no-param-reassign, fp/no-mutation
  targetMap.getCanvas().style.cursor = cursor;
}

const getLinePaintOptions: (
  layer: BoundaryLayerProps,
) => MapboxGL.LinePaint = layer => {
  return {
    'line-color': 'grey',
    'line-width': 1,
    'line-opacity': layer.opacity,
  };
};

function BoundaryLayer({ layer }: { layer: BoundaryLayerProps }) {
  const dispatch = useDispatch();
  const boundaryLayer = useSelector(layerDataSelector(layer.id)) as
    | LayerData<BoundaryLayerProps>
    | undefined;
  const layers = useSelector(layersSelector);
  const { startDate } = useSelector(dateRangeSelector);
  const { data } = boundaryLayer || {};
  if (!data) {
    return null; // boundary layer hasn't loaded yet. We load it on init inside MapView. We can't load it here since its a dependency of other layers.
  }
  // use last layer as reference for popup content
  // start with index 1 because index 0 is boundary layer itself
  const lastLayer = layers.length > 1 ? layers[layers.length - 1] : null;
  return (
    <GeoJSONLayer
      id="boundaries"
      data={data}
      fillPaint={fillPaint}
      linePaint={getLinePaintOptions(layer)}
      fillOnMouseEnter={(evt: any) => onToggleHover('pointer', evt.target)}
      fillOnMouseLeave={(evt: any) => onToggleHover('', evt.target)}
      fillOnClick={(evt: any) => {
        const coordinates = evt.lngLat;
        const locationNames = layer.adminLevelNames.map(
          level => get(evt.features[0], ['properties', level], '') as string,
        );
        const params = {
          coordinates,
          locationName: locationNames.join(', '),
          popupUrl: lastLayer ? lastLayer.popupUrl : undefined,
        };
        const featureProperties = evt.features[0].properties;
        const areacode = featureProperties[layer.adminCode];
        dispatch(clearRemotePopupData());
        if (params.popupUrl) {
          const { href } = window.location;
          const url = new URL(
            params.popupUrl.startsWith('http')
              ? params.popupUrl
              : `${href}${params.popupUrl}`,
          );
          url.searchParams.set('lon', coordinates.lng.toString());
          url.searchParams.set('lat', coordinates.lat.toString());
          url.searchParams.set('location', JSON.stringify(locationNames));
          url.searchParams.set('areacode', areacode);
          url.searchParams.set(
            'date',
            startDate ? moment(startDate).format('YYYY-MM-DD') : '',
          );
          dispatch(fetchPopupData(url.toString()));
        }
        dispatch(showPopup(params));
      }}
    />
  );
}

export default BoundaryLayer;
