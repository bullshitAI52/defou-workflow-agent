import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

// Define the root directory of the project
const PROJECT_ROOT = path.resolve(__dirname, '..');

/**
 * Helper function to run a shell command
 */
function runCommand(command: string, args: string[], cwd: string): Promise<void> {
  return new Promise((resolve, reject) => {
    console.log(`\n🚀 Executing: ${command} ${args.join(' ')}`);
    console.log(`📂 Working Directory: ${cwd}\n`);

    const child = spawn(command, args, {
      cwd,
      stdio: 'inherit', // Pipe output directly to parent process
      shell: true
    });

    child.on('close', (code) => {
      if (code === 0) {
        console.log(`\n✅ Command completed successfully.`);
        resolve();
      } else {
        console.error(`\n❌ Command failed with exit code ${code}.`);
        reject(new Error(`Command failed: ${command} ${args.join(' ')}`));
      }
    });

    child.on('error', (err) => {
      console.error(`\n❌ Failed to start command: ${err.message}`);
      reject(err);
    });
  });
}

/**
 * Master Skill: The Orchestrator
 */
async function main() {
  console.log(`
=============================================
🤖 Defou x Stanley: Master Orchestrator
=============================================
指挥中心启动...
正在按顺序调度各个 Skill Agent...
`);

  try {
    // Step 1: Run the "Combo" Skill (Fetch Trends -> Select Topics -> Generate Content)
    console.log(`\n🔹 [Step 1/2] 启动内容生成引擎 (Trend Fetching & Content Generation)...`);
    // Corresponds to: npm run skill:combo
    // We use the full path to ensure it works even if cwd varies slightly, but relying on npm run is safer if we are in project root.
    // However, to be robust, let's run the ts-node command directly or use npm run.
    // Using npm run is better because it handles environment variables and paths defined in package.json.
    await runCommand('npm', ['run', 'skill:combo'], PROJECT_ROOT);

    // Step 2: Run the "Verify" Skill (Audit & Score Content)
    console.log(`\n🔹 [Step 2/2] 启动质量验证引擎 (Viral Verification)...`);
    // Corresponds to: npm run skill:verify
    await runCommand('npm', ['run', 'skill:verify'], PROJECT_ROOT);

    console.log(`
=============================================
🎉 所有任务执行完毕！
=============================================
1. 热点已抓取并分析
2. 文章已基于 Defou/Stanley 风格生成
3. 所有生成内容已完成潜力验证
    `);

  } catch (error) {
    console.error(`\n💥 Workflow Failed:`, error);
    process.exit(1);
  }
}

// Run the master skill
if (require.main === module) {
  main();
}
