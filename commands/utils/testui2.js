export default {
  command: ['testui2'],
  category: 'utils',
  run: async ({ client, m }) => {
    await client.sendMessage(
      m.chat,
      { text: '✅ testui2 ejecutado (si ves esto, el comando sí cargó)' },
      { quoted: m }
    )

    const list = {
      text: 'Elige una opción 👇',
      footer: 'Lucoa Service',
      title: 'TEST UI',
      buttonText: 'Ver opciones',
      sections: [
        {
          title: 'Opciones',
          rows: [
            { title: '🎧 Audio', description: 'MP3', rowId: '#ping' },
            { title: '🎬 Video', description: 'MP4', rowId: '#menu' }
          ]
        }
      ]
    }

    // Esto debería verse en Android y en PC (la mayoría de veces)
    await client.sendMessage(m.chat, list, { quoted: m })

    // Backup por si WhatsApp lo bloquea igual
    await client.sendMessage(
      m.chat,
      { text: 'Backup:\n🎧 #ping\n🎬 #menu' },
      { quoted: m }
    )
  }
}
