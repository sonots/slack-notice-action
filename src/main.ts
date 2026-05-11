import * as core from '@actions/core';
import { Client } from './client.js';
import { IncomingWebhookSendArguments } from '@slack/webhook';

async function run(): Promise<void> {
  try {
    let status: string = core.getInput('status', { required: true });
    status = status.toLowerCase();
    const mention = core.getInput('mention');
    const title = core.getInput('title');
    const only_mention_fail = core.getInput('only_mention_fail');
    const text = core.getInput('text');
    const text_on_success = core.getInput('text_on_success');
    const text_on_fail = core.getInput('text_on_fail');
    const text_on_cancel = core.getInput('text_on_cancel');
    const channel = core.getInput('channel');
    const username = core.getInput('username');
    const icon_emoji = core.getInput('icon_emoji');
    const icon_url = core.getInput('icon_url');
    const update_ts = core.getInput('update_ts');
    const rawPayload = core.getInput('payload');

    core.debug(`status: ${status}`);
    core.debug(`mention: ${mention}`);
    core.debug(`title: ${title}`);
    core.debug(`only_mention_fail: ${only_mention_fail}`);
    core.debug(`text: ${text}`);
    core.debug(`text_on_success: ${text_on_success}`);
    core.debug(`text_on_fail: ${text_on_fail}`);
    core.debug(`text_on_cancel: ${text_on_cancel}`);
    core.debug(`channel: ${channel}`);
    core.debug(`username: ${username}`);
    core.debug(`icon_emoji: ${icon_emoji}`);
    core.debug(`icon_url: ${icon_url}`);
    core.debug(`update_ts: ${update_ts}`);
    core.debug(`rawPayload: ${rawPayload}`);

    const client = new Client(
      {
        status,
        mention,
        text,
        text_on_success,
        text_on_fail,
        text_on_cancel,
        title,
        only_mention_fail,
        channel,
        username,
        icon_emoji,
        icon_url,
        update_ts,
      },
      process.env.GITHUB_TOKEN,
      process.env.SLACK_WEBHOOK_URL,
      process.env.SLACK_BOT_TOKEN,
    );

    let ts = '';
    switch (status) {
      case 'success':
        ts = await client.send(await client.success());
        break;
      case 'failure':
        ts = await client.send(await client.fail());
        break;
      case 'cancelled':
        ts = await client.send(await client.cancel());
        break;
      case 'custom':
        /* eslint-disable no-var */
        var payload: IncomingWebhookSendArguments = eval(
          `payload = ${rawPayload}`,
        );
        /* eslint-enable */
        ts = await client.send(payload);
        break;
      default:
        throw new Error(
          'You can specify success or failure or cancelled or custom',
        );
    }

    core.setOutput('ts', ts);
  } catch (error) {
    core.setFailed(error instanceof Error ? error.message : String(error));
  }
}

run();
