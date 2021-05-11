import React from 'react';
import { render } from '@testing-library/react';

import { Provider } from 'react-redux';
import Download from '.';
import { store } from '../../../context/store';

test('renders as expected', () => {
  const { container } = render(
    <Provider store={store}>
      <Download />
    </Provider>,
  );
  expect(container).toMatchSnapshot();
});
