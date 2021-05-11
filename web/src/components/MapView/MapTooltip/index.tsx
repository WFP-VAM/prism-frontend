import React from 'react';
import { useSelector } from 'react-redux';
import { Popup } from 'react-mapbox-gl';
import { createStyles, withStyles, WithStyles } from '@material-ui/core';
import { tooltipSelector } from '../../../context/tooltipStateSlice';

function MapTooltip({ classes }: TooltipProps) {
  const popup = useSelector(tooltipSelector);

  return popup.showing && popup.coordinates ? (
    <Popup
      anchor="bottom"
      coordinates={popup.coordinates}
      className={classes.popup}
    >
      <h4>{popup.locationName}</h4>
      {Object.entries(popup.data)
        .filter(([, value]) => value.coordinates === popup.coordinates)
        .map(([key, value]) => (
          <h4 key={key}>
            {key}: {value.data}
          </h4>
        ))}
    </Popup>
  ) : null;
}

const styles = () =>
  createStyles({
    popup: {
      '& div.mapboxgl-popup-content': {
        background: 'black',
        color: 'white',
        padding: '10px 10px 10px',
      },
      '& div.mapboxgl-popup-tip': {
        'border-top-color': 'black',
      },
    },
  });

export interface TooltipProps extends WithStyles<typeof styles> {}

export default withStyles(styles)(MapTooltip);
