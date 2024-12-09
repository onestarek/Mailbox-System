const { PermissionsBitField } = require('discord.js');
const { Events, ActivityType, EmbedBuilder, ChannelType } = require('discord.js');
const cron = require('node-cron')
module.exports = {
	name: Events.ClientReady,
	once: true,
	async execute(client) {
		console.log(`Ready! Logged in as ${client.user.tag}`);

        const onembed = new EmbedBuilder()
            .setTitle('Bot uruchomiony')
            .setDescription('Bot został ponownie uruchomiony.')
            .setColor('Green')
            .setTimestamp()
        client.channels.cache.get('1287622131999313991').send({embeds: [onembed]})

        client.user.setPresence({
            status: 'online',
            activities: [{
                type: ActivityType.Playing,
                name: '📩 Aby otworzyć ticket, napisz do mnie!',
            }]
        });
        cron.schedule('0 0 * * *', () => {
            client.destroy(),
            process.exit(0)
        });
    }
}