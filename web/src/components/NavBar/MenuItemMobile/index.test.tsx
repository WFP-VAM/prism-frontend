import React from 'react';
import { Provider } from 'react-redux';
import { render } from '@testing-library/react';

import MenuItemMobile from '.';
import { store } from '../../../context/store';
import { LayerKey, MenuItemMobileType } from '../../../config/types';

const props: MenuItemMobileType = {
  title: 'title',
  icon: 'icon.png',
  layersCategories: [
    {
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
    },
  ],
  expanded: 'title',
  selectAccordion: () => {},
};

test('renders as expected', () => {
  const { container } = render(
    <Provider store={store}>
      <MenuItemMobile {...props} />
    </Provider>,
  );
  expect(container).toMatchSnapshot();
});
