import React from 'react';
import { PopupComponentSpec } from '../../../../context/tooltipStateSlice';

export default function ({ params }: PopupComponentSpec) {
  const markup = { __html: params.html };
  // eslint-disable-next-line
  return <div dangerouslySetInnerHTML={markup} />;
}
