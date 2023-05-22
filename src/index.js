import { defineCommand, runMain } from 'citty';
import { consola } from 'consola';
import shell from 'shelljs';

const main = defineCommand({
  meta: {
    name: 'lint-diff-branch',
    version: '0.1.3',
    description: 'Run ESLint on changed JS/TS files against a target branch',
  },
  args: {
    target: {
      type: 'positional',
      required: true,
      description: 'Target branch',
      default: 'master / main',
    },
    fix: {
      type: 'boolean',
      description:
        'Auto-fix the issues, when provided, it will run eslint --fix under the hood',
    },
    quiet: {
      type: 'boolean',
      description:
        'Only lint "error" issues, when provided, it will run eslint --quiet under the hood',
    },
    ci: {
      type: 'boolean',
      description:
        'Run the command in CI mode, the prompt will not show when provided',
    },
  },
  run: async ({ args }) => {
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
          .stdout.trim()
      )
    ) {
      consola.error('This command will only work in a git repository');
      shell.exit(1);
    }

    // Determine target branch
    let targetBranch;
    if (args.target === 'master / main') {
      targetBranch = shell.exec(
        "git remote show $(git remote) | sed -n '/HEAD branch/s/.*: //p'",
        { silent: true }
      ).stdout;
    } else {
      targetBranch = args.target;
    }
    targetBranch = targetBranch.trim();

    // Get changed files against target branch
    const changedFiles = shell
      .exec(
        `git diff --name-only --diff-filter=ACMRTUXB $(git branch --show-current) $(git merge-base origin/${targetBranch} $(git branch --show-current)) | grep -E "(.js$|.jsx$|.ts$|.tsx$|.mjs$|.mjsx$|.cjs$|.cjsx$)"`,
        { silent: true }
      )
      .stdout.trim()
      .split('\n');
    if (
      !Array.isArray(changedFiles) ||
      !changedFiles.some(filePath => filePath.length > 0)
    ) {
      consola.success({
        message: 'No changed files available for ESLint. All good!',
        level: 1,
      });
      shell.exit(0);
    }
    consola.info({
      message: 'Changed JS/TS files against target branch:',
      additional: changedFiles,
      level: 1,
    });

    // Prompt to start lint
    if (!args.ci) {
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
    shell.exec(
      `eslint --color ${args.fix ? '--fix' : ''} ${
        args.quiet ? '--quiet' : ''
      } ${changedFiles.join(' ')}`,
      { silent: true },
      function (code, stdout, _) {
        if (stdout) {
          consola.warn({
            message: 'Done. Please check and fix the issues below:',
            level: 1,
          });
          consola.log(stdout);
        } else {
          consola.success({
            message: 'Done. No errors/warnings found, good job! 🎉',
            level: 1,
          });
        }
        shell.exit(code);
      }
    );
  },
});

runMain(main);
