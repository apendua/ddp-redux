#!/bin/bash
(
  cd ../ddp-connector
  npm run build
)
(
  cd ../ddp-redux
  npm run build
)
tmux new-session -d -n "example" -s example
tmux source-file .tmux.conf
tmux new-window -n "backend" -t example:1
tmux new-window -n "todo-web" -t example:2
tmux send-keys -t example:1 "cd backend" C-m
tmux send-keys -t example:1 "meteor --port 4000" C-m
tmux send-keys -t example:2 "cd todo-web" C-m
tmux send-keys -t example:2 "npm run start" C-m
tmux attach-session -d
