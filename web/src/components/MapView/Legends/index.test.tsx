import React from 'react';
import { render } from '@testing-library/react';

import { Provider } from 'react-redux';
import Legends from '.';
import { store } from '../../../context/store';

jest.mock('./ColorIndicator', () => 'mock-ColorIndicator');

test('renders as expected', () => {
  const { container } = render(
    <Provider store={store}>
      <Legends layers={[]} />
    </Provider>,
  );
  expect(container).toMatchSnapshot();
});
