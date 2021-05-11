import React, { useState } from 'react';
import {
  Button,
  Typography,
  Popover,
  withStyles,
  WithStyles,
  createStyles,
  Theme,
} from '@material-ui/core';

import { MenuItemType } from '../../../config/types';
import MenuSwitch from '../MenuSwitch';

function MenuItem({ classes, title, icon, layersCategories }: MenuItemProps) {
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const open = Boolean(anchorEl);
  const id = open ? 'menu-item-popover' : undefined;

  return (
    <>
      <Button
        className={classes.title}
        onClick={handleClick}
        aria-describedby={id}
      >
        <img className={classes.icon} src={icon} alt={title} />
        <Typography variant="body2">{title}</Typography>
      </Button>

      <Popover
        id={id}
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        className={classes.popover}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'center',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'center',
        }}
        PaperProps={{
          className: classes.paper,
        }}
      >
        {layersCategories.map(({ title: categoryTitle, layers, tables }) => (
          <MenuSwitch
            key={categoryTitle}
            title={categoryTitle}
            layers={layers}
            tables={tables}
          />
        ))}
      </Popover>
    </>
  );
}

const styles = (theme: Theme) =>
  createStyles({
    title: {
      margin: '0px 14px',
      textTransform: 'uppercase',
      color: 'inherit',

      '&::after': {
        content: '""',
        display: 'inline-block',
        width: 0,
        height: 0,
        marginLeft: 3.5,
        verticalAlign: 3.5,
        borderTop: '3.5px solid',
        borderRight: '3.5px solid transparent',
        borderBottom: 0,
        borderLeft: '3.5px solid transparent',
      },
    },

    icon: {
      width: 18,
      marginRight: 6,
    },

    popover: {
      marginTop: 8,
    },

    paper: {
      padding: '8px 16px',
      backgroundColor: `${theme.palette.primary.main}f9`,
      borderRadius: theme.shape.borderRadius,
    },
  });

export interface MenuItemProps
  extends MenuItemType,
    WithStyles<typeof styles> {}

export default withStyles(styles)(MenuItem);
