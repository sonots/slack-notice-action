# E2E テスト手順書 (Claude / LLM agent 向け)

このドキュメントは LLM agent (例: Claude Code) が、本 Action の e2e
テストを実際の Slack ワークスペースに対して走らせるための手順書。
人間が手で実行することもできるが、文面は `gh` CLI と
`claude.ai_Slack` MCP サーバーが使える自動実行者を前提にしている。

英語版: [`e2e.md`](e2e.md)。

## 検証対象

[`E2E` ワークフロー](../.github/workflows/e2e.yml) が、テスト用 Slack
チャンネルに対して 2 つの送信モードで Action を実行する:

| Mode | Step 数 | カバー範囲 |
|---|---|---|
| `webhook` | 4 | `status` = success / failure / cancelled / custom payload |
| `bot_token` | 5 | success / failure / cancelled + `username` & `icon_emoji` 上書き + `icon_url` 上書き |

`mode=both` (デフォルト) で両ジョブを実行。

## 前提条件

リポジトリに以下の secrets が事前設定されていること。1 つでも欠けて
いれば作業を止め、ユーザーに
[`DEVELOPMENT.md → Prepare Slack credentials`](DEVELOPMENT.md#prepare-slack-credentials)
の手順を案内する:

- `SLACK_WEBHOOK_URL_FOR_INTEGRATION_TEST`
- `SLACK_BOT_TOKEN`
- `SLACK_TEST_CHANNEL`

`SLACK_BOT_TOKEN` の bot がプライベートチャンネルである
`SLACK_TEST_CHANNEL` のメンバーであること (パブリックチャンネルの
場合は `chat:write.public` スコープが付与されていれば未参加でも投稿可)。

加えて:

- `gh` がリポジトリに対して認証済み。
- `claude.ai_Slack` MCP サーバーがテストチャンネルのあるワークスペース
  に接続済み。

## 実行

```bash
RUN_MARKER="$(date +%s)-$RANDOM"
gh workflow run e2e.yml --ref <branch> -F mode=both -F run_marker="$RUN_MARKER"

# dispatch した run の完了を待つ
RUN_ID="$(gh run list --workflow=e2e.yml --limit 1 --json databaseId --jq '.[0].databaseId')"
gh run watch "$RUN_ID" --exit-status
```

`--ref` は Action の同梱 `dist/index.js` をどのブランチから取るかの
指定。リリース版を smoke test するなら `main`、マージ前の変更を
試すならその feature branch を指定する。

`--exit-status` は job が失敗していれば `gh run watch` を非ゼロで終了
させる。失敗した場合は `gh run view "$RUN_ID" --log-failed` でログを
取得して該当ステップをユーザーに報告する。

## 検証 (Slack MCP 経由)

1. **チャンネル ID を解決する。** `mcp__claude_ai_Slack__slack_search_channels`
   をチャンネル名 (先頭の `#` を除く) で呼び、ID を取得する。ユーザーが
   `SLACK_TEST_CHANNEL` を `C…` 形式で渡していれば省略可。
2. **直近メッセージを取得する。**
   `mcp__claude_ai_Slack__slack_read_channel` を解決済みチャンネルに
   対して呼ぶ。当該 run をカバーできる件数 (通常 20 件あれば十分。
   他トラフィックが多ければ増やす) を取得。
3. **マーカーでフィルタする。** トップレベルの `text` に
   `[e2e:<RUN_MARKER>]` を含むメッセージのみ残す。custom payload の
   メッセージはペイロード内の `text` にマーカーが入る。
4. **件数を確認する。**
   - `mode=both` → 9 件 (webhook 4 + bot_token 5)
   - `mode=webhook` → 4 件
   - `mode=bot_token` → 5 件
5. **メッセージ別アサーション** (マーカー以降の suffix で照合):

   | Suffix | Mode | 期待値 |
   |---|---|---|
   | `webhook-success` | webhook | `attachments[0].color` = `good` |
   | `webhook-failure` | webhook | `attachments[0].color` = `danger` |
   | `webhook-cancelled` | webhook | `attachments[0].color` = `warning` |
   | `webhook-custom` | webhook | `attachments[0].color` = `good`, `attachments[0].title` = `CI Result` |
   | `bot-success` | bot_token | `attachments[0].color` = `good` |
   | `bot-failure` | bot_token | `attachments[0].color` = `danger` |
   | `bot-cancelled` | bot_token | `attachments[0].color` = `warning` |
   | `bot-username-emoji` | bot_token | `username` = `e2e-bot (emoji)`、`bot_profile.icons.emoji` または `icons.emoji` に `:rocket:` が含まれる |
   | `bot-icon-url` | bot_token | `username` = `e2e-bot (url)`、`icons.image_*` または `bot_profile.icons.image_*` が Octocat の URL |

   Slack はアカウント/API バージョンによってアイコン情報を返す場所が
   異なる。`icons.emoji` / `icons.image_64` がメッセージ直下にある
   場合と `bot_profile.icons` 配下にある場合があり、どちらに存在しても
   合格とみなす。

## Pass / Fail

- **PASS** — `gh run watch` が 0 終了し、かつ全てのメッセージ別
  アサーションを満たす。run の URL と marker を添えて `PASS` を報告。
- **FAIL** — ワークフロー失敗、件数不一致、アサーション不一致の
  いずれか。欠落 suffix・color 不一致・上書き未反映などの具体的な
  ギャップを、run URL と該当メッセージ抜粋とあわせてユーザーに報告。

テストメッセージの削除・編集は行わない。

## トラブルシュート

- **マーカー一致が 0 件。** Action は投稿に成功しているがチャンネルが
  違う可能性。`SLACK_TEST_CHANNEL` と、webhook URL の宛先が
  `SLACK_BOT_TOKEN` と同じワークスペースを指しているか確認。
- **`bot_token` ジョブが `not_in_channel` で失敗。** Bot がチャンネル
  未参加。作業を止め、ユーザーに `/invite @<bot-name>` を依頼。
- **`bot_token` ジョブが `missing_scope` で失敗。** Slack App に
  必要スコープを追加して再インストールするようユーザーに依頼。
- **`webhook` ジョブが HTTP 404 で失敗。** Webhook URL が無効。
  再発行と secret 更新をユーザーに依頼して再実行。
