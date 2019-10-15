#!/bin/bash

# Save the directory argument.
DIRECTORY=$1
export DIRECTORY

# Save the command-line argument (command.)
COMMAND=$2
export COMMAND

# Make sure the command-line arguments have DIRECTORY and COMMAND.
if [ "$DIRECTORY" == "" ]; then echo "ABORT: Missing script argument. (DIRECTORY)"; exit 1; fi
if [ "$COMMAND"   == "" ]; then echo "ABORT: Missing script argument. (COMMAND)"  ; exit 1; fi

# Navigate to the folder that this script lives in.
BASE_PATH=$(dirname $(realpath -s $0))
API_PATH=$(cd "$BASE_PATH/../api"; pwd)
SCRIPT_PATH=$BASE_PATH/$DIRECTORY
export BASE_PATH
export API_PATH
export SCRIPT_PATH
cd $SCRIPT_PATH

# Determine the command used to call this script. (absolute and Command-Er2 relative paths.)
fullcommand="$BASE_PATH/${0##*/} ${@}"
export fullcommand
relcommand="APPS/${0##*/} ${@}"
export relcommand

# Load the base settings for this application.
source $SCRIPT_PATH/basesettings.sh
export G_APPNAME
export G_APPHOME_DEV

# Load the base functions included for all applications.
# If the specified command is found it will run and the the script will exit.
source $SCRIPT_PATH/../BASEFUNCTIONS.sh

# Functions specific to this application.
# If the specified command is found it will run and the the script will exit.
source $SCRIPT_PATH/app_commands.sh

# Getting here means the function was unknown. Exit with "1" to indicate a abnormal exit.
echo "ABORT: Directory or Command was invalid."
exit 1