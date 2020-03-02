<?php
// All requests to the server should go through this file.

// This is the only place this flag is set. It is checked everywhere else insuring that all processes start here.
$securityLoadedFrom_indexp = true;

// EXAMPLE USAGES VIA SSH:
// VIA SSH/PHP COMMAND: ssh SERVERNAME php -d register_argc_argv=1 /home/nicksen782/workspace/web/ACTIVE/Command-Er2/api/api_p.php cmd_run1AppCommand 1 25 viaphp
// VIA SSH/PHP COMMAND: ssh SERVERNAME php -d register_argc_argv=1 /home/nicksen782/workspace/web/ACTIVE/Command-Er2/api/api_p.php cmd_main_menu viaphp
// VIA SSH/PHP COMMAND: ssh SERVERNAME php -d register_argc_argv=1 /home/nicksen782/workspace/web/ACTIVE/Command-Er2/api/api_p.php cmd_runQueuedTasks viaphp

// EXAMPLE USAGES VIA COMMAND-LINE:
// VIA     PHP COMMAND: php -d register_argc_argv=1 /home/nicksen782/workspace/web/ACTIVE/Command-Er2/api/api_p.php cmd_run1AppCommand 1 25 viaphp
// VIA     PHP COMMAND: php -d register_argc_argv=1 /home/nicksen782/workspace/web/ACTIVE/Command-Er2/api/api_p.php cmd_main_menu viaphp
// VIA     PHP COMMAND: php -d register_argc_argv=1 /home/nicksen782/workspace/web/ACTIVE/Command-Er2/api/api_p.php cmd_runQueuedTasks viaphp

// Configure error reporting
$appName='COMMANDER2';
error_reporting(E_ALL & ~E_NOTICE & ~E_STRICT);
ini_set('error_log', getcwd() . '/'.$appName.'-error.txt');
ini_set("log_errors", 1);
ini_set("display_errors", 1);
ini_set('register_argc_argv', 1);
set_time_limit(60);

// Configure timezone.
define('TIMEZONE', 'America/Detroit');
date_default_timezone_set(TIMEZONE);

chdir(__DIR__);
$_appdir        = getcwd().''              ;
$_db_file       = $_appdir."/commander2.db" ;
$viacommandline = false;

// Was the program called via the command line and with arguments?
if( isset($argv) ) { $viacommandline = true; }

$dev=false;
if      ( strpos($_SERVER['SERVER_NAME'], "dev2.nicksen782.net" ) !== false ) { $dev=true; }
else if ( $viacommandline==true                                             ) { $dev=true; }

if(!$dev){ exit('This application should only run from dev.'); }

if( ! file_exists( $_db_file )){ createInitialDatabase(); }

// Was a request received? Process it.
if     ( $_POST['o'] ){ API_REQUEST( $_POST['o'], 'post' ); }
else if( $_GET ['o'] ){ API_REQUEST( $_GET ['o'], 'get'  ); }
else if($viacommandline){
	// List of allowed functions via the php script method.
	$whitelistedFunctions=[
		"cmd_runQueuedTasks" ,
		"cmd_main_menu" ,
		"cmd_run1AppCommand" ,
	];

	if( in_array($argv[1], $whitelistedFunctions) && in_array("viaphp", $argv) ){
		// Identify the program.
		echo "\n";
		echo "**********************\n";
		echo "COMMAND-ER 2 (via PHP)\n";
		echo "**********************\n";
		echo "\n";

		// Greet the user.
		echo "Hello, " . shell_exec("whoami");
		echo "\n";

		// Adjust the output based on what function was called.
		switch($argv[1]){
			case "cmd_runQueuedTasks" : {
				cmd_runQueuedTasks();
				break;
			}
			case "cmd_main_menu" : {
				// Get the apps list.
				ob_end_clean ();
				ob_start();
				API_REQUEST( "getAppsList", 'cmd' );
				$output1 = ob_get_contents();
				$decoded_output1 = json_decode( $output1, true);
				$data=$decoded_output1['data'];
				ob_end_clean ();

				// Display the choices.
				$appids=[];
				ob_start();
				echo "ENTER THE ID FOR THE APP.\n";
				for($i=0; $i<sizeof($data); $i+=1){
					$appid    = str_pad($data[$i]['appid']   , 4 , " ", STR_PAD_RIGHT) ;
					$appname  = str_pad($data[$i]['appname'] , 25, " ", STR_PAD_RIGHT) ;
					$appspath = str_pad($data[$i]['appspath'], 0 , " ", STR_PAD_RIGHT) ;

					$appids[$i]=intval(trim($data[$i]['appid']));;

					echo "  " . $appid    . "> " ;
					echo ""   . $appname         ;
					echo " ( CMD-ER PATH: " . $appspath . " )";
					echo "\n";
				}
				ob_end_flush();

				// Ask the user to choose an app.
				$fp = fopen('php://stdin', 'r');
				$appid = fgets($fp);
				fclose($fp);
				$appid=intval(trim($appid));

				// Make sure the provided appid is valid. (Exit if invalid.)
				if( ! in_array($appid, $appids) ){
					echo "INVALID CHOICE. ABORTING.";
					exit("\n");
				}

				// Use the app id to get a list of commands.
				ob_end_clean ();
				ob_start();
				$_POST['appid'] = $appid;
				API_REQUEST( "getAppData", 'cmd' );
				$output1 = ob_get_contents();
				$decoded_output1 = json_decode( $output1, true);
				$data=$decoded_output1['data'];
				ob_end_clean ();

				// Display those commands.
				$cmdids=[];
				ob_start();
				echo "\n";
				echo "ENTER THE ID FOR THE COMMAND.\n";
				for($i=0; $i<sizeof($data); $i+=1){
					$commandId = str_pad($data[$i]['commandId'] , 4 , " ", STR_PAD_RIGHT) ;
					$label     = str_pad($data[$i]['label']     , 25, " ", STR_PAD_RIGHT) ;
					$lastuse   = str_pad($data[$i]['lastuse']   , 0 , " ", STR_PAD_RIGHT) ;

					$cmdids[$i]=intval(trim($data[$i]['commandId']));;

					echo "  "  . $commandId . "> " ;
					echo ""    . $label            ;
					echo " ( LASTUSE: " . $lastuse   . " )" ;
					echo "\n";
				}
				ob_end_flush();

				// Ask the user to choose a command.
				$fp = fopen('php://stdin', 'r');
				$cmdid = fgets($fp);
				fclose($fp);
				$cmdid=intval(trim($cmdid));

				// Make sure the provided appid is valid. (Exit if invalid.)
				if( ! in_array($cmdid, $cmdids) ){
					echo "INVALID CHOICE. ABORTING.";
					exit("\n");
				}

				// Show notice about the appearance of a hung script.
				ob_start();
				echo "\n";
				echo "***********************************************************************\n";
				echo " PLEASE NOTE: If the command takes a long time this script will APPEAR\n";
				echo " to hang but it is just waiting for the command to finish.\n";
				echo "***********************************************************************\n";
				echo "\n";
				ob_end_flush();

				// Run that command.
				ob_start();
				$_POST['appid'    ] = $appid;
				$_POST['commandid'] = $cmdid;
				API_REQUEST( "runCommand", 'cmd' );
				$output1 = ob_get_contents();
				$decoded_output1 = json_decode( $output1, true);
				$data=$decoded_output1['output'];
				ob_end_clean ();

				// Echo out the result of the command.
				ob_start();
				echo $data;
				echo "\n";
				ob_end_flush();
				exit();

				break;
			}
			case "cmd_run1AppCommand" : {
				$appid = intval(trim($argv[2])) ;
				$cmdid = intval(trim($argv[3])) ;

				cmd_run1AppCommand($appid, $cmdid);

				break;
			}
			default:{break;}
		}

		// Clear the output buffer. (It will not be used here.
		ob_end_clean ();

		// Output the response.
		//

	}
	// No? Then this is an error.
	else{
		$stats['error_text']="*** No 'o' POST value was provided.";
		$stats['$_POST'] = $_POST;
		$stats['$_GET']  = $_GET;

		// Return the error data.
		echo json_encode( [
			'stats'  => $stats ,
			'$argv'  => $argv  ,
			'$_POST' => $_POST ,
			'$_GET'  => $_GET  ,
		]);

	}

	exit();

}

