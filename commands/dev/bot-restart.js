const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('restart')
        .setDescription('[Dev] Restartowanie Bota'),
    async execute(interaction, client) {

        if (!interaction.member.roles.cache.has('1287073371879772252')) {
            if (!interaction.replied) {
                return interaction.reply({ content: 'Nie masz uprawnień do używania tej komendy.', ephemeral: true });
            }
            return;
        }

        try {
            if (interaction.replied) {
                return;
            }

            await interaction.reply('Bot zostanie teraz wyłączony.');

            const logEmbed = new EmbedBuilder()
                .setColor('Green')
                .setTitle('Bot Zrestartowany')
                .setDescription(`Bot został zrestartowany przez <@${interaction.user.id}>.`)
                .setTimestamp();

            const logChannel = interaction.client.channels.cache.get('1287622131999313991');
            if (logChannel) {
                logChannel.send({ embeds: [logEmbed] });
            }
            setTimeout(()=>(
                interaction.client.destroy(),
                process.exit(0)
            ),500)
        } catch (error) {
            console.error(error);
            if (!interaction.replied) {
                await interaction.reply({ content: 'Wystąpił błąd podczas próby wyłączenia bota.', ephemeral: true });
            }
        }
    },
};
