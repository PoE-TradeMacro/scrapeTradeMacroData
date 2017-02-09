:: scrape unique items
echo Scraping and combining unique items from wiki.
node getAllUniquesFromWiki.js
node combineJSON.js

:: scrape unique items
echo Scraping and combining affixes.
node getAffixes.js
node combineAffixJSON.js

:: scrape poe.trade mods
echo Scraping poe.trade mods.
node getPoeTradeMods.js

:: scrape corrupted mods.
echo Scraping corrupted mods.
node getCorruptedMods.js

:: scrape corrupted mods.
echo Scraping enchantments.
node getEnchants.js