// API REQUEST HANDLER

function API_REQUEST( $api, $type ){
	$stats = array(
		'error'      => false ,
		'error_text' => ""    ,
	);

	// Rights.
	$public      = 1 ; // No rights required.

	$o_values=array();

	// APIs
	$o_values["getAppsList"]          = [ "p"=>( ( $public ) ? 1 : 0 ), 'get'=>0, 'post'=>1, 'cmd'=>1,] ;
	$o_values["getAppData"]           = [ "p"=>( ( $public ) ? 1 : 0 ), 'get'=>0, 'post'=>1, 'cmd'=>1,] ;
	$o_values["runCommand"]           = [ "p"=>( ( $public ) ? 1 : 0 ), 'get'=>0, 'post'=>1, 'cmd'=>1,] ;
	$o_values["runCommand_base"]      = [ "p"=>( ( $public ) ? 1 : 0 ), 'get'=>0, 'post'=>1, 'cmd'=>0,] ;
	// $o_values["runCommand_viaphp"]    = [ "p"=>( ( $public ) ? 1 : 0 ), 'get'=>0, 'post'=>1, 'cmd'=>0,] ;
	$o_values["command_delete"]       = [ "p"=>( ( $public ) ? 1 : 0 ), 'get'=>0, 'post'=>1, 'cmd'=>0,] ;
	$o_values["command_edit"]         = [ "p"=>( ( $public ) ? 1 : 0 ), 'get'=>0, 'post'=>1, 'cmd'=>0,] ;
	$o_values["command_new"]          = [ "p"=>( ( $public ) ? 1 : 0 ), 'get'=>0, 'post'=>1, 'cmd'=>0,] ;
	$o_values["app_delete"]           = [ "p"=>( ( $public ) ? 1 : 0 ), 'get'=>0, 'post'=>1, 'cmd'=>0,] ;
	$o_values["app_edit"]             = [ "p"=>( ( $public ) ? 1 : 0 ), 'get'=>0, 'post'=>1, 'cmd'=>0,] ;
	$o_values["app_new"]              = [ "p"=>( ( $public ) ? 1 : 0 ), 'get'=>0, 'post'=>1, 'cmd'=>0,] ;
	$o_values["massReorder_apps"]     = [ "p"=>( ( $public ) ? 1 : 0 ), 'get'=>0, 'post'=>1, 'cmd'=>0,] ;
	$o_values["massReorder_commands"] = [ "p"=>( ( $public ) ? 1 : 0 ), 'get'=>0, 'post'=>1, 'cmd'=>0,] ;

	$o_values["queue_task"]             = [ "p"=>( ( $public ) ? 1 : 0 ), 'get'=>0, 'post'=>1, 'cmd'=>0,] ;

	$o_values["STATUSDAEMON"]             = [ "p"=>( ( $public ) ? 1 : 0 ), 'get'=>0, 'post'=>1, 'cmd'=>0,] ;
	$o_values["getLastQueuedResults"] = [ "p"=>( ( $public ) ? 1 : 0 ), 'get'=>0, 'post'=>1, 'cmd'=>0,] ;

	// DETERMINE IF THE API IS AVAILABLE TO THE USER.

	// Is this a known API?
	if( ! isset( $o_values[ $api] ) ){
		$stats['error']=true;
		$stats['error_text']="Unhandled API";
	}

	// Is the API allowed to be called this way?
	else if( ! $o_values[ $api ][ $type ] ){
		$stats['error']=true;
		$stats['error_text']="Invalid access type";
	}

	// Does the user have sufficient permissions?
	else if( ! $o_values[ $api ]['p'] ){
		$stats['error']=true;
		$stats['error_text']="API auth error";
	}

	// Can the function be run?
	if(! $stats['error']){
		// GOOD! Allow the API call.
		call_user_func_array( $api, array() );
	}

	// Was there an error?
	else{
		echo json_encode( $stats );
		exit();
	}

}

