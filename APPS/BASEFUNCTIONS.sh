#!/bin/bash

function git_setAllowedToCommitFlag {
	# Change into the script directory.
	cd $SCRIPT_PATH

	# File to create/re-date.
	file=allowedToCommit

	# "touch" the file.
	touch "$file"
}
function git_clearAllowedToCommitFlag {
	# Change into the script directory.
	cd $SCRIPT_PATH

	# File to delete.
	file=allowedToCommit

	# Delete the file.
	rm "$file"
}
function git_commit {
	# Change into the script directory.
	cd $SCRIPT_PATH

	# Ensure that the commit flag is set.
	file=allowedToCommit
	if [ -e "$file" ]; then
	    # echo "The allowedToCommit file does exist."
	    echo
	else
	    echo "The allowedToCommit file does not exist."
		exit 1;
	fi

	# Get the date string. (EXAMPLE: 20181129_142715)
	THEDATE=`date +%Y%m%d_%H%M%S`

	# Change into the app directory.
	cd $G_APPHOME_DEV

	# Update the lastCommitDate.txt file with $THEDATE.
	echo $THEDATE > lastCommitDate.txt
	git add lastCommitDate.txt

	# Create a file that contains a changed files list.
	echo "-------------------------"  > filesChanged_lastCommit.txt
	echo "------FILES CHANGED------" >> filesChanged_lastCommit.txt
	echo "-------------------------" >> filesChanged_lastCommit.txt
	git diff --name-only             >> filesChanged_lastCommit.txt
	echo "-------------------------" >> filesChanged_lastCommit.txt

	# Do the commit (use the nextGitCommit.txt file)
	# sudo su -c "git commit -F nextGitCommit.txt" -s /bin/sh ubuntu
	git commit -F $SCRIPT_PATH/nextGitCommit.txt

	# Store the previous exit code.
	retVal=$?

	if [ $retVal -eq 0 ]; then
		# Change into the script directory.
		cd $SCRIPT_PATH

		# Create the prevCommitMsgs directory (in case it is not already there.)
		mkdir -p prevCommitMsgs

		# Rename the commit message file and move it to the prevCommitMsgs directory.
		mv nextGitCommit.txt "prevCommitMsgs/nextGitCommit_backup_$THEDATE.txt"

		# Create the new blank commit message file.
		touch nextGitCommit.txt

		# Change into the app directory.
		cd $G_APPHOME_DEV

		# Update the full log.
		git log > $SCRIPT_PATH/fullgitlog.txt

		# Change into the script directory.
		cd $SCRIPT_PATH

		# Add the changed files list into the backup msg.
		echo "" >> "prevCommitMsgs/nextGitCommit_backup_$THEDATE.txt"
		cat filesChanged_lastCommit.txt >> "prevCommitMsgs/nextGitCommit_backup_$THEDATE.txt"

		# Remove the AllowedToCommitFlag file.
		git_clearAllowedToCommitFlag

	else
		echo
		echo ERROR WITH COMMIT
	fi

}

function git_add_all {
	# Change into the app directory.
	cd $G_APPHOME_DEV

	# Run the command.
	git add --all --verbose

	# Output the current branch name.
	echo
	echo "Current branch: $(git branch | grep \* | cut -d ' ' -f2)"
}
function git_pull {
	# Change into the app directory.
	cd $G_APPHOME_DEV

	# Run the command.
	git pull --verbose

	# Output the current branch name.
	echo
	echo "Current branch: $(git branch | grep \* | cut -d ' ' -f2)"
}
function git_status {
	# Change into the app directory.
	cd $G_APPHOME_DEV

	# Run the command.
	git status -u

	# Output the current branch name.
	echo
	echo "Current branch: $(git branch | grep \* | cut -d ' ' -f2)"

	# Output the current directory.
	echo
	echo "Current directory: `pwd`"
}
function git_log {
	# Change into the app directory.
	cd $G_APPHOME_DEV

	# Run the command.
	git log

	# Output the current branch name.
	echo
	echo "Current branch: $(git branch | grep \* | cut -d ' ' -f2)"
}
function git_config {
	# Change into the app directory.
	cd $G_APPHOME_DEV

	# Run the command.
	git config --local --list

	# Output the current branch name.
	echo
	echo "Current branch: $(git branch | grep \* | cut -d ' ' -f2)"
}

function STARTUPINFO {
	echo "(==============================================)"
	echo " G_APPNAME     :" $G_APPNAME
	# echo " BASE_PATH     :" $BASE_PATH
	# echo " API_PATH      :" $API_PATH
	# echo " APP PATH      :" $G_APPHOME_DEV
	# echo " CMD-ER APP    :" $SCRIPT_PATH
	echo "(==============================================)"
	echo " DIRECTORY     :" $DIRECTORY
	echo " COMMAND       :" $COMMAND
	# echo " RELATIVE CMD  :" $relcommand
	# echo " ABSOLUTE CMD  :" $fullcommand
	echo "(==============================================)"
	echo
}

# Base included functions.
BASECOMMANDS=(
	# Git commands.
	# "git_setAllowedToCommitFlag"
	# "git_clearAllowedToCommitFlag"
	# "git_commit"
	# "git_add_all"
	# "git_pull"
	"git_status" # TEST
	"git_log"
	"git_config"
)

# Display the start-up info.
STARTUPINFO

# Is this function available? If so then run the function.
for i in "${BASECOMMANDS[@]}"
do
	if [ "$i" == "$COMMAND" ] ; then
		# Run the command.
		$COMMAND

		# Exit with "0" to indicate a normal exit.
		exit 0
	fi
done
