import React from 'react';
import { Provider } from 'react-redux';
import { render } from '@testing-library/react';
import { BrowserRouter as Router } from 'react-router-dom';

import Analyser from '.';
import { store } from '../../../context/store';

jest.mock('../Layers/LayerDropdown', () => 'mock-Layer-Dropdown');

test('renders as expected', () => {
  const rendered = render(
    <Provider store={store}>
      <Router>
        <Analyser />
      </Router>
    </Provider>,
  );
  return rendered
    .findByText('Run Analysis')
    .then(btn => btn.click()) // open analyser menu (default closed)
    .then(() => expect(rendered.container).toMatchSnapshot());
});
