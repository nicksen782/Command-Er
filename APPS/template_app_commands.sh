#!/bin/bash

# Instructions:
#  Add function (follow the template.)
#  Add function name to the APPCOMMANDS array.

function TEMPLATEFUNCTION1 {
	echo "TEMPLATEFUNCTION1"
}
function TEMPLATEFUNCTION2 {
	echo "TEMPLATEFUNCTION2"
}

# App functions list.
APPCOMMANDS=(
	"TEMPLATEFUNCTION1"
	"TEMPLATEFUNCTION2"
)

# Is this function available? If so then run the function.
for i in "${APPCOMMANDS[@]}"
do
	if [ "$i" == "$COMMAND" ] ; then
		# Run the command.
		$COMMAND

		# Exit with "0" to indicate a normal exit.
		exit 0
	fi
done