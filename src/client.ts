// ref. https://github.com/actions/toolkit
import * as core from '@actions/core';
import * as github from '@actions/github';
import { IncomingWebhook, IncomingWebhookSendArguments } from '@slack/webhook';
import { WebClient } from '@slack/web-api';

export interface With {
  status: string;
  mention: string;
  text: string;
  text_on_success: string;
  text_on_fail: string;
  text_on_cancel: string;
  title: string;
  only_mention_fail: string;
  channel: string;
  username: string;
  icon_emoji: string;
  icon_url: string;
  update_ts: string;
}

const groupMention = ['here', 'channel'];

type Octokit = ReturnType<typeof github.getOctokit>;
type Mode = 'bot_token' | 'webhook';

export class Client {
  private webhook?: IncomingWebhook;
  private web?: WebClient;
  private mode: Mode;
  private octokit?: Octokit;
  private with: With;

  constructor(
    props: With,
    githubToken?: string,
    webhookUrl?: string,
    botToken?: string,
  ) {
    this.with = props;

    if (props.status !== 'custom') {
      if (githubToken === undefined) {
        throw new Error('Specify secrets.GITHUB_TOKEN');
      }
      this.octokit = github.getOctokit(githubToken);
    }

    if (botToken) {
      if (props.channel === '') {
        throw new Error(
          'When using SLACK_BOT_TOKEN, `channel` input is required.',
        );
      }
      this.web = new WebClient(botToken);
      this.mode = 'bot_token';
    } else if (webhookUrl) {
      if (props.update_ts !== '') {
        core.warning(
          '`update_ts` is ignored in Webhook mode (requires SLACK_BOT_TOKEN).',
        );
      }
      if (
        props.username !== '' ||
        props.icon_emoji !== '' ||
        props.icon_url !== ''
      ) {
        core.warning(
          'Modern Slack App Webhooks ignore `username` / `icon_emoji` / `icon_url`. Use SLACK_BOT_TOKEN to override.',
        );
      }
      this.webhook = new IncomingWebhook(webhookUrl);
      this.mode = 'webhook';
    } else {
      throw new Error('Specify SLACK_BOT_TOKEN or SLACK_WEBHOOK_URL');
    }
  }

  async success() {
    const template = await this.payloadTemplate();
    template.attachments[0].color = 'good';
    template.text += this.textSuccess;

    return template;
  }

  async fail() {
    const template = await this.payloadTemplate();
    template.attachments[0].color = 'danger';
    template.text += this.mentionText(this.with.only_mention_fail);
    template.text += this.textFail;

    return template;
  }

  async cancel() {
    const template = await this.payloadTemplate();
    template.attachments[0].color = 'warning';
    template.text += this.textCancel;

    return template;
  }

  async send(payload: string | IncomingWebhookSendArguments): Promise<string> {
    core.debug(JSON.stringify(github.context, null, 2));
    if (this.mode === 'bot_token') {
      return this.sendViaBotToken(payload);
    }
    if (this.webhook === undefined) {
      throw new Error('Webhook client is not initialized');
    }
    await this.webhook.send(payload);
    core.debug('send message');
    return '';
  }

  private async sendViaBotToken(
    payload: string | IncomingWebhookSendArguments,
  ): Promise<string> {
    if (this.web === undefined) {
      throw new Error('WebClient is not initialized');
    }
    const body =
      typeof payload === 'string' ? { text: payload } : { ...payload };
    const channel = this.with.channel;

    const args: Record<string, unknown> = { channel, text: body.text ?? '' };
    if (body.attachments) args.attachments = body.attachments;
    if (body.blocks) args.blocks = body.blocks;

    if (this.with.update_ts !== '') {
      args.ts = this.with.update_ts;
      const res = await this.web.chat.update(
        args as unknown as Parameters<WebClient['chat']['update']>[0],
      );
      core.debug('update message');
      return (res.ts as string) ?? '';
    }

    if (this.with.username) args.username = this.with.username;
    if (this.with.icon_emoji) args.icon_emoji = this.with.icon_emoji;
    if (this.with.icon_url) args.icon_url = this.with.icon_url;

    const res = await this.web.chat.postMessage(
      args as unknown as Parameters<WebClient['chat']['postMessage']>[0],
    );
    core.debug('send message');
    return (res.ts as string) ?? '';
  }

