import { NodeSSH } from 'node-ssh';
import * as fs from 'fs';
import { sshConfig } from './config';

export const ssh = new NodeSSH();

export async function connect() {
  const key = fs.readFileSync(sshConfig.privateKeyPath, 'utf-8');
  await ssh.connect({
    host: sshConfig.host,
    username: sshConfig.username,
    privateKey: key,
  });
}

export async function exec(command: string) {
  const result = await ssh.execCommand(command);
  if (result.code !== 0) {
    throw new Error(`Command failed: ${command}\n${result.stderr}`);
  }
  return result.stdout;
}