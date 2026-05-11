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
  notice_on: string;
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

  shouldNotice(status: string): boolean {
    const raw = this.with.notice_on;
    if (raw === '') return true;
    const allowed = raw
      .split(',')
      .map(s => s.trim().toLowerCase())
      .filter(s => s !== '');
    if (allowed.length === 0) return true;
    return allowed.includes(status.toLowerCase());
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

    const fields: Array<Field | null> = [
      {
        title: 'repo',
        value: this.repositoryLink,
        short: false,
      },
      this.refField,
      {
        title: 'commit',
        value: this.commitLink,
        short: false,
      },
      this.compareField,
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
      this.pullRequestField,
      {
        title: 'workflow',
        value: this.workflowLink,
        short: false,
      },
      await this.failedStepsField(),
    ];

    return fields.filter((f): f is Field => f !== null);
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
    const branchMatch = ref.match(/^refs\/heads\/(.+)$/);
    if (branchMatch) {
      return { title: 'branch', value: branchMatch[1], short: false };
    }
    const tagMatch = ref.match(/^refs\/tags\/(.+)$/);
    if (tagMatch) {
      return { title: 'tag', value: tagMatch[1], short: false };
    }
    return { title: 'ref', value: ref, short: false };
  }

  private get compareField(): Field | null {
    const compare = (github.context.payload as { compare?: unknown }).compare;
    if (typeof compare !== 'string' || compare === '') return null;
    return { title: 'diff', value: `<${compare}|compare>`, short: false };
  }

  private get pullRequestField(): Field | null {
    const pr = github.context.payload.pull_request;
    if (!pr) return null;
    const number = pr.number;
    const title = (pr as { title?: string }).title ?? '';
    const url = (pr as { html_url?: string }).html_url ?? '';
    if (!url) return null;
    return {
      title: 'pull_request',
      value: `<${url}|#${number}> ${title}`,
      short: false,
    };
  }

  private async failedStepsField(): Promise<Field | null> {
    if (this.with.status.toLowerCase() !== 'failure') return null;
    if (this.octokit === undefined) return null;
    const { owner, repo } = github.context.repo;
    try {
      const { data } = await this.octokit.rest.actions.listJobsForWorkflowRun({
        owner,
        repo,
        run_id: parseInt(this.runId, 10),
      });
      const failed: string[] = [];
      for (const job of data.jobs) {
        if (job.conclusion !== 'failure') continue;
        const steps = job.steps ?? [];
        for (const step of steps) {
          if (step.conclusion === 'failure') {
            failed.push(`${job.name} > ${step.name}`);
          }
        }
      }
      if (failed.length === 0) return null;
      return {
        title: 'failed_steps',
        value: failed.map(s => `• ${s}`).join('\n'),
        short: false,
      };
    } catch (e) {
      core.debug(
        `failedStepsField error: ${e instanceof Error ? e.message : String(e)}`,
      );
      return null;
    }
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
