<?php
/**
 *
 *
 */

 // All requests to the server should go through this file.

// This is the only place this flag is set. It is checked everywhere else insuring that all processes start here.
$securityLoadedFrom_indexp = true;

// Configure error reporting
$appName='COMMANDER2';
error_reporting(E_ALL & ~E_NOTICE & ~E_STRICT);
ini_set('error_log', getcwd() . '/'.$appName.'-error.txt');
ini_set("log_errors", 1);
ini_set("display_errors", 1);

// Configure timezone.
define('TIMEZONE', 'America/Detroit');
date_default_timezone_set(TIMEZONE);

$_appdir  = getcwd().'/'                     ;
$_db_file = $_appdir."/commander2.db" ;

$dev=false;
if      ( strpos($_SERVER['SERVER_NAME'], "dev.nicksen782.net") !== false ) { $dev=true; }
else if ( strpos($_SERVER['SERVER_NAME'], "dev2.nicksen782.net") !== false ) { $dev=true; }

if(!$dev){
	exit('This application should only run from dev.');
}

if( ! file_exists( $_db_file )){ createInitialDatabase(); }

// Was a request received? Process it.
if     ( $_POST['o'] ){ API_REQUEST( $_POST['o'], 'post' ); }
else if( $_GET ['o'] ){ API_REQUEST( $_GET ['o'], 'get'  ); }
else{
	$stats['error']=true;
	$stats['error_text']="***No 'o' value was provided.";
	echo json_encode( $stats );
	exit();
}

function API_REQUEST( $api, $type ){
	$stats = array(
		'error'      => false ,
		'error_text' => ""    ,
	);

	// Rights.
	$public      = 1 ; // No rights required.

	$o_values=array();

	// APIs
	$o_values["getAppsList"]          = [ "p"=>( ( $public ) ? 1 : 0 ), 'get'=>0, 'post'=>1, ] ;
	$o_values["getAppData"]           = [ "p"=>( ( $public ) ? 1 : 0 ), 'get'=>0, 'post'=>1, ] ;
	$o_values["runCommand"]           = [ "p"=>( ( $public ) ? 1 : 0 ), 'get'=>0, 'post'=>1, ] ;
	$o_values["runCommand_base"]      = [ "p"=>( ( $public ) ? 1 : 0 ), 'get'=>0, 'post'=>1, ] ;

	$o_values["command_delete"]       = [ "p"=>( ( $public ) ? 1 : 0 ), 'get'=>0, 'post'=>1, ] ;
	$o_values["command_edit"]         = [ "p"=>( ( $public ) ? 1 : 0 ), 'get'=>0, 'post'=>1, ] ;
	$o_values["command_new"]          = [ "p"=>( ( $public ) ? 1 : 0 ), 'get'=>0, 'post'=>1, ] ;

	$o_values["app_delete"]           = [ "p"=>( ( $public ) ? 1 : 0 ), 'get'=>0, 'post'=>1, ] ;
	$o_values["app_edit"]             = [ "p"=>( ( $public ) ? 1 : 0 ), 'get'=>0, 'post'=>1, ] ;
	$o_values["app_new"]              = [ "p"=>( ( $public ) ? 1 : 0 ), 'get'=>0, 'post'=>1, ] ;

	$o_values["massReorder_apps"]     = [ "p"=>( ( $public ) ? 1 : 0 ), 'get'=>0, 'post'=>1, ] ;
	$o_values["massReorder_commands"] = [ "p"=>( ( $public ) ? 1 : 0 ), 'get'=>0, 'post'=>1, ] ;

	$o_values["createBaseCommands"]   = [ "p"=>( ( $public ) ? 1 : 0 ), 'get'=>0, 'post'=>1, ] ;

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
		'$_POST'       => $_POST    ,
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
		'$_POST'     => $_POST     ,
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
		'$_POST'    => $_POST  ,
		'$data'     => $data   ,
		'$prp1'     => $data   ,
		'$retval1'  => $retval1   ,
	) );
}
function massReorder_commands(){
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
			id = :commandId AND appid = :appId
	;';

	$prp1       = $dbhandle->prepare($s_SQL1) ;

	$data      = json_decode($_POST['data'], true) ;
	for($i=0; $i<sizeof($data); $i+=1){
		$dbhandle->bind(':appId'     , $data[$i]["appId"]     ) ;
		$dbhandle->bind(':commandId' , $data[$i]["commandId"] ) ;
		$dbhandle->bind(':sortorder' , $data[$i]["sortorder"] ) ;
		$retval1[$i]    = $dbhandle->execute()        ;
	}

	echo json_encode(array(
		'data'      => array() ,
		'success'   => true    ,
		'$_POST'    => $_POST  ,
		'$data'     => $data   ,
		'$prp1'     => $data   ,
		'$retval1'  => $retval1   ,
	) );
}

