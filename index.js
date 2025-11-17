const { Client, Events, GatewayIntentBits, MessageFlags, ChannelType, SlashCommandBuilder, AttachmentBuilder, PermissionFlagsBits, REST, Routes, ActivityType } = require('discord.js');
const { token, clientid } = require('./config.json');
const JSZip = require("jszip");

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

const send_command = new SlashCommandBuilder()
    .setName('send')
    .setDescription('絵文字をzipにして送信します。');

const sleep = (time) => new Promise((resolve) => setTimeout(resolve, time));

client.on(Events.ClientReady, async () => {
    const data = [
        send_command.toJSON()
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
        }
    }
});

client.login(token);