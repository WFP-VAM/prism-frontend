import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Position } from 'geojson';
import { get } from 'lodash';
import type { CreateAsyncThunkTypes, RootState } from './store';
import {
  AggregationOperations,
  AsyncReturnType,
  BoundaryLayerProps,
  NSOLayerProps,
  ThresholdDefinition,
  WMSLayerProps,
} from '../config/types';
import {
  AnalysisResult,
  ApiData,
  BaselineLayerData,
  checkBaselineDataLayer,
  fetchApiData,
  generateFeaturesFromApiData,
  scaleAndFilterAggregateData,
} from '../utils/analysis-utils';
import { getWCSLayerUrl } from './layers/wms';
import { getBoundaryLayerSingleton } from '../config/utils';
import { Extent } from '../components/MapView/Layers/raster-utils';
import { layerDataSelector } from './mapStateSlice/selectors';
import { LayerData, LayerDataParams, loadLayerData } from './layers/layer-data';
import { DataRecord, NSOLayerData } from './layers/nso';
import { BoundaryLayerData } from './layers/boundary';

const ANALYSIS_API_URL = 'https://prism-api.ovio.org/stats'; // TODO both needs to be stored somewhere
const DEV_ADMIN_BOUNDARIES_URL =
  'https://prism-admin-boundaries.s3.us-east-2.amazonaws.com/mng_admin_boundaries.json';

type AnalysisResultState = {
  result?: AnalysisResult;
  error?: string;
  isLoading: boolean;
  isMapLayerActive: boolean;
};

export type TableRow = {
  localName: string;
  name: string;
  baselineValue: DataRecord['value'];
  coordinates?: Position;
} & { [k in AggregationOperations]?: number };

const initialState: AnalysisResultState = {
  isLoading: false,
  isMapLayerActive: true,
};

/* Gets a public URL for the admin boundaries used by this application.
 *
 * If the application is in development, localhost is not accessible publicly.
 * Therefore, we will return a pre-set constant to be used for development.
 *
 * If the application is in production, we will attempt to construct a public URL that the backend should be able to access.
 */
function getAdminBoundariesURL() {
  const isProduction = process.env.NODE_ENV === 'production';
  const adminBoundariesPath = getBoundaryLayerSingleton().path;
  if (!isProduction) {
    return DEV_ADMIN_BOUNDARIES_URL;
  }
  // already a remote location, so return it.
  if (adminBoundariesPath.startsWith('http')) {
    return adminBoundariesPath;
  }
  // the regex here removes the dot at the beginning of a path, if there is one.
  // e.g the path might be ' ./data/xxx '  instead of ' /data/xxx '
  return window.location.origin + adminBoundariesPath.replace(/^\./, '');
}

function generateTableFromApiData(
  statistic: AggregationOperations,
  aggregateData: AsyncReturnType<typeof fetchApiData>, // data from api
  // admin layer, both props and data. Aimed to closely match LayerData<BoundaryLayerProps>
  {
    layer: adminLayer,
    data: adminLayerData,
  }: { layer: BoundaryLayerProps; data: BoundaryLayerData },
  // baseline layer, both props and data
  {
    layer: { adminLevel },
    data: { layerData: baselineLayerData },
  }: { layer: NSOLayerProps; data: NSOLayerData },
): TableRow[] {
  // find the key that will let us reference the names of the bounding boxes. We get the one corresponding to the specific level of baseline, or the first if we fail.
  const adminLevelName =
    adminLayer.adminLevelNames[adminLevel - 1] || adminLayer.adminLevelNames[0];
  // for local name too.
  const adminLevelLocalName =
    adminLayer.adminLevelLocalNames[adminLevel - 1] ||
    adminLayer.adminLevelLocalNames[0];

  return aggregateData.map(row => {
    // find feature (a cell on the map) from admin boundaries json that closely matches this api row.
    // we decide it matches if the feature json has the same name as the name for this row.
    // once we find it we can get the corresponding local name.
    const featureBoundary = adminLayerData.features.find(
      feature => feature.properties?.[adminLevelName] === row[adminLevelName],
    );

    const name: string =
      featureBoundary?.properties?.[adminLevelName] || 'No Name';
    const localName: string =
      featureBoundary?.properties?.[adminLevelLocalName] || 'No Name';

    // we are searching the data of baseline layer to find the data associated with this feature
    // adminKey here refers to a specific feature (could be several) where the data is attached to.
    const baselineValue =
      baselineLayerData.find(({ adminKey }) => {
        // we only check startsWith because the adminCode grows longer the deeper the level.
        // For example, 34 is state and 14 is district, therefore 3414 is a specific district in a specific state.
        // if this baseline layer only focuses on a higher level (just states) it would only contain 34, but every feature is very specific (uses the full number 3414)
        // therefore checking the start will cover all levels.
        return featureBoundary?.properties?.[adminLayer.adminCode].startsWith(
          adminKey,
        );
      })?.value || 'No Data';

    const tableRow: TableRow = {
      name,
      localName,
      [statistic]: get(row, statistic, 0),
      baselineValue,
      coordinates: (featureBoundary?.geometry as any).coordinates[0][0][0], // TODO likely will not keep
    };
    return tableRow;
  });
}