// TASK QUEUE

function getLastQueuedResults()    {
	$outputFilename="cmd_runQueuedTasks_output.txt";
	if( file_exists ($outputFilename) ) {
		$outputFileData=file_get_contents($outputFilename);
	}
	else{
		$outputFileData="FILE DOES NOT EXIST.";
	}

	echo json_encode(array(
		'data'         => $outputFileData ,
		'success'      => true   ,
	) );
}
function STATUSDAEMON()            {
	$data = trim( shell_exec( ' pgrep -fxc "php -d register_argc_argv=1 cmdr2_daemon.php" ' ) );

	echo json_encode(array(
		'data'         => $data   ,
		'success'      => true   ,
	) );
}
function cmd_runQueuedTasks()      {
	global $_appdir;

	$inputFilename="cmd_runQueuedTasks_input.txt";
	$outputFilename="cmd_runQueuedTasks_output.txt";

	// Create the files if they do not exist yet.
	if( ! file_exists ($inputFilename) ) {
		$oldmask = umask(0);
		$dest    = $inputFile ;
		chmod($dest, 0666);
		file_put_contents($inputFilename, "");
		umask($oldmask);
	}
	if( ! file_exists ($outputFilename) ) {
		$oldmask = umask(0);
		$dest    = $outputFile ;
		chmod($dest, 0666);
		file_put_contents($outputFilename, "");
		umask($oldmask);
	}

	// Get the input file.
	$inputFileData  = file_get_contents($inputFilename);

	// Parse the input file explode on "\n" to get the individual tasks.
	$pre_tasks = preg_split ('/\n/', $inputFileData);

	// Clean up the input.
	$tasks = [];
	for($i=0; $i<sizeof($pre_tasks); $i+=1){
		// Get this task line.
		$task = $pre_tasks[$i];
		$task = trim($task);
		if($task != ""){ array_push($tasks, $task); }
	}

	// Are there inputs?
	if( sizeof($tasks) ){
		// Clear the tasks file. (Just in case a task takes longer than a minute.)
		file_put_contents($inputFilename , "");

		//
		$startDatetime = "SCHEDULED TASKS STARTED : " . date("Y-m-d H:i:s") . "\n" ;

		// Perform the tasks.
		for($i=0; $i<sizeof($tasks); $i+=1){
			// Get this task line.
			$task = $tasks[$i];

			// Break up the line and separate into appid and cmdid.
			$task_parts = explode(" ", $task);
			$appid = $task_parts[0];
			$cmdid = $task_parts[1];

			// Confirm this command is valid. Receive some extra data.
			$data = isAppidAndCommandid_Valid($appid, $cmdid);

			// Only run the command if the validation check passes.
			if( $data['success'] ){
				// Run the command and receive the result.
				$cmd_start = date("Y-m-d H:i:s");
				$cmdOutput = cmd_run1AppCommand( $appid, $cmdid );
				$cmd_end   = date("Y-m-d H:i:s");

				// Create the output entry.
				$outputText .=
				"********************************************************************************\n" .
				"********************************************************************************\n" .
				"TASK #    : " . $i               . "\n" .
				"appname   : " . $data['appname'] . "\n" .
				"label     : " . $data['label']   . "\n" .
				"cmd_start : " . $cmd_start       . "\n" .
				"cmd_end   : " . $cmd_end         . "\n" .
				"appid     : " . $appid           . "\n" .
				"cmdid     : " . $cmdid           . "\n" .
				"********************************************************************************\n" .
				$cmdOutput .
				"\n" .
				"********************************************************************************\n" .
				"********************************************************************************\n" .
				"\n" . ""
				;
			}
		}

		//
		$endDatetime .= "SCHEDULED TASKS FINISHED: " . date("Y-m-d H:i:s") . "\n" ;


		$outputText = $startDatetime . $endDatetime . $outputText . "\n\n";

		// Write the output.
		file_put_contents($outputFilename, $outputText);
	}
	// No input? Nothing to do.
	else{
		echo "No tasks.";
		// echo "<pre>"; print_r($pre_tasks); echo "</pre>";
		// echo "<pre>"; print_r($tasks);     echo "</pre>";
		echo "\n";
	}
}
function queue_task()              {
	$appid = $_POST['appid'    ] ;
	$cmdid = $_POST['commandid'] ;

	global $_appdir;

	$success=false;

	$inputFilename="cmd_runQueuedTasks_input.txt";
	$outputFilename="cmd_runQueuedTasks_output.txt";

	// Create the files if they do not exist yet.
	if( ! file_exists ($inputFilename) ) {
		$oldmask = umask(0);
		$dest    = $inputFilename ;
		chmod($dest, 0666);
		file_put_contents($inputFilename, "");
		umask($oldmask);
	}
	if( ! file_exists ($outputFilename) ) {
		$oldmask = umask(0);
		$dest    = $outputFilename ;
		chmod($dest, 0666);
		file_put_contents($outputFilename, "");
		umask($oldmask);
	}

	// Confirm this command is valid. Receive some extra data.
	$data = isAppidAndCommandid_Valid($appid, $cmdid);

	// Only run the command if the validation check passes.
	if( $data['success'] ){
		$newEntry = $appid . " " . $cmdid . "\n" ;
		file_put_contents($inputFilename, $newEntry , FILE_APPEND | LOCK_EX);
		$success=true;
	}
	else{
		$success=false;
	}

	echo json_encode(array(
		'data'         => array()   ,
		'success'      => $success  ,
		'$_POST'       => $_POST    ,
		'cur_datetime' => date("Y-m-d H:i:s") ,
	) );
}

