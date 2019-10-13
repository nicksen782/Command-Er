<!DOCTYPE html>
<html lang="en">
<head>
	<meta http-equiv="X-UA-Compatible" content="IE=edge">
	<meta charset="UTF-8">
	<link rel="icon" href="data:;base64,iVBORw0KGgo=">
	<title>Command-Er2</title>

	<!-- Basic styling, centering the canvas -->
	<link rel="stylesheet" type="text/css" href="css/css_reset.css">
	<link rel="stylesheet" type="text/css" href="css/index.css">

	<script src="js/index.js"></script>
</head>

<body>
	<div id="entireBodyDiv"></div>
	<div id="progressbarDiv"></div>
	<div id="modal_new_app" class="modals">
		<div class="modalTitle">CREATING NEW APPLICATION</div>
		<br>
		<table>
			<tr><td>APP NAME   </td><td> <input id="modal_new_app_appname" type="text" value=""> </td></tr>
			<tr><td>CODE PATH  </td><td> <input id="modal_new_app_appcodepath" type="text" value=""> </td></tr>
			<tr><td>DESCRIPTION</td><td> <textarea id="modal_new_app_description"></textarea> </td></tr>
		</table>
		<br>
		<input type="button" id="create_app" value="Save new app">
		<input type="button" class="modalsClose" value="Cancel">
	</div>
	<div id="modal_new_cmd" class="modals">
		<div class="modalTitle">CREATING NEW COMMAND</div>
		<br>
		<table>
			<tr><td>APP NAME   </td><td><span class="modal_app_appname"></span> </td></tr>
			<tr><td>APP ID     </td><td><span class="modal_app_appid"></span> </td></tr>
			<tr><td>APPSPATH   </td><td><span class="modal_app_appspath"></span> </td></tr>
			<tr><td>APPCODEPATH</td><td><span class="modal_app_appcodepath"></span> </td></tr>

			<tr><td>LABEL      </td><td><input    id="modal_new_cmd_label" type="text" value=""> </td></tr>
			<tr><td>COMMAND    </td><td><textarea id="modal_new_cmd_command"></textarea> </td></tr>
		</table>
		<br>
		<input type="button" id="create_cmd" value="Save new command">
		<input type="button" class="modalsClose" value="Cancel">
	</div>
	<div id="modal_edit_cmd" class="modals">
		<div class="modalTitle">EDITING EXISTING COMMAND</div>
		<br>
		<table>
			<tr><td>APP NAME   </td><td><span class="modal_app_appname"></span> </td></tr>
			<tr><td>APP ID     </td><td><span class="modal_app_appid"></span> </td></tr>
			<tr><td>COM ID     </td><td><span class="modal_app_comid"></span> </td></tr>
			<tr><td>APPSPATH   </td><td><span class="modal_app_appspath"></span> </td></tr>
			<tr><td>APPCODEPATH</td><td><span class="modal_app_appcodepath"></span> </td></tr>

			<tr><td>LABEL      </td><td><input    id="modal_edit_cmd_label" type="text" value=""> </td></tr>
			<tr><td>COMMAND    </td><td><textarea id="modal_edit_cmd_command"></textarea> </td></tr>
			<tr><td>SORTORDER  </td><td><input    id="modal_edit_cmd_sortorder" type="text" value=""> </td></tr>
		</table>
		<br>
		<input type="button" id="edit_cmd" value="Edit existing command">
		<input type="button" class="modalsClose" value="Cancel">
	</div>

	<div id="header">
	Command-Er2 - Server-command Dashboard
	</div>

	<div id="apps">
		APPLICATION:
		<select id="app_select">
			<option value="">...SELECT</option>
		</select>
		<input type="button" id="app_new" value="NEW APP">
	</div>

	<div id="commands_base">
		BUILD-IN COMMANDS:
		<select id="cmd_select_base">
			<option value=""                            >...SELECT</option>
			<!-- <option value="git_setAllowedToCommitFlag"  >git_setAllowedToCommitFlag</option> -->
			<!-- <option value="git_clearAllowedToCommitFlag">git_clearAllowedToCommitFlag</option> -->
			<!-- <option value="git_commit"                  >git_commit</option> -->
			<!-- <option value="git_add_all"                 >git_add_all</option> -->
			<!-- <option value="git_pull"                    >git_pull</option> -->
			<option value="git_status"                  >git_status</option>
			<option value="git_log"                     >git_log</option>
			<option value="git_config"                  >git_config</option>
		</select>
		<input type="button" id="cmd_run_base" value="RUN">
	</div>

	<div id="commands">
		CUSTOM COMMANDS:
		<select id="cmd_select">
			<option value="">...SELECT</option>
		</select>
		<input type="button" id="cmd_run" value="RUN">
		<input type="button" id="cmd_edit" value="EDIT">
		<input type="button" id="cmd_new" value="NEW">
		<input type="button" id="cmd_del" value="DELETE">
	</div>

	<div id="output">
		OUTPUT:
		<br>
		&nbsp;&nbsp;OPTION: <label><input id="outputWrapping" type="checkbox"> Do not wrap text</label>
		<hr>
		<div id="output_text"></div>
	</div>

	<div id="footer">
		(2019) Nickolas Andersen (nicksen782)
		<a href="api/phpliteadmin.php" target="_blank">phpliteadmin</a>
	</div>

</body>

</html>
