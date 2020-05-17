import nsoDisabled from '../data/nso/NSO_Disabled_Admin1_Total.json';
import nsoHerd from '../data/nso/NSO_Herder_HHs_ths_Admin2.json';
import nsoChild from '../data/nso/NSO_Child_U5_Admin2.json';
import nsoLivestock from '../data/nso/NSO_Livestock_Count_ths_Admin2.json';
import nsoElderly from '../data/nso/NSO_Single_Elderly_Admin1_Total.json';
import nsoPovery from '../data/nso/NSO_Poverty_Headcount_Admin1.json';

const nsoDatasets = {
  nsoDisabled,
  nsoHerd,
  nsoChild,
  nsoLivestock,
  nsoElderly,
  nsoPovery,
};

type DatasetKeys =
  | 'nsoDisabled'
  | 'nsoChild'
  | 'nsoHerd'
  | 'nsoLivestock'
  | 'nsoElderly'
  | 'nsoPovery';

export function getNSOData(dataset: string | undefined) {
  if (dataset && dataset in nsoDatasets) {
    return nsoDatasets[dataset as DatasetKeys];
  }
  return nsoPovery;
}
