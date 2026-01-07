import PhoneNumber from 'awesome-phonenumber';

export default {
  command: ['owner', 'creador', 'contacto'],
  category: 'info',
  run: async ({client, m}) => {
    try {
      // TU NÚMERO (Sacado de tus logs anteriores: +56 9 ...)
      const number = '56992523459' 
      
      const contact = {
        number,
        name: 'MatheoDark 🐉',
        org: 'Lucoa Bot Developer',
        email: 'matheodark@github.com', // Puedes poner tu email real si quieres
        region: 'Chile',
        website: 'https://github.com/MatheoDark/Lucoa-Bot-MD',
        note: '💎 Creador oficial de Lucoa Bot.'
      }

      const generateVCard = ({ number, name, org, email, region, website, note }) => {
        // Intentamos usar la librería, si falla usamos el número directo
        let intl = '+' + number
        try {
            const phone = new PhoneNumber('+' + number)
            if(phone.isValid()) intl = phone.getNumber('international')
        } catch (e) { }
        
        const clean = (text) => String(text).replace(/\n/g, '\\n').trim()

        return `
BEGIN:VCARD
VERSION:3.0
FN:${clean(name)}
ORG:${clean(org)}
TEL;type=CELL;waid=${number}:${intl}
EMAIL:${clean(email)}
ADR:;;${clean(region)};;;;
URL:${clean(website)}
NOTE:${clean(note)}
END:VCARD`.trim()
      }

      const vcard = generateVCard(contact)

      await client.sendMessage(m.chat, {
        contacts: {
          displayName: contact.name,
          contacts: [{ vcard, displayName: contact.name }]
        }
      }, { quoted: m })

    } catch (e) {
      console.error(e)
      await client.sendMessage(m.chat, { text: '❌ Ocurrió un error al enviar el contacto del creador.' }, { quoted: m })
    }
  }
};
    } catch (e) {
      await client.reply(m.chat, msgglobal, m)
    }
  }
};
