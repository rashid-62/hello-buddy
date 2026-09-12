const fs = require('fs');
const path = require('path');

const KNOWLEDGE_DIR = path.join(__dirname, '..', 'knowledge');

const SOURCES = {
  'prophets.json': "Ibn Kathir, Qisas al-Anbiya (Stories of the Prophets)",
  'prophet-muhammad.json': "Ibn Hisham, As-Seerah An-Nabawiyyah; Safi-ur-Rahman al-Mubarakpuri, The Sealed Nectar",
  'rashidun.json': "Ibn Jarir al-Tabari, Tarikh al-Rusul wa al-Muluk; Jalal ad-Din as-Suyuti, History of the Caliphs",
  'umayyads.json': "Ibn Jarir al-Tabari, Tarikh al-Rusul wa al-Muluk",
  'abbasids.json': "Ibn al-Athir, Al-Kamil fi al-Tarikh",
  'andalus.json': "Al-Maqqari, Nafh al-Tib",
  'fatimids.json': "Al-Maqrizi, Itti'az al-Hunafa",
  'seljuks.json': "Ibn al-Athir, Al-Kamil fi al-Tarikh",
  'ayyubids.json': "Ibn Shaddad, The Rare and Excellent History of Saladin",
  'mamluks.json': "Al-Maqrizi, Al-Suluk li-Ma'rifat Duwal al-Muluk",
  'ottomans.json': "Halil İnalcık, The Ottoman Empire: The Classical Age",
  'mughals.json': "Abu'l-Fazl, Akbarnama; John F. Richards, The Mughal Empire",
  'important-scholars.json': "Ibn Khallikan, Wafayat al-Ayan",
  'islamic-science.json': "George Saliba, Islamic Science and the Making of the European Renaissance",
  'islamic-culture.json': "Ibn Khaldun, Al-Muqaddimah",
  'important-events.json': "Ibn al-Athir, Al-Kamil fi al-Tarikh",
  'timeline.json': "Ibn al-Athir, Al-Kamil fi al-Tarikh",
  'sources.json': "Al-Sakhawi, Al-I'lan bi't-Tawbikh"
};

const files = fs.readdirSync(KNOWLEDGE_DIR).filter(f => f.endsWith('.json'));

for (const file of files) {
  const filePath = path.join(KNOWLEDGE_DIR, file);
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const defaultSource = SOURCES[file] || "General Academic Historical Consensus";
  
  let modified = false;
  
  if (data.entries && Array.isArray(data.entries)) {
    for (const entry of data.entries) {
      if (!entry.source) {
        entry.source = defaultSource;
        modified = true;
      }
    }
  } else if (Array.isArray(data)) {
    for (const entry of data) {
      if (!entry.source) {
        entry.source = defaultSource;
        modified = true;
      }
    }
  }
  
  if (modified) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    console.log(`Updated ${file} with sources.`);
  }
}
