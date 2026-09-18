import { Command } from 'commander';
import ora from 'ora';
import { getAuthenticatedClient } from '../lib/auth.ts';
import { success, error, info } from '../lib/formatter.ts';
import chalk from 'chalk';

export function createSearchCommand(): Command {
  const search = new Command('search')
    .description('Search messages across all conversations');

  // Search messages
  search
    .command('messages')
    .description('Search for messages across all conversations')
    .argument('<query>', 'Search query (e.g., "hello", "@username", "in:#channel")')
    .option('--limit <number>', 'Number of results to return', '20')
    .option('--sort <type>', 'Sort by "score" or "timestamp"', 'timestamp')
    .option('--sort-dir <dir>', 'Sort direction "asc" or "desc"', 'desc')
    .option('--workspace <id|name>', 'Workspace to use')
    .option('--json', 'Output in JSON format', false)
    .option('--output <file>', 'Save output to file')
    .action(async (query, options) => {
      const spinner = ora('Searching messages...').start();

      try {
        const client = await getAuthenticatedClient(options.workspace);

        const response = await client.searchMessages(query, {
          count: parseInt(options.limit),
          sort: options.sort,
          sort_dir: options.sortDir,
        });

        spinner.succeed(`Found ${response.messages?.total || 0} messages`);

        if (!response.messages?.matches || response.messages.matches.length === 0) {
          info('No messages found matching your query');
          return;
        }

        const matches = response.messages.matches;

        if (options.json) {
          const output = JSON.stringify(matches, null, 2);
          if (options.output) {
            await Bun.write(options.output, output);
            success(`Results saved to ${options.output}`);
          } else {
            console.log(output);
          }
          return;
        }

        // Format and display results
        let output = '';
        output += chalk.bold(`\n🔍 Search Results (${matches.length} messages):\n\n`);

        matches.forEach((match: any, idx: number) => {
          const date = new Date(parseFloat(match.ts) * 1000);
          const formattedDate = date.toLocaleString();

          output += chalk.gray(`${idx + 1}. `) + chalk.cyan(`#${match.channel?.name || match.channel?.id || 'unknown'}\n`);
          output += chalk.gray(`   ${formattedDate}\n`);
          output += `   ${chalk.bold(match.username || 'Unknown')}: ${match.text}\n`;

          if (match.permalink) {
            output += chalk.gray(`   ${match.permalink}\n`);
          }
          output += `\n`;
        });

        if (options.output) {
          await Bun.write(options.output, output);
          success(`Results saved to ${options.output}`);
        } else {
          console.log(output);
        }

      } catch (err: any) {
        spinner.fail('Search failed');
        error(err.message);
        process.exit(1);
      }
    });

  return search;
}
