import React, { PropsWithChildren, useState } from 'react';
import {
  createStyles,
  Divider,
  FormControl,
  Grid,
  Hidden,
  List,
  ListItem,
  MenuItem,
  Paper,
  Select,
  Typography,
  WithStyles,
  withStyles,
  Button,
} from '@material-ui/core';
import { Visibility, VisibilityOff } from '@material-ui/icons';
import { useDispatch, useSelector } from 'react-redux';
import ColorIndicator from './ColorIndicator';
import { LayerFormInput, LayerType } from '../../../config/types';
import { setFormInputValue } from '../../../context/mapStateSlice';
import { layerFormSelector } from '../../../context/mapStateSlice/selectors';
import {
  analysisResultSelector,
  isAnalysisLayerActiveSelector,
} from '../../../context/analysisResultStateSlice';

function Legends({ classes, layers }: LegendsProps) {
  const [open, setOpen] = useState(true);
  const analysisResult = useSelector(analysisResultSelector);
  const isAnalysisLayerActive = useSelector(isAnalysisLayerActiveSelector);

  const legendItems = [
    ...layers.map(({ id, title, legend, legendText }) => {
      if (!legend || !legendText) {
        // this layer doesn't have a legend (likely boundary), so lets ignore.
        return null;
      }
      return (
        <LegendItem
          layerId={id}
          classes={classes}
          key={title}
          title={title}
          legend={legend}
        >
          {legendText}
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
  layerId,
  title,
  legend,
  children,
}: LegendItemProps) {
  const dispatch = useDispatch();
  const form = useSelector(layerFormSelector(layerId));

  const handleChangeFormInput = (event: any, input: LayerFormInput) => {
    const { value } = event.target;
    dispatch(
      setFormInputValue({
        layerId: layerId!,
        inputId: input.id,
        value,
      }),
    );
  };

  return (
    <ListItem disableGutters dense>
      <Paper className={classes.paper}>
        <Grid container direction="column" spacing={1}>
          <Grid item>
            <Typography variant="h4">{title}</Typography>
          </Grid>

          <Divider />

          {form &&
            form.inputs.map(input => {
              return (
                <Grid key={input.id} item>
                  <Typography variant="h4">{input.label}</Typography>
                  <FormControl>
                    <Select
                      className={classes.select}
                      value={input.value}
                      onChange={e => handleChangeFormInput(e, input)}
                    >
                      {input.values.map(v => (
                        <MenuItem key={v.value} value={v.value}>
                          {v.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              );
            })}

          {legend && (
            <Grid item>
              {legend.map(({ value, color }: any) => (
                <ColorIndicator
                  key={value}
                  value={value as string}
                  color={color as string}
                />
              ))}
            </Grid>
          )}

          <Divider />

          {children && (
            <Grid item>
              <Typography variant="h5">{children}</Typography>
            </Grid>
          )}
        </Grid>
      </Paper>
    </ListItem>
  );
}

const styles = () =>
  createStyles({
    container: {
      textAlign: 'right',
    },
    label: {
      marginLeft: '10px',
    },
    list: {
      overflow: 'auto',
      maxHeight: '70vh',
      position: 'absolute',
      right: '16px',
    },
    select: {
      color: '#333',
    },
    paper: {
      padding: 8,
      width: 180,
    },
  });

export interface LegendsProps extends WithStyles<typeof styles> {
  layers: LayerType[];
}

interface LegendItemProps
  extends WithStyles<typeof styles>,
    PropsWithChildren<{}> {
  layerId?: LayerType['id'];
  title: LayerType['title'];
  legend: LayerType['legend'];
}

export default withStyles(styles)(Legends);
