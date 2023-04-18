// import { getChatGPTReply as getReply } from '../chatgpt/index.js'
import { getOpenAiReply as getReply } from '../openai/index.js'
import { botName, roomWhiteList, aliasWhiteList } from '../../config.js'

/**
 * 默认消息发送
 * @param msg
 * @param bot
 * @returns {Promise<void>}
 */
export async function defaultMessage(msg, bot) {
  const contact = msg.talker() // 发消息人
  const receiver = msg.to() // 消息接收人
  const content = msg.text() // 消息内容
  const room = msg.room() // 是否是群消息
  const roomName = (await room?.topic()) || null // 群名称
  const remarkName = await contact.alias() // 备注名称
  const name = await contact.name() // 微信名称
  const isText = msg.type() === bot.Message.Type.Text // 消息类型是否为文本
  const isRoom = roomWhiteList.includes(roomName) && content.includes(`${botName}`) // 是否在群聊白名单内并且艾特了机器人
  const isAlias = aliasWhiteList.includes(remarkName) || aliasWhiteList.includes(name) // 发消息的人是否在联系人白名单内
  const isBotSelf = botName === remarkName || botName === name // 是否是机器人自己
  if (isText && !isBotSelf) {
    const msgTime = new Date(msg.date()).getTime();
    // 超过一分钟以上的消息不加入逻辑，防止重启服务时发送过多消息
    if (Math.abs(msgTime - Date.now()) > 1000 * 60 * 2) return;
    const trimed = content.substr(0)
    // 区分群聊和私聊
    if (isRoom && room) {
      try {
        console.log('🚀🚀🚀 / room', trimed)
        await room.say(await getReply(trimed.replace(`${botName}`, '')))
        return
      } catch (error) {
        console.log(error)
        room.say('gpt助手离线')
      }
    }
    // 私人聊天，白名单内的直接发送
    if (isAlias && !room) {
      try {
        console.log('🚀🚀🚀 / talk', trimed)
        const res = await getReply(trimed)
        await contact.say(res)
      } catch (e) {
        console.error(e)
        contact.say('gpt助手离线')
      }
    }
  }
}

/**
 * 分片消息发送
 * @param message
 * @param bot
 * @returns {Promise<void>}
 */
export async function shardingMessage(message, bot) {
  const talker = message.talker()
  const isText = message.type() === bot.Message.Type.Text // 消息类型是否为文本
  if (talker.self() || message.type() > 10 || (talker.name() === '微信团队' && isText)) {
    return
  }
  const text = message.text()
  const room = message.room()
  if (!room) {
    console.log(`Chat GPT Enabled User: ${talker.name()}`)
    const response = await getChatGPTReply(text)
    await trySay(talker, response)
    return
  }
  let realText = splitMessage(text)
  // 如果是群聊但不是指定艾特人那么就不进行发送消息
  if (text.indexOf(`${botName}`) === -1) {
    return
  }
  realText = text.replace(`${botName}`, '')
  const topic = await room.topic()
  const response = await getChatGPTReply(realText)
  const result = `${realText}\n ---------------- \n ${response}`
  await trySay(room, result)
}

// 分片长度
const SINGLE_MESSAGE_MAX_SIZE = 500

/**
 * 发送
 * @param talker 发送哪个  room为群聊类 text为单人
 * @param msg
 * @returns {Promise<void>}
 */
async function trySay(talker, msg) {
  const messages = []
  let message = msg
  while (message.length > SINGLE_MESSAGE_MAX_SIZE) {
    messages.push(message.slice(0, SINGLE_MESSAGE_MAX_SIZE))
    message = message.slice(SINGLE_MESSAGE_MAX_SIZE)
  }
  messages.push(message)
  for (const msg of messages) {
    await talker.say(msg)
  }
}

/**
 * 分组消息
 * @param text
 * @returns {Promise<*>}
 */
async function splitMessage(text) {
  let realText = text
  if (item.length > 1) {
    realText = item[item.length - 1]
  }
  return realText
}
