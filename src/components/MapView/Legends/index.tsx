import React, { PropsWithChildren, useState } from 'react';
import {
  Box,
  Button,
  createStyles,
  Divider,
  Grid,
  Hidden,
  List,
  ListItem,
  Paper,
  Slider,
  Typography,
  WithStyles,
  withStyles,
  LinearProgress,
} from '@material-ui/core';
import { Visibility, VisibilityOff } from '@material-ui/icons';

import { useSelector, useDispatch } from 'react-redux';
import { Extent } from '../Layers/raster-utils';
import {
  mapSelector,
  dateRangeSelector,
} from '../../../context/mapStateSlice/selectors';
import ColorIndicator from './ColorIndicator';
import {
  LayerType,
  AggregationOperations,
  NSOLayerProps,
  WMSLayerProps,
  LayerKey,
  GeometryType,
} from '../../../config/types';
import { formatWMSLegendUrl } from '../../../utils/server-utils';
import {
  analysisResultSelector,
  isAnalysisLayerActiveSelector,
  AnalysisDispatchParams,
  requestAndStoreAnalysis,
  isExposureAnalysisLoadingSelector,
  clearAnalysisResult,
} from '../../../context/analysisResultStateSlice';

import { LayerDefinitions } from '../../../config/utils';

/**
 * Returns layer identifier used to perform exposure analysis.
 *
 * @return LayerKey or undefined if exposure not found or GeometryType is not Polygon.
 */
function GetExposureFromLayer(layer: LayerType): LayerKey | undefined {
  return layer.type === 'wms' &&
    layer.exposure &&
    layer.geometry === GeometryType.Polygon
    ? layer.exposure
    : undefined;
}

function Legends({ classes, layers, extent }: LegendsProps) {
  const [open, setOpen] = useState(true);
  const isAnalysisLayerActive = useSelector(isAnalysisLayerActiveSelector);
  const analysisResult = useSelector(analysisResultSelector);

  const legendItems = [
    ...layers.map(layer => {
      if (!layer.legend || !layer.legendText) {
        // this layer doesn't have a legend (likely boundary), so lets ignore.
        return null;
      }

      // If legend array is empty, we fetch from remote server the legend as GetLegendGraphic request.
      const legendUrl =
        layer.type === 'wms' && layer.legend.length === 0
          ? formatWMSLegendUrl(layer.baseUrl, layer.serverLayerName)
          : undefined;

      const exposure = GetExposureFromLayer(layer);

      return (
        <LegendItem
          classes={classes}
          key={layer.title}
          id={layer.id}
          title={layer.title}
          legend={layer.legend}
          legendUrl={legendUrl}
          type={layer.type}
          opacity={layer.opacity}
          exposure={exposure}
          extent={extent}
        >
          {layer.legendText}
        </LegendItem>
      );
    }),
    // add analysis legend item if layer is active and analysis result exists
    ...(isAnalysisLayerActive && analysisResult
      ? [
          <LegendItem
            key={analysisResult.key}
            legend={analysisResult.legend}
            title={`${analysisResult.getBaselineLayer().title} exposed to ${
              analysisResult.getHazardLayer().title
            }`}
            classes={classes}
            opacity={0.5} // TODO: initial opacity value
          >
            Impact Analysis on {analysisResult.getBaselineLayer().legendText}
            <br />
            {analysisResult.threshold.above
              ? `Above Threshold: ${analysisResult.threshold.above}`
              : ''}
            <br />
            {analysisResult.threshold.below
              ? `Below Threshold: ${analysisResult.threshold.below}`
              : ''}
          </LegendItem>,
        ]
      : []),
  ];

  return (
    <Grid item className={classes.container}>
      <Button
        variant="contained"
        color="primary"
        onClick={() => setOpen(!open)}
      >
        {open ? (
          <VisibilityOff fontSize="small" />
        ) : (
          <Visibility fontSize="small" />
        )}
        <Hidden smDown>
          <Typography className={classes.label} variant="body2">
            Legend
          </Typography>
        </Hidden>
      </Button>
      {open && <List className={classes.list}>{legendItems}</List>}
    </Grid>
  );
}

