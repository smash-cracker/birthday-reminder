#!/bin/bash
# Load NVM
export NVM_DIR="$HOME/.nvm"
source "$NVM_DIR/nvm.sh"

# Use the correct Node version (optional)
nvm use 22

# Start your server
node /home/birthday/Documents/birthday_remind/server/server.js
