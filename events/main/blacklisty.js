const { Events, ActivityType, EmbedBuilder } = require('discord.js');
const dbConnect = require('../../utils').dbConnect;

module.exports = {
    name: Events.ClientReady,
	once: true,
	async execute(client) {
        const today = new Date().toISOString().split('T')[0];
        const guild = await client.guilds.fetch('971110072220532816');
        const db = await dbConnect();
    
        db.query('SELECT * FROM blacklist WHERE dokiedy = ?', [today], async (err, results) => {
            if (err) {
                console.error(err);
                db.end();
                return;
            }
    
            for (const row of results) {
                try {
                    const member = await guild.members.fetch(row.discordid).catch(() => null);
                    
                    if (member) {
    
                        db.query(
                            'DELETE FROM blacklist WHERE discordid = ?',
                            [member.id],
                            async (err) => {
                                if (err) {
                                    console.error(err);
                                    return;
                                }
    
                                const embed = new EmbedBuilder()
                                    .setTitle('Zdjęto Blackliste')
                                    .setColor('Green')
                                    .setDescription(`Blacklista o ID ${row.blacklistid}, użytkownika \`${member.displayName} (${member.id})\` została zdjęta`)
                                    .setTimestamp();
    
                                const logChannel = client.channels.cache.get('1291624073943842869');
                                if (logChannel) {
                                    logChannel.send({
                                        embeds: [embed],
                                    });
                                }
    
                                await member.send('Twoja blacklista została automatycznie zdjęta. Możesz ponownie otworzyć ticketa do Administracji.');
                            }
                        );
                    } else {
                        db.query(
                            'UPDATE blacklist SET dokiedy = "2999-12-31" WHERE discordid = ?',
                            [row.discordid],
                            (err) => {
                                if (err) console.error(err);
                            }
                        );
                    }
                } catch (error) {
                    console.error(`Błąd przetwarzania użytkownika o ID ${row.discordid}:`, error);
                }
            }
    
            db.end();
        })
    }
}