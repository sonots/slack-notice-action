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
    const rawPayload = core.getInput('payload');

    core.debug(`status: ${status}`);
    core.debug(`mention: ${mention}`);
    core.debug(`title: ${title}`);
    core.debug(`only_mention_fail: ${only_mention_fail}`);
    core.debug(`text: ${text}`);
    core.debug(`text_on_success: ${text_on_success}`);
    core.debug(`text_on_fail: ${text_on_fail}`);
    core.debug(`text_on_cancel: ${text_on_cancel}`);
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
      },
      process.env.GITHUB_TOKEN,
      process.env.SLACK_WEBHOOK_URL,
    );

    switch (status) {
      case 'success':
        await client.send(await client.success());
        break;
      case 'failure':
        await client.send(await client.fail());
        break;
      case 'cancelled':
        await client.send(await client.cancel());
        break;
      case 'custom':
        /* eslint-disable no-var */
        var payload: IncomingWebhookSendArguments = eval(
          `payload = ${rawPayload}`,
        );
        /* eslint-enable */
        await client.send(payload);
        break;
      default:
        throw new Error(
          'You can specify success or failure or cancelled or custom',
        );
    }
  } catch (error) {
    core.setFailed(error instanceof Error ? error.message : String(error));
  }
}

run();
