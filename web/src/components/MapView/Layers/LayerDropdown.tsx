import {
  FormControl,
  ListSubheader,
  MenuItem,
  Select,
  Typography,
} from '@material-ui/core';
import React, { ReactElement } from 'react';
import { menuList } from '../../NavBar/utils';
import { LayerKey, LayerType } from '../../../config/types';

function LayerDropdown({
  type,
  value,
  setValue,
  title,
  placeholder,
  ...rest
}: LayerSelectorProps) {
  // this could be testable, needs to be constructed in a way that prevents it breaking whenever new layers are added. (don't put layer name in snapshot)

  const categories = menuList // we could memo this but it isn't impacting performance, for now
    // 1. flatten to just the layer categories, don't need the big menus
    .flatMap(menu => menu.layersCategories)
    // 2. get rid of layers within the categories which don't match the given type
    .map(category => ({
      ...category,
      layers: category.layers.filter(layer => layer.type === type),
    }))
    // 3. filter categories which don't have any layers at the end of it all.
    .filter(category => category.layers.length > 0);
  const defaultValue = 'placeholder';

  return (
    <FormControl {...rest}>
      <Select
        defaultValue={defaultValue}
        onChange={e => {
          setValue(e.target.value as LayerKey);
        }}
        id={`${title}-select`}
      >
        {categories.reduce(
          // map wouldn't work here because <Select> doesn't support <Fragment> with keys, so we need one array
          (components, category) => [
            ...components,
            <ListSubheader
              style={{ pointerEvents: 'none' }}
              key={category.title}
            >
              <Typography variant="body2" color="primary">
                {category.title}
              </Typography>
            </ListSubheader>,
            ...category.layers.map(layer => (
              <MenuItem
                style={{ color: 'black' }}
                key={layer.id}
                value={layer.id}
              >
                {layer.title}
              </MenuItem>
            )),
          ],
          (placeholder
            ? [
                <MenuItem
                  style={{ color: 'black' }}
                  key="placeholder"
                  value="placeholder"
                  disabled
                >
                  {placeholder}
                </MenuItem>,
              ]
            : []) as ReactElement[],
        )}
      </Select>
    </FormControl>
  );
}

interface LayerSelectorProps {
  type: LayerType['type'];
  value?: LayerKey;
  setValue: (val: LayerKey) => void;
  title: string;
  // a way to type this and every other default thing in? e.g style
  className?: string;
  placeholder?: string;
}
export default LayerDropdown;
