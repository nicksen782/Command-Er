<?php

// Configure error reporting
$appName='COMMANDER2_daemon';
error_reporting(E_ALL & ~E_NOTICE & ~E_STRICT);
ini_set('error_log', getcwd() . '/'.$appName.'-error.txt');
ini_set("log_errors", 1);
ini_set("display_errors", 1);
ini_set('register_argc_argv', 1);
// set_time_limit(60);

// Configure timezone.
define('TIMEZONE', 'America/Detroit');
date_default_timezone_set(TIMEZONE);
chdir(__DIR__);

$inputFilename="cmd_runQueuedTasks_input.txt";

echo $appName . " started.\n";
while(true){
	if( file_exists ($inputFilename) ) {
		$inputFileData  = file_get_contents($inputFilename);
		if($inputFileData != ""){
			echo "Queued tasks found! Running the tasks...\n";
			$command = "" .
			"cd /home/nicksen782/workspace/web/ACTIVE/Command-Er2/api/ && " .
			"php -d register_argc_argv=1 /home/nicksen782/workspace/web/ACTIVE/Command-Er2/api/api_p.php cmd_runQueuedTasks viaphp"
			;
			$results = shell_exec($command);
			echo "   ...DONE\n";
			// print_r($results);
		}
		else{
			// echo "input NOT found!\n";
		}

		sleep(5);
	}
}
echo $appName . " ended.\n";

?>