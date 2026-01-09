import axios from "axios";
import yts from "yt-search";
import { createDecipheriv } from 'crypto';

function get_id(url) {
    const regex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|v\/|embed\/|user\/[^\/\n\s]+\/)?(?:watch\?v=|v%3D|embed%2F|video%2F)?|youtu\.be\/|youtube\.com\/watch\?v=|youtube\.com\/embed\/|youtube\.com\/v\/|youtube\.com\/shorts\/|youtube\.com\/playlist\?list=)([a-zA-Z0-9_-]{11})/;
    const match = url.match(regex);
    return match ? match[1] : null;
}

const audio = [92, 128, 256, 320]
const video = [144, 360, 480, 720, 1080]

const decode = (enc) => {
    try {
        const secret_key = 'C5D58EF67A7584E4A29F6C35BBC4EB12'
        const data = Buffer.from(enc, 'base64')
        const iv = data.slice(0, 16)
        const content = data.slice(16)
        const key = Buffer.from(secret_key, 'hex')
        const decipher = createDecipheriv('aes-128-cbc', key, iv) 
        let decrypted = Buffer.concat([decipher.update(content), decipher.final()])
        return JSON.parse(decrypted.toString())
    } catch (error) {
        throw new Error(error.message)
    }
}

async function savetube(link, quality, value) {
    try {
        const cdn = (await axios.get("https://media.savetube.me/api/random-cdn")).data.cdn
        const infoget = (await axios.post('https://' + cdn + '/v2/info', { 'url': link }, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Mobile Safari/537.36', 'Referer': 'https://yt.savetube.me/' }
        })).data
        const info = decode(infoget.data)
        const response = (await axios.post('https://' + cdn + '/download', {
            'downloadType': value,
            'quality': `${quality}`,
            'key': info.key
        }, {
            headers: { 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Mobile Safari/537.36', 'Referer': 'https://yt.savetube.me/' }
        })).data
        return {
            status: true,
            quality: `${quality}${value === "audio" ? "kbps" : "p"}`,
            url: response.data.downloadUrl,
            filename: `${info.title}.${value === "audio" ? "mp3" : "mp4"}`
        }
    } catch (error) {
        console.error("Error Savetube:", error.message)
        return { status: false }
    }
}

async function ytmp3(link) {
    const id = get_id(link);
    if (!id) return { status: false, message: "Link inválido" }
    try {
        let url = "https://youtube.com/watch?v=" + id
        let data = await yts(url);
        let response = await savetube(url, 128, "audio")
        return { status: true, metadata: data.all[0], download: response };
    } catch (error) { return { status: false }; }
}

async function ytmp4(link) {
    const id = get_id(link);
    if (!id) return { status: false, message: "Link inválido" }
    try {
        let url = "https://youtube.com/watch?v=" + id
        let data = await yts(url);
        let response = await savetube(url, 360, "video")
        return { status: true, metadata: data.all[0], download: response };
    } catch (error) { return { status: false }; }
}

export { ytmp3, ytmp4, get_id };
