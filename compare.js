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
		
		jsonfiles = ['mods.json', 'uniques.json', 'item_bases_armour.json', 'item_bases_weapon.json', 'item_bases.json','currency_tags.json'];
		for (i = 0; i < jsonfiles.length; i++) {
			var tmFile = jsonfile.readFileSync(TMDir + '\\' + jsonfiles[i]);
			var scFile = jsonfile.readFileSync(outPutDir + '\\' + jsonfiles[i]);
			jsonfile.writeFileSync(tempFolder + '\\' + jsonfiles[i], tmFile, {spaces: 2});
			jsonfile.writeFileSync(tempFolder + '\\' + 'scraped_' + jsonfiles[i], scFile, {spaces: 2});
		}

		txtfiles = ['glove_enchantment_mods.txt', 'helmet_enchantment_mods.txt' , 'boot_enchantment_mods.txt', 'item_corrupted_mods.txt'];
		for (i = 0; i < txtfiles.length; i++) {
			var tmFile = fs.readFileSync(TMDir + '\\' + txtfiles[i]);
			var scFile = fs.readFileSync(outPutDir + '\\' + txtfiles[i]);
			fs.writeFileSync(tempFolder + '\\' + txtfiles[i], tmFile, {spaces: 2});
			fs.writeFileSync(tempFolder + '\\' + 'scraped_' + txtfiles[i], scFile, {spaces: 2});
		}

		sleep.sleep(1)
		// open temporary folder in windows explorer
		// require('child_process').exec('start "" "' + tempFolder + '"');
		
		// open mods.json files in winmerge
		var left = tempFolder + '\\mods.json';
		var right = tempFolder + '\\scraped_mods.json';
		require('child_process').exec('start winmerge.exe /s /u /maximize /dl "mods old" /dr "new" "' + left + '" "' + right + '"');
		
		// open uniques.json files in winmerge
		left = tempFolder + '\\uniques.json';
		right = tempFolder + '\\scraped_uniques.json';
		require('child_process').exec('start winmerge.exe /s /u /maximize /dl "uniques old" /dr "new" "' + left + '" "' + right + '"');

		// open helmet_enchantment_mods.txt files in winmerge
		left = tempFolder + '\\helmet_enchantment_mods.txt';
		right = tempFolder + '\\scraped_helmet_enchantment_mods.txt';
		require('child_process').exec('start winmerge.exe /s /u /maximize /dl "helmet enchants old" /dr "new" "' + left + '" "' + right + '"');

		// open glove_enchantment_mods.txt files in winmerge
		left = tempFolder + '\\glove_enchantment_mods.txt';
		right = tempFolder + '\\scraped_glove_enchantment_mods.txt';
		require('child_process').exec('start winmerge.exe /s /u /maximize /dl "glove enchants old" /dr "new" "' + left + '" "' + right + '"');

		// open boot_enchantment_mods.txt files in winmerge
		left = tempFolder + '\\boot_enchantment_mods.txt';
		right = tempFolder + '\\scraped_boot_enchantment_mods.txt';
		require('child_process').exec('start winmerge.exe /s /u /maximize /dl "boot enchants old" /dr "new" "' + left + '" "' + right + '"');

		// open item_corrupted_mods.txt files in winmerge
		left = tempFolder + '\\item_corrupted_mods.txt';
		right = tempFolder + '\\scraped_item_corrupted_mods.txt';
		require('child_process').exec('start winmerge.exe /s /u /maximize /dl "corrupted mods old" /dr "new" "' + left + '" "' + right + '"');

		// open currency_tags.json files in winmerge
		left = tempFolder + '\\currency_tags.json';
		right = tempFolder + '\\scraped_currency_tags.json';
		require('child_process').exec('start winmerge.exe /s /u /maximize /dl "currency_tags old" /dr "new" "' + left + '" "' + right + '"');

		// open item_bases_armour.json files in winmerge
		left = tempFolder + '\\item_bases_armour.json';
		right = tempFolder + '\\scraped_item_bases_armour.json';
		require('child_process').exec('start winmerge.exe /s /u /maximize /dl "armour old" /dr "new" "' + left + '" "' + right + '"');

		// open item_bases_weapon.json files in winmerge
		left = tempFolder + '\\item_bases_weapon.json';
		right = tempFolder + '\\scraped_item_bases_weapon.json';
		require('child_process').exec('start winmerge.exe /s /u /maximize /dl "weapon old" /dr "new" "' + left + '" "' + right + '"');

		// open item_bases.json files in winmerge
		left = tempFolder + '\\item_bases.json';
		right = tempFolder + '\\scraped_item_bases.json';
		require('child_process').exec('start winmerge.exe /s /u /maximize /dl "bases old" /dr "new" "' + left + '" "' + right + '"');
	}
}



