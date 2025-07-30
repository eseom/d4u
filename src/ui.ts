import blessed from 'blessed';

export const screen = blessed.screen({
  smartCSR: true,
  title: 'dokku-tui',
});

export const appList = blessed.list({
  parent: screen,
  label: ' Dokku Apps ',
  width: '30%',
  height: '100%',
  keys: true,
  border: 'line',
  style: {
    selected: { bg: 'blue' },
  },
});

export const detailsTable = blessed.table({
  parent: screen,
  label: ' App Info ',
  left: '30%',
  width: '70%',
  height: '100%',
  border: 'line',
  align: 'left',
  noCellBorders: true,
  style: {
    header: { fg: 'cyan', bold: true },
    cell: { fg: 'white' },
  },
  data: [['Select an app...']],
});

export const logBox = blessed.log({
  parent: screen,
  label: ' Logs ',
  left: 0,
  top: 0,
  width: '100%',
  height: '100%',
  border: 'line',
  keys: true,
  mouse: true,
  scrollable: true,
  scrollbar: {
    ch: ' ',
    track: {
      bg: 'blue'
    },
    style: {
      inverse: true
    }
  },
  hidden: true, // Initially hidden
  padding: { left: 0, right: 0 },
});

export const dashboardTable = blessed.table({
  parent: screen,
  label: ' Dokku Dashboard ',
  left: 0,
  top: 0,
  width: '100%',
  height: '100%',
  border: 'line',
  align: 'left',
  noCellBorders: true,
  style: {
    header: { fg: 'cyan', bold: true },
    cell: { fg: 'white' },
  },
  data: [['Loading Dashboard...']],
  hidden: true,
});

export const configForm = blessed.form({
  parent: screen,
  keys: true,
  left: 0,
  top: 0,
  width: '100%',
  height: '100%',
  border: 'line',
  label: ' App Environment Variables (Esc to close, Enter to save) ',
  hidden: true,
  style: {
    bg: 'black',
  },
});

export const configList = blessed.list({
  parent: configForm,
  width: '99%',
  height: '80%',
  keys: true,
  mouse: true,
  scrollable: true,
  scrollbar: {
    ch: ' ',
    track: {
      bg: 'blue'
    },
    style: {
      inverse: true
    }
  },
  style: {
    selected: { bg: 'blue' },
  },
});

export const configInput = blessed.textbox({
  parent: configForm,
  bottom: 0,
  height: 3,
  width: '99%',
  inputOnFocus: true,
  border: 'line',
  content: 'Enter KEY=VALUE or KEY to unset',
  style: {
    bg: 'gray',
    fg: 'black',
  },
});

export const commandMenu = blessed.box({
  parent: screen,
  bottom: 0,
  height: 1,
  width: '100%',
  content: '  (r) Restart | (s) Stop | (p) Start | (l) Logs | (e) Env | (d) Dashboard | (q) Quit',
  style: {
    bg: 'blue',
  },
});

screen.key(['q', 'C-c'], () => process.exit(0));
