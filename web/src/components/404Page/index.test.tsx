import React from 'react';
import { render } from '@testing-library/react';
import NotFound from '.';

test('renders as expected', () => {
  const { container } = render(<NotFound />);
  expect(container).toMatchSnapshot();
});
