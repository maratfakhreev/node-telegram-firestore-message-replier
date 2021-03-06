## node-telegram-firestore-message-replier

[![Build Status](https://travis-ci.org/maratfakhreev/node-telegram-firestore-message-replier.svg?branch=master)](https://travis-ci.org/maratfakhreev/node-telegram-firestore-message-replier)

Node module which allows the bot to reply to a random message in the chat.

You just set the probability between 1 and 100 and then the magic happens.

### Install:

```bash
npm install node-telegram-firestore-message-replier
```

### Use:

[First create your own firestore db instance](https://console.firebase.google.com)

node-telegram-firestore-message-replier initially works with [node-telegram-bot-api](https://github.com/yagop/node-telegram-bot-api).

```javascript
const TelegramBot = require('node-telegram-bot-api');
const TelegramFirestoreMessageReplier = require('node-telegram-firestore-message-replier');

// initialize
const bot = new TelegramBot('BOT_TOKEN');
const replier = new TelegramFirestoreMessageReplier({
  bot,
  firestore: {
    credential: require('./serviceKey.json'),
    databaseUrl: 'https://YOUR_FIREBASE_URL.firebaseio.com',
    docPath: 'collection/chats'
  },
  showChanceMessage: 'Current chance is CURRENT_CHANCE%',
  setChanceMessage: 'Current chance changed from CURRENT_CHANCE% to NEXT_CHANCE%'
  // CURRENT_CHANCE and NEXT_CHANCE strings will be replaced with currentChance and nextChance values
});

// on command "/chance" will show current chance value
bot.onText(/^\/chance($|@)/, msg => {
  replier.showChance(msg);
});

// on command "/setchance 30" will set chance value to 30% to reply to the message
// command "/setchance" without value is equal to "/chance". So you can use only one command in your bot
bot.onText(/^\/chance(@.* )?(.+)?/, (msg, match) => {
  const chanceValue = match[2];

  replier.setChance(msg, chanceValue);
});

// handle each message to be ready for replying
bot.on('message', msg => {
  // process() method calculates chance for message of being replied and calls one of the callbacks
  // the chance is set previously via "/setchance <value>" command
  replier.process(
    msg,
    repliedMsg => {
      // success callback. Do something with lucky message
      bot.sendMessage(repliedMsg.chat.id, repliedMsg);
    },
    repliedMsg => {
      // error callback [optional]. Do something with unlucky message if you want
    }
  );
});
```

### Options:

```javascript
new TelegramFirestoreMessageReplier({
  bot: <your bot instance> // previously created bot via node-telegram-bot-api
  firestore: <object> // firestore db instance params
  showChanceMessage: <string> // set message for show chance command
  setChanceMessage: <string> // set message for change chance command
});
```