// NOT COMPLETE!

function app_delete (){
	// Pull in some globals.
	global $_appdir;
	global $_db_file;

	// Create the file. By trying to open the file it will be created!
	$dbhandle = new sqlite3_DB_PDO($_db_file) or exit("cannot open the database");

	$sql1 =
	'
		DELETE FROM "apps"
		WHERE
			id = :id
		;';

	$prp1    = $dbhandle->prepare($sql1) ;
	$id      = trim($_POST['id'] )       ;
	$dbhandle->bind(':id' , $id  )       ;
	$retval1 = $dbhandle->execute()      ;
	// $results1= $dbhandle->statement->fetchAll(PDO::FETCH_ASSOC) ;

	echo json_encode(array(
		'data'         => array()   ,
		// 'data'         => $results1 ,
		'success'      => true      ,
		// '$_POST'       => $_POST    ,
	) );
}
function app_edit   (){
	// Pull in some globals.
	global $_appdir;
	global $_db_file;

	// Pull in some locals.
	$id          = intval($_POST['id']          ) ;
	$appname     = trim  ($_POST['appname']     ) ;
	$sortorder   = intval($_POST['sortorder']   ) ;
	$description = trim  ($_POST['description'] ) ;
	$isDefault   = intval($_POST['isDefault']   ) ? 1 : 0 ;

	// Create the file. By trying to open the file it will be created!
	$dbhandle = new sqlite3_DB_PDO($_db_file) or exit("cannot open the database");

	// If isDefault is true, clear the isDefault value from any record that has it set.
	if($isDefault){
		$sql2 ='
			UPDATE "apps"
				SET "isDefault" = 0
			WHERE "isDefault" = 1
		;';
		$prp2    = $dbhandle->prepare($sql2) ;
		$retval2 = $dbhandle->execute() ;
	}

	$sql1 =
	'
		UPDATE "apps"
			SET
			  "appname"     = :appname     --
			, "sortorder"   = :sortorder   --
			, "description" = :description --
			, "isDefault"   = :isDefault   --
		WHERE
			id = :id
		;';

	$prp1       = $dbhandle->prepare($sql1) ;

	$dbhandle->bind(':appname'     , $appname     ) ;
	$dbhandle->bind(':sortorder'   , $sortorder   ) ;
	$dbhandle->bind(':description' , $description ) ;
	$dbhandle->bind(':isDefault'   , $isDefault   ) ;
	$dbhandle->bind(':id'          , $id          ) ;

	$retval1    = $dbhandle->execute()        ;
	// $results1= $dbhandle->statement->fetchAll(PDO::FETCH_ASSOC) ;

	echo json_encode(array(
		'data'       => array()    ,
		// 'data'    => $results1  ,
		'success'    => true       ,
		// '$_POST'     => $_POST     ,
		'$sql1'      => $sql1      ,
		'$sql2'      => $sql2      ,
		'$isDefault' => $isDefault ,
		'$retval1'=>$retval1,
		'$retval2'=>$retval2,
	) );
}
function massReorder_apps(){
	// This will be a prepare, bind, execute, re-bind, execute query.

	// Pull in some globals.
	global $_appdir;
	global $_db_file;

	// Create the file. By trying to open the file it will be created!
	$dbhandle = new sqlite3_DB_PDO($_db_file) or exit("cannot open the database");

	$s_SQL1     =
	'
		UPDATE "apps"
			SET
			    "sortorder" = :sortorder --
			  , "isDefault" = :isDefault --
		WHERE
			id = :id
	;';

	$prp1       = $dbhandle->prepare($s_SQL1) ;

	$data      = json_decode($_POST['data'], true) ;
	for($i=0; $i<sizeof($data); $i+=1){
		$dbhandle->bind(':id'     , $data[$i]["appId"]     ) ;
		$dbhandle->bind(':sortorder' , $data[$i]["sortorder"] ) ;
		$dbhandle->bind(':isDefault' , $data[$i]["isDefault"] ) ;
		$retval1[$i]    = $dbhandle->execute()        ;
	}

	echo json_encode(array(
		'data'      => array() ,
		'success'   => true    ,
		// '$_POST'    => $_POST  ,
		'$data'     => $data   ,
		'$prp1'     => $data   ,
		'$retval1'  => $retval1   ,
	) );
}
function massReorder_commands(){
	$updatedData = json_decode($_POST['updatedData'],true);

	// This will be a prepare, bind, execute, re-bind, execute query.
	// Pull in some globals.
	global $_appdir;
	global $_db_file;

	// Create the file. By trying to open the file it will be created!
	$dbhandle = new sqlite3_DB_PDO($_db_file) or exit("cannot open the database");

	$s_SQL1     =
	'
		UPDATE "commands"
			SET
			"sortorder" = :sortorder --
		WHERE
			comid = :commandId AND appid = :appId
	;';

	$prp1       = $dbhandle->prepare($s_SQL1) ;

	for($i=0; $i<sizeof($updatedData); $i+=1){
		$dbhandle->bind( ':appId'     , $updatedData[$i]["appid"]     ) ;
		$dbhandle->bind( ':commandId' , $updatedData[$i]["comid"]     ) ;
		$dbhandle->bind( ':sortorder' , $updatedData[$i]["sortorder"] ) ;
		$retval1[$i]    = $dbhandle->execute()        ;
	}

	echo json_encode(
		[
			'data'      => array() ,
			'success'   => true    ,
		]
	);
}

