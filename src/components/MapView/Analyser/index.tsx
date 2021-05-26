import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Box,
  Button,
  createStyles,
  FormControl,
  FormControlLabel,
  FormGroup,
  Input,
  LinearProgress,
  Radio,
  RadioGroup,
  Switch,
  TextField,
  Theme,
  Typography,
  withStyles,
  WithStyles,
} from '@material-ui/core';
import { grey } from '@material-ui/core/colors';
import { useHistory } from 'react-router-dom';
import { ArrowDropDown, BarChart } from '@material-ui/icons';
import { useDispatch, useSelector } from 'react-redux';
import bbox from '@turf/bbox';
import DatePicker from 'react-datepicker';

import { extractPropsFromURL, propsFromURL, removePropsFromURL } from './util';
import {
  getBoundaryLayerSingleton,
  LayerDefinitions,
} from '../../../config/utils';
import {
  AggregationOperations,
  BoundaryLayerProps,
  NSOLayerProps,
  WMSLayerProps,
  LayerKey,
} from '../../../config/types';
import { LayerData } from '../../../context/layers/layer-data';
import { layerDataSelector } from '../../../context/mapStateSlice/selectors';
import { Extent } from '../Layers/raster-utils';
import { availableDatesSelector } from '../../../context/serverStateSlice';
import {
  AnalysisDispatchParams,
  analysisResultSelector,
  clearAnalysisResult,
  isAnalysisLayerActiveSelector,
  isAnalysisLoadingSelector,
  requestAndStoreAnalysis,
  setIsMapLayerActive,
} from '../../../context/analysisResultStateSlice';
import AnalysisTable from './AnalysisTable';
import {
  getAnalysisTableColumns,
  downloadCSVFromTableData,
} from '../../../utils/analysis-utils';
import {
  useAnalyserReducer,
  AnalyserForm,
  URLParamList,
} from './AnalyserReducer';
import LayerDropdown from '../Layers/LayerDropdown';

const boundaryLayer = getBoundaryLayerSingleton();

