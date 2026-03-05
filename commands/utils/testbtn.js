import { proto, generateWAMessageFromContent } from '@whiskeysockets/baileys'

export default {
  command: ['testbtn'],
  category: 'utils',
  run: async ({ client, m }) => {
    const jid = m.chat

    // ==== TEST 1: viewOnceMessage (approach actual) ====
    try {
      const msg1 = generateWAMessageFromContent(jid, {
        viewOnceMessage: {
          message: {
            messageContextInfo: { deviceListMetadata: {}, deviceListMetadataVersion: 2 },
            interactiveMessage: proto.Message.InteractiveMessage.create({
              body: proto.Message.InteractiveMessage.Body.create({ text: 'TEST 1: viewOnceMessage' }),
              footer: proto.Message.InteractiveMessage.Footer.create({ text: 'footer' }),
              header: proto.Message.InteractiveMessage.Header.create({ hasMediaAttachment: false }),
              nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.create({
                buttons: [
                  { name: 'quick_reply', buttonParamsJson: JSON.stringify({ display_text: 'Ping', id: '#ping' }) }
                ]
              })
            })
          }
        }
      }, { userJid: client.user.id, quoted: m })
      await client.relayMessage(jid, msg1.message, { messageId: msg1.key.id })
      console.log('[testbtn] TEST 1 sent OK')
    } catch (e) {
      console.error('[testbtn] TEST 1 error:', e.message)
      await client.sendMessage(jid, { text: '❌ Test 1 error: ' + e.message })
    }

    // ==== TEST 2: viewOnceMessageV2 ====
    try {
      const msg2 = generateWAMessageFromContent(jid, {
        viewOnceMessageV2: {
          message: {
            messageContextInfo: { deviceListMetadata: {}, deviceListMetadataVersion: 2 },
            interactiveMessage: proto.Message.InteractiveMessage.create({
              body: proto.Message.InteractiveMessage.Body.create({ text: 'TEST 2: viewOnceMessageV2' }),
              footer: proto.Message.InteractiveMessage.Footer.create({ text: 'footer' }),
              header: proto.Message.InteractiveMessage.Header.create({ hasMediaAttachment: false }),
              nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.create({
                buttons: [
                  { name: 'quick_reply', buttonParamsJson: JSON.stringify({ display_text: 'Ping V2', id: '#ping' }) }
                ]
              })
            })
          }
        }
      }, { userJid: client.user.id, quoted: m })
      await client.relayMessage(jid, msg2.message, { messageId: msg2.key.id })
      console.log('[testbtn] TEST 2 sent OK')
    } catch (e) {
      console.error('[testbtn] TEST 2 error:', e.message)
      await client.sendMessage(jid, { text: '❌ Test 2 error: ' + e.message })
    }

    // ==== TEST 3: fromObject sin proto.create ====
    try {
      const msg3 = generateWAMessageFromContent(jid, proto.Message.fromObject({
        viewOnceMessage: {
          message: {
            messageContextInfo: { deviceListMetadata: {}, deviceListMetadataVersion: 2 },
            interactiveMessage: {
              body: { text: 'TEST 3: fromObject + viewOnce' },
              footer: { text: 'footer' },
              header: { hasMediaAttachment: false },
              nativeFlowMessage: {
                buttons: [
                  { name: 'quick_reply', buttonParamsJson: JSON.stringify({ display_text: 'Ping obj', id: '#ping' }) }
                ]
              }
            }
          }
        }
      }), { userJid: client.user.id, quoted: m })
      await client.relayMessage(jid, msg3.message, { messageId: msg3.key.id })
      console.log('[testbtn] TEST 3 sent OK')
    } catch (e) {
      console.error('[testbtn] TEST 3 error:', e.message)
      await client.sendMessage(jid, { text: '❌ Test 3 error: ' + e.message })
    }

    // ==== TEST 4: con newsletter contextInfo ====
    try {
      const msg4 = generateWAMessageFromContent(jid, {
        viewOnceMessage: {
          message: {
            messageContextInfo: { deviceListMetadata: {}, deviceListMetadataVersion: 2 },
            interactiveMessage: proto.Message.InteractiveMessage.create({
              body: proto.Message.InteractiveMessage.Body.create({ text: 'TEST 4: con newsletter' }),
              footer: proto.Message.InteractiveMessage.Footer.create({ text: 'footer' }),
              header: proto.Message.InteractiveMessage.Header.create({ hasMediaAttachment: false }),
              nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.create({
                buttons: [
                  { name: 'quick_reply', buttonParamsJson: JSON.stringify({ display_text: 'Ping NL', id: '#ping' }) }
                ]
              }),
              contextInfo: {
                forwardingScore: 999,
                isForwarded: true,
                forwardedNewsletterMessageInfo: {
                  newsletterJid: '120363423354513567@newsletter',
                  serverMessageId: -1,
                  newsletterName: 'Test'
                }
              }
            })
          }
        }
      }, { userJid: client.user.id, quoted: m })
      await client.relayMessage(jid, msg4.message, { messageId: msg4.key.id })
      console.log('[testbtn] TEST 4 sent OK')
    } catch (e) {
      console.error('[testbtn] TEST 4 error:', e.message)
      await client.sendMessage(jid, { text: '❌ Test 4 error: ' + e.message })
    }

    // ==== TEST 5: interactiveMessage directo SIN viewOnce ====
    try {
      const msg5 = generateWAMessageFromContent(jid, {
        interactiveMessage: proto.Message.InteractiveMessage.create({
          body: proto.Message.InteractiveMessage.Body.create({ text: 'TEST 5: sin viewOnce' }),
          footer: proto.Message.InteractiveMessage.Footer.create({ text: 'footer' }),
          header: proto.Message.InteractiveMessage.Header.create({ hasMediaAttachment: false }),
          nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.create({
            buttons: [
              { name: 'quick_reply', buttonParamsJson: JSON.stringify({ display_text: 'Directo', id: '#ping' }) }
            ]
          })
        })
      }, { userJid: client.user.id, quoted: m })
      await client.relayMessage(jid, msg5.message, { messageId: msg5.key.id })
      console.log('[testbtn] TEST 5 sent OK')
    } catch (e) {
      console.error('[testbtn] TEST 5 error:', e.message)
      await client.sendMessage(jid, { text: '❌ Test 5 error: ' + e.message })
    }

    await client.sendMessage(jid, { text: '✅ Todos los tests enviados. ¿Cuáles muestran botones?' }, { quoted: m })
  }
}
