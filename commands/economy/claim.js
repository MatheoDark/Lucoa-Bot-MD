import { claimDrop } from '../../lib/drops.js'

export default {
  command: ['drop', 'recoger', 'atrapar', 'grab'],
  category: 'rpg',
  run: async ({ client, m }) => {

    // Solo funciona en grupos
    if (!m.isGroup) return m.reply('❌ Este comando solo funciona en grupos.')

    const chatData = global.db.data.chats[m.chat] || {}
    if (chatData.adminonly || !chatData.rpg) {
      return m.reply(`✎ Los comandos de economía están desactivados en este grupo.`)
    }

    await claimDrop(client, m)
  }
}
