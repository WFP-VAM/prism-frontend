import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  Theme,
  withStyles,
  WithStyles,
  createStyles,
  Drawer,
} from '@material-ui/core';
import DataTable from './DataTable';
import { getIsShowing, hideTable } from '../../context/tableStateSlice';
import {
  isDataTableDrawerActiveSelector,
  hideDataTableDrawer,
} from '../../context/analysisResultStateSlice';

function DataDrawer({ classes }: DataDrawerProps) {
  const tableIsShowing = useSelector(getIsShowing);
  const analysisTableIsShowing = useSelector(isDataTableDrawerActiveSelector);
  const isShowing = tableIsShowing || analysisTableIsShowing;

  const dispatch = useDispatch();
  const handleClose = () => {
    dispatch(hideTable());
    dispatch(hideDataTableDrawer());
  };

  return (
    <Drawer anchor="left" open={isShowing} onClose={handleClose}>
      <div className={classes.drawerContent}>
        {tableIsShowing ||
          (analysisTableIsShowing && <DataTable maxResults={1000} />)}
      </div>
    </Drawer>
  );
}

const styles = (theme: Theme) =>
  createStyles({
    drawerContent: {
      backgroundColor: theme.palette.primary.main,
      padding: 16,
      width: '40vw',
    },
  });

export interface DataDrawerProps extends WithStyles<typeof styles> {}

export default withStyles(styles)(DataDrawer);
