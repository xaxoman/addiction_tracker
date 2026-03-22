import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const rootDir = process.cwd();
const androidDir = join(rootDir, 'android');
const apkPath = join(androidDir, 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk');
const isDryRun = process.argv.includes('--dry-run');

const run = (command, args, cwd = rootDir) => {
  const pretty = `${command} ${args.join(' ')}`.trim();
  console.log(`\n> ${pretty}`);

  if (isDryRun) {
    return;
  }

  const result = spawnSync(command, args, {
    cwd,
    stdio: 'inherit',
    shell: process.platform === 'win32'
  });

  if (result.status !== 0) {
    throw new Error(`Command failed: ${pretty}`);
  }
};

try {
  console.log('Starting APK build pipeline...');

  run('npm', ['run', 'build']);
  run('npx', ['cap', 'sync', 'android']);

  if (process.platform === 'win32') {
    run('gradlew.bat', ['assembleDebug'], androidDir);
  } else {
    run('./gradlew', ['assembleDebug'], androidDir);
  }

  if (isDryRun) {
    console.log('\nDry run completed. No commands were executed.');
    process.exit(0);
  }

  if (!existsSync(apkPath)) {
    throw new Error(`APK was not found at expected path: ${apkPath}`);
  }

  console.log('\nAPK build completed successfully.');
  console.log(`APK path: ${apkPath}`);
} catch (error) {
  console.error('\nAPK build failed.');
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
