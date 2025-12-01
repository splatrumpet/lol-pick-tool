// generate-champions-sql.js
// champion.json から champions テーブル用の INSERT/UPSERT SQL を生成するスクリプト

const fs = require('fs')
const path = require('path')

const filePath = path.join(__dirname, 'champion.json')

const raw = fs.readFileSync(filePath, 'utf8')
const json = JSON.parse(raw)

// Data Dragon のバージョン（画像URL用）
const version = json.version
const champs = json.data // { Aatrox: {...}, Ahri: {...}, ... }

function escapeSql(str) {
  // シングルクォートを '' にエスケープ
  return String(str).replace(/'/g, "''")
}

const lines = []

for (const key in champs) {
  const champ = champs[key]
  // champ.id: "Aatrox"
  // champ.name: "エイトロックス"（ja_JPの場合）
  // champ.image.full: "Aatrox.png"

  const ddKey = champ.id              // 例: "Aatrox"
  const name = champ.name             // 例: "エイトロックス"
  const imageFile = champ.image.full  // 例: "Aatrox.png"

  const iconUrl = `https://ddragon.leagueoflegends.com/cdn/${version}/img/champion/${imageFile}`

  const sql = `
insert into champions (key, name, icon_url)
values ('${escapeSql(ddKey)}', '${escapeSql(name)}', '${escapeSql(iconUrl)}')
on conflict (key) do update
  set name = excluded.name,
      icon_url = excluded.icon_url;`.trim()

  lines.push(sql)
}

const output = lines.join('\n')

fs.writeFileSync(path.join(__dirname, 'champions-seed.sql'), output, 'utf8')

console.log('champions-seed.sql を生成しました')
