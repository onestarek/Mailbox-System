const { SlashCommandBuilder, EmbedBuilder, SlashCommandStringOption, client, quote, Client } = require('discord.js');
const dbConnect = require('../../utils.js').dbConnect;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('blacklist')
        .setDescription('Nadaje Blackliste')
        .addSubcommand(subcommand =>
            subcommand
                .setName('nadaj')
                .setDescription('Nadaj Blackliste')
                .addStringOption(new SlashCommandStringOption().setName('id').setDescription('Wpisz ID użytkownika').setRequired(true))
                .addStringOption(new SlashCommandStringOption().setName('powod').setDescription('Wypisz Powód Blacklisty').setRequired(false))
                .addStringOption(new SlashCommandStringOption().setName('datakonca').setDescription('Wypisz do kiedy Blacklista').setRequired(false))
            )
        .addSubcommand(subcommand =>
            subcommand
                .setName('zdejmij')
                .setDescription('Zdejmij Blackliste')
                .addStringOption(new SlashCommandStringOption().setName('id').setDescription('Wpisz ID Blacklisty').setRequired(true))
            )
        .addSubcommand(subcommand =>
            subcommand
                .setName('sprawdz')
                .setDescription('Sprawdź Czy osoba jest na Blacklistcie')
                .addStringOption(new SlashCommandStringOption().setName('id').setDescription('Wpisz ID użytkownika').setRequired(true))
            )
        .addSubcommand(subcommand =>
            subcommand
                .setName('lista')
                .setDescription('Zobacz blackliste')
            ),
    async execute(interaction,client) {
        const subcommand = interaction.options.getSubcommand();
        const userRoles = interaction.guild.members.cache.get(interaction.member.id).roles.cache;
        const guwno = userRoles.values();
        switch (subcommand){
            case 'lista':
                if(!interaction.member.roles.cache.has('1290886027652894730')){
                    const unauthorizedEmbed = new EmbedBuilder()
                    .setColor('Red')
                    .setTitle('Nieautoryzowana próba użycia komendy')
                    .setDescription(`Użytkownik ${interaction.user} próbował użyć komendy \`${interaction.commandName}\`, nie posiadając wymaganej roli.`)
                    .setTimestamp();

                    await interaction.client.channels.cache.get('1290893750620520478').send({ embeds: [unauthorizedEmbed] });
                    return await interaction.reply({ content: 'Nie masz uprawnień do używania tej komendy.', ephemeral: true });
                }
                await interaction.deferReply({ephemeral:true});
                let string = '';
                const embed = new EmbedBuilder()
                await new Promise(async (resolve, reject) => {
                    const db = await dbConnect();
                    db.query('SELECT * FROM blacklist ORDER BY blacklistid', async (err, results) => {
                        if (err) return reject(err);
                        if (results.length > 0) {
                            const strings = results.map((row) => {
                                const date = new Date(row.data);
                                const formattedDate = `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
                                return `[${row.blacklistid}] ${row.discordid} otrzymał BlackListe do dnia ${formattedDate} z powodem "\`${row.powod}\`" od ${row.przezkogo}`;
                            });
                            const finalString = strings.join('\n\n');
                            string = finalString;
                            embed.setDescription(`${string}`).setColor('Red')
                            resolve(string)
                        } else {
                            string = 'Brak Danych w Bazie Danych'
                            embed.setDescription(`${string}`).setColor('Green')
                            resolve(string);
                        }
                        db.end();
                    });
                });
                await interaction.editReply({ embeds: [embed], ephemeral: true });
                break
            case 'sprawdz':
                if(!interaction.member.roles.cache.has('1290885898749214743')){
                    const unauthorizedEmbed = new EmbedBuilder()
                    .setColor('Red')
                    .setTitle('Nieautoryzowana próba użycia komendy')
                    .setDescription(`Użytkownik ${interaction.user} próbował użyć komendy \`${interaction.commandName}\`, nie posiadając wymaganej roli.`)
                    .setTimestamp();

                    await interaction.client.channels.cache.get('1290893750620520478').send({ embeds: [unauthorizedEmbed] });
                    return await interaction.reply({ content: 'Nie masz uprawnień do używania tej komendy.', ephemeral: true });
                }
                await interaction.deferReply();
                const userId = interaction.options.getString('id')
                const status = await new Promise(async (resolve, reject) => {
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
                if(status == false){
                    const embed = new EmbedBuilder()
                    .setColor('Green')
                    .setDescription(`Ten użytkownik nie posiada BlackListy`)
                    return await interaction.editReply({embeds:[embed],ephemeral:true})
                } else {
                    const embed = new EmbedBuilder()
                    .setColor('Red')
                    .addFields([
                        {name:"ID Blacklisty",content:`${status.blacklistid}`},
                        {name:"ID Użytkownika",content:`${status.discordid}`},
                        {name:"Powód",content:`${status.powod}`},
                        {name:"Do Kiedy",content:`${status.dokiedy}`},
                        {name:"Kto Nadał",content:`${status.przezkogo}`},
                    ])
                    return await interaction.editReply({embeds:[embed],ephemeral:true})
                }
            case 'nadaj':
                if(!interaction.member.roles.cache.has('1290885898749214743')){
                    const unauthorizedEmbed = new EmbedBuilder()
                    .setColor('Red')
                    .setTitle('Nieautoryzowana próba użycia komendy')
                    .setDescription(`Użytkownik ${interaction.user} próbował użyć komendy \`${interaction.commandName}\`, nie posiadając wymaganej roli.`)
                    .setTimestamp();

                    await interaction.client.channels.cache.get('1290893750620520478').send({ embeds: [unauthorizedEmbed] });
                    return await interaction.reply({ content: 'Nie masz uprawnień do używania tej komendy.', ephemeral: true });
                }
                await interaction.deferReply({ephemeral: true});
                const id = interaction.options.getString('id');
                const enddata = interaction.options.getString('datakonca') ?? "31/12/2999";
                const powod = interaction.options.getString('powod') ?? "Decyzja Wystawiającego";

                function convertDateFormat(date) {
                    const [day, month, year] = date.split('/').map(str => {
                        const num = Number(str);
                        return isNaN(num) ? null : num;
                    });
    
                    if (!day || !month || !year) {
                        throw new Error('Invalid date format');
                    }
    
                    return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
                }
    
                if (!enddata) {
                    throw new Error('Missing date values');
                }
    
                let urlopend;
                try {
                    urlopend = new Date(convertDateFormat(enddata));
                } catch (error) {
                    const debil = new EmbedBuilder()
                    .setColor('#ff0000')
                    // .setFooter({ text: `Uruchomione przez: ${interaction.user.tag}` })
                    .setTimestamp()
                    .setDescription(
                        `**Niepoprawny format daty!**\nWpisz date w formacie DD/MM/YYYY!`
                    )
                    return interaction.editReply({embeds: [debil], ephemeral: true})
                }
    
                let endDay = urlopend.getDate();
                endDay = endDay < 10 ? '0' + endDay : endDay;
                let endMonth = urlopend.getMonth() + 1;
                endMonth = endMonth < 10 ? '0' + endMonth : endMonth;
                let endYear = urlopend.getFullYear();

                let datakonca = endDay+"/"+endMonth+"/"+endYear;
                let datakoncasql = endYear+"-"+endMonth+"-"+endDay;

                const guild = await client.guilds.fetch('971110072220532816')
                if (!guild.members.cache.has(id)) {
                    return interaction.editReply({ content: `Użytkownik <@${id}> nie jest członkiem tego serwera.`, ephemeral: true });
                }
                
                const user = await guild.members.fetch(id)

                const db = await dbConnect();
                await new Promise(async (resolve, reject) => {
                    db.query('SELECT * FROM blacklist WHERE discordid = ?', [user.id], async (err,results) => {
                        if (err){
                            reject()
                            throw err;
                        }
                        if(results.length>0){
                            return interaction.editReply({content:"Ta osoba ma już blackliste!"})
                        }
                        db.query('INSERT INTO blacklist (discordid,powod,dokiedy,przezkogo,data) VALUES (?,?,?,?,?)', [user.id,powod,datakoncasql,interaction.user.username,new Date()], async (err,results) => {
                            if (err){
                                reject()
                                throw err;
                            }
                            setTimeout(async () => {
                                await db.query('SELECT * FROM blacklist WHERE discordid = ?', [user.id], async (err,results)=>{
                                    if (err){
                                        reject()
                                        throw err;
                                    }
                                    const a = results[0]
                                    const listaid = a.blacklistid
                                    const powodsql = a.powod
                                    const dokiedysql = a.dokiedy
                                    const dokiedy = new Date(dokiedysql).toISOString().slice(0, 19).replace('T', ' ')
                                    const embeddm = new EmbedBuilder()
                                        .setTitle('Otrzymałeś Blackliste.')
                                        .setColor('Red')
                                        .addFields([
                                            {name:"ID Blacklisty",value:`${listaid}`},
                                            {name:"Powód", value:`${powodsql}`},
                                            {name:"Do Kiedy", value: `${dokiedy}`},
                                        ])
                                        .setTimestamp();
                                    await user.send({embeds:[embeddm],content:`<@${user.id}>`});
                                    const embedadm = new EmbedBuilder()
                                        .setTitle('Wystawiono Blackliste')
                                        .setColor('Red')
                                        .addFields([
                                            {name:"ID Blacklisty",value:`${listaid}`},
                                            {name:"Kto Otrzymał", value:`${user.user.username} (${user.id})`},
                                            {name:"Kto Wystawił", value:`${interaction.user.username} (${interaction.member.id})`},
                                            {name:"Powód", value:`${powodsql}`},
                                            {name:"Do Kiedy", value: `${dokiedy}`},
                                        ])
                                        .setTimestamp();
                                    const embedpotwierdzenie = new EmbedBuilder()
                                        .setDescription('Pomyślnie wystawiono blackliste.')
                                        .setColor('Green')
                                    await interaction.editReply({embeds:[embedpotwierdzenie]});
                                    const admdc = await client.guilds.fetch('1287072838804705361');
                                    await admdc.channels.cache.get('1291624073943842869').send({embeds:[embedadm]});
                                    resolve()
                                    db.end();
                                })
                            }, 1000);
                        })
                    })
                })

                // await interaction.editReply({content: "https://media.discordapp.net/attachments/1021840342481375274/1228006207093211217/hamster-hamsters.gif"})
                break
            case 'zdejmij':
                if(!interaction.member.roles.cache.has('1290885898749214743')){
                    const unauthorizedEmbed = new EmbedBuilder()
                    .setColor('Red')
                    .setTitle('Nieautoryzowana próba użycia komendy')
                    .setDescription(`Użytkownik ${interaction.user} próbował użyć komendy \`${interaction.commandName}\`, nie posiadając wymaganej roli.`)
                    .setTimestamp();

                    await interaction.client.channels.cache.get('1290893750620520478').send({ embeds: [unauthorizedEmbed] });
                    return await interaction.reply({ content: 'Nie masz uprawnień do używania tej komendy.', ephemeral: true });
                }
                await interaction.deferReply({ephemeral: true});

                const blacklistid = interaction.options.getString('id');

                const db2 = await dbConnect();
                await new Promise(async (resolve,reject) => {
                    db2.query('SELECT * FROM blacklist WHERE blacklistid = ?', [blacklistid], async (err,results) => {
                        if (err){
                            reject()
                            db2.end()
                            throw err;
                        }
                        if (!results){
                            reject()
                            db2.end()
                            return interaction.editReply({content:`Nie odnaleziono BlackListy o ID ${blacklistid}`});
                        } else {
                            await db2.query(`DELETE FROM blacklist WHERE blacklistid = ?`, [blacklistid], async (err, results) => {
                                if (err) {
                                    reject()
                                    db2.end()
                                    throw err;
                                } else {
                                    await interaction.editReply({content:`Pomyślnie usunięto blacklistę o ID ${blacklistid}`})
                                    db2.end()
                                }
                            });
                        }
                    })
                })

                break

            default:
                return
        }

    },
};
