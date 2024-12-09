const { Events, PermissionsBitField, EmbedBuilder } = require('discord.js');

module.exports = {
    name: Events.MessageCreate,
    async execute(message, client) {
        const allowedServerId = '971110072220532816';
        
        if (message.guild?.id !== allowedServerId) return;

        const allowedCategories = ['1258154219224174663', '1258154280439775293', '1258154334776983593'];
        const allowedChannels = ['1297641579418353744'];
        const medalChannels = ['1258156098221772851', '1258156158661689394'];
        const youtubeChannels = ['1258156098221772851', '1258156158661689394'];
        const exemptRoles = [
            '1258164518568202340',
            '1258164520250249357',
            '1258166038823047280',
            '971545439469961237',
        ];
        const timeoutDuration = 5 * 60 * 1000;

        const generalAllowedLinks = [
            'https://media.discordapp.net/',
            'https://tenor.com/',
        ];
        const medalLinks = ['https://medal.tv/'];
        const youtubeLinks = ['https://youtube.com/'];


        const channel = message.channel;
        const categoryId = channel.parentId;
        if (
            !allowedCategories.includes(categoryId) &&
            !allowedChannels.includes(channel.id) &&
            !medalChannels.includes(channel.id) &&
            !youtubeChannels.includes(channel.id)
        ) {
            return;
        }

        if (message.author.bot) return;

        const content = message.content;
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        if (!urlRegex.test(content)) return;
        let isAllowed = false;

        if (generalAllowedLinks.some(link => content.startsWith(link))) {
            isAllowed = true;
        }

        if (medalChannels.includes(channel.id) && medalLinks.some(link => content.startsWith(link))) {
            isAllowed = true;
        }

        if (youtubeChannels.includes(channel.id) && youtubeLinks.some(link => content.startsWith(link))) {
            isAllowed = true;
        }

        if (!isAllowed) {
            const member = message.guild.members.cache.get(message.author.id);
            const hasExemptRole = exemptRoles.some(role => member.roles.cache.has(role));

            if (!hasExemptRole) {
                try {
                    const dmMessage = `Twoja wiadomość na serwerze "${message.guild.name}" została usunięta, a Ty zostałeś wyciszony na 5 minut za wysłanie niedozwolonego linku.`;
                    await member.send(dmMessage).catch(() => {
                        console.log(`Nie udało się wysłać wiadomości prywatnej do użytkownika ${message.author.tag}.`);
                    });

                    const embed = new EmbedBuilder()
                        .setColor('Red')
                        .setTitle('Naruszenie zasad - Niedozwolony link')
                        .setThumbnail(member.displayAvatarURL({ dynamic: true }))
                        .addFields(
                            { name: 'Użytkownik', value: `${member.displayName} (${member.user.username || 'Brak globalnego nicku'})`, inline: false },
                            { name: 'ID Użytkownika', value: `${member.id}`, inline: false },
                            { name: 'Kanał', value: `<#${channel.id}>`, inline: false },
                            { name: 'Treść wiadomości', value: `\`${content}\`` || 'Brak treści', inline: false },
                            { name: 'Konto utworzone', value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:F>`, inline: true },
                            { name: 'Dołączył na serwer', value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:F>`, inline: true }
                        )
                        .setFooter({ text: 'Naruszenie zasad serwera', iconURL: message.guild.iconURL({ dynamic: true }) })
                        .setTimestamp();

                    const logChannel = await client.channels.cache.get('1314230113713524786');
                    if (logChannel) {
                        await logChannel.send({ embeds: [embed] });
                    }

                    await member.timeout(timeoutDuration, 'Wysłanie niedozwolonego linku');
                    await message.delete().catch(() => null);

                } catch (err) {
                    console.error(`Nie udało się wykonać jednej z operacji:`, err);
                }
            }
        }
    },
};
