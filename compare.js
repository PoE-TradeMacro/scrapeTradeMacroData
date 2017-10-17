var request = require("request");
var jsonfile = require('jsonfile');
var json2csv = require('json2csv');
var fs = require('fs');
var os = require('os');
var rimraf = require('rimraf');
var sleep = require('sleep');

console.log('"WinMerge" should be installed and set in your PATH variable!!')
console.log('');
var tempFolder = os.tmpdir() + "\\PoE-TradeMacro-CompareJSON";
rimraf(tempFolder, function () {
	if (!fs.existsSync(tempFolder)){
		fs.mkdirSync(tempFolder);
	}	
	
	copyAndCompareFiles();
});

return

function copyAndCompareFiles() {
	var TMDir = process.env.USERPROFILE + '\\Documents\\Github\\PoE-TradeMacro\\data_trade';
	var outPutDir = __dirname + '\\output';
	if (!fs.existsSync(TMDir)){
		console.log('Failed to find folder "' + TMDir + '", exiting script.');
		exit;
	} else {
		console.log('TradeMacro folder   : "' + TMDir + '".');
		console.log('Scrape output folder: "' + outPutDir + '".');
		console.log('Temp compare folder : "' + tempFolder + '".');
		
		files = ['mods.json', 'uniques.json'];
		for (i = 0; i < files.length; i++) {
			var tmFile = jsonfile.readFileSync(TMDir + '\\' + files[i]);
			var scFile = jsonfile.readFileSync(outPutDir + '\\' + files[i]);
			jsonfile.writeFileSync(tempFolder + '\\' + files[i], tmFile, {spaces: 2});
			jsonfile.writeFileSync(tempFolder + '\\' + 'scraped_' + files[i], scFile, {spaces: 2});			
		}
		
		sleep.sleep(1)
		// open temporary folder in windows explorer
		// require('child_process').exec('start "" "' + tempFolder + '"');
		
		// open mods.json files in winmerge
		var left = tempFolder + '\\mods.json';
		var right = tempFolder + '\\scraped_mods.json';
		require('child_process').exec('start winmerge.exe /s /u /maximize /dl "mods old" /dr "mods new" "' + left + '" "' + right + '"');
		
		// open uniques.json files in winmerge
		left = tempFolder + '\\uniques.json';
		right = tempFolder + '\\scraped_uniques.json';
		require('child_process').exec('start winmerge.exe /s /u /maximize /dl "uniques old" /dr "uniques new" "' + left + '" "' + right + '"');
	}
}



