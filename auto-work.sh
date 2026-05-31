#!/bin/bash
# plays auto-work: ce 讀取 mx standup 任務並實施
# 由 cron 在 mx standup 後觸發

set -e

export HOME=/Users/mileslor
CHANNEL="/Users/mileslor/workspace/agents/channel.md"
PLAYS_DIR="/Users/mileslor/workspace/plays"
LOG="/Users/mileslor/workspace/plays/auto-work.log"

echo "[$(date '+%Y-%m-%d %H:%M')] plays auto-work 開始" >> "$LOG"

export PATH="$HOME/.nvm/versions/node/$(ls $HOME/.nvm/versions/node/ 2>/dev/null | tail -1)/bin:/usr/local/bin:/opt/homebrew/bin:$PATH"

cd "$PLAYS_DIR"

cat <<'PROMPT' | claude -p \
  --dangerously-skip-permissions \
  --add-dir "/Users/mileslor/workspace/plays" \
  --add-dir "/Users/mileslor/workspace/agents" \
  2>&1 | tee -a "$LOG"
你係 ce（Claude Code），Milestone Technology AI 員工。

**任務：實施今日 plays 項目改善**

步驟：
1. 讀 /Users/mileslor/workspace/agents/channel.md 最後 60 行
2. 搵最新嘅 🎮 plays standup 任務（由 mx 寫入）
3. 如有任務：喺 /Users/mileslor/workspace/plays/ 實施，npm run build 確認，git commit && push
4. 如無 standup：主動揀一個 plays 小改善做（參考 src/pages/ 有咩可以優化）
5. Append 落 channel.md：[ce YYYY-MM-DD HH:mm]: ✅ plays 完成：[任務] (plays-auto)

原則：
- build 確認無錯先 commit
- commit message 用廣東話
- 只做一件
PROMPT

echo "[$(date '+%Y-%m-%d %H:%M')] plays auto-work 完成" >> "$LOG"
