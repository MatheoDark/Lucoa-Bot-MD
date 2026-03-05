import { proto, generateWAMessageFromContent } from '@whiskeysockets/baileys'

export default {
  command: ['testbtn'],
  category: 'utils',
  run: async ({ client, m }) => {
    const jid = m.chat

    // ==== TEST A: buttonsMessage (formato antiguo) ====
    try {
      const msgA = generateWAMessageFromContent(jid, proto.Message.fromObject({
        buttonsMessage: {
          contentText: 'TEST A: buttonsMessage antiguo',
          footerText: 'Lucoa Bot',
          headerType: 1,
          buttons: [
            { buttonId: '#ping', buttonText: { displayText: '🏓 Ping' }, type: 1 },
            { buttonId: '#menu', buttonText: { displayText: '📋 Menu' }, type: 1 },
            { buttonId: '#help', buttonText: { displayText: '❓ Help' }, type: 1 }
          ]
        }
      }), { userJid: client.user.id, quoted: m })
      await client.relayMessage(jid, msgA.message, { messageId: msgA.key.id })
      console.log('[testbtn] TEST A sent OK')
    } catch (e) {
      console.error('[testbtn] TEST A error:', e.message)
      await client.sendMessage(jid, { text: '❌ Test A error: ' + e.message })
    }

    // ==== TEST B: listMessage (formato lista) ====
    try {
      const msgB = generateWAMessageFromContent(jid, proto.Message.fromObject({
        listMessage: {
          title: 'TEST B: Lista de opciones',
          description: 'Selecciona una categoría',
          buttonText: '📋 Ver categorías',
          listType: 1,
          footerText: 'Lucoa Bot',
          sections: [
            {
              title: 'Categorías',
              rows: [
                { title: '🐉 Info', description: 'Comandos de información', rowId: '#menu info' },
                { title: '💰 Economía', description: 'Comandos de economía', rowId: '#menu economia' },
                { title: '🎲 Gacha', description: 'Comandos gacha', rowId: '#menu gacha' }
              ]
            }
          ]
        }
      }), { userJid: client.user.id, quoted: m })
      await client.relayMessage(jid, msgB.message, { messageId: msgB.key.id })
      console.log('[testbtn] TEST B sent OK')
    } catch (e) {
      console.error('[testbtn] TEST B error:', e.message)
      await client.sendMessage(jid, { text: '❌ Test B error: ' + e.message })
    }

    // ==== TEST C: sendMessage con buttons (API alto nivel) ====
    try {
      await client.sendMessage(jid, {
        text: 'TEST C: sendMessage con buttons',
        footer: 'Lucoa Bot',
        buttons: [
          { buttonId: '#ping', buttonText: { displayText: '🏓 Ping' }, type: 1 },
          { buttonId: '#menu', buttonText: { displayText: '📋 Menu' }, type: 1 }
        ],
        headerType: 1
      }, { quoted: m })
      console.log('[testbtn] TEST C sent OK')
    } catch (e) {
      console.error('[testbtn] TEST C error:', e.message)
      await client.sendMessage(jid, { text: '❌ Test C error: ' + e.message })
    }

    // ==== TEST D: sendMessage con list sections (API alto nivel) ====
    try {
      await client.sendMessage(jid, {
        text: 'TEST D: sendMessage lista',
        footer: 'Lucoa Bot',
        title: 'Menú',
        buttonText: '📋 Ver opciones',
        sections: [
          {
            title: 'Categorías',
            rows: [
              { title: '🐉 Info', rowId: '#menu info' },
              { title: '💰 Economía', rowId: '#menu economia' }
            ]
          }
        ]
      }, { quoted: m })
      console.log('[testbtn] TEST D sent OK')
    } catch (e) {
      console.error('[testbtn] TEST D error:', e.message)
      await client.sendMessage(jid, { text: '❌ Test D error: ' + e.message })
    }

    // ==== TEST E: Poll (encuesta como botones) ====
    try {
      await client.sendMessage(jid, {
        poll: {
          name: 'TEST E: ¿Qué categoría ver?',
          values: ['🐉 Info', '💰 Economía', '🎲 Gacha', '🌸 Anime', '📥 Descargas'],
          selectableCount: 1
        }
      }, { quoted: m })
      console.log('[testbtn] TEST E sent OK')
    } catch (e) {
      console.error('[testbtn] TEST E error:', e.message)
      await client.sendMessage(jid, { text: '❌ Test E error: ' + e.message })
    }

    // ==== TEST F: buttonsMessage con viewOnce wrap ====
    try {
      const msgF = generateWAMessageFromContent(jid, {
        viewOnceMessage: {
          message: {
            buttonsMessage: proto.Message.ButtonsMessage.create({
              contentText: 'TEST F: buttons en viewOnce',
              footerText: 'Lucoa Bot',
              headerType: 1,
              buttons: [
                { buttonId: '#ping', buttonText: { displayText: '🏓 Ping' }, type: 1 },
                { buttonId: '#menu', buttonText: { displayText: '📋 Menu' }, type: 1 }
              ]
            })
          }
        }
      }, { userJid: client.user.id, quoted: m })
      await client.relayMessage(jid, msgF.message, { messageId: msgF.key.id })
      console.log('[testbtn] TEST F sent OK')
    } catch (e) {
      console.error('[testbtn] TEST F error:', e.message)
      await client.sendMessage(jid, { text: '❌ Test F error: ' + e.message })
    }

    await client.sendMessage(jid, { text: '✅ 6 tests enviados (A-F). ¿Cuáles muestran botones?' }, { quoted: m })
  }
}
