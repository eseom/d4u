export const sshConfig = {
  host: process.env.HOST || '',
  username: process.env.USERNAME || '',
  privateKeyPath: process.env.PEMFILE || '',
};
