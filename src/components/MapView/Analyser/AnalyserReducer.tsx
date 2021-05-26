import { useReducer } from 'react';
import {
  LayerKey,
  AggregationOperations,
  isLayerKey,
  ActionMap,
  isStatistic,
} from '../../../config/types';

export interface AnalyserForm {
  hazardLayerId?: LayerKey;
  baselineLayerId?: LayerKey;
  statistic?: AggregationOperations;
  selectedDate?: number;
  belowThreshold?: string;
  aboveThreshold?: string;
  thresholdError?: string;
}

// Initial form values.
const initForm: AnalyserForm = {
  statistic: AggregationOperations.Mean,
};

export interface URLParams {
  hazardLayerId?: string;
  baselineLayerId?: string;
  statistic?: string;
  selectedDate?: string;
  belowThreshold?: string;
  aboveThreshold?: string;
}

export const URLParamList: string[] = [
  'hazardLayerId',
  'baselineLayerId',
  'statistic',
  'selectedDate',
  'belowThreshold',
  'aboveThreshold',
];

type AnlayserPayload = {
  ['SET_FORM']: { params: URLParams };
  ['SET_LAYER_ID']: {
    type: 'hazard' | 'baseline';
    layerKey: LayerKey;
  };
  ['SET_STATISTIC']: { statistic: AggregationOperations };
  ['SET_SELECTED_DATE']: { date?: number };
  ['SET_THRESHOLD']: {
    type: 'above' | 'below';
    value: string;
  };
  ['CLEAR_FORM']: undefined;
};

export type AnlayserAction = ActionMap<AnlayserPayload>[keyof ActionMap<
  AnlayserPayload
>];

const analyserReducer = (state: AnalyserForm, action: AnlayserAction) => {
  switch (action.type) {
    case 'SET_FORM': {
      const payloadParams: URLParams = action.payload.params;
      const formValues: AnalyserForm = state;

      if (
        payloadParams.hazardLayerId &&
        isLayerKey(payloadParams.hazardLayerId)
      ) {
        // eslint-disable-next-line fp/no-mutation
        formValues.hazardLayerId = payloadParams.hazardLayerId;
      }

      if (
        payloadParams.baselineLayerId &&
        isLayerKey(payloadParams.baselineLayerId)
      ) {
        // eslint-disable-next-line fp/no-mutation
        formValues.baselineLayerId = payloadParams.baselineLayerId;
      }

      if (payloadParams.selectedDate) {
        // eslint-disable-next-line fp/no-mutation
        formValues.selectedDate = parseInt(payloadParams.selectedDate, 10);
      }

      const statisticCorrected: AggregationOperations = isStatistic(
        payloadParams.statistic,
      )
        ? payloadParams.statistic
        : AggregationOperations.Mean;

      if (payloadParams.belowThreshold) {
        // eslint-disable-next-line fp/no-mutation
        formValues.belowThreshold = payloadParams.belowThreshold;
      }

      if (payloadParams.aboveThreshold) {
        // eslint-disable-next-line fp/no-mutation
        formValues.aboveThreshold = payloadParams.aboveThreshold;
      }

      return {
        ...state,
        ...formValues,
        statistic: statisticCorrected,
      };
    }
    case 'SET_LAYER_ID': {
      if (isLayerKey(action.payload.layerKey)) {
        if (action.payload.type === 'hazard') {
          return {
            ...state,
            hazardLayerId: action.payload.layerKey,
          };
        }

        return {
          ...state,
          baselineLayerId: action.payload.layerKey,
        };
      }
      return state;
    }
    case 'SET_STATISTIC': {
      return {
        ...state,
        statistic: action.payload.statistic,
      };
    }
    case 'SET_SELECTED_DATE': {
      return {
        ...state,
        selectedDate: action.payload.date,
      };
    }
    case 'SET_THRESHOLD': {
      const hasError: boolean =
        action.payload.type === 'below'
          ? ((state.aboveThreshold &&
              action.payload.value < state.aboveThreshold) as boolean)
          : ((state.belowThreshold &&
              state.belowThreshold < action.payload.value) as boolean);

      const thresholdErrorString: string = hasError
        ? 'Min threshold is larger than Max!'
        : '';

      if (action.payload.type === 'below') {
        return {
          ...state,
          belowThreshold: action.payload.value,
          thresholdError: thresholdErrorString,
        };
      }

      return {
        ...state,
        aboveThreshold: action.payload.value,
        thresholdError: thresholdErrorString,
      };
    }
    case 'CLEAR_FORM': {
      return initForm;
    }
    default:
      return state;
  }
};

export const useAnalyserReducer = () => {
  return useReducer(analyserReducer, initForm);
};
