const { Events, Collection, ModalBuilder, TextInputBuilder, ActionRowBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, TextInputStyle, ChannelType, PermissionsBitField } = require('discord.js');

module.exports = {
	name: Events.InteractionCreate,
	async execute(interaction,client) {
        if (interaction.isChatInputCommand()){
		    const command = interaction.client.commands.get(interaction.commandName);

		    if (!command) {
		    	console.error(`No command matching ${interaction.commandName} was found.`);
		    	return;
		    }
            const { cooldowns } = interaction.client;

            if (!cooldowns.has(command.data.name)) {
                cooldowns.set(command.data.name, new Collection());
            }
        
            const now = Date.now();
            const timestamps = cooldowns.get(command.data.name);
            const defaultCooldownDuration = 3;
            const cooldownAmount = (command.cooldown ?? defaultCooldownDuration) * 1000;
        
            if (timestamps.has(interaction.user.id)) {
                const expirationTime = timestamps.get(interaction.user.id) + cooldownAmount;
            
                if (now < expirationTime) {
                    const expiredTimestamp = Math.round(expirationTime / 1000);
                    return interaction.reply({ content: `Poczekaj <t:${expiredTimestamp}:R> przed użyciem tej komendy ponownie.`, ephemeral: true });
                }
            }
        
            timestamps.set(interaction.user.id, now);
            setTimeout(() => timestamps.delete(interaction.user.id), cooldownAmount);
        
            try {
                if (command.data.name === 'restart' || command.data.name === 'status' || command.data.name === "blacklist") {
                    await command.execute(interaction, client);
                } else {
                    await command.execute(interaction);
                    // await interaction.client.channels.cache.get('1248371040623788272').send({content:`\`${interaction.member.displayName} (ID: ${interaction.member.id})\` użył komendy \`/${interaction.commandName}\``})
                }
            } catch (error) {
                console.log(error);
            }
        }
	},
};