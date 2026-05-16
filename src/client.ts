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
}

interface Field {
  title: string;
  value: string;
  short: boolean;
}

const groupMention = ['here', 'channel'];

type Octokit = ReturnType<typeof github.getOctokit>;

export class Client {
  private webhook: IncomingWebhook;
  private octokit?: Octokit;
  private with: With;

  constructor(props: With, token?: string, webhookUrl?: string) {
    this.with = props;

    if (props.status !== 'custom') {
      if (token === undefined) {
        throw new Error('Specify secrets.GITHUB_TOKEN');
      }
      this.octokit = github.getOctokit(token);
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

  private async fields(): Promise<Field[]> {
    const fields: Field[] = [
      {
        title: 'repo',
        value: this.repositoryLink,
        short: false,
      },
    ];

    const prFields = this.pullRequestFields;
    if (prFields) {
      fields.push(...prFields);
    } else {
      fields.push(...(await this.commitFields()));
    }

    fields.push({
      title: 'workflow',
      value: this.workflowLink,
      short: false,
    });

    return fields;
  }

  private get pullRequestFields(): Field[] | null {
    const pr = github.context.payload.pull_request as
      | {
          html_url?: string;
          title?: string;
          body?: string | null;
          user?: { login?: string; html_url?: string };
        }
      | undefined;
    if (!pr) return null;
    const url = pr.html_url;
    const title = pr.title;
    if (!url || !title) return null;

    const login = pr.user?.login;
    const userUrl = pr.user?.html_url;
    let authorValue = 'unknown';
    if (login) {
      authorValue = userUrl ? `<${userUrl}|${login}>` : login;
    }

    return [
      {
        title: 'pull_request',
        value: `<${url}|${title}>`,
        short: false,
      },
      {
        title: 'author',
        value: authorValue,
        short: false,
      },
      {
        title: 'message',
        value: pr.body ?? '',
        short: false,
      },
    ];
  }

  private async commitFields(): Promise<Field[]> {
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
      this.refField,
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

  private get refField(): Field {
    const ref = github.context.ref;
    const { owner, repo } = github.context.repo;
    const branchMatch = ref.match(/^refs\/heads\/(.+)$/);
    if (branchMatch) {
      const name = branchMatch[1];
      const link = `<https://github.com/${owner}/${repo}/tree/${name}|branch>`;
      return { title: 'ref', value: `${ref} ${link}`, short: false };
    }
    const tagMatch = ref.match(/^refs\/tags\/(.+)$/);
    if (tagMatch) {
      const name = tagMatch[1];
      const link = `<https://github.com/${owner}/${repo}/tree/${name}|tag>`;
      return { title: 'ref', value: `${ref} ${link}`, short: false };
    }
    return { title: 'ref', value: ref, short: false };
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
