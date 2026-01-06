import fetch from 'node-fetch';
import https from 'https'; // IMPORTANTE: Necesario para forzar IPv4

// --- CONFIGURACIÓN DE API ---
const R34_USER_ID = "5592834";
const R34_API_KEY = "8ba37eaec9cf4a215f62ebc95d122b1649f1037c70e0a962ad73c22afdbe32fec66e4991dc5d0c628850df990b81eb14f422a6d92c4275e1ab3a9e5beba9f857";
// ---------------------------

// 1. CONFIGURACIÓN DEL AGENTE (ESTO SOLUCIONA EL ERROR DE CONEXIÓN)
// Forzamos al bot a usar IPv4 y a ignorar errores SSL menores
const httpsAgent = new https.Agent({
    rejectUnauthorized: false,
    keepAlive: true,
    family: 4 // <--- ESTO ES LA CLAVE: Obliga a usar IPv4
});

// 2. CABECERAS COMPLETAS
// Añadimos 'Referer' para que Rule34 crea que venimos de su propia web
const headers = { 
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
    "Referer": "https://rule34.xxx/", 
    "Accept": "*/*",
    "Connection": "keep-alive"
};

const handler = async (m, { conn, args, usedPrefix, command }) => {
    if (!db.data.chats[m.chat].nsfw && m.isGroup) {
        return m.reply(`*⚠️ El contenido NSFW está desactivado en este grupo.*`);
    }

    if (!args || args.length === 0) {
        return m.reply(`*❌ Falta la etiqueta.*\nEjemplo:\n*${usedPrefix + command} rule34*`);
    }

    const tags = args.join('+');
    const displayTags = args.join(', ');
    const apiUrl = `https://api.rule34.xxx/index.php?page=dapi&s=post&q=index&tags=${tags}&json=1&limit=10&user_id=${R34_USER_ID}&api_key=${R34_API_KEY}`;

    try {
        await m.react('⏳');

        // Petición a la API (Búsqueda)
        const response = await fetch(apiUrl, { headers, agent: httpsAgent });
        const textResponse = await response.text();

        if (textResponse.includes("<error>") || textResponse.trim() === "") {
            await m.react('❌');
            return m.reply(`❌ La API de Rule34 no respondió.`);
        }

        let posts;
        try {
            posts = JSON.parse(textResponse);
        } catch (e) {
            await m.react('❌');
            return m.reply(`❌ Error interno de datos.`);
        }

        if (!posts || posts.length === 0) {
            await m.react('❌');
            return m.reply(`⚠️ No encontré nada sobre: *${displayTags}*`);
        }

        // Barajar y seleccionar 4
        for (let i = posts.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [posts[i], posts[j]] = [posts[j], posts[i]];
        }
        const selectedPosts = posts.slice(0, 4);

        m.reply(`🔞 Descargando ${selectedPosts.length} archivos de: *${displayTags}*...`);

        const finalMediaArray = [];

        // DESCARGA SECUENCIAL CON AGENTE HTTPS
        for (const post of selectedPosts) {
            try {
                const imageUrl = post.file_url;
                if (!imageUrl) continue;

                // Usamos el agente aquí para la descarga del video/imagen
                const mediaResponse = await fetch(imageUrl, { 
                    headers, 
                    agent: httpsAgent,
                    timeout: 30000 // 30 segundos máximo por archivo
                });

                if (!mediaResponse.ok) {
                    console.log(`Fallo descarga: ${mediaResponse.statusText}`);
                    continue;
                }

                const arrayBuffer = await mediaResponse.arrayBuffer();
                const buffer = Buffer.from(arrayBuffer);

                const extension = imageUrl.split('.').pop().toLowerCase();
                const videoExtensions = ['mp4', 'webm', 'mov'];
                
                if (videoExtensions.includes(extension)) {
                    finalMediaArray.push({ video: buffer, mimetype: 'video/mp4' });
                } else {
                    finalMediaArray.push({ image: buffer, mimetype: 'image/jpeg' });
                }

            } catch (e) {
                console.error(`Error descargando archivo: ${e.message}`);
            }
        }

        if (finalMediaArray.length === 0) {
             await m.react('❌');
             return m.reply(`❌ Fallo total. El servidor bloqueó la descarga de los videos.`);
        }

        // ENVÍO SECUENCIAL
        const captionText = `🔞 *Rule34 Album* \n🏷️ Tags: ${displayTags}`;

        for (let i = 0; i < finalMediaArray.length; i++) {
            let msgOptions = finalMediaArray[i];
            if (i === 0) msgOptions.caption = captionText;
            await conn.sendMessage(m.chat, msgOptions, { quoted: m });
        }

        await m.react('✅');

    } catch (e) {
        console.error(e);
        await m.react('❌');
    }
};

handler.help = ['rule34 <tag>'];
handler.command = ['rule34', 'r34'];
handler.tags = ['nsfw'];

export default handler;
