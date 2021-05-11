import { LegendDefinition } from '../../../config/types';

export function legendToStops(legend: LegendDefinition = []) {
  return legend.map(({ value, color }) => [
    typeof value === 'string' ? parseFloat(value) : value,
    color,
  ]);
}
