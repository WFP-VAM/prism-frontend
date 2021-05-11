import React from 'react';
import { render } from '@testing-library/react';
import App from '.';

jest.mock('../NavBar', () => 'mock-NavBar');
jest.mock('../DataDrawer', () => 'mock-DataDrawer');
jest.mock('../MapView', () => 'mock-MapView');
jest.mock('../404Page', () => 'mock-NotFound');
jest.mock('../Notifier', () => 'mock-Notifier');

test('renders as expected', () => {
  const { container } = render(<App />);
  expect(container).toMatchSnapshot();
});
