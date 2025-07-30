import { exec } from './ssh';
import { NodeSSH } from 'node-ssh';
import { sshConfig } from './config';
import * as fs from 'fs';

export async function getApps() {
  const output = await exec('dokku apps:list');
  return output.split('\n').slice(1).filter(Boolean);
}

export async function getAppReport(appName: string) {
  return await exec(`dokku ps:report ${appName}`);
}

export async function restartApp(appName: string) {
  return await exec(`dokku ps:restart ${appName}`);
}

export async function stopApp(appName: string) {
  return await exec(`dokku ps:stop ${appName}`);
}

export async function startApp(appName: string) {
  return await exec(`dokku ps:start ${appName}`);
}

export async function getAppConfig(appName: string) {
  const output = await exec(`dokku config ${appName}`);
  const lines = output.split('\n').filter(line => line.trim() && !line.startsWith('=====>'));
  const config: { [key: string]: string } = {};
  lines.forEach(line => {
    const parts = line.split(':');
    if (parts.length >= 2) {
      const key = parts[0].trim();
      const value = parts.slice(1).join(':').trim();
      config[key] = value;
    }
  });
  return config;
}

export async function setAppConfig(appName: string, key: string, value: string) {
  return await exec(`dokku config:set ${appName} ${key}=${value}`);
}

export async function unsetAppConfig(appName: string, key: string) {
  return await exec(`dokku config:unset ${appName} ${key}`);
}

export function parseAppReport(report: string): string[][] {
  const lines = report.split('\n').filter(line => line.trim() && !line.startsWith('=====>'));
  const data = lines.map(line => {
    const parts = line.split(':');
    const key = parts[0].trim();
    const value = parts.slice(1).join(':').trim();
    return [key, value];
  });
  return [['Property', 'Value'], ...data];
}

export async function getAppInspect(appName: string): Promise<any> {
  const output = await exec(`dokku ps:inspect ${appName}`);
  return JSON.parse(output);
}

export async function getDashboardData(): Promise<string[][]> {
  const apps = await getApps();
  const dashboardData: string[][] = [['App Name', 'Process', 'State', 'Uptime', 'Memory', 'CPU']];

  for (const appName of apps) {
    try {
      const inspectData = await getAppInspect(appName);
      // Assuming inspectData is an array of container objects
      if (inspectData && inspectData.length > 0) {
        inspectData.forEach((container: any) => {
          const processName = container.Config.Labels['com.dokku.dyno'] || 'N/A';
          const state = container.State.Status || 'N/A';
          const startedAt = new Date(container.State.StartedAt);
          const uptime = state === 'running' ? formatUptime(startedAt) : '-';

          dashboardData.push([appName, processName, state, uptime, 'N/A', 'N/A']);
        });
      } else {
        dashboardData.push([appName, 'N/A', 'No containers', 'N/A', 'N/A', 'N/A']);
      }
    } catch (error) {
      dashboardData.push([appName, 'N/A', 'Error fetching inspect', 'N/A', 'N/A', 'N/A']);
      console.error(`Failed to get inspect data for app ${appName}:`, error);
    }
  }
  return dashboardData;
}

function formatUptime(startedAt: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - startedAt.getTime();

  const seconds = Math.floor(diffMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}

export async function streamAppLogs(appName: string, onData: (chunk: Buffer) => void): Promise<NodeSSH> {
  const logSsh = new NodeSSH();
  const key = fs.readFileSync(sshConfig.privateKeyPath, 'utf-8');

  await logSsh.connect({
    host: sshConfig.host,
    username: sshConfig.username,
    privateKey: key,
  });

  // This is a long-running process, so we don't await it.
  // We get some recent logs with --tail and then follow with -t.
  logSsh.execCommand(`dokku logs --tail ${appName}`, {
    onStdout: onData,
    onStderr: onData, // Show errors in the log view as well
  });

  return logSsh;
}