function Analyser({ classes }: AnalyserProps) {
  const dispatch = useDispatch();
  const history = useHistory();
  const boundaryLayerData = useSelector(layerDataSelector(boundaryLayer.id)) as
    | LayerData<BoundaryLayerProps>
    | undefined;

  const availableDates = useSelector(availableDatesSelector);
  const analysisResult = useSelector(analysisResultSelector);

  const isAnalysisLoading = useSelector(isAnalysisLoadingSelector);
  const isMapLayerActive = useSelector(isAnalysisLayerActiveSelector);

  const [isAnalyserFormOpen, setIsAnalyserFormOpen] = useState(false);
  const [isTableViewOpen, setIsTableViewOpen] = useState(true);
  const activeUrl: React.MutableRefObject<string> = useRef<string>('');

  // form elements
  const [form, setForm] = useAnalyserReducer();

  // set default date after dates finish loading and when hazard layer changes
  useEffect(() => {
    const dates = form.hazardLayerId
      ? availableDates[
          (LayerDefinitions[form.hazardLayerId] as WMSLayerProps)
            ?.serverLayerName
        ]
      : null;
    if (!dates || dates.length === 0) {
      setForm({
        type: 'SET_SELECTED_DATE',
        payload: {},
      });
    } else {
      setForm({
        type: 'SET_SELECTED_DATE',
        payload: { date: dates[dates.length - 1] },
      });
    }
  }, [availableDates, form.hazardLayerId, setForm]);

  const adminBoundariesExtent = useMemo(() => {
    if (!boundaryLayerData) {
      // not loaded yet. Should be loaded in MapView
      return null;
    }
    return bbox(boundaryLayerData.data) as Extent; // we get extents of admin boundaries to give to the api.
  }, [boundaryLayerData]);

  const statisticOptions = Object.entries(AggregationOperations).map(stat => (
    <FormControlLabel
      key={stat[0]}
      value={stat[1]}
      control={
        <Radio className={classes.radioOptions} color="default" size="small" />
      }
      label={stat[0]}
    />
  ));

  const clearAnalysis = () => {
    dispatch(clearAnalysisResult());

    // Empty previous set data.
    setForm({ type: 'CLEAR_FORM' });

    // Reset URL in browser.
    const URLStringToReplace: string = removePropsFromURL(
      history.location.search,
      URLParamList,
    );
    history.replace(`?${URLStringToReplace}`);
  };

  const runAnalyser = async () => {
    if (!adminBoundariesExtent) {
      return;
    } // hasn't been calculated yet

    // Detect from issues and throw errors.
    if (!form.selectedDate) {
      throw new Error('Date must be given to run analysis');
    }

    if (!form.hazardLayerId || !form.baselineLayerId) {
      throw new Error('Layer should be selected to run analysis');
    }

    // Build URL string.
    const analyserShareURL: string = Object.keys(form)
      .map((prop: string) => {
        return [prop, form[prop as keyof AnalyserForm]]
          .map(param =>
            param && param !== '' ? encodeURIComponent(param) : undefined,
          )
          .filter(Boolean)
          .join('=');
      })
      .join('&');

    // Make sure to run the nalyser only when needed.
    if (activeUrl.current !== analyserShareURL) {
      // Store the new URL.
      activeUrl.current = analyserShareURL;

      const selectedHazardLayer = LayerDefinitions[
        form.hazardLayerId
      ] as WMSLayerProps;
      const selectedBaselineLayer = LayerDefinitions[
        form.baselineLayerId
      ] as NSOLayerProps;

      const params: AnalysisDispatchParams = {
        hazardLayer: selectedHazardLayer,
        baselineLayer: selectedBaselineLayer,
        date: form.selectedDate,
        statistic: form.statistic as AggregationOperations,
        extent: adminBoundariesExtent,
        threshold: {
          above: form.aboveThreshold
            ? parseFloat(form.aboveThreshold as string)
            : undefined,
          below: form.belowThreshold
            ? parseFloat(form.belowThreshold as string)
            : undefined,
        },
      };

      await dispatch(requestAndStoreAnalysis(params));

      // Set share URL into the browser.
      history.replace(`?share=true&${analyserShareURL}`);
    }
  };

  const isFormInvalid = (): boolean => {
    return (
      !!form.thresholdError || // if there is a threshold error
      !form.selectedDate || // or date hasn't been selected
      !form.hazardLayerId || // or hazard layer hasn't been selected
      !form.baselineLayerId // or baseline layer hasn't been selected
    );
  };

  useEffect(() => {
    // Early return if data not loaded.
    if (!boundaryLayerData || !availableDates) {
      return;
    }

    const URLParams: propsFromURL = extractPropsFromURL(
      history.location.search,
      URLParamList,
    );

    // Set data from the URL.
    if (URLParams.fromURL) {
      // Set all from data from the URL.
      setForm({
        type: 'SET_FORM',
        payload: { params: URLParams.params },
      });

      // Avoid Running Analyser if required data are invalid or it's not a share link.
      if (!isFormInvalid() && URLParams.fromURL) {
        runAnalyser();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    boundaryLayerData,
    availableDates,
    history.location.search,
    form.selectedDate,
  ]);

  return (
    <div className={classes.analyser}>
      <Button
        variant="contained"
        color="primary"
        onClick={() => {
          setIsAnalyserFormOpen(!isAnalyserFormOpen);
        }}
      >
        <BarChart fontSize="small" />
        <Typography variant="body2" className={classes.analyserLabel}>
          Run Analysis
        </Typography>
        <ArrowDropDown fontSize="small" />
      </Button>

      <Box
        className={classes.analyserMenu}
        width={isAnalyserFormOpen ? 'min-content' : 0}
        padding={isAnalyserFormOpen ? '10px' : 0}
      >
        {isAnalyserFormOpen ? (
          <div>
            <div className={classes.newAnalyserContainer}>
              <div className={classes.analyserOptions}>
                <Typography variant="body2">Hazard Layer</Typography>
                <LayerDropdown
                  type="wms"
                  value={form.hazardLayerId}
                  setValue={(paramLayerKey: LayerKey) => {
                    setForm({
                      type: 'SET_LAYER_ID',
                      payload: { type: 'hazard', layerKey: paramLayerKey },
                    });
                  }}
                  title="Hazard Layer"
                  className={classes.selector}
                  placeholder="Choose hazard layer"
                />
              </div>
              <div className={classes.analyserOptions}>
                <Typography variant="body2">Statistic</Typography>
                <FormControl component="div">
                  <RadioGroup
                    name="statistics"
                    value={form.statistic}
                    onChange={(
                      paramEvent: React.ChangeEvent<HTMLInputElement>,
                    ) => {
                      setForm({
                        type: 'SET_STATISTIC',
                        payload: {
                          statistic: paramEvent.target
                            .value as AggregationOperations,
                        },
                      });
                    }}
                    row
                  >
                    {statisticOptions}
                  </RadioGroup>
                </FormControl>
              </div>
              <div className={classes.analyserOptions}>
                <Typography variant="body2">Baseline Layer</Typography>
                <LayerDropdown
                  type="nso"
                  value={form.baselineLayerId}
                  setValue={(paramLayerKey: LayerKey) => {
                    setForm({
                      type: 'SET_LAYER_ID',
                      payload: { type: 'baseline', layerKey: paramLayerKey },
                    });
                  }}
                  title="Baseline Layer"
                  className={classes.selector}
                  placeholder="Choose baseline layer"
                />
              </div>
              <div className={classes.analyserOptions}>
                <Typography variant="body2">Threshold</Typography>
                <TextField
                  id="filled-number"
                  error={!!form.thresholdError}
                  helperText={form.thresholdError}
                  className={classes.numberField}
                  label="Min"
                  type="number"
                  value={form.aboveThreshold}
                  onChange={(
                    paramEvent: React.ChangeEvent<HTMLInputElement>,
                  ) => {
                    setForm({
                      type: 'SET_THRESHOLD',
                      payload: {
                        type: 'above',
                        value: paramEvent.target.value,
                      },
                    });
                  }}
                  variant="filled"
                />
                <TextField
                  id="filled-number"
                  label="Max"
                  className={classes.numberField}
                  value={form.belowThreshold}
                  onChange={(
                    paramEvent: React.ChangeEvent<HTMLInputElement>,
                  ) => {
                    setForm({
                      type: 'SET_THRESHOLD',
                      payload: {
                        type: 'below',
                        value: paramEvent.target.value,
                      },
                    });
                  }}
                  type="number"
                  variant="filled"
                />
              </div>
              <div className={classes.analyserOptions}>
                <Typography variant="body2">Date</Typography>
                <DatePicker
                  selected={
                    form.selectedDate ? new Date(form.selectedDate) : null
                  }
                  onChange={date => {
                    setForm({
                      type: 'SET_SELECTED_DATE',
                      payload: { date: date?.getTime() || form.selectedDate },
                    });
                  }}
                  maxDate={new Date()}
                  todayButton="Today"
                  peekNextMonth
                  showMonthDropdown
                  showYearDropdown
                  dropdownMode="select"
                  customInput={<Input />}
                  popperClassName={classes.calendarPopper}
                  includeDates={
                    form.hazardLayerId
                      ? availableDates[
                          (LayerDefinitions[
                            form.hazardLayerId
                          ] as WMSLayerProps).serverLayerName
                        ]?.map(d => new Date(d)) || []
                      : []
                  }
                />
              </div>
            </div>

            {!isAnalysisLoading && analysisResult && (
              <>
                <FormGroup>
                  <FormControlLabel
                    control={
                      <Switch
                        color="default"
                        checked={isMapLayerActive}
                        onChange={e =>
                          dispatch(setIsMapLayerActive(e.target.checked))
                        }
                      />
                    }
                    label="Map View"
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        color="default"
                        checked={isTableViewOpen}
                        onChange={e => setIsTableViewOpen(e.target.checked)}
                      />
                    }
                    label="Table View"
                  />
                </FormGroup>
                {isTableViewOpen && (
                  <AnalysisTable
                    tableData={analysisResult.tableData}
                    columns={getAnalysisTableColumns(analysisResult)}
                  />
                )}
                <Button
                  className={classes.innerAnalysisButton}
                  onClick={() => downloadCSVFromTableData(analysisResult)}
                >
                  <Typography variant="body2">Download</Typography>
                </Button>
                <Button
                  className={classes.innerAnalysisButton}
                  onClick={clearAnalysis}
                >
                  <Typography variant="body2">Clear Analysis</Typography>
                </Button>
              </>
            )}
            {!analysisResult && (
              <Button
                className={classes.innerAnalysisButton}
                onClick={runAnalyser}
                disabled={
                  isFormInvalid() || isAnalysisLoading // or analysis is currently loading
                }
              >
                <Typography variant="body2">Run Analysis</Typography>
              </Button>
            )}
            {isAnalysisLoading ? <LinearProgress /> : null}
          </div>
        ) : null}
      </Box>
    </div>
  );
}

const styles = (theme: Theme) =>
  createStyles({
    analyser: {
      zIndex: theme.zIndex.drawer,
      textAlign: 'left',
    },
    analyserLabel: {
      marginLeft: '10px',
    },
    analyserMenu: {
      backgroundColor: '#5A686C',
      maxWidth: '100vw',
      color: 'white',
      overflowX: 'hidden',
      whiteSpace: 'nowrap',
      borderTopRightRadius: '10px',
      borderBottomRightRadius: '10px',
      height: 'auto',
      maxHeight: '60vh',
    },
    analyserButton: {
      height: '36px',
      'margin-left': '3px',
    },
    analyserOptions: {
      padding: '5px 0px',
    },
    newAnalyserContainer: {
      padding: '5px',
      marginTop: '10px',
    },
    radioOptions: {
      '&.Mui-checked': { color: grey[50] },
      padding: '2px 10px 2px 20px',
    },
    innerAnalysisButton: {
      backgroundColor: '#3d474a',
      margin: '10px',
      '&.Mui-disabled': { opacity: 0.5 },
    },
    selectorLabel: {
      '&.Mui-focused': { color: 'white' },
    },
    selector: {
      margin: '5px',
    },
    numberField: {
      paddingLeft: '10px',
      marginTop: '10px',
      width: '85.5px',
      '& .Mui-focused': { color: 'white' },
    },
    calendarPopper: {
      zIndex: 3,
    },
  });

interface AnalyserProps extends WithStyles<typeof styles> {}

export default withStyles(styles)(Analyser);