// COMPLETE!

function isAppidAndCommandid_Valid($appid, $commandid) {
	// Pull in some globals.
	global $_appdir;
	global $_db_file;

	// Create the file. By trying to open the file it will be created!
	$dbhandle = new sqlite3_DB_PDO($_db_file) or exit("cannot open the database");

	$sql1     =
	'
	SELECT
		apps.appname AS appname    ,
		commands.label AS label
	FROM commands
	JOIN apps ON apps.appid = commands.appid
	WHERE apps.appid = :appid AND commands.comid = :commandid
	;';

	$prp1       = $dbhandle->prepare($sql1) ;

	$dbhandle->bind(':appid'     , $appid ) ;
	$dbhandle->bind(':commandid' , $commandid ) ;

	$retval1    = $dbhandle->execute()        ;
	$results1= $dbhandle->statement->fetchAll(PDO::FETCH_ASSOC) ;

	if(sizeof($results1)){
		return [
			"success" => true                     ,
			"appname"  => $results1[0]['appname'] ,
			"label"    => $results1[0]['label']   ,
		];
	}
	else                 {
		return [
			"success" => false                    ,
			"appname"  => $results1[0]['appname'] ,
			"label"    => $results1[0]['label']   ,
		];
	}
}

function command_delete() {
	// Pull in some globals.
	global $_appdir;
	global $_db_file;

	// Create the file. By trying to open the file it will be created!
	$dbhandle = new sqlite3_DB_PDO($_db_file) or exit("cannot open the database");

	$s_SQL1     =
	'
	DELETE FROM "commands"
	WHERE
		comid = :comid
		AND
		appid = :appid
	;';

	$prp1  = $dbhandle->prepare($s_SQL1) ;

	$comid = trim($_POST['comid']       );
	$appid = trim($_POST['appid']    );

	$dbhandle->bind(':comid' , $comid ) ;
	$dbhandle->bind(':appid' , $appid ) ;

	$retval1    = $dbhandle->execute()        ;

	echo json_encode(array(
	'data'         => array()   ,
	'success'      => true      ,
	) );
}
function command_edit()   {
	// Pull in some globals.
	global $_appdir;
	global $_db_file;

	// Create the file. By trying to open the file it will be created!
	$dbhandle = new sqlite3_DB_PDO($_db_file) or exit("cannot open the database");

	$s_SQL1     =
	'
		UPDATE "commands"
			SET
			  "label"     = :label     --
			, "sortorder" = :sortorder --
			, "command"   = :command   --
			, "canrunfromweb"   = :canrunfromweb   --
		WHERE
			comid = :comid
			AND
			appid = :appid
		;';

	$prp1       = $dbhandle->prepare($s_SQL1) ;

	$label     = trim($_POST['label']    );
	$sortorder = trim($_POST['sortorder']);
	$command   = trim($_POST['command']  );
	$comid     = trim($_POST['comid']    );
	$appid     = trim($_POST['appid']    );
	$canrunfromweb     = trim($_POST['canrunfromweb']    );

	$dbhandle->bind(':label'     , $label     ) ;
	$dbhandle->bind(':sortorder' , $sortorder ) ;
	$dbhandle->bind(':command'   , $command   ) ;
	$dbhandle->bind(':comid'     , $comid     ) ;
	$dbhandle->bind(':appid'     , $appid     ) ;
	$dbhandle->bind(':canrunfromweb'     , $canrunfromweb     ) ;

	$retval1    = $dbhandle->execute()        ;

	echo json_encode(array(
		'data'         => array()   ,
		'success'      => true      ,
	) );
}
function runCommand()     {
	// Pull in some globals.
	global $_appdir;
	global $_db_file;

	// Create the file. By trying to open the file it will be created!
	$dbhandle = new sqlite3_DB_PDO($_db_file) or exit("cannot open the database");

	$sql1     =
	'
	SELECT command, label, canrunfromweb
	FROM commands
	WHERE appid = :appid AND comid = :commandid
	;';

	$prp1       = $dbhandle->prepare($sql1) ;
	$appid      = $_POST['appid'] ;
	$commandid  = $_POST['commandid'] ;

	$dbhandle->bind(':appid'     , $appid ) ;
	$dbhandle->bind(':commandid' , $commandid ) ;

	$retval1    = $dbhandle->execute()        ;
	$results1= $dbhandle->statement->fetchAll(PDO::FETCH_ASSOC) ;
	$command=$results1[0]['command'];

	// Was this command initiated via the command-line or from the web?
	// If this is the web make sure it is allowed to run from the web.
	global $viacommandline;
	if( !$viacommandline && $results1[0]['canrunfromweb'] != 1){
		echo json_encode(array(
			'success'             => false     ,
			'data'                => []       ,
			'output'              => "ERROR: This command can not be run from the web."  ,
			'command'             => $command ,
			// 'label'               => $label   ,
			'results1'               => $results1   ,
			// '$_POST'              => $_POST   ,
			// '$results1' => $results1 ,
		));

		return;
	}

	// Command is allowed to run.
	exec($command . " 2>&1", $output);
	$output = implode("\n", $output) ;

	// $shell_exec_results = shell_exec($command . " 2>&1");

	// Record the last use of this command.
	$sql2     =
	'
	UPDATE commands
	SET lastuse = CURRENT_TIMESTAMP
	WHERE appid = :appid AND comid = :commandid
	;';
	$prp2       = $dbhandle->prepare($sql2) ;
	$appid      = $_POST['appid'] ;
	$commandid  = $_POST['commandid'] ;
	$dbhandle->bind(':appid'     , $appid ) ;
	$dbhandle->bind(':commandid' , $commandid ) ;
	$retval2    = $dbhandle->execute()        ;

	// If the output is for the command line then print is as is.
	if($viacommandline){ $output = $output; }
	// If the output is for the web then use htmlentities.
	else{
		$output = htmlentities($output);
	}

	echo json_encode(array(
		'success'             => true     ,
		'data'                => []       ,
		'output'              => $output  ,
		'command'             => $command ,
		'DEBUG'               => "RAN WEB PROGRAM" ,
		// 'label'               => $label   ,
		// '$_POST'              => $_POST   ,
		// '$results1' => $results1 ,
	));
}
function runCommand_base(){
	$command = "../APPS/runCommand.sh " . " " . $_POST['app'] . " " . $_POST['command'] ;

	exec($command . " 2>&1", $output);

	$output = implode("\n", $output) ;

	echo json_encode(array(
		'success'             => true     ,
		'data'                => []       ,
		'output'              => $output  ,
		'command'             => $command ,
		// '$_POST'              => $_POST   ,
	));
}
function cmd_run1AppCommand( $appid, $cmdid ) {
	// Test that the appid and cmdid are valid.
	$data = isAppidAndCommandid_Valid($appid, $cmdid);
	echo "FUNCTION : " . "cmd_run1AppCommand" . "\n";
	echo "APP ID   : " . $appid . " (" . $data['appname'] . ")" . "\n";
	echo "CMD ID   : " . $cmdid . " (" . $data['label']   . ")" . "\n";
	echo "VALID?   : " . ($data['success'] ? "true" : "false")  . "\n";

	if( $data['success'] ){
		// Show notice about the appearance of a hung script.
		ob_start();
		echo "\n";
		echo "***********************************************************************\n";
		echo " PLEASE NOTE: If the command takes a long time this script will APPEAR\n";
		echo " to hang but it is just waiting for the command to finish.\n";
		echo "***********************************************************************\n";
		echo "\n";
		ob_end_flush();

		// Run that command.
		ob_start();
		$_POST['appid'    ] = $appid;
		$_POST['commandid'] = $cmdid;
		API_REQUEST( "runCommand", 'cmd' );
		$output1 = ob_get_contents();
		$decoded_output1 = json_decode( $output1, true);
		$data=$decoded_output1['output'];
		ob_end_clean ();

		// Echo out the result of the command.
		ob_start();
		echo $data;
		echo "\n";
		ob_end_flush();

		return $data;

		exit();
	}
	else{
	}

}