//

// COMPLETE!
function command_delete(){
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
function command_edit  (){
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

	$dbhandle->bind(':label'     , $label     ) ;
	$dbhandle->bind(':sortorder' , $sortorder ) ;
	$dbhandle->bind(':command'   , $command   ) ;
	$dbhandle->bind(':comid'     , $comid     ) ;
	$dbhandle->bind(':appid'     , $appid     ) ;

	$retval1    = $dbhandle->execute()        ;

	echo json_encode(array(
		'data'         => array()   ,
		'success'      => true      ,
	) );
}
function runCommand (){
	// Pull in some globals.
	global $_appdir;
	global $_db_file;

	// Create the file. By trying to open the file it will be created!
	$dbhandle = new sqlite3_DB_PDO($_db_file) or exit("cannot open the database");

	$sql1     =
	'
	SELECT command, label
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
	// $label=$results1[0]['label'];

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

	echo json_encode(array(
		'success'             => true     ,
		'data'                => []       ,
		'output'              => $output  ,
		'command'             => $command ,
		'label'               => $label   ,
		'$_POST'              => $_POST   ,
		// '$results1' => $results1 ,
	));
}
function runCommand_base (){
	$command = "../APPS/runCommand.sh " . " " . $_POST['app'] . " " . $_POST['command'] ;

	exec($command . " 2>&1", $output);

	$output = implode("\n", $output) ;

	echo json_encode(array(
		'success'             => true     ,
		'data'                => []       ,
		'output'              => $output  ,
		'command'             => $command ,
		'$_POST'              => $_POST   ,
	));
}
function getAppData (){
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
function command_new   (){
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
	)
	VALUES (
			NULL                                                -- comid
		, (SELECT COALESCE(MAX(sortorder),0)+1 FROM commands) -- sortorder
		, :label                                              -- label
		, :command                                            -- command
		, :appid                                              -- appid
		, CURRENT_TIMESTAMP                                   -- created
		, NULL                                                -- lastuse
	);';

	$prp1       = $dbhandle->prepare($s_SQL1) ;

	$appid   = trim($_POST['appid'])  ;
	$label   = trim($_POST['label'])  ;
	$command = trim($_POST['command']);

	$dbhandle->bind(':appid'     , $appid       ) ;
	$dbhandle->bind(':label'     , $label       ) ;
	$dbhandle->bind(':command'   , $command     ) ;

	$retval1    = $dbhandle->execute()        ;
	// $newComId = $dbhandle->dbh->lastInsertId();

	echo json_encode(array(
		'data'         => array()   ,
		'success'      => true      ,
		// 'newComId'     => $newComId ,
	) );
}
function getAppsList(){
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
function app_new    (){
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
			, (SELECT substr(\'0000\' || (COALESCE(MAX(appid),0)+1) , -4, 4) || :appspath FROM apps)
			, :description
			, (SELECT COALESCE(MAX(sortorder),0)+1 FROM apps)
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
	$newDir = $_appdir.'../APPS/'.$appspath;

	// Does the folder NOT exist? Create it.
	if (!file_exists($newDir)) {
		// Files to create/copy.
		$file1_src=$_appdir . '../APPS/template_basesettings.sh';
		$file2_src=$_appdir . '../APPS/template_app_commands.sh';
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
		$fh = fopen($myFile, 'a') or exit("can't open file");
		$line1 = "G_APPNAME=\""     . $appname     . "\" \n";
		$line2 = "G_APPHOME_DEV=\"" . $appcodepath . "\" \n";
		fwrite($fh, $line1.$line2);
		fclose($fh);

		// Create the initial nextGitCommit.txt
		$myFile = $newDir.'nextGitCommit.txt';
		$fh = fopen($myFile, 'w') or exit("can't open file");
		fwrite($fh, "");
		fclose($fh);

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
