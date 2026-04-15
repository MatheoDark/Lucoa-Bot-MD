import fs from 'fs';

const STATS_FILE = './lib/rw-stats.json'

const loadStats = () => {
  try {
    if (fs.existsSync(STATS_FILE)) {
      return JSON.parse(fs.readFileSync(STATS_FILE, 'utf-8'))
    }
  } catch (e) {
    console.log(`[RW-Stats] Error cargando: ${e.message}`)
  }
  return {}
}

const formatBytes = (bytes) => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return (bytes / Math.pow(k, i)).toFixed(2) + ' ' + sizes[i]
}

export default {
  command: ['rwstats', 'rwestats', 'gacharoll-stats'],
  category: 'gacha',
  run: async ({client, m, args}) => {
    try {
      const stats = loadStats()
      
      if (Object.keys(stats).length === 0) {
        return m.reply('📊 Aún no hay estadísticas disponibles. ¡Usa /rw para empezar! (◕ᴗ◕✿)')
      }

      // Ordenar por rolls descendentes
      const sorted = Object.entries(stats)
        .sort((a, b) => b[1].rolls - a[1].rolls)
        .slice(0, 20)  // Top 20

      let texto = `╭─── 📊 RW ESTADÍSTICAS ⋆✨⋆
│
`

      for (let i = 0; i < sorted.length; i++) {
        const [name, data] = sorted[i]
        const successRate = data.rolls > 0 
          ? ((data.successfulImages / data.rolls) * 100).toFixed(1) 
          : 0
        
        texto += `│ ${String(i + 1).padStart(2, ' ')}. *${name}*
│     🎲 Rolls: ${data.rolls} | ✅ Éxito: ${successRate}%
│     📥 Datos: ${formatBytes(data.totalDataDownloaded)}
│     ⏰ Último: ${new Date(data.lastRoll).toLocaleDateString('es-ES')}
│
`
      }

      const totalStats = Object.values(stats).reduce((acc, curr) => ({
        totalRolls: acc.totalRolls + curr.rolls,
        totalSuccesses: acc.totalSuccesses + curr.successfulImages,
        totalFailures: acc.totalFailures + curr.failedImages,
        totalData: acc.totalData + curr.totalDataDownloaded,
      }), { totalRolls: 0, totalSuccesses: 0, totalFailures: 0, totalData: 0 })

      const globalRate = totalStats.totalRolls > 0 
        ? ((totalStats.totalSuccesses / totalStats.totalRolls) * 100).toFixed(1)
        : 0

      texto += `╰─── ⋆✨⋆ ───
│
│ 📈 ESTADÍSTICAS GLOBALES:
│ 🎲 Total Rolls: ${totalStats.totalRolls}
│ ✅ Éxitos: ${totalStats.totalSuccesses} (${globalRate}%)
│ ❌ Fallos: ${totalStats.totalFailures}
│ 📊 Datos descargados: ${formatBytes(totalStats.totalData)}
│
╰─ 🐉 Powered by MatheoDark
`

      await m.reply(texto)

    } catch (e) {
      console.error('[RW-Stats] Error:', e.message)
      m.reply('🐲 Error al cargar estadísticas. (╥﹏╥)')
    }
  },
};
