export const commands = [
    // --- 🌸 Anime & Reacciones ---
    {"name": "angry", "alias": [], "category": "anime", "desc": "Estar molesto."},
    {"name": "bleh", "alias": [], "category": "anime", "desc": "Saca la lengua."},
    {"name": "bored", "alias": [], "category": "anime", "desc": "Aburrido."},
    {"name": "kiss", "alias": [], "category": "anime", "desc": "Besar."},
    {"name": "clap", "alias": [], "category": "anime", "desc": "Aplaudir."},
    {"name": "hug", "alias": [], "category": "anime", "desc": "Abrazar."},
    {"name": "pat", "alias": [], "category": "anime", "desc": "Acariciar."},
    {"name": "punch", "alias": [], "category": "anime", "desc": "Golpear."},
    {"name": "slap", "alias": [], "category": "anime", "desc": "Abofetear."},
    {"name": "kill", "alias": [], "category": "anime", "desc": "Matar."},
    {"name": "cute", "alias": ["kawaii"], "category": "anime", "desc": "Tierno."},
    
    // (Agregué los demás de anime resumidos para no hacer la lista eterna, el formato es el mismo)
    {"name": "dance", "alias": [], "category": "anime", "desc": "Bailar."},
    {"name": "cry", "alias": [], "category": "anime", "desc": "Llorar."},
    {"name": "laugh", "alias": [], "category": "anime", "desc": "Reír."},

    // --- 🔎 Búsquedas ---
    {"name": "imagen", "alias": ["img", "image"], "category": "search", "desc": "Google Imágenes."},
    {"name": "pinterest", "alias": ["pin"], "category": "search", "desc": "Buscar en Pinterest."},
    {"name": "aptoide", "alias": ["apk", "apkdl"], "category": "search", "desc": "Descargar Apps."},
    {"name": "ytsearch", "alias": ["yts"], "category": "search", "desc": "Buscar en YouTube."},
    {"name": "tiktoksearch", "alias": ["ttsearch", "tsearch"], "category": "search", "desc": "Buscar en TikTok."},
    {"name": "tts", "alias": ["texttospeech"], "category": "search", "desc": "Texto a voz."},

    // --- 📥 Descargas ---
    {"name": "play", "alias": ["play2", "mp3", "mp4", "ytmp3", "ytmp4"], "category": "download", "desc": "YouTube Música/Video."},
    {"name": "tiktok", "alias": ["tt", "ttdl", "tiktokdl"], "category": "download", "desc": "Descargar TikTok."},
    {"name": "instagram", "alias": ["ig", "igdl", "instadl"], "category": "download", "desc": "Descargar Instagram."},
    {"name": "facebook", "alias": ["fb"], "category": "download", "desc": "Descargar Facebook."},
    {"name": "twitter", "alias": ["x", "xtt", "xtwitter"], "category": "download", "desc": "Descargar X/Twitter."},
    {"name": "spotify", "alias": ["spot"], "category": "download", "desc": "Descargar Spotify."},
    {"name": "mediafire", "alias": ["mf"], "category": "download", "desc": "Mediafire."},
    {"name": "mega", "alias": ["mg"], "category": "download", "desc": "Mega."},
    {"name": "drive", "alias": ["gdrive"], "category": "download", "desc": "Google Drive."},
    {"name": "gitclone", "alias": ["git"], "category": "download", "desc": "Clonar GitHub."},

    // --- 💰 Economía ---
    {"name": "balance", "alias": ["bal"], "category": "economia", "desc": "Ver dinero."},
    {"name": "steal", "alias": ["rob", "robar"], "category": "economia", "desc": "Robar a usuario."},
    {"name": "crime", "alias": ["crimen"], "category": "economia", "desc": "Cometer crimen."},
    {"name": "work", "alias": ["w", "trabajar"], "category": "economia", "desc": "Trabajar."},
    {"name": "mine", "alias": ["minar"], "category": "economia", "desc": "Minar XP/Coins."},
    {"name": "slut", "alias": [], "category": "economia", "desc": "Trabajo +18."},
    {"name": "givecoins", "alias": ["pay", "darplata", "transfer"], "category": "economia", "desc": "Transferir dinero."},
    {"name": "deposit", "alias": ["dep", "d"], "category": "economia", "desc": "Depositar en banco."},
    {"name": "withdraw", "alias": ["with", "retirar"], "category": "economia", "desc": "Retirar del banco."},
    {"name": "daily", "alias": ["diario"], "category": "economia", "desc": "Recompensa diaria."},
    {"name": "weekly", "alias": ["semanal"], "category": "economia", "desc": "Recompensa semanal."},
    {"name": "monthly", "alias": ["mensual"], "category": "economia", "desc": "Recompensa mensual."},
    {"name": "coinflip", "alias": ["cf", "flip"], "category": "economia", "desc": "Cara o Cruz."},
    {"name": "roulette", "alias": ["rt", "ruleta"], "category": "economia", "desc": "Apostar Ruleta."},
    {"name": "ppt", "alias": [], "category": "economia", "desc": "Piedra Papel Tijera."},
    {"name": "waittimes", "alias": ["cooldowns", "einfo"], "category": "economia", "desc": "Ver tus tiempos."},
    {"name": "economyboard", "alias": ["baltop", "eboard"], "category": "economia", "desc": "Top Millonarios."},

    // --- 🎲 Gacha ---
    {"name": "rw", "alias": ["roll", "rollwaifu", "rf"], "category": "gacha", "desc": "Girar Ruleta Waifu."},
    {"name": "claim", "alias": ["c", "buy"], "category": "gacha", "desc": "Reclamar Waifu."},
    {"name": "harem", "alias": ["miswaifus", "claims"], "category": "gacha", "desc": "Tu colección."},
    {"name": "character", "alias": ["charinfo", "cinfo"], "category": "gacha", "desc": "Info de personaje."},
    {"name": "sell", "alias": ["vender"], "category": "gacha", "desc": "Vender personaje."},
    {"name": "trade", "alias": ["cambiar"], "category": "gacha", "desc": "Intercambiar."},
    {"name": "givewaifu", "alias": ["darrw", "givechar", "regalar"], "category": "gacha", "desc": "Regalar personaje."},
    {"name": "vote", "alias": ["votar"], "category": "gacha", "desc": "Votar por personaje."},
    {"name": "waifusboard", "alias": ["toprw", "waifustop"], "category": "gacha", "desc": "Top Coleccionistas."},

    // --- 👥 Grupo ---
    {"name": "kick", "alias": ["ban", "echar"], "category": "grupo", "desc": "Expulsar."},
    {"name": "promote", "alias": ["admin", "daradmin"], "category": "grupo", "desc": "Dar Admin."},
    {"name": "demote", "alias": ["quitaradmin"], "category": "grupo", "desc": "Quitar Admin."},
    {"name": "tag", "alias": ["hidetag", "notificar"], "category": "grupo", "desc": "Mencionar a todos."},
    {"name": "link", "alias": ["enlace"], "category": "grupo", "desc": "Link del grupo."},
    {"name": "groupinfo", "alias": ["gp", "infogrupo"], "category": "grupo", "desc": "Info del grupo."},
    {"name": "delete", "alias": ["del"], "category": "grupo", "desc": "Borrar mensaje."},
    {"name": "warn", "alias": ["advertir"], "category": "grupo", "desc": "Advertir usuario."},
    {"name": "on", "alias": ["welcome", "antilink", "nsfw", "autolevel"], "category": "grupo", "desc": "Activar funciones."},
    {"name": "off", "alias": [], "category": "grupo", "desc": "Desactivar funciones."},
    {"name": "seticon", "alias": ["setgppfp"], "category": "grupo", "desc": "Cambiar foto grupo."},
    {"name": "setname", "alias": ["setgpname"], "category": "grupo", "desc": "Cambiar nombre grupo."},

    // --- 🧠 IA ---
    // AQUÍ ESTÁ LA FUSIÓN QUE PEDISTE:
    {"name": "ia", "alias": ["chatgpt", "gpt", "lucoa"], "category": "ia", "desc": "Chat con Lucoa."},
    {"name": "dalle", "alias": ["iaimg", "genimg", "aiimage"], "category": "ia", "desc": "Generar Imagen."},
    {"name": "aigensfw", "alias": ["nsfwaigen", "pornogen", "ainsfw"], "category": "ia", "desc": "Imagen +18."},

    // --- ℹ️ Información ---
    {"name": "menu", "alias": ["help", "comandos", "menú"], "category": "info", "desc": "Ver menú."},
    {"name": "owner", "alias": ["creador", "contacto"], "category": "info", "desc": "Contacto dueño."},
    {"name": "infobot", "alias": ["status", "infosocket"], "category": "info", "desc": "Estado del bot."},
    {"name": "ping", "alias": ["p", "velocidad"], "category": "info", "desc": "Ver Ping."},
    {"name": "report", "alias": ["reporte"], "category": "info", "desc": "Reportar error."},
    {"name": "invite", "alias": ["invitar"], "category": "info", "desc": "Invitar bot."},

    // --- 🔞 NSFW ---
    {"name": "rule34", "alias": ["r34"], "category": "nsfw", "desc": "Rule34."},
    {"name": "danbooru", "alias": ["dbooru"], "category": "nsfw", "desc": "Danbooru."},
    {"name": "xvideos", "alias": ["xnxx"], "category": "nsfw", "desc": "Buscar videos."},
    {"name": "hentai", "alias": [], "category": "nsfw", "desc": "Imagen Hentai."},
    {"name": "pack", "alias": ["cum", "tetas", "culo", "pene"], "category": "nsfw", "desc": "Packs random."},

    // --- 👤 Perfil ---
    {"name": "profile", "alias": ["perfil"], "category": "profile", "desc": "Ver perfil."},
    {"name": "level", "alias": ["lvl"], "category": "profile", "desc": "Ver nivel."},
    {"name": "marry", "alias": ["casarse"], "category": "profile", "desc": "Casarse."},
    {"name": "divorce", "alias": ["divorcio"], "category": "profile", "desc": "Divorciarse."},
    {"name": "setbio", "alias": ["setdesc", "setdescription"], "category": "profile", "desc": "Cambiar descripción."},

    // --- 🤖 Sub-Bots ---
    {"name": "bots", "alias": ["sockets"], "category": "sockets", "desc": "Lista sub-bots."},
    {"name": "qr", "alias": ["code", "jadibot"], "category": "sockets", "desc": "Ser sub-bot."},
    {"name": "stop", "alias": ["logout", "clearsubs"], "category": "sockets", "desc": "Apagar sub-bot."},

    // --- 🛠️ Utilidades ---
    {"name": "sticker", "alias": ["s"], "category": "utils", "desc": "Crear Sticker."},
    {"name": "toimg", "alias": ["img"], "category": "utils", "desc": "Sticker a Imagen."},
    {"name": "tourl", "alias": ["upload"], "category": "utils", "desc": "Subir a internet."},
    {"name": "hd", "alias": ["remini", "upscale"], "category": "utils", "desc": "Mejorar calidad."},
    {"name": "get", "alias": [], "category": "utils", "desc": "Ver código fuente."},
    {"name": "exec", "alias": ["$"], "category": "utils", "desc": "Terminal (Dueño)."}
]
