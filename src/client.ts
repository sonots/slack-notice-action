// ref. https://github.com/actions/toolkit
import * as core from '@actions/core';
import * as github from '@actions/github';
import { IncomingWebhook, IncomingWebhookSendArguments } from '@slack/webhook';

export interface With {
  status: string;
  mention: string;
  text: string;
  text_on_success: string;
  text_on_fail: string;
  text_on_cancel: string;
  title: string;
  only_mention_fail: string;
  username: string;
  icon_emoji: string;
  icon_url: string;
  channel: string;
}

const groupMention = ['here', 'channel'];

export class Client {
  private webhook: IncomingWebhook;
  private octokit?: github.GitHub;
  private with: With;

  constructor(props: With, token?: string, webhookUrl?: string) {
    this.with = props;

    if (props.status !== 'custom') {
      if (token === undefined) {
        throw new Error('Specify secrets.GITHUB_TOKEN');
      }
      this.octokit = new github.GitHub(token);
    }

    if (webhookUrl === undefined) {
      throw new Error('Specify secrets.SLACK_WEBHOOK_URL');
    }
    this.webhook = new IncomingWebhook(webhookUrl);
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

  async send(payload: string | IncomingWebhookSendArguments) {
    core.debug(JSON.stringify(github.context, null, 2));
    await this.webhook.send(payload);
    core.debug('send message');
  }

  private async payloadTemplate() {
    const text = this.mentionText(this.with.mention);
    const { username, icon_emoji, icon_url, channel } = this.with;

    return {
      text,
      username,
      icon_emoji,
      icon_url,
      channel,
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
    const commit = await this.octokit.repos.getCommit({
      owner,
      repo,
      ref: sha,
    });
    const { author } = commit.data.commit;
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
        value: `${author.name}<${author.email}>`,
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
      const { data: pullRequest } = await this.octokit.pulls.get({
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
