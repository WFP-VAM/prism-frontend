import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { createStyles, WithStyles, withStyles } from '@material-ui/core';
import { Alert } from '@material-ui/lab';
import {
  Notification,
  notificationsSelector,
  removeNotification,
} from '../../context/notificationStateSlice';

function Notifier({ classes }: NotifierProps) {
  const dispatch = useDispatch();
  const notifications = useSelector(notificationsSelector);
  const [topOffset, setTopOffset] = useState(65);

  // make sure the notifications don't overlap the nav bar.
  useEffect(() => {
    const toolbar = document.getElementsByClassName('MuiToolbar-root')[0];
    function handleResize() {
      if (!toolbar) {
        return;
      }
      setTopOffset(toolbar.clientHeight + 15);
    }
    // try make sure the toolbar is available to use on first run, not too dangerous if it doesn't work - default value is good for most screens.
    setTimeout(handleResize, 500);

    window.addEventListener('resize', handleResize);

    // cleanup
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleClose = (notification: Notification) => () => {
    dispatch(removeNotification(notification.key));
  };
  return (
    <div className={classes.notificationsContainer} style={{ top: topOffset }}>
      {notifications.map(notification => {
        return (
          <Alert
            variant="filled"
            severity={notification.type}
            key={notification.key}
            onClose={handleClose(notification)}
            className={classes.alert}
          >
            {notification.message}
          </Alert>
        );
      })}
    </div>
  );
}

const styles = () =>
  createStyles({
    notificationsContainer: {
      left: '50%',
      transform: 'translateX(-50%)',
      display: 'flex',
      zIndex: 10,
      flexDirection: 'column',
      position: 'fixed',
      alignItems: 'center',
    },
    alert: {
      marginBottom: '10px',
    },
  });

interface NotifierProps extends WithStyles<typeof styles> {}
export default withStyles(styles)(Notifier);
