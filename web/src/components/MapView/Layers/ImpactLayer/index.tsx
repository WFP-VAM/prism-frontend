import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { GeoJSONLayer } from 'react-mapbox-gl';
import { FillPaint, LinePaint } from 'mapbox-gl';
import { get } from 'lodash';
import { createStyles, withStyles, WithStyles, Theme } from '@material-ui/core';
import { Extent } from '../raster-utils';
import { legendToStops } from '../layer-utils';
import { ImpactLayerProps } from '../../../../config/types';
import { LayerDefinitions } from '../../../../config/utils';
import {
  LayerData,
  loadLayerData,
} from '../../../../context/layers/layer-data';

import { addPopupData } from '../../../../context/tooltipStateSlice';
import {
  dateRangeSelector,
  layerDataSelector,
  mapSelector,
} from '../../../../context/mapStateSlice/selectors';

const linePaint: LinePaint = {
  'line-color': 'grey',
  'line-width': 1,
  'line-opacity': 0.3,
};

function getHazardData(evt: any, operation: string) {
  const data = get(evt.features[0].properties, operation || 'median', null);

  return data ? data.toFixed(2) : 'No Data';
}

const ImpactLayer = ({ classes, layer }: ComponentProps) => {
  const map = useSelector(mapSelector);
  const { startDate: selectedDate } = useSelector(dateRangeSelector);
  const { data, date } =
    (useSelector(layerDataSelector(layer.id, selectedDate)) as LayerData<
      ImpactLayerProps
    >) || {};
  const dispatch = useDispatch();

  // TODO - Use bbox on the admin boundaries instead.
  const bounds = map && map.getBounds();
  const minX = bounds ? bounds.getWest() : 0;
  const maxX = bounds ? bounds.getEast() : 0;
  const minY = bounds ? bounds.getSouth() : 0;
  const maxY = bounds ? bounds.getNorth() : 0;

  useEffect(() => {
    // For now, assume that if we have layer data, we don't need to refetch. This could change down the line if we
    // want to dynamically re-fetch data based on changing map bounds.
    // Only fetch once we actually know the extent
    if (
      selectedDate &&
      (!data || date !== selectedDate) &&
      minX !== 0 &&
      maxX !== 0
    ) {
      const extent: Extent = [minX, minY, maxX, maxY];
      dispatch(loadLayerData({ layer, extent, date: selectedDate }));
    }
  }, [dispatch, layer, maxX, maxY, minX, minY, data, selectedDate, date]);

  if (!data) {
    return selectedDate ? null : (
      <div className={classes.message}>
        <div className={classes.messageContainer}>
          <h2>Select an available date to view data</h2>
        </div>
      </div>
    );
  }

  const { impactFeatures, boundaries } = data;
  const noMatchingDistricts = impactFeatures.features.length === 0;

  const fillPaint: FillPaint = {
    'fill-opacity': layer.opacity || 0.1,
    'fill-color': noMatchingDistricts
      ? 'gray'
      : {
          property: 'impactValue',
          stops: legendToStops(layer.legend),
        },
  };

  const hazardLayerDef = LayerDefinitions[layer.hazardLayer];
  const operation = layer.operation || 'median';
  const hazardTitle = `${hazardLayerDef.title} (${operation})`;

  return (
    <GeoJSONLayer
      id={`layer-${layer.id}`}
      below="boundaries"
      data={noMatchingDistricts ? boundaries : impactFeatures}
      linePaint={linePaint}
      fillPaint={fillPaint}
      fillOnClick={(evt: any) => {
        const popupData = {
          [layer.title]: {
            data: get(evt.features[0], 'properties.impactValue', 'No Data'),
            coordinates: evt.lngLat,
          },
          [hazardTitle]: {
            data: getHazardData(evt, operation),
            coordinates: evt.lngLat,
          },
        };
        dispatch(addPopupData(popupData));
      }}
    />
  );
};

const styles = (theme: Theme) =>
  createStyles({
    message: {
      position: 'absolute',
      height: '100%',
      width: '100%',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
    },
    messageContainer: {
      fontSize: 24,
      paddingLeft: theme.spacing(2),
      paddingRight: theme.spacing(2),
      backgroundColor: theme.palette.grey.A100,
      borderRadius: theme.spacing(2),
    },
  });

interface ComponentProps extends WithStyles<typeof styles> {
  layer: ImpactLayerProps;
}

export default withStyles(styles)(ImpactLayer);
