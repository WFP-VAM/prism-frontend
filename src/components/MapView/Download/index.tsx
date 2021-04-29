import React, { useRef, useState } from 'react';
import moment from 'moment';
import {
  Button,
  createStyles,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  Hidden,
  ListItemIcon,
  ListItemText,
  MenuItem,
  Theme,
  Typography,
  WithStyles,
  withStyles,
} from '@material-ui/core';
import Menu, { MenuProps } from '@material-ui/core/Menu';
import {
  CloudDownload,
  ArrowDropDown,
  Image,
  Description,
} from '@material-ui/icons';
import { jsPDF } from 'jspdf';
import { useSelector } from 'react-redux';
import {
  mapSelector,
  layersSelector,
  dateRangeSelector,
} from '../../../context/mapStateSlice/selectors';

type ExtraDownloadRequest = {
  url: string;
  date: number | undefined;
};

const ExportMenu = withStyles((theme: Theme) => ({
  paper: {
    border: '1px solid #d3d4d5',
    backgroundColor: theme.palette.primary.main,
  },
}))((props: MenuProps) => (
  <Menu
    elevation={0}
    getContentAnchorEl={null}
    anchorOrigin={{
      vertical: 'bottom',
      horizontal: 'center',
    }}
    transformOrigin={{
      vertical: 'top',
      horizontal: 'center',
    }}
    {...props}
  />
));

const ExportMenuItem = withStyles((theme: Theme) => ({
  root: {
    color: theme.palette.common.white,
  },
}))(MenuItem);

function Download({ classes }: DownloadProps) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [open, setOpen] = useState(false);
  const selectedMap = useSelector(mapSelector);
  const previewRef = useRef<HTMLCanvasElement>(null);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const openModal = () => {
    if (selectedMap) {
      const activeLayers = selectedMap.getCanvas();
      const canvas = previewRef.current;
      if (canvas) {
        canvas.setAttribute('width', activeLayers.width.toString());
        canvas.setAttribute('height', activeLayers.height.toString());
        const context = canvas.getContext('2d');
        if (context) {
          context.drawImage(activeLayers, 0, 0);
        }
      }
      setOpen(true);
    }
    handleClose();
  };

  const download = (format: string) => {
    const ext = format === 'pdf' ? 'png' : format;
    const canvas = previewRef.current;
    if (canvas) {
      const file = canvas.toDataURL(`image/${ext}`);
      if (format === 'pdf') {
        // eslint-disable-next-line new-cap
        const pdf = new jsPDF({
          orientation: 'landscape',
        });
        const imgProps = pdf.getImageProperties(file);
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
        pdf.addImage(file, 'PNG', 0, 0, pdfWidth, pdfHeight);
        pdf.save('map.pdf');
      } else {
        const link = document.createElement('a');
        link.setAttribute('href', file);
        link.setAttribute('download', `map.${ext}`);
        link.click();
      }
      setOpen(false);
      handleClose();
    }
  };

  function downloadExtra(request: ExtraDownloadRequest) {
    const url = new URL(request.url);
    if (request.date) {
      url.searchParams.append(
        'date',
        moment(request.date).format('YYYY-MM-DD'),
      );
    }
    window.open(url.toString());
  }

  const layers = useSelector(layersSelector);
  // first layer is always boundary layer
  const lastLayer = layers.length > 1 ? layers[layers.length - 1] : null;
  const extraDownloads =
    lastLayer && lastLayer.downloads ? lastLayer.downloads : [];
  const selectedDate = useSelector(dateRangeSelector);

  return (
    <Grid item>
      <Button variant="contained" color="primary" onClick={handleClick}>
        <CloudDownload fontSize="small" />
        <Hidden smDown>
          <Typography className={classes.label} variant="body2">
            Export
          </Typography>
        </Hidden>
        <ArrowDropDown fontSize="small" />
      </Button>
      <ExportMenu
        id="export-menu"
        anchorEl={anchorEl}
        keepMounted
        open={Boolean(anchorEl)}
        onClose={handleClose}
      >
        <ExportMenuItem onClick={openModal}>
          <ListItemIcon>
            <Image fontSize="small" style={{ color: 'white' }} />
          </ListItemIcon>
          <ListItemText primary="IMAGE" />
        </ExportMenuItem>
        {extraDownloads.map(ed => (
          <ExportMenuItem
            key={ed.label}
            onClick={() => {
              downloadExtra({
                date: selectedDate.startDate,
                url: ed.url,
              });
            }}
          >
            <ListItemIcon>
              <Description fontSize="small" style={{ color: 'white' }} />
            </ListItemIcon>
            <ListItemText primary={ed.label} />
          </ExportMenuItem>
        ))}
      </ExportMenu>
      <Dialog
        maxWidth="xl"
        open={open}
        keepMounted
        onClose={() => setOpen(false)}
        aria-labelledby="dialog-preview"
      >
        <DialogTitle className={classes.title} id="dialog-preview">
          Map Preview
        </DialogTitle>
        <DialogContent>
          <canvas ref={previewRef} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)} color="primary">
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={() => download('png')}
            color="primary"
          >
            Download PNG
          </Button>
          <Button
            variant="contained"
            onClick={() => download('jpeg')}
            color="primary"
          >
            Download JPEG
          </Button>
          <Button
            variant="contained"
            onClick={() => download('pdf')}
            color="primary"
          >
            Download PDF
          </Button>
        </DialogActions>
      </Dialog>
    </Grid>
  );
}

const styles = (theme: Theme) =>
  createStyles({
    label: {
      marginLeft: '10px',
    },
    title: {
      color: theme.palette.text.secondary,
    },
  });

export interface DownloadProps extends WithStyles<typeof styles> {}

export default withStyles(styles)(Download);
