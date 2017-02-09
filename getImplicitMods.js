var request = require("request");
var jsonfile = require('jsonfile');
var json2csv = require('json2csv');
var fs = require('fs');
var cheerio = require('cheerio');

urls = [
	'one_handed_axes', 'two_handed_axes', 'claws', 'daggers', 'sceptres', 'wands', 'one_handed_swords', 'two_handed_swords', 'one_handed_maces', 'two_handed_maces', 
	'bows', 'fishing_rods', 'amulets', 'belts', 'rings', 'quivers', 'life_flasks', 'mana_flasks', 'hybrid_flasks', 'utility_flasks', 'critical_utility_flasks', 
	'body_armours', 'shields', 'gloves', 'boots', 'helmets',    
	'int_body_armour_', 'str_body_armour_', 'dex_body_armour_', 'str_dex_body_armour_', 'str_int_body_armour_', 'dex_int_body_armour_',	'str_dex_int_body_armour_',
	'int_boot_', 'str_boot_', 'dex_boot_', 'str_dex_boot_', 'str_int_boot_', 'dex_int_boot_', 'str_dex_int_boot_',
	'int_glove_', 'str_glove_', 'dex_glove_', 'str_dex_glove_', 'str_int_glove_', 'dex_int_glove_', 'str_dex_int_glove_',
	'int_helmet_', 'str_helmet_', 'dex_helmet_', 'str_dex_helmet_', 'str_int_helmet_', 'dex_int_helmet_', 'str_dex_int_helmet_',
	'int_shield_', 'str_shield_', 'dex_shield_', 'str_dex_shield_', 'str_int_shield_', 'dex_int_shield_', 'str_dex_int_shield_',
	'cobalt_jewel_', 'crimson_jewel_', 'viridian_jewel_', 'prismatic_jewel_'
]