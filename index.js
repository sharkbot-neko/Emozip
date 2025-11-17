const { Client, Events, GatewayIntentBits, MessageFlags, ChannelType, SlashCommandBuilder, AttachmentBuilder, PermissionFlagsBits, REST, Routes, ActivityType, EmbedBuilder, Colors } = require('discord.js');
const { token, clientid } = require('./config.json');
const JSZip = require("jszip");

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

const send_command = new SlashCommandBuilder()
    .setName('send')
    .setDescription('絵文字をzipにして送信します。');

const stickers_send_command = new SlashCommandBuilder()
    .setName('stickers-send')
    .setDescription('スタンプをzipにして送信します。');

const about = new SlashCommandBuilder()
    .setName('about')
    .setDescription('Botの詳細を表示します。');

const serverlist = new SlashCommandBuilder()
    .setName('serverlist')
    .setDescription('サーバーの一覧を取得します。オーナー専用。');

const echo = new SlashCommandBuilder()
    .setName('echo')
    .setDescription('このチャンネルに送信します。オーナー専用。')
    .addStringOption(option => option.setName('text').setDescription('送信する内容').setRequired(true));

const OWNERID = "1335428061541437531";

const sleep = (time) => new Promise((resolve) => setTimeout(resolve, time));

client.on(Events.ClientReady, async () => {
    const data = [
        send_command.toJSON(), stickers_send_command.toJSON(), about.toJSON(), serverlist.toJSON(), echo.toJSON()
    ];

    const rest = new REST({ version: '10' }).setToken(token);

    await rest.put(
        Routes.applicationCommands(clientid),
        { body: data },
    );

    await client.user.setActivity({ 
        name: '絵文字をダンプします。',
        type: ActivityType.Custom
    });

    console.log('起動しました。');
})

const cooldowns = new Map();
const COOLDOWN = 30;

client.on(Events.InteractionCreate, async (interaction) => {
	if (interaction.isChatInputCommand()) {
        if (interaction.commandName == "send") {
            if (!interaction.channel) return;
            if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuildExpressions)) {
                await interaction.reply({flags: [MessageFlags.Ephemeral], content: "絵文字やスタンプの管理権限が必要です。"});
                return;
            }

            if (interaction.channel.type != ChannelType.GuildText) {
                await interaction.reply({flags: [MessageFlags.Ephemeral], content: "テキストチャンネルでのみ使用できます。"});
            };
            await interaction.deferReply();

            const guild = interaction.guild;

            const now = Date.now();
            const expire = cooldowns.get(guild.id) || 0;

            if (now < expire) {
                const sec = Math.ceil((expire - now) / 1000);
                return await interaction.editReply({content: `このサーバーではまだ使用できません！\nあと **${sec} 秒** 待ってください。`});
            }

            cooldowns.set(guild.id, now + COOLDOWN * 1000);

            try {
                const emojis = guild.emojis.cache;
                if (emojis.size === 0) {
                    return await interaction.editReply({content: "このサーバーには絵文字がありません。"});
                }

                const zip = new JSZip();

                for (const emoji of emojis.values()) {
                    const url = emoji.imageURL();
                    const ext = url.endsWith(".gif") ? "gif" : "png";

                    const res = await fetch(url);
                    const buffer = Buffer.from(await res.arrayBuffer());

                    zip.file(`${emoji.name}_${emoji.id}.${ext}`, buffer);

                    await sleep(1000);
                }

                const zipData = await zip.generateAsync({ type: "nodebuffer" });

                const attachment = new AttachmentBuilder(zipData, { name: "emojis.zip" });

                
                await interaction.editReply({files: [attachment], content: "Zipを送信しました。"});
            } catch (e) {
                try {
                    await interaction.editReply({content: `エラーが発生しました。\n${e}`});
                } catch (e) {
                    return;
                }
                return;
            }
        } else if (interaction.commandName == "stickers-send") {
            if (!interaction.channel) return;
            if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuildExpressions)) {
                await interaction.reply({flags: [MessageFlags.Ephemeral], content: "絵文字やスタンプの管理権限が必要です。"});
                return;
            }

            if (interaction.channel.type != ChannelType.GuildText) {
                await interaction.reply({flags: [MessageFlags.Ephemeral], content: "テキストチャンネルでのみ使用できます。"});
            };

            await interaction.deferReply();

            const guild = interaction.guild;

            const now = Date.now();
            const expire = cooldowns.get(guild.id) || 0;

            if (now < expire) {
                const sec = Math.ceil((expire - now) / 1000);
                return await interaction.editReply({content: `このサーバーではまだ使用できません！\nあと **${sec} 秒** 待ってください。`});
            }

            cooldowns.set(guild.id, now + COOLDOWN * 1000);

            try {
                const stickers = guild.stickers.cache;
                if (stickers.size === 0) {
                    return await interaction.editReply({content: "このサーバーにはスタンプがありません。"});
                }

                const zip = new JSZip();

                for (const st of stickers.values()) {
                    const url = st.url;
                    const ext = url.endsWith(".gif") ? "gif" : "png";

                    const res = await fetch(url);
                    const buffer = Buffer.from(await res.arrayBuffer());

                    zip.file(`${st.name}_${st.id}.${ext}`, buffer);

                    await sleep(1000);
                }

                const zipData = await zip.generateAsync({ type: "nodebuffer" });

                const attachment = new AttachmentBuilder(zipData, { name: "stickers.zip" });

                
                await interaction.editReply({files: [attachment], content: "Zipを送信しました。"});
            } catch (e) {
                try {
                    await interaction.editReply({content: `エラーが発生しました。\n${e}`});
                } catch (e) {
                    return;
                }
                return;
            }
        } else if (interaction.commandName == "about") {
            await interaction.deferReply();
            const about_embed = new EmbedBuilder()
            .setTitle("えもじっぷ！の情報")
            .addFields(
                {
                    "name": "サーバー数",
                    "value": `${client.guilds.cache.size}サーバー`
                }
            )
            .setColor(
                Colors.Green
            )
            await interaction.editReply(
                {
                    embeds: [about_embed]
                }
            )
        } else if (interaction.commandName == "serverlist") {
            if (interaction.user.id != OWNERID) {
                await interaction.reply('Botオーナー専用です。')
                return;
            }

            await interaction.deferReply();

            let bot_list = [];
            client.guilds.cache.forEach(guild => {
                bot_list.push(`サーバー名: ${guild.name} (ID: ${guild.id})`)
            })

            await interaction.editReply("Botが入っているサーバーの一覧\n\n" + bot_list.join("\n"))
        } else if (interaction.commandName == "echo") {
            if (!interaction.channel) return;

            if (interaction.user.id != OWNERID) {
                await interaction.reply('Botオーナー専用です。')
                return;
            }

            if (interaction.channel.type != ChannelType.GuildText) {
                await interaction.reply({flags: [MessageFlags.Ephemeral], content: "テキストチャンネルでのみ使用できます。"});
            };

            await interaction.deferReply({
                flags: [MessageFlags.Ephemeral]
            });

            try {
                await interaction.channel.send(interaction.options.getString('text', true))

                await interaction.editReply({
                    flags: [MessageFlags.Ephemeral],
                    content: "送信しました。"
                })
            } catch {
                await interaction.editReply({
                    flags: [MessageFlags.Ephemeral],
                    content: "送信失敗です。"
                })
                return;
            }
        }
    }
});

client.login(token);