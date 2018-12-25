const { random, remove, unionWith, get } = require('lodash');
const firebase = require('firebase-admin');

module.exports = class TelegramFirestoreMessageReplier {
  constructor(options) {
    firebase.initializeApp({
      credential: firebase.credential.cert(options.firestore.credential),
      databaseURL: options.firestore.databaseUrl,
    });

    this.firestore = firebase.firestore();
    this.firestore.settings({ timestampsInSnapshots: true });

    this.bot = options.bot;
    this.storage = this.firestore.doc(options.firestore.docPath || 'collection/chats');
    this.showChanceMessage = options.showChanceMessage || 'Current chance is CURRENT_CHANCE%';
    this.setChanceMessage = options.setChanceMessage || 'Current chance changed from CURRENT_CHANCE% to NEXT_CHANCE%';
  }

  async showChance(msg) {
    const chatId = msg.chat.id;
    const currentChance = await this.getCurrentChance(chatId);

    this.bot.sendMessage(chatId, this.handleMessage(this.showChanceMessage, currentChance));
  }

  async setChance(msg, value) {
    const chatId = msg.chat.id;
    const chance = parseInt(value);

    if (isNaN(chance)) {
      const currentChance = await this.getCurrentChance(chatId);

      return this.bot.sendMessage(chatId, this.handleMessage(this.showChanceMessage, currentChance));
    }

    this.saveChance(chatId, chance);
  }

  async process(msg, successCb, errorCb = () => {}) {
    const chatId = msg.chat.id;
    const currentChatIndex = await this.getChatIndex(chatId);

    if (!successCb || typeof successCb !== 'function') {
      throw new Error('Specify success callback that handles replied message as second parameter of process function');
    }

    if (currentChatIndex > -1) {
      const chat = await this.getChat(currentChatIndex);

      if (random(1, 100) <= chat.chance) {
        successCb(msg);
      } else {
        errorCb(msg);
      }
    } else {
      errorCb(msg);
    }
  }

  handleMessage(msg, currentChance = null, nextChance = null) {
    let newMsg = msg;

    if (currentChance !== null) newMsg = newMsg.replace(/CURRENT_CHANCE/g, currentChance);
    if (nextChance !== null) newMsg = newMsg.replace(/NEXT_CHANCE/g, nextChance);

    return newMsg;
  }

  async saveChance(chatId, nextChance) {
    if (nextChance > 100) nextChance = 100;

    const currentChance = await this.getCurrentChance(chatId);

    this.bot.sendMessage(chatId, this.handleMessage(this.setChanceMessage, currentChance, nextChance));

    if (nextChance === 0) {
      this.removeChat(chatId);
    } else {
      this.pushChat({ chatId, chance: nextChance });
    }
  }

  async getCurrentChance(chatId) {
    const currentChatIndex = await this.getChatIndex(chatId);

    if (currentChatIndex > -1) {
      const chat = await this.getChat(currentChatIndex);

      return chat.chance;
    }

    return 0;
  }

  async getChats() {
    const chats = await this.storage.get();

    return get(chats.data(), 'ids', []);
  }

  setChats(chats) {
    this.storage.set({ ids: chats });
  }

  async getChat(index) {
    const chat = await this.getChats();

    return chat[index];
  }

  async getChatIndex(chatId) {
    const chats = await this.getChats();
    const chat = chats.filter(chat => chat.chatId === chatId)[0];

    return chats.indexOf(chat);
  }

  async removeChat(chatId) {
    const chats = await this.getChats();

    remove(chats, item => item.chatId === chatId);
    this.setChats(chats);
  }

  async pushChat(data) {
    const chats = await this.getChats();
    const unionChats = unionWith([data], chats, (a, b) => a.chatId === b.chatId);

    this.setChats(unionChats);
  }
};
