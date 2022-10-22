const { discordLink } = require('../config.json');
const { ph, addPh, getEmbed, getActionRows } = require('../api/messages');
const { keys } = require('../api/keys');
const Command = require('../structures/Command');
const { fetchCommand } = require('../api/utils');
const { ApplicationCommandOptionType, ApplicationCommandSubCommand, ApplicationCommand } = require('discord.js');

class Help extends Command {

    constructor() {
        super({
            name: 'help',
            requiresConnectedServer: false,
        });
    }

    async execute(interaction, client, args, server) {
        if(!await super.execute(interaction, client, args, server)) return;

        const settings = client.settingsConnections.cache.get(interaction.guildId);

        const commandName = args[0]?.toLowerCase();

        const helpEmbed = getEmbed(keys.commands.help.success.base, ph.std(interaction));
        if(!commandName || commandName === 'help') {
            helpEmbed.addFields(addPh(keys.commands.help.success.no_args.embeds[0].fields,
                { 'invite_link': discordLink },
                await ph.allCommands(interaction.client),
            ));
            return interaction.replyOptions({ embeds: [helpEmbed] });
        }

        let command = keys.data[commandName];
        if(!command) {
            const commands = client.commands.filter(c => c.category === commandName);

            //Show command list of category
            if(!commands.size) {
                return interaction.replyTl(keys.commands.help.warnings.command_does_not_exist, { 'command_name': commandName.cap() });
            }

            for(let command of commands.values()) {
                command = keys.data[command.name];

                helpEmbed.addFields(addPh(
                    keys.commands.help.success.category.embeds[0].fields[0],
                    await ph.commandName(command.name, interaction.client),
                    { 'command_description': command.description },
                ));
            }

            helpEmbed.addFields(addPh(
                keys.commands.help.success.category.embeds[0].fields[1],
                { 'invite_link': discordLink },
            ));

            return interaction.replyOptions({ embeds: [helpEmbed] });
        }
        else {
            const slashCommand = await fetchCommand(interaction.guild.commands, command.name);
            const commandUsage = getCommandUsage(slashCommand);

            // noinspection JSUnresolvedVariable
            helpEmbed.addFields(addPh(
                keys.commands.help.success.command.embeds[0].fields,
                ph.std(interaction),
                {
                    'command_long_description': command.long_description,
                    'command_usage': commandUsage,
                    'invite_link': discordLink,
                },
                await ph.commandName(commandName, interaction.client),
            ));

            if(settings && settings.isDisabled('commands', command.name)) {
                const enableRows = getActionRows(
                    keys.commands.help.success.enable_button,
                    { 'command_name': command.name }, ph.emojis(),
                );

                helpEmbed.setDescription(keys.commands.help.success.disabled.embeds[0].description);
                return interaction.replyOptions({ embeds: [helpEmbed], components: enableRows });
            }
            else {
                const disableRows = getActionRows(
                    keys.commands.help.success.disable_button,
                    { 'command_name': command.name }, ph.emojis(),
                );

                return interaction.replyOptions({ embeds: [helpEmbed], components: disableRows });
            }

            /**
             * @param {ApplicationCommand|ApplicationCommandSubCommand} command
             * @returns {string}
             */
            function getCommandUsage(command) {
                let usage = [];

                if(!command.options) usage.push(''); //No options
                for(let option of command.options ?? []) {
                    if(option.type === ApplicationCommandOptionType.Subcommand) {
                        usage.push(`${getCommandUsage(option)}`);
                    }
                    else {
                        if(!usage.length) usage.push('');
                        usage[0] += option.required ? ` <${option.name}>` : ` [${option.name}]`;
                    }
                }

                if(command instanceof ApplicationCommand) usage = usage.map(u => `/${command.name} ${u}`);
                else usage = usage.map(u => `${command.name} ${u}`);
                return usage.join('\n').trim();
            }
        }
    }
}

module.exports = Help;