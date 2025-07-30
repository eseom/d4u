import { connect } from './ssh';
import {
  getApps,
  getAppReport,
  streamAppLogs,
  restartApp,
  stopApp,
  startApp,
  parseAppReport,
  getAppConfig,
  setAppConfig,
  unsetAppConfig,
  getDashboardData,
} from './dokku';
import { screen, appList, detailsTable, logBox, commandMenu, configForm, configList, configInput, dashboardTable } from './ui';
import { NodeSSH } from 'node-ssh';

let activeLogConnection: NodeSSH | null = null;
let currentAppName: string | null = null;

function flashMessage(message: string, duration = 2000) {
  detailsTable.setData([['Status', message]]);
  screen.render();
  setTimeout(() => {
    // The report will be refreshed by the calling function.
  }, duration);
}

async function refreshAppReport(appName: string) {
  try {
    const report = await getAppReport(appName);
    const parsedReport = parseAppReport(report);
    detailsTable.setData(parsedReport);
  } catch (error: any) {
    detailsTable.setData([['Error', `Error fetching report for ${appName}:\n${error.message}`]]);
  } finally {
    screen.render();
  }
}

async function showLogs(appName: string) {
  logBox.setLabel(` Logs for ${appName} (Press Esc to close) `);
  logBox.setContent('');
  logBox.show();
  logBox.focus();
  commandMenu.hide();
  screen.render();

  try {
    activeLogConnection = await streamAppLogs(appName, (chunk) => {
      logBox.log(chunk.toString('utf-8').trim());
      screen.render();
    });
  } catch (error: any) {
    logBox.log(`Error starting log stream: ${error.message}`);
    screen.render();
    return;
  }

  const closeLogViewer = () => {
    if (activeLogConnection) {
      activeLogConnection.dispose();
      activeLogConnection = null;
    }
    logBox.hide();
    commandMenu.show();
    appList.focus();
    screen.render();
    logBox.off('keypress', closeOnEscape);
  };

  const closeOnEscape = (ch: any, key: any) => {
    if (key.name === 'escape') {
      closeLogViewer();
    }
  };

  logBox.on('keypress', closeOnEscape);
}

async function showConfigEditor(appName: string) {
  configForm.show();
  configForm.focus();
  commandMenu.hide();
  screen.render();

  try {
    const config = await getAppConfig(appName);
    const configItems = Object.entries(config).map(([key, value]) => `${key}=${value}`);
    configList.setItems(configItems);
    screen.render();
  } catch (error: any) {
    configList.setItems([`Error loading config: ${error.message}`]);
    screen.render();
  }

  configForm.on('keypress', (ch, key) => {
    if (key.name === 'escape') {
      configForm.hide();
      commandMenu.show();
      appList.focus();
      screen.render();
      configForm.off('keypress', () => {}); // Remove all keypress listeners
      configInput.off('submit', () => {}); // Remove all submit listeners
    }
  });

  configInput.on('submit', async (value: string) => {
    if (!value) return;

    const parts = value.split('=');
    const key = parts[0].trim();
    const val = parts.slice(1).join('=').trim();

    try {
      if (parts.length === 1) {
        // Unset variable
        flashMessage(`Unsetting ${key}...`);
        await unsetAppConfig(appName, key);
        flashMessage(`Successfully unset ${key}.`);
      } else {
        // Set variable
        flashMessage(`Setting ${key}=${val}...`);
        await setAppConfig(appName, key, val);
        flashMessage(`Successfully set ${key}=${val}.`);
      }
      // Refresh config list
      const updatedConfig = await getAppConfig(appName);
      const updatedConfigItems = Object.entries(updatedConfig).map(([k, v]) => `${k}=${v}`);
      configList.setItems(updatedConfigItems);
      configInput.clearValue();
      screen.render();
    } catch (error: any) {
      flashMessage(`Error: ${error.message}`);
      screen.render();
    }
  });
}

async function showDashboard() {
  dashboardTable.show();
  dashboardTable.focus();
  commandMenu.hide();
  appList.hide();
  detailsTable.hide();
  screen.render();

  try {
    const dashboardData = await getDashboardData();
    dashboardTable.setData(dashboardData);
    screen.render();
  } catch (error: any) {
    dashboardTable.setData([['Error', `Error loading dashboard: ${error.message}`]]);
    screen.render();
  }

  dashboardTable.on('keypress', (ch, key) => {
    if (key.name === 'escape') {
      dashboardTable.hide();
      commandMenu.show();
      appList.show();
      detailsTable.show();
      appList.focus();
      screen.render();
      dashboardTable.off('keypress', () => {}); // Remove all keypress listeners
    }
  });
}

async function handleCommand(command: (appName: string) => Promise<any>, appName: string, successMessage: string) {
  try {
    flashMessage(`Executing command on ${appName}...`);
    await command(appName);
    flashMessage(successMessage);
  } catch (error: any) {
    flashMessage(`Error: ${error.message}`);
  } finally {
    setTimeout(() => refreshAppReport(appName), 2000);
  }
}

async function main() {
  try {
    await connect();

    const apps = await getApps();
    appList.setItems(apps);
    appList.focus();
    screen.render();

    appList.on('select', (item) => {
      currentAppName = item.getText();
      refreshAppReport(currentAppName);
    });

    appList.on('keypress', (ch, key) => {
      const appName = (appList as any).value;
      // If no app is selected, only allow 'd' for dashboard or 'q' to quit
      if (!appName && key.name !== 'd' && key.name !== 'q') return;

      switch (key.name) {
        case 'l':
          showLogs(appName);
          break;
        case 'r':
          handleCommand(restartApp, appName, `Successfully restarted ${appName}.`);
          break;
        case 's':
          handleCommand(stopApp, appName, `Successfully stopped ${appName}.`);
          break;
        case 'p':
          handleCommand(startApp, appName, `Successfully started ${appName}.`);
          break;
        case 'e':
          showConfigEditor(appName);
          break;
        case 'd':
          showDashboard();
          break;
      }
    });

  } catch (error: any) {
    console.error('Failed to start application:', error);
    process.exit(1);
  }
}

main();
