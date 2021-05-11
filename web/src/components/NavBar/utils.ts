import { map, startCase } from 'lodash';

import { appConfig } from '../../config';
import {
  isTableKey,
  LayerDefinitions,
  TableDefinitions,
  TableKey,
} from '../../config/utils';
import {
  isLayerKey,
  LayerKey,
  LayersCategoryType,
  MenuItemType,
} from '../../config/types';

import vulnerability from '../images/icon_vulnerable.png';
import exposure from '../images/icon_basemap.png';
import hazards from '../images/icon_climate.png';
import risk from '../images/icon_impact.png';
// note to Ovio: wanted to use risk_and_impact but this fails. riskandimpact works, but doesn't create spaces in nav
import capacity from '../images/icon_capacity.png';
import tables from '../images/icon_table.png';

const icons: { [key: string]: string } = {
  vulnerability,
  exposure,
  hazards,
  risk,
  capacity,
  tables,
};

type LayersCategoriesType = LayersCategoryType[];

type MenuItemsType = MenuItemType[];

function formatLayersCategories(layersList: {
  [key: string]: Array<LayerKey | TableKey>;
}): LayersCategoriesType {
  return map(layersList, (layerKeys, layersListKey) => {
    return {
      title: startCase(layersListKey),
      layers: layerKeys.filter(isLayerKey).map(key => LayerDefinitions[key]),
      tables: layerKeys.filter(isTableKey).map(key => TableDefinitions[key]),
    };
  });
}

/**
 * Returns true if every layer/table key in every layer category given actually exists.
 * Returns false otherwise.
 * @param layersCategories a dictionary of layer categories from appJSON.categories
 */
function checkLayersCategories(
  layersCategories: Record<string, any>,
): layersCategories is Record<string, Array<LayerKey | TableKey>> {
  return Object.values(layersCategories)
    .flat()
    .every(layerOrTableKey => {
      if (isLayerKey(layerOrTableKey) || isTableKey(layerOrTableKey)) {
        return true;
      }
      console.error(`Key ${layerOrTableKey} isn't a valid layer or table key`);
      return false;
    });
}

export const menuList: MenuItemsType = map(
  appConfig.categories,
  (layersCategories, categoryKey) => {
    if (!checkLayersCategories(layersCategories)) {
      throw new Error(
        `'${categoryKey}' in prism.json isn't a valid category. Check console for more details.`,
      );
    }
    return {
      title: startCase(categoryKey),
      icon: icons[categoryKey],
      layersCategories: formatLayersCategories(layersCategories),
    };
  },
);
