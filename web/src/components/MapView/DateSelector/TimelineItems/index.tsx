import React from 'react';
import {
  createStyles,
  Fade,
  Grid,
  Tooltip,
  Typography,
  WithStyles,
  withStyles,
} from '@material-ui/core';
import { CreateCSSProperties } from '@material-ui/styles';
import moment from 'moment';
import { merge } from 'lodash';
import { DateRangeType } from '../../../../config/types';
import { TIMELINE_ITEM_WIDTH, USER_DATE_OFFSET } from '../utils';

function TimelineItems({
  classes,
  availableDates,
  dateRange,
  clickDate,
}: TimelineItemsProps) {
  const click = (dateIndex: number) => {
    clickDate(dateIndex);
  };
  return (
    <>
      {dateRange.map((date, index) => (
        <Tooltip
          title={date.label}
          key={date.label}
          TransitionComponent={Fade}
          TransitionProps={{ timeout: 0 }}
          placement="top"
          arrow
        >
          <Grid
            item
            xs
            className={
              date.isFirstDay ? classes.dateItemFull : classes.dateItem
            }
          >
            {date.isFirstDay ? (
              <Typography variant="body2" className={classes.dateItemLabel}>
                {date.month}
              </Typography>
            ) : (
              <div className={classes.dayItem} />
            )}
            {availableDates
              .map(availableDate =>
                moment(availableDate + USER_DATE_OFFSET).format('DD MMM YYYY'),
              )
              .includes(date.label) && (
              <div
                className={classes.dateAvailable}
                role="presentation"
                onClick={() => click(index)}
              />
            )}
          </Grid>
        </Tooltip>
      ))}
    </>
  );
}

const DATE_ITEM_STYLES: CreateCSSProperties = {
  borderTop: '1px solid white',
  color: 'white',
  position: 'relative',
  top: -5,
  cursor: 'pointer',
  minWidth: TIMELINE_ITEM_WIDTH,
  '&:hover': {
    borderLeft: '1px solid #5ccfff',
  },
};

const styles = () =>
  createStyles({
    dateItemFull: {
      ...DATE_ITEM_STYLES,
      borderLeft: '1px solid white',
      height: 36,
    },

    dateItem: merge(DATE_ITEM_STYLES, {
      '&:hover': {
        '& $dayItem': {
          borderLeft: 0,
        },
      },
    }),

    dateItemLabel: {
      position: 'absolute',
      top: 22,
      textAlign: 'left',
      paddingLeft: 5,
      minWidth: 80,
    },

    dayItem: {
      height: 10,
      borderLeft: '1px solid white',
    },

    dateAvailable: {
      position: 'absolute',
      top: 0,
      backgroundColor: 'white',
      height: 5,
      width: TIMELINE_ITEM_WIDTH,
      opacity: 0.6,
    },
  });

export interface TimelineItemsProps extends WithStyles<typeof styles> {
  availableDates: number[];
  dateRange: DateRangeType[];
  clickDate: (arg: number) => void;
}

export default withStyles(styles)(TimelineItems);
