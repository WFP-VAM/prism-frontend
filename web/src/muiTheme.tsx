import { createMuiTheme } from '@material-ui/core/styles';

const skyBlue: string = '#009EE0';
const greyBlue: string = '#5A686C';
const darkGreyBlue: string = '#2D3436';
const white: string = '#FFFFFF';
const lightGray = '#CCCCCC';

export const colors = { skyBlue, greyBlue, darkGreyBlue };

const theme: any = createMuiTheme({
  palette: {
    primary: {
      main: greyBlue,
      dark: darkGreyBlue,
    },
    text: {
      primary: white,
      secondary: darkGreyBlue,
    },
    grey: {
      500: lightGray,
    },
  },
  overrides: {
    MuiToolbar: {
      dense: {
        minHeight: 40,
      },
    },
    MuiTypography: {
      h4: {
        fontSize: 13,
        color: darkGreyBlue,
        fontWeight: 400,
      },
      h5: {
        fontSize: 11,
        color: greyBlue,
      },
      body1: {
        color: white,
        fontSize: 13,
        fontWeight: 300,
      },
      body2: {
        fontSize: 11,
        letterSpacing: 3.5,
        color: white,
        textTransform: 'uppercase',
      },
    },
    MuiListItem: {
      button: {
        // dropdowns in Analyser Table are white on white background without this rule.
        color: 'black',
      },
    },
    MuiMenuItem: {
      root: {
        color: 'black',
      },
    },
    MuiAccordion: {
      root: {
        '&$expanded': {
          margin: 0, // remove additional padding when expanded
          '&:before': {
            opacity: 1, // to keep the border when expanded
          },
        },
      },
    },
    MuiAccordionSummary: {
      root: {
        backgroundColor: greyBlue,
        minHeight: 56,
        '&$expanded': {
          minHeight: 56,
        },
      },
      content: {
        '&$expanded': {
          margin: '12px 0px', // keep height the same before/after epanded
        },
      },
    },
    MuiAccordionDetails: {
      root: {
        backgroundColor: darkGreyBlue,
        opacity: 0.9,
        padding: 16,
      },
    },
  },
});

export default theme;
