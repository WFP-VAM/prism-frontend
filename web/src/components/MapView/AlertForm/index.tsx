import {
  Box,
  Button,
  createStyles,
  ListSubheader,
  MenuItem,
  Select,
  TextField,
  Theme,
  Typography,
  WithStyles,
  withStyles,
} from '@material-ui/core';
import { ArrowDropDown, Notifications } from '@material-ui/icons';
import React, { Dispatch, SetStateAction, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import {
  BoundaryLayerProps,
  LayerKey,
  WMSLayerProps,
} from '../../../config/types';
import {
  getBoundaryLayerSingleton,
  LayerDefinitions,
} from '../../../config/utils';
import { LayerData } from '../../../context/layers/layer-data';
import { layerDataSelector } from '../../../context/mapStateSlice/selectors';
import {
  AlertRequest,
  fetchApiData,
  getPrismUrl,
} from '../../../utils/analysis-utils';
import LayerDropdown from '../Layers/LayerDropdown';

// Not fully RFC-compliant, but should filter out obviously-invalid emails.
// Source: https://stackoverflow.com/questions/46155/how-to-validate-an-email-address-in-javascript
const EMAIL_REGEX: RegExp = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

// This should probably be determined on a case-by-case basis,
// depending on if the downstream API has the capability.
// For now it can be permanently enabled.
const ALERT_FORM_ENABLED = true;

// TODO: Dynamic switch between local/production URLs, and consolidate this into util class
const ALERT_API_URL = 'https://prism-api.ovio.org/alerts';
// const ALERT_API_URL = 'http://localhost:80/alerts';

const boundaryLayer = getBoundaryLayerSingleton();

function AlertForm({ classes }: AlertFormProps) {
  const boundaryLayerData = useSelector(layerDataSelector(boundaryLayer.id)) as
    | LayerData<BoundaryLayerProps>
    | undefined;

  const [isAlertFormFormOpen, setIsAlertFormFormOpen] = useState(false);

  // form elements
  const [hazardLayerId, setHazardLayerId] = useState<LayerKey>();
  const [regionsList, setRegionsList] = useState<string[]>(['allRegions']);
  const [emailValid, setEmailValid] = useState<boolean>(false);
  const [email, setEmail] = useState('');
  const [belowThreshold, setBelowThreshold] = useState('');
  const [aboveThreshold, setAboveThreshold] = useState('');
  const [thresholdError, setThresholdError] = useState<string | null>(null);
  const [alertName, setAlertName] = useState('');
  const [alertWaiting, setAlertWaiting] = useState(false);
  const [alertFinishedMessage, setAlertFinishedMessage] = useState('');

  const regionNamesToFeatureData: { [k: string]: object } = useMemo(() => {
    if (!boundaryLayerData) {
      // Not loaded yet. Will proceed when it is.
      return {};
    }

    return Object.fromEntries(
      boundaryLayerData.data.features
        .filter(feature => feature.properties != null)
        .map(feature => {
          const localNames = boundaryLayer.adminLevelNames.map(
            name => (feature.properties || {})[name],
          );

          return [localNames.join(' / '), feature];
        }),
    );
  }, [boundaryLayerData]);

  const sortedRegionNames: string[] = useMemo(() => {
    // Fine to mutate this array since it's a new array of key names

    // eslint-disable-next-line fp/no-mutating-methods
    return Object.keys(regionNamesToFeatureData).sort();
  }, [regionNamesToFeatureData]);

  const generateGeoJsonForRegionNames = () => {
    // TODO - Handle these errors properly.
    if (!boundaryLayerData) {
      throw new Error('Boundary layer data is not loaded yet.');
    }

    if (regionsList.length === 0) {
      throw new Error('Please select at least one region boundary.');
    }

    if (regionsList[0] === 'allRegions') {
      return boundaryLayerData.data;
    }

    const features = regionsList.map(region => {
      return regionNamesToFeatureData[region];
    });

    // Generate a copy of admin layer data (to preserve top-level properties)
    // and replace the 'features' property with just the selected regions.
    const mutableFeatureCollection = JSON.parse(
      JSON.stringify(boundaryLayerData.data),
    );
    // eslint-disable-next-line fp/no-mutation
    mutableFeatureCollection.features = features;

    return mutableFeatureCollection;
  };

  const onChangeEmail = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newEmail = event.target.value;
    setEmailValid(!!newEmail.match(EMAIL_REGEX));
    setEmail(newEmail);
  };

  const onOptionChange = <T extends string>(
    setterFunc: Dispatch<SetStateAction<T>>,
  ) => (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value as T;
    setterFunc(value);
    return value;
  };

  // specially for threshold values, also does error checking
  const onThresholdOptionChange = (thresholdType: 'above' | 'below') => (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const setterFunc =
      thresholdType === 'above' ? setAboveThreshold : setBelowThreshold;
    const changedOption = onOptionChange(setterFunc)(event);
    // setting a value doesn't update the existing value until next render,
    // therefore we must decide whether to access the old one or the newly change one here.
    const aboveThresholdValue = parseFloat(
      thresholdType === 'above' ? changedOption : aboveThreshold,
    );
    const belowThresholdValue = parseFloat(
      thresholdType === 'below' ? changedOption : belowThreshold,
    );
    if (belowThresholdValue < aboveThresholdValue) {
      setThresholdError('Min threshold is larger than Max!');
    } else {
      setThresholdError(null);
    }
  };

  const runAlertForm = async () => {
    if (!hazardLayerId) {
      throw new Error('Layer should be selected to create alert.');
    }

    const request: AlertRequest = {
      alert_name: alertName,
      alert_config: LayerDefinitions[hazardLayerId] as WMSLayerProps,
      max: aboveThreshold,
      min: belowThreshold,
      zones: generateGeoJsonForRegionNames(),
      email,
      prism_url: getPrismUrl(),
    };

    setAlertWaiting(true);
    const response = await fetchApiData(ALERT_API_URL, request);
    setAlertWaiting(false);

    if ('message' in response) {
      // eslint-disable-next-line dot-notation
      setAlertFinishedMessage(response['message']);
    }
  };

  if (!ALERT_FORM_ENABLED) {
    return null;
  }

  return (
    <div className={classes.alertForm}>
      <Button
        variant="contained"
        color="primary"
        onClick={() => {
          setIsAlertFormFormOpen(!isAlertFormFormOpen);
        }}
      >
        <Notifications fontSize="small" />
        <Typography variant="body2" className={classes.alertLabel}>
          Create Alert
        </Typography>
        <ArrowDropDown fontSize="small" />
      </Button>

      <Box
        className={classes.alertFormMenu}
        width={isAlertFormFormOpen ? 'min-content' : 0}
        padding={isAlertFormFormOpen ? '10px' : 0}
      >
        {isAlertFormFormOpen ? (
          <div>
            <div className={classes.newAlertFormContainer}>
              <div className={classes.alertFormOptions}>
                <Typography variant="body2">Hazard Layer</Typography>
                <LayerDropdown
                  type="wms"
                  value={hazardLayerId}
                  setValue={setHazardLayerId}
                  title="Hazard Layer"
                  className={classes.selector}
                  placeholder="Choose hazard layer"
                />
              </div>
              <div className={classes.alertFormOptions}>
                <Typography variant="body2">Threshold</Typography>
                <TextField
                  id="filled-number"
                  error={!!thresholdError}
                  helperText={thresholdError}
                  className={classes.numberField}
                  label="Min Below"
                  type="number"
                  value={aboveThreshold}
                  onChange={onThresholdOptionChange('above')}
                  variant="filled"
                />
                <TextField
                  id="filled-number"
                  label="Max Above"
                  className={classes.numberField}
                  style={{ paddingLeft: '10px' }}
                  value={belowThreshold}
                  onChange={onThresholdOptionChange('below')}
                  type="number"
                  variant="filled"
                />
              </div>
              <div className={classes.alertFormOptions}>
                <Typography variant="body2">Regions</Typography>
                <Select
                  id="regionsList"
                  label="Regions to monitor"
                  type="text"
                  variant="filled"
                  value={regionsList}
                  multiple
                  className={classes.regionSelector}
                  onChange={e => {
                    const selected: string[] = e.target.value as string[];
                    const lastSelected = selected[selected.length - 1];

                    if (lastSelected !== 'allRegions') {
                      setRegionsList(
                        selected.filter(el => el !== 'allRegions'),
                      );
                    } else {
                      // If 'allRegions' was the last selected then it should be the only thing selected.
                      setRegionsList(['allRegions']);
                    }
                  }}
                >
                  [
                  <MenuItem key="allRegions" value="allRegions">
                    All
                  </MenuItem>
                  <ListSubheader>Administrative Regions</ListSubheader>
                  ...
                  {sortedRegionNames.map(region => {
                    return (
                      <MenuItem key={region} value={region}>
                        {region}
                      </MenuItem>
                    );
                  })}
                  ]
                </Select>
              </div>
              <div className={classes.alertFormOptions}>
                <TextField
                  id="alert-name"
                  label="Alert Name"
                  type="text"
                  variant="filled"
                  value={alertName}
                  onChange={e => setAlertName(e.target.value)}
                />
              </div>
              <div className={classes.alertFormOptions}>
                <TextField
                  id="email-address"
                  label="Email Address"
                  type="text"
                  variant="filled"
                  onChange={onChangeEmail}
                />
              </div>
            </div>
            <Typography
              variant="body2"
              className={classes.alertFormResponseText}
            >
              {alertFinishedMessage}
            </Typography>
            <Button
              className={classes.innerCreateAlertButton}
              onClick={runAlertForm}
              disabled={
                !hazardLayerId ||
                !!thresholdError ||
                !emailValid ||
                alertWaiting ||
                regionsList.length === 0
              }
            >
              <Typography variant="body2">Create Alert</Typography>
            </Button>
          </div>
        ) : null}
      </Box>
    </div>
  );
}

