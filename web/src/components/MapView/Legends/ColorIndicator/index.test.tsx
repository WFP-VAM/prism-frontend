import React from 'react';
import { render } from '@testing-library/react';

import ColorIndicator from '.';

const props = {
  value: 'Vegetation',
  color: '#EF3202',
};

test('renders as expected', () => {
  const { container } = render(<ColorIndicator {...props} />);
  expect(container).toMatchSnapshot();
});
