var request = require("request");
var jsonfile = require('jsonfile');
var json2csv = require('json2csv');
var fs = require('fs');

try {
	fs.unlinkSync('affixes.json');	
} catch (err) {}

var dir = 'affix_json/'
var files = fs.readdirSync(dir)
var mods = []


files.forEach(function(value, index){
	isJSON = value.match(/.*\.json/g);

	if (isJSON) {
		temp = jsonfile.readFileSync(dir+value)
		temp.affixes.forEach(function(mod,j){
			if (!InArray(mod, mods)){
				mods.push(mod)
			}
		})
	}
})

mods.sort()
var affixes = { "affixes" : mods }
var file = 'affixes.json'
jsonfile.writeFile(file, affixes, function(err) {
		if(err){
			console.error(err)	
		}
	else {
		console.log('json file saved.');
	}
})	

function InArray(value, array) {
	var match
	if (typeof value === "string") {
		array.forEach(function(el, index){
			if (value.toLowerCase() == array[index].toLowerCase()) {
				match = value
			}
		})
		return (match) ? match : false
	}
	else {
		array.forEach(function(el, index){
			if (value == array[index]) {
				match = value
			}
		})
		return (match) ? match : false
	}	
}
