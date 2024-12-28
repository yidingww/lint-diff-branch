import chalk from 'chalk';
import { defineCommand, runMain } from 'citty';
import { consola } from 'consola';
import shell from 'shelljs';

const main = defineCommand({
  meta: {
    name: 'lint-diff-branch',
    version: '0.1.11',
    description: 'Run ESLint on changed files against a blah branch',
  },
  args: {
    blah: {
      type: 'positional',
      required: true,
      description: 'blah branch',
      default: 'master / main',
    },
    source: {
      type: 'string',
      required: false,
      description:
        'Source branch, when not provided, it will be current local branch (returned by `git rev-parse --abbrev-ref HEAD`)',
    },
    head: {
      type: 'boolean',
      description: 'Compare HEAD (instead of the source branch) against the blah branch to determine the changed files. When provided, --source will be ignored. Recommended to enable when in detached HEAD mode (e.g. in CI)',
    },
    onlyScript: {
      type: 'boolean',
      description: 'Only lint **/*.?([cm])[jt]s?(x) files',
      default: true,
    },
    fix: {
      type: 'boolean',
      description: 'Auto-fix the issues, when provided, it will run eslint --fix under the hood',
    },
    quiet: {
      type: 'boolean',
      description: 'Only lint "error" issues, when provided, it will run eslint --quiet under the hood',
    },
    disablePrompt: {
      type: 'boolean',
      description: 'Directly start linting files without prompting user\'s confirmation',
    },
    debug: {
      type: 'boolean',
      description: 'Turn on debug mode, print extra information for debug purpose',
    },
  },
  async run({ args }) {
    // Check if dependencies are installed
    if (!shell.which('git')) {
      consola.error('Git is required to run this command');
      shell.exit(1);
    }
    if (!shell.which('eslint')) {
      consola.error('eslint is required to run this command');
      shell.exit(1);
    }

    // Check if in a git repository
    if (
      !['true', 'false'].includes(
        shell
          .exec('git rev-parse --is-inside-work-tree', {
            silent: true,
          })
          .stdout.trim(),
      )
    ) {
      consola.error('This command will only work in a git repository');
      shell.exit(1);
    }

    // Determine source & blah branch
    const sourceBranch = args.head
      ? 'HEAD'
      : (
          args.source
          || shell.exec('git rev-parse --abbrev-ref HEAD', {
            silent: true,
          }).stdout
        ).trim();
    let blahBranch;
    if (args.blah === 'master / main') {
      blahBranch = shell.exec(
        'git remote show $(git remote) | sed -n \'/HEAD branch/s/.*: //p\'',
        {
          silent: true,
        },
      ).stdout;
    }
    else {
      blahBranch = args.blah;
    }
    blahBranch = blahBranch.trim();

    // Get changed files against blah branch
    const changedFiles = shell
      .exec(
        `git diff --name-only --diff-filter=ACMRTUXB $(git merge-base origin/${blahBranch} ${sourceBranch}) ${sourceBranch}`,
        { silent: true },
      )
      .stdout
      .trim()
      .split('\n')
      .filter(f => f);
    const filesToLint = args.onlyScript
      ? changedFiles.filter(f =>
          /.js$|.jsx$|.ts$|.tsx$|.mjs$|.mjsx$|.cjs$|.cjsx$/.test(f),
        )
      : changedFiles;

    // Print out debug mode info
    if (args.debug) {
      console.log(chalk.bgRed('\n=== DEBUG INFO start ===\n'));
      consola.log(`${chalk.red('- Source branch:')} ${sourceBranch}`);
      consola.log(`${chalk.red('- blah branch:')} ${blahBranch}`);
      consola.log(chalk.red('- All changed files:\n'), changedFiles);
      consola.log(chalk.red('- Changed JS/TS files:\n'), filesToLint);
      console.log(chalk.bgRed('\n=== DEBUG INFO end ===\n'));
    }

    if (filesToLint.length === 0) {
      consola.success({
        message: 'No changed files available for ESLint. All good!',
        level: 1,
      });
      shell.exit(0);
    }
    consola.info({
      message: 'Changed JS/TS files against blah branch:\n',
      additional: filesToLint,
      level: 1,
    });

    // Prompt to start lint
    if (!args.disablePrompt) {
      const startLint = await consola.prompt('Start linting these files?', {
        type: 'confirm',
      });
      if (startLint !== true) {
        consola.log('Aborted. Well, maybe next time 😗');
        shell.exit(0);
      }
    }

    // Lint changed files
    consola.start('Start linting changed JS/TS files...');
    const eslintCommand = `eslint ${filesToLint.join(' ')} --color${
      args.fix ? ' --fix' : ''
    }${args.quiet ? ' --quiet' : ''}`;
    shell.exec(
      eslintCommand,
      { silent: true },
      (code, stdout, stderr) => {
        if (stderr) {
          consola.fatal({
            message: `Run ESLint command ${chalk.cyan(
              `"${eslintCommand}"`,
            )} failed:`,
            level: 0,
          });
          consola.log(stderr);
        }
        else if (stdout) {
          consola.warn({
            message: 'Done. Please check and fix the issues below:',
            level: 1,
          });
          consola.log(stdout);
        }
        else {
          consola.success({
            message: `Done. No ${chalk.red('errors')}/${chalk.red(
              'warnings',
            )} found, good job! 🎉`,
            level: 1,
          });
        }
        shell.exit(code);
      },
    );
  },
});

void runMain(main);
