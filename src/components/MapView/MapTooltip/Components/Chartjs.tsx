import React from 'react';
import { cloneDeep } from 'lodash';
import * as Charts from 'react-chartjs-2';
import { PopupComponentSpec } from '../../../../context/tooltipStateSlice';

export default ({ params }: PopupComponentSpec) => {
  const chartParams = cloneDeep(params) as Charts.ChartComponentProps;
  const Component: any = (Charts as any)[chartParams.type!];
  return <Component {...chartParams} />;
};