// Children here is legendText
function LegendItem({
  classes,
  id,
  title,
  legend,
  type,
  opacity: initialOpacity,
  children,
  legendUrl,
  exposure,
  extent,
}: LegendItemProps) {
  const dispatch = useDispatch();
  const map = useSelector(mapSelector);
  const analysisExposureLoading = useSelector(
    isExposureAnalysisLoadingSelector,
  );

  const { startDate: selectedDate } = useSelector(dateRangeSelector);

  const [opacity, setOpacityValue] = useState<number | number[]>(
    initialOpacity || 0,
  );

  const analysisResult = useSelector(analysisResultSelector);

  const runExposureAnalysis = async () => {
    if (!id || !extent) {
      return;
    }

    if (!selectedDate) {
      throw new Error('Date must be given to run analysis');
    }

    const params: AnalysisDispatchParams = {
      hazardLayer: LayerDefinitions[exposure as LayerKey] as WMSLayerProps,
      baselineLayer: LayerDefinitions[
        'ipc_phase_12_2020' as LayerKey
      ] as NSOLayerProps, // TODO: Make analysis without baselineLayer.
      date: selectedDate,
      statistic: AggregationOperations.Sum,
      extent,
      threshold: {
        above: undefined,
        below: undefined,
      },
      wfsLayer: LayerDefinitions[id] as WMSLayerProps,
      isExposure: true,
    };

    await dispatch(requestAndStoreAnalysis(params));
  };

  const handleChangeOpacity = (
    event: React.ChangeEvent<{}>,
    newValue: number | number[],
  ) => {
    // TODO: temporary solution for opacity adjustment, we hope to edit react-mapbox in the future to support changing props
    // because the whole map will be re-rendered if using state directly
    if (map) {
      const [layerId, opacityType] = ((
        layerType?: LayerType['type'],
      ): [string, string] => {
        switch (layerType) {
          case 'wms':
            return [`layer-${id}`, 'raster-opacity'];
          case 'impact':
          case 'nso':
            return [`layer-${id}-fill`, 'fill-opacity'];
          case 'point_data':
            return [`layer-${id}-circle`, 'circle-opacity'];
          // analysis layer type is undefined TODO we should try make analysis a layer to remove edge cases like this
          case undefined:
            return ['layer-analysis-fill', 'fill-opacity'];
          default:
            throw new Error('Unknown map layer type');
        }
      })(type);

      map.setPaintProperty(layerId, opacityType, newValue);
      setOpacityValue(newValue);
    }
  };

  return (
    <ListItem disableGutters dense>
      <Paper className={classes.paper}>
        <Grid container direction="column" spacing={1}>
          <Grid item style={{ display: 'flex' }}>
            <Typography style={{ flexGrow: 1 }} variant="h4">
              {title}
            </Typography>
          </Grid>
          <Divider />
          <Grid item className={classes.slider}>
            <Box px={1}>
              <Slider
                value={opacity}
                step={0.01}
                min={0}
                max={1}
                aria-labelledby="opacity-slider"
                onChange={handleChangeOpacity}
              />
            </Box>
          </Grid>
          {legend && (
            <Grid item>
              {legendUrl ? (
                <img src={legendUrl} alt={title} />
              ) : (
                legend.map(({ value, color }: any) => (
                  <ColorIndicator
                    key={value}
                    value={value as string}
                    color={color as string}
                    opacity={opacity as number}
                  />
                ))
              )}
            </Grid>
          )}

          <Divider />

          {children && (
            <Grid item>
              <Typography variant="h5">{children}</Typography>
            </Grid>
          )}

          {exposure && !analysisResult && (
            <AnalysisButton
              variant="contained"
              color="primary"
              size="small"
              onClick={runExposureAnalysis}
            >
              Exposure Analysis
            </AnalysisButton>
          )}

          {exposure && analysisResult && (
            <AnalysisButton
              variant="contained"
              color="secondary"
              size="small"
              onClick={() => dispatch(clearAnalysisResult())}
            >
              clear analysis
            </AnalysisButton>
          )}

          {exposure && analysisExposureLoading && <LinearProgress />}
        </Grid>
      </Paper>
    </ListItem>
  );
}

const AnalysisButton = withStyles(() => ({
  root: {
    marginTop: '1em',
    marginBottom: '1em',
    fontSize: '0.7em',
  },
}))(Button);

const styles = () =>
  createStyles({
    container: {
      textAlign: 'right',
    },
    label: {
      marginLeft: '10px',
    },
    list: {
      overflowX: 'hidden',
      overflowY: 'auto',
      maxHeight: '70vh',
      position: 'absolute',
      right: '16px',
    },
    paper: {
      padding: 8,
      width: 180,
    },
    slider: {
      padding: '0 5px',
    },
  });

export interface LegendsProps extends WithStyles<typeof styles> {
  layers: LayerType[];
  extent?: Extent;
}

interface LegendItemProps
  extends WithStyles<typeof styles>,
    PropsWithChildren<{}> {
  id?: LayerType['id'];
  title: LayerType['title'];
  legend: LayerType['legend'];
  legendUrl?: string;
  type?: LayerType['type'];
  opacity: LayerType['opacity'];
  exposure?: LayerKey;
  extent?: Extent;
}

export default withStyles(styles)(Legends);
