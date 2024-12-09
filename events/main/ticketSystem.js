const { Events, ChannelType, PermissionsBitField, EmbedBuilder,StringSelectMenuBuilder,StringSelectMenuOptionBuilder,ActionRowBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const dbConnect = require('../../utils').dbConnect;
const axios = require('axios')
const AdmZip = require('adm-zip');
const userMessages = new Map();
module.exports = {
    name: Events.MessageCreate,
    async execute(message, client) {
        if (message.author.bot) return;
    
        if (message.channel.type === ChannelType.DM) {
            const discordUserId = message.author.id;
            let status = await checkIfBlacklisted(discordUserId)
            if (status) {
                return;
            }
            const db = await dbConnect();
            db.query('SELECT * FROM users WHERE discord_id = ?', [discordUserId], async (err, result) => {
                if (err) throw err;
    
                if (result.length === 0) {
                    db.query('INSERT INTO users (discord_id) VALUES (?)', [discordUserId], async (insertErr) => {
                        if (insertErr) throw insertErr;
                        userMessages.set(discordUserId, message.content);
                        promptCategorySelection(message,discordUserId,client).then(()=>{console.log('wysłane (ale dopiero nowe dane w DB)')});
                    });
                } else {
                    const user = result[0];
    
                    if (user.current_ticket) {
                        db.query('SELECT * FROM tickets WHERE id = ? AND status = "open"', [user.current_ticket], (ticketErr, ticketResult) => {
                            if (ticketErr) throw ticketErr;
    
                            if (ticketResult.length > 0) {
                                sendToExistingTicket(user.current_ticket, message, message.content, client, message.author);
                            } else {
                                userMessages.set(discordUserId, message.content);
                                promptCategorySelection(message,discordUserId,client).then(()=>{console.log('wysłane (kolega ma zamknięty ticket)')});;
                            }
                        });
                    } else {
                        userMessages.set(discordUserId, message.content);
                        promptCategorySelection(message,discordUserId,client).then(()=>{console.log('wysłane (kolega nie ma ticketu)')});;
                    }
                }
            });
        } else if (message.channel.type === ChannelType.GuildText) {
            handleAdminResponse(message, client);
        }      
    },
};

async function promptCategorySelection(message, discordUserId, client) {
    console.log('dostałem')
    const categoryMessage = await message.reply({
        content: 'Wybierz kategorię ticketa, reagując odpowiednią emoji:\n\n' +
                '🆘: Pomoc\n' +
                '📢: Report\n' +
                '📝: Odwołanie\n' +
                '⚔️: CK\n' +
                '🏢: Sprawa do Zarządu'
    });

    // Dodaj emoji jako reakcje do wiadomości
    await categoryMessage.react('🆘');
    await categoryMessage.react('📢');
    await categoryMessage.react('📝');
    await categoryMessage.react('⚔️');
    await categoryMessage.react('🏢');

    const filter = (reaction, user) => {
        return !user.bot && user.id === discordUserId;
    };

    const collector = categoryMessage.createReactionCollector({ filter, max: 1, time: 60000 });

    collector.on('collect', async (reaction, user) => {
        let prefix;
        let kat;
        if (reaction.emoji.name === '🆘') {
            prefix = 'pomoc-';
            kat = "Pomoc";
            await reaction.message.delete();
        } else if (reaction.emoji.name === '📢') {
            prefix = 'report-';
            kat = "Report";
            await reaction.message.delete();
        } else if (reaction.emoji.name === '📝') {
            prefix = 'odwolanie-';
            kat = "Odwołanie";
            await reaction.message.delete();
        } else if (reaction.emoji.name === '⚔️') {
            prefix = 'ck-';
            kat = "CK";
            await reaction.message.delete();
        } else if (reaction.emoji.name === '🏢') {
            prefix = 'zarzad-';
            kat = "Sprawa Do Zarządu"
            await reaction.message.delete();
        } else {
            return;
        }

        const userMessage = userMessages.get(discordUserId);

        if (!userMessage) {
            await message.reply('Nie znaleziono wiadomości użytkownika, spróbuj ponownie.');
            return;
        }

        await createNewTicket(discordUserId, userMessage, message, client, prefix);

        userMessages.delete(discordUserId);

        await message.reply(`Wybrałeś kategorię: ${kat}.`);
    });

    collector.on('end', collected => {
        if (collected.size === 0) {
            message.reply('Czas na wybór kategorii upłynął. Proszę spróbuj ponownie.');
            message.reactions.removeAll();
        }
    });
}

async function createNewTicket(discordUserId, messageContent, message, client, prefix) {
    const db = await dbConnect();
    const guild = await client.guilds.fetch('1287072838804705361');
    guild.channels.create({
        name: `${prefix}-${message.author.username}`,
        topic: `${message.author.id}`,
        type: ChannelType.GuildText,
        parent: '1287074634402893875',
        permissionOverwrites: [
            {
                id: guild.roles.everyone.id,
                deny: [PermissionsBitField.Flags.ViewChannel],
            },
        ],
    }).then(async channel => {
        switch(prefix){
            case "pomoc-":
                await channel.permissionOverwrites.set([
                    {
                        id: guild.roles.everyone.id,
                        deny: [PermissionsBitField.Flags.ViewChannel],
                    },
                    {
                        id: '1287858908509241456',
                        allow: [PermissionsBitField.Flags.SendMessages],
                    },{
                        id: '1287858908509241456',
                        allow: [PermissionsBitField.Flags.ViewChannel],
                    }
                ]);
                break;
            case "report-":
                await channel.permissionOverwrites.set([
                    {
                        id: guild.roles.everyone.id,
                        deny: [PermissionsBitField.Flags.ViewChannel],
                    },
                    {
                        id: '1287858858517205028',
                        allow: [PermissionsBitField.Flags.SendMessages],
                    },
                    {
                        id: '1287858858517205028',
                        allow: [PermissionsBitField.Flags.ViewChannel],
                    }
                ]);

                break;
            case "odwolanie-":
                await channel.permissionOverwrites.set([
                    {
                        id: guild.roles.everyone.id,
                        deny: [PermissionsBitField.Flags.ViewChannel],
                    },
                    {
                        id: '1287988619830886442',
                        allow: [PermissionsBitField.Flags.SendMessages],
                    },
                    {
                        id: '1287988619830886442',
                        allow: [PermissionsBitField.Flags.ViewChannel],
                    }
                ]);

                break;
            case "ck-":
                await channel.permissionOverwrites.set([
                    {
                        id: guild.roles.everyone.id,
                        deny: [PermissionsBitField.Flags.ViewChannel],
                    },
                    {
                        id: '1287858716544077966',
                        allow: [PermissionsBitField.Flags.SendMessages],
                    },
                    {
                        id: '1287858716544077966',
                        allow: [PermissionsBitField.Flags.ViewChannel],
                    }
                ]);

                break;
            case "zarzad-":
                await channel.permissionOverwrites.set([
                    {
                        id: guild.roles.everyone.id,
                        deny: [PermissionsBitField.Flags.ViewChannel],
                    },
                    {
                        id: '1287858937114263653',
                        allow: [PermissionsBitField.Flags.SendMessages],
                    },
                    {
                        id: '1287858937114263653',
                        allow: [PermissionsBitField.Flags.ViewChannel],
                    }
                ]);

                break;
            default:
                return;
        }
        db.query('INSERT INTO tickets (user_id, channel_id, typticketa, status) VALUES ((SELECT id FROM users WHERE discord_id = ?), ?, ?, "open")', 
        [discordUserId, channel.id, prefix.replace('-','')], async (ticketErr, ticketResult) => {
            if (ticketErr) throw ticketErr;
            const admTutorialEmbed = new EmbedBuilder()
            .setTitle('Tutorial dla Administracji')
            .setColor('Red')
            .setDescription(`\`!\` - Odpowiadacie Anonimowo\n\`$\` - Odpowiadacie ze swoim nickiem\n\`%\` - Zamykacie Ticket`)
            
            const messageEmbed = new EmbedBuilder()
            .setTitle(`Wiadomość od ${message.author.displayName} (${message.author.id})`)
            .setDescription(`${message.content}`)
            .setColor('Green')
            if (message.content && message.content.trim().length > 0) {
                messageEmbed.setDescription(message.content);
            } else {
                messageEmbed.setDescription('Brak treści wiadomości');
            }

            const ticketId = ticketResult.insertId;

            db.query('UPDATE users SET current_ticket = ? WHERE discord_id = ?', [ticketId, discordUserId], async (updateErr) => {
                if (updateErr) throw updateErr;
                await channel.send({embeds: [admTutorialEmbed]})
                if (message.attachments.size > 0) {
                    const attachmentsArray = Array.from(message.attachments.values());
                    if (message.content && message.content.trim().length > 0){
                        await channel.send({ embeds: [messageEmbed] }).catch(console.error);
                        await channel.send({ content: `${message.author.displayName} przesłał załącznik:`, files: attachmentsArray}).catch(console.error);
                    } else {
                        await channel.send({ content: `${message.author.displayName} przesłał załącznik:`, files: attachmentsArray}).catch(console.error);
                    }
                } else {
                    channel.send({ embeds: [messageEmbed] }).catch(console.error);
                }
                const embed = new EmbedBuilder()
                .setColor(0x00bfff)
                .setTitle('🎫 Nowy Ticket Zgłoszony')
                .setDescription('Dziękujemy za zgłoszenie! Poniżej znajdziesz szczegóły swojego ticketa.')
                .addFields(
                    { name: '📌 Numer Ticketa', value: `#${ticketId}`, inline: true },
                    { name: '⏳ Maksymalny czas odpowiedzi', value: 'Do 14 dni roboczych', inline: true },
                    { name: '📂 Status', value: 'Otwarty', inline: true }
                )
                .setTimestamp()
                .setFooter({ text: 'Prosimy o cierpliwość podczas oczekiwania na odpowiedź.' });
                await message.author.send({embeds:[embed]})
            });
        });
    }).catch(console.error);
}

async function sendToExistingTicket(ticketId, message, messageContent, client, author) {
    const db = await dbConnect();
    db.query('SELECT channel_id FROM tickets WHERE id = ?', [ticketId], async (err, result) => {
        if (err) throw err;
        const messageEmbed = new EmbedBuilder()
        .setTitle(`Wiadomość od ${author.displayName} (${author.id})`)
        .setColor('Green')
        if (messageContent && messageContent.trim().length > 0) {
            messageEmbed.setDescription(messageContent);
        } else {
            messageEmbed.setDescription('Brak treści wiadomości');
        }
        const channelId = result[0].channel_id;
        const channel = client.channels.cache.get(channelId);

        if (channel) {
            if (message.attachments.size > 0) {
                const attachmentsArray = Array.from(message.attachments.values());
                if (messageContent && messageContent.trim().length > 0){
                    await channel.send({ embeds: [messageEmbed] }).catch(console.error);
                    await channel.send({ content: `${message.author.displayName} przesłał załącznik:`, files: attachmentsArray}).catch(console.error);
                } else {
                    await channel.send({ content: `${message.author.displayName} przesłał załącznik:`, files: attachmentsArray}).catch(console.error);
                }
            } else {
                channel.send({ embeds: [messageEmbed] }).catch(console.error);
            }
        } else {
            console.log('Kanał nie został znaleziony');
        }
        db.end();
    });
}

const ticketClosingCache = new Set();

async function handleAdminResponse(message, client) {
    const prefixAnonymous = "!";
    const prefixIdentified = "$";
    const prefixClose = "%";

    if (message.content.startsWith(prefixAnonymous) || message.content.startsWith(prefixIdentified)) {
        const responsePrefix = message.content.startsWith(prefixAnonymous) ? prefixAnonymous : prefixIdentified;
        const response = message.content.slice(responsePrefix.length).trim();
        const ticketId = await getTicketIdFromChannel(message.channel.id, client);
        
        const db = await dbConnect();
        if (ticketId) {
            db.query('SELECT discord_id FROM users WHERE current_ticket = ?', [ticketId], async (err, result) => {
                if (err) throw err;
        
                if (result.length > 0) {
                    const userDiscordId = result[0].discord_id;
                    const guild = client.guilds.cache.get('971110072220532816');
        
                    if (!guild) {
                        console.error("Nie znaleziono serwera!");
                        return;
                    }
        
                    try {
                        const member = await guild.members.fetch(userDiscordId).catch(() => null);
                        if (!member) {
                            console.log(`Użytkownik ${userDiscordId} nie znajduje się na serwerze.`);
                            await message.react('❌');
                            await message.channel.send({
                                content: "Użytkownik nie jest na serwerze lub opuścił serwer."
                            });
                            return;
                        }

                        const attachments = message.attachments.size > 0 ? message.attachments.map(attachment => attachment.url) : [];
    
                        if (attachments.length > 0) {
                            await member.send({
                                content: `**Odpowiedź Administratora${responsePrefix === prefixIdentified ? ` (${message.author.username})` : ''}:**\n ${response}`,
                                files: attachments
                            });
                        } else {
                            await member.send(`**Odpowiedź Administratora${responsePrefix === prefixIdentified ? ` (${message.author.username})` : ''}:**\n ${response}`);
                        }
    
                        message.react('✅');

                    } catch (error) {
                        console.error("Błąd podczas sprawdzania użytkownika:", error);
                        await message.channel.send({
                            content: "Wystąpił błąd podczas sprawdzania statusu użytkownika."
                        });
                    }
                }
                db.end();
            });
        }
    } else if (message.content.startsWith(prefixClose)) {
        const ticketId = await getTicketIdFromChannel(message.channel.id, client);

        if (ticketClosingCache.has(message.channel.id)) {
            console.log(`Kanał ${message.channel.id} jest już w trakcie zamykania.`);
            return;
        }
        ticketClosingCache.add(message.channel.id);

        if (ticketId) {
            try {
                await closeTicket(ticketId, message.channel, client, message);
            } finally {
                ticketClosingCache.delete(message.channel.id);
            }
        } else {
            console.error('Nie znaleziono ticketId przy próbie zamknięcia ticketa.');
            ticketClosingCache.delete(message.channel.id);
        }
    }
}

async function getTicketIdFromChannel(channelId, client) {
    return new Promise(async (resolve, reject) => {
        const db = await dbConnect();
        db.query('SELECT id FROM tickets WHERE channel_id = ?', [channelId], (err, result) => {
            if (err) return reject(err);
            if (result.length > 0) {
                resolve(result[0].id);
            } else {
                resolve(null);
            }
            db.end();
        });
    });
}
async function checkIfBlacklisted(userId) {
    return new Promise(async (resolve, reject) => {
        const db = await dbConnect();
        db.query('SELECT * FROM blacklist WHERE discordid = ?', [userId], (err, result) => {
            if (err) return reject(err);
            if (result.length > 0) {
                resolve(result[0])
            } else {
                resolve(false);
            }
            db.end();
        });
    });
}

async function closeTicket(ticketId, channel, client, message) {
    if (!ticketId) {
        console.error('ticketId jest undefined, nie można zamknąć ticketa.');
        return;
    }
    
    const messages = await channel.messages.fetch({ limit: 100 });
    let logContent = `Log zamknięcia ticketu: ${channel.name}\nOsoba zamykająca: ${message.author.username} (${message.author.id})\n\nWiadomości:\n`;
    let attachmentsFolder = path.join(__dirname, `../../logs/${channel.name}-attachments`);
    let hasAttachments = false;
    
    await Promise.all(messages.reverse().map(async (msg) => {
        logContent += `${msg.author.tag}: ${msg.content} (at ${msg.createdAt.toISOString()})\n`;
    
        if (msg.embeds.length > 0) {
            msg.embeds.forEach(embed => {
                const title = embed.title ? embed.title : "Brak tytułu";
                const description = embed.description ? embed.description : "Brak opisu";
                logContent += `Embed: ${title}:\n ${description}\n\n`;
            });
        }

        if (msg.attachments.size > 0) {
            if (!fs.existsSync(attachmentsFolder)) {
                fs.mkdirSync(attachmentsFolder, { recursive: true });
            }
            hasAttachments = true;
        
            await Promise.all(msg.attachments.map(async (attachment) => {
                const filePath = path.join(attachmentsFolder, attachment.name);
        
                try {
                    const response = await axios({
                        url: attachment.url,
                        responseType: 'stream'
                    });
        
                    await new Promise((resolve, reject) => {
                        const writer = fs.createWriteStream(filePath);
                        response.data.pipe(writer);
                        writer.on('finish', resolve);
                        writer.on('error', reject);
                    });
        
                    logContent += `Załącznik: ${attachment.name} pobrano.\n`;
                } catch (err) {
                    console.error(`Błąd podczas pobierania załącznika ${attachment.name}:`, err);
                }
            }));
        }
    }));

    const data = new Date(Date.now());
    const fileName = `${channel.name}-${data.toISOString()}.txt`;
    const logDirectory = path.join(__dirname, '../../logs');
    if (!fs.existsSync(logDirectory)) {
        fs.mkdirSync(logDirectory, { recursive: true });
    }
    const logFilePath = path.join(logDirectory, fileName);
    fs.writeFileSync(logFilePath, logContent);
    
    let zipPath = null;
    if (hasAttachments) {
        const zip = new AdmZip();
        zip.addLocalFolder(attachmentsFolder);
        zipPath = path.join(logDirectory, `${channel.name}-${data.toISOString()}.zip`);
        zip.writeZip(zipPath);
    
        await fs.promises.rm(attachmentsFolder, { recursive: true });
    }

    const db = await dbConnect();

    let ticketCreatorid = null;
    
    await new Promise((resolve, reject) => {
        db.query(
            `SELECT users.discord_id 
             FROM tickets 
             INNER JOIN users ON tickets.user_id = users.id 
             WHERE tickets.id = ?`,
            [ticketId],
            (err, results) => {
                if (err) {
                    reject(`Błąd podczas pobierania danych o twórcy ticketa: ${err}`);
                } else if (results.length === 0) {
                    reject('Nie znaleziono ticketa lub użytkownika dla podanego ID.');
                } else {
                    resolve(ticketCreatorid = results[0].discord_id);
                }
            }
        );
    });
    const guild = await client.guilds.fetch('971110072220532816');

    const ticketCreator = await guild.members.fetch(ticketCreatorid).catch(() => null);

    db.query('UPDATE tickets SET status = ?, closed_at = ? WHERE id = ?', ['closed', new Date(Date.now()), ticketId], err => {
        if (err) {
            console.error('Błąd podczas aktualizacji statusu ticketa:', err);
            throw err;
        }

        channel.send({ content: "Ticket zostanie usunięty za 5 sekund." });

        const closeinfoembed = new EmbedBuilder()
        .setColor(0x00bfff)
        .setTitle('🎫 Twój Ticket Rozwiązany')
        .setDescription('Dziękujemy za zgłoszenie! Twój Ticket został Rozwiązany.')
        .addFields(
            { name: '📌 Numer Ticketa', value: `#${ticketId}`, inline: true },
            { name: '📂 Status', value: 'Zamknięty', inline: true }
        )
        .setTimestamp()
        .setFooter({ text: 'Jeśli uważasz że nie powinien być zamknięty, napisz ponownie do mnie i otwórz nowy Ticket!' });

        setTimeout(async () => {
            if (channel) {
                channel.delete().then(async () => {
                    await ticketCreator.send({embeds:[closeinfoembed]})

                    const closeEmbed = new EmbedBuilder()
                        .setColor('Red')
                        .setTitle('Log Zamknięcia Ticketa')
                        .setDescription(`**Ticket:** ${channel.name}\n**Zamykający**: ${message.author.username} (${message.author.id})`)
                        .setTimestamp();

                    let logChannel;
                    
                    if(channel.name.includes('zarzad-')){
                        logChannel = client.channels.cache.get('1298667412731854848');
                    } else {
                        logChannel = client.channels.cache.get('1287735825949528075');
                    }

                    if (zipPath) {
                        await logChannel.send({ embeds: [closeEmbed] });
                        await logChannel.send({ files: [logFilePath, zipPath] });
                    } else {
                        await logChannel.send({ embeds: [closeEmbed], files: [logFilePath] });
                    }

                    db.end();
                }).catch((e) => { console.log('ojoj, mam wylew ' + e) });
            } else {
                return;
            }
        }, 5000);
    });
}