function getAppData()     {
	// Pull in some globals.
	global $_appdir;
	global $_db_file;

	// Create the file. By trying to open the file it will be created!
	$dbhandle = new sqlite3_DB_PDO($_db_file) or exit("cannot open the database");

	$sql1     =
	'
	SELECT
		  comid                            AS commandId
		, sortorder                        AS sortorder
		, label                            AS label
		, command                          AS command
		, appid                            AS appId
		, created                          AS created
		, datetime(lastuse, \'localtime\') AS lastuse
		, canrunfromweb                    AS canrunfromweb
	FROM commands
	WHERE appid = :appid
	ORDER BY sortorder ASC
	;';

	$prp1       = $dbhandle->prepare($sql1) ;
	$appid      = $_POST['appid'] ;
	$dbhandle->bind(':appid' , $appid ) ;
	$retval1    = $dbhandle->execute()        ;
	$results1= $dbhandle->statement->fetchAll(PDO::FETCH_ASSOC) ;

	echo json_encode(array(
		'data'         => $results1 ,
		'success'      => true      ,
	) );
}
function command_new()    {
	// Pull in some globals.
	global $_appdir;
	global $_db_file;

	// Create the file. By trying to open the file it will be created!
	$dbhandle = new sqlite3_DB_PDO($_db_file) or exit("cannot open the database");

	$s_SQL1     =
	'
	INSERT INTO "commands" (
		  "comid"
		, "sortorder"
		, "label"
		, "command"
		, "appid"
		, "created"
		, "lastuse"
		, "canrunfromweb"
	)
	VALUES (
			NULL                                                -- comid
		, (SELECT COALESCE(MAX(sortorder),0)+1 FROM commands) -- sortorder
		, :label                                              -- label
		, :command                                            -- command
		, :appid                                              -- appid
		, CURRENT_TIMESTAMP                                   -- created
		, NULL                                                -- lastuse
		, :canrunfromweb                                      -- canrunfromweb
	);';

	$prp1       = $dbhandle->prepare($s_SQL1) ;

	$appid   = trim($_POST['appid'])  ;
	$label   = trim($_POST['label'])  ;
	$command = trim($_POST['command']);
	$canrunfromweb = trim($_POST['canrunfromweb']);

	$dbhandle->bind(':appid'     , $appid       ) ;
	$dbhandle->bind(':label'     , $label       ) ;
	$dbhandle->bind(':command'   , $command     ) ;
	$dbhandle->bind(':canrunfromweb'   , $canrunfromweb     ) ;

	$retval1    = $dbhandle->execute()        ;
	// $newComId = $dbhandle->dbh->lastInsertId();

	echo json_encode(array(
		'data'         => array()   ,
		'success'      => true      ,
		// 'newComId'     => $newComId ,
	) );
}
function getAppsList()    {
	// Pull in some globals.
	global $_appdir;
	global $_db_file;

	// Create the file. By trying to open the file it will be created!
	$dbhandle = new sqlite3_DB_PDO($_db_file) or exit("cannot open the database");

	// SQL
	$s_SQL1     =
	'
	SELECT
		"appid"
		, "appname"
		, "description"
		, "appspath"
		, "appcodepath"
		, "sortorder"
		, "created"
		, "default"
	FROM apps
	ORDER BY sortorder ASC
	;';

	// Prep, exec, fetch.
	$prp1     = $dbhandle->prepare($s_SQL1) ;
	$retval1  = $dbhandle->execute()        ;
	$results1 = $dbhandle->statement->fetchAll(PDO::FETCH_ASSOC) ;

	// Return data.
	echo json_encode(array(
		'data'         => $results1 ,
		'success'      => true      ,
	) );
}
function app_new()        {
	// Pull in some globals.
	global $_appdir;
	global $_db_file;

	// Create the file. By trying to open the file it will be created!
	$dbhandle = new sqlite3_DB_PDO($_db_file) or exit("cannot open the database");

	// SQL
	$s_SQL1     =
	'
	INSERT INTO "apps" (
		"appid"
		,"appname"
		,"appspath"
		,"description"
		,"sortorder"
		,"created"
		,"default"
		,"appcodepath"
		)
		VALUES (
			NULL
			, :appname
			--, (SELECT substr(\'0000\' || (COALESCE(MAX(appid),0)+1) , -4, 4) || :appspath FROM apps)

			, (SELECT substr(\'0000\' || (COALESCE( (SELECT seq FROM sqlite_sequence WHERE name="apps") ,0)+1) , -4, 4) || :appspath FROM apps)

			, :description
			, (SELECT COALESCE( MAX(sortorder) ,0)+1 FROM apps)
			, CURRENT_TIMESTAMP
			, 0
			, :appcodepath
		);';

	$prp1       = $dbhandle->prepare($s_SQL1) ;

	// Trim the provided data.
	$appname     = trim($_POST['appname'])     ;
	$appspath    = trim($_POST['appspath'])     ;
	$description = trim($_POST['description']) ;
	$appcodepath = trim($_POST['appcodepath']) ;

	// Bind the SQL placeholders.
	$dbhandle->bind(':appname'    , $appname     ) ;
	$dbhandle->bind(':description', $description ) ;
	$dbhandle->bind(':appspath'   , "_".$appspath ) ;
	$dbhandle->bind(':appcodepath', $appcodepath ) ;

	// Execute the query.
	$retval1    = $dbhandle->execute()        ;

	// Get the last insert id as the new app id.
	$newAppId = $dbhandle->dbh->lastInsertId();

	// Get the newly created apps path.
	$s_SQL2   = 'SELECT appspath FROM apps WHERE appid='.$newAppId.';';
	$prp2     = $dbhandle->prepare($s_SQL2) ;
	$retval2  = $dbhandle->execute()        ;
	$appspath = $dbhandle->statement->fetchAll(PDO::FETCH_ASSOC)[0]['appspath'] ;

	$error="";
	$newDir = $_appdir.'/../APPS/'.$appspath;

	// [23-Oct-2019 10:06:31 America/Detroit] PHP Warning:  mkdir(): No such file or directory in /home/nicksen782/workspace/web/ACTIVE/Command-Er2/api/api_p.php on line 802
	// [23-Oct-2019 10:06:31 America/Detroit] PHP Warning:  chmod(): No such file or directory in /home/nicksen782/workspace/web/ACTIVE/Command-Er2/api/api_p.php on line 802
	// [23-Oct-2019 10:06:31 America/Detroit] PHP Warning:  copy(/home/nicksen782/workspace/web/ACTIVE/Command-Er2/api../APPS/template_basesettings.sh): failed to open stream: No such file or directory in /home/nicksen782/workspace/web/ACTIVE/Command-Er2/api/api_p.php on line 803
	// [23-Oct-2019 10:06:31 America/Detroit] PHP Warning:  chmod(): No such file or directory in /home/nicksen782/workspace/web/ACTIVE/Command-Er2/api/api_p.php on line 803
	// [23-Oct-2019 10:06:31 America/Detroit] PHP Warning:  copy(/home/nicksen782/workspace/web/ACTIVE/Command-Er2/api../APPS/template_app_commands.sh): failed to open stream: No such file or directory in /home/nicksen782/workspace/web/ACTIVE/Command-Er2/api/api_p.php on line 804
	// [23-Oct-2019 10:06:31 America/Detroit] PHP Warning:  chmod(): No such file or directory in /home/nicksen782/workspace/web/ACTIVE/Command-Er2/api/api_p.php on line 804
	// [23-Oct-2019 10:06:31 America/Detroit] PHP Warning:  fopen(/home/nicksen782/workspace/web/ACTIVE/Command-Er2/api../APPS/0012_test/basesettings.sh): failed to open stream: No such file or directory in /home/nicksen782/workspace/web/ACTIVE/Command-Er2/api/api_p.php on line 808

	// Does the folder NOT exist? Create it.
	if (!file_exists($newDir)) {
		// Files to create/copy.
		$file1_src=$_appdir . '/../APPS/template_basesettings.sh';
		$file2_src=$_appdir . '/../APPS/template_app_commands.sh';
		$file1_dst=$newDir  . '/basesettings.sh'                ;
		$file2_dst=$newDir  . '/app_commands.sh'                ;

		// Save the current umask.
		$oldmask = umask(0);

		// Create directory, copy files, fix permissions.
		// Will likely be www-data:www-data with rwx 770.
		mkdir($newDir, 0770);            chmod($newDir   , 0770);
		copy( $file1_src , $file1_dst ); chmod($file1_dst, 0770);
		copy( $file2_src , $file2_dst ); chmod($file2_dst, 0770);

		// Append to basesettings.txt.
		$myFile = $file1_dst ; // $newDir.'/basesettings.sh';
		// $fh = fopen($myFile, 'a') || echo "can't open file";
		$fh = fopen($myFile, 'a') ;
		if(!$fh){ echo "CAN'T OPEN FILE"; }
		$line1 = "G_APPNAME=\""     . $appname     . "\" \n";
		$line2 = "G_APPHOME_DEV=\"" . $appcodepath . "\" \n";
		fwrite($fh, $line1.$line2);
		fclose($fh);

		// // Create the initial nextGitCommit.txt
		// $myFile = $newDir.'nextGitCommit.txt';
		// $fh = fopen($myFile, 'w') or exit("can't open file");
		// fwrite($fh, "");
		// fclose($fh);

		// Restore the umask.
		umask($oldmask);
	}
	// The folder should NOT already exist.
	else{
		$error="Could not create the new dir for the app. It already exists.";
	}

	echo json_encode([
		'data'     => array()   ,
		'newAppId' => $newAppId ,
		'error'    => $error    ,
		'newDir'   => $newDir   ,
	]);
}

function createInitialDatabase(){
	// Pull in some globals.
	global $_appdir;
	global $_db_file;

	// Create the file. By trying to open the file it will be created!
	$dbhandle = new sqlite3_DB_PDO($_db_file) or exit("cannot open the database");

	// Add individual queries from one file.
	$populateQuerys = array();
	$queryFile      = file_get_contents($_appdir."/db_init/createInitialDatabase.sql") ;
	$queries        = explode(";", $queryFile);

	// Now do the exploded queries.
	for($i=0; $i<sizeof($queries); $i++){
		$queries[$i] .= ";";
		$s_SQL1     = $queries[$i]                ;
		$prp1       = $dbhandle->prepare($s_SQL1) ;
		$retval1    = $dbhandle->execute()        ;
	}

	chmod($_db_file, 770);
}
class sqlite3_DB_PDO{
	public $dbh;              // The DB handle.
	public $statement;        // The prepared statement handle.

	public function __construct( $file_db_loc ){
		// Set timezone.
		date_default_timezone_set('America/Detroit');

		try{
			// Connect to the database.
			$this->dbh = new PDO("sqlite:".$file_db_loc);
			// $this->dbh->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_SILENT);
			$this->dbh->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_WARNING);
			// $this->dbh->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
		}
		catch(PDOException $e){
			echo "ERROR ON DB FILE OPEN:"; print_r( $e );
		}
	}

	public function prepare($query){
		try                   {
			$this->statement = $this->dbh->prepare($query);

    		// echo "errorInfo: "; print_r($this->dbh->errorInfo()); echo "<br>";

			return $this->statement;
		}
		catch(PDOException $e){
			echo "ERROR ON PREPARE:"; print_r( $e );
			return ($e);
		}
	}

	public function bind($param, $value, $type = null){
		if(!$this->statement){ return "FAILURE TO BIND"; }

		//Example: $db_pdo->bind(':fname', 'Jenny');
		if (is_null($type)) {
			switch (true) {
				case is_int($value) : { $type = PDO::PARAM_INT ; break; }
				case is_bool($value): { $type = PDO::PARAM_BOOL; break; }
				case is_null($value): { $type = PDO::PARAM_NULL; break; }
				default             : { $type = PDO::PARAM_STR ;        }
			}
		}

		try                   { $this->statement->bindValue($param, $value, $type); }
		catch(PDOException $e){
			echo "ERROR ON BIND:"; print_r( $e );
			return $e;
		}
	}

	public function execute()			{
		try                   { return $this->statement->execute(); }
		catch(PDOException $e){
			echo "ERROR ON EXECUTE:"; print_r( $e );
			/* print_r( debug_backtrace()[1] ); */
		}
	}

	public function getErrors($e)			{
		// #define SQLITE_OK           0   /* Successful result */
		// #define SQLITE_ERROR        1   /* SQL error or missing database */
		// #define SQLITE_INTERNAL     2   /* An internal logic error in SQLite */
		// #define SQLITE_PERM         3   /* Access permission denied */
		// #define SQLITE_ABORT        4   /* Callback routine requested an abort */
		// #define SQLITE_BUSY         5   /* The database file is locked */
		// #define SQLITE_LOCKED       6   /* A table in the database is locked */
		// #define SQLITE_NOMEM        7   /* A malloc() failed */
		// #define SQLITE_READONLY     8   /* Attempt to write a readonly database */
		// #define SQLITE_INTERRUPT    9   /* Operation terminated by sqlite_interrupt() */
		// #define SQLITE_IOERR       10   /* Some kind of disk I/O error occurred */
		// #define SQLITE_CORRUPT     11   /* The database disk image is malformed */
		// #define SQLITE_NOTFOUND    12   /* (Internal Only) Table or record not found */
		// #define SQLITE_FULL        13   /* Insertion failed because database is full */
		// #define SQLITE_CANTOPEN    14   /* Unable to open the database file */
		// #define SQLITE_PROTOCOL    15   /* Database lock protocol error */
		// #define SQLITE_EMPTY       16   /* (Internal Only) Database table is empty */
		// #define SQLITE_SCHEMA      17   /* The database schema changed */
		// #define SQLITE_TOOBIG      18   /* Too much data for one row of a table */
		// #define SQLITE_CONSTRAINT  19   /* Abort due to contraint violation */
		// #define SQLITE_MISMATCH    20   /* Data type mismatch */
		// #define SQLITE_MISUSE      21   /* Library used incorrectly */
		// #define SQLITE_NOLFS       22   /* Uses OS features not supported on host */
		// #define SQLITE_AUTH        23   /* Authorization denied */
		// #define SQLITE_ROW         100  /* sqlite_step() has another row ready */
		// #define SQLITE_DONE        101  /* sqlite_step() has finished executing */
	}

}
?>