export type AnalysisDispatchParams = {
  baselineLayer: NSOLayerProps;
  hazardLayer: WMSLayerProps;
  extent: Extent;
  threshold: ThresholdDefinition;
  date: ReturnType<Date['getTime']>; // just a hint to developers that we give a date number here, not just any number
  statistic: AggregationOperations; // we might have to deviate from this if analysis accepts more than what this enum provides
};

export const requestAndStoreAnalysis = createAsyncThunk<
  AnalysisResult,
  AnalysisDispatchParams,
  CreateAsyncThunkTypes
>('analysisResultState/requestAndStoreAnalysis', async (params, api) => {
  const {
    hazardLayer,
    date,
    baselineLayer,
    extent,
    statistic,
    threshold,
  } = params;
  const baselineData = layerDataSelector(baselineLayer.id)(
    api.getState(),
  ) as LayerData<NSOLayerProps>;
  const adminBoundaries = getBoundaryLayerSingleton();
  const adminBoundariesData = layerDataSelector(adminBoundaries.id)(
    api.getState(),
  ) as LayerData<BoundaryLayerProps>;

  if (!adminBoundariesData) {
    throw new Error('Boundary Layer not loaded!');
  }
  // we force group_by to be defined with &
  // eslint-disable-next-line camelcase
  const apiRequest: ApiData & { group_by: string } = {
    geotiff_url: getWCSLayerUrl({
      layer: hazardLayer,
      date,
      extent,
    }),
    zones_url: getAdminBoundariesURL(),
    group_by:
      adminBoundaries.adminLevelNames[baselineLayer.adminLevel - 1] ||
      adminBoundaries.adminLevelNames[0],
  };
  const aggregateData = scaleAndFilterAggregateData(
    await fetchApiData(ANALYSIS_API_URL, apiRequest),
    hazardLayer,
    statistic,
    threshold,
  );
  let loadedAndCheckedBaselineData: BaselineLayerData;
  // if the baselineData doesn't exist, lets load it, otherwise check then load existing data.
  // similar code can be found at impact.ts
  if (!baselineData) {
    const {
      payload: { data },
    } = (await api.dispatch(
      loadLayerData({ layer: baselineLayer, extent } as LayerDataParams<
        NSOLayerProps
      >),
    )) as { payload: { data: unknown } };

    // eslint-disable-next-line fp/no-mutation
    loadedAndCheckedBaselineData = checkBaselineDataLayer(
      baselineLayer.id,
      data,
    );
  } else {
    // eslint-disable-next-line fp/no-mutation
    loadedAndCheckedBaselineData = checkBaselineDataLayer(
      baselineLayer.id,
      baselineData.data,
    );
  }

  const features = generateFeaturesFromApiData(
    aggregateData,
    loadedAndCheckedBaselineData,
    apiRequest.group_by,
    statistic,
  );

  const tableRows: TableRow[] = generateTableFromApiData(
    statistic,
    aggregateData,
    adminBoundariesData,
    { layer: baselineLayer, data: loadedAndCheckedBaselineData },
  );

  return new AnalysisResult(
    tableRows,
    {
      ...adminBoundariesData.data,
      features,
    },
    hazardLayer,
    baselineLayer,
    statistic,
    threshold,
    // we never use the raw api data besides for debugging. So lets not bother saving it in Redux for production
    process.env.NODE_ENV === 'production' ? undefined : aggregateData,
  );
});

export const analysisResultSlice = createSlice({
  name: 'analysisResultState',
  initialState,
  reducers: {
    setIsMapLayerActive: (state, { payload }: PayloadAction<boolean>) => ({
      ...state,
      isMapLayerActive: payload,
    }),
    clearAnalysisResult: state => ({
      ...state,
      result: undefined,
    }),
  },
  extraReducers: builder => {
    builder.addCase(
      requestAndStoreAnalysis.fulfilled,
      (
        { result, ...rest },
        { payload }: PayloadAction<AnalysisResult>,
      ): AnalysisResultState => ({
        ...rest,
        isLoading: false,
        result: payload,
      }),
    );

    builder.addCase(
      requestAndStoreAnalysis.rejected,
      (state, action): AnalysisResultState => ({
        ...state,
        isLoading: false,
        error: action.error.message
          ? action.error.message
          : action.error.toString(),
      }),
    );

    builder.addCase(
      requestAndStoreAnalysis.pending,
      (state): AnalysisResultState => ({
        ...state,
        isLoading: true,
      }),
    );
  },
});

// Getters
export const analysisResultSelector = (
  state: RootState,
): AnalysisResult | undefined => state.analysisResultState.result;

export const isAnalysisLoadingSelector = (state: RootState): boolean =>
  state.analysisResultState.isLoading;

export const isAnalysisLayerActiveSelector = (state: RootState): boolean =>
  state.analysisResultState.isMapLayerActive;

// Setters
export const {
  setIsMapLayerActive,
  clearAnalysisResult,
} = analysisResultSlice.actions;

export default analysisResultSlice.reducer;
