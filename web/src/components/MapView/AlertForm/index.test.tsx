import React from 'react';
import { Provider } from 'react-redux';
import { render } from '@testing-library/react';

import AlertForm from '.';
import { store } from '../../../context/store';

jest.mock('../Layers/LayerDropdown', () => 'mock-Layer-Dropdown');

test('renders as expected', () => {
  const rendered = render(
    <Provider store={store}>
      <AlertForm />
    </Provider>,
  );
  return rendered
    .findByText('Create Alert')
    .then(btn => btn.click()) // open analyser menu (default closed)
    .then(() => expect(rendered.container).toMatchSnapshot());
});
