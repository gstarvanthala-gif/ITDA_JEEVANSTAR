import { spawn } from 'node:child_process';

const npmCli = process.env.npm_execpath;

if (!npmCli) {
  throw new Error('Run this launcher with "npm run dev".');
}

const apps = [
  { name: 'server', args: ['--prefix', 'server', 'run', 'dev'] },
  { name: 'client', args: ['--prefix', 'client', 'run', 'dev'] },
];

const processes = apps.map(({ name, args }) => {
  const child = spawn(process.execPath, [npmCli, ...args], { stdio: 'inherit' });

  child.on('error', (error) => {
    console.error(`Failed to start ${name}:`, error.message);
    process.exitCode = 1;
    stop('SIGTERM');
  });

  child.on('exit', (code, signal) => {
    if (!shuttingDown) {
      process.exitCode = code ?? 1;
      stop(signal || 'SIGTERM');
    }
  });

  return child;
});

let shuttingDown = false;

function stop(signal) {
  if (shuttingDown) return;
  shuttingDown = true;

  for (const child of processes) {
    if (child.exitCode === null && child.signalCode === null) {
      child.kill(signal);
    }
  }
}

process.on('SIGINT', () => {
  process.exitCode = 130;
  stop('SIGINT');
});

process.on('SIGTERM', () => {
  process.exitCode = 143;
  stop('SIGTERM');
});
