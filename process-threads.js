// Process channel messages and find threads with no replies
import { readFileSync, writeFileSync } from 'fs';

// Read the JSON file
const data = readFileSync('/tmp/channel-messages.json', 'utf8');

// Extract JSON from the output (skip the status messages at the beginning)
const jsonStart = data.indexOf('{');
const jsonData = data.substring(jsonStart);
const parsed = JSON.parse(jsonData);

const messages = parsed.messages;
const channelId = parsed.channel_id;
const workspace = 'hellofresh'; // Your workspace name

// Filter messages with no replies or overlooked
const unrepliedMessages = messages.filter(msg => {
  // Skip system messages
  if (msg.text && (
    msg.text.includes('has joined the channel') ||
    msg.text.includes('has left the channel') ||
    msg.text.includes('Reminder:') ||
    msg.type !== 'message'
  )) {
    return false;
  }

  // Include if:
  // 1. No reply_count at all (standalone message)
  // 2. reply_count is 0
  // 3. reply_count is 1 or 2 (potentially overlooked)
  const replyCount = msg.reply_count || 0;
  return replyCount <= 2 && msg.thread_ts === msg.ts; // Only thread parents
});

// Generate output
let output = `Unreplied/Overlooked Threads in Channel\n`;
output += `=========================================\n`;
output += `Channel ID: ${channelId}\n`;
output += `Total messages checked: ${messages.length}\n`;
output += `Unreplied/Overlooked threads: ${unrepliedMessages.length}\n\n`;

unrepliedMessages.forEach((msg, idx) => {
  const timestamp = msg.ts.replace('.', '');
  const slackLink = `https://${workspace}.slack.com/archives/${channelId}/p${timestamp}`;
  const date = new Date(parseFloat(msg.ts) * 1000);
  const formattedDate = date.toLocaleString();

  output += `${idx + 1}. [${formattedDate}]\n`;
  output += `   Replies: ${msg.reply_count || 0}\n`;
  output += `   User: ${msg.user || msg.username || 'Unknown'}\n`;
  output += `   Text: ${msg.text.substring(0, 200)}${msg.text.length > 200 ? '...' : ''}\n`;
  output += `   Link: ${slackLink}\n\n`;
});

// Write to file
writeFileSync('unreplied-threads.txt', output);
console.log('Results saved to unreplied-threads.txt');
