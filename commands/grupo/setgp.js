export default {
  command: ['setgpname'],
  category: 'grupo',
  isAdmin: true,
  botAdmin: true,
  run: async ({client, m, args}) => {
    const newName = args.join(' ').trim()

    if (!newName)
      return m.reply('🐲 Por favor, ingrese el nuevo nombre que desea ponerle al grupo.')

    try {
      await client.groupUpdateSubject(m.chat, newName)
      m.reply(`🐉 El nombre del grupo se modificó correctamente. (✿❛◡❛)`)
    } catch {
      m.reply(msgglobal)
    }
  },
};
