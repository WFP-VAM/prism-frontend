import React from 'react';
import {
  createStyles,
  Grid,
  Typography,
  withStyles,
  WithStyles,
  Accordion,
  AccordionDetails,
  AccordionSummary,
} from '@material-ui/core';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCaretDown } from '@fortawesome/free-solid-svg-icons';
import { MenuItemMobileType } from '../../../config/types';
import MenuSwitch from '../MenuSwitch';

function MenuItemMobile({
  expanded,
  selectAccordion,
  classes,
  title,
  icon,
  layersCategories,
}: MenuItemMobileProps) {
  const handleChange = (panel: string) => (
    event: React.ChangeEvent<{}>,
    newExpanded: boolean,
  ) => {
    selectAccordion(newExpanded ? panel : '');
  };

  return (
    <Accordion
      key={title}
      square
      elevation={0}
      expanded={expanded === title}
      onChange={handleChange(title)}
    >
      <AccordionSummary
        expandIcon={<FontAwesomeIcon icon={faCaretDown} />}
        IconButtonProps={{ color: 'inherit', size: 'small' }}
        aria-controls={title}
        id={title}
      >
        <img className={classes.icon} src={icon} alt={title} />
        <Typography variant="body2">{title}</Typography>
      </AccordionSummary>
      <AccordionDetails>
        <Grid container direction="column">
          {layersCategories.map(({ title: categoryTitle, layers, tables }) => (
            <MenuSwitch
              key={categoryTitle}
              title={categoryTitle}
              layers={layers}
              tables={tables}
            />
          ))}
        </Grid>
      </AccordionDetails>
    </Accordion>
  );
}

const styles = () =>
  createStyles({
    icon: {
      width: 18,
      height: 18,
      marginRight: 6,
    },
  });

export interface MenuItemMobileProps
  extends MenuItemMobileType,
    WithStyles<typeof styles> {}

export default withStyles(styles)(MenuItemMobile);
