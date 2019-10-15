CREATE TABLE 'apps' (
	'appid'         INTEGER PRIMARY KEY AUTOINCREMENT ,
	'appname'       TEXT                              ,
	'description'   TEXT                              ,
	'appspath'      TEXT                              ,
	'appcodepath'   TEXT                              ,
	'sortorder'     INTEGER                           ,
	'created'       DATETIME                          ,
	'default'       INTEGER
);

CREATE TABLE 'commands' (
	'comid'     INTEGER PRIMARY KEY AUTOINCREMENT ,
	'sortorder' INTEGER                           ,
	'label'     TEXT                              ,
	'command'   TEXT                              ,
	'appid'     INTEGER                           ,
	'created'   DATETIME                          ,
	'lastuse'   DATETIME                          ,
	'canrunfromweb' INTEGER
);