const styles = (theme: Theme) =>
  createStyles({
    alertLabel: { marginLeft: '10px' },
    alertForm: {
      zIndex: theme.zIndex.drawer,
      textAlign: 'left',
      marginTop: '5px',
    },
    alertFormMenu: {
      backgroundColor: '#5A686C',
      maxWidth: '100vw',
      minWidth: 'max-content',
      color: 'white',
      overflowX: 'hidden',
      whiteSpace: 'nowrap',
      borderTopRightRadius: '10px',
      borderBottomRightRadius: '10px',
      height: 'auto',
      maxHeight: '60vh',
    },
    alertFormButton: {
      height: '36px',
      marginLeft: '3px',
    },
    alertFormOptions: {
      padding: '5px 0px',
    },
    newAlertFormContainer: {
      padding: '5px',
      marginTop: '10px',
    },
    innerCreateAlertButton: {
      backgroundColor: '#3d474a',
      margin: '10px',
      '&:disabled': {
        opacity: '0.5',
      },
    },
    selector: {
      margin: '5px',
    },
    regionSelector: {
      minWidth: '100%',
      maxWidth: '200px',
    },
    numberField: {
      marginTop: '10px',
      width: '110px',
      '&:focused': { color: 'white' },
    },
    alertFormResponseText: {
      marginLeft: '15px',
    },
  });

interface AlertFormProps extends WithStyles<typeof styles> {}

export default withStyles(styles)(AlertForm);
