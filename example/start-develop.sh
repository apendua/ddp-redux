#!/bin/bash
tmux new-session -d -n "example" -s example
tmux source-file .tmux.conf
tmux new-window -n "backend" -t example:1
tmux new-window -n "todo-web" -t example:2
tmux new-window -n "ddp-redux" -t example:3
tmux new-window -n "ddp-connector" -t example:4
tmux send-keys -t example:1 "cd backend" C-m
tmux send-keys -t example:1 "meteor npm i" C-m
tmux send-keys -t example:1 "meteor --port 4000" C-m
tmux send-keys -t example:2 "cd todo-web" C-m
tmux send-keys -t example:2 "npm install" C-m
tmux send-keys -t example:2 "npm run start" C-m
tmux send-keys -t example:3 "cd ../ddp-redux" C-m
tmux send-keys -t example:3 "npm install" C-m
tmux send-keys -t example:3 "npm run build-watch" C-m
tmux send-keys -t example:4 "cd ../ddp-connector" C-m
tmux send-keys -t example:4 "npm install" C-m
tmux send-keys -t example:4 "npm run build-watch" C-m
tmux attach-session -d
