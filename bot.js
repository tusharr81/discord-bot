const { Client, GatewayIntentBits } = require('discord.js');
const axios = require('axios');
require('dotenv').config(); // For environment variables

// Create a new client instance
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,              // To interact with guilds (servers)
    GatewayIntentBits.GuildMessages,       // To listen for message events
    GatewayIntentBits.MessageContent       // To read the content of messages
  ]
});

// Cooldown map to limit users spamming commands
const cooldowns = new Map();

// When the bot is ready, run this code once
client.once('ready', () => {
  console.log('Bot is online!');
});

// Function to check if user is on cooldown
const isOnCooldown = (userId) => {
  const now = Date.now();
  const cooldownAmount = 3000; // 3 seconds cooldown

  if (cooldowns.has(userId)) {
    const expirationTime = cooldowns.get(userId) + cooldownAmount;
    if (now < expirationTime) {
      return expirationTime - now;
    }
  }
  cooldowns.set(userId, now);
  return false;
};

// Listen to messages
client.on('messageCreate', async (message) => {
  // Ignore messages from bots
  if (message.author.bot) return;

  // Check if the message starts with '!ask'
  if (message.content.startsWith('!ask')) {
    const query = message.content.replace('!ask', '').trim();

    // Check for cooldown
    const cooldownTime = isOnCooldown(message.author.id);
    if (cooldownTime) {
      return message.reply(`Please wait ${(cooldownTime / 1000).toFixed(1)} more seconds before asking again.`);
    }

    try {
      // Send request to OpenAI API
      console.log('Sending query to OpenAI:', query);
      
      const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: 'gpt-3.5-turbo',
          messages: [{ role: 'user', content: query }],
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          },
        }
      );

      // Send the AI's response to the Discord channel
      const reply = response.data.choices[0].message.content;
      console.log('Received reply from OpenAI:', reply);
      message.reply(reply);

    } catch (error) {
      // Enhanced error logging and handling
      console.error('Error while sending request:', error.message);

      if (error.response) {
        console.error('OpenAI API error details:', error.response.data);

        if (error.response.status === 429) {
          message.reply('Rate limit reached. Please try again later.');
        } else if (error.response.status === 403) {
          message.reply('Quota exceeded or invalid API key.');
        } else {
          message.reply('An error occurred with the OpenAI API. Please try again.');
        }
      } else {
        message.reply('A network error occurred. Please check your connection.');
      }
    }
  }
});

// Log in to Discord with your app's token
client.login(process.env.DISCORD_TOKEN);