  private async payloadTemplate() {
    const text = this.mentionText(this.with.mention);

    return {
      text,
      attachments: [
        {
          color: '',
          title: this.title,
          fields: await this.fields(),
        },
      ],
    };
  }

  private async fields() {
    if (this.octokit === undefined) {
      throw Error('Specify secrets.GITHUB_TOKEN');
    }
    const { sha } = github.context;
    const { owner, repo } = github.context.repo;
    const commit = await this.octokit.rest.repos.getCommit({
      owner,
      repo,
      ref: sha,
    });
    const { author } = commit.data.commit;
    const authorValue = author ? `${author.name}<${author.email}>` : 'unknown';
    const message = await this.message(commit.data.commit.message);

    return [
      {
        title: 'repo',
        value: this.repositoryLink,
        short: false,
      },
      {
        title: 'ref',
        value: github.context.ref,
        short: false,
      },
      {
        title: 'commit',
        value: this.commitLink,
        short: false,
      },
      {
        title: 'author',
        value: authorValue,
        short: false,
      },
      {
        title: 'message',
        value: message,
        short: false,
      },
      {
        title: 'workflow',
        value: this.workflowLink,
        short: false,
      },
    ];
  }

  private get textSuccess() {
    if (this.with.text_on_success !== '') {
      return this.with.text_on_success;
    }
    if (this.with.text !== '') {
      return this.with.text;
    }
    return 'A GitHub Action has succeeded';
  }

  private get textFail() {
    if (this.with.text_on_fail !== '') {
      return this.with.text_on_fail;
    }
    if (this.with.text !== '') {
      return this.with.text;
    }
    return 'A GitHub Action has failed';
  }

  private get textCancel() {
    if (this.with.text_on_cancel !== '') {
      return this.with.text_on_cancel;
    }
    if (this.with.text !== '') {
      return this.with.text;
    }
    return 'A GitHub Action has been cancelled';
  }

  private get title() {
    if (this.with.title !== '') {
      return this.with.title;
    }
    return github.context.workflow;
  }

  private get commitLink() {
    const { sha } = github.context;
    const { owner, repo } = github.context.repo;

    return `<https://github.com/${owner}/${repo}/commit/${sha}|${sha}>`;
  }

  private get repositoryLink() {
    const { owner, repo } = github.context.repo;

    return `<https://github.com/${owner}/${repo}|${owner}/${repo}>`;
  }

  private async message(message: string) {
    if (this.octokit === undefined) {
      throw Error('Specify secrets.GITHUB_TOKEN');
    }
    const { owner, repo } = github.context.repo;

    const m = message.match(/Merge pull request #(\d+)/);
    if (m) {
      const pullNumber = parseInt(m[1]);
      const { data: pullRequest } = await this.octokit.rest.pulls.get({
        owner,
        repo,
        pull_number: pullNumber,
      });
      return `${message}\n${pullRequest.body}`;
    }
    return message;
  }

  private get runId() {
    // ref. https://help.github.com/en/actions/configuring-and-managing-workflows/using-environment-variables#default-environment-variables
    // https://github.com/actions/toolkit/blob/3e40dd39cc56303a2451f5b175068dbefdc11c18/packages/github/src/context.ts does not support run_id yet.
    return process.env.GITHUB_RUN_ID as string;
  }

  private get workflowLink() {
    const { owner, repo } = github.context.repo;

    return `<https://github.com/${owner}/${repo}/actions/runs/${this.runId}|${github.context.workflow}>`;
  }

  private mentionText(mention: string) {
    const normalized = mention.replace(/ /g, '');
    if (groupMention.includes(normalized)) {
      return `<!${normalized}> `;
    } else if (normalized !== '') {
      const text = normalized
        .split(',')
        .map(userId => `<@${userId}>`)
        .join(' ');
      return `${text} `;
    }
    return '';
  }
}
