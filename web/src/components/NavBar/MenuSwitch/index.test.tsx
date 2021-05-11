import React from 'react';
import { Provider } from 'react-redux';
import { render } from '@testing-library/react';

import MenuSwitch from '.';
import { store } from '../../../context/store';
import { LayerKey, LayersCategoryType } from '../../../config/types';

const props: LayersCategoryType = {
  title: 'Category 1',
  layers: [
    {
      id: 'ID' as LayerKey,
      title: 'layer',
      type: 'wms',
      baseUrl: 'example.com',
      serverLayerName: 'example',
      legend: [],
      opacity: 0.5,
      legendText: 'legendText',
    },
  ],
  tables: [],
};

test('renders as expected', () => {
  const { container } = render(
    <Provider store={store}>
      <MenuSwitch {...props} />
    </Provider>,
  );
  expect(container).toMatchSnapshot();
});
