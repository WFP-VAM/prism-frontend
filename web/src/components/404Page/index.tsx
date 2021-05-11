import React from 'react';
import {
  createStyles,
  WithStyles,
  withStyles,
  Typography,
  Button,
  Grid,
} from '@material-ui/core';
import { Link } from 'react-router-dom';

import { colors } from '../../muiTheme';
import wfpLogo from '../images/wfp_logo.png';

function NotFound({ classes }: NotFoundProps) {
  return (
    <div className={classes.container}>
      <Grid container spacing={3} className={classes.content}>
        <Grid item>
          <Typography variant="h3" color="textPrimary" gutterBottom>
            404 Page Not Found
          </Typography>
          <Typography variant="h5" color="textPrimary" gutterBottom>
            Sorry, it seems we ran into a problem. We already collected
            information about this error.
          </Typography>
          <Typography variant="body1" gutterBottom>
            If you have typed the address of this web page, you may misspelled
            it or if you redirected to this page, it may be moved to another
            location. Please go back to the website home page and try to find
            your page from the website navigation.
          </Typography>
        </Grid>

        <Grid item>
          <Button variant="contained" component={Link} to="/">
            Back To Home
          </Button>
        </Grid>

        <Grid item>
          <img
            className={classes.image}
            src={wfpLogo}
            alt="World Food Programme logo"
          />
        </Grid>
      </Grid>
    </div>
  );
}

const styles = () =>
  createStyles({
    container: {
      width: '100vw',
      height: '100vh',
      backgroundColor: colors.skyBlue,
      display: 'flex',
      justifyContent: 'center',
    },

    content: {
      margin: 'auto',
      maxWidth: '50vw',
    },

    image: {
      width: '90%',
      opacity: '0.5',
    },
  });

export interface NotFoundProps extends WithStyles<typeof styles> {}

export default withStyles(styles)(NotFound);
