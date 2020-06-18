import {
  AnyAction,
  combineReducers,
  configureStore,
  getDefaultMiddleware,
  Middleware,
} from '@reduxjs/toolkit';

import mapStateReduce from './mapStateSlice';
import serverStateReduce from './serverStateSlice';
import tableStateReduce from './tableStateSlice';
import tooltipStateReduce from './tooltipStateSlice';

const reducer = combineReducers({
  mapState: mapStateReduce,
  serverState: serverStateReduce,
  tableState: tableStateReduce,
  tooltipState: tooltipStateReduce,
});

// I don't know how to type this properly
const middleware: Middleware<{}, RootState> = (api: ThunkApi) => (
  dispatch: AppDispatch,
) => (action: AnyAction) => {
  const prevState = api.getState();
  const dispatchResult = dispatch(action);
  const newState = api.getState();

  console.log(action, dispatchResult);
  console.table([prevState, newState]);
  return dispatchResult;
};

export const store = configureStore({
  reducer,
  // TODO: Instead of snoozing this check, we might want to
  // serialize the state
  middleware: getDefaultMiddleware({
    serializableCheck: false,
    immutableCheck: {
      ignoredPaths: ['mapState.layersData'],
    },
  }).concat(middleware),
});

export type AppDispatch = typeof store.dispatch;
export type RootState = ReturnType<typeof reducer>;

export type ThunkApi = {
  dispatch: AppDispatch;
  getState: () => RootState;
  // can add 'extra' and 'rejectValue' here if we ever need them
  // https://redux-toolkit.js.org/usage/usage-with-typescript#createasyncthunk
};

// Used as the third type definition for typing createAsyncThunk
// e.g. createAsyncThunk<ReturnType, HandlerType, CreateAsyncThunkTypes>
export type CreateAsyncThunkTypes = {
  dispatch: AppDispatch;
  state: RootState;
};
