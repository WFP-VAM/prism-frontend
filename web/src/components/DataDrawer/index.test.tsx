import React from 'react';
import { render } from '@testing-library/react';
import { Provider } from 'react-redux';
import { store } from '../../context/store';
import DataDrawer from '.';

jest.mock('./DataTable', () => 'data-table');

test('renders as expected', () => {
  const { container } = render(
    <Provider store={store}>
      <DataDrawer />
    </Provider>,
  );
  expect(container).toMatchSnapshot();
});
